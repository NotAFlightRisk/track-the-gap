#!/usr/bin/env node
// Rebuilds src/lib/data/network.json from the TfL API. Run it when the network changes.
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const LINES = [
  'bakerloo',
  'central',
  'circle',
  'district',
  'hammersmith-city',
  'jubilee',
  'metropolitan',
  'northern',
  'piccadilly',
  'victoria',
  'waterloo-city'
];

const DIRECTIONS = ['inbound', 'outbound'];
const OUT = resolve(dirname(fileURLToPath(import.meta.url)), '../src/lib/data/network.json');
const BASE = 'https://api.tfl.gov.uk';
const KEY = process.env.TFL_APP_KEY ?? '';
const GAP = 550;

let calls = 0;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function api(path, params = {}) {
  const url = new URL(BASE + path);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  if (KEY) url.searchParams.set('app_key', KEY);
  for (let attempt = 1; ; attempt++) {
    await wait(GAP);
    calls++;
    const res = await fetch(url, { headers: { accept: 'application/json' } });
    if (res.ok) return res.json();
    if (res.status !== 429 || attempt >= 5) throw new Error(`${res.status} on ${path}`);
    await wait(20_000 * attempt);
  }
}

const cleanName = (name) =>
  name
    .replace(/\s+Underground Station$/i, '')
    .replace(/\s+Rail Station$/i, '')
    .replace(/\s+Station$/i, '')
    .replace(/\s+DLR$/i, '')
    .trim();

const cleanRouteName = (name) =>
  name
    .replace(/&harr;/g, '↔')
    .replace(/\s+/g, ' ')
    .trim();

const DAY_TYPES = [
  [/sunday/i, 'sun'],
  [/saturday/i, 'sat'],
  [/friday/i, 'fri'],
  [/./, 'mon-thu']
];

const dayType = (name) => DAY_TYPES.find(([re]) => re.test(name))[1];

