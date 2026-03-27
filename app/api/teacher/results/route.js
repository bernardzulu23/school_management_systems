import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { getSchoolIdFromRequest } from '@/lib/utils/getSchoolId'
import { calculateGrade } from '@/lib/gradingSystem'
import { gunzipSync } from 'node:zlib'

export const runtime = 'nodejs'

async function readJson(request) {
  const encoding = request.headers.get('content-encoding') || ''
  if (encoding.toLowerCase().includes('gzip')) {
    const buf = Buffer.from(await request.arrayBuffer())
    return JSON.parse(gunzipSync(buf).toString('utf-8'))
  }
  return request.json()
}

function parseTermYear(termRaw) {
  const term = String(termRaw || '').trim()
  const match = term.match(/(Term\s*\d+)\s*(\d{4})/i)
  if (match) return { term: match[1].trim(), year: Number(match[2]) }
  return { term: term || 'Term 1', year: new Date().getFullYear() }
}

export async function GET(request) {
  const auth = authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (!roleCheck(auth.user, ['TEACHER', 'teacher', 'ADMIN', 'headteacher', 'HOD', 'hod'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const schoolId = auth.user?.schoolId || (await getSchoolIdFromRequest(request))
  if (!schoolId) return NextResponse.json({ error: 'School context required' }, { status: 400 })

  const { searchParams } = new URL(request.url)
  const studentId = searchParams.get('studentId')
  const subjectId = searchParams.get('subjectId')
  const termRaw = searchParams.get('term')
  const yearRaw = searchParams.get('year')

  const { term, year } = yearRaw
    ? { term: String(termRaw || '').trim(), year: Number(yearRaw) }
    : parseTermYear(termRaw)

  const where = {
    schoolId,
    ...(studentId ? { studentId } : {}),
    ...(subjectId ? { subjectId } : {}),
    ...(term ? { term } : {}),
    ...(year ? { year } : {}),
  }

  const results = await prisma.result.findMany({
    where,
    orderBy: { updatedAt: 'desc' },
  })

  return NextResponse.json({
    success: true,
    data: results.map((r) => ({
      id: r.id,
      studentId: r.studentId,
      subjectId: r.subjectId,
      score: r.score,
      grade: r.grade,
      term: r.term,
      year: r.year,
      comments: r.comments,
      updatedAt: r.updatedAt,
    })),
  })
}

export async function POST(request) {
  const auth = authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (!roleCheck(auth.user, ['TEACHER', 'teacher'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const schoolId = auth.user?.schoolId || (await getSchoolIdFromRequest(request))
  if (!schoolId) return NextResponse.json({ error: 'School context required' }, { status: 400 })

  const body = await readJson(request)
  const results = Array.isArray(body?.results) ? body.results : null
  if (!results) return NextResponse.json({ error: 'Invalid data format' }, { status: 400 })

  const teacher = await prisma.teacher.findUnique({
    where: { userId: auth.user.id },
    select: { id: true },
  })
  if (!teacher) return NextResponse.json({ error: 'Teacher profile not found' }, { status: 404 })

  const conflicts = []
  let applied = 0

  const classIds = Array.from(
    new Set(
      results
        .map((r) => r.classId)
        .filter(Boolean)
        .map(String)
    )
  )
  const classMap = new Map(
    (await prisma.class.findMany({ where: { schoolId, id: { in: classIds } } })).map((c) => [
      c.id,
      c,
    ])
  )

  await prisma.$transaction(async (tx) => {
    for (const r of results) {
      const studentId = String(r.studentId || r.pupilId || '').trim()
      const subjectId = String(r.subjectId || '').trim()
      const classId = String(r.classId || '').trim()
      const score =
        r.score === '' || r.score === null || r.score === undefined ? null : Number(r.score)
      const resolution = r.resolution ? String(r.resolution) : null
      const baseUpdatedAt = r.baseUpdatedAt ? new Date(r.baseUpdatedAt) : null

      if (!studentId || !subjectId || !classId) continue
      if (score !== null && (Number.isNaN(score) || score < 0 || score > 100)) continue

      const hasAssignment = await tx.teachingAssignment.findFirst({
        where: { schoolId, teacherId: teacher.id, classId, subjectId },
        select: { id: true },
      })
      if (!hasAssignment) continue

      const termYear = parseTermYear(r.term)
      const term = String(r.term || termYear.term).trim() || termYear.term
      const year = Number(r.year || termYear.year)

      const existing = await tx.result.findFirst({
        where: { schoolId, studentId, subjectId, term, year },
        orderBy: { updatedAt: 'desc' },
      })

      if (
        existing &&
        baseUpdatedAt &&
        existing.updatedAt.getTime() !== baseUpdatedAt.getTime() &&
        !resolution
      ) {
        conflicts.push({
          key: { schoolId, studentId, subjectId, term, year },
          server: {
            id: existing.id,
            score: existing.score,
            grade: existing.grade,
            term: existing.term,
            year: existing.year,
            updatedAt: existing.updatedAt,
          },
          client: {
            score,
            term,
            year,
            baseUpdatedAt,
          },
        })
        continue
      }

      if (existing && resolution === 'keep_server') {
        continue
      }

      const classRecord = classMap.get(classId)
      const gradeLevel = classRecord?.year_group || classRecord?.name || ''
      const grade = calculateGrade(score, gradeLevel).grade

      if (existing) {
        await tx.result.update({
          where: { id: existing.id },
          data: {
            score: score ?? 0,
            grade,
          },
        })
      } else {
        await tx.result.create({
          data: {
            schoolId,
            studentId,
            subjectId,
            score: score ?? 0,
            grade,
            term,
            year,
          },
        })
      }

      applied += 1
    }
  })

  if (conflicts.length > 0) {
    return NextResponse.json({ success: false, conflicts, applied }, { status: 409 })
  }

  return NextResponse.json({ success: true, applied })
}
