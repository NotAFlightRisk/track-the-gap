import { afterEach, describe, expect, it, vi } from 'vitest';
import { createLive } from './live.svelte';

const source = { url: '/api/network', initial: { n: 0 }, seconds: 15 };

const answering = async () => ({ ok: true, json: async () => ({ n: 1 }) });

/** Runs a few polls and hands back the state plus the fetch it called. */
async function poll(answer: () => Promise<unknown> = answering, times = 1) {
  const listeners: (() => Promise<void>)[] = [];
  const fetching = vi.fn(answer);

  vi.stubGlobal('fetch', fetching);
  vi.stubGlobal('document', {
    hidden: false,
    addEventListener: (_: string, tick: () => Promise<void>) => listeners.push(tick),
    removeEventListener: () => {}
  });

  const live = createLive(() => source);
  const stop = live.start();
  for (let tick = 0; tick < times; tick++) await listeners[0]();
  stop();

  return { live, fetching };
}

describe('createLive', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('revalidates every poll rather than reading its own cache', async () => {
    const { fetching } = await poll();
    expect(fetching).toHaveBeenCalledWith(source.url, {
      cache: 'no-cache',
      signal: expect.any(AbortSignal)
    });
  });

  it('holds what the poll returned', async () => {
    const { live } = await poll();
    expect(live.data).toEqual({ n: 1 });
  });

  it('goes offline when two polls in a row cannot reach the server', async () => {
    const { live } = await poll(() => Promise.reject(new TypeError('Failed to fetch')), 2);
    expect(live.offline).toBe(true);
  });

  it('stays online while the server answers, even with an error', async () => {
    const { live } = await poll(async () => ({ ok: false, status: 503 }), 2);
    expect(live.offline).toBe(false);
    expect(live.data).toEqual(source.initial);
  });
});
