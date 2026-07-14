/**
 * Per-teacher / per-class weekly timetable export (DOCX + print HTML).
 */

import {
  Document,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
  HeadingLevel,
} from 'docx'
import { loadTimetableEntriesForAudit } from '@/lib/timetable/conflictAudit'
import { mapDbEntriesToAssignments } from '@/lib/timetable/mapEntriesToAssignments'
import {
  ensureTimetableConfig,
  normalizeTimetableConfig,
  buildTimeSlotsFromConfig,
  normalizeDayKey,
} from '@/lib/timetable/timeSlotsFromConfig'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']

function cell(text, { bold = false, width = 1400 } = {}) {
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    children: [
      new Paragraph({
        children: [new TextRun({ text: String(text ?? ''), bold, size: 16 })],
      }),
    ],
  })
}

function labelForAssignment(a) {
  if (!a) return ''
  const bits = [a.subjectName, a.className, a.teacherName].filter(Boolean)
  return bits.join(' · ')
}

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 */
export async function loadScopedWeekSchedule(
  prisma,
  { schoolId, term, academicYear, teacherId = null, classId = null }
) {
  const loaded = await loadTimetableEntriesForAudit(prisma, { schoolId, term, academicYear })
  let assignments = mapDbEntriesToAssignments(loaded.entries)

  if (teacherId) {
    assignments = assignments.filter((a) => String(a.teacherId) === String(teacherId))
  }
  if (classId) {
    assignments = assignments.filter((a) => String(a.classId) === String(classId))
  }

  const cfg = await ensureTimetableConfig(prisma, schoolId)
  const normalized = normalizeTimetableConfig(cfg)
  const timeSlots = buildTimeSlotsFromConfig(normalized).filter((s) => !s.isBreak)

  let titleEntity = 'Timetable'
  if (teacherId) {
    const u = await prisma.user.findFirst({
      where: { id: teacherId, schoolId },
      select: { name: true },
    })
    titleEntity = u?.name ? `Teacher: ${u.name}` : 'Teacher schedule'
  } else if (classId) {
    const c = await prisma.class.findFirst({
      where: { id: classId, schoolId },
      select: { name: true },
    })
    titleEntity = c?.name ? `Class: ${c.name}` : 'Class schedule'
  }

  return {
    source: loaded.source,
    term,
    academicYear,
    titleEntity,
    assignments,
    timeSlots,
    teacherId,
    classId,
  }
}

export async function buildWeekScheduleDocx({
  schoolName,
  term,
  academicYear,
  titleEntity,
  assignments,
  timeSlots,
}) {
  const periods = [
    ...new Map(
      (timeSlots || []).filter((s) => !s.isBreak).map((s) => [Number(s.period) || 0, s])
    ).values(),
  ].sort((a, b) => (Number(a.period) || 0) - (Number(b.period) || 0))

  const byKey = new Map()
  for (const a of assignments || []) {
    const day = normalizeDayKey(a.dayOfWeek)
    const period = Number(a.period) || 0
    const key = `${day}|${period}`
    if (!byKey.has(key)) byKey.set(key, [])
    byKey.get(key).push(a)
  }

  const header = new TableRow({
    children: [
      cell('Period', { bold: true, width: 1200 }),
      ...DAYS.map((d) => cell(d, { bold: true, width: 1700 })),
    ],
  })

  const rows = periods.map((slot) => {
    const p = Number(slot.period) || 0
    const timeLabel = `${p} (${slot.startTime}-${slot.endTime})`
    return new TableRow({
      children: [
        cell(timeLabel, { bold: true, width: 1200 }),
        ...DAYS.map((day) => {
          const list = byKey.get(`${day}|${p}`) || []
          return cell(list.map(labelForAssignment).join('\n') || '—', { width: 1700 })
        }),
      ],
    })
  })

  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            children: [new TextRun({ text: String(schoolName || 'School'), bold: true })],
          }),
          new Paragraph({
            spacing: { after: 120 },
            children: [
              new TextRun({
                text: `${titleEntity} — ${term} ${academicYear}`,
                size: 24,
              }),
            ],
          }),
          new Table({
            width: { size: 9700, type: WidthType.DXA },
            rows: [header, ...rows],
          }),
        ],
      },
    ],
  })

  return Packer.toBuffer(doc)
}

/** Browser-printable HTML for Save as PDF. */
export function buildWeekSchedulePrintHtml({
  schoolName,
  term,
  academicYear,
  titleEntity,
  assignments,
  timeSlots,
}) {
  const periods = [
    ...new Map(
      (timeSlots || []).filter((s) => !s.isBreak).map((s) => [Number(s.period) || 0, s])
    ).values(),
  ].sort((a, b) => (Number(a.period) || 0) - (Number(b.period) || 0))

  const byKey = new Map()
  for (const a of assignments || []) {
    const day = normalizeDayKey(a.dayOfWeek)
    const period = Number(a.period) || 0
    const key = `${day}|${period}`
    if (!byKey.has(key)) byKey.set(key, [])
    byKey.get(key).push(a)
  }

  const head = DAYS.map((d) => `<th>${d}</th>`).join('')
  const body = periods
    .map((slot) => {
      const p = Number(slot.period) || 0
      const cells = DAYS.map((day) => {
        const list = byKey.get(`${day}|${p}`) || []
        const text = list.map(labelForAssignment).join('<br/>') || '—'
        return `<td>${text}</td>`
      }).join('')
      return `<tr><th>${p}<br/><span style="font-weight:400;font-size:11px">${slot.startTime}–${slot.endTime}</span></th>${cells}</tr>`
    })
    .join('')

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"/><title>${titleEntity}</title>
<style>
  body { font-family: Georgia, serif; color: #111; margin: 24px; }
  h1 { font-size: 20px; margin: 0 0 4px; }
  h2 { font-size: 14px; font-weight: 400; margin: 0 0 16px; color: #444; }
  table { border-collapse: collapse; width: 100%; font-size: 12px; }
  th, td { border: 1px solid #333; padding: 6px; vertical-align: top; }
  th { background: #f0f0f0; }
  @page { size: landscape; margin: 12mm; }
  @media print { body { margin: 0; } }
</style></head>
<body>
  <h1>${schoolName || 'School'}</h1>
  <h2>${titleEntity} — ${term} ${academicYear}</h2>
  <table><thead><tr><th>Period</th>${head}</tr></thead><tbody>${body}</tbody></table>
  <script>window.onload=function(){window.print()}</script>
</body></html>`
}
