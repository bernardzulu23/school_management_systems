/**
 * EoC-anchored ECZ question generator — subject-agnostic reusable path.
 *
 * Topic (+ optional taskType) is resolved to an EoC BEFORE the model is called.
 * Output is forced through GeneratedQuestion + validateQuestion, with one repair pass.
 * Uses generateAIObject so retries / provider fallback match the rest of ZSMS AI.
 */
import { generateAIObject } from '@/lib/ai/client'
import {
  GeneratedQuestion,
  type EczSubjectSpecT,
  type GeneratedQuestionT,
} from '@/lib/ecz/eoc/ecz-eoc-spec.schema'
import {
  resolveEoc,
  requiresTaskType,
  validateQuestion,
  type ValidationIssue,
  type ValidationResult,
} from '@/lib/ecz/eoc/question-validator'
import { logger } from '@/lib/utils/logger'

export { requiresTaskType }

export class UnknownTopicError extends Error {
  constructor(topicTag: string, subjectName: string, taskTypeWasMissing: boolean) {
    super(
      taskTypeWasMissing
        ? `"${topicTag}" did not resolve in ${subjectName}, and no taskType was supplied. This subject has skill-lens EoCs (investigation/analysis/general) that only resolve via taskType, not topic alone — call requiresTaskType() first and collect one from the caller before generating.`
        : `"${topicTag}" does not resolve to any EoC in ${subjectName}. This means the syllabus topic list and the ECZ EoC spec are out of sync — check the ingestion output before generating anything for this topic.`
    )
    this.name = 'UnknownTopicError'
  }
}

export type GenerateEczQuestionInput = {
  spec: EczSubjectSpecT
  topicTag: string
  /** Required when requiresTaskType(spec, topicTag) returns options. */
  taskType?: string
  formLevel: string
  componentType: 'SBA' | 'FINAL_EXAM'
  autoRepair?: boolean
  runSemanticCheck?: boolean
}

export type GenerateEczQuestionResult = {
  ok: boolean
  question: GeneratedQuestionT | null
  validation: ValidationResult
  repaired: boolean
  resolvedEocId: string | null
  verifiedMapping: boolean | null
  resolvedVia: 'topic' | 'taskType' | 'topic-unverified' | null
}

function buildPrompt(params: {
  spec: EczSubjectSpecT
  topicTag: string
  taskType?: string
  formLevel: string
  componentType: 'SBA' | 'FINAL_EXAM'
  eocId: string
  eocDescription: string
  subSkillLabel: string
  verified: boolean
  repairIssues?: ValidationIssue[]
}): { system: string; prompt: string } {
  const {
    spec,
    topicTag,
    taskType,
    formLevel,
    componentType,
    eocId,
    eocDescription,
    subSkillLabel,
    verified,
  } = params

  const component = spec.testDesign.components.find(
    (c) => c.type === componentType && c.formLevel === formLevel
  )
  const anchor = spec.exemplars.find((e) => e.eocId === eocId)
  const expectedMarks = component ? component.totalMarks / component.numItems : 20
  const minParts = spec.testDesign.minPartsPerScenarioItem
  const bloom = component?.bloomRange?.join(', ') ?? 'understanding, evaluating'
  const scoringHint = spec.scoringCriteria.rules[0] || 'Follow ECZ scoring rules.'

  const system = `You write exam items for the Zambian Examinations Council (ECZ) ${spec.subjectName} assessment, strictly following the official ECZ Assessment Scheme — you are not writing a generic textbook question.

Hard rules:
- The item MUST be one continuous real-life scenario (2-5 sentences), grounded in a plausible Zambian context, followed by ${minParts}+ lettered parts that all draw from that SAME scenario. Never a bare instruction with no scenario.
- Every part must genuinely require "${subSkillLabel}" to solve — not just mention the topic name. This is the sub-skill under ${eocId}: "${eocDescription}".
- Bloom's levels across the parts must stay within [${bloom}] for this component.
- Allocate marks per part consistently with: ${scoringHint}
- Tag 1-3 key competences genuinely exercised (not a generic default set).
- subjectCode must be "${spec.subjectCode}"; eocId must be "${eocId}"; topicTag must be "${topicTag}".`

  const anchorBlock = anchor
    ? `Reference shape (structure only, invent new numbers/context — do not reuse this scenario):
EoC: ${anchor.eocId} — scenario theme: "${anchor.scenarioTheme}"
Parts: ${anchor.parts.map((p) => `${p.label} [${p.marks}m, ${p.bloomLevel}]`).join(', ')}
Key competences: ${anchor.keyCompetences.join(', ')}`
    : ''

  const repairBlock = params.repairIssues?.length
    ? `\n\nThe previous attempt FAILED validation for these reasons — fix them, do not repeat them:\n${params.repairIssues
        .map((i) => `- [${i.code}] ${i.message}`)
        .join('\n')}`
    : ''

  const prompt = `Subject: ${spec.subjectName} (${spec.subjectCode})
Form level: ${formLevel}
Component: ${componentType}
Topic tag (as shown to teachers/learners): "${topicTag}"${taskType ? `\nTask type: "${taskType}"` : ''}
Target EoC: ${eocId} — ${eocDescription}
Target sub-skill: ${subSkillLabel}
Mapping verified against official EoC bullets: ${verified ? 'yes' : 'NO — provisional; keep content faithful to the sub-skill'}
${component ? `Structure notes: ${component.structureNotes}` : ''}
Target roughly ${expectedMarks} total marks across at least ${minParts} parts.

${anchorBlock}${repairBlock}

Write one original scenario-based item testing this sub-skill.`

  return { system, prompt }
}

