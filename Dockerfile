# syntax=docker/dockerfile:1.7
# Multi-stage image for meow-weight-tracker (Next.js 14, standalone output).
#
# Reference: scripts/templates/woodpecker-app/node-fullstack/Dockerfile in the
# homelab repo; customised for Next.js' standalone runtime payload + pnpm.

ARG NODE_VERSION=22

# ============================================================
# Stage 1 — Resolve deps via pnpm (cached unless package.json/lockfile change)
# ============================================================
FROM node:${NODE_VERSION}-alpine AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat python3 make g++
RUN corepack enable pnpm
COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

# ============================================================
# Stage 2 — Build Next.js (standalone output + static assets)
# ============================================================
FROM node:${NODE_VERSION}-alpine AS builder
WORKDIR /app
RUN corepack enable pnpm
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# NEXT_PUBLIC_* env vars are statically baked into the JS bundle at build
# time. Supply per-env values via Woodpecker --build-arg in .woodpecker.yml.
ARG NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=""
ARG NEXT_PUBLIC_SENTRY_DSN=""
ENV NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=${NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY} \
    NEXT_PUBLIC_SENTRY_DSN=${NEXT_PUBLIC_SENTRY_DSN}

# The env validator in src/env.js asserts POSTGRES_URL.url() at build —
# skip so the build doesn't need the runtime DB URL.
ENV SKIP_ENV_VALIDATION=1
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm build

# ============================================================
# Stage 3 — Runtime (Next.js standalone server.js)
# ============================================================
FROM node:${NODE_VERSION}-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

RUN addgroup -S -g 1001 nodejs && adduser -S -u 1001 -G nodejs nextjs

# Standalone bundle (server.js + minimal node_modules tree)
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Migration assets — entrypoint runs Drizzle migrations before exec'ing server.
# The standalone trace doesn't pick up drizzle-orm/postgres CLI deps because
# nothing in the runtime bundle imports them; copy explicitly.
COPY --from=builder --chown=nextjs:nodejs /app/drizzle ./drizzle
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/drizzle-orm ./node_modules/drizzle-orm
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/postgres ./node_modules/postgres
COPY --from=builder --chown=nextjs:nodejs /app/scripts/run-migrations.mjs ./scripts/run-migrations.mjs
COPY scripts/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

USER nextjs
EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=5s --start-period=20s --retries=3 \
    CMD wget -q --spider http://127.0.0.1:3000/ || exit 1
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "server.js"]

# ============================================================
# Stage 4 — Dev (Dokploy dev slot, full deps + next dev)
# ============================================================
FROM node:${NODE_VERSION}-alpine AS dev
WORKDIR /app
ENV NODE_ENV=development \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
RUN apk add --no-cache libc6-compat python3 make g++
RUN corepack enable pnpm
COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile
COPY . .
COPY scripts/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh
EXPOSE 3000
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["pnpm", "dev"]
