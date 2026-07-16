import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { withErrorHandler } from '@/lib/middleware/errorHandler'
import { safeQueryString } from '@/lib/security/safeQueryValue'
import { gradeToPoints } from '@/lib/gradingSystem'
import { getResultTypeLabel, RESULT_TYPES } from '@/lib/results/resultTypes'
import { canAccessSecondaryGrading } from '@/lib/subjects/resolveSubjectCatalog'

export const dynamic = 'force-dynamic'

const ALLOWED_TIME_RANGES = new Set(['week', 'month', 'term', 'year'])

export const GET = withErrorHandler(async function GET(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (!roleCheck(auth.user, ['STUDENT', 'student'])) {
    return NextResponse.json(
      { error: 'This request was blocked for security reasons.' },
      { status: 403 }
    )
  }

  const searchParams = request.nextUrl.searchParams
  const timeRangeRaw = safeQueryString(searchParams.get('timeRange'), { defaultValue: 'term' })
  const timeRange = ALLOWED_TIME_RANGES.has(timeRangeRaw) ? timeRangeRaw : 'term'

  const now = new Date()
  let startDate = new Date()

  switch (timeRange) {
    case 'week':
      startDate.setDate(now.getDate() - 7)
      break
    case 'month':
      startDate.setMonth(now.getMonth() - 1)
      break
    case 'term':
      startDate.setMonth(now.getMonth() - 3)
      break
    case 'year':
      startDate.setFullYear(now.getFullYear() - 1)
      break
    default:
      startDate.setMonth(now.getMonth() - 3)
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) {
    return NextResponse.json({ error: 'School context required' }, { status: 400 })
  }

  const student = await prisma.student.findFirst({
    where: { userId: auth.user.id, schoolId },
    include: {
      user: true,
      gamificationProfile: {
        include: {
          badges: {
            include: { badge: true },
            orderBy: { awardedAt: 'desc' },
          },
        },
      },
    },
  })

  if (!student) {
    return NextResponse.json({ error: 'Student profile not found' }, { status: 404 })
  }

  const schoolMeta = await prisma.school.findUnique({
    where: { id: schoolId },
    select: { level: true },
  })
  const showSecondaryGrading = canAccessSecondaryGrading({
    schoolLevel: schoolMeta?.level,
    gradeLevel: student.class,
  })

  // Gamification: read the real profile, badges and games-played count so the
  // dashboard widgets reflect what is stored in the database.
  const gamification = student.gamificationProfile || null
  const earnedBadges = Array.isArray(gamification?.badges) ? gamification.badges : []
  const gamesPlayedCount = await prisma.studentGame.count({
    where: { schoolId, studentId: student.id },
  })
  const achievementsList = earnedBadges.map((sb) => ({
    id: sb.badge?.id || sb.badgeId,
    name: sb.badge?.name || 'Badge',
    description: sb.badge?.description || '',
    icon: sb.badge?.icon || null,
    rarity: sb.badge?.rarity || 'common',
    awardedAt: sb.awardedAt,
  }))

  const enrollments = await prisma.pupilSubjectEnrollment.findMany({
    where: { schoolId, pupilId: student.id },
    include: {
      subject: {
        include: {
          teacher: { include: { user: true } },
        },
      },
    },
  })

  const enrolledSubjectNames = enrollments
    .map((e) => e?.subject?.name)
    .filter(Boolean)
    .map(String)

  const selectedSubjectNames = Array.isArray(student.selected_subjects)
    ? student.selected_subjects.map(String).filter(Boolean)
    : []

  const subjectNames = Array.from(new Set([...enrolledSubjectNames, ...selectedSubjectNames]))

  const hasAnySubjects = subjectNames.length > 0
  const shouldInferFromAssignments = !hasAnySubjects && (student.classId || student.class)

  const inferredAssignments = shouldInferFromAssignments
    ? await prisma.teachingAssignment.findMany({
        where: {
          schoolId,
          ...(student.classId ? { classId: student.classId } : {}),
          ...(student.class && !student.classId
            ? { class: { name: { equals: String(student.class).trim(), mode: 'insensitive' } } }
            : {}),
        },
        include: {
          subject: { include: { teacher: { include: { user: true } } } },
          teacher: { include: { user: true } },
        },
      })
    : []

  if (shouldInferFromAssignments && inferredAssignments.length > 0) {
    inferredAssignments.forEach((a) => {
      if (a?.subject?.name) subjectNames.push(String(a.subject.name))
    })
  }

  const allResults = showSecondaryGrading
    ? await prisma.result.findMany({
        where: { schoolId, studentId: student.id },
        include: { subject: { include: { teacher: { include: { user: true } } } } },
        orderBy: { createdAt: 'desc' },
        take: 200,
      })
    : []

  const endOfTermResults = showSecondaryGrading
    ? allResults.filter(
        (r) => String(r.resultType || RESULT_TYPES.END_OF_TERM) === RESULT_TYPES.END_OF_TERM
      )
    : []

  const normalize = (value) =>
    String(value || '')
      .trim()
      .toLowerCase()
  const isEnglish = (name) => normalize(name).includes('english')
  const isMath = (name) => {
    const n = normalize(name)
    return n.includes('mathematics') || n.includes('math')
  }
  const isScience = (name) => {
    const n = normalize(name)
    return (
      n.includes('biology') ||
      n.includes('chemistry') ||
      n.includes('physics') ||
      n.includes('integrated science') ||
      (n.includes('science') && !n.includes('social'))
    )
  }

  const subjectAgg = new Map()
  if (showSecondaryGrading) {
    for (const r of endOfTermResults) {
      const subjectId = String(r.subjectId || '')
      if (!subjectId) continue
      const subjectName = r.subject?.name || 'Unknown'
      if (!subjectAgg.has(subjectId)) {
        subjectAgg.set(subjectId, {
          subjectId,
          subjectName,
          scores: [],
          latestScore: null,
          latestGrade: null,
        })
      }
      const entry = subjectAgg.get(subjectId)
      entry.scores.push(Number(r.score || 0))
      if (entry.latestScore === null) {
        entry.latestScore = Number(r.score || 0)
        entry.latestGrade = r.grade ?? null
      }
    }
  }

  const subjectAverages = Array.from(subjectAgg.values())
    .map((s) => ({
      subjectId: s.subjectId,
      subjectName: s.subjectName,
      avg: s.scores.length ? s.scores.reduce((a, b) => a + b, 0) / s.scores.length : 0,
      latestScore: s.latestScore,
      latestGrade: s.latestGrade,
      points: gradeToPoints(s.latestGrade),
    }))
    .sort((a, b) => b.avg - a.avg)

  const english = subjectAverages.find((s) => isEnglish(s.subjectName)) || null
  const math = subjectAverages.find((s) => isMath(s.subjectName)) || null
  const sciences = subjectAverages.filter((s) => isScience(s.subjectName)).slice(0, 3)

  const pickedIds = new Set(
    [english?.subjectId, math?.subjectId, ...sciences.map((s) => s.subjectId)]
      .filter(Boolean)
      .map(String)
  )

  const others = subjectAverages.filter((s) => !pickedIds.has(String(s.subjectId)))

  const bestSix = []
  ;[english, math, ...sciences, ...others].forEach((s) => {
    if (!s) return
    const id = String(s.subjectId)
    if (bestSix.length >= 6) return
    if (bestSix.some((x) => String(x.subjectId) === id)) return
    bestSix.push(s)
  })

  const withPoints = bestSix.map((s) => ({
    ...s,
    points: gradeToPoints(s.latestGrade),
  }))

  const hasFail = withPoints.some((s) => {
    const g = String(s?.latestGrade || '')
      .trim()
      .toUpperCase()
    return g === '9' || g === 'F' || g === 'FAIL'
  })
  const bestSixPoints = hasFail
    ? 'FAIL'
    : withPoints.reduce((sum, s) => sum + (Number(s.points) || 0), 0)

  // 1. Calculate Stats
  const totalSubjects = subjectNames.length
  const totalResults = endOfTermResults.length

  // Calculate Average Grade
  let averageGrade = 0
  if (totalResults > 0) {
    const totalScore = endOfTermResults.reduce((acc, curr) => acc + (curr.score || 0), 0)
    averageGrade = totalScore / totalResults
  }

  // 2. Fetch Class Info
  let myClass = null
  if (student.classId) {
    myClass = await prisma.class.findFirst({
      where: { schoolId, id: student.classId },
    })
  } else if (student.class) {
    myClass = await prisma.class.findFirst({
      where: { schoolId, name: student.class },
    })
  }

  // 3. Fetch Upcoming Assessments (scoped by schoolId)
  const upcomingAssessmentsRaw = await prisma.assessment.findMany({
    where: {
      schoolId,
      ...(student.classId ? { classId: student.classId } : { class: student.class }),
      subject: { in: subjectNames },
      date: { gte: new Date() },
    },
    orderBy: { date: 'asc' },
    take: 5,
  })

  const upcomingAssessments = upcomingAssessmentsRaw.map((a) => ({
    ...a,
    start_date: a.date,
  }))

  // 4. Fetch Recent Results (with filtering)
  const recentResults = allResults.slice(0, 10).map((r) => ({
    id: r.id,
    subject: r.subject?.name || 'Unknown',
    subjectId: r.subjectId,
    score: r.score,
    grade: r.grade,
    term: r.term,
    year: r.year,
    resultType: r.resultType || RESULT_TYPES.END_OF_TERM,
    result_type_label: getResultTypeLabel(r.resultType),
    comments: r.comments,
    date: r.updatedAt || r.createdAt,
  }))

  // 5. Fetch Assignments and calculate statuses (scoped by schoolId)
  const rawAssignments = await prisma.assignment.findMany({
    where: {
      schoolId,
      ...(student.classId ? { classId: student.classId } : { class: student.class }),
      subject: { in: subjectNames },
    },
    include: {
      submissions: {
        where: { studentId: student.id },
      },
    },
    orderBy: { dueDate: 'asc' },
  })

  // Process assignments to determine status
  const assignmentsList = rawAssignments.map((assignment) => {
    const submission = assignment.submissions[0]
    let status = 'pending'

    const dueDate = new Date(assignment.dueDate)
    const isPastDue = dueDate < now

    if (submission) {
      const submittedAt = new Date(submission.submittedAt)
      if (submission.status === 'late' || submittedAt > dueDate) {
        status = 'late'
      } else {
        status = 'completed'
      }
    } else if (isPastDue) {
      status = 'missing'
    }

    return {
      id: assignment.id,
      title: assignment.title,
      subject: assignment.subject,
      dueDate: assignment.dueDate,
      createdAt: assignment.createdAt,
      status: status,
      grade: submission?.grade,
      feedback: submission?.feedback,
    }
  })

  // 6. Fetch Attendance
  const attendanceRecords = await prisma.attendance.findMany({
    where: {
      schoolId,
      studentId: student.id,
      date: { gte: startDate },
    },
    orderBy: { date: 'desc' },
  })

  // 7. Calculate Attendance Percentage
  let attendancePercentage = 100
  if (attendanceRecords.length > 0) {
    const presentCount = attendanceRecords.filter((r) => r.status === 'present').length
    attendancePercentage = (presentCount / attendanceRecords.length) * 100
  }

  // 8. Construct Enrolled Subjects & Performance Data
  // We need to map student.selected_subjects to rich objects
  // Since we store subjects as strings in selected_subjects, we try to find Subject records if they exist, or mock defaults

  let enrollmentsForSubjects = enrollments.filter((e) => e?.subject?.name)
  if (enrollmentsForSubjects.length === 0 && selectedSubjectNames.length > 0) {
    const selectedSubjects = await prisma.subject.findMany({
      where: { schoolId, name: { in: selectedSubjectNames } },
      include: { teacher: { include: { user: true } } },
    })
    enrollmentsForSubjects = selectedSubjects.map((s) => ({ subject: s }))
  }
  if (enrollmentsForSubjects.length === 0 && inferredAssignments.length > 0) {
    const subjectById = new Map()
    inferredAssignments.forEach((a) => {
      if (a?.subject?.id) subjectById.set(String(a.subject.id), a.subject)
    })
    enrollmentsForSubjects = Array.from(subjectById.values()).map((s) => ({ subject: s }))
  }

  const enrolledSubjects = enrollmentsForSubjects
    .filter((e) => e?.subject?.name)
    .map((e) => {
      const subjectName = String(e.subject.name)
      const subjectId = e.subject.id
      const teacherName = e.subject?.teacher?.user?.name || 'Not Assigned'

      const subjectResults = allResults.filter(
        (r) => r.subjectId === subjectId || r.subject?.name === subjectName
      )
      let currentGrade = 0
      if (subjectResults.length > 0) {
        currentGrade =
          subjectResults.reduce((acc, curr) => acc + (curr.score || 0), 0) / subjectResults.length
      }

      let status = 'good'
      if (subjectResults.length === 0) status = 'no-data'
      else if (currentGrade >= 80) status = 'excellent'
      else if (currentGrade < 50) status = 'needs-improvement'

      const nextAssessment =
        upcomingAssessmentsRaw.find((a) => String(a.subject || '') === subjectName)?.date || null

      return {
        id: subjectId,
        name: subjectName,
        teacher: teacherName,
        status,
        trend: 'stable',
        currentGrade: Math.round(currentGrade),
        assignments: rawAssignments.filter((a) => a.subject === subjectName).length,
        completedAssignments: assignmentsList.filter(
          (a) => a.subject === subjectName && a.status === 'completed'
        ).length,
        attendance: Math.round(attendancePercentage),
        nextAssessment,
      }
    })

  // Subject Performance (for the "My Subjects" card)
  const subjectPerformance = enrolledSubjects.map((sub) => ({
    subject: sub.name,
    teacher: sub.teacher,
    avgScore: sub.currentGrade,
    assessments: rawAssignments.filter((a) => a.subject === sub.name).length,
    latestGrade:
      sub.currentGrade >= 75
        ? 'A'
        : sub.currentGrade >= 60
          ? 'B'
          : sub.currentGrade >= 50
            ? 'C'
            : 'F',
  }))

  // Construct Dashboard Data Response
  const dashboardData = {
    stats: {
      totalSubjects: totalSubjects,
      totalResults: totalResults,
      averageGrade: Math.round(averageGrade),
      completedGoals: 0, // Placeholder
      totalGoals: 0, // Placeholder
      recentMaterials: 0, // Placeholder
      gamesPlayed: gamesPlayedCount,
      achievements: achievementsList.length,
      level: gamification?.level || 1,
      xp: gamification?.xp || 0,
      nextLevelXp: gamification?.nextLevelXp || 100,
      gamificationPoints: gamification?.points || 0,
      points: bestSixPoints,
      attendanceRate: `${Math.round(attendancePercentage)}%`,
      bestSixSubjects: bestSix.map((s) => ({
        subjectId: s.subjectId,
        subject: s.subjectName,
        averageScore: Math.round(Number(s.avg) || 0),
        points: gradeToPoints(s.latestGrade),
      })),
    },
    student: {
      id: student.id,
      name: student.name,
      class: student.class,
      exam_number: student.exam_number,
      average_grade: Math.round(averageGrade),
      attendance_percentage: Math.round(attendancePercentage),
      total_subjects: subjectNames.length,
      assignments_pending: assignmentsList.filter((a) => a.status === 'pending').length,
      assignments_list: assignmentsList,
      attendance_records: attendanceRecords,
      gamification: student.gamificationProfile,
      subjects: subjectNames,
      emergency_contact: {
        name: student.emergency_contact_name || null,
        relationship: student.emergency_contact_relationship || null,
        phone: student.emergency_contact_phone || null,
        address: student.emergency_contact_address || null,
      },
    },
    enrolled_subjects: enrolledSubjects,
    subject_performance: subjectPerformance,
    upcoming_assessments: upcomingAssessments,
    recent_results: recentResults,
    class_info: myClass,
    achievements_list: achievementsList,
  }

  return NextResponse.json({ data: dashboardData })
})
