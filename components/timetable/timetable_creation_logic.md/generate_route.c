// app/api/timetable/generate/route.js
// Core timetable generation engine — fully DB-driven, no hardcoded data
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSchoolIdFromRequest } from '@/lib/utils/getSchoolId'
import { getAuthUser } from '@/lib/middleware/auth'

// GET — fetch timetable config
export async function GET(req) {
  const schoolId = await getSchoolIdFromRequest(req)
  if (!schoolId) return NextResponse.json({ error: 'No school' }, { status: 401 })

  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const config = await prisma.timetableConfig.findUnique({ where: { schoolId } })
  return NextResponse.json({ config })
}

// POST — generate timetable from pushed allocations
export async function POST(req) {
  const schoolId = await getSchoolIdFromRequest(req)
  if (!schoolId) return NextResponse.json({ error: 'No school' }, { status: 401 })

  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const role = user.role?.toLowerCase()
  if (!['headteacher', 'administrator', 'admin'].includes(role)) {
    return NextResponse.json({ error: 'Headteacher only' }, { status: 403 })
  }

  const { term, academicYear, departments, replaceExisting = true } = await req.json()

  // 1. Load timetable config (breaks, times, working days)
  const config = await prisma.timetableConfig.findUnique({ where: { schoolId } })
  if (!config) {
    return NextResponse.json({
      error: 'No timetable configuration found. Please set up school hours and breaks first.'
    }, { status: 400 })
  }

  // 2. Load all pushed allocations for the selected departments/term
  const allocationWhere = {
    schoolId, term, academicYear, status: 'pushed',
    ...(departments?.length ? { hod: { hodProfile: { department: { in: departments } } } } : {})
  }

  const allocations = await prisma.teacherAllocation.findMany({
    where: allocationWhere,
    include: {
      teacher: { select: { id: true, name: true } },
      subject: { select: { id: true, name: true, code: true } },
      class: { select: { id: true, name: true, year: true } },
      hod: { select: { hodProfile: { select: { department: true } } } }
    }
  })

  if (allocations.length === 0) {
    return NextResponse.json({
      error: `No pushed allocations found for ${term} ${academicYear}. Ask HODs to push their department allocations first.`
    }, { status: 400 })
  }

  // 3. Build the schedule skeleton from config
  const breakSlots = Array.isArray(config.breakSlots) ? config.breakSlots : JSON.parse(config.breakSlots || '[]')
  const workingDays = config.workingDays || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
  const SINGLE_MIN = config.singleDuration || 40
  const DOUBLE_MIN = SINGLE_MIN * 2   // always 80
  const TRIPLE_MIN = SINGLE_MIN * 3   // always 120

  // Build period slots for each day
  const daySlots = buildDaySlots(config.startTime, config.endTime, SINGLE_MIN, breakSlots, workingDays)

  // 4. Run constraint-based scheduling algorithm
  const { entries, conflicts } = generateTimetable(allocations, daySlots, SINGLE_MIN)

  if (conflicts.length > 0 && entries.length === 0) {
    return NextResponse.json({
      error: 'Could not generate a conflict-free timetable. Too many constraints.',
      conflicts
    }, { status: 422 })
  }

  // 5. Save to database
  await prisma.$transaction(async (tx) => {
    if (replaceExisting) {
      // Remove old draft entries for this term
      await tx.timetableEntry.deleteMany({
        where: { schoolId, term, academicYear, status: 'draft' }
      })
    }

    // Bulk create new entries
    await tx.timetableEntry.createMany({
      data: entries.map(e => ({
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
        status: 'draft'
      })),
      skipDuplicates: true
    })
  })

  // Return the generated schedule with full data
  const saved = await prisma.timetableEntry.findMany({
    where: { schoolId, term, academicYear, status: 'draft' },
    include: {
      allocation: {
        include: {
          teacher: { select: { id: true, name: true } },
          subject: { select: { id: true, name: true, code: true } },
          class: { select: { id: true, name: true, year: true } },
        }
      }
    },
    orderBy: [{ dayOfWeek: 'asc' }, { periodNumber: 'asc' }]
  })

  return NextResponse.json({
    success: true,
    generated: saved.length,
    conflicts: conflicts.length > 0 ? conflicts : [],
    entries: saved,
    summary: {
      days: workingDays.length,
      allocationsScheduled: [...new Set(saved.map(e => e.allocationId))].length,
      totalAllocations: allocations.length,
      teachers: [...new Set(saved.map(e => e.teacherId))].length,
      classes: [...new Set(saved.map(e => e.classId))].length,
    }
  })
}

// ── SCHEDULING ALGORITHM ─────────────────────────────────────────

function timeToMin(t) {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

function minToTime(min) {
  const h = Math.floor(min / 60)
  const m = min % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function buildDaySlots(startTime, endTime, singleMin, breakSlots, workingDays) {
  const startMin = timeToMin(startTime)
  const endMin = timeToMin(endTime)

  // Build a map of break intervals
  const breaks = breakSlots.map(b => ({
    start: timeToMin(b.start),
    end: timeToMin(b.end),
    label: b.label,
    isLunch: b.isLunch || false
  }))

  // Generate single-period slots for each day
  const daySlots = {}
  for (const day of workingDays) {
    const slots = []
    let cursor = startMin
    let periodNum = 1

    while (cursor < endMin) {
      // Check if cursor hits a break
      const inBreak = breaks.find(b => cursor >= b.start && cursor < b.end)
      if (inBreak) {
        slots.push({
          type: 'break',
          label: inBreak.label,
          start: inBreak.start,
          end: inBreak.end,
          isLunch: inBreak.isLunch
        })
        cursor = inBreak.end
        continue
      }

      // Check if next period fits before end or next break
      const nextBreak = breaks.find(b => b.start > cursor)
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
          day
        })
        cursor += singleMin
        periodNum++
      } else {
        // Gap smaller than one period — skip to break or end
        cursor = nextBreak ? nextBreak.start : endMin
      }
    }

    daySlots[day] = slots
  }

  return daySlots
}

