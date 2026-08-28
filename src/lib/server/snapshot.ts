import { byUnhappiness, quantileStatus, type HealthStatus } from '$lib/config/health';
import { LINES, lineById } from '$lib/config/lines';
import { arrivalsOn, expectedAt, londonClock, measure, EMPTY } from '$lib/engine/headway';
import { buildTrains, type Train } from '$lib/engine/trains';
import type { DirectionModel, Segment } from '$lib/network/types';
import type {
  DirectionView,
  Gap,
  LineSummary,
  LineView,
  Meta,
  NetworkView,
  SegmentView,
  StationView,
  StatusCounts
} from '$lib/types';
import { allLines, corridors, network, stationName } from './network';
import { live, pollSeconds, type LiveData } from './tfl';

const SPARK_TRAINS = 80;

const emptyCounts = (): StatusCounts => ({
  normal: 0,
  degraded: 0,
  gap: 0,
  bunching: 0,
  severe: 0,
  'no-data': 0
});

const median = (values: number[]): number | null => {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

const interchangesAt = (() => {
  const map = new Map<string, Set<string>>();
  for (const line of network.lines) {
    for (const direction of line.directions) {
      for (const stop of Object.keys(direction.layout)) {
        map.set(stop, (map.get(stop) ?? new Set()).add(line.id));
      }
    }
  }
  return map;
})();

const directionLabel = (model: DirectionModel): string => {
  const ends = [...new Set(model.patterns.map((p) => p.stops.at(-1)!))].map(stationName);
  return ends.length > 2
    ? `Towards ${ends.slice(0, 2).join(', ')} & more`
    : `Towards ${ends.join(' & ')}`;
};

interface Context {
  lineId: string;
  clock: ReturnType<typeof londonClock>;
  corridorArrivals: Map<string, { lineId: string; at: number }[]>;
}

function buildSegment(
  segment: Segment,
  model: DirectionModel,
  trains: Train[],
  patterns: Map<string, string>,
  { lineId, clock, corridorArrivals }: Context
): SegmentView {
  const key = `${segment.from}>${segment.to}`;
  const found = arrivalsOn(segment, trains);
  const expected = expectedAt(model, key, clock);
  const headway = measure(
    found.map((f) => f.at),
    expected
  );
  const shared = corridors.get(key);
  const merged = shared && corridorArrivals.get(key);

  return {
    key,
    from: segment.from,
    to: segment.to,
    fromName: stationName(segment.from),
    toName: stationName(segment.to),
    x1: model.layout[segment.from]?.x ?? 0,
    x2: model.layout[segment.to]?.x ?? 0,
    row1: model.layout[segment.from]?.row ?? 0,
    row2: model.layout[segment.to]?.row ?? 0,
    runTime: segment.runTime,
    patterns: segment.patterns.map((id) => patterns.get(id) ?? id),
    headway,
    calls: found.slice(0, 6).map(({ train, at }) => ({
      vehicleId: train.vehicleId,
      towards: train.towards,
      eta: Math.round((at - Date.now()) / 1000)
    })),
    corridor:
      shared && merged && merged.length > 1
        ? {
            lines: [...shared].filter((id) => id !== lineId).sort(),
            headway: measure(
              merged.map((m) => m.at),
              null
            )
          }
        : null
  };
}

function buildDirection(model: DirectionModel, trains: Train[], context: Context): DirectionView {
  const mine = trains.filter((t) => t.direction === model.direction);
  const patterns = new Map(model.patterns.map((p) => [p.id, p.name]));
  const segments = model.segments.map((s) => buildSegment(s, model, mine, patterns, context));
  const towards = directionLabel(model);

  const counts = emptyCounts();
  let worstGap: Gap | null = null;
  for (const segment of segments) {
    counts[segment.headway.status]++;
    const worst = segment.headway.worst;
    if (worst && (!worstGap || worst > worstGap.seconds)) {
      worstGap = {
        seconds: worst,
        ratio: segment.headway.worstRatio,
        from: segment.fromName,
        to: segment.toName,
        direction: model.direction,
        towards
      };
    }
  }

  const judged = segments.filter((s) => s.headway.observed !== null);
  const observed = median(judged.map((s) => s.headway.observed!));
  const expected = median(
    judged.map((s) => s.headway.expected).filter((v): v is number => v !== null)
  );
  const xs = Object.values(model.layout).map((p) => p.x);

  const stations: StationView[] = Object.entries(model.layout).map(([id, place]) => ({
    id,
    name: stationName(id),
    x: place.x,
    row: place.row,
    interchange: [...(interchangesAt.get(id) ?? [])].filter((l) => l !== context.lineId).sort()
  }));

  return {
    direction: model.direction,
    label: towards,
    span: Math.max(...xs, 1),
    rows: Math.max(...stations.map((s) => s.row)) + 1,
    stations: stations.sort((a, b) => a.x - b.x),
    segments,
    trains: mine.map((train) => ({
      id: train.id,
      vehicleId: train.vehicleId,
      x: train.x,
      row: train.row,
      towards: train.towards,
      eta: train.eta,
      nextName: stationName(train.next),
      location: train.location,
      segment: train.from ? `${train.from}>${train.next}` : null
    })),
    patterns: model.patterns.map((p) => ({ id: p.id, name: p.name })),
    headway: judged.length
      ? { ...EMPTY, observed, expected, ratio: observed && expected ? observed / expected : null }
      : EMPTY,
    status: quantileStatus(segments.map((s) => s.headway.status)),
    counts,
    worstGap
  };
}

function summarise({ directions, blurb, opened, ...summary }: LineView): LineSummary {
  return summary;
}

function buildLine(
  meta: (typeof LINES)[number],
  trains: Train[],
  official: LiveData['statuses'][number] | undefined,
  context: Context
): LineView {
  const index = allLines().find((l) => l.id === meta.id);
  const directions = (index?.directions ?? []).map((d) => buildDirection(d.model, trains, context));

  const counts = emptyCounts();
  for (const direction of directions) {
    for (const status of Object.keys(counts) as HealthStatus[]) {
      counts[status] += direction.counts[status];
    }
  }

  const worstGap =
    directions
      .map((d) => d.worstGap)
      .filter((g): g is Gap => g !== null)
      .sort((a, b) => b.seconds - a.seconds)[0] ?? null;

  const observed = median(
    directions.map((d) => d.headway.observed).filter((v): v is number => v !== null)
  );
  const expected = median(
    directions.map((d) => d.headway.expected).filter((v): v is number => v !== null)
  );
  const busiest = [...directions].sort((a, b) => b.trains.length - a.trains.length)[0];

  return {
    id: meta.id,
    name: meta.name,
    slug: meta.slug,
    colour: meta.colour,
    ink: meta.ink,
    blurb: meta.blurb,
    opened: meta.opened,
    directions,
    official: official
      ? { severity: official.severity, description: official.description, reason: official.reason }
      : { severity: 10, description: 'Unknown', reason: null },
    status: quantileStatus(directions.flatMap((d) => d.segments.map((s) => s.headway.status))),
    observed,
    expected,
    ratio: observed && expected ? observed / expected : null,
    worstGap,
    trains: trains.length,
    counts,
    spark:
      busiest?.trains
        .slice(0, SPARK_TRAINS)
        .map((t) => ({ x: Math.round((t.x / busiest.span) * 1000) / 1000, row: t.row })) ?? [],
    sparkRows: busiest?.rows ?? 1
  };
}

function build(data: LiveData): { lines: LineView[]; meta: Meta } {
  const clock = londonClock(data.fetchedAt);
  const byLine = new Map<string, typeof data.predictions>();
  for (const prediction of data.predictions) {
    const found = byLine.get(prediction.lineId);
    if (found) found.push(prediction);
    else byLine.set(prediction.lineId, [prediction]);
  }

  const trainsByLine = new Map<string, Train[]>();
  const corridorArrivals = new Map<string, { lineId: string; at: number }[]>();

  for (const index of allLines()) {
    const models = index.directions.map((d) => d.model);
    const trains = buildTrains(byLine.get(index.id) ?? [], models, { stationName });
    trainsByLine.set(index.id, trains);
    for (const direction of index.directions) {
      for (const segment of direction.model.segments) {
        const key = `${segment.from}>${segment.to}`;
        if (!corridors.has(key)) continue;
        const found = arrivalsOn(
          segment,
          trains.filter((t) => t.direction === direction.model.direction)
        );
        const merged = corridorArrivals.get(key) ?? [];
        for (const { at } of found) merged.push({ lineId: index.id, at });
        corridorArrivals.set(key, merged);
      }
    }
  }

  const statuses = new Map(data.statuses.map((s) => [s.id, s]));
  const lines = LINES.map((meta) =>
    buildLine(meta, trainsByLine.get(meta.id) ?? [], statuses.get(meta.id), {
      lineId: meta.id,
      clock,
      corridorArrivals
    })
  );

  return {
    lines,
    meta: {
      fetchedAt: data.fetchedAt,
      stale: data.stale,
      error: data.error,
      pollSeconds,
      generated: network.generated
    }
  };
}

let cached: { at: number; lines: LineView[]; meta: Meta } | null = null;

async function snapshot() {
  const data = await live();
  if (!cached || cached.at !== data.fetchedAt || cached.meta.stale !== data.stale) {
    cached = { at: data.fetchedAt, ...build(data) };
  }
  return cached;
}

export async function networkView(): Promise<NetworkView> {
  const { lines, meta } = await snapshot();
  const counts = emptyCounts();
  for (const line of lines) {
    for (const status of Object.keys(counts) as HealthStatus[])
      counts[status] += line.counts[status];
  }
  return {
    meta,
    lines: lines.map(summarise).sort(byUnhappiness),
    counts,
    trains: lines.reduce((total, line) => total + line.trains, 0)
  };
}

export async function lineView(slug: string): Promise<{ meta: Meta; line: LineView } | null> {
  const wanted = LINES.find((l) => l.slug === slug);
  if (!wanted) return null;
  const { lines, meta } = await snapshot();
  const line = lines.find((l) => l.id === wanted.id);
  return line ? { meta, line } : null;
}

export { lineById };
