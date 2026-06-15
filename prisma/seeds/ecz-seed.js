/**
 * ECZ Reference Data Seed
 *
 * Seeds 12 ECZ competencies and 16 CBC subject constructs.
 * RUN: npm run seed:ecz
 * SAFE TO RE-RUN: Uses upsert.
 */
const { PrismaClient } = require('@prisma/client')
const { ECZ_COMPETENCIES, CBC_SUBJECTS } = require('./ecz-seed-data')
const { ECZ_EXEMPLARS } = require('./ecz-exemplar-seed-data')

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding ECZ competencies...')
  for (const row of ECZ_COMPETENCIES) {
    await prisma.eczCompetency.upsert({
      where: { name: row.name },
      update: {
        descriptor: row.descriptor,
        category: row.category,
      },
      create: row,
    })
  }
  console.log(`  ✓ ${ECZ_COMPETENCIES.length} competencies`)

  console.log('Seeding CBC subject constructs...')
  for (const row of CBC_SUBJECTS) {
    await prisma.eczSubjectConstruct.upsert({
      where: { subjectName: row.subjectName },
      update: {
        construct: row.construct,
        elementsOfConstruct: row.elementsOfConstruct,
        sbaWeight: row.sbaWeight,
        examWeight: row.examWeight,
        hasMultipleChoice: false,
      },
      create: {
        subjectName: row.subjectName,
        construct: row.construct,
        elementsOfConstruct: row.elementsOfConstruct,
        sbaWeight: row.sbaWeight,
        examWeight: row.examWeight,
        hasMultipleChoice: false,
      },
    })
  }
  console.log(`  ✓ ${CBC_SUBJECTS.length} subject constructs`)

  console.log('Seeding ECSEOL exemplars...')
  await prisma.eczExemplar.deleteMany({ where: { source: 'ecseol_2026' } })
  for (const row of ECZ_EXEMPLARS) {
    await prisma.eczExemplar.create({
      data: {
        subjectCode: row.subjectCode,
        subjectName: row.subjectName,
        form: row.form,
        band: row.band,
        title: row.title,
        context: row.context,
        task: row.task,
        taskType: row.taskType || null,
        materials: row.materials || null,
        rubricJson: row.rubricJson || null,
        demonstration: row.demonstration || null,
        examSubQuestionsJson: row.examSubQuestionsJson || null,
        source: 'ecseol_2026',
      },
    })
  }
  console.log(`  ✓ ${ECZ_EXEMPLARS.length} exemplars`)

  console.log('ECZ seed complete.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
