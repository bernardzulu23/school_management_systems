/**
 * Diff published timetable slots to find teachers whose schedules actually changed.
 * ChangeLogEntry only stores publish counts — use entry fingerprints, not the activity log.
 */

/**
 * Stable fingerprint for one period (ignores entry id / publishedAt).
 * @param {object} e
 */
export function entryScheduleFingerprint(e) {
  const teacherId = String(e?.teacherId || '')
  const classId = String(e?.classId || '')
  const subjectId = String(e?.subjectId || '')
  const day = String(e?.dayOfWeek || '')
  const period = Number(e?.periodNumber) || 0
  const start = String(e?.startTime || '')
  const end = String(e?.endTime || '')
  const room = e?.classroomId != null && e.classroomId !== '' ? String(e.classroomId) : ''
  return `${teacherId}|${classId}|${subjectId}|${day}|${period}|${start}|${end}|${room}`
}

/**
 * @param {Array<{ teacherId?: string|null }>} entries
 * @returns {Map<string, Set<string>>} teacherId → set of fingerprints
 */
export function buildTeacherFingerprintSets(entries) {
  /** @type {Map<string, Set<string>>} */
  const map = new Map()
  for (const e of entries || []) {
    const teacherId = String(e?.teacherId || '').trim()
    if (!teacherId) continue
    const fp = entryScheduleFingerprint(e)
    let set = map.get(teacherId)
    if (!set) {
      set = new Set()
      map.set(teacherId, set)
    }
    set.add(fp)
  }
  return map
}

function setsEqual(a, b) {
  if (a.size !== b.size) return false
  for (const v of a) {
    if (!b.has(v)) return false
  }
  return true
}

/**
 * Teachers whose period sets differ between before and after.
 * First publish (before empty): every teacher with ≥1 after period.
 * Teacher fully removed: included (their after set is empty / missing).
 *
 * @param {Array<object>} beforeEntries previous published
 * @param {Array<object>} afterEntries new published
 * @returns {{ affectedTeacherIds: string[], addedCount: number, removedCount: number, unchangedCount: number }}
 */
export function diffAffectedTeacherIds(beforeEntries, afterEntries) {
  const before = buildTeacherFingerprintSets(beforeEntries)
  const after = buildTeacherFingerprintSets(afterEntries)
  const allIds = new Set([...before.keys(), ...after.keys()])
  const affected = []
  let unchangedCount = 0

  for (const id of allIds) {
    const b = before.get(id) || new Set()
    const a = after.get(id) || new Set()
    if (setsEqual(b, a)) {
      unchangedCount += 1
      continue
    }
    affected.push(id)
  }

  let addedCount = 0
  let removedCount = 0
  for (const e of afterEntries || []) {
    const fp = entryScheduleFingerprint(e)
    const tid = String(e?.teacherId || '')
    const bset = before.get(tid)
    if (!bset || !bset.has(fp)) addedCount += 1
  }
  for (const e of beforeEntries || []) {
    const fp = entryScheduleFingerprint(e)
    const tid = String(e?.teacherId || '')
    const aset = after.get(tid)
    if (!aset || !aset.has(fp)) removedCount += 1
  }

  return {
    affectedTeacherIds: affected,
    addedCount,
    removedCount,
    unchangedCount,
  }
}

const SLOT_SELECT = {
  teacherId: true,
  classId: true,
  subjectId: true,
  dayOfWeek: true,
  periodNumber: true,
  startTime: true,
  endTime: true,
  classroomId: true,
}

/**
 * @param {import('@prisma/client').PrismaClient | import('@prisma/client').Prisma.TransactionClient} db
 */
export async function snapshotPublishedScheduleSlots(db, { schoolId, term, academicYear }) {
  return db.timetableAllocationEntry.findMany({
    where: { schoolId, term, academicYear, status: 'published' },
    select: SLOT_SELECT,
  })
}
