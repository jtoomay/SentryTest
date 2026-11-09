import * as Sentry from '@sentry/react';
import { api } from '../api/client';
import { DemoCard } from '../components/DemoCard';

function countPrimes(limit: number) {
  let count = 0;
  for (let n = 2; n < limit; n++) {
    let prime = true;
    for (let d = 2; d * d <= n; d++) {
      if (n % d === 0) {
        prime = false;
        break;
      }
    }
    if (prime) count++;
  }
  return count;
}

export function Performance() {
  return (
    <div className="page">
      <h1>Performance</h1>
      <p className="lead">
        Tracing for the frontend and backend. Page loads and route changes are recorded on their own, with Web Vitals
        (LCP, CLS, INP). The cards below add slow and inefficient work for Sentry to catch.
      </p>

      <div className="grid">
        <DemoCard
          title="Slow endpoint"
          description={
            <>
              <code>GET /api/perf/slow</code>: nested server spans with a slow DB query (0.6–1.4s).
            </>
          }
          lookFor="Traces → open the trace. The waterfall shows authorize → build sales report → db.sql.query → aggregate → serialize, and the slow query stands out."
          actions={[{ label: 'Call slow endpoint', tone: 'warning', run: () => api('/api/perf/slow') }]}
        />

        <DemoCard
          title="N+1 queries"
          description={
            <>
              <code>GET /api/perf/n-plus-one</code>: one query for the orders, then one per item.
            </>
          }
          lookFor="The trace shows a staircase of repeated SELECT … WHERE id = $1 spans. Sentry can raise an N+1 Query performance issue after a few runs."
          actions={[{ label: 'Run N+1 endpoint', tone: 'warning', run: () => api('/api/perf/n-plus-one') }]}
        />

        <DemoCard
          title="Custom spans (frontend)"
          description="Sentry.startSpan around a CPU-heavy function, plus parallel fetches grouped under one parent span."
          lookFor="Inside the ui.action trace: a 'count primes' function span and a 'load dashboard' span with three http.client spans running in parallel."
          actions={[
            {
              label: 'Heavy computation',
              tone: 'info',
              run: () =>
                Sentry.startSpan({ name: 'count primes', op: 'function', attributes: { limit: 2_000_000 } }, () => ({
                  primes: countPrimes(2_000_000),
                })),
            },
            {
              label: 'Parallel dashboard load',
              tone: 'info',
              run: () =>
                Sentry.startSpan({ name: 'load dashboard', op: 'ui.load' }, async () => {
                  const [p, u, o] = await Promise.all([api('/api/products'), api('/api/users/u_1001'), api('/api/orders')]);
                  return { productsMs: p.durationMs, userMs: u.durationMs, ordersMs: o.durationMs };
                }),
            },
          ]}
        />

        <DemoCard
          title="Navigation transactions"
          description="Switching routes in the top nav creates a navigation transaction named after the route pattern."
          lookFor="Traces / Insights → Frontend: pageload and navigation transactions for /, /api, /errors, and so on, with Web Vitals scores."
          actions={[
            {
              label: 'Long task (blocks UI 400ms)',
              tone: 'warning',
              run: () => {
                const until = performance.now() + 400;
                while (performance.now() < until) {
                  /* busy-wait so the browser records a long task */
                }
                return { blockedMs: 400 };
              },
            },
          ]}
        />
      </div>
    </div>
  );
}
