export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { SCHOOL_SUBJECTS } from '@/data/subjects'

export async function GET(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (!roleCheck(auth.user, ['ADMIN', 'headteacher', 'HOD', 'hod', 'TEACHER', 'teacher'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) return NextResponse.json({ error: 'School context required' }, { status: 400 })

  const usedCodes = new Set()
  const createData = []
  for (const s of SCHOOL_SUBJECTS) {
    const name = String(s.name || '').trim()
    if (!name) continue

    let code = s.code ? String(s.code) : null
    if (code && usedCodes.has(code)) {
      code = `${code}_${name.substring(0, 3).toUpperCase()}`
    }
    if (code) usedCodes.add(code)

    createData.push({
      schoolId,
      name,
      code,
      topics: [],
    })
  }

  if (createData.length > 0) {
    await prisma.subject.createMany({
      data: createData,
      skipDuplicates: true,
    })
  }

  const subjects = await prisma.subject.findMany({
    where: { schoolId },
    orderBy: { name: 'asc' },
    select: { id: true, name: true, code: true },
  })

  return NextResponse.json({ success: true, data: subjects })
}

export async function POST(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (!roleCheck(auth.user, ['ADMIN', 'headteacher'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) return NextResponse.json({ error: 'School context required' }, { status: 400 })

  let body = {}
  try {
    body = await request.json()
  } catch {
    body = {}
  }

  const name = String(body?.name || '').trim()
  const code = body?.code ? String(body.code).trim() : null
  if (!name) return NextResponse.json({ error: 'Subject name is required' }, { status: 400 })

  try {
    const subject = await prisma.subject.upsert({
      where: { schoolId_name: { schoolId, name } },
      create: {
        schoolId,
        name,
        code: code || null,
        topics: [],
      },
      update: {
        code: code || undefined,
      },
      select: { id: true, name: true, code: true },
    })
    return NextResponse.json({ success: true, data: subject }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
