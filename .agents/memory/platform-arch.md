---
name: Platform architecture
description: How the full-stack social-poster platform is structured and started
---

Single Node.js process (`node server.js` on port 5000) contains:
- Express API at `/api/*` (api/server.js imported by server.js)
- React dashboard served as static files from `dashboard/dist/` (built with Vite)
- Telegraf Telegram bot (requires BOT_TOKEN env var; gracefully skips if absent)
- node-cron scheduler (4 jobs: daily-bonus-reset, clean-old-logs, process-scheduled-posts, update-user-stats)
- PostgreSQL via `pg` pool (shared/db.js)

**Why:** Single process simplifies deployment (one Dockerfile, one Railway service, one Procfile). Bot and API share the DB pool and scheduler context.

**How to apply:** Always start with `node server.js`. Build dashboard first: `pnpm run build:dashboard`. Run migrations: `pnpm run db:migrate`.

Key entry points:
- `server.js` — root entry, runs migrations then imports api/server.js + bot/index.js + shared/scheduler.js
- `api/server.js` — Express app (does not call listen itself)
- `bot/index.js` — exports createBot() and startBot()
- `shared/scheduler.js` — exports initScheduler()
