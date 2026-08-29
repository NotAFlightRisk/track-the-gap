import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const READ_AT = new Date('2026-08-29T01:00:00Z');
const LATER = new Date('2026-08-29T01:05:00Z');

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

const ok = (body: unknown) => ({ ok: true, status: 200, json: async () => body });
const arrivals = (url: URL | string) => String(url).includes('/Arrivals');

const answering = (url: URL) => Promise.resolve(ok(arrivals(url) ? [prediction] : []));
const arrivalsDown = (url: URL) =>
  arrivals(url) ? Promise.reject(new Error('TfL 503 on /Arrivals')) : Promise.resolve(ok([]));

const fetching = async (responder: (url: URL) => Promise<unknown>) => {
  const mock = vi.fn(responder);
  vi.stubGlobal('fetch', mock);
  return mock;
};

describe('live', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(READ_AT);
    vi.resetModules();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('keeps the reading time of predictions it had to reuse', async () => {
    await fetching(answering);
    const { live } = await import('./tfl');
    const fresh = await live();
    expect(fresh.stale).toBe(false);

    vi.setSystemTime(LATER);
    await fetching(arrivalsDown);
    const reused = await live();

    expect(reused.predictions).toEqual(fresh.predictions);
    expect(reused.stale).toBe(true);
    expect(reused.fetchedAt).toBe(fresh.fetchedAt);
  });

  it('stamps predictions that did arrive with the time they arrived', async () => {
    await fetching(answering);
    const { live } = await import('./tfl');
    const fresh = await live();

    vi.setSystemTime(LATER);
    await fetching(answering);
    const again = await live();

    expect(again.stale).toBe(false);
    expect(again.fetchedAt).toBe(LATER.getTime());
    expect(again.fetchedAt).toBeGreaterThan(fresh.fetchedAt);
  });

  it('treats an answer that is not a list of arrivals as no answer at all', async () => {
    await fetching(answering);
    const { live } = await import('./tfl');
    const fresh = await live();

    vi.setSystemTime(LATER);
    await fetching((url) => Promise.resolve(ok(arrivals(url) ? { message: 'nope' } : [])));
    const malformed = await live();

    expect(malformed.predictions).toEqual(fresh.predictions);
    expect(malformed.fetchedAt).toBe(fresh.fetchedAt);
    expect(malformed.stale).toBe(true);
    expect(malformed.error).toContain('arrivals');
  });

  it('keeps the last line status rather than blanking it on a malformed answer', async () => {
    const running = [
      {
        id: 'victoria',
        lineStatuses: [{ statusSeverity: 10, statusSeverityDescription: 'Good Service' }]
      }
    ];
    await fetching((url) => Promise.resolve(ok(arrivals(url) ? [prediction] : running)));
    const { live } = await import('./tfl');
    const fresh = await live();
    expect(fresh.statuses).toHaveLength(1);

    vi.setSystemTime(LATER);
    await fetching((url) => Promise.resolve(ok(arrivals(url) ? [prediction] : { fault: 'nope' })));
    const malformed = await live();

    expect(malformed.statuses).toEqual(fresh.statuses);
    expect(malformed.stale).toBe(true);
    expect(malformed.error).toContain('line status');
  });

  it('still reports line status it had to reuse as stale', async () => {
    await fetching(answering);
    const { live } = await import('./tfl');
    await live();

    vi.setSystemTime(LATER);
    await fetching((url) =>
      arrivals(url) ? Promise.resolve(ok([prediction])) : Promise.reject(new Error('TfL 500'))
    );
    const half = await live();

    expect(half.stale).toBe(true);
    expect(half.error).toContain('line status');
    expect(half.fetchedAt).toBe(LATER.getTime());
  });
});
