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

  // Check if subjects already exist for this school
  const existingCount = await prisma.subject.count({ where: { schoolId } })

  // Only seed subjects if none exist for this school
  if (existingCount === 0) {
    // Track used codes to avoid conflicts (some subjects have duplicate codes like CHI)
    const usedCodes = new Set()

    for (const s of SCHOOL_SUBJECTS) {
      const name = String(s.name || '').trim()
      if (!name) continue

      // Generate unique code - if duplicate, append first 3 letters of name
      let code = s.code ? String(s.code) : null
      if (code && usedCodes.has(code)) {
        code = `${code}_${name.substring(0, 3).toUpperCase()}`
      }
      if (code) usedCodes.add(code)

      try {
        await prisma.subject.create({
          data: {
            schoolId,
            name,
            code,
            topics: [],
          },
        })
      } catch (e) {
        // Skip if subject already exists (race condition)
        if (e.code !== 'P2002') throw e
      }
    }
  }

  const subjects = await prisma.subject.findMany({
    where: { schoolId },
    orderBy: { name: 'asc' },
    select: { id: true, name: true, code: true },
  })

  return NextResponse.json({ success: true, data: subjects })
}
