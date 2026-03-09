# syntax=docker/dockerfile:1

ARG NODE_VERSION=20.11.0
FROM node:${NODE_VERSION}-slim as base

WORKDIR /app

ENV NODE_ENV="production"

# Install runtime dependencies
RUN apt-get update -qq && \
    apt-get install -y --no-install-recommends \
    openssl \
    ca-certificates && \
    rm -rf /var/lib/apt/lists/*

# Build stage
FROM base as build

RUN apt-get update -qq && \
    apt-get install -y --no-install-recommends \
    build-essential \
    pkg-config \
    python3 && \
    rm -rf /var/lib/apt/lists/*
COPY package-lock.json package.json ./
RUN npm ci --include=dev

COPY prisma ./prisma/
ENV DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"
RUN npx prisma generate

COPY . .
RUN npm run build
RUN npm prune --omit=dev

# Production stage
FROM base

COPY --from=build /app/public ./public
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=build /app/node_modules/prisma ./node_modules/prisma

RUN chown -R node:node /app
USER node

EXPOSE 3000
ENV HOSTNAME="0.0.0.0"

CMD ["sh", "-c", "npx prisma migrate deploy && node server.js"]
