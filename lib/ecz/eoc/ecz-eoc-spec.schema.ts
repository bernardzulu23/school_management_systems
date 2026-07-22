/**
 * ECZ Assessment Scheme spec — subject-agnostic schema.
 *
 * One JSON file per subject, extracted from
 * "ECSEOL_Assessment_Schemes_22_4_2026.pdf", conforms to this shape.
 * This is the single source of truth the generator prompts against
 * and the validator checks against. If it's not in this file, the
 * AI has no business inventing it.
 */
import { z } from 'zod'

export const BloomLevel = z.enum([
  'remembering',
  'understanding',
  'applying',
  'analysing',
  'evaluating',
  'creating',
])

export const ComponentType = z.enum(['SBA', 'FINAL_EXAM'])

/**
 * How an EoC is matched to a generated item:
 * - topic: match syllabus topic names (default; Mathematics-style).
 * - taskType: match investigation/analysis/project-style task labels
 *   (Agricultural Science EoC1/4/6 style). Topics may still appear in
 *   unverifiedTopicAliases as provisional content anchors.
 */
export const ResolutionMode = z.enum(['topic', 'taskType'])

/** A single bullet under an Element of Construct. */
export const SubSkill = z.object({
  id: z.string(),
  label: z.string(),
  /** Verified against real CDC syllabus wording. */
  topicAliases: z.array(z.string()),
  /**
   * Topics with no official EoC bullet (e.g. Matrices, Vectors).
   * resolveTopicToEoc still resolves these with verified: false.
   */
  unverifiedTopicAliases: z.array(z.string()).default([]),
  /**
   * Task-type labels for skill-lens EoCs (investigation, analysis, project…).
   * Used when ElementOfConstruct.resolutionMode === 'taskType'.
   */
  taskTypeAliases: z.array(z.string()).default([]),
  /** Extraction / routing note for curriculum leads; not used at runtime. */
  note: z.string().optional(),
})

export const ElementOfConstruct = z.object({
  id: z.string(),
  description: z.string(),
  subSkills: z.array(SubSkill),
  /** Defaults to topic for Math-style specs that omit the field. */
  resolutionMode: ResolutionMode.default('topic'),
})

export const KeyCompetence = z.enum([
  'collaboration',
  'communication',
  'digital_literacy',
  'critical_thinking',
  'financial_literacy',
  'analytical_thinking',
  'problem_solving',
  'creativity_and_innovation',
])

export const ExemplarPart = z.object({
  label: z.string(),
  marks: z.number().int().positive(),
  bloomLevel: BloomLevel,
})

/** Compressed reference to one real exemplar item (few-shot anchor). */
export const ExemplarSummary = z.object({
  eocId: z.string(),
  scenarioTheme: z.string(),
  parts: z.array(ExemplarPart),
  keyCompetences: z.array(KeyCompetence),
})

export const TestDesign = z.object({
  components: z.array(
    z.object({
      type: ComponentType,
      code: z.string(),
      formLevel: z.string(),
      numItems: z.number().int().positive(),
      totalMarks: z.number().int().positive(),
      structureNotes: z.string(),
      bloomRange: z.tuple([BloomLevel, BloomLevel]),
    })
  ),
  scenarioRequired: z.boolean(),
  minPartsPerScenarioItem: z.number().int().min(1),
})

export const ScoringCriteria = z.object({
  rules: z.array(z.string()),
})

export const EczSubjectSpec = z.object({
  subjectCode: z.string(),
  subjectName: z.string(),
  syllabusYear: z.number().int(),
  construct: z.string(),
  elementsOfConstruct: z.array(ElementOfConstruct),
  testDesign: TestDesign,
  scoringCriteria: ScoringCriteria,
  exemplars: z.array(ExemplarSummary),
})

export type EczSubjectSpecT = z.infer<typeof EczSubjectSpec>
export type ElementOfConstructT = z.infer<typeof ElementOfConstruct>
export type SubSkillT = z.infer<typeof SubSkill>

/**
 * Shape passed as the schema argument to generateAIObject for EoC-anchored
 * generation. Forces multi-part scenario items instead of bare one-liners.
 */
export const GeneratedQuestionPart = z.object({
  label: z.string(),
  text: z.string(),
  marks: z.number().int().positive(),
  bloomLevel: BloomLevel,
})

export const GeneratedQuestion = z.object({
  subjectCode: z.string(),
  eocId: z.string(),
  topicTag: z.string(),
  formLevel: z.string(),
  componentType: ComponentType,
  scenarioContext: z
    .string()
    .describe(
      'A real-life, Zambia-relevant scenario (2-5 sentences) that the parts below are all drawn from. Not a bare instruction.'
    ),
  parts: z.array(GeneratedQuestionPart).min(1),
  keyCompetences: z.array(KeyCompetence).min(1),
})

export type GeneratedQuestionT = z.infer<typeof GeneratedQuestion>
