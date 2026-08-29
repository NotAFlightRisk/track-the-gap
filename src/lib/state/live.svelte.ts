interface Source<T> {
  url: string;
  initial: T;
  seconds: number;
}

/**
 * Keeps a page on live data without a reload. The server-rendered payload stands in until the
 * first poll lands, and again the moment the URL changes, so a line swap never shows stale figures.
 */
export function createLive<T>(source: () => Source<T>) {
  let held = $state.raw<{ url: string; value: T } | null>(null);
  let failures = $state(0);

  const current = $derived(source());
  const data = $derived(held?.url === current.url ? held.value : current.initial);

  return {
    get data() {
      return data;
    },
    get offline() {
      return failures > 1;
    },
    start() {
      const { url, seconds } = current;
      const controller = new AbortController();

      const tick = async () => {
        if (document.hidden) return;
        try {
          const res = await fetch(url, { cache: 'no-cache', signal: controller.signal });
          if (!res.ok) throw new Error(String(res.status));
          held = { url, value: (await res.json()) as T };
          failures = 0;
        } catch {
          if (!controller.signal.aborted) failures += 1;
        }
      };

      const timer = setInterval(tick, seconds * 1000);
      document.addEventListener('visibilitychange', tick);

      return () => {
        controller.abort();
        clearInterval(timer);
        document.removeEventListener('visibilitychange', tick);
      };
    }
  };
}
