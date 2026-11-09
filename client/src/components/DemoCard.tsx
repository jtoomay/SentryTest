import { useState, type ReactNode } from 'react';
import * as Sentry from '@sentry/react';
import { ApiError } from '../api/client';
import { sentryEventUrl } from '../instrument';

export type Tone = 'success' | 'danger' | 'warning' | 'info';

export interface DemoAction {
  label: string;
  tone?: Tone;
  /**
   * Unhandled actions run in a setTimeout, outside React and outside this card's
   * try/catch, so the error reaches Sentry's global handlers.
   */
  unhandled?: boolean;
  run: () => unknown | Promise<unknown>;
}

interface Outcome {
  kind: 'ok' | 'error' | 'thrown';
  label: string;
  payload?: unknown;
  eventIds?: { frontend?: string | null; backend?: string | null };
}

interface Props {
  title: string;
  description: ReactNode;
  lookFor: ReactNode;
  actions: DemoAction[];
  children?: ReactNode;
}

/** Pulls Sentry event ids out of a result so the card can link to them. */
function findEventIds(value: unknown): Outcome['eventIds'] {
  if (!value || typeof value !== 'object') return undefined;
  const v = value as Record<string, unknown>;
  const nested = (v.data ?? {}) as Record<string, unknown>;
  const frontend = (v.eventId as string) ?? null;
  const backend = (v.sentryEventId as string) ?? (nested.sentryEventId as string) ?? null;
  return frontend || backend ? { frontend, backend } : undefined;
}

export function DemoCard({ title, description, lookFor, actions, children }: Props) {
  const [busy, setBusy] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);

  async function trigger(action: DemoAction) {
    if (action.unhandled) {
      setTimeout(() => void action.run(), 0);
      setOutcome({ kind: 'thrown', label: action.label });
      return;
    }

    setBusy(action.label);
    try {
      // Each click is its own trace, so fetches and custom spans group together.
      const result = await Sentry.startSpan({ name: `Demo: ${title} / ${action.label}`, op: 'ui.action' }, () =>
        Promise.resolve(action.run()),
      );
      setOutcome({ kind: 'ok', label: action.label, payload: result, eventIds: findEventIds(result) });
    } catch (err) {
      // Expected failure (API 4xx/5xx). Report it from the frontend too.
      const eventId = Sentry.captureException(err, {
        contexts: err instanceof ApiError ? { response: { status: err.status, url: err.url, body: err.body } } : undefined,
        tags: { demo: title },
      });
      setOutcome({
        kind: 'error',
        label: action.label,
        payload: err instanceof ApiError ? err.body : String(err),
        eventIds: { frontend: eventId, backend: err instanceof ApiError ? err.backendEventId : null },
      });
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="card">
      <header>
        <h3>{title}</h3>
        <p className="muted">{description}</p>
      </header>

      {children}

      <div className="actions">
        {actions.map((a) => (
          <button key={a.label} className={`btn btn-${a.tone ?? 'info'}`} disabled={busy !== null} onClick={() => trigger(a)}>
            {busy === a.label ? 'Running…' : a.label}
          </button>
        ))}
      </div>

      <div className="look-for">
        <strong>What to look for in Sentry:</strong> {lookFor}
      </div>

      {outcome && <OutcomeView outcome={outcome} />}
    </section>
  );
}

function OutcomeView({ outcome }: { outcome: Outcome }) {
  const badge =
    outcome.kind === 'ok' ? (
      <span className="badge badge-success">OK</span>
    ) : outcome.kind === 'error' ? (
      <span className="badge badge-danger">Caught & reported</span>
    ) : (
      <span className="badge badge-warning">Thrown (unhandled)</span>
    );

  return (
    <div className="outcome">
      <div className="outcome-head">
        {badge} <span className="muted">{outcome.label}</span>
      </div>
      {outcome.kind === 'thrown' && (
        <p className="muted small">Nothing caught this in the app. Sentry's global handler reported it; check the browser console too.</p>
      )}
      {outcome.eventIds && (
        <ul className="event-ids">
          {outcome.eventIds.frontend && <EventId label="Frontend event" id={outcome.eventIds.frontend} />}
          {outcome.eventIds.backend && <EventId label="Backend event" id={outcome.eventIds.backend} />}
        </ul>
      )}
      {outcome.payload !== undefined && <pre className="json">{JSON.stringify(outcome.payload, null, 2)}</pre>}
    </div>
  );
}

function EventId({ label, id }: { label: string; id: string }) {
  const url = sentryEventUrl(id);
  return (
    <li>
      {label}: <code>{id}</code>{' '}
      {url && (
        <a href={url} target="_blank" rel="noreferrer">
          Open in Sentry ↗
        </a>
      )}
    </li>
  );
}
