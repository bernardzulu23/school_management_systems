import { hexToCardColor } from '@/lib/timetable/cardColors'
import { MISSING_TEACHER_COLOR, normalizeHex } from '@/lib/timetable/uniqueTeacherColors'

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
    const hex = normalizeHex(row.colorHex)
    if (!hex) continue
    byUserId.set(userId, {
      colorHex: hex,
      colorName: row.colorName,
      teacherId: row.teacherId,
      teacherName: row.teacher?.user?.name || '',
      card: hexToCardColor(hex),
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
  // No invented colours — neutral card until DB colour is loaded / assigned
  return hexToCardColor(MISSING_TEACHER_COLOR)
}

export {
  ASC_PALETTE,
  buildTeacherColorMap,
  teacherCardStyle,
} from '@/lib/timetable/teacherColorPalette'
