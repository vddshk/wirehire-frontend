# syntax=docker/dockerfile:1.7

# WireHire frontend — production image for Next.js 16 (standalone output).
# Multi-stage build keeps the runtime image small (~150 MB).

# --- Stage 1: install dependencies ---
FROM node:22-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# --- Stage 2: build the Next.js bundle ---
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# NEXT_PUBLIC_* vars are baked into the client bundle at build time, not read
# at runtime — so they must be passed via --build-arg. Defaults below assume
# the production layout: frontend and backend live on the same origin and the
# real REST API is used. For a mock-only build override with --build-arg.
ARG NEXT_PUBLIC_API_BASE_URL=/api
ARG NEXT_PUBLIC_USE_MOCK_API=false
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL
ENV NEXT_PUBLIC_USE_MOCK_API=$NEXT_PUBLIC_USE_MOCK_API
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# --- Stage 3: minimal runtime image ---
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Non-root user for the Next.js server.
RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

# Static assets served by Next.js.
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Standalone server bundle: server.js + minimal node_modules.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

# Healthcheck — used by Docker / orchestrator to detect a stuck process.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://127.0.0.1:3000/ || exit 1

# server.js is produced by next build when output:"standalone" is set.
CMD ["node", "server.js"]
