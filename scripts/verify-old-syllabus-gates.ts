import { prisma } from '../lib/prisma'

async function main() {
  const docs = await prisma.oldSyllabusDocument.findMany({
    select: { subject: true, validationStatus: true },
  })
  const papers = await prisma.pastPaper.findMany({
    select: { subject: true, validationStatus: true, structureJson: true },
  })
  const gate = await prisma.curriculumRollout.findMany({
    where: {
      OR: [
        { canonicalLevel: 'SS1', academicYear: 2027 },
        { canonicalLevel: 'SS2', academicYear: 2027 },
        { canonicalLevel: 'SS3', academicYear: 2028 },
        { canonicalLevel: 'SS3', academicYear: 2029 },
      ],
    },
  })

  console.log(
    JSON.stringify(
      {
        docs,
        invalidDocs: docs.filter((d) => d.validationStatus !== 'VALID').length,
        papers: papers.map((p) => ({
          subject: p.subject,
          validationStatus: p.validationStatus,
          needsReview: p.structureJson?.needsReview,
          topicCoverageReviewed: p.structureJson?.topicCoverageReviewed,
        })),
        gate: gate.map((x) => ({
          key: `${x.canonicalLevel}/${x.academicYear}`,
          syllabusVersion: x.syllabusVersion,
        })),
      },
      null,
      2
    )
  )
}

main()
  .catch((e) => {
    console.error(e)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
