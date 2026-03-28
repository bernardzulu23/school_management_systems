import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { getSchoolIdFromRequest } from '@/lib/utils/getSchoolId'
import { SCHOOL_SUBJECTS } from '@/data/subjects'

export async function GET(request) {
  const auth = authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (!roleCheck(auth.user, ['ADMIN', 'headteacher', 'HOD', 'hod', 'TEACHER', 'teacher'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const schoolId = auth.user?.schoolId || (await getSchoolIdFromRequest(request))
  if (!schoolId) return NextResponse.json({ error: 'School context required' }, { status: 400 })

  const usedCodes = new Set()
  await prisma.$transaction(async (tx) => {
    for (const s of SCHOOL_SUBJECTS) {
      const name = String(s.name || '').trim()
      if (!name) continue

      let code = s.code ? String(s.code) : null
      if (code && usedCodes.has(code)) {
        code = `${code}_${name.substring(0, 3).toUpperCase()}`
      }
      if (code) usedCodes.add(code)

      await tx.subject.upsert({
        where: { schoolId_name: { schoolId, name } },
        create: {
          schoolId,
          name,
          code,
          topics: [],
        },
        update: {
          code: code ?? undefined,
        },
      })
    }
  })

  const subjects = await prisma.subject.findMany({
    where: { schoolId },
    orderBy: { name: 'asc' },
    select: { id: true, name: true, code: true },
  })

  return NextResponse.json({ success: true, data: subjects })
}
