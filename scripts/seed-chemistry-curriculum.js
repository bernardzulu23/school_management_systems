/**
 * Seed Zambia CDC 2024 Chemistry syllabus into a school's RAG material index.
 *
 * Usage:
 *   SCHOOL_ID=<cuid> UPLOADED_BY=<userId> node scripts/seed-chemistry-curriculum.js
 */
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const schoolId = String(process.env.SCHOOL_ID || '').trim()
  const uploadedBy = String(process.env.UPLOADED_BY || 'platform-seed').trim()
  const gradeLevel = String(process.env.GRADE_LEVEL || 'Forms 1–4').trim()

  if (!schoolId) {
    throw new Error('SCHOOL_ID is required')
  }

  const { seedChemistryCurriculumMaterial } = await import('../lib/rag/ingest-curriculum.js')
  const { getSchoolPlanForUsage } = await import('../lib/middleware/aiUsageTracker.js')

  const school = await getSchoolPlanForUsage(schoolId)
  if (!school) {
    throw new Error(`School not found: ${schoolId}`)
  }

  const result = await seedChemistryCurriculumMaterial({
    schoolId,
    uploadedBy,
    schoolPlan: school.plan,
    gradeLevel,
  })

  console.log(
    JSON.stringify(
      {
        ok: true,
        materialId: result.materialId,
        chunksIndexed: result.chunksIndexed,
        recordCount: result.recordCount,
        materialTitle: result.materialTitle,
      },
      null,
      2
    )
  )
}

main()
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
