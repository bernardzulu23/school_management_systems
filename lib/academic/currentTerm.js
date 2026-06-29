/**
 * Zambian school calendar term helpers (approximate month bands).
 */
export function currentTermLabel(date = new Date()) {
  const month = date.getMonth() + 1
  const termNumber = month <= 4 ? 1 : month <= 8 ? 2 : 3
  return `Term ${termNumber}`
}

export function currentAcademicYear(date = new Date()) {
  return date.getFullYear()
}

/**
 * @param {string} termLabel e.g. "Term 2"
 * @param {number} [year]
 */
export function termDateRange(termLabel, year = currentAcademicYear()) {
  const match = String(termLabel || '').match(/term\s*([1-3])/i)
  const term = match ? Number(match[1]) : 0
  const y = Number(year) || currentAcademicYear()

  if (term === 1) {
    return { start: new Date(y, 0, 1), end: new Date(y, 3, 30, 23, 59, 59, 999) }
  }
  if (term === 2) {
    return { start: new Date(y, 4, 1), end: new Date(y, 7, 31, 23, 59, 59, 999) }
  }
  if (term === 3) {
    return { start: new Date(y, 8, 1), end: new Date(y, 11, 31, 23, 59, 59, 999) }
  }
  return { start: new Date(y, 0, 1), end: new Date(y, 11, 31, 23, 59, 59, 999) }
}

export function resolveDisplayTerm(termParam) {
  const raw = String(termParam || '').trim()
  if (!raw || /^all\s*terms?$/i.test(raw)) return currentTermLabel()
  const match = raw.match(/term\s*([1-3])/i)
  return match ? `Term ${Number(match[1])}` : raw
}
