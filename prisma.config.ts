import 'dotenv/config'
import { defineConfig } from 'prisma/config'

// Use process.env directly to avoid throwing if DATABASE_URL is missing during Docker build
const databaseUrl = process.env.DATABASE_URL || 'postgresql://dummy:password@localhost:5432/db'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: databaseUrl,
  },
})
