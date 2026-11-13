import { toast } from 'sonner';
import { ApiError } from './api/client';
import { sentryEventUrl } from './instrument';

/** Turns anything that was thrown into a short title + detail line for a toast. */
function describe(err: unknown): { title: string; description?: string } {
  if (err instanceof ApiError) {
    const body = err.body as { error?: unknown; message?: unknown } | null;
    const detail = body && typeof body === 'object' ? (body.error ?? body.message) : undefined;
    return { title: `API ${err.status} on ${err.url}`, description: detail ? String(detail) : undefined };
  }
  if (err instanceof Error) return { title: err.name || 'Error', description: err.message };
  return { title: 'Error', description: String(err) };
}

/**
 * Shows an error toast. The toast id is derived from the message, so the same error
 * reported by two paths (e.g. React's dev-mode rethrow + the ErrorBoundary) shows once.
 */
export function notifyError(err: unknown, opts: { eventId?: string | null; source?: string } = {}) {
  const { title, description } = describe(err);
  const url = sentryEventUrl(opts.eventId);
  toast.error(title, {
    id: `${title}|${description ?? ''}`,
    description: opts.source ? `${description ?? ''}${description ? ' · ' : ''}${opts.source}` : description,
    action: url ? { label: 'Open in Sentry', onClick: () => window.open(url, '_blank', 'noreferrer') } : undefined,
  });
}

/**
 * Toasts for errors nothing in the app catches. These only listen: Sentry's own global
 * handlers still report the errors as unhandled.
 */
export function installGlobalErrorToasts() {
  window.addEventListener('error', (event) => {
    // Resource load failures and benign browser notices (ResizeObserver) carry no error object.
    if (event.error) notifyError(event.error, { source: 'unhandled' });
  });
  window.addEventListener('unhandledrejection', (event) => {
    notifyError(event.reason, { source: 'unhandled rejection' });
  });
}
