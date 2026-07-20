/**
 * Zod schema for chat-generated structured lesson plans (Phase 3).
 * Extends existing LessonPlan fields with optional Mermaid diagram.
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
  teacherAction: z.string(),
  learnerAction: z.string(),
  resources: z.array(z.string()),
  zambiaCulturalContext: z.string().optional(),
})

/** Structured lesson-plan JSON matching existing LessonPlanSchema + optional diagram. */
export const ChatLessonPlanSchema = z.object({
  title: z.string().min(3),
  subject: z.string().min(2),
  gradeOrForm: z.string().min(1),
  duration: z.number().describe('Total duration in minutes'),
  topic: z.string().min(2).optional(),
  subTopic: z.string().optional(),
  objectives: z.array(ChatLessonObjectiveSchema).min(1).max(5),
  priorKnowledge: z.string().min(5),
  materialsRequired: z.array(z.string()),
  activities: z.array(ChatLessonActivitySchema).min(2).max(8),
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
   * Optional Mermaid diagram source (ICT/Sciences). Rendered to PNG for the .docx;
   * on failure the document is still generated without the image.
   */
  mermaidDiagram: z.string().max(8000).optional().nullable(),
})

export type ChatLessonPlan = z.infer<typeof ChatLessonPlanSchema>
