#!/bin/sh
set -e
echo "Starting server..."
node server.js &
SERVER_PID=$!
echo "Server started with PID $SERVER_PID"

echo "Running migrations..."
if [ -d "node_modules/prisma" ]; then
  node node_modules/prisma/build/index.js migrate deploy
else
  echo "Prisma not found in node_modules, skipping migration or using global command if available"
  npx prisma migrate deploy
fi
echo "Migrations completed."

wait $SERVER_PID
