#!/bin/sh
set -e
echo "Starting server..."

# Using hostname 0.0.0.0 is critical for Docker networking
export HOSTNAME="${HOSTNAME:-0.0.0.0}"
export PORT="${PORT:-3000}"

echo "Running migrations..."
if [ -d "node_modules/prisma" ]; then
  node node_modules/prisma/build/index.js migrate deploy || echo "Migration failed but continuing..."
else
  echo "Prisma not found in node_modules, using npx"
  npx prisma migrate deploy || echo "Migration failed but continuing..."
fi
echo "Migrations completed."

node server.js &
SERVER_PID=$!
echo "Server started with PID $SERVER_PID"

wait $SERVER_PID
