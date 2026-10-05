import { captureException, setAsyncLocalStorageAsyncContextStrategy } from '@sentry/cloudflare';
import { wrapRequestHandler } from '@sentry/cloudflare/request';
import type { Handle, HandleServerError } from '@sveltejs/kit';
import { privacy } from '$lib/reporting';

const dsn = import.meta.env.PUBLIC_SENTRY_DSN;
// Keeps each request's reports apart when a Worker is handling several at once
if (dsn) setAsyncLocalStorageAsyncContextStrategy();

export const handle: Handle = ({ event, resolve }) => {
  const context = event.platform?.ctx;
  if (!dsn || !context) return resolve(event);
  const options = { dsn, ...privacy };
  return wrapRequestHandler({ options, request: event.request, context }, () => resolve(event));
};

export const handleError: HandleServerError = ({ error, status }) => {
  if (dsn && status >= 500) captureException(error);
};
