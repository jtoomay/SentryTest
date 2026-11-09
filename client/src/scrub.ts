// Redacts sensitive-looking values in the browser, before the event is sent.

const SENSITIVE_KEY = /card|cvv|password|passwd|secret|token|ssn|authorization/i;
const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;

export function scrub<T>(value: T, depth = 0): T {
  if (depth > 8 || value == null) return value;
  if (typeof value === 'string') {
    return value.replace(EMAIL, '[email redacted]') as unknown as T;
  }
  if (Array.isArray(value)) {
    return value.map((v) => scrub(v, depth + 1)) as unknown as T;
  }
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = SENSITIVE_KEY.test(k) ? '[Filtered]' : scrub(v, depth + 1);
    }
    return out as T;
  }
  return value;
}
