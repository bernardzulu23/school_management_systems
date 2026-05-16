import { NextResponse, type NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSchoolIdFromRequest } from '@/lib/utils/getSchoolId'
import { getAuthUser } from '@/lib/middleware/auth'
import {
  ensureTimetableConfig,
  normalizeWorkingDays,
  parseBreakSlots,
  timeToMin,
  minToTime,
} from '@/lib/timetable/timeSlotsFromConfig'

export async function GET(req: NextRequest) {
  const schoolId = await getSchoolIdFromRequest(req as any)
  if (!schoolId) return NextResponse.json({ error: 'No school' }, { status: 401 })

  const user = await getAuthUser(req as any)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const config = await prisma.timetableConfig.findUnique({ where: { schoolId } })
  return NextResponse.json({ config })
}

export async function POST(req: NextRequest) {
  const schoolId = await getSchoolIdFromRequest(req as any)
  if (!schoolId) return NextResponse.json({ error: 'No school' }, { status: 401 })

  const user = await getAuthUser(req as any)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const role = String(user.role || '').toLowerCase()
  if (!['headteacher', 'administrator', 'admin', 'superadmin'].includes(role)) {
    return NextResponse.json(
      { error: 'Only school administrators can generate the master timetable' },
      { status: 403 }
    )
  }

  const body = await req.json().catch(() => ({}))
  const term = String((body as any)?.term || 'Term 1').trim()
  const academicYear = String((body as any)?.academicYear || new Date().getFullYear()).trim()
  const departments = (body as any)?.departments
  const replaceExisting = (body as any)?.replaceExisting !== false

  const config = await ensureTimetableConfig(prisma, schoolId)

  const allocationWhere: any = {
    schoolId,
    term,
    academicYear,
    status: 'pushed',
    ...(Array.isArray(departments) && departments.length
      ? { hod: { hodProfile: { department: { in: departments } } } }
      : {}),
  }

  const allocations = await prisma.teacherAllocation.findMany({
    where: allocationWhere,
    include: {
      teacher: { select: { id: true, name: true } },
      subject: { select: { id: true, name: true, code: true } },
      class: { select: { id: true, name: true } },
      hod: { select: { hodProfile: { select: { department: true } } } },
    },
  })

  if (allocations.length === 0) {
    return NextResponse.json(
      {
        error: `No pushed allocations found for ${term} ${academicYear}. Ask HODs to push their department allocations first.`,
      },
      { status: 400 }
    )
  }

  const breakSlots = parseBreakSlots((config as any).breakSlots)
  const workingDays = normalizeWorkingDays((config as any).workingDays)
  const singleMin = Number((config as any).singleDuration || 40)

  const daySlots = buildDaySlots(
    String((config as any).startTime),
    String((config as any).endTime),
    singleMin,
    breakSlots,
    workingDays
  )

  const { entries, conflicts } = generateTimetable(allocations as any[], daySlots, singleMin)

  if (conflicts.length > 0 && entries.length === 0) {
    return NextResponse.json(
      { error: 'Could not generate a conflict-free timetable. Too many constraints.', conflicts },
      { status: 422 }
    )
  }

  await prisma.$transaction(async (tx) => {
    if (replaceExisting) {
      await tx.timetableAllocationEntry.deleteMany({
        where: { schoolId, term, academicYear, status: 'draft' },
      })
    }

    await tx.timetableAllocationEntry.createMany({
      data: entries.map((e: any) => ({
        schoolId,
        allocationId: e.allocationId,
        teacherId: e.teacherId,
        subjectId: e.subjectId,
        classId: e.classId,
        dayOfWeek: e.dayOfWeek,
        startTime: e.startTime,
        endTime: e.endTime,
        durationMin: e.durationMin,
        periodType: e.periodType,
        periodNumber: e.periodNumber,
        term,
        academicYear,
        status: 'draft',
      })),
      skipDuplicates: true,
    })
  })

  const saved = await prisma.timetableAllocationEntry.findMany({
    where: { schoolId, term, academicYear, status: 'draft' },
    include: {
      allocation: {
        include: {
          teacher: { select: { id: true, name: true } },
          subject: { select: { id: true, name: true, code: true } },
          class: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: [{ dayOfWeek: 'asc' }, { periodNumber: 'asc' }],
  })

  return NextResponse.json({
    success: true,
    generated: saved.length,
    conflicts: conflicts.length > 0 ? conflicts : [],
    entries: saved,
    summary: {
      days: workingDays.length,
      allocationsScheduled: [...new Set(saved.map((e: any) => e.allocationId))].length,
      totalAllocations: allocations.length,
      teachers: [...new Set(saved.map((e: any) => e.teacherId))].length,
      classes: [...new Set(saved.map((e: any) => e.classId))].length,
    },
  })
}

function buildDaySlots(
  startTime: string,
  endTime: string,
  singleMin: number,
  breakSlots: any[],
  workingDays: string[]
) {
  const startMin = timeToMin(startTime)
  const endMin = timeToMin(endTime)

  const breaks = (breakSlots || []).map((b: any) => ({
    start: timeToMin(String(b.start)),
    end: timeToMin(String(b.end)),
    label: b.label,
    isLunch: Boolean(b.isLunch),
  }))

  const daySlots: Record<string, any[]> = {}
  for (const day of workingDays) {
    const slots: any[] = []
    let cursor = startMin
    let periodNum = 1

    while (cursor < endMin) {
      const inBreak = breaks.find((b: any) => cursor >= b.start && cursor < b.end)
      if (inBreak) {
        slots.push({
          type: 'break',
          label: inBreak.label,
          start: inBreak.start,
          end: inBreak.end,
          isLunch: inBreak.isLunch,
        })
        cursor = inBreak.end
        continue
      }

      const nextBreak = breaks.find((b: any) => b.start > cursor)
      const ceilMin = nextBreak ? Math.min(endMin, nextBreak.start) : endMin

      if (cursor + singleMin <= ceilMin) {
        slots.push({
          type: 'period',
          periodNumber: periodNum,
          start: cursor,
          end: cursor + singleMin,
          startTime: minToTime(cursor),
          endTime: minToTime(cursor + singleMin),
          durationMin: singleMin,
          day,
        })
        cursor += singleMin
        periodNum++
      } else {
        cursor = nextBreak ? nextBreak.start : endMin
      }
    }

    daySlots[day] = slots
  }

  return daySlots
}

function generateTimetable(allocations: any[], daySlots: Record<string, any[]>, singleMin: number) {
  const entries: any[] = []
  const conflicts: any[] = []

  const teacherBusy = new Map<string, boolean>()
  const classBusy = new Map<string, boolean>()

  const busyKey = (id: string, day: string, start: number) => `${id}|${day}|${start}`

  function isTeacherBusy(teacherId: string, day: string, startMin: number, durationMin: number) {
    for (let t = startMin; t < startMin + durationMin; t += singleMin) {
      if (teacherBusy.has(busyKey(teacherId, day, t))) return true
    }
    return false
  }

  function isClassBusy(classId: string, day: string, startMin: number, durationMin: number) {
    for (let t = startMin; t < startMin + durationMin; t += singleMin) {
      if (classBusy.has(busyKey(classId, day, t))) return true
    }
    return false
  }

  function markBusy(
    teacherId: string,
    classId: string,
    day: string,
    startMin: number,
    durationMin: number
  ) {
    for (let t = startMin; t < startMin + durationMin; t += singleMin) {
      teacherBusy.set(busyKey(teacherId, day, t), true)
      classBusy.set(busyKey(classId, day, t), true)
    }
  }

  function tryPlace(allocation: any, periodType: string, durationMin: number) {
    const days = Object.keys(daySlots).sort(() => Math.random() - 0.5)

    for (const day of days) {
      const slots = daySlots[day].filter((s: any) => s.type === 'period')

      for (let i = 0; i <= slots.length - Math.ceil(durationMin / singleMin); i++) {
        const slot = slots[i]
        const startMin = slot.start
        const endMin = startMin + durationMin

        const blocksNeeded = durationMin / singleMin
        let consecutive = true
        for (let b = 0; b < blocksNeeded; b++) {
          if (!slots[i + b] || slots[i + b].start !== startMin + b * singleMin) {
            consecutive = false
            break
          }
        }
        if (!consecutive) continue

        if (
          !isTeacherBusy(String(allocation.teacherId), day, startMin, durationMin) &&
          !isClassBusy(String(allocation.classId), day, startMin, durationMin)
        ) {
          markBusy(
            String(allocation.teacherId),
            String(allocation.classId),
            day,
            startMin,
            durationMin
          )
          return {
            allocationId: allocation.id,
            teacherId: allocation.teacherId,
            subjectId: allocation.subjectId,
            classId: allocation.classId,
            dayOfWeek: day,
            startTime: minToTime(startMin),
            endTime: minToTime(endMin),
            durationMin,
            periodType,
            periodNumber: slot.periodNumber,
          }
        }
      }
    }
    return null
  }

  const sorted = [...allocations].sort((a, b) => {
    const priority = (x: any) =>
      (x.triplePeriods || 0) > 0 ? 3 : (x.doublePeriods || 0) > 0 ? 2 : 1
    return priority(b) - priority(a)
  })

  for (const allocation of sorted) {
    const DOUBLE = singleMin * 2
    const TRIPLE = singleMin * 3

    let placed = 0

    for (let t = 0; t < Number(allocation.triplePeriods || 0); t++) {
      const entry = tryPlace(allocation, 'TRIPLE', TRIPLE)
      if (entry) {
        entries.push(entry)
        placed += 3
      } else {
        conflicts.push({
          allocationId: allocation.id,
          type: 'TRIPLE',
          message: `Could not place triple for ${allocation.teacher?.name} — ${allocation.subject?.name} (${allocation.class?.name})`,
        })
      }
    }

    for (let d = 0; d < Number(allocation.doublePeriods || 0); d++) {
      const entry = tryPlace(allocation, 'DOUBLE', DOUBLE)
      if (entry) {
        entries.push(entry)
        placed += 2
      } else {
        conflicts.push({
          allocationId: allocation.id,
          type: 'DOUBLE',
          message: `Could not place double for ${allocation.teacher?.name} — ${allocation.subject?.name} (${allocation.class?.name})`,
        })
      }
    }

    for (let s = 0; s < Number(allocation.singlePeriods || 0); s++) {
      const entry = tryPlace(allocation, 'SINGLE', singleMin)
      if (entry) {
        entries.push(entry)
        placed += 1
      } else {
        conflicts.push({
          allocationId: allocation.id,
          type: 'SINGLE',
          message: `Could not place single for ${allocation.teacher?.name} — ${allocation.subject?.name} (${allocation.class?.name})`,
        })
      }
    }

    if (allocation.blockType !== 'MIXED' && placed === 0) {
      const durMap: Record<string, number> = { SINGLE: singleMin, DOUBLE, TRIPLE }
      const count: Record<string, number> = {
        SINGLE: Number(allocation.periodsPerWeek || 0),
        DOUBLE: Number(allocation.periodsPerWeek || 0) / 2,
        TRIPLE: Number(allocation.periodsPerWeek || 0) / 3,
      }
      const dur = durMap[String(allocation.blockType)] || singleMin
      const n = Math.floor(
        count[String(allocation.blockType)] || Number(allocation.periodsPerWeek || 0)
      )
      for (let i = 0; i < n; i++) {
        const entry = tryPlace(allocation, String(allocation.blockType), dur)
        if (entry) entries.push(entry)
        else {
          conflicts.push({
            allocationId: allocation.id,
            type: allocation.blockType,
            message: `Could not schedule ${allocation.subject?.name} for ${allocation.class?.name}`,
          })
        }
      }
    }
  }

  return { entries, conflicts }
}
