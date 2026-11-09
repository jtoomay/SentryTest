import cron from 'node-cron';
import * as Sentry from '@sentry/node';
import { sleep, jitter } from './data/mock';

export const MONITOR_SLUG = 'showcase-report-job';
const SCHEDULE = '*/5 * * * *';

/** The job body. Fails about 30% of the time so the monitor shows both outcomes. */
async function generateReport() {
  await sleep(jitter(300, 1200));
  if (Math.random() < 0.3) {
    throw new Error('Report job failed: upstream warehouse export was empty');
  }
  Sentry.logger.info('Report job completed', { monitor: MONITOR_SLUG });
}

/** Runs the job once, wrapped in a check-in. Upserts the monitor in Sentry on first run. */
export async function runMonitoredJob(): Promise<'ok' | 'error'> {
  try {
    await Sentry.withMonitor(MONITOR_SLUG, generateReport, {
      schedule: { type: 'crontab', value: SCHEDULE },
      checkinMargin: 2,
      maxRuntime: 5,
      timezone: 'UTC',
    });
    return 'ok';
  } catch (err) {
    Sentry.captureException(err, { tags: { monitor: MONITOR_SLUG } });
    return 'error';
  }
}

export function startCron() {
  if (process.env.SENTRY_CRON_ENABLED !== 'true') {
    console.log('[cron] scheduled job disabled (set SENTRY_CRON_ENABLED=true to enable)');
    return;
  }
  cron.schedule(SCHEDULE, () => void runMonitoredJob());
  console.log(`[cron] "${MONITOR_SLUG}" scheduled: ${SCHEDULE}`);
}
