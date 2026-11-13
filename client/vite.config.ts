import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { sentryVitePlugin } from '@sentry/vite-plugin';

export default defineConfig(({ mode }) => {
  // Load all vars (not only VITE_*) so the auth token is available to the plugin
  // but never shipped to the browser.
  const env = loadEnv(mode, process.cwd(), '');
  const uploadSourceMaps = Boolean(env.SENTRY_AUTH_TOKEN && env.SENTRY_ORG && env.SENTRY_PROJECT);

  return {
    plugins: [
      react(),
      sentryVitePlugin({
        org: env.SENTRY_ORG,
        project: env.SENTRY_PROJECT,
        authToken: env.SENTRY_AUTH_TOKEN,
        disable: !uploadSourceMaps,
        release: { name: env.VITE_SENTRY_RELEASE },
        sourcemaps: { filesToDeleteAfterUpload: ['./dist/**/*.map'] },
        telemetry: false,
      }),
    ],
    // Replay + Feedback make the bundle ~550 kB; that's expected for this demo.
    build: { sourcemap: true, chunkSizeWarningLimit: 800 },
    // '^/api/' (regex) instead of '/api' so a page load of the /api route is served by Vite,
    // not forwarded to Express.
    server: {
      port: 5173,
      proxy: { '^/api/': 'http://localhost:4000' },
    },
    preview: {
      port: 4173,
      proxy: { '^/api/': 'http://localhost:4000' },
    },
  };
});
