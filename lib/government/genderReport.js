/** @returns {'Male'|'Female'|'Unknown'} */
export function normalizeStudentGender(value) {
  const g = String(value || '')
    .trim()
    .toLowerCase()
  if (g === 'male' || g === 'm') return 'Male'
  if (g === 'female' || g === 'f') return 'Female'
  return 'Unknown'
}

/** Gender Parity Index: female / male (null when male is 0). */
export function calculateGpi(totalMale, totalFemale) {
  if (!totalMale) return totalFemale > 0 ? null : 1
  return Math.round((totalFemale / totalMale) * 1000) / 1000
}

export function gpiStatus(gpi) {
  if (gpi == null) return 'unknown'
  if (gpi >= 0.97) return 'good'
  if (gpi >= 0.9) return 'warn'
  return 'poor'
}

export function isPresentStatus(status) {
  const s = String(status || '').toUpperCase()
  return s === 'PRESENT' || s === 'LATE'
}

export function buildEnrolmentByYearGroup(students) {
  const rows = new Map()
  for (const s of students) {
    const yearGroup = s.classRef?.year_group || s.class || 'Unassigned'
    const gender = normalizeStudentGender(s.user?.gender)
    if (!rows.has(yearGroup)) {
      rows.set(yearGroup, { yearGroup, male: 0, female: 0, unknown: 0, total: 0 })
    }
    const row = rows.get(yearGroup)
    if (gender === 'Male') row.male += 1
    else if (gender === 'Female') row.female += 1
    else row.unknown += 1
    row.total += 1
  }
  return [...rows.values()].sort((a, b) => a.yearGroup.localeCompare(b.yearGroup))
}

export function buildAttendanceComparison(marks) {
  const stats = {
    male: { present: 0, total: 0 },
    female: { present: 0, total: 0 },
    unknown: { present: 0, total: 0 },
  }

  for (const m of marks) {
    const gender = normalizeStudentGender(m.student?.user?.gender)
    const bucket =
      gender === 'Male' ? stats.male : gender === 'Female' ? stats.female : stats.unknown
    bucket.total += 1
    if (isPresentStatus(m.status)) bucket.present += 1
  }

  const rate = (b) => (b.total ? Math.round((b.present / b.total) * 1000) / 10 : null)

  return {
    maleRate: rate(stats.male),
    femaleRate: rate(stats.female),
    unknownRate: rate(stats.unknown),
    male: stats.male,
    female: stats.female,
    unknown: stats.unknown,
  }
}
