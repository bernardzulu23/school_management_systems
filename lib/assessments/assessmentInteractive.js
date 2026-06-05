import {
  buildInteractiveQuizPayload,
  parseInteractiveQuizPayload,
  gradeQuizAttempt,
} from '@/lib/assessments/interactiveQuiz'

export const ASSESSMENT_INTERACTIVE_VERSION = 'assessment_interactive_v1'

export function parseAssessmentInteractive(description) {
  const raw = String(description || '').trim()
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    if (parsed?.version === ASSESSMENT_INTERACTIVE_VERSION) {
      return {
        version: parsed.version,
        questions: Array.isArray(parsed.questions) ? parsed.questions : [],
        publishedAssignmentId: parsed.publishedAssignmentId || null,
        publishedAt: parsed.publishedAt || null,
      }
    }
    const quizPayload = parseInteractiveQuizPayload(raw)
    if (quizPayload?.quiz) {
      return {
        version: ASSESSMENT_INTERACTIVE_VERSION,
        questions: quizPayload.quiz.questions || [],
        publishedAssignmentId: parsed.publishedAssignmentId || null,
        publishedAt: quizPayload.meta?.publishedAt || null,
      }
    }
  } catch {
    return null
  }
  return null
}

export function buildAssessmentInteractiveDescription({
  questions,
  publishedAssignmentId,
  publishedAt,
}) {
  return JSON.stringify({
    version: ASSESSMENT_INTERACTIVE_VERSION,
    questions: Array.isArray(questions) ? questions : [],
    publishedAssignmentId: publishedAssignmentId || null,
    publishedAt: publishedAt || null,
  })
}

export function questionsToQuiz({ title, subject, grade, topic, questions }) {
  const list = Array.isArray(questions) ? questions : []
  return {
    title: title || `${subject} Assessment`,
    subject: subject || 'General',
    grade: grade || 'Form 2',
    topic: topic || title || subject || 'Assessment',
    totalMarks: list.length,
    questions: list.map((q, idx) => ({
      id: String(q.id || `q_${idx + 1}`),
      type: q.type || (Array.isArray(q.options) && q.options.length >= 2 ? 'mcq' : 'short'),
      question: String(q.question || '').trim(),
      options: Array.isArray(q.options) ? q.options : [],
      answer: String(q.answer || '').trim(),
      explanation: String(q.explanation || '').trim(),
      marks: Number.isFinite(Number(q.marks)) ? Number(q.marks) : 1,
    })),
  }
}

export async function publishAssessmentAsAssignment({
  prisma,
  schoolId,
  assessment,
  questions,
  classId,
  className,
  dueDate,
  teacherId,
}) {
  const quiz = questionsToQuiz({
    title: assessment.title,
    subject: assessment.subject,
    topic: assessment.title,
    questions,
  })
  if (!quiz.questions.length) {
    const err = new Error('Add at least one question before publishing')
    err.status = 400
    throw err
  }

  const payload = buildInteractiveQuizPayload(quiz, {
    assessmentId: assessment.id,
    source: 'assessment_management',
  })

  const assignment = await prisma.assignment.create({
    data: {
      title: assessment.title,
      description: JSON.stringify(payload),
      subject: assessment.subject,
      classId: classId || assessment.classId || null,
      class: className || assessment.class,
      dueDate: dueDate || assessment.date || new Date(Date.now() + 7 * 86400000),
      schoolId,
      teacherId: teacherId || null,
      assessmentId: assessment.id,
    },
  })

  await prisma.assessment.update({
    where: { id: assessment.id },
    data: {
      publishedAssignmentId: assignment.id,
      description: buildAssessmentInteractiveDescription({
        questions: quiz.questions,
        publishedAssignmentId: assignment.id,
        publishedAt: new Date().toISOString(),
      }),
    },
  })

  return { assignment, quiz }
}

export { gradeQuizAttempt, parseInteractiveQuizPayload, buildInteractiveQuizPayload }
