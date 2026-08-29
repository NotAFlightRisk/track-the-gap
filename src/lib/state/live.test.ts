import { afterEach, describe, expect, it, vi } from 'vitest';
import { createLive } from './live.svelte';

const source = { url: '/api/network', initial: { n: 0 }, seconds: 15 };

/** Runs one poll and hands back the state plus the fetch it called. */
async function poll() {
  const listeners: (() => Promise<void>)[] = [];
  const fetching = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ n: 1 }) });

  vi.stubGlobal('fetch', fetching);
  vi.stubGlobal('document', {
    hidden: false,
    addEventListener: (_: string, tick: () => Promise<void>) => listeners.push(tick),
    removeEventListener: () => {}
  });

  const live = createLive(() => source);
  const stop = live.start();
  await listeners[0]();
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
});
