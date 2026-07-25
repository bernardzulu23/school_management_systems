import { prisma } from '../lib/prisma'

async function main() {
  const d = await prisma.oldSyllabusDocument.deleteMany({})
  const p = await prisma.pastPaper.deleteMany({})
  console.log('cleared', { documents: d.count, papers: p.count })
}

main()
  .catch((e) => {
    console.error(e)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
