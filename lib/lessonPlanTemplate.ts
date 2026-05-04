export type LessonPlanTemplateType =
  | 'standard'
  | 'science'
  | 'language'
  | 'business'
  | 'practical'
  | 'humanities'
  | 'arts'
  | 'technology'
  | 'mathematics'

export const LESSON_PLAN_TEMPLATE_OPTIONS: { value: LessonPlanTemplateType; label: string }[] = [
  { value: 'standard', label: 'Standard CBC (All Subjects)' },
  { value: 'science', label: 'Science Practical Lab Lesson' },
  { value: 'language', label: 'Language Skills Lesson (LSRW)' },
  { value: 'business', label: 'Business & Accounts Lesson' },
  { value: 'practical', label: 'Vocational/Practical Workshop Lesson' },
  { value: 'humanities', label: 'Humanities & Social Sciences Lesson' },
  { value: 'arts', label: 'Arts, Music & Creative Lesson' },
  { value: 'technology', label: 'Technology & ICT Lesson' },
  { value: 'mathematics', label: 'Mathematics Lesson (Problem-Based)' },
]

export function normalizeLessonPlanTemplateType(value: unknown): LessonPlanTemplateType {
  const v = String(value || '')
    .trim()
    .toLowerCase()
  return (
    LESSON_PLAN_TEMPLATE_OPTIONS.some((o) => o.value === v) ? v : 'standard'
  ) as LessonPlanTemplateType
}

export function getLessonPlanTemplatePreamble(templateType: unknown): string {
  const t = normalizeLessonPlanTemplateType(templateType)
  const map: Record<LessonPlanTemplateType, string> = {
    standard:
      "You are an expert Zambian teacher educator. Generate a COMPLETE, detailed Competency-Based Curriculum (CBC) lesson plan following the 2023 Zambia Education Curriculum Framework (ZECF) and Teachers' Curriculum Implementation Guide (TCIG). Use the exact sections below with clear headings.",
    science:
      'You are an expert Zambian science teacher educator. Generate a COMPLETE CBC lesson plan for a PRACTICAL SCIENCE LAB lesson. Include: safety precautions, hypothesis, materials list, experimental procedure, observation table, and a practical skills assessment rubric. Follow the 2023 ZECF.',
    language:
      'You are an expert Zambian language teacher educator. Generate a COMPLETE CBC lesson plan for a LANGUAGE SKILLS lesson covering all four skills: Listening, Speaking, Reading, Writing (LSRW). Include oral activities, text analysis, and writing tasks. Follow 2023 ZECF.',
    business:
      'You are an expert Zambian business education teacher. Generate a COMPLETE CBC lesson plan for a BUSINESS subject lesson. Include case studies from Zambian business context, financial calculations or document completion tasks, and entrepreneurship linkages. Follow 2023 ZECF.',
    practical:
      'You are an expert Zambian practical subjects teacher. Generate a COMPLETE CBC lesson plan for a WORKSHOP/PRACTICAL SKILLS lesson. Include: workshop safety rules, tool list, step-by-step practical procedure, safety precautions, product quality assessment rubric. Follow 2023 ZECF.',
    humanities:
      'You are an expert Zambian humanities teacher. Generate a COMPLETE CBC lesson plan for a HUMANITIES lesson. Include: primary/secondary source analysis, map work or timeline where relevant, debate or discussion activity, Zambian local context, citizenship values. Follow 2023 ZECF.',
    arts: 'You are an expert Zambian arts teacher. Generate a COMPLETE CBC lesson plan for an ARTS/MUSIC lesson. Include: Zambian cultural context, creative performance or production task, reflection activity, and portfolio-based assessment. Follow 2023 ZECF.',
    technology:
      'You are an expert Zambian ICT/Technology teacher. Generate a COMPLETE CBC lesson plan for a TECHNOLOGY lesson. Include: step-by-step practical computer/design task, digital literacy and cybersafety cross-cutting link, ICT tool specification, and project-based assessment. Follow 2023 ZECF.',
    mathematics:
      'You are an expert Zambian mathematics teacher educator. Generate a COMPLETE CBC lesson plan for a MATHEMATICS PROBLEM-BASED lesson. Include: real-life Zambian context problems, mental math warm-up, discovery activity, worked examples, differentiated practice exercises (basic/intermediate/challenging). Follow 2023 ZECF.',
  }
  return map[t]
}

type LessonPlanStructureInput = {
  subject: string
  grade: string
  topic: string
  subtopic?: string
  duration?: string
  learners?: string | number
  term?: string
  competences?: string
}

const safe = (v: unknown) => String(v ?? '').trim()

