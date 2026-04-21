import { NextResponse, type NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { getSchoolIdFromRequest } from '@/lib/utils/getSchoolId'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  try {
    const auth = authMiddleware(req as any)
    if (!auth.isAuthenticated) return auth.response
    if (!roleCheck(auth.user, ['ADMIN', 'HOD'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const schoolId = auth.user?.schoolId || (await getSchoolIdFromRequest(req as any))
    if (!schoolId) return NextResponse.json({ error: 'Missing school context' }, { status: 400 })

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
