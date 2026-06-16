FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache chromium nss freetype harfbuzz ca-certificates ttf-freefont
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# ── Install pnpm ─────────────────────────────────────────────
RUN corepack enable && corepack prepare pnpm@10.6.5 --activate

# ── Backend dependencies ──────────────────────────────────────
FROM base AS backend-deps
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --ignore-scripts

# ── Dashboard build ───────────────────────────────────────────
FROM base AS dashboard-build
WORKDIR /app
COPY package.json ./
COPY scripts/fix-dashboard-deps.js ./scripts/
COPY dashboard/package.json dashboard/package-lock.json* dashboard/
WORKDIR /app/dashboard
RUN npm install
WORKDIR /app
RUN node scripts/fix-dashboard-deps.js
WORKDIR /app/dashboard
COPY dashboard/ .
RUN npm run build

# ── Production image ──────────────────────────────────────────
FROM base AS production
ENV NODE_ENV=production

COPY --from=backend-deps /app/node_modules ./node_modules
COPY --from=dashboard-build /app/dashboard/dist ./dashboard/dist

COPY . .

RUN mkdir -p uploads

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:5000/api/health || exit 1

CMD ["node", "server.js"]
