import { lineBySlug } from '$lib/config/lines';

export const match = (param: string): boolean => Boolean(lineBySlug(param));
