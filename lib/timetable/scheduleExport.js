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
import { loadTeacherColorMap, resolveAssignmentCardColor } from '@/lib/timetable/teacherColors'
import { abbreviateSubject } from '@/lib/timetable/subjectAbbrev'

const DAYS = [
  { key: 'monday', label: 'MON' },
  { key: 'tuesday', label: 'TUE' },
  { key: 'wednesday', label: 'WED' },
  { key: 'thursday', label: 'THU' },
  { key: 'friday', label: 'FRI' },
]

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

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

function labelForAssignment(a, { scope } = {}) {
  if (!a) return ''
  const subject = a.subjectName || a.subjectId || ''
  if (scope === 'teacher') {
    return [subject, a.className].filter(Boolean).join(' · ')
  }
  if (scope === 'class') {
    return [subject, a.teacherName].filter(Boolean).join(' · ')
  }
  return [subject, a.className, a.teacherName].filter(Boolean).join(' · ')
}

function indexAssignments(assignments) {
  const byKey = new Map()
  for (const a of assignments || []) {
    const day = normalizeDayKey(a.dayOfWeek)
    const period = Number(a.period) || 0
    const key = `${day}|${period}`
    if (!byKey.has(key)) byKey.set(key, [])
    byKey.get(key).push(a)
  }
  return byKey
}

function teachingPeriods(timeSlots) {
  return [
    ...new Map(
      (timeSlots || []).filter((s) => !s.isBreak).map((s) => [Number(s.period) || 0, s])
    ).values(),
  ].sort((a, b) => (Number(a.period) || 0) - (Number(b.period) || 0))
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
  let scope = 'all'
  if (teacherId) {
    scope = 'teacher'
    const u = await prisma.user.findFirst({
      where: { id: teacherId, schoolId },
      select: { name: true },
    })
    titleEntity = u?.name ? `Teacher: ${u.name}` : 'Teacher schedule'
  } else if (classId) {
    scope = 'class'
    const c = await prisma.class.findFirst({
      where: { id: classId, schoolId },
      select: { name: true },
    })
    titleEntity = c?.name ? `Class: ${c.name}` : 'Class schedule'
  }

  const colorMap = await loadTeacherColorMap(prisma, schoolId)

  return {
    source: loaded.source,
    term,
    academicYear,
    titleEntity,
    assignments,
    timeSlots,
    teacherId,
    classId,
    scope,
    colorMap,
  }
}

