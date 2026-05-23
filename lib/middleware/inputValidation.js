import { z } from 'zod'
import { NextResponse } from 'next/server'

// 1. Auth Schemas
export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
  subdomain: z.string().optional(),
  rememberMe: z.boolean().optional(),
})

export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters').optional(),
  role: z
    .string()
    .transform((v) =>
      String(v || '')
        .trim()
        .toLowerCase()
    )
    .refine((v) => ['student', 'teacher', 'hod', 'headteacher'].includes(v), 'Invalid role'),
  // Additional fields based on role
  student_id: z.string().optional(),
  employee_id: z.string().optional(),
  department: z.string().optional(),
})

export const studentSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  class_id: z.string().min(1, 'Class is required'),
  student_id: z.string().optional(),
  selected_subjects: z.array(z.string()).optional(),
})

// 2. Generic Validation Function
export async function validateRequest(schema, data) {
  try {
    return { success: true, data: schema.parse(data) }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        errors: error.errors.map((err) => ({
          path: err.path.join('.'),
          message: err.message,
        })),
      }
    }
    return { success: false, errors: [{ path: 'unknown', message: 'Validation failed' }] }
  }
}

// 3. Output Sanitization (Simple)
export function sanitizeOutput(data) {
  if (typeof data !== 'object' || data === null) return data

  const sanitized = Array.isArray(data) ? [] : {}

  for (const [key, value] of Object.entries(data)) {
    // Basic sensitive field removal
    if (['password', 'hash', 'salt', 'secret', 'token'].includes(key.toLowerCase())) {
      continue
    }

    if (typeof value === 'string') {
      // Basic HTML escaping
      sanitized[key] = value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;')
    } else if (typeof value === 'object') {
      sanitized[key] = sanitizeOutput(value)
    } else {
      sanitized[key] = value
    }
  }

  return sanitized
}
