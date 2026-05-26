import { ECZ_SUBJECTS, normalizeElement } from '@/lib/ecz/ecz-subjects-data'

export const ECZ_SUBJECT_CODES = ECZ_SUBJECTS.map((s) => s.code)
export { ECZ_GUIDELINES_SUBJECT_COUNT } from '@/lib/ecz/ecz-subjects-data'

/** Sync all ECZ guideline subjects + construct elements for a school. */
export async function syncEczSubjects(prisma, schoolId) {
  let created = 0
  let updated = 0

  for (const spec of ECZ_SUBJECTS) {
    const existing = await prisma.subject.findFirst({
      where: { schoolId, code: spec.code },
      include: { constructElements: true },
    })

    let subjectId
    if (existing) {
      await prisma.subject.update({
        where: { id: existing.id },
        data: {
          construct: spec.construct,
          description: `ECZ ${spec.name}`,
        },
      })
      subjectId = existing.id
      updated += 1
    } else {
      const byName = await prisma.subject.findFirst({
        where: { schoolId, name: { equals: spec.name, mode: 'insensitive' } },
      })
      if (byName) {
        await prisma.subject.update({
          where: { id: byName.id },
          data: { code: spec.code, construct: spec.construct },
        })
        subjectId = byName.id
        updated += 1
      } else {
        const createdSubject = await prisma.subject.create({
          data: {
            schoolId,
            name: spec.name,
            code: spec.code,
            construct: spec.construct,
            description: `ECZ ${spec.name}`,
            topics: [],
          },
        })
        subjectId = createdSubject.id
        created += 1
      }
    }

    for (let i = 0; i < spec.elements.length; i++) {
      const el = normalizeElement(spec.elements[i], i + 1)
      await prisma.subjectConstructElement.upsert({
        where: {
          subjectId_elementNumber: { subjectId, elementNumber: el.number },
        },
        create: { subjectId, elementNumber: el.number, statement: el.statement },
        update: { statement: el.statement },
      })
    }
  }

  return { created, updated, total: ECZ_SUBJECTS.length }
}

export async function fetchEczSubjects(prisma, schoolId) {
  const rows = await prisma.subject.findMany({
    where: { schoolId, code: { in: ECZ_SUBJECT_CODES } },
    include: {
      constructElements: { orderBy: { elementNumber: 'asc' } },
      _count: { select: { eczAssessments: true } },
    },
    orderBy: { name: 'asc' },
  })

  return rows.map((s) => ({
    ...s,
    constructElements: s.constructElements || [],
  }))
}
