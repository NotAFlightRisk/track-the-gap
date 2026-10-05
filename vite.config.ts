import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

const plausible = process.env.PUBLIC_PLAUSIBLE_SCRIPT ?? '';

export default defineConfig({
  define: { 'import.meta.env.PUBLIC_PLAUSIBLE_SCRIPT': JSON.stringify(plausible) },
  plugins: [sveltekit()],
  // Fontsource subsets are small enough that Vite inlines them, which a strict CSP then blocks.
  build: { assetsInlineLimit: (file) => (file.endsWith('.woff2') ? false : undefined) },
  test: { include: ['src/**/*.test.ts', 'scripts/**/*.test.mjs'] }
});
