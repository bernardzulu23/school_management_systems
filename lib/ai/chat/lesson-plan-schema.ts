/**
 * Zod schema for chat-generated structured lesson plans (Phase 3).
 * Extends existing LessonPlan fields with optional Mermaid diagram and
 * validated visualAids for Cartesian planes, line graphs, and bar charts.
 */
import { z } from 'zod'

export const ChatLessonObjectiveSchema = z.object({
  objective: z.string().min(10),
  bloomsLevel: z.enum([
    'Remembering',
    'Understanding',
    'Applying',
    'Analysing',
    'Evaluating',
    'Creating',
  ]),
  competency: z.string(),
})

export const ChatLessonActivitySchema = z.object({
  phase: z.enum(['Introduction', 'Development', 'Conclusion']),
  durationMinutes: z.number().min(2).max(60),
  activity: z.string().min(20),
  teacherAction: z.string().min(5),
  learnerAction: z.string().min(5),
  resources: z.array(z.string()),
  assessmentCheck: z.string().optional(),
  zambiaCulturalContext: z.string().optional(),
})

const boundedNumber = z.number().finite().min(-1000).max(1000)

const PointSchema = z.object({
  x: boundedNumber,
  y: boundedNumber,
  label: z.string().max(40).optional(),
})

const SeriesSchema = z.object({
  name: z.string().min(1).max(60),
  points: z.array(PointSchema).min(2).max(40),
  color: z.string().max(20).optional(),
})

const AxisRangeSchema = z.object({
  min: boundedNumber,
  max: boundedNumber,
  label: z.string().max(40).optional(),
  step: z.number().positive().max(500).optional(),
})

const CartesianVisualSchema = z.object({
  type: z.literal('cartesian'),
  title: z.string().min(2).max(120),
  caption: z.string().max(300).optional(),
  xAxis: AxisRangeSchema,
  yAxis: AxisRangeSchema,
  series: z.array(SeriesSchema).min(1).max(4),
  showGrid: z.boolean().optional(),
})

const LineGraphVisualSchema = z.object({
  type: z.literal('line'),
  title: z.string().min(2).max(120),
  caption: z.string().max(300).optional(),
  xAxis: AxisRangeSchema,
  yAxis: AxisRangeSchema,
  series: z.array(SeriesSchema).min(1).max(4),
  showGrid: z.boolean().optional(),
})

const BarItemSchema = z.object({
  label: z.string().min(1).max(40),
  value: boundedNumber,
})

const BarChartVisualSchema = z.object({
  type: z.literal('bar'),
  title: z.string().min(2).max(120),
  caption: z.string().max(300).optional(),
  yLabel: z.string().max(40).optional(),
  items: z.array(BarItemSchema).min(2).max(12),
})

const ConceptualVisualSchema = z.object({
  type: z.literal('conceptual'),
  title: z.string().min(2).max(120),
  caption: z.string().max(300).optional(),
  mermaid: z.string().min(8).max(8000),
})

export const LessonPlanVisualAidSchema = z.discriminatedUnion('type', [
  CartesianVisualSchema,
  LineGraphVisualSchema,
  BarChartVisualSchema,
  ConceptualVisualSchema,
])

/** Structured lesson-plan JSON matching existing LessonPlanSchema + optional diagrams. */
export const ChatLessonPlanSchema = z.object({
  title: z.string().min(3),
  subject: z.string().min(2),
  gradeOrForm: z.string().min(1),
  duration: z.number().describe('Total duration in minutes'),
  topic: z.string().min(2).optional(),
  subTopic: z.string().optional(),
  objectives: z.array(ChatLessonObjectiveSchema).min(1).max(5),
  priorKnowledge: z.string().min(5),
  materialsRequired: z.array(z.string()).min(1),
  activities: z.array(ChatLessonActivitySchema).min(3).max(8),
  workedExamples: z.array(z.string().min(10)).max(5).optional(),
  differentiation: z
    .object({
      support: z.string().min(5).optional(),
      challenge: z.string().min(5).optional(),
    })
    .optional(),
  homework: z.string().min(5).optional(),
  assessment: z.object({
    method: z.string(),
    tool: z.string(),
    criteria: z.string(),
  }),
  crossCuttingThemes: z.array(z.string()),
  coreCompetencies: z.array(z.string()).min(1).max(3),
  realWorldZambianContext: z.string().min(10),
  teacherReflectionPrompts: z.array(z.string()).max(3).optional(),
  /**
   * Optional Mermaid diagram source (legacy). Prefer visualAids.
   * Rendered to PNG for the .docx; on failure the document is still generated.
   */
  mermaidDiagram: z.string().max(8000).optional().nullable(),
  /**
   * Validated visual specifications (Cartesian / line / bar / conceptual).
   * Rendered deterministically — never execute AI-generated code.
   */
  visualAids: z.array(LessonPlanVisualAidSchema).max(4).optional(),
})

export type ChatLessonPlan = z.infer<typeof ChatLessonPlanSchema>
export type LessonPlanVisualAid = z.infer<typeof LessonPlanVisualAidSchema>
