export type Tone = 'good' | 'minor' | 'major' | 'unknown';

// TfL's codes are labels, not a scale - see /Line/Meta/Severity
const GOOD = new Set([10, 18]);
const MAJOR = new Set([0, 1, 2, 3, 4, 5, 6, 11, 16, 20]);
const RANK: Record<Tone, number> = { major: 0, minor: 1, good: 2, unknown: 3 };

export function toneOf(severity: number | null): Tone {
  if (severity === null) return 'unknown';
  if (GOOD.has(severity)) return 'good';
  return MAJOR.has(severity) ? 'major' : 'minor';
}

export const worstFirst = (a: number, b: number) => RANK[toneOf(a)] - RANK[toneOf(b)] || a - b;
