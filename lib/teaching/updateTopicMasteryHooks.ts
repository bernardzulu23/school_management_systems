/**
 * Integration hooks: Quiz / Flashcard / Class-test → TopicMastery
 *
 * Adapts Teaching Studio mastery updates to the real ZSMS schema:
 * - Unique: schoolId + classId + topicName
 * - Fields: assessmentCount, lastAssessedAt (not assessmentsCount / lastAssessmentDate)
 * - Teacher id on TopicMastery is User.id (not Class.teacherId Teacher profile)
 * - StudentFlashcardDeck has no topic column — topic is parsed from title
 * - Result has no topic / classId — class tests use subject name as topic proxy
 */
import { prisma } from '@/lib/prisma'
import { recordTopicMasteryFromQuiz } from '@/lib/teaching/recordTopicMasteryFromQuiz'
import {
  parseTermNumber,
  recalculateTeacherPerformanceSummary,
} from '@/lib/teaching/performanceSummary'

function currentTermAndYear() {
  const now = new Date()
  const academicYear = now.getFullYear()
  const month = now.getMonth()
  const term = month < 5 ? 1 : month < 9 ? 2 : 3
  return { term, academicYear }
}

/** Parse topic from flashcard deck title (`Subject — Topic`) or fall back to subject. */
export function topicFromFlashcardDeck(deck: {
  title?: string | null
  subjectName?: string | null
}): string {
  const title = String(deck?.title || '').trim()
  const subject = String(deck?.subjectName || '').trim()
  const sep = ' — '
  if (title.includes(sep)) {
    const after = title.split(sep).slice(1).join(sep).trim()
    // Ignore date-only suffixes like "2026-07-11"
    if (after && !/^\d{4}-\d{2}-\d{2}/.test(after)) return after.slice(0, 200)
  }
  return (subject || 'Flashcards').slice(0, 200)
}

/**
 * Resolve User.id for the teacher of a class (optionally by subject).
 * Prefers TeacherAllocation, then Class form teacher → Teacher.userId.
 */
export async function resolveTeacherUserIdForClass(
  schoolId: string,
  classId: string,
  subjectName?: string | null
): Promise<string | null> {
  if (!schoolId || !classId) return null

  if (subjectName) {
    const alloc = await prisma.teacherAllocation.findFirst({
      where: {
        schoolId,
        classId,
        subject: { name: { equals: String(subjectName).trim(), mode: 'insensitive' } },
      },
      orderBy: { updatedAt: 'desc' },
      select: { teacherId: true },
    })
    if (alloc?.teacherId) return alloc.teacherId
  }

  const cls = await prisma.class.findFirst({
    where: { id: classId, schoolId },
    select: { teacher: { select: { userId: true } } },
  })
  return cls?.teacher?.userId || null
}

async function classStudentCount(schoolId: string, classId: string): Promise<number> {
  return prisma.student.count({ where: { schoolId, classId } })
}

/**
 * Assignment.teacherId is often Teacher.id (profile), while TopicMastery.teacherId is User.id.
 * Accept either and always return User.id.
 */
export async function resolveToTeacherUserId(
  schoolId: string,
  maybeTeacherOrUserId: string | null | undefined
): Promise<string | null> {
  const id = String(maybeTeacherOrUserId || '').trim()
  if (!schoolId || !id) return null

  const teacher = await prisma.teacher.findFirst({
    where: {
      schoolId,
      OR: [{ id }, { userId: id }],
    },
    select: { userId: true },
  })
  if (teacher?.userId) return teacher.userId

  const user = await prisma.user.findFirst({
    where: { id, schoolId },
    select: { id: true },
  })
  return user?.id || null
}

/**
 * HOOK: AssignmentSubmission (interactive quiz) graded / submitted.
 * Uses Assignment.classId, Assessment.topic; resolves teacher to User.id.
 */
