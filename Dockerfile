# syntax=docker/dockerfile:1

ARG NODE_VERSION=20.19.0
FROM node:${NODE_VERSION}-slim as base

LABEL fly_launch_runtime="Next.js/Prisma"

# Install OpenSSL and other dependencies
RUN apt-get update -qq && \
    apt-get install -y --no-install-recommends \
    openssl \
    ca-certificates && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

ENV NODE_ENV="production"

# Build stage
FROM base as build

RUN apt-get update -qq && \
    apt-get install -y --no-install-recommends \
    build-essential \
    pkg-config \
    python3 && \
    rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package-lock.json package.json ./

# Install dependencies
RUN npm ci --include=dev

# Copy prisma schema
COPY prisma ./prisma/

# Generate Prisma Client (dummy URL for build only, not persisted as ENV)
RUN DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy" npx prisma generate

# Copy application code
COPY . .

# Placeholder for build only - Railway injects real DATABASE_URL at runtime
ENV DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"

# Build Next.js
RUN npm run build

# Remove dev dependencies
RUN npm prune --omit=dev

# Production stage
FROM base

# Copy built application
COPY --from=build /app/public ./public

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static

# Copy Prisma for migrations (npx prisma migrate deploy at runtime)
COPY --from=build /app/prisma ./prisma/
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=build /app/node_modules/prisma ./node_modules/prisma

# Create startup script (migrations first, then server)
RUN printf '%s\n' \
    '#!/bin/sh' \
    'set -e' \
    'node node_modules/prisma/build/index.js migrate deploy' \
    'exec node server.js' \
    > /app/start.sh && chmod +x /app/start.sh

# Set correct permissions
RUN chown -R node:node /app

USER node

# Expose port (Railway will set PORT env var)
EXPOSE 3000

# Set Hostname to 0.0.0.0 to allow external access
ENV HOSTNAME="0.0.0.0"

# Use startup script - avoids "failed to exec pid1" shell issues
CMD ["/app/start.sh"]
