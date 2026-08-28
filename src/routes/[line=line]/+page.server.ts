import { error } from '@sveltejs/kit';
import { lineView } from '$lib/server/snapshot';

export const load = async ({ params }) => {
  const payload = await lineView(params.line);
  if (!payload) error(404, 'No such line');
  return payload;
};
