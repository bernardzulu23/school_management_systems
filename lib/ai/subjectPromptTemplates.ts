/**
 * Subject-specific content generation templates for Story Weaver / multi-subject AI.
 * Do not hardcode prompts in the React component — look up templates here.
 */

import { PLAIN_TEXT_OUTPUT_RULES } from '@/lib/ai/plain-text'
import {
  resolveCanonicalSubject,
  mapStoryTypeToLabel,
  estimateWordCountFromLength,
  type StoryQuestionTypes,
} from '@/lib/ai/subject-adaptive-prompts'

/** Pedagogical output shapes used by formatters and UI labels. */
export type SubjectContentType =
  | 'LAB_PROCEDURE'
  | 'WORD_PROBLEMS'
  | 'CASE_STUDY'
  | 'NARRATIVE_ANALYSIS'
  | 'PROBLEM_SCENARIO'
  | 'COMPREHENSION'
  | 'LITERARY_ANALYSIS'
  | 'CASE_BRIEF'
  | 'MAP_ANALYSIS'
  | 'MARKET_SCENARIO'
  | 'BUSINESS_CASE'
  | 'FARM_SCENARIO'
  | 'DESIGN_BRIEF'
  | 'CODE_CHALLENGE'
  | 'TECHNOLOGY_SCENARIO'
  | 'DIALOGUE_TRANSLATION'
  | 'ARTISTIC_ANALYSIS'
  | 'MUSIC_COMPOSITION'
  | 'TRAINING_PLAN'
  | 'ETHICAL_CASE'
  | 'DESIGN_PROJECT'
  | 'RECIPE_NUTRITION'
  | 'SERVICE_SCENARIO'
  | 'ITINERARY_ANALYSIS'
  | 'CULTURAL_DIALOGUE'
  | 'INTEGRATED_INVESTIGATION'
  | 'HOME_PRACTICAL'
  | 'CRAFT_PROJECT'

export type SubjectPromptTemplate = {
  type: SubjectContentType
  /** Prompt body; use {topic}, {grade}, {setting} placeholders. */
  template: string
  context: string
  /** Short UI label e.g. "Lab procedure" */
  label: string
  /** ALL-CAPS section headers the model must use (plain text). */
  sections: string[]
}

function tpl(
  type: SubjectContentType,
  label: string,
  template: string,
  context: string,
  sections: string[]
): SubjectPromptTemplate {
  return { type, label, template, context, sections }
}

/**
 * Templates keyed by canonical subject names from subject-adaptive-prompts.
 * Extra keys cover brief aliases (Travel and Tourism, Hospitality, etc.).
 */
