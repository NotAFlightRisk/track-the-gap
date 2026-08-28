import { network } from '$lib/server/network';

export const load = () => ({ generated: network.generated });
