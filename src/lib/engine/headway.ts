import { classify, HEALTH, type HealthConfig, type HealthStatus } from '$lib/config/health';
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

const median = (values: number[]): number => {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

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
  // Two predictions closer than the minimum headway are one move seen twice, so collapse them.
  const distinct: number[] = [];
  for (const at of [...arrivals].sort((a, b) => a - b)) {
    const last = distinct.at(-1);
    if (last === undefined || (at - last) / 1000 >= config.minHeadwaySeconds) distinct.push(at);
  }
  const gaps: number[] = [];
  for (let i = 1; i < distinct.length; i++) {
    gaps.push(Math.round((distinct[i] - distinct[i - 1]) / 1000));
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

export function londonClock(at: number | Date = Date.now()): Clock {
  const parts = LONDON.formatToParts(at);
  const weekday = parts.find((p) => p.type === 'weekday')?.value ?? 'Mon';
  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? 0) % 24;
  return { day: DAY_BY_WEEKDAY[weekday] ?? 'mon-thu', hour };
}

/** Timetabled headway over one directed segment, borrowing a neighbouring hour if it has to. */
export function expectedAt(
  model: DirectionModel,
  segment: string,
  { day, hour }: Clock,
  config: HealthConfig = HEALTH
): number | null {
  const hours = model.expected[segment]?.[day];
  if (!hours) return null;
  for (const offset of [0, -1, 1]) {
    const value = hours[(hour + offset + 24) % 24];
    if (value) return value;
  }
  return config.fallbackHeadwaySeconds;
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
