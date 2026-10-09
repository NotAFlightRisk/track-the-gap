import { error, json } from '@sveltejs/kit';
import { networkView } from '$lib/server/snapshot';

export const GET = async ({ setHeaders }) => {
  const view = await networkView().catch(() =>
    error(503, 'TfL is not answering at the moment. Give it a minute and try again.')
  );
  setHeaders({
    'cache-control': `public, max-age=0, s-maxage=${Math.round(view.meta.pollSeconds)}`
  });
  return json(view);
};
