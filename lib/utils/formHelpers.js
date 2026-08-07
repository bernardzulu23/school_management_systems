/**
 * Common form input change handler
 * @param {Function} setFormData - React state setter function
 */
export const handleInputChange = (setFormData) => (e) => {
  const { name, value, type, checked } = e.target
  setFormData((prev) => ({
    ...prev,
    [name]: type === 'checkbox' ? checked : value,
  }))
}

/**
 * Common multi-select change handler (e.g., for subjects)
 * @param {Function} setFormData - React state setter function
 * @param {string} fieldName - Name of the field in formData (default: 'subjects')
 */
export const handleMultiSelectChange =
  (setFormData, fieldName = 'subjects') =>
  (id, checked) => {
    const numericId = parseInt(id)
    setFormData((prev) => ({
      ...prev,
      [fieldName]: checked
        ? [...prev[fieldName], numericId]
        : prev[fieldName].filter((item) => item !== numericId),
    }))
  }

/**
 * Formats a full name from first and last name
 * @param {string} firstName
 * @param {string} lastName
 * @returns {string}
 */
export const formatFullName = (firstName, lastName) => {
  return `${firstName} ${lastName}`.trim()
}

/**
 * Parse a calendar date from flexible user input into a UTC midnight Date.
 * Accepts:
 * - YYYY-MM-DD / YYYY/MM/DD / YYYY.MM.DD
 * - DD/MM/YYYY / DD-MM-YYYY (day-first; preferred when ambiguous)
 * - MM/DD/YYYY / MM-DD-YYYY (month-first when unambiguous or day-first invalid)
 *
 * Ambiguous values like 05/06/2010 prefer DD/MM (Zambia) → 5 June 2010.
 *
 * @param {unknown} value
 * @returns {Date|null}
 */
export const parseDateInput = (value) => {
  const raw = String(value || '').trim()
  if (!raw) return null

  const makeUtcDate = (year, month, day) => {
    if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null
    if (year < 1000 || year > 9999) return null
    if (month < 1 || month > 12) return null
    if (day < 1 || day > 31) return null
    const d = new Date(Date.UTC(year, month - 1, day))
    if (d.getUTCFullYear() !== year || d.getUTCMonth() !== month - 1 || d.getUTCDate() !== day) {
      return null
    }
    return d
  }

  // YYYY-MM-DD / YYYY/MM/DD / YYYY.MM.DD
  const ymd = raw.match(/^(\d{4})[/.-](\d{1,2})[/.-](\d{1,2})$/)
  if (ymd) {
    return makeUtcDate(Number(ymd[1]), Number(ymd[2]), Number(ymd[3]))
  }

  // D/M/YYYY or M/D/YYYY (and with - or .)
  const numeric = raw.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/)
  if (numeric) {
    const a = Number(numeric[1])
    const b = Number(numeric[2])
    const year = Number(numeric[3])

    // Unambiguous: first part can't be a month → day/month/year
    if (a > 12) return makeUtcDate(year, b, a)
    // Unambiguous: second part can't be a month → month/day/year
    if (b > 12) return makeUtcDate(year, a, b)

    // Ambiguous (both ≤ 12): prefer DD/MM/YYYY (Zambia), then MM/DD/YYYY
    return makeUtcDate(year, b, a) || makeUtcDate(year, a, b)
  }

  return null
}

/** Short hint for date-of-birth fields. */
export const FLEXIBLE_DATE_HINT = 'DD/MM/YYYY, MM/DD/YYYY, or YYYY/MM/DD'

export const formatDDMMYYYY = (value) => {
  if (!value) return ''
  const d = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  const day = String(d.getUTCDate()).padStart(2, '0')
  const month = String(d.getUTCMonth() + 1).padStart(2, '0')
  const year = String(d.getUTCFullYear())
  return `${day}/${month}/${year}`
}
