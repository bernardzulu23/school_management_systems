#!/bin/sh
set -e
echo "Starting server..."

# Using hostname 0.0.0.0 is critical for Docker networking
export HOSTNAME="0.0.0.0"
export PORT=3000

node server.js &
SERVER_PID=$!
echo "Server started with PID $SERVER_PID"

echo "Running migrations..."
if [ -d "node_modules/prisma" ]; then
  node node_modules/prisma/build/index.js migrate deploy || echo "Migration failed but continuing..."
else
  echo "Prisma not found in node_modules, skipping migration or using global command if available"
  npx prisma migrate deploy || echo "Migration failed but continuing..."
fi
echo "Migrations completed."

wait $SERVER_PID