export async function onQuizSubmitted(opts: {
  schoolId: string
  assignmentSubmissionId: string
  grade: number
}): Promise<unknown> {
  const { schoolId, assignmentSubmissionId, grade } = opts
  if (!schoolId || !assignmentSubmissionId) return null

  try {
    const submission = await prisma.assignmentSubmission.findFirst({
      where: { id: assignmentSubmissionId, schoolId },
      include: {
        assignment: {
          include: {
            assessment: {
              select: { topic: true, subject: true, createdByUserId: true },
            },
          },
        },
      },
    })

    const assignment = submission?.assignment
    if (!assignment?.classId) return null

    const teacherUserId =
      (await resolveToTeacherUserId(schoolId, assignment.teacherId)) ||
      (await resolveToTeacherUserId(schoolId, assignment.assessment?.createdByUserId)) ||
      (await resolveTeacherUserIdForClass(
        schoolId,
        assignment.classId,
        assignment.assessment?.subject || assignment.subject
      ))
    if (!teacherUserId) return null

    const topicName =
      assignment.assessment?.topic || assignment.subject || assignment.title || 'Quiz'

    const studentCount = await classStudentCount(schoolId, assignment.classId)

    return await recordTopicMasteryFromQuiz({
      schoolId,
      teacherUserId,
      classId: assignment.classId,
      topicName,
      score: grade,
      studentCount,
    })
  } catch (error) {
    console.warn('[teaching] onQuizSubmitted skipped:', (error as Error)?.message || error)
    return null
  }
}

/**
 * HOOK: Student flashcard deck session completed.
 * Topic from deck title; class from Student.classId.
 */
export async function onFlashcardDeckCompleted(opts: {
  schoolId: string
  deckId: string
  studentId: string
  correctCount: number
  totalCount: number
  percent?: number
}): Promise<unknown> {
  const { schoolId, deckId, studentId, correctCount, totalCount, percent } = opts
  if (!schoolId || !deckId || !studentId) return null

  try {
    const deck = await prisma.studentFlashcardDeck.findFirst({
      where: { id: deckId, schoolId, studentId },
    })
    if (!deck) return null

    const student = await prisma.student.findFirst({
      where: { id: studentId, schoolId },
      select: { classId: true },
    })
    if (!student?.classId) return null

    const topicName = topicFromFlashcardDeck(deck)
    const teacherId = await resolveTeacherUserIdForClass(
      schoolId,
      student.classId,
      deck.subjectName
    )
    if (!teacherId) return null

    const total = Math.max(1, Number(totalCount) || 1)
    const score =
      percent != null && Number.isFinite(Number(percent))
        ? Number(percent)
        : (Number(correctCount) / total) * 100

    const studentCount = await classStudentCount(schoolId, student.classId)

    return await recordTopicMasteryFromQuiz({
      schoolId,
      teacherUserId: teacherId,
      classId: student.classId,
      topicName,
      score,
      studentCount,
    })
  } catch (error) {
    console.warn('[teaching] onFlashcardDeckCompleted skipped:', (error as Error)?.message || error)
    return null
  }
}

/**
 * HOOK: Formal Result recorded (best for CLASS_TEST).
 * Result has no topic field — uses subject name as topicName.
 * EOT/MIDTERM are subject-level; still recorded when resultType is CLASS_TEST,
 * or when callers pass force=true.
 */
export async function onTestResultRecorded(opts: {
  schoolId: string
  classId: string
  subjectName: string
  score: number
  teacherUserId?: string | null
  resultType?: string | null
  force?: boolean
}): Promise<unknown> {
  const { schoolId, classId, subjectName, score, teacherUserId, resultType, force } = opts
  if (!schoolId || !classId || !subjectName) return null

  const type = String(resultType || '').toUpperCase()
  if (!force && type && type !== 'CLASS_TEST') return null

  try {
    const teacherId =
      teacherUserId || (await resolveTeacherUserIdForClass(schoolId, classId, subjectName))
    if (!teacherId) return null

    const studentCount = await classStudentCount(schoolId, classId)

    return await recordTopicMasteryFromQuiz({
      schoolId,
      teacherUserId: teacherId,
      classId,
      topicName: String(subjectName).trim().slice(0, 200),
      score,
      studentCount,
    })
  } catch (error) {
    console.warn('[teaching] onTestResultRecorded skipped:', (error as Error)?.message || error)
    return null
  }
}

/** Alias matching the integration guide name. */
export async function updateTeacherPerformanceSummary(opts: {
  schoolId: string
  teacherId: string
  term?: number | string
  academicYear?: number
}) {
  const { term: defaultTerm, academicYear: defaultYear } = currentTermAndYear()
  return recalculateTeacherPerformanceSummary({
    schoolId: opts.schoolId,
    teacherId: opts.teacherId,
    term: parseTermNumber(opts.term ?? defaultTerm),
    academicYear: opts.academicYear || defaultYear,
  })
}
