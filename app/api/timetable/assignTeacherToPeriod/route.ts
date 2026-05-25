import { NextResponse, type NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'

export const dynamic = 'force-dynamic'

type Body = {
  teacherId?: string
  timeSlotId?: string
  action?: 'assign' | 'unassign'
  lockForGeneration?: boolean
  notes?: string
}

export async function POST(req: NextRequest) {
  const auth = await authMiddleware(req as any)
  if (!auth.isAuthenticated) return auth.response
  if (!roleCheck(auth.user, ['ADMIN', 'HOD'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const tenant = await resolveAuthenticatedSchoolId(req as any, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) {
    return NextResponse.json({ error: 'Missing school context' }, { status: 400 })
  }

  const body = (await req.json().catch(() => ({}))) as Body
  const teacherId = String(body.teacherId || '').trim()
  const timeSlotId = String(body.timeSlotId || '').trim()
  const action = body.action || 'assign'

  if (!teacherId || !timeSlotId) {
    return NextResponse.json(
      { error: 'Missing required fields: teacherId, timeSlotId' },
      { status: 400 }
    )
  }

  if (action === 'unassign') {
    await prisma.teacherPeriodAssignment.deleteMany({
      where: { schoolId, teacherId, timeSlotId },
    })
    return NextResponse.json({ success: true, message: 'Teacher removed from period' })
  }

  const lockedForGeneration = body.lockForGeneration !== false
  const notes = body.notes ? String(body.notes) : null
  const createdBy = auth.user?.id ? String(auth.user.id) : null

  const assignment = await prisma.teacherPeriodAssignment.upsert({
    where: {
      schoolId_teacherId_timeSlotId: {
        schoolId,
        teacherId,
        timeSlotId,
      },
    },
    update: {
      lockedForGeneration,
      notes,
      createdBy,
    },
    create: {
      schoolId,
      teacherId,
      timeSlotId,
      lockedForGeneration,
      notes,
      createdBy,
    },
    include: {
      teacher: { include: { user: { select: { name: true } } } },
      timeSlot: true,
    },
  })

  return NextResponse.json({
    success: true,
    assignment,
    message: `Teacher assigned to period ${assignment.timeSlot.period}`,
  })
}
