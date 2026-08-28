import { describe, expect, it } from 'vitest';
import {
  byUnhappiness,
  classify,
  HEALTH,
  quantileStatus,
  type HealthStatus
} from '$lib/config/health';
import type { DirectionModel, Segment } from '$lib/network/types';
import {
  arrivalsOn,
  expectedAt,
  gapIn,
  londonClock,
  measure,
  rollupHeadway,
  worstGapOf
} from './headway';
import type { Train } from './trains';

const at = (...minutes: number[]) => minutes.map((m) => m * 60_000);

describe('measure', () => {
  it('turns arrival times into successive headways', () => {
    const headway = measure(at(0, 2, 4, 6), 120);
    expect(headway.gaps).toEqual([120, 120, 120]);
    expect(headway.observed).toBe(120);
    expect(headway.ratio).toBe(1);
    expect(headway.status).toBe('normal');
  });

  it('keeps a very tight pair rather than reading it as one train', () => {
    expect(measure(at(0, 0.5, 2), 120).gaps).toEqual([30, 90]);
  });

  it('has nothing to say about a single train', () => {
    expect(measure(at(3), 120).status).toBe('no-data');
  });

  it('does not shout about a four minute wait on a two minute headway', () => {
    expect(measure(at(0, 2, 6), 120).status).toBe('degraded');
  });

  it('calls a doubled headway a gap', () => {
    const headway = measure(at(0, 2, 8), 120);
    expect(headway.worst).toBe(360);
    expect(headway.status).toBe('gap');
  });

  it('calls tightly spaced trains bunching', () => {
    expect(measure(at(0, 0.8, 1.6, 2.4), 300).status).toBe('bunching');
  });

  it('separates severe irregularity from a plain gap', () => {
    expect(measure(at(0, 0.8, 9, 9.8, 18), 180).status).toBe('severe');
  });

  it('sorts arrivals that come in out of order', () => {
    expect(measure(at(6, 0, 2, 4), 120).gaps).toEqual([120, 120, 120]);
  });

  it('reports expected but no ratio when the timetable is silent', () => {
    const headway = measure(at(0, 2, 4), null);
    expect(headway.observed).toBe(120);
    expect(headway.ratio).toBeNull();
    expect(headway.status).toBe('no-data');
  });
});

describe('gapIn', () => {
  it('offers nothing from a section running to its own timetable', () => {
    expect(gapIn(measure(at(0, 15, 30), 900))).toBeNull();
  });

  it('offers nothing from a merely stretched headway', () => {
    expect(gapIn(measure(at(0, 3, 6), 120))).toBeNull();
  });

  it('owns the gap once the classifier calls it one', () => {
    expect(gapIn(measure(at(0, 2, 8), 120))).toEqual({ seconds: 360, ratio: 3 });
  });

  it('still owns it when spacing has broken down altogether', () => {
    expect(gapIn(measure(at(0, 0.8, 9, 9.8, 18), 180))).not.toBeNull();
  });
});

describe('worstGapOf', () => {
  const branch = { seconds: 1800, ratio: 2, name: 'Mill Hill East branch' };
  const trunk = { seconds: 600, ratio: 5, name: 'Camden trunk' };

  it('has no worst gap to name when nothing is gapped', () => {
    expect(worstGapOf([])).toBeNull();
  });

  it("picks the frequent trunk's gap over the quiet branch's longer wait", () => {
    expect(worstGapOf([branch, trunk])).toBe(trunk);
    expect(worstGapOf([trunk, branch])).toBe(trunk);
  });

  it('leaves the branch as the worst when nothing else is gapped', () => {
    expect(worstGapOf([branch])).toBe(branch);
  });
});

