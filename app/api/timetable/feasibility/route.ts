import { NextResponse, type NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { resolveSchoolId } from '@/lib/utils/resolveSchoolId'
import { getAuthUser } from '@/lib/middleware/auth'
import { guardSchoolOnlyTimetable } from '@/lib/timetable/guardSchoolOnly'
import { ensureTimetableConfig } from '@/lib/timetable/timeSlotsFromConfig'
import { buildDaySlotsFromTimetableConfig } from '@/lib/timetable/buildDaySlotsFromConfig'
import {
  mapPreflightBlockingToConflicts,
  runPreflightFeasibility,
} from '@/lib/timetable/preflightFeasibility'
import { normalizePushedAllocations } from '@/lib/timetable/normalizePushedAllocations'
import { loadLockedSlotReservations } from '@/lib/timetable/loadGenerationContext'
import { withErrorHandler } from '@/lib/middleware/errorHandler'
import { safeQueryString } from '@/lib/security/safeQueryValue'

const ALLOWED_ROLES = new Set(['headteacher', 'administrator', 'admin', 'superadmin', 'hod'])
const ALLOCATION_FEASIBILITY_LIMIT = 500

/**
 * GET /api/timetable/feasibility?term=Term+1&academicYear=2026
 * Pre-generation capacity check — teacher/class load vs bell schedule.
 */
export const GET = withErrorHandler(async function GET(req: NextRequest) {
  const user = await getAuthUser(req as any)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const role = String(user.role || '').toLowerCase()
  if (!ALLOWED_ROLES.has(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const schoolId = await resolveSchoolId(req as any, user)
  if (!schoolId) return NextResponse.json({ error: 'No school' }, { status: 401 })

  const typeCheck = await guardSchoolOnlyTimetable(schoolId)
  if (!typeCheck.allowed) return typeCheck.response

  const { searchParams } = new URL(req.url)
  const term = safeQueryString(searchParams.get('term'), { defaultValue: 'Term 1' })
  const academicYear = safeQueryString(searchParams.get('academicYear'), {
    defaultValue: String(new Date().getFullYear()),
  })

  const [config, allocations, lockedSlots] = await Promise.all([
    ensureTimetableConfig(prisma, schoolId),
    prisma.teacherAllocation.findMany({
      where: { schoolId, term, academicYear, status: 'pushed' },
      include: {
        teacher: { select: { id: true, name: true } },
        subject: { select: { id: true, name: true } },
        class: { select: { id: true, name: true } },
      },
      take: ALLOCATION_FEASIBILITY_LIMIT,
    }),
    loadLockedSlotReservations(prisma, schoolId),
  ])

  if (!allocations.length) {
    return NextResponse.json({
      ok: true,
      term,
      academicYear,
      allocationCount: 0,
      teachingSlotsPerWeek: 0,
      workingDays: 0,
      periodsPerDay: 0,
      warnings: [],
      feasibilityErrors: [],
      message: 'No pushed allocations for this term yet.',
    })
  }

  const normalizedAllocations = await normalizePushedAllocations(prisma, schoolId, allocations)
  const daySlots = buildDaySlotsFromTimetableConfig(config as any)
  const singleMin = Math.max(1, Number((config as any).singleDuration) || 40)

  const preflight = runPreflightFeasibility({
    allocations: normalizedAllocations as any[],
    daySlots,
    lockedSlots,
    singleMin,
  })

  const teachingSlots = Object.values(daySlots).reduce(
    (sum, slots) => sum + (slots || []).filter((s) => s.type === 'period').length,
    0
  )
  const workingDays = Object.keys(daySlots).length
  const periodsPerDay =
    workingDays > 0
      ? (daySlots[Object.keys(daySlots)[0]] || []).filter((s) => s.type === 'period').length
      : 0

  const feasibilityErrors = mapPreflightBlockingToConflicts(preflight.blocking)

  return NextResponse.json({
    ok: preflight.ok,
    term,
    academicYear,
    allocationCount: allocations.length,
    teachingSlotsPerWeek: teachingSlots,
    workingDays,
    periodsPerDay,
    warnings: preflight.warnings.map((w) => w.message),
    feasibilityErrors,
    infeasibility: preflight.infeasibility,
    byCode: preflight.blocking.reduce<Record<string, number>>((acc, b) => {
      acc[b.code] = (acc[b.code] || 0) + 1
      return acc
    }, {}),
  })
})
