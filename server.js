/**
 * Social Poster Platform — Main Entry Point
 * Starts: Express API + Telegram Bot + Scheduler
 */
import dotenv from 'dotenv';
dotenv.config();

import { fileURLToPath } from 'url';
import { dirname } from 'path';
import logger from './shared/logger.js';
import { query } from './shared/db.js';
import { readFileSync } from 'fs';
import { join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = parseInt(process.env.PORT || '5000');

async function runMigrations() {
  try {
    const sql = readFileSync(join(__dirname, 'db/schema.sql'), 'utf8');
    await query(sql);
    logger.info('✅ Database migrations completed');
  } catch (err) {
    logger.error(`❌ Migration failed: ${err.message}`);
    // Don't exit — DB might already have schema
  }
}

async function main() {
  logger.info('🚀 Starting Social Poster Platform...');

  // Run database migrations
  await runMigrations();

  // Start Express API
  const { default: app } = await import('./api/server.js');
  const server = app.listen(PORT, '0.0.0.0', () => {
    logger.info(`✅ API Server running on http://0.0.0.0:${PORT}`);
    logger.info(`📚 API Docs: http://0.0.0.0:${PORT}/api/docs`);
    logger.info(`❤️  Health: http://0.0.0.0:${PORT}/api/health`);
  });

  // Start Telegram Bot
  let bot = null;
  try {
    const { createBot, startBot } = await import('./bot/index.js');
    bot = createBot();
    if (bot) {
      await startBot(bot);
    } else {
      logger.warn('⚠️  Bot not started (BOT_TOKEN not configured)');
    }
  } catch (err) {
    logger.error(`Bot startup error: ${err.message}`);
  }

  // Start Scheduler
  try {
    const { initScheduler } = await import('./shared/scheduler.js');
    await initScheduler();
    logger.info('✅ Scheduler initialized');
  } catch (err) {
    logger.error(`Scheduler startup error: ${err.message}`);
  }

  logger.info('✅ Social Poster Platform is fully operational!');

  // Graceful shutdown
  const shutdown = async (signal) => {
    logger.info(`${signal} received — shutting down gracefully...`);
    server.close(() => logger.info('HTTP server closed'));
    if (bot) {
      bot.stop(signal);
      logger.info('Bot stopped');
    }
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
