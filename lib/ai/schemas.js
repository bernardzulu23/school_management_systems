/**
 * Zod schemas for all AI-generated content in ZSMS.
 *
 * Used with generateAIObject() — outputs are validated before returning to routes.
 *
 * @see docs/AI_GUIDE.md
 */
import { z } from 'zod'

// ─── ECZ RUBRIC ──────────────────────────────────────────────────────────────

export const RubricCriterionSchema = z.object({
  name: z.string().min(3).max(100).describe('Name of the assessment criterion'),
  description: z.string().max(200).describe('What this criterion measures'),
  excellent: z.string().min(10).describe('Descriptor for Excellent (4 marks)'),
  good: z.string().min(10).describe('Descriptor for Good (3 marks)'),
  fair: z.string().min(10).describe('Descriptor for Fair (2 marks)'),
  needsImprovement: z.string().min(10).describe('Descriptor for Needs Improvement (1 mark)'),
})

export const RubricSchema = z.object({
  taskTitle: z.string(),
  subject: z.string(),
  form: z.enum(['Form 1', 'Form 2', 'Form 3']),
  taskType: z.enum([
    'Project',
    'Practical task',
    'Assignment',
    'Presentation',
    'Fieldwork',
    'Portfolio',
    'Observation',
    'End of term test',
  ]),
  criteria: z.array(RubricCriterionSchema).min(2).max(8),
  zambiaCurriculumAlignment: z.string().describe('Which ECZ competencies this task develops'),
})

// ─── LESSON PLAN ──────────────────────────────────────────────────────────────

