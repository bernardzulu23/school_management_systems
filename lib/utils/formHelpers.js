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

export const parseDateInput = (value) => {
  const raw = String(value || '').trim()
  if (!raw) return null

  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (iso) {
    const year = Number(iso[1])
    const month = Number(iso[2])
    const day = Number(iso[3])
    const d = new Date(Date.UTC(year, month - 1, day))
    if (d.getUTCFullYear() === year && d.getUTCMonth() === month - 1 && d.getUTCDate() === day) {
      return d
    }
    return null
  }

  const ddmmyyyy = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (ddmmyyyy) {
    const day = Number(ddmmyyyy[1])
    const month = Number(ddmmyyyy[2])
    const year = Number(ddmmyyyy[3])
    const d = new Date(Date.UTC(year, month - 1, day))
    if (d.getUTCFullYear() === year && d.getUTCMonth() === month - 1 && d.getUTCDate() === day) {
      return d
    }
    return null
  }

  return null
}

export const formatDDMMYYYY = (value) => {
  if (!value) return ''
  const d = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  const day = String(d.getUTCDate()).padStart(2, '0')
  const month = String(d.getUTCMonth() + 1).padStart(2, '0')
  const year = String(d.getUTCFullYear())
  return `${day}/${month}/${year}`
}
