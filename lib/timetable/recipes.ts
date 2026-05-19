import type { Prisma } from '@prisma/client'

/** Prisma JSON columns reject `Record<string, unknown>[]`; round-trip through JSON. */
export function toPrismaJsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value ?? null)) as Prisma.InputJsonValue
}

export type RecipeStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED'
export type RecipeBlockType = 'SINGLE' | 'DOUBLE' | 'TRIPLE' | 'QUAD'
export type RecipeConstraintType = 'HARD' | 'SOFT'

export interface RecipeBlock {
  id: string
  recipeId: string
  type: RecipeBlockType
  size: number
  quantity: number
  placementPriority: number
  preferredDays: string[]
  preferredPeriods: number[]
  forbiddenDays: string[]
  forbiddenPeriods: number[]
  allowSplitAcrossBreaks: boolean
  isLocked: boolean
}

export interface RecipeConstraint {
  id: string
  recipeId: string
  type: RecipeConstraintType
  priority: number
  config: Record<string, unknown>
}

export interface SchedulingRecipe {
  id: string
  schoolId: string
  teachingAssignmentId: string
  teacherId: string
  subjectId: string
  classId: string
  status: RecipeStatus
  season?: string | null
  seasonVariantOfId?: string | null
  expectedPeriodsPerWeek?: number | null
  placementPriority: number
  isValid: boolean
  validationErrors?: unknown | null
  validatedAt?: string | null
  createdAt: string
  updatedAt: string
  blocks: RecipeBlock[]
  constraints: RecipeConstraint[]
}

export type CreateRecipeRequest = {
  teachingAssignmentId: string
  season?: string | null
  expectedPeriodsPerWeek?: number | null
  placementPriority?: number
  blocks: Array<{
    type: RecipeBlockType
    size: number
    quantity: number
    placementPriority?: number
    preferredDays?: string[]
    preferredPeriods?: number[]
    forbiddenDays?: string[]
    forbiddenPeriods?: number[]
    allowSplitAcrossBreaks?: boolean
    isLocked?: boolean
  }>
  constraints?: Array<{
    type: RecipeConstraintType
    priority?: number
    config: Record<string, unknown>
  }>
}

export type CreateRecipeResponse =
  | { success: true; data: SchedulingRecipe }
  | { success: false; error: string; details?: unknown }

export type UpdateRecipeRequest = Partial<Omit<CreateRecipeRequest, 'teachingAssignmentId'>> & {
  status?: RecipeStatus
}

export type UpdateRecipeResponse =
  | { success: true; data: SchedulingRecipe }
  | { success: false; error: string; details?: unknown }

export type ListRecipesResponse =
  | { success: true; data: SchedulingRecipe[] }
  | { success: false; error: string; details?: unknown }

export type ValidateRecipeResponse =
  | {
      success: true
      isValid: boolean
      result: { errors: unknown[]; warnings: unknown[]; totalPeriods: number }
    }
  | { success: false; error: string; details?: unknown }
