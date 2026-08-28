import { describe, expect, it } from 'vitest';
import { classify, HEALTH } from '$lib/config/health';
import type { DirectionModel, Segment } from '$lib/network/types';
import { arrivalsOn, expectedAt, measure } from './headway';
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

  it('ignores two predictions for the same move', () => {
    expect(measure(at(0, 0.1, 2), 120).gaps).toEqual([120]);
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

describe('expectedAt', () => {
  it('reads the timetabled headway for the hour', () => {
    expect(expectedAt(model, 'A>B', { day: 'mon-thu', hour: 8 })).toBe(150);
  });

  it('borrows the neighbouring hour when one is empty', () => {
    expect(expectedAt(model, 'A>B', { day: 'mon-thu', hour: 9 })).toBe(150);
  });

  it('falls back to the configured headway two hours out', () => {
    expect(expectedAt(model, 'A>B', { day: 'mon-thu', hour: 14 })).toBe(
      HEALTH.fallbackHeadwaySeconds
    );
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
