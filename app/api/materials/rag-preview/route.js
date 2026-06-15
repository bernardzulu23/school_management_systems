export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import { getSchoolPlanForUsage } from '@/lib/middleware/aiUsageTracker'
import { buildRagContextForQuery } from '@/lib/ai/rag-context'
import { canUseRAG } from '@/lib/features/ragAccess'

/**
 * GET /api/materials/rag-preview?subject=&topic=&gradeLevel=&materialIds=id1,id2
 * Retrieval-only preview (no LLM) for teachers before generating a topic test.
 */
export const GET = withErrorHandler(async function GET(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (!roleCheck(auth.user, ['TEACHER', 'teacher', 'ADMIN', 'headteacher', 'HOD', 'hod'])) {
    throw new ApiError('Forbidden', 403)
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) throw new ApiError('School context required', 400)

  const { searchParams } = new URL(request.url)
  const subject = String(searchParams.get('subject') || '').trim()
  const topic = String(searchParams.get('topic') || '').trim()
  const gradeLevel = String(searchParams.get('gradeLevel') || '').trim() || null
  const materialIdsParam = String(searchParams.get('materialIds') || '').trim()
  const materialIds = materialIdsParam
    ? materialIdsParam
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 5)
    : []

  if (!topic || topic.length < 3) {
    throw new ApiError('Topic is required (min 3 characters)', 400)
  }

  const school = await getSchoolPlanForUsage(schoolId)
  const access = canUseRAG({ plan: school?.plan })
  if (!access.enabled) {
    return NextResponse.json({
      success: true,
      enabled: false,
      message: 'RAG is not enabled on your school plan',
      refs: [],
      chunkCount: 0,
      materialIds: [],
    })
  }

  const query = [subject, gradeLevel, topic, 'quiz assessment'].filter(Boolean).join(' ')
  const rag = await buildRagContextForQuery({
    query,
    schoolId,
    schoolPlan: school?.plan,
    subject: subject || null,
    materialIds: materialIds.length ? materialIds : undefined,
    gradeLevel,
    topK: access.topK,
  })

  return NextResponse.json({
    success: true,
    enabled: rag.enabled,
    skipped: rag.skipped,
    chunkCount: rag.refs?.length || 0,
    refs: rag.refs || [],
    materialIds: rag.materialIds || [],
    hasCoverage: (rag.refs?.length || 0) > 0,
  })
})
