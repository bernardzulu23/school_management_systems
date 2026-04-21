import { NextResponse, type NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { getSchoolIdFromRequest } from '@/lib/utils/getSchoolId'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function dayNumber(day: string) {
  const d = String(day || '').toLowerCase()
  if (d === 'monday') return 1
  if (d === 'tuesday') return 2
  if (d === 'wednesday') return 3
  if (d === 'thursday') return 4
  if (d === 'friday') return 5
  return 0
}

export async function GET(req: NextRequest) {
  try {
    const auth = authMiddleware(req as any)
    if (!auth.isAuthenticated) return auth.response
    if (!roleCheck(auth.user, ['ADMIN', 'HOD'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const schoolId = auth.user?.schoolId || (await getSchoolIdFromRequest(req as any))
    if (!schoolId) return NextResponse.json({ error: 'Missing school context' }, { status: 400 })

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
    return NextResponse.json(
      {
        error: 'Failed to load time slots',
        ...(process.env.NODE_ENV === 'development' ? { details: raw } : {}),
      },
      { status: 500 }
    )
  }
}
