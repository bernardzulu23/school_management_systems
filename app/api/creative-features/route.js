export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { getAuthUser } from '@/lib/middleware/auth'

const ADMIN_ROLES = new Set(['headteacher', 'administrator', 'admin', 'superadmin'])

const ROUTE_BY_FEATURE_ID = {
  interactive_whiteboard: '/dashboard/teacher/whiteboard',
  ai_story_generator: '/dashboard/teacher/story-weaver',
  music_composer: '/dashboard/student/music',
  virtual_lab: '/dashboard/student/virtual-lab',
  code_playground: '/dashboard/student/code-playground',
  '3d_modeler': '/dashboard/student/3d-shapes',
  ai_lesson_planner: '/dashboard/teacher/lesson-planner',
  ai_quiz_maker: '/dashboard/teacher/quiz-maker',
  ai_report_comments: '/dashboard/teacher/report-comments',
  ecz_practice: '/dashboard/student/ecz-practice',
}

function normalizeRole(value) {
  const r = String(value || '')
    .trim()
    .toLowerCase()
  if (r === 'hod' || r === 'head of department') return 'hod'
  return r
}

export async function GET(request) {
  const user = await getAuthUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const tenant = await resolveAuthenticatedSchoolId(request, user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) return NextResponse.json({ error: 'No school' }, { status: 401 })

  const userRole = normalizeRole(user.role)

  const features = await prisma.creativeFeature.findMany({
    where: { schoolId },
    orderBy: [{ category: 'asc' }, { createdAt: 'asc' }],
    select: {
      featureId: true,
      name: true,
      description: true,
      category: true,
      roles: true,
      difficulty: true,
      estimatedTime: true,
      iconName: true,
    },
  })

  const accessible = features.filter((f) => {
    if (ADMIN_ROLES.has(userRole)) return true
    return Array.isArray(f.roles) && f.roles.some((r) => normalizeRole(r) === userRole)
  })

  const enriched = accessible.map((f) => ({
    ...f,
    route: ROUTE_BY_FEATURE_ID[f.featureId] || null,
  }))

  const creative = enriched.filter((f) => f.category === 'creative')
  const stem = enriched.filter((f) => f.category === 'stem')
  const featured = enriched.slice(0, 4)

  return NextResponse.json({
    stats: {
      creativeTools: creative.length,
      stemFeatures: stem.length,
      availableFeatures: enriched.length,
    },
    featured,
    creative,
    stem,
    all: enriched,
  })
}
