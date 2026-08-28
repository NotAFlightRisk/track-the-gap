import { error, json } from '@sveltejs/kit';
import { lineView } from '$lib/server/snapshot';

export const GET = async ({ params, setHeaders }) => {
  const payload = await lineView(params.line);
  if (!payload) error(404, 'No such line');
  setHeaders({
    'cache-control': `public, max-age=0, s-maxage=${Math.round(payload.meta.pollSeconds)}`
  });
  return json(payload);
};
