export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getAuthUser, roleCheck } from '@/lib/middleware/auth'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import {
  listCurriculumTopics,
  listCurriculumTopicTree,
  listCurriculumSubtopics,
} from '@/lib/ai/curriculum-context'

/**
 * GET /api/curriculum-topics?subject=&grade=&parentTopic=
 * Curriculum topics for a subject + form/grade (CDC / form1-4 JSON).
 * Used by quiz, topic-test, lesson planner, ECZ builders, etc.
 *
 * When `parentTopic` is set, returns subtopics under that topic only.
 * Otherwise returns parent topics (+ tree) for hierarchical UIs, and a flat
 * `topics` list for single-select dropdowns / validation.
 */
export const GET = withErrorHandler(async function GET(request) {
  const user = await getAuthUser(request)
  if (!user) throw new ApiError('Unauthorized', 401)
  if (
    !roleCheck(user, [
      'TEACHER',
      'teacher',
      'HOD',
      'hod',
      'ADMIN',
      'headteacher',
      'STUDENT',
      'student',
    ])
  ) {
    throw new ApiError('Forbidden', 403)
  }

  const { searchParams } = new URL(request.url)
  const subject = String(searchParams.get('subject') || '').trim()
  const grade = String(
    searchParams.get('grade') || searchParams.get('gradeOrForm') || searchParams.get('form') || ''
  ).trim()
  const parentTopic = String(searchParams.get('parentTopic') || '').trim()

  if (!subject) throw new ApiError('subject is required', 400)
  if (!grade) throw new ApiError('grade (or gradeOrForm / form) is required', 400)

  if (parentTopic) {
    const subtopics = await listCurriculumSubtopics(subject, grade, parentTopic)
    return NextResponse.json({
      success: true,
      data: {
        subject,
        gradeOrForm: grade,
        parentTopic,
        topics: subtopics,
        subtopics,
        tree: [],
      },
    })
  }

  const tree = await listCurriculumTopicTree(subject, grade)
  // Parent titles for hierarchical selects (Chemistry-style). When every node is a
  // leaf (English-style flattened CDC), this is the selectable topic list.
  const parentTopics = tree.map((n) => n.topic).filter(Boolean)
  // Flat union for validation / legacy single-select UIs.
  const topics = await listCurriculumTopics(subject, grade)

  return NextResponse.json({
    success: true,
    data: {
      subject,
      gradeOrForm: grade,
      topics: parentTopics.length ? parentTopics : topics,
      allTopics: topics,
      tree,
    },
  })
})
