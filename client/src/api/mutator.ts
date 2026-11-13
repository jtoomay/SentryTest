import { ApiError, request } from './client';

/**
 * Orval's custom mutator: every generated function and hook calls this instead of plain fetch.
 * It reuses the app's request(), so the x-demo-user header is sent and non-2xx responses
 * throw ApiError (which DemoCard and Sentry already understand).
 */
export async function customFetch<T>(url: string, options: RequestInit = {}): Promise<T> {
  const { res, body } = await request(url, options);
  if (!res.ok) throw new ApiError(res.status, body, url);
  // includeHttpResponseReturnType: false in orval.config.ts, so T is the response body type.
  return body as T;
}

/** Orval reads this export to type the `error` of generated hooks. */
export type ErrorType<_E> = ApiError;

/** Orval reads this export to type request bodies. */
export type BodyType<B> = B;
