import { Router } from 'express';
import * as Sentry from '@sentry/node';
import { orders, products, sleep, jitter } from '../data/mock';
import { fakeQuery } from '../db';

export const perfRouter = Router();

// Nested custom spans with a slow middle step.
perfRouter.get('/slow', async (_req, res) => {
  await Sentry.startSpan({ name: 'authorize request', op: 'auth' }, () => sleep(jitter(60, 120)));

  const report = await Sentry.startSpan({ name: 'build sales report', op: 'function' }, async () => {
    const rows = await fakeQuery('SELECT * FROM orders JOIN order_items USING (order_id)', () => orders, [600, 1400]);
    return Sentry.startSpan({ name: 'aggregate totals', op: 'function' }, async () => {
      await sleep(jitter(150, 300));
      return { orders: rows.length, revenue: rows.reduce((s, o) => s + o.total, 0) };
    });
  });

  await Sentry.startSpan({ name: 'serialize response', op: 'serialize' }, () => sleep(jitter(20, 60)));
  res.json({ data: report });
});

// N+1: one query for the list, then one query per row.
perfRouter.get('/n-plus-one', async (_req, res) => {
  const list = await fakeQuery('SELECT id FROM orders', () => orders, [10, 20]);
  const enriched = [];
  for (const order of list) {
    for (const item of order.items) {
      const product = await fakeQuery(
        'SELECT * FROM products WHERE id = $1',
        () => products.find((p) => p.id === item.productId),
        [30, 60],
      );
      enriched.push({ orderId: order.id, product: product?.name, quantity: item.quantity });
    }
  }
  res.json({ data: enriched, queries: 1 + enriched.length });
});