function median(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

// Timetables count from a 03:00-ish service start, so their hours run past 24.
const hourOf = (minutes) => Math.floor(minutes / 60) % 24;

/**
 * Timetabled departures grouped by the segment they start, keyed `from>to`. Splitting by the
 * journey's next stop is what keeps a junction's branches from propping each other up.
 */
function departures(timetable, from) {
  const bySegment = new Map();
  for (const route of timetable?.routes ?? []) {
    const nextStop = new Map(
      route.stationIntervals.map((i) => [String(i.id), i.intervals.find((s) => s.stopId)?.stopId])
    );
    for (const schedule of route.schedules ?? []) {
      const day = dayType(schedule.name);
      for (const journey of schedule.knownJourneys ?? []) {
        const to = nextStop.get(String(journey.intervalId));
        if (!to) continue;
        const key = `${from}>${to}|${day}`;
        if (!bySegment.has(key)) bySegment.set(key, []);
        bySegment.get(key).push(Number(journey.hour) * 60 + Number(journey.minute));
      }
    }
  }
  return bySegment;
}

function runTimes(timetable, into) {
  for (const route of timetable?.routes ?? []) {
    for (const interval of route.stationIntervals ?? []) {
      const stops = interval.intervals.filter((s) => s.stopId);
      for (let i = 1; i < stops.length; i++) {
        const key = `${stops[i - 1].stopId}>${stops[i].stopId}`;
        const gap = stops[i].timeToArrival - stops[i - 1].timeToArrival;
        if (gap > 0 && gap < 30) into.set(key, (into.get(key) ?? []).concat(gap));
      }
    }
  }
}

/** Expected headway per hour, in seconds, from the gaps between timetabled departures. */
function hourlyHeadways(times) {
  const sorted = [...new Set(times)].sort((a, b) => a - b);
  const byHour = Array.from({ length: 24 }, () => []);
  for (let i = 1; i < sorted.length; i++) {
    const gap = sorted[i] - sorted[i - 1];
    if (gap > 0 && gap <= 60) byHour[hourOf(sorted[i - 1])].push(gap);
  }
  const hours = byHour.map((gaps) => (gaps.length ? Math.round(median(gaps) * 60) : 0));
  return hours.some(Boolean) ? hours : null;
}

// Minutes along the route from the longest pattern's origin. Rows are worked out in the app.
function layout(patterns, runTime) {
  const x = new Map();
  const ordered = [...patterns].sort((a, b) => b.stops.length - a.stops.length);

  for (const pattern of ordered) {
    const { stops } = pattern;
    let anchor = stops.findIndex((s) => x.has(s));
    if (anchor === -1) {
      anchor = 0;
      x.set(stops[0], 0);
    }
    for (let i = anchor + 1; i < stops.length; i++) {
      if (!x.has(stops[i])) x.set(stops[i], x.get(stops[i - 1]) + runTime(stops[i - 1], stops[i]));
    }
    for (let i = anchor - 1; i >= 0; i--) {
      if (!x.has(stops[i])) x.set(stops[i], x.get(stops[i + 1]) - runTime(stops[i], stops[i + 1]));
    }
  }

  const shift = Math.min(...x.values());
  return Object.fromEntries(
    [...x].map(([stop, at]) => [stop, { x: Math.round((at - shift) * 100) / 100 }])
  );
}

async function buildDirection(lineId, direction, stations) {
  const sequence = await api(`/Line/${lineId}/Route/Sequence/${direction}`, {
    serviceTypes: 'Regular',
    excludeCrowding: 'true'
  });

  const seen = [
    ...(sequence.stations ?? []),
    ...(sequence.stopPointSequences ?? []).flatMap((s) => s.stopPoint ?? [])
  ];
  for (const stop of seen) {
    stations[stop.id] ??= {
      name: cleanName(stop.name),
      lat: stop.lat,
      lon: stop.lon,
      zone: stop.zone ?? null
    };
  }

  const patterns = (sequence.orderedLineRoutes ?? [])
    .map((route, index) => ({
      id: `${lineId}-${direction}-${index}`,
      name: cleanRouteName(route.name),
      stops: route.naptanIds.filter((id, i, all) => all.indexOf(id) === i)
    }))
    .filter((p) => p.stops.length > 1);

  if (!patterns.length) return null;

  // Every stop is asked for its own departures, so short workings count too.
  const stops = [...new Set(patterns.flatMap((p) => p.stops))];
  const observed = new Map();
  const expected = {};
  let missing = 0;

  for (const stop of stops) {
    let timetable;
    try {
      ({ timetable } = await api(`/Line/${lineId}/Timetable/${stop}`, { direction }));
    } catch {
      timetable = null;
    }
    if (!timetable) {
      missing++;
      continue;
    }
    runTimes(timetable, observed);
    for (const [key, times] of departures(timetable, stop)) {
      const [segment, day] = key.split('|');
      const hours = hourlyHeadways(times);
      if (hours) (expected[segment] ??= {})[day] = hours;
    }
  }

  const runTime = (from, to) => median(observed.get(`${from}>${to}`) ?? []) ?? 2;

  const segments = new Map();
  for (const pattern of patterns) {
    for (let i = 1; i < pattern.stops.length; i++) {
      const key = `${pattern.stops[i - 1]}>${pattern.stops[i]}`;
      const segment = segments.get(key) ?? {
        from: pattern.stops[i - 1],
        to: pattern.stops[i],
        runTime: Math.round(runTime(pattern.stops[i - 1], pattern.stops[i]) * 60),
        patterns: []
      };
      segment.patterns.push(pattern.id);
      segments.set(key, segment);
    }
  }

  console.log(
    `  ${direction}: ${stops.length} stops, ${missing} without a timetable, ${Object.keys(expected).length} segments timetabled`
  );

  return {
    direction,
    name: patterns[0].name.split('↔').at(-1)?.trim() || direction,
    patterns,
    segments: [...segments.values()],
    layout: layout(patterns, runTime),
    expected
  };
}

async function main() {
  const stations = {};
  const lines = [];
  await mkdir(dirname(OUT), { recursive: true });

  for (const lineId of LINES) {
    console.log(lineId);
    const directions = [];
    for (const direction of DIRECTIONS) {
      const built = await buildDirection(lineId, direction, stations);
      if (built) directions.push(built);
    }
    if (directions.length) lines.push({ id: lineId, directions });
    await writeFile(OUT, JSON.stringify({ generated: new Date().toISOString(), stations, lines }));
  }

  console.log(
    `\n${lines.length} lines, ${Object.keys(stations).length} stations, ${calls} API calls`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
