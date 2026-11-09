import { Router } from 'express';
import * as Sentry from '@sentry/node';
import { products, users, orders, type Order, type OrderItem } from '../data/mock';
import { fakeQuery } from '../db';

export const successRouter = Router();

successRouter.get('/products', async (req, res) => {
  const category = typeof req.query.category === 'string' ? req.query.category : undefined;
  const rows = await fakeQuery('SELECT * FROM products WHERE category = $1', () =>
    category ? products.filter((p) => p.category === category) : products,
  );
  res.json({ data: rows, count: rows.length });
});

successRouter.get('/products/:id', async (req, res) => {
  const id = Number(req.params.id);
  const product = await fakeQuery('SELECT * FROM products WHERE id = $1', () => products.find((p) => p.id === id));
  if (!product) {
    // 4xx responses are expected client errors: Sentry's Express handler does not report them.
    Sentry.logger.warn('Product lookup miss', { productId: id });
    res.status(404).json({ error: `Product ${id} not found` });
    return;
  }
  res.json({ data: product });
});

successRouter.get('/users/:id', async (req, res) => {
  const user = await fakeQuery('SELECT * FROM users WHERE id = $1', () => users.find((u) => u.id === req.params.id));
  if (!user) {
    res.status(404).json({ error: `User ${req.params.id} not found` });
    return;
  }
  res.json({ data: user });
});

successRouter.get('/orders', async (_req, res) => {
  const rows = await fakeQuery('SELECT * FROM orders ORDER BY created_at DESC', () => orders);
  res.json({ data: rows, count: rows.length });
});

successRouter.post('/orders', async (req, res) => {
  const body = req.body as { userId?: string; items?: OrderItem[] } | undefined;
  const problems: string[] = [];
  if (!body?.userId) problems.push('userId is required');
  if (!Array.isArray(body?.items) || body.items.length === 0) problems.push('items must be a non-empty array');
  for (const item of body?.items ?? []) {
    if (!products.some((p) => p.id === item.productId)) problems.push(`unknown productId ${item.productId}`);
    if (!Number.isInteger(item.quantity) || item.quantity < 1) problems.push(`invalid quantity for ${item.productId}`);
  }
  if (problems.length) {
    Sentry.logger.warn('Order validation failed', { problems: problems.join('; ') });
    res.status(400).json({ error: 'Validation failed', problems });
    return;
  }

  const items = body!.items!;
  const total = items.reduce((sum, i) => sum + products.find((p) => p.id === i.productId)!.price * i.quantity, 0);
  const order: Order = {
    id: 5000 + orders.length + 1,
    userId: body!.userId!,
    items,
    total: Math.round(total * 100) / 100,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };
  await fakeQuery('INSERT INTO orders (user_id, items, total) VALUES ($1, $2, $3)', () => orders.push(order));
  Sentry.logger.info('Order created', { orderId: order.id, total: order.total, itemCount: items.length });
  res.status(201).json({ data: order });
});
