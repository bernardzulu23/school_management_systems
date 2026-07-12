/**
 * Zambian school term calendar (approximate).
 * Term 1: Jan–Apr, Term 2: May–Aug, Term 3: Sep–Dec
 */
export function getCurrentTerm(date = new Date()) {
  const month = date.getMonth() + 1
  if (month >= 1 && month <= 4) return { term: 1, year: date.getFullYear() }
  if (month >= 5 && month <= 8) return { term: 2, year: date.getFullYear() }
  return { term: 3, year: date.getFullYear() }
}

export function getTermDateRange(term, year) {
  if (term === 1) return { start: new Date(year, 0, 1), end: new Date(year, 3, 30, 23, 59, 59) }
  if (term === 2) return { start: new Date(year, 4, 1), end: new Date(year, 7, 31, 23, 59, 59) }
  return { start: new Date(year, 8, 1), end: new Date(year, 11, 31, 23, 59, 59) }
}
