/**
 * Cross-term timetable rollover: copy class/subject/teacher structure into a new draft.
 * Remaps clocks onto the school's current TimetableConfig bell schedule (Prompt A),
 * remaps allocationIds to the target term's TeacherAllocation rows, then rescans conflicts.
 */

import { rescanAndPersistDraftMeta } from '@/lib/timetable/conflictAudit'
import { interpretTimetableExcludeError } from '@/lib/timetable/excludeConstraintError'
import { remapEntriesToValidAllocationIds } from '@/lib/timetable/resolveTimetableEntryAllocationIds'
import { buildDaySlotsFromTimetableConfig } from '@/lib/timetable/buildDaySlotsFromConfig'
import {
  ensureTimetableConfig,
  normalizeTimetableConfig,
  normalizeWorkingDays,
  timeToMin,
} from '@/lib/timetable/timeSlotsFromConfig'
import { TIMETABLE_TERMS } from '@/lib/timetable/timetableTermOptions'

const ENTRY_SELECT = {
  schoolId: true,
  allocationId: true,
  teacherId: true,
  subjectId: true,
  classId: true,
  classroomId: true,
  dayOfWeek: true,
  startTime: true,
  endTime: true,
  durationMin: true,
  periodType: true,
  periodNumber: true,
  term: true,
  academicYear: true,
  status: true,
}

/**
 * Term 2 → Term 1 same year; Term 1 → Term 3 of previous year; Term 3 → Term 2 same year.
 * @param {string} term
 * @param {string|number} academicYear
 */
export function resolvePreviousSeason(term, academicYear) {
  const year = Number(academicYear) || new Date().getFullYear()
  const t = String(term || '').trim()
  const idx = TIMETABLE_TERMS.indexOf(t)
  if (idx > 0) {
    return { term: TIMETABLE_TERMS[idx - 1], academicYear: String(year) }
  }
  if (t === 'Term 1' || idx === 0) {
    return { term: 'Term 3', academicYear: String(year - 1) }
  }
  // Unknown term label — try Term 1 same year as a soft default
  return { term: 'Term 1', academicYear: String(year) }
}

function normalizeDay(day) {
  const s = String(day || '').trim()
  if (!s) return ''
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()
}

function periodSpanForEntry(e) {
  const pt = String(e?.periodType || '').toUpperCase()
  if (pt.includes('TRIPLE')) return 3
  if (pt.includes('DOUBLE')) return 2
  const duration = Number(e?.durationMin) || 0
  const single = 40
  if (duration >= single * 2.5) return 3
  if (duration >= single * 1.5) return 2
  return 1
}

/**
 * Build periodNumber → teachable slot index from current school config.
 * @param {object} normalizedConfig
 */
export function buildTeachableBellIndex(normalizedConfig) {
  const daySlots = buildDaySlotsFromTimetableConfig(normalizedConfig)
  const workingDays = normalizeWorkingDays(normalizedConfig.workingDays)
  const firstDay = workingDays[0] || 'Monday'
  const slots = (daySlots[firstDay] || []).filter((s) => s && s.type === 'period')
  /** @type {Map<number, { startTime: string, endTime: string, durationMin: number, index: number }>} */
  const byPeriod = new Map()
  slots.forEach((s, index) => {
    const p = Number(s.periodNumber) || index + 1
    if (!byPeriod.has(p)) {
      byPeriod.set(p, {
        startTime: s.startTime,
        endTime: s.endTime,
        durationMin: s.durationMin,
        index,
      })
    }
  })
  return { byPeriod, slots, workingDays, daySlots }
}

/**
 * Remap entry clocks to current bell by periodNumber. Entries whose period no longer
 * exists keep original times and are listed in `unmapped` for audit / UI.
 *
 * @param {Array<object>} entries
 * @param {ReturnType<typeof buildTeachableBellIndex>} bell
 */
export function remapEntriesToCurrentBell(entries, bell) {
  const remapped = []
  const unmapped = []
  const droppedDays = []

  for (const e of entries || []) {
    const day = normalizeDay(e.dayOfWeek)
    if (bell.workingDays.length && !bell.workingDays.includes(day)) {
      droppedDays.push(e)
      continue
    }

    const period = Number(e.periodNumber) || 0
    const startInfo = bell.byPeriod.get(period)
    if (!startInfo) {
      unmapped.push(e)
      remapped.push({ ...e, dayOfWeek: day || e.dayOfWeek })
      continue
    }

    const span = periodSpanForEntry(e)
    const endIdx = Math.min(startInfo.index + span - 1, bell.slots.length - 1)
    const endSlot = bell.slots[endIdx] || bell.slots[startInfo.index]
    const startTime = startInfo.startTime
    const endTime = endSlot.endTime
    const wall = Math.max(1, timeToMin(endTime) - timeToMin(startTime))

    remapped.push({
      ...e,
      dayOfWeek: day || e.dayOfWeek,
      startTime,
      endTime,
      durationMin: wall,
      periodNumber: period,
    })
  }

  return { entries: remapped, unmapped, droppedDays }
}

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {{
 *   schoolId: string
 *   sourceTerm: string
 *   sourceAcademicYear: string
 *   targetTerm: string
 *   targetAcademicYear: string
 *   sourceStatus?: 'published'|'draft'|'auto'
 * }} opts
 */
