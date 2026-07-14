/**
 * List bell-schedule TimeSlot rows for the school.
 */
import { NextResponse, type NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { guardSchoolOnlyTimetable } from '@/lib/timetable/guardSchoolOnly'
import { withErrorHandler } from '@/lib/middleware/errorHandler'

export const dynamic = 'force-dynamic'

const SLOT_LIST_LIMIT = 500

function dayNumber(day: string) {
  const d = String(day || '').toLowerCase()
  if (d === 'monday') return 1
  if (d === 'tuesday') return 2
  if (d === 'wednesday') return 3
  if (d === 'thursday') return 4
  if (d === 'friday') return 5
  return 0
}

export const GET = withErrorHandler(async function GET(req: NextRequest) {
  const auth = await authMiddleware(req as any)
  if (!auth.isAuthenticated) return auth.response
  if (!roleCheck(auth.user, ['ADMIN', 'HOD'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const tenant = await resolveAuthenticatedSchoolId(req as any, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) return NextResponse.json({ error: 'Missing school context' }, { status: 400 })

  const typeCheck = await guardSchoolOnlyTimetable(schoolId)
  if (!typeCheck.allowed) return typeCheck.response

  try {
    const slots = await prisma.timeSlot.findMany({
      where: { schoolId },
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
      orderBy: [{ dayOfWeek: 'asc' }, { period: 'asc' }],
      take: SLOT_LIST_LIMIT,
    })

    return NextResponse.json({
      success: true,
      data: slots.map((s: any) => ({
        ...s,
        dayOfWeekNumber: dayNumber(s.dayOfWeek),
      })),
    })
  } catch (error: any) {
    const raw = String(error?.message || '')
    const isMissingTable = raw.includes('P2021') || raw.toLowerCase().includes('does not exist')
    if (isMissingTable) {
      return NextResponse.json(
        { error: 'Timetable time slots are missing. Run database migrations first.' },
        { status: 503 }
      )
    }
    throw error
  }
})
