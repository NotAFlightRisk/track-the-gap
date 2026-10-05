import type { RequestEvent } from '@sveltejs/kit';

interface Exception {
  type: string;
  value: string;
  stacktrace: { frames: object[] };
}

// Workers are V8, so there's one stack format. Sentry wants the oldest call first
const frames = (stack = '') =>
  stack
    .split('\n')
    .slice(1)
    .reverse()
    .flatMap((line) => {
      const [, fn, filename, lineno, colno] =
        /at (?:(.+?) \()?(.+?):(\d+):(\d+)\)?$/.exec(line) ?? [];
      return filename
        ? [{ function: fn, filename, lineno: +lineno, colno: +colno, in_app: true }]
        : [];
    });

// Each cause is its own exception, root cause first
const chain = (error: unknown): Exception[] => {
  const err = error instanceof Error ? error : new Error(String(error));
  const self = { type: err.name, value: err.message, stacktrace: { frames: frames(err.stack) } };
  return err.cause ? [...chain(err.cause), self] : [self];
};

/** Sends one error straight to Bugsink, as the Sentry SDK would nearly double the Worker */
export function report(
  error: unknown,
  { url, request, platform }: RequestEvent,
  scrub: (text: string) => string
) {
  const { origin, pathname, username } = new URL(import.meta.env.PUBLIC_SENTRY_DSN);
  const event = {
    platform: 'javascript',
    level: 'error',
    release: import.meta.env.SENTRY_RELEASE || undefined,
    tags: { runtime: 'worker' },
    request: {
      url: url.href,
      method: request.method,
      headers: { 'User-Agent': request.headers.get('user-agent') }
    },
    exception: { values: chain(error) }
  };
  const sent = fetch(`${origin}/api${pathname}/store/?sentry_key=${username}&sentry_version=7`, {
    method: 'POST',
    body: scrub(JSON.stringify(event))
  }).catch(() => {});
  platform?.ctx.waitUntil(sent);
}
