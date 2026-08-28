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
