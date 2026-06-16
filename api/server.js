import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';
import dotenv from 'dotenv';
dotenv.config();

import logger from '../shared/logger.js';
import { swaggerSpec } from './swagger/swagger.js';
import authRouter from './routes/auth.js';
import usersRouter from './routes/users.js';
import channelsRouter from './routes/channels.js';
import postsRouter from './routes/posts.js';
import rewardsRouter from './routes/rewards.js';
import ticketsRouter from './routes/tickets.js';
import settingsRouter from './routes/settings.js';
import logsRouter from './routes/logs.js';
import statsRouter from './routes/stats.js';
import notificationsRouter from './routes/notifications.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();

// Security & compression
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(compression());
app.use(cookieParser());

// CORS
app.use(cors({
  origin: process.env.CORS_ORIGIN || true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_PER_MINUTE || '60'),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});
app.use('/api/', limiter);

// Logging
app.use(morgan('combined', { stream: { write: (msg) => logger.info(msg.trim(), { service: 'http' }) } }));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static file uploads
app.use('/uploads', express.static(join(__dirname, '../uploads')));

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/channels', channelsRouter);
app.use('/api/posts', postsRouter);
app.use('/api/rewards', rewardsRouter);
app.use('/api/tickets', ticketsRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/logs', logsRouter);
app.use('/api/stats', statsRouter);
app.use('/api/notifications', notificationsRouter);

// Swagger docs
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Social Poster API Docs',
}));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '1.0.0' });
});

// Platform status
app.get('/api/platforms/status', async (req, res) => {
  try {
    const { getPlatformStatus, getAvailablePlatforms } = await import('../shared/poster.js');
    const available = getAvailablePlatforms();
    res.json({ platforms: available, status: 'available' });
  } catch (err) {
    res.json({ platforms: [], error: err.message });
  }
});

// Serve React dashboard (production)
const dashboardDist = join(__dirname, '../dashboard/dist');
if (existsSync(dashboardDist)) {
  app.use(express.static(dashboardDist));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api/') && !req.path.startsWith('/uploads/')) {
      res.sendFile(join(dashboardDist, 'index.html'));
    }
  });
} else {
  app.get('/', (req, res) => {
    res.json({
      message: '🚀 Social Poster Platform API',
      version: '1.0.0',
      docs: '/api/docs',
      health: '/api/health',
      dashboard: 'Run `npm run build:dashboard` to build the web dashboard',
    });
  });
}

// Error handler
app.use((err, req, res, next) => {
  logger.error(`API Error: ${err.message}`, { service: 'api', stack: err.stack });
  const status = err.status || err.statusCode || 500;
  res.status(status).json({ error: err.message || 'Internal server error' });
});

export default app;
