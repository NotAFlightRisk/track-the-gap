import { error } from '@sveltejs/kit';
import { networkView } from '$lib/server/snapshot';

export const load = async () => {
  try {
    return { view: await networkView() };
  } catch {
    error(503, 'TfL is not answering at the moment. Give it a minute and try again.');
  }
};
