/**
 * ECZ question validator.
 *
 * Two layers, run in order:
 *  1. STRUCTURAL — deterministic, free, catches "shape" problems.
 *  2. SEMANTIC — one generateAIObject call, catches content drift.
 */
import { z } from 'zod'
import { generateAIObject } from '@/lib/ai/client'
import {
  GeneratedQuestion,
  type EczSubjectSpecT,
  type GeneratedQuestionT,
  type ElementOfConstructT,
} from '@/lib/ecz/eoc/ecz-eoc-spec.schema'

export type ValidationIssue = {
  severity: 'error' | 'warning'
  code: string
  message: string
}

export type ValidationResult = {
  valid: boolean
  issues: ValidationIssue[]
}

/**
 * Resolve a human-facing topic tag to its EoC.
 * Verified aliases first; unverifiedTopicAliases second (verified: false).
 */
export function resolveTopicToEoc(
  spec: EczSubjectSpecT,
  topicTag: string
): { eoc: ElementOfConstructT; subSkillId: string; verified: boolean } | null {
  const needle = topicTag.trim().toLowerCase()
  if (!needle) return null

  for (const eoc of spec.elementsOfConstruct) {
    for (const sub of eoc.subSkills) {
      if (sub.topicAliases.some((a) => a.toLowerCase() === needle)) {
        return { eoc, subSkillId: sub.id, verified: true }
      }
    }
  }

  for (const eoc of spec.elementsOfConstruct) {
    for (const sub of eoc.subSkills) {
      if ((sub.unverifiedTopicAliases ?? []).some((a) => a.toLowerCase() === needle)) {
        return { eoc, subSkillId: sub.id, verified: false }
      }
    }
  }

  return null
}

function findSubSkillForTopic(spec: EczSubjectSpecT, eocId: string, topicTag: string) {
  const eoc = spec.elementsOfConstruct.find((e) => e.id === eocId)
  if (!eoc) return null
  const needle = topicTag.trim().toLowerCase()
  for (const sub of eoc.subSkills) {
    if (sub.topicAliases.some((a) => a.toLowerCase() === needle)) return { eoc, sub }
    if ((sub.unverifiedTopicAliases ?? []).some((a) => a.toLowerCase() === needle)) {
      return { eoc, sub }
    }
  }
  return null
}

/** Layer 1: structural validation. Synchronous, no network call. */
export function validateStructure(spec: EczSubjectSpecT, q: GeneratedQuestionT): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  if (q.subjectCode !== spec.subjectCode) {
    issues.push({
      severity: 'error',
      code: 'SUBJECT_MISMATCH',
      message: `Question subjectCode ${q.subjectCode} does not match spec ${spec.subjectCode}.`,
    })
  }

  const resolved = resolveTopicToEoc(spec, q.topicTag)
  if (!resolved) {
    issues.push({
      severity: 'error',
      code: 'UNKNOWN_TOPIC',
      message: `Topic tag "${q.topicTag}" does not resolve to any EoC sub-skill in ${spec.subjectName}. Likely a syllabus ingestion artifact — check topicAliases or re-ingest.`,
    })
  } else if (resolved.eoc.id !== q.eocId) {
    issues.push({
      severity: 'error',
      code: 'EOC_MISMATCH',
      message: `Topic "${q.topicTag}" resolves to ${resolved.eoc.id} ("${resolved.eoc.description}") but question is tagged ${q.eocId}.`,
    })
  } else if (!resolved.verified) {
    issues.push({
      severity: 'warning',
      code: 'UNVERIFIED_EOC_MAPPING',
      message: `Topic "${q.topicTag}" has no bullet in the official Elements of Construct — provisionally routed to ${resolved.eoc.id} ("${resolved.eoc.description}"), unconfirmed by a curriculum lead. Safe to save, but should carry a visible "unverified" marker wherever it's stored/displayed.`,
    })
  }

  const component = spec.testDesign.components.find(
    (c) => c.type === q.componentType && c.formLevel === q.formLevel
  )
  if (!component) {
    issues.push({
      severity: 'error',
      code: 'NO_MATCHING_COMPONENT',
      message: `No test-design component for ${q.componentType} at ${q.formLevel}.`,
    })
  } else {
    const order = [
      'remembering',
      'understanding',
      'applying',
      'analysing',
      'evaluating',
      'creating',
    ]
    const [min, max] = component.bloomRange
    for (const part of q.parts) {
      const idx = order.indexOf(part.bloomLevel)
      if (idx < order.indexOf(min) || idx > order.indexOf(max)) {
        issues.push({
          severity: 'error',
          code: 'BLOOM_OUT_OF_RANGE',
          message: `Part ${part.label} is at "${part.bloomLevel}", outside allowed range [${min}, ${max}] for ${q.componentType} at ${q.formLevel}.`,
        })
      }
    }

    const marksSum = q.parts.reduce((s, p) => s + p.marks, 0)
    const expectedPerItem = component.totalMarks / component.numItems
    if (Math.abs(marksSum - expectedPerItem) > expectedPerItem * 0.5) {
      issues.push({
        severity: 'warning',
        code: 'MARKS_OFF',
        message: `Item totals ${marksSum} marks; expected roughly ${expectedPerItem} for this component. Check part mark allocation.`,
      })
    }
  }

  if (spec.testDesign.scenarioRequired) {
    if (!q.scenarioContext || q.scenarioContext.trim().split(/\s+/).length < 15) {
      issues.push({
        severity: 'error',
        code: 'MISSING_SCENARIO',
        message: `Item has no substantive real-life scenario context (found ${q.scenarioContext?.length ?? 0} chars). ECZ items are scenario-based, not bare instructions.`,
      })
    }
    if (q.parts.length < spec.testDesign.minPartsPerScenarioItem) {
      issues.push({
        severity: 'error',
        code: 'TOO_FEW_PARTS',
        message: `Item has ${q.parts.length} part(s); minimum ${spec.testDesign.minPartsPerScenarioItem} expected for a scenario item.`,
      })
    }
  }

  if (!q.keyCompetences || q.keyCompetences.length === 0) {
    issues.push({
      severity: 'warning',
      code: 'NO_KEY_COMPETENCES',
      message: 'No key competences tagged (e.g. critical_thinking, financial_literacy).',
    })
  }

  return issues
}