export function buildLessonPlanStructure(input: LessonPlanStructureInput): string {
  const subject = safe(input.subject)
  const grade = safe(input.grade)
  const topic = safe(input.topic)
  const subtopic = safe(input.subtopic) || 'Not specified'
  const duration = safe(input.duration) || 'Not specified'
  const learners = safe(input.learners) || 'Not specified'
  const term = safe(input.term) || 'Term 1'
  const competences = safe(input.competences) || 'Critical Thinking and Problem Solving'

  return `The lesson plan MUST include ALL of the following sections, clearly labelled:

LESSON PLAN HEADER
- School Name: [School Name]
- Subject: ${subject}
- Grade/Form: ${grade}
- Topic: ${topic}
- Sub-topic: ${subtopic}
- Date: [Date]
- Duration: ${duration}
- Number of Learners: ${learners}
- Term: ${term}

1. GENERAL COMPETENCE
   State the broad competence from the Zambia CBC syllabus.

2. SPECIFIC COMPETENCE(S)
   State precise, measurable competence(s) targeted in this lesson — aligned to the focus: ${competences}

3. LEARNING OUTCOMES (Know-Do-Value)
   - KNOW: what learners will know/understand
   - DO: what learners will be able to demonstrate/perform
   - VALUE: what attitudes/values learners will develop

4. CORE VALUES ADDRESSED
   From the four CBC value categories: Personal Excellence, Relationships, Citizenship, Faith in God
   Name at least 2 specific values with brief explanation of how they are developed.

5. PRE-REQUISITE KNOWLEDGE
   What learners already know before this lesson.

6. TEACHING & LEARNING MATERIALS (TLMs)
   List all materials — must include at least one hands-on/practical resource for CBC compliance.

7. CROSS-CUTTING ISSUES
   Identify at least 2 relevant cross-cutting issues with brief explanation of how each is integrated.

8. LESSON PROCEDURE (Learner-Centred — 5 Phases)
   For each phase show: Teacher Activity | Learner Activity | Competence Developed | Time

   Phase 1: INTRODUCTION/ENGAGEMENT (Hook — real-life Zambian context)
   Phase 2: DEVELOPMENT/EXPLORATION (Discovery, group investigation)
   Phase 3: EXPLANATION/CONSOLIDATION (Teacher guides, deepens understanding)
   Phase 4: APPLICATION/ELABORATION (Apply to new real-life context)
   Phase 5: ASSESSMENT/EVALUATION (Competence demonstration)

   NOTE: Learner activities must take MORE time and depth than teacher activities — CBC is learner-centred.

9. BLOOM'S TAXONOMY LEVELS TARGETED
   List which levels are addressed (Apply, Analyse, Evaluate, Create preferred — higher order).

10. SCHOOL-BASED ASSESSMENT (SBA)
    - Formative assessment strategy used DURING the lesson
    - SBA task description (project/portfolio/practical that contributes to final grade)
    - Assessment criteria/rubric with at least 3 performance levels
    - How evidence of competence is gathered

11. DIFFERENTIATION / INCLUSIVE EDUCATION
    - How the lesson caters for learners with Special Educational Needs
    - Stretch activities for gifted learners
    - Support strategies for struggling learners

12. ICT INTEGRATION
    State specifically how ICT is used or could be used in this lesson.

13. CAREER PATHWAY LINK
    Link this lesson to either Academic or Vocational pathway and name a relevant career.

14. VISION 2030 ALIGNMENT
    One sentence linking this lesson to Zambia's Vision 2030.

15. REFERENCES
    - Syllabus page/section reference
    - Textbook(s)
    - ZECF 2023 reference

16. TEACHER'S SELF-REFLECTION (to be completed after lesson)
    Provide guiding questions for the teacher to reflect on.`
}

type LessonPlanPromptInput = {
  templateType?: LessonPlanTemplateType | string
  subject: string
  grade: string
  topic: string
  subtopic?: string
  duration: number | string
  learners?: number
  term?: string
  competenceFocus?: string
  additionalInstructions?: string
}

export function buildLessonPlanPrompt(input: LessonPlanPromptInput): string {
  const preamble = getLessonPlanTemplatePreamble(input.templateType)
  const durationText =
    typeof input.duration === 'number' ? `${input.duration} minutes` : safe(input.duration)
  const structure = buildLessonPlanStructure({
    subject: input.subject,
    grade: input.grade,
    topic: input.topic,
    subtopic: input.subtopic,
    duration: durationText || 'Not specified',
    learners: Number.isFinite(input.learners) ? String(input.learners) : 'Not specified',
    term: input.term,
    competences: input.competenceFocus,
  })

  const extras = safe(input.additionalInstructions)
  return `${preamble}\n\n${structure}\n\nAdditional instructions from teacher: ${
    extras || 'None'
  }\n\nGenerate the complete, detailed, ready-to-use CBC lesson plan now. Be thorough, practical, and ensure all 16 sections are fully developed. Use Zambian local examples and contexts throughout.`
}
