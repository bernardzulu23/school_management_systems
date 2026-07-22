/**
 * Side-by-side helper ready for ecz-practice / ecz-exam-questions routes.
 *
 * Call AFTER existing generation succeeds. Does not change response shape.
 * Routes are NOT wired yet — import and call when ready:
 *
 *   void runValidationSideBySide({ ... }).catch(() => {})
 *   // or await if you prefer in-request logging
 */
import crypto from 'crypto'
import { loadEocSpec } from '@/lib/ecz/eoc/load-eoc-spec'
import {
  mapPracticeQuestionToGeneratedQuestion,
  mapScenarioToGeneratedQuestion,
} from '@/lib/ecz/eoc/mapExistingGeneration'
import { resolveTopicToEoc, validateQuestion } from '@/lib/ecz/eoc/question-validator'
import {
  writeEczValidationLog,
  type EczValidationSourceValue,
} from '@/lib/ecz/eoc/writeValidationLog'
import { logger } from '@/lib/utils/logger'
import type { GeneratedQuestionT } from '@/lib/ecz/eoc/ecz-eoc-spec.schema'

export type SideBySideItem =
  | { kind: 'generated'; clientItemId: string; question: GeneratedQuestionT }
  | {
      kind: 'scenario'
      scenario: Parameters<typeof mapScenarioToGeneratedQuestion>[0]['scenario']
    }
  | {
      kind: 'practice_question'
      question: Parameters<typeof mapPracticeQuestionToGeneratedQuestion>[0]['question']
    }

export type RunValidationSideBySideInput = {
  schoolId: string
  source: EczValidationSourceValue
  /** Subject name / slug / ECZ subjectCode used to load the EoC JSON. */
  subject: string
  topicTag: string
  formLevel: string
  items: SideBySideItem[]
  generationId?: string
  aiRequestId?: string | null
  requestId?: string | null
  assessmentMode?: string | null
  /** Default false for side-by-side on legacy shapes (cheaper). */
  runSemanticCheck?: boolean
  meta?: Record<string, unknown>
}

export type SideBySideResult = {
  generationId: string
  results: Array<{
    clientItemId: string
    valid: boolean
    resolvedEocId: string | null
    logId: string | null
    issues: Awaited<ReturnType<typeof validateQuestion>>['issues']
  }>
}

/**
 * Validate mapped/generated items and write EczValidationLog rows.
 * Safe to fire-and-forget; returns aggregate results when awaited.
 */
export async function runValidationSideBySide(
  input: RunValidationSideBySideInput
): Promise<SideBySideResult> {
  const log = logger({ route: 'ecz-eoc:side-by-side' })
  const generationId = input.generationId || crypto.randomUUID()
  const spec = loadEocSpec(input.subject)

  if (!spec) {
    log.info('No EoC spec for subject — skipping side-by-side validation', {
      subject: input.subject,
      source: input.source,
    })
    return { generationId, results: [] }
  }

  const resolvedTopic = resolveTopicToEoc(spec, input.topicTag)
  const results: SideBySideResult['results'] = []

  for (const item of input.items || []) {
    let mapped: { question: GeneratedQuestionT; clientItemId: string } | null = null

    if (item.kind === 'generated') {
      mapped = { question: item.question, clientItemId: item.clientItemId }
    } else if (item.kind === 'scenario') {
      mapped = mapScenarioToGeneratedQuestion({
        spec,
        topicTag: input.topicTag,
        formLevel: input.formLevel,
        scenario: item.scenario,
        assessmentMode: input.assessmentMode,
      })
    } else if (item.kind === 'practice_question') {
      mapped = mapPracticeQuestionToGeneratedQuestion({
        spec,
        topicTag: input.topicTag,
        formLevel: input.formLevel,
        question: item.question,
        assessmentMode: input.assessmentMode,
      })
    }

    if (!mapped) continue

    const validation = await validateQuestion(spec, mapped.question, {
      runSemanticCheck: input.runSemanticCheck === true,
    })

    const logId = await writeEczValidationLog({
      schoolId: input.schoolId,
      source: input.source,
      generationId,
      clientItemId: mapped.clientItemId,
      aiRequestId: input.aiRequestId,
      requestId: input.requestId,
      subjectCode: spec.subjectCode,
      topicTag: input.topicTag,
      resolvedEocId: mapped.question.eocId || resolvedTopic?.eoc.id || null,
      examLevelOrForm: input.formLevel,
      valid: validation.valid,
      issues: validation.issues,
      meta: {
        ...(input.meta || {}),
        assessmentMode: input.assessmentMode || null,
        verifiedMapping: resolvedTopic?.verified ?? null,
        itemKind: item.kind,
      },
    })

    results.push({
      clientItemId: mapped.clientItemId,
      valid: validation.valid,
      resolvedEocId: mapped.question.eocId || null,
      logId,
      issues: validation.issues,
    })
  }

  return { generationId, results }
}
