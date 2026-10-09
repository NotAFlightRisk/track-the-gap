import { error, json } from '@sveltejs/kit';
import { lineView } from '$lib/server/snapshot';

export const GET = async ({ params, setHeaders }) => {
  const payload = await lineView(params.line).catch(() =>
    error(503, 'TfL is not answering at the moment. Give it a minute and try again.')
  );
  if (!payload) error(404, 'No such line');
  setHeaders({
    'cache-control': `public, max-age=0, s-maxage=${Math.round(payload.meta.pollSeconds)}`
  });
  return json(payload);
};
