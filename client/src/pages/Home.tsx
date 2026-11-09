import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { sentryConfig } from '../instrument';

interface Health {
  status: string;
  sentryConfigured: boolean;
  environment: string;
  release: string | null;
  cronEnabled: boolean;
  uptime: number;
}

export function Home() {
  const [health, setHealth] = useState<Health | null>(null);
  const [healthError, setHealthError] = useState<string | null>(null);

  useEffect(() => {
    api<Health>('/api/health')
      .then((r) => setHealth(r.data))
      .catch((e) => setHealthError(String(e)));
  }, []);

  return (
    <div className="page">
      <h1>Sentry Showcase</h1>
      <p className="lead">
        A React app with an Express mock backend. Every button triggers a real Sentry feature: errors, traces, replays,
        logs, user feedback and cron monitors. Each card says where to find the result in Sentry.
      </p>

      <div className="status-grid">
        <StatusTile
          title="Frontend SDK"
          ok={sentryConfig.dsnConfigured}
          lines={[
            sentryConfig.dsnConfigured ? 'DSN configured' : 'No DSN: set VITE_SENTRY_DSN in client/.env',
            `env: ${sentryConfig.environment}`,
            `release: ${sentryConfig.release ?? '(none)'}`,
          ]}
        />
        <StatusTile
          title="Backend SDK"
          ok={health?.sentryConfigured ?? false}
          lines={
            healthError
              ? ['Mock API unreachable: is the server running on :4000?', healthError]
              : health
                ? [
                    health.sentryConfigured ? 'DSN configured' : 'No DSN: set SENTRY_DSN in server/.env',
                    `env: ${health.environment}`,
                    `release: ${health.release ?? '(none)'}`,
                    `cron schedule: ${health.cronEnabled ? 'on' : 'off'}`,
                  ]
                : ['Checking…']
          }
        />
      </div>

      <h2>Tour</h2>
      <ol className="tour">
        <li>
          <Link to="/api">Mock API</Link>: successful calls, plus 4xx responses Sentry deliberately does not report.
        </li>
        <li>
          <Link to="/errors">Error Lab</Link>: unhandled and handled errors, React crashes, grouping, attachments,
          breadcrumbs, PII scrubbing, and backend errors linked through distributed tracing.
        </li>
        <li>
          <Link to="/performance">Performance</Link>: slow endpoints, N+1 queries, custom spans, Web Vitals.
        </li>
        <li>
          <Link to="/context">Context & More</Link>: user identity, tags, logs, the feedback widget, replay masking and
          cron check-ins.
        </li>
      </ol>
      <p className="muted small">
        Tip: pick a persona on the Context page first, so every event in Sentry shows who it happened to.
      </p>
    </div>
  );
}

function StatusTile({ title, ok, lines }: { title: string; ok: boolean; lines: string[] }) {
  return (
    <div className={`status ${ok ? 'status-ok' : 'status-warn'}`}>
      <h3>
        <span className="dot" /> {title}
      </h3>
      {lines.map((l) => (
        <div key={l} className="small">
          {l}
        </div>
      ))}
    </div>
  );
}