export const SUBJECT_PROMPT_TEMPLATES: Record<string, SubjectPromptTemplate> = {
  'English (Core)': tpl(
    'COMPREHENSION',
    'Comprehension passage',
    `Generate an English comprehension passage about: {topic}.
Include:
(1) A story or article (~{wordCount} words) set in {setting}
(2) Vocabulary explanations for key words
(3) Comprehension questions (5–8)
(4) Discussion prompts`,
    'Appropriate for {grade} English language learners in Zambia. Keep existing story-weaver quality for English.',
    ['PASSAGE', 'VOCABULARY', 'COMPREHENSION QUESTIONS', 'DISCUSSION PROMPTS']
  ),

  'Literature in English (Languages)': tpl(
    'LITERARY_ANALYSIS',
    'Literary analysis',
    `Generate a literary analysis exercise about: {topic}.
Include:
(1) Excerpt or short passage (original or inspired by African/Zambian literature)
(2) Literary devices used (named and explained)
(3) Thematic analysis questions
(4) Character or plot analysis
(5) Creative response prompt`,
    'Align with CBC curriculum for {grade}. Prefer Zambian/African literature themes where possible. Setting cue: {setting}.',
    [
      'EXCERPT',
      'LITERARY DEVICES',
      'THEMATIC QUESTIONS',
      'CHARACTER OR PLOT ANALYSIS',
      'CREATIVE RESPONSE',
    ]
  ),

  'Mathematics (Core)': tpl(
    'WORD_PROBLEMS',
    'Word problems',
    `Generate 5 realistic word problems about: {topic}.
For each problem include:
(1) Problem statement (Zambian names and places)
(2) Step-by-step solution with all arithmetic shown
(3) Final answer clearly marked
(4) Alternative method if applicable`,
    'Assume {grade} mathematics. Use Zambian currency (K / ZMW) where relevant. Setting: {setting}.',
    ['PROBLEM SET', 'SOLUTIONS AND ANSWER KEY']
  ),

  'Additional Mathematics (Core)': tpl(
    'WORD_PROBLEMS',
    'Advanced problem set',
    `Generate 5 advanced word problems about: {topic} for Additional Mathematics.
For each: problem statement, full algebraic/calculus working, final answer, and an optional alternative method.`,
    'Assume {grade} Additional Mathematics. Use engineering, finance, or surveying contexts in Zambia ({setting}).',
    ['PROBLEM SET', 'SOLUTIONS AND ANSWER KEY']
  ),

  'Chemistry (Science)': tpl(
    'LAB_PROCEDURE',
    'Lab procedure',
    `Generate a detailed school lab procedure for: {topic}.
Include:
(1) Equipment needed
(2) Safety precautions (mandatory — school-safe reagents only)
(3) Step-by-step procedure
(4) Observations to record
(5) Analysis questions with brief expected answers`,
    'Assume {grade} chemistry. Use low-cost materials available in Zambian secondary schools. Context: {setting}. Never suggest dangerous unsupervised experiments.',
    [
      'EQUIPMENT NEEDED',
      'SAFETY PRECAUTIONS',
      'PROCEDURE',
      'OBSERVATIONS TO RECORD',
      'ANALYSIS QUESTIONS',
    ]
  ),

  'Biology (Science)': tpl(
    'CASE_STUDY',
    'Biology case study',
    `Generate a biology case study about: {topic}.
Include:
(1) Scenario description
(2) Biological principles involved
(3) Investigation questions
(4) Expected outcomes
(5) Real-world application`,
    'Assume {grade} biology. Prefer Zambian flora, fauna, health, or ecosystems. Setting: {setting}.',
    [
      'SCENARIO',
      'BIOLOGICAL PRINCIPLES',
      'INVESTIGATION QUESTIONS',
      'EXPECTED OUTCOMES',
      'REAL-WORLD APPLICATION',
    ]
  ),

  'Physics (Science)': tpl(
    'PROBLEM_SCENARIO',
    'Physics problem scenario',
    `Generate a realistic physics problem scenario about: {topic}.
Include:
(1) Problem setup with diagram description
(2) Given values (SI units)
(3) Questions to solve
(4) Full solution approach with formulas
(5) Real-world applications`,
    'Assume {grade} physics. Practical Zambian applications (electricity, transport, construction). Setting: {setting}.',
    ['PROBLEM SETUP', 'GIVEN VALUES', 'QUESTIONS', 'SOLUTION APPROACH', 'REAL-WORLD APPLICATION']
  ),

  'Science (Science)': tpl(
    'INTEGRATED_INVESTIGATION',
    'Science investigation',
    `Generate an integrated science investigation about: {topic}.
Include: aim/hypothesis, materials, method, observations table prompt, conclusion questions, and safety notes.`,
    'Assume {grade} integrated science in Zambia. Setting: {setting}.',
    ['AIM AND HYPOTHESIS', 'MATERIALS', 'METHOD', 'OBSERVATIONS', 'CONCLUSION QUESTIONS', 'SAFETY']
  ),

  'History (Humanities)': tpl(
    'NARRATIVE_ANALYSIS',
    'Historical narrative',
    `Generate a historical narrative analysis about: {topic}.
Include:
(1) Timeline of events
(2) Key figures involved
(3) Causes and effects
(4) Primary-source style analysis questions
(5) Discussion prompts`,
    'Focus on Zambian and African history for {grade}. Setting cue: {setting}.',
    [
      'TIMELINE',
      'KEY FIGURES',
      'CAUSES AND EFFECTS',
      'SOURCE ANALYSIS QUESTIONS',
      'DISCUSSION PROMPTS',
    ]
  ),

  'Civic Education (Humanities)': tpl(
    'CASE_BRIEF',
    'Civic case brief',
    `Generate a civic education case brief about: {topic}.
Include:
(1) Scenario/case description
(2) Legal/constitutional principles
(3) Rights and responsibilities involved
(4) Analysis questions
(5) Debate prompts for classroom discussion`,
    'Use Zambian Constitution, Data Protection Act 2021, and governance examples for {grade}. Setting: {setting}.',
    [
      'CASE SCENARIO',
      'LEGAL AND CONSTITUTIONAL PRINCIPLES',
      'RIGHTS AND RESPONSIBILITIES',
      'ANALYSIS QUESTIONS',
      'DEBATE PROMPTS',
    ]
  ),

  'Geography (Humanities)': tpl(
    'MAP_ANALYSIS',
    'Geography analysis',
    `Generate a geography analysis exercise about: {topic}.
Include:
(1) Map or place description/analysis
(2) Physical and human geography features
(3) Climate/weather or resource data
(4) Mapping questions
(5) Fieldwork/observation prompts`,
    'Focus on Southern African and Zambian geography for {grade}. Setting: {setting}.',
    [
      'PLACE DESCRIPTION',
      'PHYSICAL AND HUMAN FEATURES',
      'CLIMATE OR RESOURCE DATA',
      'MAPPING QUESTIONS',
      'FIELDWORK PROMPTS',
    ]
  ),

  'Social Studies (Humanities)': tpl(
    'CASE_STUDY',
    'Social studies case',
    `Generate a social studies case about: {topic}.
Include scenario, social science concepts, community questions, and citizenship action ideas.`,
    'Zambian communities and {grade} learners. Setting: {setting}.',
    ['SCENARIO', 'KEY CONCEPTS', 'ANALYSIS QUESTIONS', 'CITIZENSHIP ACTIONS']
  ),

  'Religious Education 2046 (Humanities)': tpl(
    'ETHICAL_CASE',
    'Ethical case discussion',
    `Generate an ethical/religious education case about: {topic}.
Include: scenario, values/principles from multiple respectful perspectives, discussion questions, and community application.`,
    'Respectful interfaith tone for {grade} in Zambia. Setting: {setting}.',
    ['SCENARIO', 'VALUES AND PRINCIPLES', 'DISCUSSION QUESTIONS', 'COMMUNITY APPLICATION']
  ),

  'Principles of Accounts (Business)': tpl(
    'BUSINESS_CASE',
    'Accounting case',
    `Generate an accounting case study about: {topic}.
Include: business scenario, financial data in ZMW (K), accounting principles, calculations with working, and decision questions.`,
    'Zambian SME context for {grade}. Setting: {setting}.',
    [
      'BUSINESS SCENARIO',
      'FINANCIAL DATA',
      'ACCOUNTING PRINCIPLES',
      'CALCULATIONS',
      'DECISION QUESTIONS',
    ]
  ),

  'Commerce (Business)': tpl(
    'MARKET_SCENARIO',
    'Commerce market scenario',
    `Generate a commerce/market scenario about: {topic}.
Include: market situation, commercial principles, supply/demand or trade analysis, decision questions, Zambian industry examples.`,
    'Use Zambian markets, trade, and entrepreneurship for {grade}. Setting: {setting}.',
    [
      'MARKET SITUATION',
      'COMMERCIAL PRINCIPLES',
      'ANALYSIS',
      'DECISION QUESTIONS',
      'ZAMBIAN APPLICATION',
    ]
  ),

  'Business Studies (Business)': tpl(
    'BUSINESS_CASE',
    'Business case study',
    `Generate a business studies case about: {topic}.
Include: company scenario, management/marketing principles, data, analysis questions, and recommendation task.`,
    'Zambian entrepreneurship for {grade}. Setting: {setting}.',
    ['BUSINESS SCENARIO', 'PRINCIPLES', 'DATA', 'ANALYSIS QUESTIONS', 'RECOMMENDATIONS']
  ),

  Economics: tpl(
    'MARKET_SCENARIO',
    'Economics scenario',
    `Generate an economics scenario about: {topic}.
Include: market situation, economic principles, supply/demand analysis, decision-making questions, Zambian examples (agriculture, mining, retail, ZMW).`,
    'Zambian economy for {grade}. Setting: {setting}.',
    [
      'MARKET SITUATION',
      'ECONOMIC PRINCIPLES',
      'SUPPLY DEMAND ANALYSIS',
      'DECISION QUESTIONS',
      'ZAMBIAN APPLICATION',
    ]
  ),

  'Agriculture Science (Science)': tpl(
    'FARM_SCENARIO',
    'Farm scenario',
    `Generate an agricultural science scenario about: {topic}.
Include: farm situation, agricultural principles, soil/climate data, management questions, sustainability for Zambia.`,
    'Smallholder and commercial farming in Zambia for {grade}. Setting: {setting}.',
    [
      'FARM SITUATION',
      'AGRICULTURAL PRINCIPLES',
      'SOIL OR CLIMATE DATA',
      'MANAGEMENT QUESTIONS',
      'SUSTAINABILITY',
    ]
  ),

  'Design and Technology (Technology)': tpl(
    'DESIGN_BRIEF',
    'Design brief',
    `Generate a design brief about: {topic}.
Include: problem/challenge, design principles, materials and tools, design questions, testing and evaluation criteria.`,
    'Practical, locally relevant challenges for {grade}. Setting: {setting}.',
    [
      'DESIGN CHALLENGE',
      'DESIGN PRINCIPLES',
      'MATERIALS AND TOOLS',
      'DESIGN QUESTIONS',
      'TESTING AND EVALUATION',
    ]
  ),

  'Computer Studies (Technology)': tpl(
    'CODE_CHALLENGE',
    'Coding challenge',
    `Generate a computer science problem about: {topic}.
Include: algorithm/programming challenge, problem description, pseudocode template, coding questions, optimization/alternatives.`,
    'Language-agnostic or Python for beginners. {grade}. Setting: {setting}.',
    [
      'CHALLENGE DESCRIPTION',
      'PSEUDOCODE TEMPLATE',
      'CODING QUESTIONS',
      'SAMPLE SOLUTION OUTLINE',
      'OPTIMIZATION NOTES',
    ]
  ),

  'Information Technology (Technology)': tpl(
    'TECHNOLOGY_SCENARIO',
    'ICT scenario',
    `Generate an ICT scenario about: {topic}.
Include: technology use case, digital literacy concepts, cybersecurity/ethics if relevant, practical tasks, real-world application.`,
    'Practical IT skills for Zambia, {grade}. Setting: {setting}.',
    [
      'USE CASE',
      'DIGITAL LITERACY CONCEPTS',
      'ETHICS OR SECURITY',
      'PRACTICAL TASKS',
      'REAL-WORLD APPLICATION',
    ]
  ),

  'French (Languages)': tpl(
    'DIALOGUE_TRANSLATION',
    'French dialogue',
    `Generate a French language learning exercise about: {topic}.
Include: short dialogue in French, English translation, vocabulary list, comprehension questions, pronunciation tips.`,
    '{grade} French learners in Zambia. Setting: {setting}.',
    ['DIALOGUE (FRENCH)', 'ENGLISH TRANSLATION', 'VOCABULARY', 'QUESTIONS', 'PRONUNCIATION TIPS']
  ),

  'Bemba (Languages)': tpl(
    'CULTURAL_DIALOGUE',
    'Bemba dialogue',
    `Generate a Bemba language and culture exercise about: {topic}.
Include: dialogue in Bemba, English meaning, cultural notes, vocabulary, practice questions.`,
    '{grade}. Zambian cultural context. Setting: {setting}.',
    ['DIALOGUE (BEMBA)', 'ENGLISH MEANING', 'CULTURAL NOTES', 'VOCABULARY', 'PRACTICE QUESTIONS']
  ),

  'Cinyanja (Languages)': tpl(
    'CULTURAL_DIALOGUE',
    'Cinyanja dialogue',
    `Generate a Cinyanja/Nyanja language exercise about: {topic}.
Include: dialogue, English meaning, cultural notes, vocabulary, practice questions.`,
    '{grade}. Setting: {setting}.',
    ['DIALOGUE (CINYANJA)', 'ENGLISH MEANING', 'CULTURAL NOTES', 'VOCABULARY', 'PRACTICE QUESTIONS']
  ),

  'Chitonga (Languages)': tpl(
    'CULTURAL_DIALOGUE',
    'Chitonga dialogue',
    `Generate a Chitonga language exercise about: {topic}.
Include: dialogue, English meaning, cultural notes, vocabulary, practice questions.`,
    '{grade}. Setting: {setting}.',
    ['DIALOGUE (CHITONGA)', 'ENGLISH MEANING', 'CULTURAL NOTES', 'VOCABULARY', 'PRACTICE QUESTIONS']
  ),

  'Kikaonde (Languages)': tpl(
    'CULTURAL_DIALOGUE',
    'Kikaonde dialogue',
    `Generate a Kikaonde language exercise about: {topic}.
Include: dialogue, English meaning, cultural notes, vocabulary, practice questions.`,
    '{grade}. Setting: {setting}.',
    ['DIALOGUE (KIKAONDE)', 'ENGLISH MEANING', 'CULTURAL NOTES', 'VOCABULARY', 'PRACTICE QUESTIONS']
  ),

  'Lunda (Languages)': tpl(
    'CULTURAL_DIALOGUE',
    'Lunda dialogue',
    `Generate a Lunda language exercise about: {topic}.
Include: dialogue, English meaning, cultural notes, vocabulary, practice questions.`,
    '{grade}. Setting: {setting}.',
    ['DIALOGUE (LUNDA)', 'ENGLISH MEANING', 'CULTURAL NOTES', 'VOCABULARY', 'PRACTICE QUESTIONS']
  ),

  'Luvale (Languages)': tpl(
    'CULTURAL_DIALOGUE',
    'Luvale dialogue',
    `Generate a Luvale language exercise about: {topic}.
Include: dialogue, English meaning, cultural notes, vocabulary, practice questions.`,
    '{grade}. Setting: {setting}.',
    ['DIALOGUE (LUVALE)', 'ENGLISH MEANING', 'CULTURAL NOTES', 'VOCABULARY', 'PRACTICE QUESTIONS']
  ),

  'Silozi (Languages)': tpl(
    'CULTURAL_DIALOGUE',
    'Silozi dialogue',
    `Generate a Silozi language exercise about: {topic}.
Include: dialogue, English meaning, cultural notes, vocabulary, practice questions.`,
    '{grade}. Setting: {setting}.',
    ['DIALOGUE (SILOZI)', 'ENGLISH MEANING', 'CULTURAL NOTES', 'VOCABULARY', 'PRACTICE QUESTIONS']
  ),

  'Chinese (Languages)': tpl(
    'DIALOGUE_TRANSLATION',
    'Chinese dialogue',
    `Generate a Chinese (Mandarin) learning exercise about: {topic}.
Include: short dialogue (pinyin + characters where helpful), English translation, vocabulary, questions.`,
    '{grade}. China–Zambia cultural bridge. Setting: {setting}.',
    ['DIALOGUE (CHINESE)', 'ENGLISH TRANSLATION', 'VOCABULARY', 'QUESTIONS']
  ),

  'Art and Design (Arts)': tpl(
    'ARTISTIC_ANALYSIS',
    'Art & design brief',
    `Generate an art and design exercise about: {topic}.
Include: visual analysis prompt, design principles, creation brief (materials), evaluation criteria, exhibition/reflection questions.`,
    '{grade}. Prefer Zambian motifs and local materials. Setting: {setting}.',
    [
      'VISUAL ANALYSIS',
      'DESIGN PRINCIPLES',
      'CREATION BRIEF',
      'EVALUATION CRITERIA',
      'REFLECTION QUESTIONS',
    ]
  ),

  'Music (Arts)': tpl(
    'MUSIC_COMPOSITION',
    'Music theory & composition',
    `Generate a music exercise about: {topic}.
Include: theory notes, listening/analysis questions, short composition or rhythm task, performance tip, cultural link to Zambian music.`,
    '{grade}. Setting: {setting}.',
    [
      'MUSIC THEORY NOTES',
      'LISTENING OR ANALYSIS',
      'COMPOSITION TASK',
      'PERFORMANCE TIP',
      'CULTURAL LINK',
    ]
  ),

  'Physical Education (Practical)': tpl(
    'TRAINING_PLAN',
    'Training plan',
    `Generate a PE training/assessment plan about: {topic}.
Include: warm-up, skill drills, main activity, cool-down, assessment criteria, safety notes.`,
    '{grade} PE in Zambia. Setting: {setting}.',
    ['WARM-UP', 'SKILL DRILLS', 'MAIN ACTIVITY', 'COOL-DOWN', 'ASSESSMENT', 'SAFETY']
  ),

  'Fashion and Fabrics (Practical)': tpl(
    'DESIGN_PROJECT',
    'Fashion project',
    `Generate a fashion and fabrics project about: {topic}.
Include: design brief, fabric/materials list, pattern or construction steps, quality checks, costing in ZMW.`,
    '{grade}. Zambian textiles where relevant. Setting: {setting}.',
    ['DESIGN BRIEF', 'MATERIALS', 'CONSTRUCTION STEPS', 'QUALITY CHECKS', 'COSTING']
  ),

  'Food and Nutrition (Practical)': tpl(
    'RECIPE_NUTRITION',
    'Recipe & nutrition analysis',
    `Generate a food and nutrition lesson about: {topic}.
Include: recipe (Zambian ingredients preferred), nutrition analysis, hygiene/safety, costing, evaluation questions.`,
    '{grade}. Setting: {setting}.',
    ['RECIPE', 'NUTRITION ANALYSIS', 'HYGIENE AND SAFETY', 'COSTING', 'EVALUATION QUESTIONS']
  ),

  'Home Management (Practical)': tpl(
    'HOME_PRACTICAL',
    'Home management task',
    `Generate a home management practical about: {topic}.
Include: scenario, materials/budget in ZMW, step-by-step task, safety/hygiene, reflection questions.`,
    '{grade}. Zambian household context. Setting: {setting}.',
    ['SCENARIO', 'MATERIALS AND BUDGET', 'STEPS', 'SAFETY', 'REFLECTION QUESTIONS']
  ),

  'Metalwork (Practical)': tpl(
    'CRAFT_PROJECT',
    'Metalwork project',
    `Generate a metalwork project brief about: {topic}.
Include: project aim, tools/materials, safety, step-by-step construction, quality check, costing.`,
    '{grade} workshop. Setting: {setting}.',
    [
      'PROJECT AIM',
      'TOOLS AND MATERIALS',
      'SAFETY',
      'CONSTRUCTION STEPS',
      'QUALITY CHECK',
      'COSTING',
    ]
  ),

  'Woodwork (Practical)': tpl(
    'CRAFT_PROJECT',
    'Woodwork project',
    `Generate a woodwork project brief about: {topic}.
Include: project aim, timber/tools, safety, construction steps, finishing, quality check.`,
    '{grade} workshop. Prefer local timber names. Setting: {setting}.',
    [
      'PROJECT AIM',
      'TOOLS AND MATERIALS',
      'SAFETY',
      'CONSTRUCTION STEPS',
      'FINISHING',
      'QUALITY CHECK',
    ]
  ),

  'Hospitality Management': tpl(
    'SERVICE_SCENARIO',
    'Hospitality service scenario',
    `Generate a hospitality management scenario about: {topic}.
Include: guest/service situation, standards and etiquette, planning checklist, problem-solving questions, Zambian tourism context.`,
    '{grade}. Setting: {setting}.',
    ['SERVICE SCENARIO', 'STANDARDS', 'PLANNING CHECKLIST', 'PROBLEM-SOLVING QUESTIONS']
  ),

  'Travel and Tourism': tpl(
    'ITINERARY_ANALYSIS',
    'Travel itinerary',
    `Generate a travel and tourism exercise about: {topic}.
Include: sample itinerary (Zambia/Southern Africa), cultural notes, costing in ZMW, sustainability tips, analysis questions.`,
    '{grade}. Setting: {setting}.',
    ['ITINERARY', 'CULTURAL NOTES', 'COSTING', 'SUSTAINABILITY', 'ANALYSIS QUESTIONS']
  ),

  'Commerce and Principles of Accounts': tpl(
    'BUSINESS_CASE',
    'Commerce & accounts case',
    `Generate a combined commerce/accounts case about: {topic}.
Include: business scenario, financial figures in ZMW, commerce principles, accounting entries or calculations, decision questions.`,
    '{grade}. Setting: {setting}.',
    [
      'BUSINESS SCENARIO',
      'FINANCIAL DATA',
      'COMMERCE PRINCIPLES',
      'ACCOUNTING WORK',
      'DECISION QUESTIONS',
    ]
  ),
}

