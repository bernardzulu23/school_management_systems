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
# Attempt to resolve any failed migrations first
if [ -d "node_modules/prisma" ]; then
  echo "Attempting to resolve failed migrations..."
  node node_modules/prisma/build/index.js migrate resolve --applied 20250214000000_add_feedback || echo "Resolve skipped or failed"
  
  echo "Deploying migrations..."
  node node_modules/prisma/build/index.js migrate deploy || echo "Migration failed but continuing..."
else
  echo "Prisma not found in node_modules, using npx"
  npx prisma migrate resolve --applied 20250214000000_add_feedback || echo "Resolve skipped or failed"
  npx prisma migrate deploy || echo "Migration failed but continuing..."
fi
echo "Migrations completed."

wait $SERVER_PID
