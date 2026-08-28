import adapterCloudflare from '@sveltejs/adapter-cloudflare';
import adapterNode from '@sveltejs/adapter-node';
import adapterVercel from '@sveltejs/adapter-vercel';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

const adapters = {
  node: () => adapterNode(),
  vercel: () => adapterVercel({ runtime: 'nodejs22.x' }),
  cloudflare: () => adapterCloudflare()
};

export default {
  preprocess: vitePreprocess(),
  kit: { adapter: (adapters[process.env.ADAPTER] ?? adapters.vercel)() }
};
