import type { HandleServerError } from '@sveltejs/kit/hooks';
import { report } from '#lib/server/report.js';

// Our TfL key rides along in the query string of every call we make to them
const scrub = (text: string) => text.replace(/(app_key=)[^&#"\\\s]*/g, '$1…');

export const handleError: HandleServerError = async ({ kind, error, event }) => {
  if (import.meta.env.PUBLIC_SENTRY_DSN && kind === 'unknown') await report(error, event, scrub);
};