export async function copyTimetableFromPreviousTerm(prisma, opts) {
  const schoolId = opts.schoolId
  const sourceTerm = String(opts.sourceTerm || '').trim()
  const sourceAcademicYear = String(opts.sourceAcademicYear || '').trim()
  const targetTerm = String(opts.targetTerm || '').trim()
  const targetAcademicYear = String(opts.targetAcademicYear || '').trim()
  const sourceStatus = opts.sourceStatus || 'auto'

  if (!schoolId || !sourceTerm || !sourceAcademicYear || !targetTerm || !targetAcademicYear) {
    return {
      success: false,
      code: 'INVALID_INPUT',
      created: 0,
      message: 'sourceTerm, sourceAcademicYear, targetTerm, and targetAcademicYear are required.',
    }
  }

  if (sourceTerm === targetTerm && sourceAcademicYear === targetAcademicYear) {
    return {
      success: false,
      code: 'SAME_SEASON',
      created: 0,
      message:
        'Source and target term/year must differ. Use clone-published-to-draft for same-term edits.',
    }
  }

  const draftCount = await prisma.timetableAllocationEntry.count({
    where: { schoolId, term: targetTerm, academicYear: targetAcademicYear, status: 'draft' },
  })
  if (draftCount > 0) {
    return {
      success: true,
      created: 0,
      alreadyExists: true,
      message: 'Draft timetable already exists for the target term.',
    }
  }

  const publishedCount = await prisma.timetableAllocationEntry.count({
    where: {
      schoolId,
      term: targetTerm,
      academicYear: targetAcademicYear,
      status: 'published',
    },
  })
  if (publishedCount > 0) {
    return {
      success: false,
      code: 'TARGET_HAS_PUBLISHED',
      created: 0,
      message:
        'Target term already has a published timetable. Clone it to draft to edit, or clear it before copying.',
    }
  }

  async function loadSource(status) {
    return prisma.timetableAllocationEntry.findMany({
      where: { schoolId, term: sourceTerm, academicYear: sourceAcademicYear, status },
      select: ENTRY_SELECT,
      orderBy: [{ dayOfWeek: 'asc' }, { periodNumber: 'asc' }],
    })
  }

  let source = []
  let usedStatus = sourceStatus
  if (sourceStatus === 'auto') {
    source = await loadSource('published')
    usedStatus = 'published'
    if (!source.length) {
      source = await loadSource('draft')
      usedStatus = 'draft'
    }
  } else {
    source = await loadSource(sourceStatus)
  }

  if (!source.length) {
    return {
      success: false,
      code: 'NO_SOURCE',
      created: 0,
      message: `No ${usedStatus} timetable found for ${sourceTerm} ${sourceAcademicYear}.`,
    }
  }

  const cfg = await ensureTimetableConfig(prisma, schoolId)
  const normalized = normalizeTimetableConfig(cfg)
  const bell = buildTeachableBellIndex(normalized)
  const { entries: bellMapped, unmapped, droppedDays } = remapEntriesToCurrentBell(source, bell)

  const { entries: remapped, invalid } = await remapEntriesToValidAllocationIds(
    prisma,
    schoolId,
    bellMapped,
    targetTerm,
    targetAcademicYear
  )

  if (!remapped.length) {
    return {
      success: false,
      code: 'NO_TARGET_ALLOCATIONS',
      created: 0,
      skippedNoAllocation: invalid.length,
      message:
        'None of the source periods match TeacherAllocations for the target term. Push/approve HOD allocations for the new term first, then copy again.',
    }
  }

  const data = remapped.map((e) => ({
    schoolId,
    allocationId: e.allocationId,
    teacherId: e.teacherId,
    subjectId: e.subjectId,
    classId: e.classId,
    classroomId: e.classroomId || null,
    dayOfWeek: e.dayOfWeek,
    startTime: e.startTime,
    endTime: e.endTime,
    durationMin: e.durationMin,
    periodType: e.periodType,
    periodNumber: e.periodNumber,
    term: targetTerm,
    academicYear: targetAcademicYear,
    status: 'draft',
  }))

  let result
  try {
    result = await prisma.timetableAllocationEntry.createMany({ data })
  } catch (err) {
    const mapped = interpretTimetableExcludeError(err)
    if (mapped.isExcludeViolation) {
      return {
        success: false,
        created: 0,
        code: mapped.code,
        message:
          'Cannot copy: overlapping lessons after remapping to the current bell schedule. Adjust Settings or resolve overlaps in the source term first.',
      }
    }
    throw err
  }

  const meta = await rescanAndPersistDraftMeta(prisma, {
    schoolId,
    term: targetTerm,
    academicYear: targetAcademicYear,
  }).catch(() => null)

  return {
    success: true,
    created: result.count,
    sourceStatus: usedStatus,
    sourceTerm,
    sourceAcademicYear,
    targetTerm,
    targetAcademicYear,
    skippedNoAllocation: invalid.length,
    unmappedBellPeriods: unmapped.length,
    droppedNonWorkingDays: droppedDays.length,
    hardConflicts: meta?.hardCount ?? null,
    softConflicts: meta?.softCount ?? null,
    message: `Copied ${result.count} period(s) from ${sourceTerm} ${sourceAcademicYear} (${usedStatus}) into ${targetTerm} ${targetAcademicYear} draft. Times remapped to the current bell schedule.${
      invalid.length ? ` Skipped ${invalid.length} without a matching target-term allocation.` : ''
    }${unmapped.length ? ` ${unmapped.length} period(s) kept original times (period missing on new bell — review Conflicts).` : ''}`,
  }
}
