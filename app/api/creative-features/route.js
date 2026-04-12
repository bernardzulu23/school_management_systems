import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSchoolIdFromRequest } from '@/lib/utils/getSchoolId'
import { requireRole } from '@/lib/middleware/requireRole'

const ALLOWED_ROLES = ['student', 'teacher', 'HOD', 'hod', 'headteacher']

const ACCESS = {
  interactive_whiteboard: { headteacher: 'partial', hod: 'full', teacher: 'full', student: 'none' },
  ai_story_generator: { headteacher: 'full', hod: 'full', teacher: 'full', student: 'none' },
  virtual_lab: { headteacher: 'none', hod: 'view', teacher: 'full', student: 'full' },
  code_playground: { headteacher: 'none', hod: 'none', teacher: 'partial', student: 'full' },
  music_composer: { headteacher: 'none', hod: 'none', teacher: 'none', student: 'full' },
  '3d_modeler': { headteacher: 'none', hod: 'none', teacher: 'none', student: 'full' },
}

function normalizeRole(value) {
  const r = String(value || '')
    .trim()
    .toLowerCase()
  if (r === 'headteacher') return 'headteacher'
  if (r === 'teacher') return 'teacher'
  if (r === 'student') return 'student'
  if (r === 'hod' || r === 'head of department') return 'hod'
  return r
}

export async function GET(request) {
  const auth = requireRole(request, ALLOWED_ROLES)
  if (!auth.isAuthenticated) return auth.response
  if (auth.denied) return auth.response

  const schoolId = auth.user?.schoolId || (await getSchoolIdFromRequest(request))
  if (!schoolId) return NextResponse.json({ error: 'School context required' }, { status: 400 })

  const role = normalizeRole(auth.user?.role)

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

  const decorated = features
    .map((f) => {
      const access = ACCESS[f.featureId]?.[role] || 'none'
      return {
        ...f,
        access,
      }
    })
    .filter((f) => f.access !== 'none')

  return NextResponse.json({ success: true, data: decorated })
}