const TEMPLATE_ALIASES: Record<string, string> = {
  chemistry: 'Chemistry (Science)',
  mathematics: 'Mathematics (Core)',
  math: 'Mathematics (Core)',
  biology: 'Biology (Science)',
  physics: 'Physics (Science)',
  history: 'History (Humanities)',
  english: 'English (Core)',
  'english (core)': 'English (Core)',
  geography: 'Geography (Humanities)',
  economics: 'Economics',
  ict: 'Information Technology (Technology)',
  'computer science': 'Computer Studies (Technology)',
  'computer studies': 'Computer Studies (Technology)',
  'civic education': 'Civic Education (Humanities)',
  'agricultural science': 'Agriculture Science (Science)',
  agriculture: 'Agriculture Science (Science)',
  'art and design': 'Art and Design (Arts)',
  'art & design': 'Art and Design (Arts)',
  music: 'Music (Arts)',
  'music arts': 'Music (Arts)',
  'physical education': 'Physical Education (Practical)',
  'religious education': 'Religious Education 2046 (Humanities)',
  'fashion and fabrics': 'Fashion and Fabrics (Practical)',
  'food and nutrition': 'Food and Nutrition (Practical)',
  'hospitality management': 'Hospitality Management',
  'travel and tourism': 'Travel and Tourism',
  'design and technology studies': 'Design and Technology (Technology)',
  'design and technology': 'Design and Technology (Technology)',
  'french language': 'French (Languages)',
  french: 'French (Languages)',
  'zambian languages': 'Bemba (Languages)',
  'literature in english': 'Literature in English (Languages)',
  'commerce and principles of accounts': 'Commerce and Principles of Accounts',
}