const SemanticJudgement = z.object({
  matchesEoc: z.boolean(),
  reasoning: z.string().max(400),
  detectedTopic: z.string().describe('What this question is actually testing, in your own words'),
})

/**
 * Layer 2: semantic validation via generateAIObject (same Groq/fallback stack).
 */
export async function validateSemantics(
  spec: EczSubjectSpecT,
  q: GeneratedQuestionT
): Promise<ValidationIssue[]> {
  const found = findSubSkillForTopic(spec, q.eocId, q.topicTag)
  if (!found) {
    return []
  }
  const { sub } = found
  const fullText = [q.scenarioContext, ...q.parts.map((p) => `${p.label} ${p.text}`)].join('\n')

  const { object } = await generateAIObject(
    SemanticJudgement,
    'You are checking a Zambian ECZ exam question against the specific mathematical/subject skill it is supposed to test. Be strict: a question that only superficially mentions the topic, or tests a different skill under the same EoC, should fail.',
    `Sub-skill being tested (this is the ground truth): "${sub.label}"
Question content:
${fullText}
Does the actual mathematical/subject content of this question genuinely require the sub-skill above to solve it? Answer honestly even if the topic label matches — judge the content, not the label.`,
    { temperature: 0.2, maxOutputTokens: 600 }
  )

  if (!object.matchesEoc) {
    return [
      {
        severity: 'error',
        code: 'SEMANTIC_DRIFT',
        message: `Content does not actually test "${sub.label}". Model detected: "${object.detectedTopic}". Reasoning: ${object.reasoning}`,
      },
    ]
  }
  return []
}

/** Full pipeline: structural first (cheap, fails fast), then semantic if structure passes. */
export async function validateQuestion(
  spec: EczSubjectSpecT,
  rawQuestion: unknown,
  opts: { runSemanticCheck?: boolean } = { runSemanticCheck: true }
): Promise<ValidationResult> {
  const parsed = GeneratedQuestion.safeParse(rawQuestion)
  if (!parsed.success) {
    return {
      valid: false,
      issues: [
        {
          severity: 'error',
          code: 'SCHEMA_INVALID',
          message: parsed.error.message,
        },
      ],
    }
  }

  const structuralIssues = validateStructure(spec, parsed.data)
  const hasStructuralErrors = structuralIssues.some((i) => i.severity === 'error')
  let semanticIssues: ValidationIssue[] = []

  if (opts.runSemanticCheck !== false && !hasStructuralErrors) {
    semanticIssues = await validateSemantics(spec, parsed.data)
  }

  const issues = [...structuralIssues, ...semanticIssues]
  return {
    valid: !issues.some((i) => i.severity === 'error'),
    issues,
  }
}
