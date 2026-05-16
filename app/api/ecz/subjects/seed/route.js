export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { getSchoolIdFromRequest } from '@/lib/utils/getSchoolId'
import { ECZ_SUBJECTS, normalizeElement } from '@/lib/ecz/ecz-subjects-data'

/** Seed ECZ subjects and construct elements for the current school. */
export async function POST(request) {
  const auth = authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (!roleCheck(auth.user, ['ADMIN', 'headteacher', 'HOD', 'hod'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const schoolId = auth.user?.schoolId || (await getSchoolIdFromRequest(request))
  if (!schoolId) return NextResponse.json({ error: 'School context required' }, { status: 400 })

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

  return NextResponse.json({
    success: true,
    message: 'ECZ subjects and construct elements synced',
    created,
    updated,
    total: ECZ_SUBJECTS.length,
  })
}

export async function GET(request) {
  const auth = authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  const schoolId = auth.user?.schoolId || (await getSchoolIdFromRequest(request))
  if (!schoolId) return NextResponse.json({ error: 'School context required' }, { status: 400 })

  const subjects = await prisma.subject.findMany({
    where: { schoolId },
    include: {
      constructElements: { orderBy: { elementNumber: 'asc' } },
      _count: { select: { eczAssessments: true } },
    },
    orderBy: { name: 'asc' },
  })

  return NextResponse.json({ success: true, data: subjects })
}
