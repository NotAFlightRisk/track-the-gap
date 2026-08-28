import type { Pattern, Placement } from './types';

/** Minutes of clearance kept between two branches sharing a row. */
const PAD = 2;

/**
 * Which horizontal lane each stop is drawn on. The longest route takes lane 0 and every branch
 * drops to the first lane its span is free on, so a line with five service patterns rarely needs
 * more than three rows.
 */
export function packRows(
  patterns: Pattern[],
  layout: Record<string, Placement>
): Map<string, number> {
  const rows = new Map<string, number>();
  const lanes: [number, number][][] = [];

  const place = (run: string[]) => {
    if (!run.length) return;
    const xs = run.map((stop) => layout[stop]?.x ?? 0);
    const span: [number, number] = [Math.min(...xs) - PAD, Math.max(...xs) + PAD];
    let lane = 0;
    while (lanes[lane]?.some(([from, to]) => span[0] < to && span[1] > from)) lane++;
    (lanes[lane] ??= []).push(span);
    for (const stop of run) rows.set(stop, lane);
  };

  for (const pattern of [...patterns].sort((a, b) => b.stops.length - a.stops.length)) {
    let run: string[] = [];
    for (const stop of pattern.stops) {
      if (rows.has(stop)) {
        place(run);
        run = [];
      } else {
        run.push(stop);
      }
    }
    place(run);
  }

  return rows;
}
