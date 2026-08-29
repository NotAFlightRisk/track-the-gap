import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const START = new Date('2026-08-29T01:00:00Z');
const AFTER_ONE = new Date('2026-08-29T01:05:00Z');
const AFTER_TWO = new Date('2026-08-29T01:10:00Z');

const prediction = {
  vehicleId: '101',
  naptanId: '940GZZLUKSX',
  lineId: 'victoria',
  platformName: 'Northbound - Platform 1',
  direction: 'inbound',
  towards: 'Walthamstow Central',
  expectedArrival: '2026-08-29T01:02:00Z',
  timeToStation: 120,
  currentLocation: 'At Euston'
};

const victoria = (description: string, severity: number) => [
  {
    id: 'victoria',
    lineStatuses: [{ statusSeverity: severity, statusSeverityDescription: description }]
  }
];

const ok = (body: unknown) => ({ ok: true, status: 200, json: async () => body });
const isArrivals = (url: URL | string) => String(url).includes('/Arrivals');

const serving = (statuses: unknown, arrivals: 'ok' | 'down') => (url: URL) => {
  if (!isArrivals(url)) return Promise.resolve(ok(statuses));
  return arrivals === 'ok'
    ? Promise.resolve(ok([prediction]))
    : Promise.reject(new Error('TfL 503 on /Arrivals'));
};

const officialOn = (view: { lines: { id: string; official: { description: string } }[] }) =>
  view.lines.find((line) => line.id === 'victoria')?.official.description;

describe('networkView while the arrivals feed is down', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(START);
    vi.resetModules();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('keeps taking official line status that is still arriving', async () => {
    vi.stubGlobal('fetch', vi.fn(serving(victoria('Good Service', 10), 'ok')));
    const { networkView } = await import('./snapshot');
    expect(officialOn(await networkView())).toBe('Good Service');

    vi.setSystemTime(AFTER_ONE);
    vi.stubGlobal('fetch', vi.fn(serving(victoria('Severe Delays', 6), 'down')));
    expect(officialOn(await networkView())).toBe('Severe Delays');

    vi.setSystemTime(AFTER_TWO);
    vi.stubGlobal('fetch', vi.fn(serving(victoria('Part Suspended', 3), 'down')));
    expect(officialOn(await networkView())).toBe('Part Suspended');
  });
});
