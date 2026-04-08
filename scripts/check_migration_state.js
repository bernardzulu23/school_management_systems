const { PrismaClient } = require('@prisma/client')

async function main() {
  const prisma = new PrismaClient()

  const columns = await prisma.$queryRawUnsafe(`
    SELECT table_name, column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name IN ('Student', 'student')
      AND column_name IN ('faceEmbedding', 'faceembedding');
  `)

  const migration = await prisma.$queryRawUnsafe(`
    SELECT migration_name, finished_at, applied_steps_count, logs, rolled_back_at
    FROM "_prisma_migrations"
    WHERE migration_name = '20260407120000_add_student_face_embedding'
    ORDER BY started_at DESC
    LIMIT 5;
  `)

  console.log(JSON.stringify({ columns, migration }, null, 2))
  await prisma.$disconnect()
}

main().catch(async (e) => {
  console.error(e)
  process.exit(1)
})
