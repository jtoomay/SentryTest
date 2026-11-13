import { useEffect } from 'react';
import * as Sentry from '@sentry/react';
import { createRoutesFromChildren, matchRoutes, useLocation, useNavigationType } from 'react-router-dom';
import { scrub } from './scrub';

const env = import.meta.env;

export const sentryConfig = {
  dsnConfigured: Boolean(env.VITE_SENTRY_DSN),
  environment: env.VITE_SENTRY_ENV ?? 'development',
  release: env.VITE_SENTRY_RELEASE as string | undefined,
  org: env.VITE_SENTRY_ORG as string | undefined,
  projectUrl: (env.VITE_SENTRY_PROJECT_URL as string | undefined) || null,
};

Sentry.init({
  dsn: env.VITE_SENTRY_DSN || undefined,
  environment: sentryConfig.environment,
  release: sentryConfig.release,
  // Don't auto-collect IPs or other user identity. We set the user explicitly instead.
  dataCollection: { userInfo: false },

  integrations: [
    // Page loads and route changes become transactions named after the route pattern.
    Sentry.reactRouterV6BrowserTracingIntegration({
      useEffect,
      useLocation,
      useNavigationType,
      createRoutesFromChildren,
      matchRoutes,
    }),
    // Session Replay. Text is visible to make the demo readable;
    // anything with .sentry-mask is masked and .sentry-block is blocked.
    Sentry.replayIntegration({
      maskAllText: false,
      blockAllMedia: true,
      mask: ['.sentry-mask'],
      block: ['.sentry-block'],
    }),
    // Floating "Report a Bug" button.
    Sentry.feedbackIntegration({
      colorScheme: 'system',
      showBranding: false,
      triggerLabel: 'Report a bug',
    }),
    // Sends console.warn/error calls to Sentry Logs.
    Sentry.consoleLoggingIntegration({ levels: ['warn', 'error'] }),
  ],

  tracesSampleRate: Number(env.VITE_SENTRY_TRACES_SAMPLE_RATE ?? 1.0),
  // Add sentry-trace/baggage headers to our own API calls so frontend and backend share a trace.
  tracePropagationTargets: ['localhost', /^\/api\//],

  replaysSessionSampleRate: Number(env.VITE_SENTRY_REPLAYS_SESSION_SAMPLE_RATE ?? 0),
  replaysOnErrorSampleRate: 1.0,

  // Logs (Sentry.logger.*) are on by default in SDK v11. Use beforeSendLog to filter them.

  beforeSend(event) {
    if (event.extra) event.extra = scrub(event.extra);
    if (event.contexts) event.contexts = scrub(event.contexts);
    if (event.message) event.message = scrub(event.message);
    return event;
  },
});

/** Link to an event in Sentry when the org slug is configured. */
export function sentryEventUrl(eventId: string | undefined | null): string | null {
  if (!eventId || !sentryConfig.org) return null;
  return `https://${sentryConfig.org}.sentry.io/issues/?query=${eventId}`;
}
