#!/bin/sh
set -e
# Start server first so healthcheck passes; run migrations in parallel
node server.js &
node node_modules/prisma/build/index.js migrate deploy
wait
