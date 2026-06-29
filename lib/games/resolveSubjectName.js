/**
 * Resolve a subject select value to a display name for game APIs.
 * @param {string} value - option value (usually subject name; may be legacy id)
 * @param {{ id?: string, name?: string }[]} [subjects]
 */
export function resolveSubjectName(value, subjects = []) {
  const raw = String(value || '').trim()
  if (!raw) return ''
  const byId = subjects.find((s) => String(s.id) === raw)
  if (byId?.name) return byId.name
  const byName = subjects.find((s) => String(s.name).toLowerCase() === raw.toLowerCase())
  return byName?.name || raw
}
