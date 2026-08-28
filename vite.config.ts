import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [sveltekit()],
  // Fontsource subsets are small enough that Vite inlines them, which a strict CSP then blocks.
  build: { assetsInlineLimit: (file) => (file.endsWith('.woff2') ? false : undefined) },
  test: { include: ['src/**/*.test.ts'] }
});