describe('classify', () => {
  const base = { ratio: 1, worstRatio: 1, variation: 0.1, samples: 3, excess: 0 };

  it('needs at least one measured gap', () => {
    expect(classify({ ...base, samples: 0 })).toBe('no-data');
  });

  it('ignores a doubled headway that is only a minute long', () => {
    expect(classify({ ...base, ratio: 2.2, worstRatio: 2.2, excess: 90 })).toBe('degraded');
  });

  it('reads a mildly stretched headway as degraded', () => {
    expect(classify({ ...base, ratio: 1.6, worstRatio: 1.7 })).toBe('degraded');
  });

  it('respects a config override', () => {
    const strict = { ...HEALTH, ratio: { ...HEALTH.ratio, degraded: 1.1 } };
    expect(classify({ ...base, ratio: 1.2, worstRatio: 1.2 }, strict)).toBe('degraded');
  });
});

const model = {
  direction: 'inbound',
  name: 'test',
  patterns: [],
  segments: [],
  layout: {},
  expected: { 'A>B': { 'mon-thu': Array.from({ length: 24 }, (_, h) => (h === 8 ? 150 : 0)) } }
} as unknown as DirectionModel;

describe('londonClock', () => {
  it('keeps the small hours on the previous service day', () => {
    expect(londonClock(Date.parse('2026-08-29T00:30:00+01:00')).day).toBe('fri');
    expect(londonClock(Date.parse('2026-08-29T10:30:00+01:00')).day).toBe('sat');
  });
});

describe('expectedAt', () => {
  it('reads the timetabled headway for the hour', () => {
    expect(expectedAt(model, 'A>B', { day: 'mon-thu', hour: 8 })).toBe(150);
  });

  it('borrows the neighbouring hour when one is empty', () => {
    expect(expectedAt(model, 'A>B', { day: 'mon-thu', hour: 9 })).toBe(150);
  });

  it('expects nothing at an hour the timetable leaves empty', () => {
    expect(expectedAt(model, 'A>B', { day: 'mon-thu', hour: 14 })).toBeNull();
  });

  it('borrows the Friday timetable when only that one was published', () => {
    expect(expectedAt(model, 'A>B', { day: 'fri', hour: 8 })).toBe(150);
  });

  it('has nothing for a segment the timetable never mentions', () => {
    expect(expectedAt(model, 'B>C', { day: 'mon-thu', hour: 8 })).toBeNull();
  });

  it('keeps two approaches to the same station apart', () => {
    expect(expectedAt(model, 'X>B', { day: 'mon-thu', hour: 8 })).toBeNull();
  });
});

const train = (id: string, stops: string[], from: string | null): Train =>
  ({
    id,
    from,
    calls: stops.map((stop, i) => ({ stop, eta: i * 120, at: i * 120_000 }))
  }) as Train;

describe('arrivalsOn', () => {
  const segment = { from: 'A', to: 'B', runTime: 120, patterns: [] } as Segment;

  it('counts a train whose previous call is the segment start', () => {
    const found = arrivalsOn(segment, [train('t1', ['A', 'B', 'C'], null)]);
    expect(found.map((f) => f.train.id)).toEqual(['t1']);
  });

  it('counts a train already between the two stations', () => {
    const found = arrivalsOn(segment, [train('t2', ['B', 'C'], 'A')]);
    expect(found).toHaveLength(1);
  });

  it('ignores a train that reaches the far station off a different branch', () => {
    expect(arrivalsOn(segment, [train('t3', ['Z', 'B'], null)])).toHaveLength(0);
  });

  it('returns them in arrival order', () => {
    const early = train('early', ['A', 'B'], null);
    const late = train('late', ['A', 'B'], null);
    late.calls[1].at = 999_000;
    expect(arrivalsOn(segment, [late, early]).map((f) => f.train.id)).toEqual(['early', 'late']);
  });
});

describe('byUnhappiness', () => {
  const line = (name: string, status: HealthStatus, ratio: number | null) => ({
    name,
    status,
    ratio
  });

  it('puts the worst reading first, then the one furthest from its timetable', () => {
    const board = [
      line('Circle', 'normal', 1.05),
      line('Bakerloo', 'gap', 1.1),
      line('Metropolitan', 'gap', 2.2)
    ].sort(byUnhappiness);
    expect(board.map((l) => l.name)).toEqual(['Metropolitan', 'Bakerloo', 'Circle']);
  });
});

