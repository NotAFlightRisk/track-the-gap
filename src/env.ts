import { defineEnvVars } from '@sveltejs/kit/env';

const optional = { schema: (value: string | undefined) => value };

export const variables = defineEnvVars({
  TFL_APP_KEY: optional,
  TFL_POLL_SECONDS: optional
});