export async function buildWeekScheduleDocx({
  schoolName,
  term,
  academicYear,
  titleEntity,
  assignments,
  timeSlots,
  scope,
}) {
  const periods = teachingPeriods(timeSlots)
  const byKey = indexAssignments(assignments)

  const header = new TableRow({
    children: [
      cell('Period', { bold: true, width: 1200 }),
      ...DAYS.map((d) => cell(d.label, { bold: true, width: 1700 })),
    ],
  })

  const rows = periods.map((slot) => {
    const p = Number(slot.period) || 0
    const timeLabel = `${p} (${slot.startTime}-${slot.endTime})`
    return new TableRow({
      children: [
        cell(timeLabel, { bold: true, width: 1200 }),
        ...DAYS.map((day) => {
          const list = byKey.get(`${day.key}|${p}`) || []
          return cell(list.map((a) => labelForAssignment(a, { scope })).join('\n') || '—', {
            width: 1700,
          })
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

/** Browser-printable HTML mirroring the on-screen week / wall grid. */
export function buildWeekSchedulePrintHtml({
  schoolName,
  term,
  academicYear,
  titleEntity,
  assignments,
  timeSlots,
  scope,
  colorMap,
}) {
  const periods = teachingPeriods(timeSlots)
  const byKey = indexAssignments(assignments)
  const legend = new Map()

  const head = DAYS.map((d) => `<th class="day">${escapeHtml(d.label)}</th>`).join('')
  const body = periods
    .map((slot) => {
      const p = Number(slot.period) || 0
      const cells = DAYS.map((day) => {
        const list = byKey.get(`${day.key}|${p}`) || []
        if (!list.length) {
          return `<td class="empty"><span class="dot">·</span></td>`
        }
        const cards = list
          .map((a) => {
            const colors = resolveAssignmentCardColor(a.subjectId, a.teacherId, colorMap)
            const tid = String(a.teacherId || '')
            if (tid && a.teacherName && !legend.has(tid)) {
              legend.set(tid, {
                name: a.teacherName,
                hex: colors?.border || '#9ca3af',
              })
            }
            const abbrev = abbreviateSubject(a.subjectName || a.subjectId || '', a.subjectCode)
            const secondary =
              scope === 'teacher'
                ? a.className || ''
                : scope === 'class'
                  ? a.teacherName || ''
                  : [a.className, a.teacherName].filter(Boolean).join(' · ')
            return `<div class="card" style="background:${escapeHtml(colors.bg)};border-color:${escapeHtml(colors.border)}">
              <div class="subj">${escapeHtml(abbrev || a.subjectName || '')}</div>
              ${secondary ? `<div class="meta">${escapeHtml(secondary)}</div>` : ''}
            </div>`
          })
          .join('')
        return `<td>${cards}</td>`
      }).join('')
      return `<tr>
        <th class="period">${p}<br/><span class="time">${escapeHtml(slot.startTime)}–${escapeHtml(slot.endTime)}</span></th>
        ${cells}
      </tr>`
    })
    .join('')

  const legendHtml =
    legend.size > 0
      ? `<div class="legend"><div class="legend-title">Teachers</div>${[...legend.entries()]
          .sort((a, b) => String(a[1].name).localeCompare(String(b[1].name)))
          .map(
            ([, t]) =>
              `<span class="legend-item"><span class="swatch" style="background:${escapeHtml(t.hex)}"></span>${escapeHtml(t.name)}</span>`
          )
          .join('')}</div>`
      : ''

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"/><title>${escapeHtml(titleEntity)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: system-ui, -apple-system, Segoe UI, sans-serif; color: #111; margin: 16px; background: #fff; }
  h1 { font-size: 18px; margin: 0 0 2px; font-weight: 700; }
  h2 { font-size: 13px; font-weight: 500; margin: 0 0 12px; color: #4b5563; }
  table.grid { border-collapse: collapse; width: 100%; table-layout: fixed; font-size: 11px; border: 1px solid #9ca3af; }
  table.grid th, table.grid td { border: 1px solid #9ca3af; padding: 4px; vertical-align: top; }
  table.grid thead th { background: #e5e7eb; text-align: center; font-weight: 700; color: #374151; }
  th.period { width: 72px; background: #f9fafb; text-align: left; font-weight: 700; color: #374151; }
  th.period .time { font-weight: 400; font-size: 10px; color: #6b7280; }
  td.empty { text-align: center; color: #d1d5db; }
  .dot { font-size: 14px; }
  .card { border: 1.5px solid; border-radius: 4px; padding: 4px 5px; min-height: 36px; margin-bottom: 2px; }
  .card:last-child { margin-bottom: 0; }
  .subj { font-weight: 700; color: #111827; line-height: 1.2; }
  .meta { font-size: 10px; color: #4b5563; margin-top: 2px; line-height: 1.2; }
  .legend { margin-top: 14px; padding: 10px; border: 1px solid #9ca3af; border-radius: 6px; }
  .legend-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 6px; color: #374151; }
  .legend-item { display: inline-flex; align-items: center; gap: 6px; margin: 0 12px 6px 0; font-size: 11px; color: #111; }
  .swatch { width: 12px; height: 12px; border-radius: 2px; border: 1px solid rgba(0,0,0,0.15); display: inline-block; }
  @page { size: landscape; margin: 10mm; }
  @media print {
    body { margin: 0; }
    .card { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .swatch { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    thead th, th.period { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
</style></head>
<body>
  <h1>${escapeHtml(schoolName || 'School')}</h1>
  <h2>${escapeHtml(titleEntity)} — ${escapeHtml(term)} ${escapeHtml(academicYear)}</h2>
  <table class="grid"><thead><tr><th class="period">Period</th>${head}</tr></thead><tbody>${body}</tbody></table>
  ${legendHtml}
  <script>window.onload=function(){window.print()}</script>
</body></html>`
}
