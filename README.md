# Sentry Showcase

A React (Vite + TypeScript) app with an Express mock backend, built to demo Sentry on the **Developer (free) plan**. Every button triggers a real Sentry feature, and each card says where to look in Sentry.

- **client/**: React 18, React Router 6, `@sentry/react` v11, `@sentry/vite-plugin` (source maps)
- **server/**: Express 5, `@sentry/node` v11, run with `tsx`

## 1. Sentry setup (about 5 minutes)

1. Create a free account at sentry.io (Developer plan).
2. Create **two projects**:
   - Platform **React**, named for example `showcase-frontend`
   - Platform **Express**, named for example `showcase-backend`
3. Copy each project's DSN (*Settings → Projects → [project] → Client Keys (DSN)*).
4. Create the env files:
   ```powershell
   Copy-Item client/.env.example client/.env
   Copy-Item server/.env.example server/.env
   ```
   - `client/.env`: set `VITE_SENTRY_DSN` and `VITE_SENTRY_ORG` (your org slug, used for "Open in Sentry" links).
   - `server/.env`: set `SENTRY_DSN`.
5. *(Optional, for readable stack traces in production builds)*: create an **Organization Auth Token** (*Settings → Auth Tokens*) and set `SENTRY_AUTH_TOKEN`, `SENTRY_ORG` and `SENTRY_PROJECT` in `client/.env`.

The app runs fine with no DSN. Sentry just doesn't send anything.

## 2. Run it

```powershell
npm install
npm run dev        # server on :4000, client on http://localhost:5173
```

To demo **source maps**, use a production build. It uploads maps if an auth token is set, then deletes them from `dist/`:

```powershell
npm run build
npm run preview    # server on :4000, built client on http://localhost:4173
```

## 3. Demo script

Start on **Context & More** and pick a persona, so every event carries a user.

| Page | Button | Where to look in Sentry | Feature shown |
|---|---|---|---|
| Mock API | List products / Create order | **Traces** | Distributed trace browser → Express → `db.sql.query` spans; "Order created" in **Logs** |
| Mock API | 404 / 400 | **Issues** (frontend only) | Server ignores 4xx; frontend reports with response context |
| Error Lab | Throw TypeError | **Issues** | Unhandled error, source-mapped stack, breadcrumbs, **Replay** |
| Error Lab | Reject promise | **Issues** | `onunhandledrejection` mechanism |
| Error Lab | Capture handled error | **Issues** | `handled: yes`, tags, extra data, `warning` level |
| Error Lab | info / warning / error | **Issues** | `captureMessage` severities |
| Error Lab | Crash the component | **Issues**, **User Feedback** | `ErrorBoundary`, React component stack, report dialog |
| Error Lab | Decline a random payment | **Issues** | Custom fingerprint: one issue per provider |
| Error Lab | Simulate checkout journey | Issue → **Breadcrumbs** | Custom + automatic breadcrumbs |
| Error Lab | Report with attachment | Issue → **Attachments** | `scope.addAttachment` |
| Error Lab | Send event with PII | Issue → Additional Data | `beforeSend` scrubbing in the browser |
| Error Lab | Sync / Async / Timeout | **Issues** (both projects) + **Trace** | Express error handler, linked frontend ↔ backend errors |
| Error Lab | Chained error | **Issues** (backend) | `Error.cause` chain → linked exceptions |
| Error Lab | Exhaust the pool | **Issues** (backend) | Custom contexts + tags |
| Performance | Slow endpoint | **Traces** | Nested custom server spans, slow DB span |
| Performance | N+1 endpoint | **Traces** / **Issues → Performance** | Repeated query spans (N+1 detection) |
| Performance | Heavy computation / Parallel load | **Traces** | `Sentry.startSpan` in the browser |
| Performance | (just navigate around) | **Insights → Frontend** | Pageload / navigation transactions, Web Vitals |
| Context | Tags & context | Issue → Tags / Contexts | `setTag`, `setContext` |
| Context | logger.* / console.error | **Explore → Logs** | Structured logs with attributes |
| Context | Open feedback form / API | **User Feedback** | Feedback widget, `captureFeedback` |
| Context | Masked fields | **Replays** | `.sentry-mask` / `.sentry-block` privacy |
| Context | Run job now | **Crons** | `withMonitor` check-ins, auto-created monitor |

## Staying within the Developer plan

The Developer plan has a monthly quota for errors, spans and replays, plus 1 cron monitor and 1 uptime monitor.

- `VITE_SENTRY_REPLAYS_SESSION_SAMPLE_RATE=0` by default. Only sessions with an error record a replay (50 replays/month).
- `SENTRY_CRON_ENABLED=false` by default. When it's on, the job runs every 5 minutes and fails about 30% of the time, which adds up. Use **Run job now** instead.
- Lower `*_TRACES_SAMPLE_RATE` if spans get close to the quota.
- **Uptime monitoring** needs a public URL. If you deploy the server, point the one free uptime monitor at `/api/health`.

## Project layout

```
client/src/
  instrument.ts          Sentry.init: tracing, replay, feedback, console logs, beforeSend
  main.tsx               app-wide ErrorBoundary
  App.tsx                routes wrapped with withSentryReactRouterV6Routing
  components/DemoCard.tsx  wraps each click in a span, reports failures, shows event ids
  pages/                 Home, MockApi, ErrorLab, Performance, Context
server/src/
  instrument.ts          Sentry.init (imported first)
  index.ts               Express app, setupExpressErrorHandler, persona → setUser
  routes/                success, errors, perf
  cron.ts                Sentry.withMonitor job
  db.ts                  fake DB calls as db.sql.query spans
```

> SDK v11 notes: `sendDefaultPii` was replaced by `dataCollection` (set to `{ userInfo: false }` here), and logs are on by default, so there is no `enableLogs` flag.
