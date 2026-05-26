/**
 * GET /api/ecz/reference — ECZ competencies and CBC subject constructs (seeded data).
 */
export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthUser } from '@/lib/middleware/auth'

export async function GET(request) {
  const user = await getAuthUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [competencies, subjects] = await Promise.all([
    prisma.eczCompetency.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true, descriptor: true, category: true },
    }),
    prisma.eczSubjectConstruct.findMany({
      orderBy: { subjectName: 'asc' },
      select: {
        id: true,
        subjectName: true,
        construct: true,
        elementsOfConstruct: true,
        sbaWeight: true,
        examWeight: true,
        hasMultipleChoice: true,
      },
    }),
  ])

  return NextResponse.json({
    success: true,
    competencies,
    subjectConstructs: subjects,
  })
}
