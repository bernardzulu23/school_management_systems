import { z } from 'zod'
import { passwordSchema } from '@/lib/security/passwordPolicy'
import { normalizeUploadGender } from '@/lib/uploads/studentUploadSchema'

const zambianPhone = z
  .string()
  .regex(/^(\+?260|0)[0-9]{9}$/, 'Invalid Zambian phone number')
  .optional()
  .or(z.literal(''))

export function parseDepartmentNames(raw) {
  return String(raw || '')
    .split(/[,;|]/)
    .map((s) => s.trim())
    .filter(Boolean)
}

export function parseAssignedSubjectNames(raw) {
  return String(raw || '')
    .split(/[,;|]/)
    .map((s) => s.trim())
    .filter(Boolean)
}

/** "Form 1A:Mathematics; Form 2B:English" → [{ className, subjectName }] */
export function parseTeachingAssignmentPairs(raw) {
  return String(raw || '')
    .split(';')
    .map((pair) => pair.trim())
    .filter(Boolean)
    .map((pair) => {
      const idx = pair.indexOf(':')
      if (idx < 0) return null
      const className = pair.slice(0, idx).trim()
      const subjectName = pair.slice(idx + 1).trim()
      if (!className || !subjectName) return null
      return { className, subjectName }
    })
    .filter(Boolean)
}

export const teacherRowSchema = z.object({
  full_name: z.string().min(2, 'Full name is required'),
  email: z.string().email('Invalid email address'),
  password: passwordSchema,
  contact_number: zambianPhone,
  gender: z
    .string()
    .optional()
    .or(z.literal(''))
    .refine((v) => !v || ['male', 'female'].includes(normalizeUploadGender(v)), {
      message: 'Gender must be Male or Female when provided',
    }),
  date_of_birth: z
    .string()
    .optional()
    .or(z.literal(''))
    .refine((v) => !v || /^\d{4}-\d{2}-\d{2}$/.test(v), {
      message: 'Date of birth must be YYYY-MM-DD when provided',
    }),
  employee_id: z.string().optional().or(z.literal('')),
  departments: z.string().min(1, 'At least one department is required'),
  ts_number: z.string().min(1, 'TS Number is required'),
  qualifications: z.string().optional().or(z.literal('')),
  specialization: z.string().optional().or(z.literal('')),
  assigned_subjects: z.string().optional().or(z.literal('')),
  teaching_assignments: z.string().optional().or(z.literal('')),
  _excelRow: z.number().optional(),
})

export function prepareTeacherRow(row) {
  const parsed = teacherRowSchema.parse(row)
  const departmentNames = parseDepartmentNames(parsed.departments)
  if (!departmentNames.length) {
    throw new Error('At least one department is required')
  }

  const teachingPairs = parseTeachingAssignmentPairs(parsed.teaching_assignments)
  const rawPairs = String(parsed.teaching_assignments || '')
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean)
  const invalidPairs = rawPairs.filter((pair) => !pair.includes(':'))
  if (invalidPairs.length) {
    throw new Error(
      `Teaching assignments must use Class:Subject format (invalid: ${invalidPairs.join(', ')})`
    )
  }

  return {
    ...parsed,
    email: parsed.email.trim().toLowerCase(),
    gender: parsed.gender ? normalizeUploadGender(parsed.gender) : '',
    departmentNames,
    assignedSubjectNames: parseAssignedSubjectNames(parsed.assigned_subjects),
    teachingPairs,
  }
}