export const LessonObjectiveSchema = z.object({
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

export const LessonActivitySchema = z.object({
  phase: z.enum(['Introduction', 'Development', 'Conclusion']),
  durationMinutes: z.number().min(2).max(60),
  activity: z.string().min(20),
  teacherAction: z.string(),
  learnerAction: z.string(),
  resources: z.array(z.string()),
  zambiaCulturalContext: z.string().optional(),
})

export const LessonPlanSchema = z.object({
  title: z.string(),
  subject: z.string(),
  gradeOrForm: z.string(),
  duration: z.number().describe('Total duration in minutes'),
  objectives: z.array(LessonObjectiveSchema).min(1).max(5),
  priorKnowledge: z.string(),
  materialsRequired: z.array(z.string()),
  activities: z.array(LessonActivitySchema).min(2).max(8),
  assessment: z.object({
    method: z.string(),
    tool: z.string(),
    criteria: z.string(),
  }),
  crossCuttingThemes: z.array(z.string()),
  coreCompetencies: z.array(z.string()).min(1).max(3),
  realWorldZambianContext: z.string(),
  teacherReflectionPrompts: z.array(z.string()).max(3),
})

// ─── ECZ EXAM QUESTION ───────────────────────────────────────────────────────

export const ECZSubQuestionSchema = z.object({
  number: z.string().describe('e.g. (a), (b), (i), (ii)'),
  commandTerm: z.enum([
    'State',
    'List',
    'Define',
    'Describe',
    'Explain',
    'Calculate',
    'Compare',
    'Contrast',
    'Analyse',
    'Evaluate',
    'Design',
    'Justify',
    'Synthesise',
    'Discuss',
    'Identify',
    'Outline',
    'Summarise',
  ]),
  question: z.string(),
  marks: z.number().min(1).max(20),
  bloomsLevel: z.enum([
    'Remembering',
    'Understanding',
    'Applying',
    'Analysing',
    'Evaluating',
    'Creating',
  ]),
  modelAnswer: z.string().describe('Mark scheme / model answer'),
})

export const ECZExamQuestionSchema = z.object({
  questionNumber: z.number(),
  zambianScenario: z.string().min(30).describe('Real-life Zambian context (2-4 sentences)'),
  subject: z.string(),
  form: z.enum(['Form 1', 'Form 2', 'Form 3', 'Form 4']),
  elementOfConstruct: z.string().describe('Which ECZ element of construct this assesses'),
  subQuestions: z.array(ECZSubQuestionSchema).min(2).max(6),
  totalMarks: z.number(),
  hasMultipleChoice: z.literal(false).describe('NEVER true at secondary level'),
})

export const ECZExamQuestionsResponseSchema = z.object({
  scenarios: z.array(ECZExamQuestionSchema).min(1).max(5),
})

// ─── SBA TASK ────────────────────────────────────────────────────────────────

export const SBATaskSchema = z.object({
  title: z.string(),
  subject: z.string(),
  form: z.enum(['Form 1', 'Form 2', 'Form 3']),
  taskType: z.string(),
  context: z.string().min(30).describe('Real-life Zambian scenario'),
  task: z.string().min(30).describe('Clear instructions for learner'),
  materialsProvided: z.array(z.string()),
  rubric: RubricSchema,
  demonstration: z.string().describe('What learner must show after completing task'),
  competencies: z.array(z.string()).min(1),
  crossCuttingThemes: z.array(z.string()),
  estimatedDurationMinutes: z.number(),
  resourceLevel: z.enum(['low', 'moderate', 'well-resourced']),
})

// ─── REPORT COMMENT ──────────────────────────────────────────────────────────

export const ReportCommentSchema = z.object({
  subject: z.string(),
  studentName: z.string(),
  termComment: z.string().min(30).max(300).describe('Professional end-of-term comment'),
  strengths: z.array(z.string()).max(3),
  areasForGrowth: z.array(z.string()).max(2),
  recommendedActions: z.string().max(200),
  cbcCompetenciesEvidenced: z.array(z.string()),
})

// ─── QUIZ (formative) ────────────────────────────────────────────────────────

export const QuizQuestionSchema = z.object({
  id: z.string(),
  type: z.enum(['mcq', 'short', 'true_false']),
  question: z.string(),
  options: z.array(z.string()).optional(),
  marks: z.number().optional(),
  answer: z.string(),
  explanation: z.string().optional(),
})

export const QuizSchema = z.object({
  title: z.string(),
  grade: z.string(),
  subject: z.string(),
  topic: z.string(),
  totalMarks: z.number().optional(),
  questions: z.array(QuizQuestionSchema).min(1).max(30),
})

export const QuizClassAnalysisSchema = z.object({
  summary: z.string(),
  classAverage: z.number(),
  strugglingTopics: z.array(z.string()).min(1).max(10),
  recommendReteach: z.boolean(),
  reteachRationale: z.string(),
  suggestedActivities: z.array(z.string()).min(1).max(8),
  studentsNeedingSupport: z.string(),
})

// ─── STUDENT FLASHCARDS (AI, self-quiz) ──────────────────────────────────────

export const FlashcardSchema = z.object({
  id: z.string().optional(),
  front: z.string().describe('Question or prompt shown to the student'),
  options: z.array(z.string()).min(2).max(6).describe('Answer choices'),
  answer: z.string().describe('The correct option, matching one of options exactly'),
  explanation: z.string().optional().describe('Short reason shown after the student selects'),
})

export const FlashcardDeckSchema = z.object({
  title: z.string().optional(),
  subject: z.string().optional(),
  topic: z.string().optional(),
  cards: z.array(FlashcardSchema).min(1).max(12),
})

export const FlashcardReadingItemSchema = z.object({
  type: z.enum(['book', 'article']),
  title: z.string(),
  author: z.string().optional(),
  reason: z.string().describe('Why the student should read this'),
})

export const FlashcardSessionFeedbackSchema = z.object({
  summary: z.string(),
  topicsToImprove: z.array(z.string()).min(1).max(8),
  strengths: z.array(z.string()).min(1).max(6),
  readingList: z.array(FlashcardReadingItemSchema).min(1).max(6),
})

// ─── ECZ PRACTICE PAPER (multi-level) ────────────────────────────────────────

export const ECZPracticeQuestionSchema = z.object({
  id: z.string(),
  type: z.enum(['mcq', 'short', 'structured']),
  question: z.string(),
  options: z.array(z.string()).optional(),
  marks: z.number(),
  answer: z.string(),
  explanation: z.string().optional(),
})

export const ECZPracticeScenarioSchema = z.object({
  questionNumber: z.number(),
  zambianScenario: z.string().min(30),
  elementOfConstruct: z.string().optional(),
  hasMultipleChoice: z.literal(false).optional(),
  subQuestions: z
    .array(
      z.object({
        number: z.string(),
        commandTerm: z.string(),
        question: z.string(),
        marks: z.number(),
        bloomsLevel: z.string().optional(),
        modelAnswer: z.string().optional(),
      })
    )
    .optional(),
  totalMarks: z.number().optional(),
})

export const ECZPracticePaperSchema = z.object({
  paper: z.object({
    examInfo: z.object({
      subject: z.string(),
      level: z.string(),
      topic: z.string(),
      totalMarks: z.number(),
      timeAllowed: z.string(),
    }),
    questions: z.array(ECZPracticeQuestionSchema).max(20).default([]),
    scenarios: z.array(ECZPracticeScenarioSchema).optional(),
  }),
})