export function resolveTemplateKey(subject: string): string {
  const raw = String(subject || '').trim()
  if (!raw) return 'English (Core)'
  if (SUBJECT_PROMPT_TEMPLATES[raw]) return raw

  const lower = raw.toLowerCase()
  if (TEMPLATE_ALIASES[lower] && SUBJECT_PROMPT_TEMPLATES[TEMPLATE_ALIASES[lower]]) {
    return TEMPLATE_ALIASES[lower]
  }

  const canonical = resolveCanonicalSubject(raw)
  if (SUBJECT_PROMPT_TEMPLATES[canonical]) return canonical

  for (const key of Object.keys(SUBJECT_PROMPT_TEMPLATES)) {
    const base = key
      .replace(/\s*\([^)]+\)\s*$/, '')
      .trim()
      .toLowerCase()
    if (base === lower || lower.startsWith(base) || base.startsWith(lower)) return key
  }

  return 'English (Core)'
}

export function getSubjectPromptTemplate(subject: string): SubjectPromptTemplate {
  const key = resolveTemplateKey(subject)
  return SUBJECT_PROMPT_TEMPLATES[key] || SUBJECT_PROMPT_TEMPLATES['English (Core)']
}

export function isComprehensionSubject(subject: string): boolean {
  return getSubjectPromptTemplate(subject).type === 'COMPREHENSION'
}

