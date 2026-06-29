export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { getActiveClasses } from '@/lib/timetable/getActiveClasses'
import { withErrorHandler } from '@/lib/middleware/errorHandler'
import { safeQueryString } from '@/lib/security/safeQueryValue'

function standardZambianClasses() {
  const sections = ['A', 'B', 'C', 'D']
  const classes = []

  const forms = [1, 2, 3, 4, 5, 6]
  for (const form of forms) {
    for (const section of sections) {
      classes.push({
        name: `Form ${form}${section}`,
        year_group: `Form ${form}`,
        section,
      })
    }
  }

  const grades = [10, 11, 12]
  for (const grade of grades) {
    for (const section of sections) {
      classes.push({
        name: `${grade}${section}`,
        year_group: `Grade ${grade}`,
        section,
      })
    }
  }
  return classes
}

export const GET = withErrorHandler(async function GET(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (
    !roleCheck(auth.user, [
      'ADMIN',
      'headteacher',
      'HOD',
      'hod',
      'TEACHER',
      'teacher',
      'STUDENT',
      'student',
    ])
  ) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) return NextResponse.json({ error: 'School context required' }, { status: 400 })

  const { searchParams } = new URL(request.url)
  const seedDefaults = String(searchParams.get('seedDefaults') || '').toLowerCase() === 'true'
  const activeOnly = String(searchParams.get('activeOnly') || '').toLowerCase() === 'true'
  const term = safeQueryString(searchParams.get('term'), { defaultValue: 'Term 1' })
  const academicYear = safeQueryString(searchParams.get('academicYear'), {
    defaultValue: String(new Date().getFullYear()),
  })

  if (seedDefaults && roleCheck(auth.user, ['ADMIN', 'headteacher'])) {
    await prisma.$transaction(async (tx) => {
      for (const c of standardZambianClasses()) {
        await tx.class.upsert({
          where: { schoolId_name: { schoolId, name: c.name } },
          create: {
            schoolId,
            name: c.name,
            year_group: c.year_group,
            section: c.section,
            isActive: false,
          },
          update: {},
        })
      }
    })
  }

  const classes = activeOnly
    ? await getActiveClasses(prisma, schoolId, { term, academicYear, timetableUi: false })
    : await prisma.class.findMany({
        where: { schoolId },
        orderBy: [{ year_group: 'asc' }, { section: 'asc' }],
        select: {
          id: true,
          name: true,
          year_group: true,
          section: true,
          isActive: true,
          subjects: { select: { id: true, name: true } },
          _count: { select: { students: true } },
        },
      })

  return NextResponse.json({
    success: true,
    data: classes.map((c) => ({
      id: c.id,
      name: c.name,
      year_group: c.year_group,
      section: c.section,
      isActive: c.isActive !== false,
      subjects: c.subjects || [],
      studentCount: c._count?.students ?? 0,
    })),
  })
})

function parseClassInput(rawName) {
  const name = String(rawName || '').trim()
  if (!name) return null

  const normalized = name.replace(/\s+/g, ' ').trim()
  const match = normalized.match(/(\d+)\s*([A-Za-z])$/)
  if (match) {
    const grade = Number(match[1])
    const section = String(match[2]).toUpperCase()
    if (Number.isFinite(grade)) {
      return {
        name: `${grade}${section}`,
        year_group: `Grade ${grade}`,
        section,
      }
    }
  }

  const formMatch = normalized.match(/Form\s*(\d+)\s*([A-Za-z])$/i)
  if (formMatch) {
    const form = Number(formMatch[1])
    const section = String(formMatch[2]).toUpperCase()
    if (Number.isFinite(form)) {
      return {
        name: `Form ${form}${section}`,
        year_group: `Form ${form}`,
        section,
      }
    }
  }

  const fallbackSectionMatch = normalized.match(/([A-Za-z])$/)
  const fallbackSection = fallbackSectionMatch
    ? String(fallbackSectionMatch[1]).toUpperCase()
    : null
  return {
    name: normalized,
    year_group: 'General',
    section: fallbackSection || 'A',
  }
}

export const POST = withErrorHandler(async function POST(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (!roleCheck(auth.user, ['ADMIN', 'headteacher'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) return NextResponse.json({ error: 'School context required' }, { status: 400 })

  const body = await request.json().catch(() => ({}))

  const parsed = parseClassInput(body?.name)
  if (!parsed?.name) {
    return NextResponse.json({ error: 'Class name is required' }, { status: 400 })
  }

  const year_group = String(body?.year_group || parsed.year_group || '').trim()
  const section = String(body?.section || parsed.section || '').trim()
  if (!year_group || !section) {
    return NextResponse.json({ error: 'year_group and section are required' }, { status: 400 })
  }

  const created = await prisma.class.upsert({
    where: { schoolId_name: { schoolId, name: parsed.name } },
    create: {
      schoolId,
      name: parsed.name,
      year_group,
      section: section.toUpperCase(),
    },
    update: {
      year_group,
      section: section.toUpperCase(),
    },
    select: { id: true, name: true, year_group: true, section: true },
  })
  return NextResponse.json({ success: true, data: created }, { status: 201 })
})
