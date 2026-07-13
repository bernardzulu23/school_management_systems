/**
 * Persist unique teacher colours (TeacherColor) — single source of truth for timetable UI.
 * Keys assignment.teacherId → User.id via loadTeacherColorMap.
 */
import {
  GOLDEN_ANGLE_DEG,
  colorsTooClose,
  normalizeHex,
  pickUniqueTeacherColor,
  hexToHsl,
} from '@/lib/timetable/uniqueTeacherColors'

const TEACHER_LIMIT = 500

async function loadExistingColors(prisma, schoolId, excludeTeacherId = null) {
  const rows = await prisma.teacherColor.findMany({
    where: {
      schoolId,
      ...(excludeTeacherId ? { teacherId: { not: excludeTeacherId } } : {}),
    },
    select: { colorHex: true, teacherId: true },
  })
  return rows.map((r) => normalizeHex(r.colorHex)).filter(Boolean)
}

async function getLastHue(prisma, schoolId) {
  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    select: { lastAssignedTeacherHue: true },
  })
  const v = school?.lastAssignedTeacherHue
  return Number.isFinite(Number(v)) ? Number(v) : -GOLDEN_ANGLE_DEG
}

async function setLastHue(prisma, schoolId, hue, tx = prisma) {
  await tx.school.update({
    where: { id: schoolId },
    data: { lastAssignedTeacherHue: hue },
  })
}

/**
 * Assign a new unique colour to one teacher (create or fill missing).
 * Idempotent if a colour already exists (unless force).
 */
export async function ensureTeacherColor(prisma, { schoolId, teacherId, force = false }) {
  const existing = await prisma.teacherColor.findUnique({
    where: { schoolId_teacherId: { schoolId, teacherId } },
  })
  if (existing && !force) {
    return { colorHex: normalizeHex(existing.colorHex), created: false, hue: existing.hueDegrees }
  }

  const others = await loadExistingColors(prisma, schoolId, teacherId)
  const lastHue = await getLastHue(prisma, schoolId)
  const assignedCount = others.length
  const picked = pickUniqueTeacherColor({
    lastAssignedHue: lastHue,
    existingHexes: others,
    assignedCount,
  })
  if (!picked.ok) {
    throw new Error(
      'Could not find a sufficiently distinct colour for this teacher. Reassign school colours or pick manually.'
    )
  }

  const row = await prisma.teacherColor.upsert({
    where: { schoolId_teacherId: { schoolId, teacherId } },
    create: {
      schoolId,
      teacherId,
      colorHex: picked.colorHex,
      colorName: `Hue ${Math.round(picked.hue)}`,
      hueDegrees: picked.hue,
    },
    update: {
      colorHex: picked.colorHex,
      colorName: `Hue ${Math.round(picked.hue)}`,
      hueDegrees: picked.hue,
    },
  })

  await setLastHue(prisma, schoolId, picked.hue)
  return { colorHex: row.colorHex, created: true, hue: picked.hue }
}

/**
 * Backfill / reassign all teachers at a school in createdAt order (deterministic).
 */
export async function assignUniqueColorsForSchool(prisma, schoolId, { force = false } = {}) {
  const teachers = await prisma.teacher.findMany({
    where: { schoolId },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    select: { id: true, createdAt: true },
    take: TEACHER_LIMIT,
  })

  if (force) {
    await prisma.teacherColor.deleteMany({ where: { schoolId } })
    await setLastHue(prisma, schoolId, -GOLDEN_ANGLE_DEG)
  }

  let lastHue = await getLastHue(prisma, schoolId)
  const existingHexes = force ? [] : await loadExistingColors(prisma, schoolId)
  let assigned = 0
  let skipped = 0

  for (let i = 0; i < teachers.length; i++) {
    const teacherId = teachers[i].id
    const current = force
      ? null
      : await prisma.teacherColor.findUnique({
          where: { schoolId_teacherId: { schoolId, teacherId } },
        })
    if (current) {
      skipped += 1
      const hex = normalizeHex(current.colorHex)
      if (hex && !existingHexes.includes(hex)) existingHexes.push(hex)
      continue
    }

    const picked = pickUniqueTeacherColor({
      lastAssignedHue: lastHue,
      existingHexes,
      assignedCount: existingHexes.length,
    })
    if (!picked.ok) {
      throw new Error(`Colour exhaustion at teacher index ${i} for school ${schoolId}`)
    }

    await prisma.teacherColor.create({
      data: {
        schoolId,
        teacherId,
        colorHex: picked.colorHex,
        colorName: `Hue ${Math.round(picked.hue)}`,
        hueDegrees: picked.hue,
      },
    })
    existingHexes.push(picked.colorHex)
    lastHue = picked.hue
    assigned += 1
  }

  await setLastHue(prisma, schoolId, lastHue)
  return { assigned, skipped, total: teachers.length }
}

/**
 * Validate a manual colour override. Returns { ok, error?, conflictingTeacherId? }.
 */
export async function validateManualTeacherColor(prisma, { schoolId, teacherId, colorHex }) {
  const hex = normalizeHex(colorHex)
  if (!hex) return { ok: false, error: 'Invalid colour. Use a 6-digit hex code (e.g. #2563EB).' }

  const others = await prisma.teacherColor.findMany({
    where: { schoolId, teacherId: { not: teacherId } },
    include: {
      teacher: { select: { user: { select: { name: true } } } },
    },
  })

  for (const row of others) {
    if (colorsTooClose(hex, row.colorHex)) {
      const name = row.teacher?.user?.name || 'another teacher'
      return {
        ok: false,
        error: `That colour is too close to ${name}'s colour (${normalizeHex(row.colorHex)}). Pick a more distinct colour.`,
        conflictingTeacherId: row.teacherId,
        conflictingHex: normalizeHex(row.colorHex),
      }
    }
  }
  return { ok: true, colorHex: hex }
}

export async function setManualTeacherColor(
  prisma,
  { schoolId, teacherId, colorHex, colorName = null }
) {
  const check = await validateManualTeacherColor(prisma, { schoolId, teacherId, colorHex })
  if (!check.ok) return check

  const hsl = hexToHsl(check.colorHex)
  const row = await prisma.teacherColor.upsert({
    where: { schoolId_teacherId: { schoolId, teacherId } },
    create: {
      schoolId,
      teacherId,
      colorHex: check.colorHex,
      colorName: colorName || (hsl ? `Hue ${Math.round(hsl.h)}` : 'Custom'),
      hueDegrees: hsl?.h ?? null,
    },
    update: {
      colorHex: check.colorHex,
      colorName: colorName || (hsl ? `Hue ${Math.round(hsl.h)}` : 'Custom'),
      hueDegrees: hsl?.h ?? null,
    },
  })
  return { ok: true, color: row }
}
