import crypto from 'crypto'

const PILOT_EMAIL_WHITELIST = new Set(
  (
    process.env.PILOT_EMAILS ||
    'fredith01@gmail.com,admin@ndakedaysecondaryschool.edu,krbmafupa@gmail.com'
  )
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
)

export function isPilotEmail(email) {
  return PILOT_EMAIL_WHITELIST.has(
    String(email || '')
      .trim()
      .toLowerCase()
  )
}

export function generateAutoPassword() {
  const length = 16
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*'
  const randomBytes = crypto.randomBytes(length)
  let password = ''
  for (let i = 0; i < length; i++) {
    password += charset[randomBytes[i] % charset.length]
  }
  return password
}

export const parseYearGroupSectionFromClassName = (className) => {
  const raw = String(className || '').trim()
  if (!raw) return { year_group: '', section: '' }

  const numeric = raw.match(/^(\d{1,2})([A-Za-z])$/)
  if (numeric) {
    return { year_group: `Grade ${numeric[1]}`, section: numeric[2].toUpperCase() }
  }

  const last = raw.slice(-1)
  if (/[A-Za-z]/.test(last) && raw.length > 1) {
    return { year_group: raw.slice(0, -1).trim(), section: last.toUpperCase() }
  }

  return { year_group: raw, section: '' }
}

export const normalizeYearGroup = (yearGroupRaw) => {
  const raw = String(yearGroupRaw || '').trim()
  if (!raw) return ''
  const numeric = raw.match(/^(\d{1,2})$/)
  if (numeric) return `Grade ${Number(numeric[1])}`
  const grade = raw.match(/^grade\s*(\d{1,2})$/i)
  if (grade) return `Grade ${Number(grade[1])}`
  return raw
}

export const buildClassName = (yearGroupRaw, sectionRaw) => {
  const yearGroup = normalizeYearGroup(yearGroupRaw)
  const section = String(sectionRaw || '')
    .trim()
    .toUpperCase()
  if (!yearGroup) return section || ''
  if (!section) return yearGroup
  return `${yearGroup}${section}`
}