function generateTimetable(allocations, daySlots, singleMin) {
  const entries = []
  const conflicts = []

  // Track occupancy: teacherId+day+startTime → true (teacher busy)
  const teacherBusy = new Map()
  // Track class occupancy: classId+day+startTime → true
  const classBusy = new Map()

  const busyKey = (id, day, start) => `${id}|${day}|${start}`

  function isTeacherBusy(teacherId, day, startMin, durationMin) {
    for (let t = startMin; t < startMin + durationMin; t += singleMin) {
      if (teacherBusy.has(busyKey(teacherId, day, t))) return true
    }
    return false
  }

  function isClassBusy(classId, day, startMin, durationMin) {
    for (let t = startMin; t < startMin + durationMin; t += singleMin) {
      if (classBusy.has(busyKey(classId, day, t))) return true
    }
    return false
  }

  function markBusy(teacherId, classId, day, startMin, durationMin) {
    for (let t = startMin; t < startMin + durationMin; t += singleMin) {
      teacherBusy.set(busyKey(teacherId, day, t), true)
      classBusy.set(busyKey(classId, day, t), true)
    }
  }

  function tryPlace(allocation, periodType, durationMin) {
    // Shuffle days to spread load
    const days = Object.keys(daySlots).sort(() => Math.random() - 0.5)

    for (const day of days) {
      const slots = daySlots[day].filter(s => s.type === 'period')

      for (let i = 0; i <= slots.length - Math.ceil(durationMin / singleMin); i++) {
        const slot = slots[i]
        const startMin = slot.start
        const endMin = startMin + durationMin

        // Check consecutive slots exist (for doubles/triples)
        const blocksNeeded = durationMin / singleMin
        let consecutive = true
        for (let b = 0; b < blocksNeeded; b++) {
          if (!slots[i + b] || slots[i + b].start !== startMin + b * singleMin) {
            consecutive = false
            break
          }
        }
        if (!consecutive) continue

        if (!isTeacherBusy(allocation.teacherId, day, startMin, durationMin) &&
            !isClassBusy(allocation.classId, day, startMin, durationMin)) {

          markBusy(allocation.teacherId, allocation.classId, day, startMin, durationMin)
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
    return null // Could not place
  }

  // Sort allocations: triples first, then doubles, then singles (harder to place = first)
  const sorted = [...allocations].sort((a, b) => {
    const priority = (x) => x.triplePeriods > 0 ? 3 : x.doublePeriods > 0 ? 2 : 1
    return priority(b) - priority(a)
  })

  for (const allocation of sorted) {
    const DOUBLE = singleMin * 2
    const TRIPLE = singleMin * 3

    let placed = 0

    // Place triples
    for (let t = 0; t < allocation.triplePeriods; t++) {
      const entry = tryPlace(allocation, 'TRIPLE', TRIPLE)
      if (entry) { entries.push(entry); placed += 3 }
      else conflicts.push({ allocationId: allocation.id, type: 'TRIPLE', message: `Could not place triple for ${allocation.teacher?.name} — ${allocation.subject?.name} (${allocation.class?.name})` })
    }

    // Place doubles
    for (let d = 0; d < allocation.doublePeriods; d++) {
      const entry = tryPlace(allocation, 'DOUBLE', DOUBLE)
      if (entry) { entries.push(entry); placed += 2 }
      else conflicts.push({ allocationId: allocation.id, type: 'DOUBLE', message: `Could not place double for ${allocation.teacher?.name} — ${allocation.subject?.name} (${allocation.class?.name})` })
    }

    // Place singles
    for (let s = 0; s < allocation.singlePeriods; s++) {
      const entry = tryPlace(allocation, 'SINGLE', singleMin)
      if (entry) { entries.push(entry); placed += 1 }
      else conflicts.push({ allocationId: allocation.id, type: 'SINGLE', message: `Could not place single for ${allocation.teacher?.name} — ${allocation.subject?.name} (${allocation.class?.name})` })
    }

    // For SINGLE/DOUBLE/TRIPLE block types (non-MIXED)
    if (allocation.blockType !== 'MIXED' && placed === 0) {
      const durMap = { SINGLE: singleMin, DOUBLE: DOUBLE, TRIPLE: TRIPLE }
      const count = { SINGLE: allocation.periodsPerWeek, DOUBLE: allocation.periodsPerWeek / 2, TRIPLE: allocation.periodsPerWeek / 3 }
      const dur = durMap[allocation.blockType] || singleMin
      const n = Math.floor(count[allocation.blockType] || allocation.periodsPerWeek)
      for (let i = 0; i < n; i++) {
        const entry = tryPlace(allocation, allocation.blockType, dur)
        if (entry) entries.push(entry)
        else conflicts.push({ allocationId: allocation.id, type: allocation.blockType, message: `Could not schedule ${allocation.subject?.name} for ${allocation.class?.name}` })
      }
    }
  }

  return { entries, conflicts }
}