import { z } from 'zod'

/**
 * Common Zod Validation Schemas
 * Centralized for use in both frontend forms and backend API routes.
 */

export const emailSchema = z.string().email('Invalid email address')

export const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character')

export const nameSchema = z.string().min(2, 'Name must be at least 2 characters')

export const roleSchema = z.enum(['STUDENT', 'TEACHER', 'PARENT', 'ADMIN', 'HOD', 'HEADTEACHER'])

export const contactNumberSchema = z.string()
  .regex(/^\+?[0-9\s-]{10,15}$/, 'Invalid contact number format')
  .optional()
  .or(z.literal(''))

// --- FORM SCHEMAS ---

export const commonUserSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema.optional(),
  role: roleSchema,
  gender: z.enum(['Male', 'Female', 'Other']).optional(),
  contact_number: contactNumberSchema,
  address: z.string().optional()
})

export const teacherValidationSchema = commonUserSchema.extend({
  department: z.string().min(1, 'Department is required'),
  specialization: z.string().optional(),
  selected_subjects: z.array(z.string()).min(1, 'At least one subject must be selected')
})

export const studentValidationSchema = commonUserSchema.extend({
  class: z.string().min(1, 'Class is required'),
  exam_number: z.string().optional(),
  parent_father_name: z.string().optional(),
  parent_mother_name: z.string().optional(),
  guardian_name: z.string().optional(),
  emergency_contact_name: z.string().min(1, 'Emergency contact name is required'),
  emergency_contact_phone: contactNumberSchema,
  selected_subjects: z.array(z.string()).min(1, 'At least one subject must be selected')
})

export const hodValidationSchema = commonUserSchema.extend({
  department: z.string().min(1, 'Department is required')
})

// --- GENERIC VALIDATOR ---

export function validate(schema, data) {
  const result = schema.safeParse(data)
  if (!result.success) {
    const errors = {}
    result.error.issues.forEach((issue) => {
      errors[issue.path[0]] = issue.message
    })
    return { success: false, errors }
  }
  return { success: true, data: result.data }
}
