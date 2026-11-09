let demoUserId: string | null = null;

/** The persona id sent to the backend as `x-demo-user`, so server events get the same user. */
export function setDemoUserHeader(id: string | null) {
  demoUserId = id;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: unknown,
    public readonly url: string,
  ) {
    const detail =
      body && typeof body === 'object' && 'message' in body
        ? String((body as { message: unknown }).message)
        : body && typeof body === 'object' && 'error' in body
          ? String((body as { error: unknown }).error)
          : '';
    super(`API ${status} on ${url}${detail ? `: ${detail}` : ''}`);
    this.name = 'ApiError';
  }

  /** Event id that the backend reported to Sentry, if any. */
  get backendEventId(): string | null {
    const b = this.body as { sentryEventId?: string } | null;
    return b?.sentryEventId ?? null;
  }
}

export interface ApiResult<T> {
  status: number;
  durationMs: number;
  data: T;
}

export async function api<T = unknown>(path: string, init: RequestInit = {}): Promise<ApiResult<T>> {
  const headers = new Headers(init.headers);
  if (init.body) headers.set('Content-Type', 'application/json');
  if (demoUserId) headers.set('x-demo-user', demoUserId);

  const started = performance.now();
  const res = await fetch(path, { ...init, headers });
  const text = await res.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  if (!res.ok) throw new ApiError(res.status, body, path);
  return { status: res.status, durationMs: Math.round(performance.now() - started), data: body as T };
}
