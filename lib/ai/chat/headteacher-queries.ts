/**
 * Bounded analytics queries for headteacher retrieval-only chat (Phase 1b).
 * Reuses the same aggregate patterns as /api/dashboard/headteacher and
 * /api/dashboard/stats — numbers are computed in Prisma, LLM only summarizes.
 */
import type { PrismaClient } from '@prisma/client'
import { getTenantClient } from '@/lib/prisma/tenantClient'
import { SCHOOL_WIDE_RESULT_TYPES } from '@/lib/results/resultTypes'
import { currentAcademicYear, currentTermLabel } from '@/lib/academic/currentTerm'

export const HEADTEACHER_REFUSAL =
  'I can answer questions about enrollment, attendance, exam performance, and teacher coverage. For anything else, please use the relevant dashboard section.'

export type HeadteacherQueryKind =
  | 'enrollment'
  | 'attendance'
  | 'exam_performance'
  | 'teacher_coverage'

export type HeadteacherQueryMatch = {
  kind: HeadteacherQueryKind
  label: string
}

export type HeadteacherComputedResult = {
  kind: HeadteacherQueryKind
  label: string
  /** Plain numbers / aggregates — safe for LLM summary */
  data: Record<string, unknown>
}

type Db = ReturnType<typeof getTenantClient> | PrismaClient

const ENROLLMENT_RE =
  /\b(enrol+ment|enroll+ed|how\s+many\s+(students?|pupils?|learners?)|pupil\s+count|student\s+count|head\s*count|total\s+students?)\b/i
const ATTENDANCE_RE = /\b(attendance|present\s+today|absent|attendance\s+rate)\b/i
const EXAM_RE = /\b(exam|performance|pass\s*rate|average\s+score|results?|grades?|achievement)\b/i
const COVERAGE_RE =
  /\b(teacher\s+coverage|staffing|how\s+many\s+teachers?|teacher\s+count|compliance|teacher\s+effectiveness|coverage)\b/i

export function mapHeadteacherQuestion(question: string): HeadteacherQueryMatch | null {
  const q = String(question || '').trim()
  if (!q) return null

  // Prefer more specific matches first when multiple fire
  if (ATTENDANCE_RE.test(q)) return { kind: 'attendance', label: 'Attendance' }
  if (EXAM_RE.test(q)) return { kind: 'exam_performance', label: 'Exam performance' }
  if (COVERAGE_RE.test(q)) return { kind: 'teacher_coverage', label: 'Teacher coverage' }
  if (ENROLLMENT_RE.test(q)) return { kind: 'enrollment', label: 'Enrollment' }
  return null
}

async function runEnrollment(db: Db, schoolId: string): Promise<Record<string, unknown>> {
  const [totalStudents, totalClasses, totalSubjects, byGender] = await Promise.all([
    db.student.count({ where: { schoolId } }),
    db.class.count({ where: { schoolId } }),
    db.subject.count({ where: { schoolId } }),
    db.user.groupBy({
      by: ['gender'],
      where: { schoolId, role: { in: ['student', 'STUDENT'] } },
      _count: { _all: true },
    }),
  ])

  return {
    totalStudents,
    totalClasses,
    totalSubjects,
    studentsByGender: byGender.map((g) => ({
      gender: g.gender || 'unknown',
      count: g._count._all,
    })),
  }
}

async function runAttendance(db: Db, schoolId: string): Promise<Record<string, unknown>> {
  const today = new Date()
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0)
  const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59)

  const [todayAttendanceCount, presentCount, totalStudents] = await Promise.all([
    db.attendance.count({
      where: { schoolId, date: { gte: startOfDay, lte: endOfDay } },
    }),
    db.attendance.count({
      where: { schoolId, date: { gte: startOfDay, lte: endOfDay }, status: 'present' },
    }),
    db.student.count({ where: { schoolId } }),
  ])

  const attendanceRate =
    todayAttendanceCount > 0 ? Math.round((presentCount / todayAttendanceCount) * 100) : 0

  return {
    date: startOfDay.toISOString().slice(0, 10),
    recordsToday: todayAttendanceCount,
    presentToday: presentCount,
    attendanceRatePercent: attendanceRate,
    totalStudents,
  }
}

async function runExamPerformance(db: Db, schoolId: string): Promise<Record<string, unknown>> {
  const term = currentTermLabel()
  const year = currentAcademicYear()
  const resultWhere = {
    schoolId,
    resultType: { in: SCHOOL_WIDE_RESULT_TYPES },
    OR: [
      { term: { equals: term, mode: 'insensitive' as const } },
      { term: { equals: term.replace(/^term\s+/i, ''), mode: 'insensitive' as const } },
    ],
    year,
  }

  const [resultsCount, passedResults, scoreAgg] = await Promise.all([
    db.result.count({ where: resultWhere }),
    db.result.count({ where: { ...resultWhere, score: { gte: 40 } } }),
    db.result.aggregate({ where: resultWhere, _avg: { score: true } }),
  ])

  const passRate = resultsCount > 0 ? Math.round((passedResults / resultsCount) * 100) : 0
  const averageScore = scoreAgg._avg.score ? Math.round(scoreAgg._avg.score) : 0

  return {
    term,
    year,
    resultsCount,
    passedResults,
    passRatePercent: passRate,
    averageScorePercent: averageScore,
  }
}

async function runTeacherCoverage(db: Db, schoolId: string): Promise<Record<string, unknown>> {
  const term = currentTermLabel()
  const year = currentAcademicYear()

  const [totalTeachers, totalHods, teacherRows, resultsWithTeachers] = await Promise.all([
    db.teacher.count({ where: { schoolId } }),
    db.headOfDepartment.count({ where: { schoolId } }),
    db.teacher.findMany({
      where: { schoolId },
      select: { userId: true },
      take: 50_000,
    }),
    db.result.groupBy({
      by: ['enteredByUserId'],
      where: {
        schoolId,
        enteredByUserId: { not: null },
        resultType: { in: SCHOOL_WIDE_RESULT_TYPES },
        year,
        OR: [
          { term: { equals: term, mode: 'insensitive' } },
          { term: { equals: term.replace(/^term\s+/i, ''), mode: 'insensitive' } },
        ],
      },
      _count: { _all: true },
    }),
  ])

  const teacherUserIds = new Set(teacherRows.map((t) => String(t.userId)).filter(Boolean))
  const teachersWithResults = resultsWithTeachers.filter((r) =>
    teacherUserIds.has(String(r.enteredByUserId || ''))
  ).length

  const complianceRate =
    teacherUserIds.size > 0 ? Math.round((teachersWithResults / teacherUserIds.size) * 100) : 0

  const assignments = await db.teachingAssignment.count({ where: { schoolId } })

  return {
    term,
    year,
    totalTeachers,
    totalHods,
    teachingAssignments: assignments,
    teachersWithResultsEntered: teachersWithResults,
    resultsEntryCompliancePercent: complianceRate,
  }
}

export async function executeHeadteacherQuery(
  schoolId: string,
  match: HeadteacherQueryMatch
): Promise<HeadteacherComputedResult> {
  const db = getTenantClient(schoolId)
  let data: Record<string, unknown>

  switch (match.kind) {
    case 'enrollment':
      data = await runEnrollment(db, schoolId)
      break
    case 'attendance':
      data = await runAttendance(db, schoolId)
      break
    case 'exam_performance':
      data = await runExamPerformance(db, schoolId)
      break
    case 'teacher_coverage':
      data = await runTeacherCoverage(db, schoolId)
      break
    default:
      data = {}
  }

  return { kind: match.kind, label: match.label, data }
}
