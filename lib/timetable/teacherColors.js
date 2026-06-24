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

export {
  ASC_PALETTE,
  buildTeacherColorMap,
  teacherCardStyle,
} from '@/lib/timetable/teacherColorPalette'
