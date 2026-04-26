import 'dotenv/config'
import { defineConfig } from 'prisma/config'

// Use process.env directly to avoid throwing if DATABASE_URL is missing during Docker build
const databaseUrl = process.env.DATABASE_URL || 'postgresql://dummy:password@localhost:5432/db'
const directUrl = process.env.DIRECT_URL || databaseUrl

const usesMigrationsConnection = process.argv.some((arg) =>
  ['migrate', 'db', 'introspect', 'push', 'deploy', 'reset'].includes(arg)
)

const prismaCliUrl = usesMigrationsConnection ? directUrl : databaseUrl

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    seed: 'node prisma/seed.js',
  },
  datasource: {
    url: prismaCliUrl,
  },
})
