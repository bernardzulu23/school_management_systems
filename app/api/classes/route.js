export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { getSchoolIdFromRequest } from '@/lib/utils/getSchoolId'

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

  const grades = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
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

export async function GET(request) {
  const auth = authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (!roleCheck(auth.user, ['ADMIN', 'headteacher', 'HOD', 'hod', 'TEACHER', 'teacher'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const schoolId = auth.user?.schoolId || (await getSchoolIdFromRequest(request))
  if (!schoolId) return NextResponse.json({ error: 'School context required' }, { status: 400 })

  const { searchParams } = new URL(request.url)
  const seedDefaults = String(searchParams.get('seedDefaults') || '').toLowerCase() === 'true'
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
          },
          update: {},
        })
      }
    })
  }

  const classes = await prisma.class.findMany({
    where: { schoolId },
    orderBy: [{ year_group: 'asc' }, { section: 'asc' }],
    select: { id: true, name: true, year_group: true, section: true },
  })

  return NextResponse.json({ success: true, data: classes })
}

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

export async function POST(request) {
  const auth = authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (!roleCheck(auth.user, ['ADMIN', 'headteacher'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const schoolId = auth.user?.schoolId || (await getSchoolIdFromRequest(request))
  if (!schoolId) return NextResponse.json({ error: 'School context required' }, { status: 400 })

  let body = {}
  try {
    body = await request.json()
  } catch {
    body = {}
  }

  const parsed = parseClassInput(body?.name)
  if (!parsed?.name) {
    return NextResponse.json({ error: 'Class name is required' }, { status: 400 })
  }

  const year_group = String(body?.year_group || parsed.year_group || '').trim()
  const section = String(body?.section || parsed.section || '').trim()
  if (!year_group || !section) {
    return NextResponse.json({ error: 'year_group and section are required' }, { status: 400 })
  }

  try {
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
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
