import { error } from '@sveltejs/kit';
import { lineView } from '$lib/server/snapshot';

export const load = async ({ params }) => {
  let payload;
  try {
    payload = await lineView(params.line);
  } catch {
    error(503, 'TfL is not answering at the moment. Give it a minute and try again.');
  }
  if (!payload) error(404, 'No such line');
  return payload;
};
