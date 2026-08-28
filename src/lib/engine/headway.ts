import {
  classify,
  HEALTH,
  isGap,
  isMeasurable,
  type HealthConfig,
  type HealthStatus
} from '$lib/config/health';
import type { DayType, DirectionModel, Segment } from '$lib/network/types';
import type { Train } from './trains';

export interface Headway {
  gaps: number[];
  observed: number | null;
  worst: number | null;
  expected: number | null;
  ratio: number | null;
  worstRatio: number | null;
  variation: number | null;
  samples: number;
  status: HealthStatus;
}

export const EMPTY: Headway = {
  gaps: [],
  observed: null,
  worst: null,
  expected: null,
  ratio: null,
  worstRatio: null,
  variation: null,
  samples: 0,
  status: 'no-data'
};

export interface Gapped {
  seconds: number;
  ratio: number;
}

/** The gap a section owns, if the classifier already called its headway one. */
export const gapIn = ({ status, worst, worstRatio }: Headway): Gapped | null =>
  isGap(status) && worst !== null && worstRatio !== null
    ? { seconds: worst, ratio: worstRatio }
    : null;

/** The worst of a set of gaps: furthest past its own timetable, never longest in seconds. */
export const worstGapOf = <T extends Gapped>(gaps: T[]): T | null =>
  gaps.reduce<T | null>((worst, gap) => (!worst || gap.ratio > worst.ratio ? gap : worst), null);

const median = (values: number[]): number => {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

/** Median of whichever parts have a reading at all. */
const medianOf = (values: (number | null)[]): number | null => {
  const found = values.filter((value): value is number => value !== null);
  return found.length ? median(found) : null;
};

/** One headway for a whole set of sections, withheld until enough of the set is measurable. */
export function rollupHeadway(
  parts: Headway[],
  sections: HealthStatus[],
  config: HealthConfig = HEALTH
): Headway {
  if (!isMeasurable(sections, config)) return EMPTY;
  // Only sections carrying both readings, so the pair always compares like with like.
  const read = parts.filter((part) => part.observed !== null && part.expected !== null);
  const observed = medianOf(read.map((part) => part.observed));
  const expected = medianOf(read.map((part) => part.expected));
  if (observed === null) return EMPTY;
  return { ...EMPTY, observed, expected, ratio: observed && expected ? observed / expected : null };
}

function coefficientOfVariation(values: number[]): number | null {
  if (values.length < 2) return null;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  if (!mean) return null;
  const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance) / mean;
}

/** Successive gaps between predicted arrivals at one point, in seconds. */
export function measure(
  arrivals: number[],
  expected: number | null,
  config: HealthConfig = HEALTH
): Headway {
  // One arrival per train arrives here already, so every gap is a real gap between two trains.
  const sorted = arrivals.filter(Number.isFinite).sort((a, b) => a - b);
  const gaps: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    gaps.push(Math.max(0, Math.round((sorted[i] - sorted[i - 1]) / 1000)));
  }
  if (!gaps.length) return { ...EMPTY, expected };

  const observed = median(gaps);
  const worst = Math.max(...gaps);
  const variation = coefficientOfVariation(gaps);
  const ratio = expected ? observed / expected : null;
  const worstRatio = expected ? worst / expected : null;

  return {
    gaps,
    observed,
    worst,
    expected,
    ratio,
    worstRatio,
    variation,
    samples: gaps.length,
    status: classify(
      { ratio, worstRatio, variation, samples: gaps.length, excess: expected && worst - expected },
      config
    )
  };
}

const LONDON = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/London',
  weekday: 'short',
  hour: 'numeric',
  hour12: false
});

const WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const DAY_BY_WEEKDAY: Record<string, DayType> = {
  Mon: 'mon-thu',
  Tue: 'mon-thu',
  Wed: 'mon-thu',
  Thu: 'mon-thu',
  Fri: 'fri',
  Sat: 'sat',
  Sun: 'sun'
};

export interface Clock {
  day: DayType;
  hour: number;
}

export function londonClock(at: number | Date = Date.now(), config: HealthConfig = HEALTH): Clock {
  const parts = LONDON.formatToParts(at);
  const weekday = parts.find((p) => p.type === 'weekday')?.value ?? 'Mon';
  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? 0) % 24;
  // The small hours still belong to the previous night's service, and so does its timetable.
  const day = hour < config.serviceDayStartsAt ? WEEK[(WEEK.indexOf(weekday) + 6) % 7] : weekday;
  return { day: DAY_BY_WEEKDAY[day] ?? 'mon-thu', hour };
}

/** Weekdays run near-identical timetables, so one stands in if TfL only published the other. */
const STAND_IN: Partial<Record<DayType, DayType>> = { 'mon-thu': 'fri', fri: 'mon-thu' };

/** Timetabled headway over one directed segment, borrowing a neighbouring hour if it has to. */
export function expectedAt(
  model: DirectionModel,
  segment: string,
  { day, hour }: Clock
): number | null {
  const timetable = model.expected[segment];
  const hours = timetable?.[day] ?? timetable?.[STAND_IN[day] ?? day];
  if (!hours) return null;
  for (const offset of [0, -1, 1]) {
    const value = hours[(hour + offset + 24) % 24];
    if (value) return value;
  }
  // Nothing timetabled around this hour means no service to compare against, not a default one.
  return null;
}

/** Trains whose next-but-one move is exactly this segment, with when they reach its far end. */
export function arrivalsOn(segment: Segment, trains: Train[]): { train: Train; at: number }[] {
  const found: { train: Train; at: number }[] = [];
  for (const train of trains) {
    const index = train.calls.findIndex((call) => call.stop === segment.to);
    if (index < 0) continue;
    const previous = index > 0 ? train.calls[index - 1].stop : train.from;
    if (previous === segment.from) found.push({ train, at: train.calls[index].at });
  }
  return found.sort((a, b) => a.at - b.at);
}
