import * as Sentry from '@sentry/node';
import { sleep, jitter } from './data/mock';

/**
 * Pretend database call. Wraps the work in a `db.sql.query` span so it shows
 * up in Sentry's trace view (and so N+1 detection can see repeated queries).
 */
export function fakeQuery<T>(sql: string, result: () => T, latency: [number, number] = [5, 25]): Promise<T> {
  return Sentry.startSpan(
    {
      name: sql,
      op: 'db.sql.query',
      attributes: { 'db.system': 'postgresql', 'db.name': 'showcase' },
    },
    async () => {
      await sleep(jitter(latency[0], latency[1]));
      return result();
    },
  );
}