function fillPlaceholders(text: string, vars: Record<string, string | number>): string {
  let out = text
  for (const [k, v] of Object.entries(vars)) {
    out = out.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v))
  }
  return out
}

export type BuildSubjectContentParams = {
  subject: string
  grade: string
  topic: string
  setting?: string
  length?: string
  storyType?: string
  includeQuestions?: boolean
  cbcCompetencies?: string[]
  characters?: string[]
  characterMode?: 'auto' | 'custom'
  vocabularyWords?: string[]
  languageMode?: 'english' | 'bilingual'
  questionTypes?: StoryQuestionTypes
  questionCount?: number
  vocabularyExercises?: boolean
  discussionPrompts?: boolean
  writingExtension?: boolean
}

/**
 * Build the full AI prompt for Story Weaver — subject-specific (not always English story).
 */
export function buildSubjectContentPrompt(params: BuildSubjectContentParams): string {
  const template = getSubjectPromptTemplate(params.subject)
  const grade = params.grade || 'Form 3'
  const setting = params.setting?.trim() || 'Zambia'
  const wordCount = estimateWordCountFromLength(params.length || 'medium')
  const topic = String(params.topic || '').trim()

  const filled = fillPlaceholders(template.template, {
    topic,
    grade,
    setting,
    wordCount,
  })
  const context = fillPlaceholders(template.context, { topic, grade, setting, wordCount })

  const sectionList = template.sections.map((s, i) => `${i + 1}. ${s}`).join('\n')

  if (template.type === 'COMPREHENSION') {
    const storyType = mapStoryTypeToLabel(params.storyType || 'story')
    const competencies = params.cbcCompetencies?.length
      ? params.cbcCompetencies.join(', ')
      : 'Communication, Critical thinking'
    const characterLine =
      params.characterMode === 'custom' && params.characters?.length
        ? `Use these character names: ${params.characters.join(', ')}.`
        : 'Use authentic Zambian character names (e.g. Chanda, Mwila, Bwalya, Mrs Phiri).'
    const vocabularyLine = params.vocabularyWords?.length
      ? `Weave these vocabulary words naturally into the story: ${params.vocabularyWords.join(', ')}.`
      : ''
    const languageLine =
      params.languageMode === 'bilingual'
        ? 'Include occasional Nyanja or Bemba phrases with English translations in brackets.'
        : 'Write in English only.'

    const questionBlocks: string[] = []
    if (params.includeQuestions) {
      const types: string[] = []
      if (params.questionTypes?.literal !== false) types.push('Literal — recall facts')
      if (params.questionTypes?.inferential !== false)
        types.push('Inferential — read between the lines')
      if (params.questionTypes?.evaluative) types.push('Evaluative — opinion and judgement')
      const count = Math.min(Math.max(params.questionCount ?? 5, 1), 10)
      questionBlocks.push(`

COMPREHENSION QUESTIONS (${count} questions):
Question types: ${types.length ? types.join('; ') : 'Literal and inferential'}`)
      if (params.vocabularyExercises !== false) {
        questionBlocks.push(`
VOCABULARY EXERCISES:
Provide 3–5 short exercises using key words from the passage.`)
      }
      if (params.discussionPrompts !== false) {
        questionBlocks.push(`
DISCUSSION PROMPTS:
Provide 2–3 open discussion prompts.`)
      }
      if (params.writingExtension) {
        questionBlocks.push(`
WRITING EXTENSION:
Provide one short creative writing activity linked to the theme.`)
      }
    }

    return `You are creating educational content for Zambian ${grade} learners.

CONTENT TYPE: ${template.type} (${template.label})
SUBJECT: English (Core)
TOPIC: ${topic}
FORMAT: ${storyType}
SETTING: ${setting}
CBC COMPETENCIES: ${competencies}

${filled}

Context: ${context}
${characterLine}
${vocabularyLine ? `Vocabulary focus: ${vocabularyLine}` : ''}
Language: ${languageLine}
${questionBlocks.join('')}

REQUIRED SECTION HEADERS (use exactly, ALL CAPS):
${sectionList}

${PLAIN_TEXT_OUTPUT_RULES}

Write the ${storyType.toLowerCase()} and sections now. Plain text only — no markdown.`
  }

  return `You are creating educational content for Zambian ${grade} learners.

CONTENT TYPE: ${template.type} (${template.label})
SUBJECT: ${resolveTemplateKey(params.subject)}
TOPIC: ${topic}
SETTING: ${setting}

TASK:
${filled}

Context: ${context}

CRITICAL RULES:
- Do NOT write an English comprehension story unless the content type is COMPREHENSION.
- Output MUST match content type ${template.type}.
- Use Zambian context (places, names, Kwacha/ZMW, local examples) where relevant.
- Use ALL CAPS section headers exactly as listed below.
- Keep school-safe: no dangerous unsupervised experiments or harmful advice.

REQUIRED SECTION HEADERS (use exactly, ALL CAPS):
${sectionList}

${PLAIN_TEXT_OUTPUT_RULES}

Generate the full ${template.label} now. Plain text only — no markdown.`
}
