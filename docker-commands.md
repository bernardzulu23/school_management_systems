docker compose down
docker compose up

# Check if anything is listening on port 3000

netstat -tlnp 2>/dev/null || ss -tlnp

# Check running processes

ps aux

# Check if the app files exist

ls .next/standalone/

# Check web logs for the actual error:

docker compose logs web

# Check if env vars are loaded:

docker exec school_management_systems-web-1 env | findstr JWT

# The problem is the seed inside the container is using a baked-in URL from build time. Run it using a fresh node container on the same Docker network instead:

docker run --rm `  --network school_management_systems_default`
-e DATABASE_URL="postgresql://postgres:postgres@db:5432/zsms" `  -v "${PWD}:/app"`
-w /app `  node:20-slim`
sh -c "npm install --legacy-peer-deps && node prisma/seed.js"

# restarting only website

# Use the same method that worked before — run from outside the container on the Docker network:
