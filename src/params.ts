import { defineParams } from '@sveltejs/kit/params';
// the build imports this file with plain Node, which won't map .js to .ts
import { lineBySlug } from '#lib/config/lines.ts';

export const params = defineParams({
  line: (param) => (lineBySlug(param) ? param : undefined)
});
