import { api } from '../api/client';
import { DemoCard } from '../components/DemoCard';
import { personas } from '../personas';

export function MockApi() {
  return (
    <div className="page">
      <h1>Mock API</h1>
      <p className="lead">
        Successful requests to the Express mock backend. Every click is a trace: the browser span, the{' '}
        <code>http.client</code> fetch span, and the server's own spans, including simulated DB queries.
      </p>

      <div className="grid">
        <DemoCard
          title="List products"
          description={<code>GET /api/products</code>}
          lookFor="Traces → the trace for this click: frontend ui.action → fetch → backend GET /api/products → db.sql.query span."
          actions={[
            { label: 'All products', tone: 'success', run: () => api('/api/products') },
            { label: 'Peripherals only', tone: 'success', run: () => api('/api/products?category=peripherals') },
          ]}
        />

        <DemoCard
          title="Fetch a user"
          description={<code>GET /api/users/:id</code>}
          lookFor="The backend span carries the user id from the x-demo-user header (if you picked a persona)."
          actions={personas.map((p) => ({
            label: p.name,
            tone: 'success' as const,
            run: () => api(`/api/users/${p.id}`),
          }))}
        />

        <DemoCard
          title="Create an order"
          description={<code>POST /api/orders</code>}
          lookFor="Logs → an 'Order created' log line with orderId and total attributes, linked to the trace."
          actions={[
            {
              label: 'Place valid order',
              tone: 'success',
              run: () =>
                api('/api/orders', {
                  method: 'POST',
                  body: JSON.stringify({ userId: 'u_1002', items: [{ productId: 1, quantity: 1 }, { productId: 6, quantity: 2 }] }),
                }),
            },
            { label: 'List orders', tone: 'success', run: () => api('/api/orders') },
          ]}
        />

        <DemoCard
          title="Expected client errors (4xx)"
          description="A 404 and a 400 validation failure. The backend logs them but doesn't create backend issues for them."
          lookFor="The card reports these from the frontend, so you get a frontend issue with the response body as context, a backend log line, and no backend issue: 4xx is noise on the server."
          actions={[
            { label: '404 product', tone: 'warning', run: () => api('/api/products/999') },
            {
              label: '400 bad order',
              tone: 'warning',
              run: () => api('/api/orders', { method: 'POST', body: JSON.stringify({ items: [{ productId: 42, quantity: 0 }] }) }),
            },
          ]}
        />
      </div>
    </div>
  );
}
