import * as Sentry from '@sentry/react';
import { api } from '../api/client';
import { DemoCard } from '../components/DemoCard';
import { BuggyComponentDemo } from '../components/BuggyComponent';

// --- frontend error helpers (named functions give the stack trace real frames) ---

interface Profile {
  displayName: string;
}

function renderGreeting(user: { profile?: Profile }) {
  return `Hello, ${user.profile!.displayName.toUpperCase()}`;
}

async function submitCheckout() {
  await new Promise((r) => setTimeout(r, 50));
  throw new Error('Checkout service rejected the cart: token expired');
}

class PaymentDeclinedError extends Error {
  constructor(public provider: string, public code: string) {
    super(`Payment declined by ${provider} (${code}) for order #${Math.floor(Math.random() * 90000) + 10000}`);
    this.name = 'PaymentDeclinedError';
  }
}

const providers = ['stripe', 'paypal', 'adyen'] as const;

export function ErrorLab() {
  return (
    <div className="page">
      <h1>Error Lab</h1>
      <p className="lead">
        Errors from the frontend and the backend. Each one becomes an issue with a full stack trace, breadcrumbs, tags,
        context, and a Session Replay of what happened just before.
      </p>

      <h2>Frontend</h2>
      <div className="grid">
        <DemoCard
          title="Unhandled exception"
          description="A TypeError thrown in an event handler that nothing catches."
          lookFor="Issues → TypeError, handled: no, mechanism: auto.browser.global_handlers. A source-mapped stack pointing at renderGreeting(), breadcrumbs for your recent clicks, and a Replay tab."
          actions={[
            {
              label: 'Throw TypeError',
              tone: 'danger',
              unhandled: true,
              run: () => renderGreeting({}),
            },
          ]}
        />

        <DemoCard
          title="Unhandled promise rejection"
          description="An async function rejects and nobody awaits it."
          lookFor="Issues → an Error with mechanism onunhandledrejection and the async stack through submitCheckout()."
          actions={[{ label: 'Reject promise', tone: 'danger', unhandled: true, run: () => submitCheckout() }]}
        />

        <DemoCard
          title="Handled exception + tags"
          description="We catch a JSON parse error and report it with Sentry.captureException, adding tags and extra data."
          lookFor="Issues → SyntaxError, handled: yes, level: warning. Search with tags like feature:csv-import; the raw input is under Additional Data."
          actions={[
            {
              label: 'Capture handled error',
              tone: 'warning',
              run: () => {
                const raw = '{"name": "Widget", "price": }';
                try {
                  return JSON.parse(raw);
                } catch (err) {
                  const eventId = Sentry.captureException(err, {
                    level: 'warning',
                    tags: { feature: 'csv-import', handled: 'yes' },
                    extra: { rawInput: raw, row: 17 },
                  });
                  return { eventId, recovered: true };
                }
              },
            },
          ]}
        />

        <DemoCard
          title="Capture messages"
          description="Sentry.captureMessage records something notable that isn't an exception."
          lookFor="Issues → message events at each severity. Filter the issue list by level."
          actions={(['info', 'warning', 'error'] as const).map((level) => ({
            label: level,
            tone: level === 'info' ? ('info' as const) : level === 'warning' ? ('warning' as const) : ('danger' as const),
            run: () => ({ eventId: Sentry.captureMessage(`Frontend message at level "${level}"`, level) }),
          }))}
        />

        <BuggyComponentDemo />

        <DemoCard
          title="Custom fingerprinting"
          description="Payment errors have a different order # in every message. A fingerprint groups them by provider instead."
          lookFor="Click a few times. Issues → one PaymentDeclinedError issue per provider (stripe / paypal / adyen), each with a rising event count, not one issue per order."
          actions={[
            {
              label: 'Decline a random payment',
              tone: 'danger',
              run: () => {
                const provider = providers[Math.floor(Math.random() * providers.length)];
                const err = new PaymentDeclinedError(provider, 'card_declined');
                const eventId = Sentry.withScope((scope) => {
                  scope.setFingerprint(['payment-declined', provider]);
                  scope.setTag('payment.provider', provider);
                  return Sentry.captureException(err);
                });
                return { eventId, provider };
              },
            },
          ]}
        />

        <DemoCard
          title="Breadcrumb trail"
          description="Adds a series of custom breadcrumbs (what the user did), then reports an error."
          lookFor="Breadcrumbs section of the issue: custom 'cart' and 'navigation' crumbs with data, mixed in with the automatic click, fetch and console crumbs."
          actions={[
            {
              label: 'Simulate checkout journey',
              tone: 'danger',
              run: () => {
                const steps = [
                  { category: 'navigation', message: 'Opened product page', data: { productId: 2 } },
                  { category: 'cart', message: 'Added 4K Monitor to cart', data: { qty: 1, price: 399 } },
                  { category: 'cart', message: 'Applied coupon', data: { code: 'BLACKFRIDAY' } },
                  { category: 'navigation', message: 'Opened checkout' },
                  { category: 'cart', message: 'Coupon rejected by server', level: 'warning' as const },
                ];
                steps.forEach((s) => Sentry.addBreadcrumb(s));
                console.warn('Coupon BLACKFRIDAY expired');
                return { eventId: Sentry.captureException(new Error('Checkout total mismatch after coupon removal')) };
              },
            },
          ]}
        />

        <DemoCard
          title="Attachment"
          description="Adds a JSON file (the cart state) to the event."
          lookFor="The issue's Attachments tab has cart-state.json, which you can download."
          actions={[
            {
              label: 'Report with attachment',
              tone: 'danger',
              run: () => {
                const eventId = Sentry.withScope((scope) => {
                  scope.addAttachment({
                    filename: 'cart-state.json',
                    contentType: 'application/json',
                    data: JSON.stringify(
                      { items: [{ sku: 'KB-01', qty: 1 }, { sku: 'MON-4K', qty: 1 }], coupon: null, currency: 'USD' },
                      null,
                      2,
                    ),
                  });
                  return Sentry.captureException(new Error('Cart could not be persisted'));
                });
                return { eventId };
              },
            },
          ]}
        />

        <DemoCard
          title="PII scrubbing (beforeSend)"
          description="Sends an error with a fake card number, password and email. beforeSend scrubs them in the browser before the event is sent."
          lookFor="In the event, card_number and password show [Filtered], and the email in the notes shows [email redacted]. The raw values never reach Sentry."
          actions={[
            {
              label: 'Send event with PII',
              tone: 'danger',
              run: () => {
                const payload = {
                  card_number: '4111 1111 1111 1111',
                  password: 'hunter2',
                  notes: 'Customer jane.doe@example.com asked for a refund',
                  amount: 42.5,
                };
                const eventId = Sentry.captureException(new Error('Refund request failed'), {
                  extra: payload,
                  contexts: { refund: payload },
                });
                return { eventId, sentLocally: payload, note: 'Sentry receives a scrubbed copy' };
              },
            },
          ]}
        />
      </div>

      <h2>Backend (distributed tracing)</h2>
      <p className="muted">
        Each call fails on the server. The backend reports the error, the frontend reports the failed request, and both
        events share a <strong>trace id</strong>, so you can jump between them in Sentry.
      </p>
      <div className="grid">
        <DemoCard
          title="Server crashes"
          description="Unhandled errors inside Express routes, caught by Sentry.setupExpressErrorHandler."
          lookFor="Two linked issues (frontend ApiError and backend error). Open the trace to see both, with the failing server span in red."
          actions={[
            { label: 'Sync throw', tone: 'danger', run: () => api('/api/errors/sync') },
            { label: 'Async rejection', tone: 'danger', run: () => api('/api/errors/async') },
            { label: 'Upstream timeout', tone: 'danger', run: () => api('/api/errors/timeout') },
          ]}
        />

        <DemoCard
          title="Chained errors (cause)"
          description="Order failed ← stock reservation failed ← inventory service 503, linked with Error.cause."
          lookFor="The backend issue shows all three exceptions stacked, each with its own stack trace."
          actions={[{ label: 'Trigger chained error', tone: 'danger', run: () => api('/api/errors/nested') }]}
        />

        <DemoCard
          title="DB failure with context"
          description="A simulated connection pool failure with database context and tags."
          lookFor="Backend issue → Contexts → database (host, pool stats, query) and the tag db.pool:exhausted."
          actions={[{ label: 'Exhaust the pool', tone: 'danger', run: () => api('/api/errors/db') }]}
        />

        <DemoCard
          title="Backend handled error & messages"
          description="The server catches an error and still returns 200, or records a plain message."
          lookFor="A backend-only issue (handled: yes). The frontend gets a 200 and reports nothing."
          actions={[
            { label: 'Handled on server', tone: 'warning', run: () => api('/api/errors/handled') },
            { label: 'Server message', tone: 'info', run: () => api('/api/errors/message?level=warning') },
          ]}
        />
      </div>
    </div>
  );
}
