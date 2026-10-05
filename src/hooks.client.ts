import type { HandleClientError } from '@sveltejs/kit';

const dsn = import.meta.env.PUBLIC_SENTRY_DSN;
let sentry: Promise<(error: unknown) => void> | undefined;

// The SDK only downloads once something's actually broken, so pages that work never pay for it,
// and if it can't load (offline, or a newer deploy) the report's dropped rather than thrown again
function report(error: unknown) {
  sentry ??= import('$lib/sentry').then(({ start }) => start(dsn)).catch(() => () => {});
  sentry.then((capture) => capture(error));
}

if (dsn) {
  addEventListener('error', (event) => event.error && report(event.error));
  addEventListener('unhandledrejection', (event) => report(event.reason));
}

export const handleError: HandleClientError = ({ error, status }) => {
  if (dsn && status >= 500) report(error);
};
