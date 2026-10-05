import type { HandleServerError } from '@sveltejs/kit';
import { report } from '$lib/server/report';

// Our TfL key rides along in the query string of every call we make to them
const scrub = (text: string) => text.replace(/(app_key=)[^&#"\\\s]*/g, '$1…');

export const handleError: HandleServerError = ({ error, event, status }) => {
  if (import.meta.env.PUBLIC_SENTRY_DSN && status >= 500) report(error, event, scrub);
};
