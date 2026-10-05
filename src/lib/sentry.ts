import { captureException, init } from '@sentry/browser';

// hooks.client.ts catches errors itself, and Bugsink has no use for sessions
const skip = ['GlobalHandlers', 'BrowserApiErrors', 'BrowserSession'];

export function start(dsn: string) {
  init({
    dsn,
    sendClientReports: false,
    dataCollection: { userInfo: false },
    integrations: (all) => all.filter(({ name }) => !skip.includes(name))
  });
  return captureException;
}
