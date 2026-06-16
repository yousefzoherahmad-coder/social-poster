import cron from 'node-cron';
import { query } from './db.js';
import logger from './logger.js';

const jobs = new Map();

export const registerJob = (name, cronExpr, handler) => {
  if (jobs.has(name)) {
    jobs.get(name).stop();
  }
  const task = cron.schedule(cronExpr, async () => {
    logger.info(`Running scheduled job: ${name}`);
    try {
      await handler();
      await query(
        'UPDATE scheduled_jobs SET last_run = NOW(), run_count = run_count + 1, status = $1 WHERE name = $2',
        ['completed', name]
      ).catch(() => {});
    } catch (err) {
      logger.error(`Scheduled job ${name} failed: ${err.message}`);
      await query(
        'UPDATE scheduled_jobs SET last_run = NOW(), status = $1, error_message = $2 WHERE name = $3',
        ['failed', err.message, name]
      ).catch(() => {});
    }
  }, { scheduled: false });
  jobs.set(name, task);
  return task;
};

export const startJob = (name) => {
  if (jobs.has(name)) jobs.get(name).start();
};

export const stopJob = (name) => {
  if (jobs.has(name)) jobs.get(name).stop();
};

export const initScheduler = async () => {
  logger.info('Initializing scheduler...');

  // Daily bonus reset job (runs at midnight)
  registerJob('daily-bonus-reset', '0 0 * * *', async () => {
    logger.info('Daily bonus reset job running');
  });

  // Clean old logs (runs weekly)
  registerJob('clean-old-logs', '0 2 * * 0', async () => {
    const result = await query(
      "DELETE FROM logs WHERE created_at < NOW() - INTERVAL '30 days'"
    );
    logger.info(`Cleaned ${result.rowCount} old log entries`);
  });

  // Process scheduled posts (runs every minute)
  registerJob('process-scheduled-posts', '* * * * *', async () => {
    const { rows } = await query(
      "SELECT * FROM posts WHERE status = 'scheduled' AND scheduled_at <= NOW() LIMIT 10"
    );
    if (rows.length > 0) {
      logger.info(`Processing ${rows.length} scheduled posts`);
      for (const post of rows) {
        try {
          await query("UPDATE posts SET status = 'publishing' WHERE id = $1", [post.id]);
          const { publishPost } = await import('./poster.js').catch(() => ({ publishPost: null }));
          if (publishPost) {
            const results = await publishPost(post);
            await query(
              "UPDATE posts SET status = 'published', published_at = NOW(), results = $1 WHERE id = $2",
              [JSON.stringify(results), post.id]
            );
          } else {
            await query("UPDATE posts SET status = 'published', published_at = NOW() WHERE id = $1", [post.id]);
          }
        } catch (err) {
          await query(
            "UPDATE posts SET status = 'failed', error_message = $1 WHERE id = $2",
            [err.message, post.id]
          );
          logger.error(`Failed to publish post ${post.id}: ${err.message}`);
        }
      }
    }
  });

  // Update user stats (runs every hour)
  registerJob('update-user-stats', '0 * * * *', async () => {
    await query("UPDATE users SET updated_at = NOW() WHERE last_active > NOW() - INTERVAL '1 hour'").catch(() => {});
  });

  // Start all jobs
  for (const [name, task] of jobs) {
    task.start();
    logger.info(`Started job: ${name}`);
  }

  logger.info('Scheduler initialized with all jobs');
};

export default { registerJob, startJob, stopJob, initScheduler };
