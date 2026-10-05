import { sentryVitePlugin } from '@sentry/vite-plugin';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

const plausible = process.env.PUBLIC_PLAUSIBLE_SCRIPT ?? '';
const sentry = process.env.PUBLIC_SENTRY_DSN ?? '';
const uploadMaps = Boolean(process.env.SENTRY_AUTH_TOKEN && process.env.SENTRY_URL);

export default defineConfig({
  define: {
    'import.meta.env.PUBLIC_PLAUSIBLE_SCRIPT': JSON.stringify(plausible),
    'import.meta.env.PUBLIC_SENTRY_DSN': JSON.stringify(sentry),
    'import.meta.env.SENTRY_RELEASE': JSON.stringify(process.env.GITHUB_SHA ?? '')
  },
  plugins: [
    sveltekit(),
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
