import { json } from '@sveltejs/kit';
import { networkView } from '$lib/server/snapshot';

export const GET = async ({ setHeaders }) => {
  const view = await networkView();
  setHeaders({
    'cache-control': `public, max-age=0, s-maxage=${Math.round(view.meta.pollSeconds)}`
  });
  return json(view);
};