describe('rollupHeadway', () => {
  const measured = (minutes: number, expected: number) => measure(at(0, minutes), expected);
  const dark = (count: number): HealthStatus[] => Array<HealthStatus>(count).fill('no-data');
  const judged = (count: number): HealthStatus[] => Array<HealthStatus>(count).fill('normal');

  it('stands one headway in for a set it can see enough of', () => {
    const rolled = rollupHeadway([measured(4, 240), measured(6, 240), measured(8, 240)], judged(3));
    expect(rolled.observed).toBe(360);
    expect(rolled.expected).toBe(240);
    expect(rolled.ratio).toBe(1.5);
  });

  it('names no wait for a line it has just called unjudgeable', () => {
    const rolled = rollupHeadway([measured(10, 420)], ['degraded', ...dark(67)]);
    expect(rolled.observed).toBeNull();
    expect(rolled.expected).toBeNull();
    expect(rolled.ratio).toBeNull();
  });

  it('still speaks for a set measured right down to the floor', () => {
    const parts = [measured(4, 240), measured(6, 240), measured(8, 240), measured(10, 240)];
    expect(rollupHeadway(parts, [...judged(4), ...dark(12)]).observed).toBe(420);
  });

  it('takes the floor from the config it is given', () => {
    const parts = [measured(4, 240), measured(6, 240), measured(8, 240), measured(10, 240)];
    const strict = { ...HEALTH, minCoverage: 0.5 };
    expect(rollupHeadway(parts, [...judged(4), ...dark(12)], strict).observed).toBeNull();
  });

  it('skips the sections that never got a reading of their own', () => {
    const rolled = rollupHeadway([measure(at(3), 240), measured(6, 240)], ['no-data', 'normal']);
    expect(rolled.observed).toBe(360);
  });

  it('leaves out a section it measured but has no timetable for', () => {
    const rolled = rollupHeadway(
      [measure(at(0, 20), null), measured(6, 240)],
      ['no-data', 'normal']
    );
    expect(rolled.observed).toBe(360);
    expect(rolled.expected).toBe(240);
    expect(rolled.ratio).toBe(1.5);
  });

  it('has nothing to say when nothing was measured', () => {
    expect(rollupHeadway([], []).observed).toBeNull();
  });
});

describe('quantileStatus', () => {
  const line = (judged: HealthStatus[], unmeasured: number): HealthStatus[] => [
    ...judged,
    ...Array<HealthStatus>(unmeasured).fill('no-data')
  ];

  it('takes the level the unhappiest quarter reaches', () => {
    expect(quantileStatus(['severe', 'gap', 'normal', 'normal'])).toBe('gap');
  });

  it('judges a line on the sections it can measure', () => {
    expect(quantileStatus(line(['gap', 'gap', 'normal', 'normal'], 4))).toBe('gap');
  });

  it('judges a line measured right down to the floor', () => {
    expect(quantileStatus(line(['gap', 'gap', 'normal', 'normal'], 12))).toBe('gap');
  });

  it('will not call a line bunched off six sections out of sixty-eight', () => {
    expect(quantileStatus(line(Array<HealthStatus>(6).fill('bunching'), 62))).toBe('no-data');
  });

  it('still judges a two section line that is fully measured', () => {
    expect(quantileStatus(['bunching', 'normal'])).toBe('bunching');
  });

  it('judges a two section line off the one section it can measure', () => {
    expect(quantileStatus(['bunching', 'no-data'])).toBe('bunching');
  });

  it('takes the floor from the config it is given', () => {
    const strict = { ...HEALTH, minCoverage: 0.5 };
    expect(quantileStatus(line(['gap', 'gap', 'normal', 'normal'], 12), strict)).toBe('no-data');
  });

  it('has nothing to say when nothing was measured', () => {
    expect(quantileStatus(line([], 12))).toBe('no-data');
  });

  it('has nothing to say about a set with no sections at all', () => {
    expect(quantileStatus([])).toBe('no-data');
  });
});
