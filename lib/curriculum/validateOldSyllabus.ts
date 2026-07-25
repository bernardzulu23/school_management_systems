/**
 * Zod validators for old-syllabus and past-paper JSON (mirrors JSON Schema docs).
 * Uses Zod to match the rest of the CBC ingestion stack (no AJV dependency).
 */
import { z } from 'zod'

export const OLD_SYLLABUS_DOMAINS = [
  'Numbers & Calculations',
  'Algebra',
  'Geometry',
  'Computers',
  'Measures',
  'Probability & Statistics',
  'Relations',
] as const

const DomainSchema = z.enum(OLD_SYLLABUS_DOMAINS)

const SpecificOutcomeSchema = z.object({
  outcomeId: z.string().min(1),
  statement: z.string().min(3),
  knowledge: z.array(z.string()),
  skills: z.array(z.string()),
  values: z.array(z.string()),
})

const SubtopicSchema = z.object({
  subtopicId: z.string().min(1),
  subtopicName: z.string().min(1),
  specificOutcomes: z.array(SpecificOutcomeSchema).min(1),
})

const TopicSchema = z.object({
  topicId: z.string().regex(/^\d{2}\.\d+$/),
  topicName: z.string().min(1),
  domain: DomainSchema,
  subtopics: z.array(SubtopicSchema).min(1),
})

const GradeContentSchema = z.object({
  grade: z.union([z.literal(10), z.literal(11), z.literal(12)]),
  generalOutcomes: z.array(z.string()).optional(),
  keyCompetences: z.array(z.string()).optional(),
  topics: z.array(TopicSchema).min(1),
})

export const OldSyllabusDocumentSchema = z.object({
  subject: z.string().min(1),
  level: z.literal('O-LEVEL'),
  sourceDocument: z
    .object({
      publisher: z.string().optional(),
      year: z.number().int().optional(),
      isbn: z.string().optional(),
    })
    .optional(),
  timeAllocation: z
    .object({
      periodsPerWeek: z.number().int().min(1).optional(),
      minutesPerPeriod: z.number().int().min(1).optional(),
    })
    .optional(),
  assessmentPhilosophy: z
    .object({
      structureKnown: z.literal(false),
    })
    .optional(),
  domains: z.array(DomainSchema).min(1),
  gradeContent: z.array(GradeContentSchema).min(1),
  verticalProgression: z
    .array(
      z.object({
        domain: z.string().optional(),
        topic: z.string().optional(),
        grade10Outcomes: z.array(z.any()).optional(),
        grade11Outcomes: z.array(z.any()).optional(),
        grade12Outcomes: z.array(z.any()).optional(),
      })
    )
    .optional(),
})

const PastPaperSectionSchema = z
  .object({
    sectionLabel: z.string().nullable().optional(),
    questionCount: z.number().int().min(1),
    choiceRule: z.enum(['answer_all', 'answer_n_of_m']),
    chooseCount: z.number().int().min(1).optional(),
    totalMarks: z.number().int().optional(),
    marksPerQuestion: z.number().int().optional(),
    answerLocation: z.string().optional(),
  })
  .superRefine((section, ctx) => {
    if (section.choiceRule === 'answer_n_of_m' && section.chooseCount == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'chooseCount is required when choiceRule is answer_n_of_m',
        path: ['chooseCount'],
      })
    }
  })

export const PastPaperStructureSchema = z.object({
  paperNumber: z.number().int(),
  year: z.number().int().min(1990).max(2100),
  totalMarks: z.number().int().min(1),
  durationMinutes: z.number().int().min(1),
  calculatorAllowed: z.boolean(),
  formulaSheetProvided: z.boolean().optional(),
  roundingRule: z.string().optional(),
  sections: z.array(PastPaperSectionSchema).min(1),
  topicCoverage: z
    .array(
      z.object({
        topic: z.string().optional(),
        questionRefs: z.array(z.string()).optional(),
        typicalMarks: z.number().int().optional(),
        needsReview: z.boolean().optional(),
      })
    )
    .optional(),
  needsReview: z.boolean().optional(),
})

function zodIssuesToAjvLike(error) {
  return (error?.issues || []).map((issue) => ({
    instancePath: '/' + (issue.path || []).join('/'),
    message: issue.message,
    keyword: issue.code,
  }))
}

export function validateOldSyllabusJson(data) {
  const parsed = OldSyllabusDocumentSchema.safeParse(data)
  return {
    valid: parsed.success,
    errors: parsed.success ? [] : zodIssuesToAjvLike(parsed.error),
    data: parsed.success ? parsed.data : null,
  }
}

export function validatePastPaperJson(data) {
  const parsed = PastPaperStructureSchema.safeParse(data)
  return {
    valid: parsed.success,
    errors: parsed.success ? [] : zodIssuesToAjvLike(parsed.error),
    data: parsed.success ? parsed.data : null,
  }
}
