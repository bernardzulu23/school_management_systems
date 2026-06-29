import { z } from 'zod'
import { passwordSchema } from '@/lib/security/passwordPolicy'
import { normalizeYearGroup } from '@/lib/services/registrationHelpers'
import { getStudentSubjectLimits } from '@/lib/constants'

const zambianPhone = z
  .string()
  .regex(/^(\+?260|0)[0-9]{9}$/, 'Invalid Zambian phone number')
  .optional()
  .or(z.literal(''))

/** Map spreadsheet year_group (number or label) to ZSMS year_group string. */
export function normalizeUploadYearGroup(raw) {
  const s = String(raw ?? '').trim()
  if (!s) return ''
  if (/^(ece|reception|grade|form)/i.test(s)) {
    return normalizeYearGroup(s)
  }
  const n = parseInt(s, 10)
  if (Number.isFinite(n)) {
    if (n >= 1 && n <= 7) return `Grade ${n}`
    if (n >= 8 && n <= 13) return `Form ${n - 7}`
    if (n >= 10 && n <= 12) return `Grade ${n}`
  }
  return normalizeYearGroup(s)
}

export function normalizeUploadGender(raw) {
  const g = String(raw || '')
    .trim()
    .toLowerCase()
  if (g === 'male' || g === 'm') return 'male'
  if (g === 'female' || g === 'f') return 'female'
  return g
}

export const studentRowSchema = z.object({
  full_name: z.string().min(2, 'Full name is required'),
  date_of_birth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD')
    .refine((val) => {
      const dob = new Date(`${val}T00:00:00.000Z`)
      if (Number.isNaN(dob.getTime())) return false
      const today = new Date()
      let age = today.getUTCFullYear() - dob.getUTCFullYear()
      const m = today.getUTCMonth() - dob.getUTCMonth()
      if (m < 0 || (m === 0 && today.getUTCDate() < dob.getUTCDate())) age--
      return age >= 12
    }, 'Student must be at least 12 years old'),
  gender: z
    .string()
    .min(1, 'Gender is required')
    .refine((v) => ['male', 'female'].includes(normalizeUploadGender(v)), {
      message: 'Gender must be Male or Female',
    }),
  email: z.string().email('Invalid email address'),
  password: passwordSchema,
  exam_number: z.string().min(1, 'Exam number is required'),
  year_group: z
    .union([z.string(), z.number()])
    .refine((v) => Boolean(normalizeUploadYearGroup(v)), {
      message: 'Year group / grade is required',
    }),
  section: z
    .string()
    .optional()
    .default('')
    .transform((v) => String(v).trim().toUpperCase())
    .refine((v) => !v || /^[A-Z]$/.test(v), { message: 'Section must be a single letter A–Z' }),
  subjects: z.string().min(1, 'At least one subject is required'),
  father_full_name: z.string().optional().or(z.literal('')),
  father_contact: zambianPhone,
  _excelRow: z.number().optional(),
})

export function parseSubjectNames(subjectsRaw) {
  return String(subjectsRaw || '')
    .split(/[,;|]/)
    .map((s) => s.trim())
    .filter(Boolean)
}

export function validateSubjectCount({ subjectNames, yearGroup, schoolLevel }) {
  const limits = getStudentSubjectLimits({
    schoolLevel,
    yearGroup: normalizeUploadYearGroup(yearGroup),
  })
  const count = subjectNames.length
  const errors = []
  if (count < limits.min) {
    errors.push(`Requires minimum ${limits.min} subjects for this grade (found ${count})`)
  }
  if (count > limits.max) {
    errors.push(`Allows maximum ${limits.max} subjects for this grade (found ${count})`)
  }
  return errors
}

export function prepareStudentRow(row) {
  const parsed = studentRowSchema.parse(row)
  return {
    ...parsed,
    gender: normalizeUploadGender(parsed.gender),
    year_group: normalizeUploadYearGroup(parsed.year_group),
    email: parsed.email.trim().toLowerCase(),
    subjectNames: parseSubjectNames(parsed.subjects),
  }
}
