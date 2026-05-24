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
   State precise, measurable competence(s) targeted in this lesson — ONLY these (do not add others): ${competences}

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
   List all materials. ${practicalNote}

7. CROSS-CUTTING ISSUES
   Integrate ONLY these themes (do not add others): ${themes}
   For each selected theme, explain briefly how it is integrated in the lesson.

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
    Use this assessment approach: ${assessment}
    - Formative assessment strategy used DURING the lesson
    - SBA task description aligned to the method above
    - Assessment criteria/rubric with at least 3 performance levels
    - How evidence of competence is gathered

11. DIFFERENTIATION / INCLUSIVE EDUCATION
    ${inclusiveNote}
    - How the lesson caters for learners with Special Educational Needs
    - Stretch activities for gifted learners
    - Support strategies for struggling learners

12. ICT INTEGRATION
    Include ICT/digital integration ONLY if "Digital" or "ICT" appears in the selected core competencies; otherwise state "Not a focus for this lesson" or optional enrichment.

13. CAREER PATHWAY LINK
    Link this lesson to the ${pathway} pathway and name a relevant career.

14. VISION 2030 ALIGNMENT
    One sentence linking this lesson to Zambia's Vision 2030.

15. REFERENCES
    - Syllabus page/section reference
    - Textbook(s)
    - ZECF 2023 reference

16. TEACHER'S SELF-REFLECTION (to be completed after lesson)
    Provide guiding questions for the teacher to reflect on.`
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
}

function normalizeStringList(items: unknown): string[] {
  if (!Array.isArray(items)) return []
  return items.map((x) => String(x || '').trim()).filter(Boolean)
}

/** Reproducible block shown at top of output + strict rules for the model. */
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

  return `FRAMEWORK ELEMENTS (FROM TEACHER FORM — MANDATORY)

Reproduce this exact block at the beginning of your lesson plan output, then continue with sections 1–16.

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

Generate the complete, detailed, ready-to-use CBC lesson plan now.
- Start by copying the "FRAMEWORK ELEMENTS (FROM TEACHER FORM — MANDATORY)" block exactly as specified above (plain text, no hash symbols).
- Then write all 16 sections fully — Section 8 (Lesson Procedure) MUST embed the worked examples and practice exercises from the CRITICAL REQUIREMENTS block.
- Obey STRICT RULES: only selected competencies and themes; do not add unchecked CBC items.
Use Zambian local examples throughout. Tailor all content to ${canonicalSubject}. Output plain text only.`
}
