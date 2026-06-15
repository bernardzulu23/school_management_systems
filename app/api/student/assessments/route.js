export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getTenantClient } from '@/lib/prisma/tenantClient'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { parseInteractiveQuizPayload } from '@/lib/assessments/interactiveQuiz'

export async function GET(request) {
  try {
    const auth = await authMiddleware(request)
    if (!auth.isAuthenticated) return auth.response

    if (!roleCheck(auth.user, ['STUDENT', 'student'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
    if (!tenant.ok) return tenant.response
    const schoolId = tenant.schoolId
    if (!schoolId) return NextResponse.json({ error: 'School context required' }, { status: 400 })
    const db = getTenantClient(schoolId)

    const student = await db.student.findFirst({
      where: { schoolId, userId: auth.user.id },
      select: { id: true, classId: true, class: true, selected_subjects: true },
    })

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    // Fetch Upcoming Assessments
    const upcoming = await db.assessment.findMany({
      where: {
        schoolId,
        ...(student.classId ? { classId: student.classId } : { class: student.class }),
        ...(Array.isArray(student.selected_subjects) && student.selected_subjects.length > 0
          ? { subject: { in: student.selected_subjects } }
          : {}),
        date: { gte: new Date() },
      },
      orderBy: { date: 'asc' },
      take: 50,
    })

    const assignments = await db.assignment.findMany({
      where: {
        schoolId,
        ...(student.classId ? { classId: student.classId } : { class: student.class }),
        ...(Array.isArray(student.selected_subjects) && student.selected_subjects.length > 0
          ? { subject: { in: student.selected_subjects } }
          : {}),
        OR: [{ assessmentId: null }, { assessment: { status: 'PUBLISHED' } }],
      },
      include: {
        assessment: {
          select: {
            status: true,
            topic: true,
            aiAnalysis: true,
          },
        },
      },
      orderBy: { dueDate: 'asc' },
      take: 100,
    })

    const submissions = await db.assignmentSubmission.findMany({
      where: {
        schoolId,
        studentId: student.id,
        assignmentId: { in: assignments.map((a) => a.id) },
      },
      orderBy: { submittedAt: 'desc' },
      take: 200,
    })
    const submissionByAssignmentId = new Map(submissions.map((s) => [s.assignmentId, s]))

    const materialTitleCache = new Map()
    async function resolvePreparationMaterials(assignment) {
      const fromMeta = assignment?.description
        ? (() => {
            try {
              const p = JSON.parse(assignment.description)
              return Array.isArray(p?.meta?.sourceMaterials) ? p.meta.sourceMaterials : []
            } catch {
              return []
            }
          })()
        : []
      if (fromMeta.length) return fromMeta

      const ai = assignment?.assessment?.aiAnalysis
      const ids = ai && Array.isArray(ai.materialIds) ? ai.materialIds : []
      if (!ids.length) {
        if (Array.isArray(ai?.sourceMaterialTitles) && ai.sourceMaterialTitles.length) {
          return ai.sourceMaterialTitles
        }
        return []
      }
      const missing = ids.filter((id) => !materialTitleCache.has(id))
      if (missing.length) {
        const rows = await db.schoolMaterial.findMany({
          where: { schoolId, id: { in: missing } },
          select: { id: true, title: true },
        })
        for (const row of rows) materialTitleCache.set(row.id, row.title)
      }
      return ids.map((id) => materialTitleCache.get(id)).filter(Boolean)
    }

    const interactiveAssignments = (
      await Promise.all(
        assignments.map(async (a) => {
          const payload = parseInteractiveQuizPayload(a.description)
          if (!payload?.quiz) return null
          const questionCount = Array.isArray(payload.quiz.questions)
            ? payload.quiz.questions.length
            : 0
          const totalMarks =
            Number.isFinite(Number(payload.quiz.totalMarks)) && Number(payload.quiz.totalMarks) > 0
              ? Number(payload.quiz.totalMarks)
              : questionCount
          const submission = submissionByAssignmentId.get(a.id)
          const prepMaterials = await resolvePreparationMaterials(a)
          const quizTopic =
            payload.quiz.topic ||
            a.assessment?.topic ||
            payload.meta?.topic ||
            a.subject ||
            'Quiz practice'
          return {
            assignmentId: a.id,
            id: `assignment_${a.id}`,
            title: a.title,
            subject: a.subject,
            type: 'Quiz',
            date: a.dueDate,
            time: new Date(a.dueDate).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            }),
            duration: `${Number(payload.quiz.durationMinutes || 30)} mins`,
            totalMarks,
            status: submission ? 'completed' : 'scheduled',
            topics: [String(quizTopic)],
            preparationMaterials: prepMaterials.length
              ? prepMaterials
              : ['Review your class notes'],
            daysLeft: Math.max(
              0,
              Math.ceil((new Date(a.dueDate).getTime() - Date.now()) / (24 * 60 * 60 * 1000))
            ),
            myScore: Number(submission?.grade || 0),
            percentage: Number(submission?.grade || 0),
            grade: submission?.grade != null ? `${Math.round(Number(submission.grade))}%` : null,
            rank: null,
            feedback: submission?.feedback || null,
          }
        })
      )
    ).filter(Boolean)

    const results = await db.result.findMany({
      where: {
        schoolId,
        studentId: student.id,
      },
      include: { subject: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    })

    const upcomingMaterialIds = upcoming
      .flatMap((a) => {
        const ai = a.aiAnalysis
        return ai && Array.isArray(ai.materialIds) ? ai.materialIds : []
      })
      .filter(Boolean)
    if (upcomingMaterialIds.length) {
      const rows = await db.schoolMaterial.findMany({
        where: { schoolId, id: { in: [...new Set(upcomingMaterialIds)] } },
        select: { id: true, title: true },
      })
      for (const row of rows) materialTitleCache.set(row.id, row.title)
    }

    const baseUpcoming = upcoming.map((a) => {
      const ai = a.aiAnalysis && typeof a.aiAnalysis === 'object' ? a.aiAnalysis : {}
      const prepFromAi = Array.isArray(ai.sourceMaterialTitles)
        ? ai.sourceMaterialTitles
        : (Array.isArray(ai.materialIds) ? ai.materialIds : [])
            .map((id) => materialTitleCache.get(id))
            .filter(Boolean)
      return {
        id: a.id,
        title: a.title,
        subject: a.subject,
        type: String(a.type || '').toLowerCase() === 'quiz' ? 'Quiz' : 'Test',
        date: a.date,
        time: new Date(a.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        duration: `${a.duration_minutes} mins`,
        duration_minutes: a.duration_minutes,
        totalMarks: 100,
        status: 'scheduled',
        topics: [a.topic || a.subject],
        preparationMaterials: prepFromAi.length ? prepFromAi : ['Review your class notes'],
        daysLeft: Math.max(
          0,
          Math.ceil((new Date(a.date).getTime() - Date.now()) / (24 * 60 * 60 * 1000))
        ),
        classId: a.classId || null,
        class: a.class,
      }
    })

    const baseCompleted = results.map((r) => ({
      id: r.id,
      subjectId: r.subjectId,
      subject: r.subject?.name || '',
      score: r.score,
      myScore: r.score,
      totalMarks: 100,
      percentage: Math.round(Number(r.score || 0)),
      grade: r.grade,
      rank: null,
      feedback: null,
      term: r.term,
      year: r.year,
      date: r.updatedAt || r.createdAt,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      type: 'Test',
      title: `${r.subject?.name || 'Assessment'} - ${r.term} ${r.year}`,
      status: 'completed',
      time: '-',
      duration: '-',
    }))

    return NextResponse.json({
      success: true,
      data: {
        upcoming: [
          ...interactiveAssignments.filter((a) => a.status !== 'completed'),
          ...baseUpcoming,
        ],
        completed: [
          ...interactiveAssignments.filter((a) => a.status === 'completed'),
          ...baseCompleted,
        ],
      },
    })
  } catch (error) {
    console.error('Fetch student assessments error:', error)
    return NextResponse.json({ error: 'Failed to fetch assessments' }, { status: 500 })
  }
}
