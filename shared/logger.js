import winston from 'winston';
import { query } from './db.js';

const { combine, timestamp, printf, colorize, errors } = winston.format;

const logFormat = printf(({ level, message, timestamp, service, stack, ...metadata }) => {
  let log = `${timestamp} [${service || 'app'}] ${level}: ${message}`;
  if (stack) log += `\n${stack}`;
  if (Object.keys(metadata).length > 0) {
    log += ` ${JSON.stringify(metadata)}`;
  }
  return log;
});

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  defaultMeta: { service: 'social-poster-platform' },
  format: combine(
    errors({ stack: true }),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    logFormat
  ),
  transports: [
    new winston.transports.Console({
      format: combine(colorize(), timestamp({ format: 'HH:mm:ss' }), logFormat),
    }),
  ],
  exceptionHandlers: [
    new winston.transports.Console(),
  ],
});

// DB transport — write important logs to database
const dbLogQueue = [];
let dbLogProcessing = false;

const processDbLogQueue = async () => {
  if (dbLogProcessing || dbLogQueue.length === 0) return;
  dbLogProcessing = true;
  try {
    const batch = dbLogQueue.splice(0, 50);
    for (const entry of batch) {
      await query(
        'INSERT INTO logs (level, message, service, metadata) VALUES ($1, $2, $3, $4)',
        [entry.level, entry.message, entry.service, JSON.stringify(entry.metadata)]
      ).catch(() => {}); // Swallow DB errors in logger
    }
  } finally {
    dbLogProcessing = false;
    if (dbLogQueue.length > 0) setTimeout(processDbLogQueue, 1000);
  }
};

export const dbLog = (level, message, service = 'app', metadata = {}) => {
  if (['error', 'warn', 'info'].includes(level)) {
    dbLogQueue.push({ level, message, service, metadata });
    setTimeout(processDbLogQueue, 100);
  }
  logger[level]({ message, service, ...metadata });
};

export default logger;
