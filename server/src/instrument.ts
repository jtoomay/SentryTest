// Must be imported before anything else so Sentry can instrument Express/http.
import 'dotenv/config';
import * as Sentry from '@sentry/node';
import { scrub } from './scrub';

Sentry.init({
  dsn: process.env.SENTRY_DSN || undefined,
  environment: process.env.SENTRY_ENV ?? 'development',
  release: process.env.SENTRY_RELEASE,
  tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? '1.0'),
  // Logs (Sentry.logger.*) are on by default in SDK v11.
  // Don't auto-collect IPs or other user identity. The request middleware sets the user explicitly.
  dataCollection: { userInfo: false },
  beforeSend(event) {
    if (event.extra) event.extra = scrub(event.extra);
    if (event.contexts) event.contexts = scrub(event.contexts);
    if (event.request?.data) event.request.data = scrub(event.request.data);
    return event;
  },
});

if (!process.env.SENTRY_DSN) {
  console.warn('[sentry] SENTRY_DSN is not set; events will not be sent. Copy server/.env.example to server/.env.');
}
