import { Router } from 'express';
import * as Sentry from '@sentry/node';
import { sleep } from '../data/mock';
import { fakeQuery } from '../db';

export const errorsRouter = Router();

// --- helpers that give stack traces a few meaningful frames ---------------

function calculateDiscount(order: { coupon?: { percent: number } }) {
  // Bug: assumes coupon always exists.
  return order.coupon!.percent / 100;
}

function applyPricing(order: { coupon?: { percent: number } }) {
  return 1 - calculateDiscount(order);
}

async function fetchInventory(sku: string): Promise<number> {
  await sleep(40);
  throw new Error(`Inventory service returned 503 for SKU ${sku}`);
}

async function reserveStock(sku: string) {
  try {
    return await fetchInventory(sku);
  } catch (err) {
    throw new Error(`Could not reserve stock for ${sku}`, { cause: err });
  }
}

async function processOrder(orderId: number) {
  try {
    await reserveStock(`SKU-${orderId}`);
  } catch (err) {
    throw new Error(`Order ${orderId} processing failed`, { cause: err });
  }
}

class TimeoutError extends Error {
  constructor(operation: string, ms: number) {
    super(`${operation} timed out after ${ms}ms`);
    this.name = 'TimeoutError';
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number, operation: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => setTimeout(() => reject(new TimeoutError(operation, ms)), ms)),
  ]);
}

// --- routes ---------------------------------------------------------------

// Synchronous throw: caught by Sentry.setupExpressErrorHandler.
errorsRouter.get('/sync', (_req, _res) => {
  applyPricing({});
});

// Rejected promise: Express 5 forwards it to the error handler.
errorsRouter.get('/async', async (_req, res) => {
  // The "database" returns no cart, and the code assumes it did.
  const cart = await fakeQuery<{ items: unknown[] } | null>('SELECT * FROM carts WHERE id = $1', () => null);
  const count = cart!.items.length;
  res.json({ count });
});

// Chain of errors linked with `cause`: Sentry shows each as a linked exception.
errorsRouter.get('/nested', async (_req, _res) => {
  await processOrder(5003);
});

// An upstream call that takes too long.
errorsRouter.get('/timeout', async (_req, _res) => {
  await withTimeout(
    Sentry.startSpan({ name: 'GET https://payments.example.com/charge', op: 'http.client' }, () => sleep(3000)),
    1200,
    'Payment provider charge',
  );
});

// Database failure with extra context attached to the event.
errorsRouter.get('/db', async (_req, _res) => {
  Sentry.setContext('database', {
    host: 'db-primary.internal',
    pool: { active: 20, idle: 0, max: 20 },
    query: 'UPDATE inventory SET stock = stock - 1 WHERE id = $1',
  });
  Sentry.setTag('db.pool', 'exhausted');
  await fakeQuery('UPDATE inventory SET stock = stock - 1 WHERE id = $1', () => {
    const err = new Error('remaining connection slots are reserved for non-replication superuser connections');
    err.name = 'ConnectionPoolExhaustedError';
    throw err;
  });
});

// Handled error: we catch it, report it, and still answer 200.
errorsRouter.get('/handled', (_req, res) => {
  const raw = '{"sku": "KB-01", "qty": }';
  try {
    JSON.parse(raw);
    res.json({ ok: true });
  } catch (err) {
    const eventId = Sentry.captureException(err, {
      level: 'warning',
      tags: { feature: 'csv-import', handled: 'yes' },
      extra: { rawPayload: raw },
    });
    res.json({ ok: false, recovered: true, message: 'Bad row skipped, import continued', sentryEventId: eventId });
  }
});

// A plain message (not an exception), sent at a chosen level.
errorsRouter.get('/message', (req, res) => {
  const level = (['info', 'warning', 'error'] as const).find((l) => l === req.query.level) ?? 'warning';
  const eventId = Sentry.captureMessage(`Backend message at level "${level}"`, level);
  res.json({ ok: true, level, sentryEventId: eventId });
});
