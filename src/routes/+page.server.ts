import { networkView } from '$lib/server/snapshot';

export const load = async () => ({ view: await networkView() });
