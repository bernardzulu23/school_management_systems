/**
 * Persist EoC validator output to EczValidationLog (+ logger).
 */
import { prisma } from '@/lib/prisma'
import { logger, captureError } from '@/lib/utils/logger'
import type { ValidationIssue } from '@/lib/ecz/eoc/question-validator'

export type EczValidationSourceValue = 'ecz_practice' | 'ecz_exam_questions' | 'quiz_maker'

export type WriteEczValidationLogInput = {
  schoolId: string
  source: EczValidationSourceValue
  generationId: string
  clientItemId: string
  aiRequestId?: string | null
  requestId?: string | null
  subjectCode: string
  topicTag: string
  resolvedEocId?: string | null
  examLevelOrForm?: string | null
  valid: boolean
  issues: ValidationIssue[]
  meta?: Record<string, unknown> | null
}

/**
 * Write one validation log row. Never throws to callers — failures are logged.
 * @returns created id, or null on failure / missing table
 */
export async function writeEczValidationLog(
  input: WriteEczValidationLogInput
): Promise<string | null> {
  const log = logger({ route: 'ecz-eoc:validation-log' })
  const payload = {
    schoolId: input.schoolId,
    source: input.source,
    generationId: input.generationId,
    clientItemId: input.clientItemId,
    aiRequestId: input.aiRequestId || null,
    requestId: input.requestId || null,
    subjectCode: input.subjectCode,
    topicTag: input.topicTag,
    resolvedEocId: input.resolvedEocId || null,
    examLevelOrForm: input.examLevelOrForm || null,
    valid: Boolean(input.valid),
    issues: input.issues || [],
    meta: input.meta ?? undefined,
  }

  if (!payload.valid || (payload.issues && payload.issues.length)) {
    log.warn('ECZ EoC validation result', {
      schoolId: payload.schoolId,
      source: payload.source,
      generationId: payload.generationId,
      clientItemId: payload.clientItemId,
      valid: payload.valid,
      issueCount: Array.isArray(payload.issues) ? payload.issues.length : 0,
      issues: payload.issues,
      resolvedEocId: payload.resolvedEocId,
      topicTag: payload.topicTag,
    })
  } else {
    log.info('ECZ EoC validation passed', {
      schoolId: payload.schoolId,
      source: payload.source,
      generationId: payload.generationId,
      clientItemId: payload.clientItemId,
    })
  }

  try {
    const row = await prisma.eczValidationLog.create({ data: payload })
    return row.id
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error || '')
    const code =
      typeof error === 'object' && error && 'code' in error ? String((error as any).code) : ''
    // Soft-fail when migration not yet applied so routes never 500 solely due to logging.
    if (
      code === 'P2021' ||
      code === 'P2022' ||
      /EczValidationLog/i.test(msg) ||
      /does not exist/i.test(msg)
    ) {
      log.warn('EczValidationLog unavailable — logged to logger only', { message: msg })
      return null
    }
    captureError(error, { route: 'ecz-eoc:validation-log', schoolId: input.schoolId })
    return null
  }
}
