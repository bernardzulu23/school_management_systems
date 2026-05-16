import prisma from '@/lib/prisma'

const STEM_SUBJECT_PATTERN =
  /mathematics|math|science|biology|chemistry|physics|ict|computer|integrated science/i

export function isStemSubject(name) {
  return STEM_SUBJECT_PATTERN.test(String(name || ''))
}

function startOfDay(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0)
}

function endOfDay(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59)
}

export async function getSchoolAttendanceRate(schoolId, days = 30) {
  const end = endOfDay()
  const start = new Date(end)
  start.setDate(start.getDate() - days)

  const records = await prisma.attendance.findMany({
    where: { schoolId, date: { gte: start, lte: end } },
    select: { status: true },
  })

  if (!records.length) return { rate: 0, sampleSize: 0, periodDays: days }
  const present = records.filter((r) => String(r.status).toLowerCase() === 'present').length
  return {
    rate: Math.round((present / records.length) * 100),
    sampleSize: records.length,
    periodDays: days,
  }
}

export async function getClassAttendanceRates(schoolId, classNames = [], days = 30) {
  const end = endOfDay()
  const start = new Date(end)
  start.setDate(start.getDate() - days)

  const students = await prisma.student.findMany({
    where: { schoolId, class: { in: classNames.filter(Boolean) } },
    select: { id: true, class: true },
  })

  const studentClass = new Map(students.map((s) => [s.id, s.class]))
  const ids = students.map((s) => s.id)
  if (!ids.length) return {}

  const records = await prisma.attendance.findMany({
    where: { schoolId, studentId: { in: ids }, date: { gte: start, lte: end } },
    select: { studentId: true, status: true },
  })

  const byClass = {}
  for (const r of records) {
    const cls = studentClass.get(r.studentId) || 'Unknown'
    if (!byClass[cls]) byClass[cls] = { total: 0, present: 0 }
    byClass[cls].total += 1
    if (String(r.status).toLowerCase() === 'present') byClass[cls].present += 1
  }

  const rates = {}
  for (const [cls, agg] of Object.entries(byClass)) {
    rates[cls] = agg.total ? Math.round((agg.present / agg.total) * 100) : 0
  }
  return rates
}

export async function getExamTrackingSummary(schoolId) {
  const results = await prisma.result.findMany({
    where: { schoolId },
    select: {
      score: true,
      grade: true,
      term: true,
      year: true,
      student: { select: { class: true, id: true } },
      subject: { select: { name: true } },
    },
    take: 5000,
    orderBy: { updatedAt: 'desc' },
  })

  const byTerm = new Map()
  const byClass = new Map()
  let passCount = 0
  let total = 0

  for (const r of results) {
    const score = Number(r.score) || 0
    total += 1
    if (score >= 50) passCount += 1

    const termKey = `${r.year || '—'} · ${r.term || 'General'}`
    if (!byTerm.has(termKey)) byTerm.set(termKey, { scores: [], count: 0 })
    const t = byTerm.get(termKey)
    t.scores.push(score)
    t.count += 1

    const cls = r.student?.class || 'Unknown'
    if (!byClass.has(cls)) byClass.set(cls, { scores: [], students: new Set() })
    const c = byClass.get(cls)
    c.scores.push(score)
    if (r.student?.id) c.students.add(r.student.id)
  }

  const termBreakdown = Array.from(byTerm.entries()).map(([term, v]) => ({
    term,
    averageScore: v.scores.length
      ? Math.round(v.scores.reduce((a, b) => a + b, 0) / v.scores.length)
      : 0,
    records: v.count,
    estimatedPassRate: v.scores.length
      ? Math.round((v.scores.filter((s) => s >= 50).length / v.scores.length) * 100)
      : 0,
  }))

  const classBreakdown = Array.from(byClass.entries())
    .map(([className, v]) => ({
      className,
      learners: v.students.size,
      averageScore: v.scores.length
        ? Math.round(v.scores.reduce((a, b) => a + b, 0) / v.scores.length)
        : 0,
      estimatedPassRate: v.scores.length
        ? Math.round((v.scores.filter((s) => s >= 50).length / v.scores.length) * 100)
        : 0,
    }))
    .sort((a, b) => a.className.localeCompare(b.className))

  return {
    totalRecords: total,
    estimatedPassRate: total ? Math.round((passCount / total) * 100) : 0,
    termBreakdown: termBreakdown.slice(0, 12),
    classBreakdown: classBreakdown.slice(0, 24),
    recentCount: results.length,
  }
}

export async function getStemPerformanceSummary(schoolId) {
  const results = await prisma.result.findMany({
    where: { schoolId },
    include: {
      subject: { select: { name: true } },
      student: { select: { class: true } },
    },
    take: 5000,
    orderBy: { updatedAt: 'desc' },
  })

  const stemResults = results.filter((r) => isStemSubject(r.subject?.name))
  const bySubject = new Map()

  for (const r of stemResults) {
    const name = r.subject?.name || 'STEM'
    if (!bySubject.has(name)) {
      bySubject.set(name, { scores: [], classes: new Set(), below50: 0 })
    }
    const entry = bySubject.get(name)
    const score = Number(r.score) || 0
    entry.scores.push(score)
    if (r.student?.class) entry.classes.add(r.student.class)
    if (score < 50) entry.below50 += 1
  }

  const subjects = Array.from(bySubject.entries())
    .map(([subject, v]) => {
      const avg = v.scores.length ? v.scores.reduce((a, b) => a + b, 0) / v.scores.length : 0
      return {
        subject,
        averageScore: Math.round(avg),
        records: v.scores.length,
        classes: v.classes.size,
        needsIntervention: avg < 50 || v.below50 / Math.max(v.scores.length, 1) > 0.4,
        below50Count: v.below50,
      }
    })
    .sort((a, b) => a.averageScore - b.averageScore)

  return {
    totalStemRecords: stemResults.length,
    subjects,
    flaggedCount: subjects.filter((s) => s.needsIntervention).length,
  }
}

export async function getMoeReportSnapshot(schoolId) {
  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    select: {
      id: true,
      name: true,
      subdomain: true,
      email: true,
      phone: true,
      address: true,
      level: true,
      plan: true,
    },
  })

  const [students, teachers, classes, hods, users] = await Promise.all([
    prisma.student.findMany({
      where: { schoolId },
      select: { class: true, user: { select: { gender: true } } },
    }),
    prisma.teacher.count({ where: { schoolId } }),
    prisma.class.count({ where: { schoolId } }),
    prisma.headOfDepartment.count({ where: { schoolId } }),
    prisma.user.count({ where: { schoolId } }),
  ])

  const enrollmentByClass = {}
  let male = 0
  let female = 0
  for (const s of students) {
    const cls = s.class || 'Unassigned'
    enrollmentByClass[cls] = (enrollmentByClass[cls] || 0) + 1
    const g = String(s.user?.gender || '').toLowerCase()
    if (g.startsWith('m')) male += 1
    else if (g.startsWith('f')) female += 1
  }

  return {
    generatedAt: new Date().toISOString(),
    school,
    summary: {
      totalEnrollment: students.length,
      totalTeachers: teachers,
      totalClasses: classes,
      totalHods: hods,
      totalUsers: users,
      male,
      female,
    },
    enrollmentByClass: Object.entries(enrollmentByClass)
      .map(([className, count]) => ({ className, count }))
      .sort((a, b) => a.className.localeCompare(b.className)),
  }
}
