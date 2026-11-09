import { useState } from 'react';
import * as Sentry from '@sentry/react';
import { api } from '../api/client';
import { DemoCard } from '../components/DemoCard';
import { applyPersona, personas, type Persona } from '../personas';

interface Props {
  persona: Persona | null;
  onPersonaChange: (p: Persona | null) => void;
}

export function Context({ persona, onPersonaChange }: Props) {
  const [featureFlag, setFeatureFlag] = useState(false);

  return (
    <div className="page">
      <h1>Context & More</h1>
      <p className="lead">Enrich events with who and what, and try Logs, User Feedback, Replay masking and Crons.</p>

      <div className="grid">
        <section className="card">
          <header>
            <h3>User identity</h3>
            <p className="muted">
              Sentry.setUser on the frontend. The id also goes to the backend as <code>x-demo-user</code>, so
              server events get the same user.
            </p>
          </header>
          <div className="actions">
            {personas.map((p) => (
              <button
                key={p.id}
                className={`btn ${persona?.id === p.id ? 'btn-success' : 'btn-info'}`}
                onClick={() => {
                  applyPersona(p);
                  onPersonaChange(p);
                }}
              >
                {p.name} ({p.plan})
              </button>
            ))}
            <button
              className="btn btn-ghost"
              onClick={() => {
                applyPersona(null);
                onPersonaChange(null);
              }}
            >
              Sign out
            </button>
          </div>
          <div className="look-for">
            <strong>What to look for in Sentry:</strong> the issue's User section and the "Users affected" count. The tag{' '}
            <code>user.plan</code> lets you filter, for example, enterprise-only issues.
          </div>
        </section>

        <DemoCard
          title="Tags & custom context"
          description="Set a feature-flag tag and a structured 'subscription' context, then send an event."
          lookFor="Tags: feature.new_checkout. Contexts: subscription (plan, seats, renewal). Tags are searchable and show tag distribution charts."
          actions={[
            {
              label: `Toggle flag (now ${featureFlag ? 'ON' : 'OFF'})`,
              tone: 'info',
              run: () => {
                const next = !featureFlag;
                setFeatureFlag(next);
                Sentry.setTag('feature.new_checkout', next ? 'on' : 'off');
                return { 'feature.new_checkout': next };
              },
            },
            {
              label: 'Send event with context',
              tone: 'warning',
              run: () => {
                Sentry.setContext('subscription', { plan: persona?.plan ?? 'anonymous', seats: 12, renewal: '2027-01-01' });
                return { eventId: Sentry.captureMessage('Subscription limits approaching', 'warning') };
              },
            },
          ]}
        />

        <DemoCard
          title="Structured logs"
          description="Sentry.logger sends searchable logs with attributes. console.warn/error also go to Sentry Logs (consoleLoggingIntegration)."
          lookFor="Explore → Logs. Filter by severity or attributes like cartId. Click a log line to jump to its trace."
          actions={[
            {
              label: 'logger.info',
              tone: 'info',
              run: () => {
                Sentry.logger.info('User viewed cart', { cartId: 'c_88', items: 3, persona: persona?.id ?? 'anon' });
                return { logged: 'info' };
              },
            },
            {
              label: 'logger.warn',
              tone: 'warning',
              run: () => {
                Sentry.logger.warn(Sentry.logger.fmt`Inventory low for ${'MON-4K'}: ${2} left`);
                return { logged: 'warn' };
              },
            },
            {
              label: 'console.error',
              tone: 'danger',
              run: () => {
                console.error('Recommendation widget failed to render', { widget: 'also-bought' });
                return { logged: 'console.error' };
              },
            },
          ]}
        />

        <DemoCard
          title="User Feedback"
          description="The 'Report a bug' button in the corner is Sentry's Feedback widget. You can also open it from code."
          lookFor="User Feedback: the message, email, an optional screenshot, and a link to the replay of the session."
          actions={[
            {
              label: 'Open feedback form',
              tone: 'info',
              run: async () => {
                const feedback = Sentry.getFeedback();
                if (!feedback) return { error: 'Feedback integration not loaded' };
                const form = await feedback.createForm();
                form.appendToDom();
                form.open();
                return { opened: true };
              },
            },
            {
              label: 'Send feedback via API',
              tone: 'info',
              run: () => ({
                eventId: Sentry.captureFeedback({
                  name: persona?.name ?? 'Demo User',
                  email: persona?.email ?? 'demo@example.com',
                  message: 'The checkout button did nothing on the first click.',
                }),
              }),
            },
          ]}
        />

        <section className="card">
          <header>
            <h3>Session Replay privacy</h3>
            <p className="muted">
              Replays record the DOM, not video. The fields below are masked or blocked, so their contents never leave
              the browser.
            </p>
          </header>
          <label className="field">
            Visible field
            <input placeholder="Type something — visible in the replay" />
          </label>
          <label className="field">
            Card number (<code>.sentry-mask</code>)
            <input className="sentry-mask" placeholder="4111 1111 1111 1111" />
          </label>
          <div className="sentry-block blocked-box">This box has .sentry-block and shows as a placeholder in the replay.</div>
          <div className="look-for">
            <strong>What to look for in Sentry:</strong> Replays → open a replay. The masked input shows as ****, the
            blocked box as an empty rectangle. Replays are kept for sessions with errors; set
            VITE_SENTRY_REPLAYS_SESSION_SAMPLE_RATE to record all sessions.
          </div>
        </section>

        <DemoCard
          title="Cron monitor"
          description="Runs the backend's monitored job once. Sentry.withMonitor sends in_progress and ok/error check-ins, and the monitor is created on the first run."
          lookFor="Crons → showcase-report-job: a timeline of check-ins with duration and status. Failed runs link to their error issue."
          actions={[{ label: 'Run job now', tone: 'info', run: () => api('/api/cron/run', { method: 'POST' }) }]}
        />
      </div>
    </div>
  );
}