/**
 * Generate one EoC-anchored question for ANY subject that has an EczSubjectSpec.
 */
export async function generateEczQuestion(
  input: GenerateEczQuestionInput
): Promise<GenerateEczQuestionResult> {
  const log = logger({ route: 'ecz-eoc:generator' })
  const { spec, topicTag, taskType, formLevel, componentType } = input
  const autoRepair = input.autoRepair !== false
  const runSemanticCheck = input.runSemanticCheck !== false

  const resolved = resolveEoc(spec, topicTag, taskType)
  if (!resolved) {
    const taskTypeModeExists = spec.elementsOfConstruct.some((e) => e.resolutionMode === 'taskType')
    const missingTaskType = Boolean(taskTypeModeExists && !taskType)
    const err = new UnknownTopicError(topicTag, spec.subjectName, missingTaskType)
    const validation: ValidationResult = {
      valid: false,
      issues: [{ severity: 'error', code: 'UNKNOWN_TOPIC', message: err.message }],
    }
    log.warn('EoC generation blocked — unknown topic', {
      topicTag,
      taskType,
      subjectCode: spec.subjectCode,
    })
    return {
      ok: false,
      question: null,
      validation,
      repaired: false,
      resolvedEocId: null,
      verifiedMapping: null,
      resolvedVia: null,
    }
  }

  const subSkill = resolved.eoc.subSkills.find((s) => s.id === resolved.subSkillId)
  const subSkillLabel = subSkill?.label || resolved.eoc.description

  const attempt = async (repairIssues?: ValidationIssue[]) => {
    const { system, prompt } = buildPrompt({
      spec,
      topicTag,
      taskType,
      formLevel,
      componentType,
      eocId: resolved.eoc.id,
      eocDescription: resolved.eoc.description,
      subSkillLabel,
      verified: resolved.verified,
      repairIssues,
    })
    const { object } = await generateAIObject(GeneratedQuestion, system, prompt, {
      temperature: repairIssues?.length ? 0.4 : 0.55,
      maxOutputTokens: 3500,
    })
    // Stamp taskType — model must not invent this field.
    return { ...(object as GeneratedQuestionT), taskType: taskType || undefined }
  }

  let question = await attempt()
  let validation = await validateQuestion(spec, question, { runSemanticCheck })
  let repaired = false

  if (!validation.valid && autoRepair) {
    log.warn('EoC generation failed validation — attempting repair', {
      topicTag,
      eocId: resolved.eoc.id,
      issues: validation.issues,
    })
    question = await attempt(validation.issues)
    validation = await validateQuestion(spec, question, { runSemanticCheck })
    repaired = true
  }

  if (!validation.valid) {
    log.warn('EoC generation still invalid after optional repair', {
      topicTag,
      eocId: resolved.eoc.id,
      repaired,
      issues: validation.issues,
    })
  }

  return {
    ok: validation.valid,
    question,
    validation,
    repaired,
    resolvedEocId: resolved.eoc.id,
    verifiedMapping: resolved.verified,
    resolvedVia: resolved.resolvedVia,
  }
}
