import adapterNode from '@sveltejs/adapter-node';
import adapterVercel from '@sveltejs/adapter-vercel';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

const adapter =
  process.env.ADAPTER === 'node' ? adapterNode() : adapterVercel({ runtime: 'nodejs22.x' });

export default {
  preprocess: vitePreprocess(),
  kit: { adapter }
};
