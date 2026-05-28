import {
  getSubjectGuidelines,
  resolveCanonicalSubject,
  buildMandatoryWorkedExamplesBlock,
} from '@/lib/ai/subject-adaptive-prompts'

export type LessonPlanTemplateType =
  | 'professional'
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
  {
    value: 'professional',
    label: 'Ministry Format (Bernard Tito / Mr Banda — HOD approval)',
  },
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

const PLAIN_TEXT_OUTPUT_RULES = `CRITICAL OUTPUT FORMAT — PLAIN TEXT ONLY:
- Do NOT use #, ##, ### or any markdown headings
- Do NOT use asterisks (*) or underscores (_) for bold or italic
- Do NOT use backticks or code fences
- Use ALL CAPS for major section titles (e.g. FRAMEWORK ELEMENTS, LESSON PROCEDURE)
- Use numbered lists (1. 2. 3.) for steps and plain lines for subsections`

export function getLessonPlanTemplatePreamble(templateType: unknown): string {
  const t = normalizeLessonPlanTemplateType(templateType)
  const map: Record<LessonPlanTemplateType, string> = {
    professional:
      'You are an expert Zambian teacher educator creating a Ministry of Education professional lesson plan (Bernard Tito / Mr Banda format).',
    standard:
      "You are an expert Zambian teacher educator. Generate a COMPLETE, detailed Competency-Based Curriculum (CBC) lesson plan following the 2023 Zambia Education Curriculum Framework (ZECF) and Teachers' Curriculum Implementation Guide (TCIG). Use clear plain-text section labels — no markdown.",
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
  return map[t] + '\n\n' + PLAIN_TEXT_OUTPUT_RULES
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
  crossCuttingThemes?: string
  assessmentMethod?: string
  learningPathway?: string
  includePractical?: boolean
  includeInclusive?: boolean
  references?: string
  teachingAids?: string
  lessonNumber?: number | string
  totalLessonsInUnit?: number | string
  teacherName?: string
  schoolName?: string
  teacherGender?: string
  departmentName?: string
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
  const themes = safe(input.crossCuttingThemes) || 'Sustainability & Environmental Care'
  const assessment = safe(input.assessmentMethod) || 'Continuous Formative Assessment'
  const pathway = safe(input.learningPathway) || 'Academic'
  const practicalNote =
    input.includePractical === false ? 'Theory-focused.' : 'Include practical/hands-on activities.'
  const inclusiveNote =
    input.includeInclusive === false
      ? 'Brief differentiation only.'
      : 'Full differentiation and inclusive education required.'
  const references =
    safe(input.references) ||
    'Learner handbook, teacher notes, syllabus reference, and other approved sources.'
  const teachingAids =
    safe(input.teachingAids) ||
    "Learner's book, teacher's notes, chalkboard, and other relevant TLMs."
  const lessonPos =
    input.lessonNumber && input.totalLessonsInUnit
      ? `This is lesson ${safe(input.lessonNumber)} out of ${safe(input.totalLessonsInUnit)} lessons in this unit/topic sequence.`
      : 'State the lesson position in the unit/topic sequence.'

  return `Generate the lesson body using the Ministry of General Education (MoGE) format below.
Do NOT repeat the header (teacher name, school, subject table) — it is added automatically.

Teacher context for tailoring examples (do not print as a separate block): ${safe(input.teacherName) || 'Teacher'} at ${safe(input.schoolName) || 'School'}${input.teacherGender ? ` (${input.teacherGender})` : ''}, Department: ${safe(input.departmentName) || 'General Education'}.

The lesson plan MUST include ALL of the following sections, clearly labelled in plain text:

RATIONALE:
(i) Content: This lesson is on ${subtopic} within the topic ${topic} (${subject}, ${grade}).
(ii) Value/content: Explain the values and competences developed — ONLY these CBC competencies: ${competences}. Cross-cutting themes to integrate: ${themes}.
(iii) Teaching Method: Teacher exposition, question and answer, group/class discussion, and other methods suited to ${subject}. ${practicalNote}
(iv) Location of the lesson: ${lessonPos}

LEARNING OUTCOMES: L.S.B.A.T
List 3–5 measurable outcomes learners will achieve by the end of the lesson.

PREREQUISITE KNOWLEDGE:
What ${grade} learners already know before this lesson.

LESSON INTRODUCTION:
Use brainstorming or revision questions to introduce ${topic} / ${subtopic} and link to prior learning.

LESSON DEVELOPMENT
Present as plain-text rows using these column labels:
STAGE/TIME | TEACHER'S ACTIVITY | PUPIL'S ACTIVITY | METHODS

Divide the ${duration} lesson into logical stages/sub-topics for ${subject}. For each stage include:
- Stage title and estimated time
- Teacher activities (detailed, subject-specific)
- Pupil/learner activities (learner-centred — more time than teacher talk)
- Teaching methods used
- Competence(s) from: ${competences}
${inclusiveNote}

LESSON CONCLUSION:
Revise key points with learners; support remedial learners.

HOMEWORK/CLASS EXERCISE:
Provide 3–5 questions or tasks aligned to ${subtopic}. Include expected answers or marking guidance.

LEARNER'S EVALUATION:
Leave lined space (use dotted lines) for the teacher to record learner performance after the lesson.

TEACHER'S EVALUATION:
Leave lined space (use dotted lines) for the teacher's self-reflection after the lesson.

CBC ALIGNMENT (brief footer — 4–6 lines):
- Assessment method: ${assessment}
- Career pathway link (${pathway})
- Vision 2030 link (one sentence)
- References used: ${references}
- Teaching/learning aids used: ${teachingAids}`
}

export type LessonPlanFrameworkOptions = {
  coreCompetencies?: string[]
  crossCuttingThemes?: string[]
  learningPathway?: string
  assessmentMethod?: string
  /** @deprecated use realWorldContext */
  zambiContext?: string
  realWorldContext?: string
  includePractical?: boolean
  includeInclusive?: boolean
  languageOfInstruction?: string
  resourceLevel?: string
  learningStyle?: string
  priorKnowledge?: string
}

type LessonPlanPromptInput = LessonPlanFrameworkOptions & {
  templateType?: LessonPlanTemplateType | string
  subject: string
  grade: string
  topic: string
  subtopic?: string
  duration: number | string
  learners?: number
  term?: string
  /** Legacy comma-separated competencies; superseded by coreCompetencies */
  competenceFocus?: string
  additionalInstructions?: string
  references?: string
  teachingAids?: string
  lessonNumber?: number | string
  totalLessonsInUnit?: number | string
  teacherName?: string
  schoolName?: string
  teacherGender?: string
  departmentName?: string
  numberOfBoys?: number | string
  numberOfGirls?: number | string
  planDate?: string
}

function normalizeStringList(items: unknown): string[] {
  if (!Array.isArray(items)) return []
  return items.map((x) => String(x || '').trim()).filter(Boolean)
}

/** Internal framework constraints + strict rules for the model. */
export function buildFrameworkElementsBlock(opts: LessonPlanFrameworkOptions): string {
  const competencies = normalizeStringList(opts.coreCompetencies)
  const themes = normalizeStringList(opts.crossCuttingThemes)
  const zambi =
    safe(opts.realWorldContext) || safe(opts.zambiContext) || 'General Zambian local context'
  const practical = opts.includePractical !== false
  const inclusive = opts.includeInclusive !== false
  const pathway = safe(opts.learningPathway) || 'Academic'
  const assessment = safe(opts.assessmentMethod) || 'Continuous Formative Assessment'
  const ictSelected = competencies.some((c) => /digital|ict/i.test(c))

  const competencyList =
    competencies.length > 0
      ? competencies.map((c) => `✅ ${c}`).join('\n')
      : '✅ Critical Thinking & Problem Solving (default)'

  const themeList =
    themes.length > 0
      ? themes.map((t) => `✅ ${t}`).join('\n')
      : '✅ Sustainability & Environmental Care (default)'

  const excludedCompetencyNote =
    competencies.length > 0
      ? `Do NOT develop, label, or assess these unless listed above: Collaboration & Communication; Digital & ICT Literacy; or any other CBC competency not in the selected list.`
      : ''

  const excludedThemeNote =
    themes.length > 0 ? `Do NOT integrate cross-cutting themes that are not listed above.` : ''

  return `FRAMEWORK ELEMENTS (FROM TEACHER FORM — INTERNAL, DO NOT OUTPUT)

Use this block only as internal guidance. Do NOT print or echo this block in the final lesson plan output.

SELECTED CORE COMPETENCIES
${competencyList}

SELECTED CROSS-CUTTING THEMES
${themeList}

LEARNING PATHWAY
${pathway}

ASSESSMENT METHOD
${assessment}

LANGUAGE OF INSTRUCTION
${safe(opts.languageOfInstruction) || 'English'}

RESOURCE LEVEL
${safe(opts.resourceLevel) || 'Moderate (textbooks, chalkboard, some printed materials)'}

LEARNING STYLE PREFERENCE
${safe(opts.learningStyle) || 'Mixed'}

PRIOR KNOWLEDGE
${safe(opts.priorKnowledge) || 'Not specified'}

REAL-WORLD ZAMBIAN CONTEXT
${zambi}

SPECIAL REQUIREMENTS
${practical ? 'Include practical / hands-on activities' : 'Theory-focused — no mandatory practical activities'}
${inclusive ? 'Include inclusive / differentiated strategies (Section 11)' : 'Brief differentiation only (2–3 lines in Section 11)'}

STRICT RULES (must follow):
1. Sections 2 (Specific Competence), 8 (Lesson Procedure), and 9 (Bloom's): address ONLY the Selected Core Competencies listed above.
2. ${excludedCompetencyNote}
3. Section 7 (Cross-Cutting Issues): integrate ONLY the Selected Cross-Cutting Themes listed above.
4. ${excludedThemeNote}
5. Section 10 (SBA): use the Selected Assessment Method: "${assessment}".
6. Section 14 (Career Pathway Link): align with "${pathway}" pathway.
7. ${practical ? 'Include at least one hands-on/practical activity in TLMs (Section 6) and in Phases 2–4.' : 'Do not require lab, workshop, or hands-on practical activities.'}
8. ${inclusive ? 'Section 11 must include support for struggling learners, extension for gifted learners, and SEN adaptations.' : 'Keep Section 11 minimal.'}
9. Section 12 (ICT Integration): ${ictSelected ? 'REQUIRED — integrate ICT/digital skills as a selected competency.' : 'Optional only if naturally relevant; do NOT add Digital & ICT Literacy as a core competency unless it appears in Selected Core Competencies.'}`
}

export function buildLessonPlanPrompt(input: LessonPlanPromptInput): string {
  const preamble = getLessonPlanTemplatePreamble(input.templateType)
  const durationText =
    typeof input.duration === 'number' ? `${input.duration} minutes` : safe(input.duration)

  const coreCompetencies =
    normalizeStringList(input.coreCompetencies).length > 0
      ? normalizeStringList(input.coreCompetencies)
      : input.competenceFocus
        ? input.competenceFocus
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : ['Critical Thinking & Problem Solving']

  const frameworkBlock = buildFrameworkElementsBlock({
    ...input,
    coreCompetencies,
  })

  const structure = buildLessonPlanStructure({
    subject: input.subject,
    grade: input.grade,
    topic: input.topic,
    subtopic: input.subtopic,
    duration: durationText || 'Not specified',
    learners: Number.isFinite(input.learners) ? String(input.learners) : 'Not specified',
    term: input.term,
    competences: coreCompetencies.join('; '),
    crossCuttingThemes: normalizeStringList(input.crossCuttingThemes).join('; '),
    assessmentMethod: input.assessmentMethod,
    learningPathway: input.learningPathway,
    includePractical: input.includePractical,
    includeInclusive: input.includeInclusive,
    references: input.references,
    teachingAids: input.teachingAids,
    lessonNumber: input.lessonNumber,
    totalLessonsInUnit: input.totalLessonsInUnit,
    teacherName: input.teacherName,
    schoolName: input.schoolName,
    teacherGender: input.teacherGender,
    departmentName: input.departmentName,
  })

  const extras = safe(input.additionalInstructions)
  const canonicalSubject = resolveCanonicalSubject(input.subject)
  const subjectBlock = `SUBJECT-SPECIFIC PEDAGOGY (${canonicalSubject} — apply in every section, especially examples, TLMs, and assessment):
${getSubjectGuidelines(canonicalSubject)}`

  const durationMin =
    typeof input.duration === 'number' ? input.duration : parseInt(String(input.duration), 10) || 40
  const mandatoryExamplesBlock = buildMandatoryWorkedExamplesBlock({
    subject: canonicalSubject,
    grade: input.grade,
    topic: input.topic,
    duration: durationMin,
  })

  return `${preamble}

${frameworkBlock}

${subjectBlock}

${mandatoryExamplesBlock}

${structure}

Additional instructions from teacher: ${extras || 'None'}

Generate the complete, detailed, ready-to-use MoGE lesson plan now.
- Do NOT generate the Ministry header (teacher name, school, date, boys/girls table) — it is injected automatically.
- The "FRAMEWORK ELEMENTS (FROM TEACHER FORM — INTERNAL, DO NOT OUTPUT)" block above is guidance only; do NOT render it in the final output.
- Then write all MoGE body sections starting at RATIONALE — embed worked examples and practice exercises from the CRITICAL REQUIREMENTS block in LESSON DEVELOPMENT.
- Obey STRICT RULES: only selected competencies and themes; do not add unchecked CBC items.
Use Zambian local examples throughout. Tailor all content to ${canonicalSubject}. Output plain text only.`
}
