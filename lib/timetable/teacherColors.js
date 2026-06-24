import { generateCardColor, hexToCardColor } from '@/lib/timetable/cardColors'

/** Load teacher colours keyed by User.id (matches assignment.teacherId). */
export async function loadTeacherColorMap(prisma, schoolId) {
  const rows = await prisma.teacherColor.findMany({
    where: { schoolId },
    include: {
      teacher: { select: { id: true, userId: true, user: { select: { id: true, name: true } } } },
    },
  })

  const byUserId = new Map()
  for (const row of rows) {
    const userId = String(row.teacher?.userId || '')
    if (!userId) continue
    byUserId.set(userId, {
      colorHex: row.colorHex,
      colorName: row.colorName,
      teacherId: row.teacherId,
      teacherName: row.teacher?.user?.name || '',
      card: hexToCardColor(row.colorHex),
    })
  }
  return byUserId
}

export function teacherColorMapToJson(map) {
  const out = {}
  for (const [userId, v] of map.entries()) {
    out[userId] = {
      colorHex: v.colorHex,
      colorName: v.colorName,
      teacherId: v.teacherId,
      teacherName: v.teacherName,
    }
  }
  return out
}

export function resolveAssignmentCardColor(subjectId, teacherUserId, colorMap) {
  const key = String(teacherUserId || '')
  const fromDb = colorMap?.get?.(key) || colorMap?.[key]
  if (fromDb?.card) return fromDb.card
  if (fromDb?.colorHex) return hexToCardColor(fromDb.colorHex)
  return generateCardColor(subjectId, teacherUserId)
}

export const PREDEFINED_TEACHER_COLORS = [
  { hex: '#2563eb', name: 'Blue' },
  { hex: '#16a34a', name: 'Green' },
  { hex: '#dc2626', name: 'Red' },
  { hex: '#9333ea', name: 'Purple' },
  { hex: '#ea580c', name: 'Orange' },
  { hex: '#0891b2', name: 'Teal' },
  { hex: '#db2777', name: 'Pink' },
  { hex: '#ca8a04', name: 'Gold' },
  { hex: '#4f46e5', name: 'Indigo' },
  { hex: '#0d9488', name: 'Turquoise' },
]

/** aSc-matched 20-color accessible palette for teacher identification on grid UIs. */
export const ASC_PALETTE = [
  '#4FC3F7',
  '#81C784',
  '#FFB74D',
  '#F06292',
  '#BA68C8',
  '#4DB6AC',
  '#FF8A65',
  '#90A4AE',
  '#AED581',
  '#FFD54F',
  '#4DD0E1',
  '#A5D6A7',
  '#FFCC02',
  '#EF9A9A',
  '#CE93D8',
  '#80DEEA',
  '#C5E1A5',
  '#FFE082',
  '#F48FB1',
  '#B0BEC5',
]

/** Client-side fallback map when DB colours are not loaded yet. */
export function buildTeacherColorMap(teacherIds) {
  const map = new Map()
  const sorted = [...new Set(teacherIds.map(String).filter(Boolean))].sort()
  sorted.forEach((id, i) => map.set(id, ASC_PALETTE[i % ASC_PALETTE.length]))
  return map
}

export function teacherCardStyle(hexColor) {
  return {
    backgroundColor: `${hexColor}22`,
    borderLeft: `3px solid ${hexColor}`,
    borderColor: hexColor,
  }
}
