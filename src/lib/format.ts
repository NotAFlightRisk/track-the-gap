import type { HealthStatus, LineSummary, StatusCounts } from './types';

const pad = (value: number) => String(value).padStart(2, '0');

/** Headways read as minutes and seconds off a departure board. */
export function headway(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined) return '–';
  const rounded = Math.max(0, Math.round(seconds));
  return `${Math.floor(rounded / 60)}:${pad(rounded % 60)}`;
}

export function eta(seconds: number): string {
  if (seconds < 45) return 'due';
  return `${Math.round(seconds / 60)} min`;
}

export function ago(milliseconds: number): string {
  const seconds = Math.max(0, Math.round(milliseconds / 1000));
  if (seconds < 5) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  return `${Math.round(seconds / 60)} min ago`;
}

export function ratio(value: number | null | undefined): string {
  if (value === null || value === undefined) return '–';
  return `${value.toFixed(2)}×`;
}

export const clock = (at: number): string =>
  new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).format(at);

/** "2:30, against 2:00 expected" - the sentence a screen reader should hear. */
export function spoken(observed: number | null, expected: number | null): string {
  if (observed === null) return 'no headway measured';
  const said = `${headway(observed)} between trains`;
  return expected ? `${said}, against ${headway(expected)} expected` : said;
}

type StripLine = Pick<
  LineSummary,
  'name' | 'spark' | 'trains' | 'sparkTowards' | 'observed' | 'expected'
>;

/** What the summary strip actually draws: one direction's trains, not the whole line's. */
export function stripLabel({ name, spark, trains, sparkTowards, observed, expected }: StripLine) {
  const some =
    spark.length === trains ? `the line’s ${trains}` : `${spark.length} of the line’s ${trains}`;
  const drawn = trains
    ? `${sparkTowards}: ${some} train${trains === 1 ? '' : 's'}`
    : 'No trains running';
  return `Train spacing on the ${name} line. ${drawn}. Across the line, ${spoken(observed, expected)}.`;
}

/** "1 train", "2 trains". */
export const plural = (n: number, noun: string): string => `${n} ${noun}${n === 1 ? '' : 's'}`;

/** The sentence under the health pill, explaining the verdict it was handed. */
export function verdictBasis(status: HealthStatus, counts: StatusCounts): string {
  const all = Object.values(counts).reduce((total, n) => total + n, 0);
  const measured = all - counts['no-data'];
  const read = `${measured} of this line’s ${all} sections`;
  if (status !== 'no-data')
    return `We can measure ${read} right now, and this is the level more than a quarter of them reach.`;
  return measured
    ? `Only ${read} can be measured right now, too few to call the line either way.`
    : `None of this line’s ${all} sections can be measured yet.`;
}

/** The sentence over the gaps table. */
export const gapsBlurb = (rows: number): string =>
  rows
    ? `Worst first: the ${plural(rows, 'section')} with the biggest gap against timetable right now.`
    : 'No section has two predictions to measure a gap from yet.';
