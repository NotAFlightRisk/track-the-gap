export const HEALTH_STATUSES = [
  'normal',
  'degraded',
  'gap',
  'bunching',
  'severe',
  'no-data'
] as const;

export type HealthStatus = (typeof HEALTH_STATUSES)[number];

export interface HealthConfig {
  /** Headway observations needed before a segment is judged at all. */
  minSamples: number;
  /** Ratios of observed headway to expected headway. */
  ratio: {
    bunching: number;
    degraded: number;
    gap: number;
  };
  /** Coefficient of variation across a segment's headways, above which service is irregular. */
  irregularity: number;
  /** A gap must also be this many seconds longer than expected, to ride out prediction jitter. */
  minExcessSeconds: number;
  /** Predictions further out than this are too speculative to count. */
  horizonSeconds: number;
  /** Hour of the London morning at which a new service day starts. */
  serviceDayStartsAt: number;
  /** Share of a line's sections that must reach a level before the whole line is called that. */
  severityQuantile: number;
  /** Share of a set's sections that must be measurable before it is judged at all. */
  minCoverage: number;
}

export const HEALTH: HealthConfig = {
  minSamples: 1,
  ratio: { bunching: 0.45, degraded: 1.4, gap: 2 },
  irregularity: 0.8,
  minExcessSeconds: 180,
  horizonSeconds: 1800,
  serviceDayStartsAt: 4,
  severityQuantile: 0.25,
  minCoverage: 0.25
};

interface Judgement {
  ratio: number | null;
  worstRatio: number | null;
  variation: number | null;
  samples: number;
  excess: number | null;
}

export function classify(
  { ratio, worstRatio, variation, samples, excess }: Judgement,
  config: HealthConfig = HEALTH
): HealthStatus {
  if (ratio === null || samples < config.minSamples) return 'no-data';
  const worst = worstRatio ?? ratio;
  const gapped = worst >= config.ratio.gap && (excess ?? 0) >= config.minExcessSeconds;
  if (gapped && (variation ?? 0) >= config.irregularity) return 'severe';
  if (gapped) return 'gap';
  if (ratio <= config.ratio.bunching) return 'bunching';
  if (ratio >= config.ratio.degraded) return 'degraded';
  return 'normal';
}

/** Both readings mean at least one headway ran materially past its own timetable. */
export const isGap = (status: HealthStatus): boolean => status === 'gap' || status === 'severe';

/** Worst first, so a line can inherit the state of its unhappiest segment. */
export const STATUS_RANK: Record<HealthStatus, number> = {
  severe: 5,
  gap: 4,
  bunching: 3,
  degraded: 2,
  normal: 1,
  'no-data': 0
};

/** Worst reading first, then furthest from its own timetable, then alphabetical. */
export const byUnhappiness = (
  a: { status: HealthStatus; ratio: number | null; name: string },
  b: { status: HealthStatus; ratio: number | null; name: string }
): number =>
  STATUS_RANK[b.status] - STATUS_RANK[a.status] ||
  (b.ratio ?? 0) - (a.ratio ?? 0) ||
  a.name.localeCompare(b.name);

/** Enough of a set can be measured for the set to say anything about itself. */
export const isMeasurable = (statuses: HealthStatus[], config: HealthConfig = HEALTH): boolean =>
  statuses.filter((status) => status !== 'no-data').length >=
  Math.max(1, statuses.length * config.minCoverage);

/** The level the unhappiest slice reaches, once enough of the set is measurable to have a view. */
export function quantileStatus(
  statuses: HealthStatus[],
  config: HealthConfig = HEALTH
): HealthStatus {
  if (!isMeasurable(statuses, config)) return 'no-data';
  const ranked = statuses
    .filter((status) => status !== 'no-data')
    .sort((a, b) => STATUS_RANK[b] - STATUS_RANK[a]);
  return ranked[Math.min(ranked.length - 1, Math.floor(config.severityQuantile * ranked.length))];
}

export interface StatusMeta {
  label: string;
  short: string;
  glyph: string;
  hint: string;
}

/** Every status carries a glyph and words so nothing depends on colour alone. */
export const STATUS_META: Record<HealthStatus, StatusMeta> = {
  normal: {
    label: 'Even service',
    short: 'Even',
    glyph: '≡',
    hint: 'Trains are arriving about as often as the timetable expects.'
  },
  degraded: {
    label: 'Thinning out',
    short: 'Thin',
    glyph: '≠',
    hint: 'Headways are noticeably longer than expected, but no single gap is severe.'
  },
  gap: {
    label: 'Service gap',
    short: 'Gap',
    glyph: '⌇',
    hint: 'At least one gap is double the expected headway or worse.'
  },
  bunching: {
    label: 'Bunching',
    short: 'Bunched',
    glyph: '⋮',
    hint: 'Trains are running closer together than the timetable intends.'
  },
  severe: {
    label: 'Severe irregularity',
    short: 'Severe',
    glyph: '⁘',
    hint: 'Large gaps and tight pairs at the same time. Spacing has broken down.'
  },
  'no-data': {
    label: 'Not enough data',
    short: 'No data',
    glyph: '·',
    hint: 'Too few predictions here to work out a headway.'
  }
};
