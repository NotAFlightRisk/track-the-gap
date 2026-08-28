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
  /** Below this, a headway is treated as two carriages of the same move, not two trains. */
  minHeadwaySeconds: number;
  /** Used when the timetable has nothing to say about a stop. */
  fallbackHeadwaySeconds: number;
  /** Share of a line's sections that must reach a level before the whole line is called that. */
  severityQuantile: number;
}

export const HEALTH: HealthConfig = {
  minSamples: 1,
  ratio: { bunching: 0.45, degraded: 1.4, gap: 2 },
  irregularity: 0.8,
  minExcessSeconds: 180,
  horizonSeconds: 1800,
  minHeadwaySeconds: 40,
  fallbackHeadwaySeconds: 300,
  severityQuantile: 0.25
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

/** Worst first, so a line can inherit the state of its unhappiest segment. */
export const STATUS_RANK: Record<HealthStatus, number> = {
  severe: 5,
  gap: 4,
  bunching: 3,
  degraded: 2,
  normal: 1,
  'no-data': 0
};

/** The level the unhappiest slice of a set of sections reaches, so one bad section can't shout. */
export function quantileStatus(
  statuses: HealthStatus[],
  quantile = HEALTH.severityQuantile
): HealthStatus {
  const judged = statuses.filter((status) => status !== 'no-data');
  if (!judged.length) return 'no-data';
  const ranked = judged.sort((a, b) => STATUS_RANK[b] - STATUS_RANK[a]);
  return ranked[Math.min(ranked.length - 1, Math.floor(quantile * ranked.length))];
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
