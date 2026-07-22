/**
 * EoC-anchored ECZ question generator (sidecar).
 *
 * Uses generateAIObject (not bare generateObject) so retries / provider
 * fallback match the rest of ZSMS AI. Does NOT replace buildEczPracticePrompt
 * / buildEczExamPrompt — optional path for side-by-side comparison later.
 */
import { generateAIObject } from '@/lib/ai/client'
import {
  GeneratedQuestion,
  type EczSubjectSpecT,
  type GeneratedQuestionT,
} from '@/lib/ecz/eoc/ecz-eoc-spec.schema'
import {
  resolveTopicToEoc,
  validateQuestion,
  type ValidationIssue,
  type ValidationResult,
} from '@/lib/ecz/eoc/question-validator'
import { logger } from '@/lib/utils/logger'

export type GenerateEczQuestionInput = {
  spec: EczSubjectSpecT
  topicTag: string
  formLevel: string
  componentType: 'SBA' | 'FINAL_EXAM'
  /** When false, skip the second (repair) generateAIObject call. Default true. */
  autoRepair?: boolean
  /** Forwarded to validateQuestion. Default true. */
  runSemanticCheck?: boolean
}

export type GenerateEczQuestionResult = {
  question: GeneratedQuestionT | null
  validation: ValidationResult
  repaired: boolean
  resolvedEocId: string | null
  verifiedMapping: boolean | null
}

function buildSystemPrompt(spec: EczSubjectSpecT): string {
  return `You are an ECZ ECSEOL assessment specialist for Zambian secondary schools.
Generate ONE multi-part scenario exam/SBA item that strictly follows the subject assessment scheme.
Subject: ${spec.subjectName} (code ${spec.subjectCode}, year ${spec.syllabusYear}).
Overall construct: ${spec.construct}
Scoring rules:
${spec.scoringCriteria.rules.map((r) => `- ${r}`).join('\n')}
Return JSON matching the requested schema only. Never invent EoC ids outside the scheme.`
}

function buildUserPrompt(params: {
  spec: EczSubjectSpecT
  topicTag: string
  formLevel: string
  componentType: 'SBA' | 'FINAL_EXAM'
  eocId: string
  eocDescription: string
  subSkillLabel: string
  verified: boolean
  repairIssues?: ValidationIssue[]
}): string {
  const {
    spec,
    topicTag,
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
  const exemplar = spec.exemplars.find((e) => e.eocId === eocId)
  const expectedMarks = component ? component.totalMarks / component.numItems : 20
  const minParts = spec.testDesign.minPartsPerScenarioItem

  let prompt = `Create one ${componentType} item for ${formLevel}.
Topic tag (must stay on this skill): "${topicTag}"
Element of Construct: ${eocId} — ${eocDescription}
Sub-skill: ${subSkillLabel}
Mapping verified against official EoC bullets: ${verified ? 'yes' : 'NO — provisional; still generate on this EoC but keep content faithful to the sub-skill'}
${component ? `Bloom range allowed: ${component.bloomRange[0]} → ${component.bloomRange[1]}` : ''}
${component ? `Structure notes: ${component.structureNotes}` : ''}
Target roughly ${expectedMarks} total marks across at least ${minParts} parts.
subjectCode must be "${spec.subjectCode}". eocId must be "${eocId}". topicTag must be "${topicTag}".
formLevel must be "${formLevel}". componentType must be "${componentType}".
Write a Zambia-relevant real-life scenarioContext (2–5 sentences), then multi-part questions drawn from it.`

  if (exemplar) {
    prompt += `

Few-shot exemplar theme for ${eocId} (do NOT copy verbatim — invent a fresh Zambia scenario):
Theme: ${exemplar.scenarioTheme}
Part shape: ${exemplar.parts.map((p) => `${p.label} ${p.marks}m ${p.bloomLevel}`).join('; ')}
Key competences to prefer: ${exemplar.keyCompetences.join(', ')}`
  }

  if (params.repairIssues?.length) {
    prompt += `

PREVIOUS ATTEMPT FAILED VALIDATION. Fix ALL of these issues in the new JSON:
${params.repairIssues.map((i) => `- [${i.severity}/${i.code}] ${i.message}`).join('\n')}`
  }

  return prompt
}

/**
 * Generate one EoC-anchored question, optionally auto-repair once on validation failure.
 */
export async function generateEczQuestion(
  input: GenerateEczQuestionInput
): Promise<GenerateEczQuestionResult> {
  const log = logger({ route: 'ecz-eoc:generator' })
  const { spec, topicTag, formLevel, componentType } = input
  const autoRepair = input.autoRepair !== false
  const runSemanticCheck = input.runSemanticCheck !== false

  const resolved = resolveTopicToEoc(spec, topicTag)
  if (!resolved) {
    const validation: ValidationResult = {
      valid: false,
      issues: [
        {
          severity: 'error',
          code: 'UNKNOWN_TOPIC',
          message: `Topic tag "${topicTag}" does not resolve to any EoC sub-skill in ${spec.subjectName}.`,
        },
      ],
    }
    log.warn('EoC generation blocked — unknown topic', { topicTag, subjectCode: spec.subjectCode })
    return {
      question: null,
      validation,
      repaired: false,
      resolvedEocId: null,
      verifiedMapping: null,
    }
  }

  const subSkill = resolved.eoc.subSkills.find((s) => s.id === resolved.subSkillId)
  const subSkillLabel = subSkill?.label || resolved.eoc.description

  const system = buildSystemPrompt(spec)
  const user = buildUserPrompt({
    spec,
    topicTag,
    formLevel,
    componentType,
    eocId: resolved.eoc.id,
    eocDescription: resolved.eoc.description,
    subSkillLabel,
    verified: resolved.verified,
  })

  const first = await generateAIObject(GeneratedQuestion, system, user, {
    temperature: 0.55,
    maxOutputTokens: 3500,
  })

  let question = first.object as GeneratedQuestionT
  let validation = await validateQuestion(spec, question, { runSemanticCheck })
  let repaired = false

  if (!validation.valid && autoRepair) {
    log.warn('EoC generation failed validation — attempting repair', {
      topicTag,
      eocId: resolved.eoc.id,
      issues: validation.issues,
    })
    const repairUser = buildUserPrompt({
      spec,
      topicTag,
      formLevel,
      componentType,
      eocId: resolved.eoc.id,
      eocDescription: resolved.eoc.description,
      subSkillLabel,
      verified: resolved.verified,
      repairIssues: validation.issues,
    })
    const second = await generateAIObject(GeneratedQuestion, system, repairUser, {
      temperature: 0.4,
      maxOutputTokens: 3500,
    })
    question = second.object as GeneratedQuestionT
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
    question: validation.valid || question ? question : null,
    validation,
    repaired,
    resolvedEocId: resolved.eoc.id,
    verifiedMapping: resolved.verified,
  }
}
