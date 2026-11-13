import { useState } from 'react';
import * as Sentry from '@sentry/react';
import { notifyError } from '../notify';

interface Cart {
  items: { name: string; price: number }[];
}

function CartSummary({ cart }: { cart: Cart | null }) {
  // Bug: renders before the cart has loaded.
  const total = cart!.items.reduce((sum, i) => sum + i.price, 0);
  return <p>Cart total: ${total.toFixed(2)}</p>;
}

/** A component that crashes during render. The ErrorBoundary catches it and shows the report dialog. */
export function BuggyComponentDemo() {
  const [broken, setBroken] = useState(false);
  const [key, setKey] = useState(0);

  return (
    <section className="card">
      <header>
        <h3>React render crash (ErrorBoundary)</h3>
        <p className="muted">
          A child component throws while rendering. <code>Sentry.ErrorBoundary</code> catches it, shows a fallback, and
          opens the user report dialog.
        </p>
      </header>

      <div className="boundary-box">
        <Sentry.ErrorBoundary
          key={key}
          showDialog
          onError={(error, _componentStack, eventId) => notifyError(error, { eventId, source: 'caught by ErrorBoundary' })}
          beforeCapture={(scope) => {
            scope.setTag('boundary', 'cart-summary');
            scope.setContext('cart', { state: 'not-loaded' });
          }}
          fallback={({ error, eventId, resetError }) => (
            <div className="fallback">
              <strong>Something broke in CartSummary.</strong>
              <p className="small">{error instanceof Error ? error.message : String(error)}</p>
              <p className="small">
                Event id: <code>{eventId}</code>
              </p>
              <button
                className="btn btn-info"
                onClick={() => {
                  setBroken(false);
                  setKey((k) => k + 1);
                  resetError();
                }}
              >
                Reset component
              </button>
            </div>
          )}
        >
          {broken ? <CartSummary cart={null} /> : <p className="muted">Component is healthy.</p>}
        </Sentry.ErrorBoundary>
      </div>

      <div className="actions">
        <button className="btn btn-danger" onClick={() => setBroken(true)} disabled={broken}>
          Crash the component
        </button>
      </div>

      <div className="look-for">
        <strong>What to look for in Sentry:</strong> the issue has a <em>React Component Stack</em> next to the JS stack
        trace, plus the <code>boundary</code> tag and <code>cart</code> context. If you fill in the dialog, the report
        shows up under User Feedback, linked to the issue.
      </div>
    </section>
  );
}
