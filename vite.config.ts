import adapterCloudflare from '@sveltejs/adapter-cloudflare';
import adapterNode from '@sveltejs/adapter-node';
import adapterVercel from '@sveltejs/adapter-vercel';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { sentryVitePlugin } from '@sentry/vite-plugin';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

const plausible = process.env.PUBLIC_PLAUSIBLE_SCRIPT ?? '';
const sentry = process.env.PUBLIC_SENTRY_DSN ?? '';
const uploadMaps = Boolean(process.env.SENTRY_AUTH_TOKEN && process.env.SENTRY_URL);

const adapters = {
  node: () => adapterNode(),
  vercel: () => adapterVercel({ runtime: 'nodejs22.x' }),
  cloudflare: () => adapterCloudflare()
};
const adapter = adapters[process.env.ADAPTER as keyof typeof adapters] ?? adapters.vercel;

export default defineConfig({
  define: {
    'import.meta.env.PUBLIC_PLAUSIBLE_SCRIPT': JSON.stringify(plausible),
    'import.meta.env.PUBLIC_SENTRY_DSN': JSON.stringify(sentry),
    'import.meta.env.SENTRY_RELEASE': JSON.stringify(process.env.GITHUB_SHA ?? '')
  },
  plugins: [
    sveltekit({ preprocess: vitePreprocess(), adapter: adapter() }),
    uploadMaps &&
      sentryVitePlugin({
        telemetry: false,
        release: { create: false, finalize: false, setCommits: false, deploy: false },
        bundleSizeOptimizations: { excludeDebugStatements: true, excludeTracing: true },
        sourcemaps: {
          assets: '.svelte-kit/output/client/**',
          filesToDeleteAfterUpload: '.svelte-kit/output/**/*.map'
        }
      })
  ],
  build: {
    // Fontsource subsets are small enough that Vite inlines them, which a strict CSP then blocks.
    assetsInlineLimit: (file) => (file.endsWith('.woff2') ? false : undefined),
    sourcemap: uploadMaps && 'hidden'
  },
  test: { include: ['src/**/*.test.ts', 'scripts/**/*.test.mjs'] }
});
