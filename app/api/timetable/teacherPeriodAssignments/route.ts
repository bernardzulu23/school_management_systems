import { NextResponse, type NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { guardSchoolOnlyTimetable } from '@/lib/timetable/guardSchoolOnly'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const auth = await authMiddleware(req as any)
    if (!auth.isAuthenticated) return auth.response
    if (!roleCheck(auth.user, ['ADMIN', 'HOD', 'headteacher', 'administrator'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const tenant = await resolveAuthenticatedSchoolId(req as any, auth.user)
    if (!tenant.ok) return tenant.response
    const schoolId = tenant.schoolId
    if (!schoolId) return NextResponse.json({ error: 'Missing school context' }, { status: 400 })

    const typeCheck = await guardSchoolOnlyTimetable(schoolId)
    if (!typeCheck.allowed) return typeCheck.response

    const assignments = await prisma.teacherPeriodAssignment.findMany({
      where: { schoolId },
      select: {
        id: true,
        teacherId: true,
        timeSlotId: true,
        lockedForGeneration: true,
        notes: true,
        createdBy: true,
        createdAt: true,
        updatedAt: true,
        teacher: { select: { id: true, user: { select: { name: true } } } },
        timeSlot: {
          select: {
            id: true,
            dayOfWeek: true,
            period: true,
            startTime: true,
            endTime: true,
            isBreak: true,
            label: true,
            breakName: true,
            breakDuration: true,
          },
        },
      },
      orderBy: [{ timeSlot: { dayOfWeek: 'asc' } }, { timeSlot: { period: 'asc' } }],
    })

    return NextResponse.json({ success: true, data: assignments })
  } catch (error: any) {
    const raw = String(error?.message || '')
    const isMissingTable = raw.includes('P2021') || raw.toLowerCase().includes('does not exist')
    if (isMissingTable) {
      return NextResponse.json(
        { error: 'Timetable period assignments are missing. Run database migrations first.' },
        { status: 503 }
      )
    }
    return NextResponse.json(
      {
        error: 'Failed to load teacher period assignments',
        ...(process.env.NODE_ENV === 'development' ? { details: raw } : {}),
      },
      { status: 500 }
    )
  }
}
