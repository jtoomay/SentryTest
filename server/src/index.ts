// Sentry must be initialized first.
import './instrument';

import * as Sentry from '@sentry/node';
import express, { type ErrorRequestHandler } from 'express';
import { users } from './data/mock';
import { successRouter } from './routes/success';
import { errorsRouter } from './routes/errors';
import { perfRouter } from './routes/perf';
import { runMonitoredJob, startCron, MONITOR_SLUG } from './cron';

const app = express();
app.use(express.json());

// Attach the demo persona (sent by the client) to every event from this request.
app.use((req, _res, next) => {
  const personaId = req.header('x-demo-user');
  const user = users.find((u) => u.id === personaId);
  if (user) {
    Sentry.setUser({ id: user.id, username: user.name, email: user.email });
    Sentry.setTag('user.plan', user.plan);
  }
  next();
});

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    sentryConfigured: Boolean(process.env.SENTRY_DSN),
    environment: process.env.SENTRY_ENV ?? 'development',
    release: process.env.SENTRY_RELEASE ?? null,
    cronEnabled: process.env.SENTRY_CRON_ENABLED === 'true',
    uptime: Math.round(process.uptime()),
  });
});

app.use('/api', successRouter);
app.use('/api/errors', errorsRouter);
app.use('/api/perf', perfRouter);

app.post('/api/cron/run', async (_req, res) => {
  const outcome = await runMonitoredJob();
  res.json({ monitor: MONITOR_SLUG, outcome });
});

app.use('/api', (req, res) => {
  res.status(404).json({ error: `No route for ${req.method} ${req.originalUrl}` });
});

// Sentry's handler reports 5xx errors and sets res.sentry to the event id.
Sentry.setupExpressErrorHandler(app);

// Our fallback handler runs after Sentry's and returns JSON with that id.
const onError: ErrorRequestHandler = (err, _req, res, _next) => {
  const status = typeof err?.status === 'number' ? err.status : 500;
  res.status(status).json({
    error: err?.name ?? 'Error',
    message: err?.message ?? 'Unknown error',
    sentryEventId: (res as unknown as { sentry?: string }).sentry ?? null,
  });
};
app.use(onError);

const port = Number(process.env.PORT ?? 4000);
app.listen(port, () => {
  console.log(`[server] mock API listening on http://localhost:${port}`);
  startCron();
});
