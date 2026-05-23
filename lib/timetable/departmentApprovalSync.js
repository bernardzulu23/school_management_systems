/**
 * When a department allocation is approved, mirror it into TeacherAllocation rows
 * so POST /api/timetable/generate can schedule periods (uses status "pushed").
 */

export function unwrapDepartmentAllocationData(data) {
  const raw = data && typeof data === 'object' ? data : {}
  const teacherId = String(raw?.teacherId || '').trim()
  const classes = Array.isArray(raw?.classes)
    ? raw.classes.map((c) => String(c).trim()).filter(Boolean)
    : []
  const subject = String(raw?.subject || '').trim()
  let periodConfig = raw?.periodConfig ?? null
  if (typeof periodConfig === 'string') {
    try {
      periodConfig = JSON.parse(periodConfig)
    } catch {
      periodConfig = null
    }
  }
  return { teacherId, classes, subject, periodConfig }
}

/**
 * Maps HOD allocation periodConfig (preset ids or custom singles/doubles/triples) to TeacherAllocation fields.
 */
export function periodConfigToTeacherAllocationParts(periodConfig) {
  const obj = periodConfig && typeof periodConfig === 'object' ? periodConfig : {}
  const preset = String(obj.preset || '').toLowerCase()

  if (preset === 'p6') {
    return {
      periodsPerWeek: 6,
      blockType: 'DOUBLE',
      singlePeriods: 0,
      doublePeriods: 3,
      triplePeriods: 0,
    }
  }
  if (preset === 'p5') {
    return {
      periodsPerWeek: 5,
      blockType: 'MIXED',
      singlePeriods: 0,
      doublePeriods: 1,
      triplePeriods: 1,
    }
  }
  if (preset === 'p4') {
    return {
      periodsPerWeek: 4,
      blockType: 'MIXED',
      singlePeriods: 1,
      doublePeriods: 2,
      triplePeriods: 0,
    }
  }

  const singles = Number(obj.singles || 0)
  const doubles = Number(obj.doubles || 0)
  const triples = Number(obj.triples || 0)
  const periodsPerWeek = singles + doubles * 2 + triples * 3
  if (periodsPerWeek <= 0) {
    return {
      periodsPerWeek: 1,
      blockType: 'SINGLE',
      singlePeriods: 1,
      doublePeriods: 0,
      triplePeriods: 0,
    }
  }

  const used = [singles > 0, doubles > 0, triples > 0].filter(Boolean).length
  let blockType = 'MIXED'
  if (used === 1) {
    if (triples > 0) blockType = 'TRIPLE'
    else if (doubles > 0) blockType = 'DOUBLE'
    else blockType = 'SINGLE'
  }

  if (blockType === 'DOUBLE' && periodsPerWeek % 2 !== 0) blockType = 'MIXED'
  if (blockType === 'TRIPLE' && periodsPerWeek % 3 !== 0) blockType = 'MIXED'

  const computedTotal = singles + doubles * 2 + triples * 3
  if (blockType === 'MIXED' && computedTotal !== periodsPerWeek) {
    // defensive — totals always match by construction
  }

  return {
    periodsPerWeek,
    blockType,
    singlePeriods: singles,
    doublePeriods: doubles,
    triplePeriods: triples,
  }
}

async function resolveSubjectId(tx, schoolId, subjectName) {
  const name = String(subjectName || '').trim()
  if (!name) return null
  const s = await tx.subject.findFirst({
    where: { schoolId, name: { equals: name, mode: 'insensitive' } },
    select: { id: true },
  })
  return s?.id || null
}

async function resolveClassId(tx, schoolId, label) {
  const raw = String(label || '').trim()
  if (!raw) return null

  const exact = await tx.class.findFirst({
    where: { schoolId, name: { equals: raw, mode: 'insensitive' } },
    select: { id: true },
  })
  if (exact) return exact.id

  const compact = raw.replace(/\s+/g, '').toLowerCase()
  const rows = await tx.class.findMany({
    where: { schoolId },
    select: { id: true, name: true, year_group: true, section: true },
    take: 800,
  })
  for (const row of rows) {
    const n = String(row.name || '')
      .replace(/\s+/g, '')
      .toLowerCase()
    const y = `${String(row.year_group || '').trim()}${String(row.section || '').trim()}`
      .replace(/\s+/g, '')
      .toLowerCase()
    if (n === compact || y === compact) return row.id
  }
  return null
}

/**
 * Upserts one TeacherAllocation per class; marks status pushed so timetable generation can run.
 * @param {import('@prisma/client').Prisma.TransactionClient} tx
 */
export async function syncDepartmentApprovalToTeacherAllocations(tx, params) {
  const {
    schoolId,
    departmentAllocationId,
    allocationData,
    teacherUserId: teacherUserIdParam,
    hodUserId,
    term,
    academicYear,
  } = params

  const details = unwrapDepartmentAllocationData(allocationData)
  if (!details.teacherId && !teacherUserIdParam) throw new Error('Allocation missing teacherId')
  if (!details.subject) throw new Error('Allocation missing subject')
  if (!details.classes.length) throw new Error('Allocation missing classes')

  let teacherUserId = teacherUserIdParam
  if (!teacherUserId) {
    const { resolveTeacherUserId } = await import('@/lib/utils/resolveTeacherId')
    const resolved = await resolveTeacherUserId(tx, schoolId, details.teacherId)
    if (!resolved?.id) {
      throw new Error(
        `Teacher not found for this school (id: ${details.teacherId}). Re-select the teacher in Class Allocation.`
      )
    }
    teacherUserId = resolved.id
  }

  const parts = periodConfigToTeacherAllocationParts(details.periodConfig)

  const subjectId = await resolveSubjectId(tx, schoolId, details.subject)
  if (!subjectId) {
    throw new Error(
      `No subject named "${details.subject}" found for this school. Add it under Subjects or fix spelling.`
    )
  }

  const pushedAt = new Date()
  const notesTag = `departmentAllocation:${departmentAllocationId}`
  const unmatched = []

  const ids = []
  for (const classLabel of details.classes) {
    const classId = await resolveClassId(tx, schoolId, classLabel)
    if (!classId) {
      unmatched.push(classLabel)
      continue
    }

    const row = await tx.teacherAllocation.upsert({
      where: {
        schoolId_teacherId_subjectId_classId_term_academicYear: {
          schoolId,
          teacherId: teacherUserId,
          subjectId,
          classId,
          term,
          academicYear,
        },
      },
      update: {
        hodId: hodUserId,
        periodsPerWeek: parts.periodsPerWeek,
        blockType: parts.blockType,
        singlePeriods: parts.singlePeriods,
        doublePeriods: parts.doublePeriods,
        triplePeriods: parts.triplePeriods,
        status: 'pushed',
        pushedAt,
        notes: notesTag,
      },
      create: {
        schoolId,
        hodId: hodUserId,
        teacherId: teacherUserId,
        subjectId,
        classId,
        periodsPerWeek: parts.periodsPerWeek,
        blockType: parts.blockType,
        singlePeriods: parts.singlePeriods,
        doublePeriods: parts.doublePeriods,
        triplePeriods: parts.triplePeriods,
        term,
        academicYear,
        status: 'pushed',
        pushedAt,
        notes: notesTag,
      },
      select: { id: true },
    })
    ids.push(row.id)
  }

  if (unmatched.length) {
    throw new Error(
      `Could not match class(es) to school classes: ${unmatched.join(
        ', '
      )}. Use the exact class name from Classes (e.g. Form 1A).`
    )
  }

  return { teacherAllocationIds: ids, count: ids.length }
}
