import { network } from '#lib/server/network.js';

export const load = () => ({ generated: network.generated });
