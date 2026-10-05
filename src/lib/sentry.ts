import { captureException, init } from '@sentry/browser';
import { privacy } from './reporting';

export function start(dsn: string) {
  init({
    dsn,
    sendClientReports: false,
    integrations: (all) => all.filter(({ name }) => name !== 'BrowserSession'),
    ...privacy
  });
  return captureException;
}
