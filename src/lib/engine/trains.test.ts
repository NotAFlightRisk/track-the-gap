import { describe, expect, it } from 'vitest';
import type { DirectionModel } from '$lib/network/types';
import { buildTrains, type Prediction } from './trains';

const NAMES: Record<string, string> = { A: 'Alpha', B: 'Bravo', C: 'Charlie', X: 'X-ray' };
const stationName = (id: string) => NAMES[id] ?? id;

const direction = (
  name: 'inbound' | 'outbound',
  stops: string[],
  extra: [string, string][] = []
): DirectionModel =>
  ({
    direction: name,
    name,
    patterns: [{ id: `${name}-0`, name: 'test', stops }],
    segments: [
      ...stops.slice(1).map((to, i) => ({ from: stops[i], to, runTime: 120, patterns: [] })),
      ...extra.map(([from, to]) => ({ from, to, runTime: 120, patterns: [] }))
    ],
    layout: Object.fromEntries(stops.map((stop, i) => [stop, { x: i * 2, row: 0 }])),
    expected: {}
  }) as unknown as DirectionModel;

const inbound = direction('inbound', ['A', 'B', 'C']);
const outbound = direction('outbound', ['C', 'B', 'A']);
const models = [inbound, outbound];

const call = (over: Partial<Prediction>): Prediction => ({
  vehicleId: '101',
  naptanId: 'B',
  lineId: 'test',
  platformName: 'Northbound - Platform 1',
  direction: 'inbound',
  towards: 'Charlie',
  expectedArrival: new Date(Date.now() + 60_000).toISOString(),
  timeToStation: 60,
  currentLocation: 'Between Alpha and Bravo',
  ...over
});

describe('buildTrains', () => {
  it('groups predictions into one train per vehicle', () => {
    const trains = buildTrains(
      [call({ naptanId: 'B', timeToStation: 60 }), call({ naptanId: 'C', timeToStation: 180 })],
      models,
      { stationName }
    );
    expect(trains).toHaveLength(1);
    expect(trains[0].calls.map((c) => c.stop)).toEqual(['B', 'C']);
    expect(trains[0].next).toBe('B');
  });

  it('marks a train TfL will not identify as inferred', () => {
    const trains = buildTrains([call({ vehicleId: '000' })], models, { stationName });
    expect(trains.map((t) => t.inferred)).toEqual([true]);
  });

  it('works out direction from the order of the calls', () => {
    const trains = buildTrains(
      [
        call({ vehicleId: '202', naptanId: 'B', timeToStation: 60 }),
        call({ vehicleId: '202', naptanId: 'A', timeToStation: 180 })
      ],
      models,
      { stationName }
    );
    expect(trains[0].direction).toBe('outbound');
  });

  it('falls back to the only direction that can reach the stop', () => {
    const trains = buildTrains([call({ naptanId: 'A', direction: undefined })], models, {
      stationName
    });
    expect(trains.map((t) => t.direction)).toEqual(['outbound']);
  });

  it('leaves a stop both directions can reach alone', () => {
    const trains = buildTrains([call({ naptanId: 'B', direction: undefined })], models, {
      stationName
    });
    expect(trains).toHaveLength(0);
  });

  it('rebuilds a two-station shuttle from its terminus predictions', () => {
    const shuttle = [direction('inbound', ['P', 'Q']), direction('outbound', ['Q', 'P'])];
    const trains = buildTrains(
      [
        call({ naptanId: 'Q', direction: undefined, platformName: 'Eastbound - Platform 8' }),
        call({ naptanId: 'Q', direction: undefined, platformName: 'Westbound - Platform 7' })
      ],
      shuttle,
      { stationName }
    );
    expect(trains).toHaveLength(1);
    expect(trains[0].direction).toBe('inbound');
  });

  it('places a train back from its next stop by its own eta', () => {
    const [train] = buildTrains([call({ naptanId: 'C', timeToStation: 60 })], models, {
      stationName
    });
    expect(train.x).toBeCloseTo(4 - 1);
  });

  it('never places a train behind the station it has left', () => {
    const [train] = buildTrains([call({ naptanId: 'C', timeToStation: 900 })], models, {
      stationName
    });
    expect(train.x).toBe(2);
  });

  it('picks the approach a junction train actually came from', () => {
    const junction = direction('inbound', ['A', 'B', 'C'], [['X', 'B']]);
    const [train] = buildTrains(
      [call({ currentLocation: 'Between X-ray and Bravo' })],
      [junction],
      {
        stationName
      }
    );
    expect(train.from).toBe('X');
  });

  it('stops at the terminus rather than following the return leg', () => {
    const [train] = buildTrains(
      [
        call({ naptanId: 'B', timeToStation: 60 }),
        call({ naptanId: 'C', timeToStation: 180 }),
        call({ naptanId: 'B', timeToStation: 400 }),
        call({ naptanId: 'A', timeToStation: 520 })
      ],
      models,
      { stationName }
    );
    expect(train.calls.map((c) => c.stop)).toEqual(['B', 'C']);
  });

  it('ignores predictions beyond the horizon', () => {
    const [train] = buildTrains(
      [call({ naptanId: 'B', timeToStation: 60 }), call({ naptanId: 'C', timeToStation: 4000 })],
      models,
      { stationName, horizonSeconds: 600 }
    );
    expect(train.calls).toHaveLength(1);
  });
});

describe('trains TfL will not identify', () => {
  const anon = (over: Partial<Prediction>) => call({ vehicleId: '000', ...over });

  it('rebuilds one train from its predictions at several stations', () => {
    const trains = buildTrains(
      [
        anon({ naptanId: 'B', timeToStation: 60, destinationNaptanId: 'C' }),
        anon({ naptanId: 'C', timeToStation: 180, destinationNaptanId: 'C' })
      ],
      [inbound],
      { stationName }
    );
    expect(trains).toHaveLength(1);
    expect(trains[0].inferred).toBe(true);
    expect(trains[0].calls.map((c) => c.stop)).toEqual(['B', 'C']);
  });

  it('keeps two trains apart when they are a headway apart', () => {
    const trains = buildTrains(
      [
        anon({ naptanId: 'C', timeToStation: 60, destinationNaptanId: 'C' }),
        anon({ naptanId: 'C', timeToStation: 300, destinationNaptanId: 'C' })
      ],
      [inbound],
      { stationName }
    );
    expect(trains).toHaveLength(2);
  });

  it('does not rebuild a train the line already identified', () => {
    const trains = buildTrains(
      [
        call({ vehicleId: '303', naptanId: 'B', timeToStation: 60, destinationNaptanId: 'C' }),
        anon({ naptanId: 'B', timeToStation: 70, destinationNaptanId: 'C' })
      ],
      [inbound],
      { stationName }
    );
    expect(trains.map((t) => t.vehicleId)).toEqual(['303']);
  });

  it('does not put an inferred train on the wrong direction', () => {
    const trains = buildTrains(
      [anon({ naptanId: 'B', timeToStation: 60, destinationNaptanId: 'C', direction: undefined })],
      models,
      { stationName }
    );
    expect(trains.map((t) => t.direction)).toEqual(['inbound']);
  });
});
