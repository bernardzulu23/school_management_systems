/**
 * Subject-adaptive prompts for Groq — Zambian curriculum (36 subjects).
 * Resolves UI subject names to canonical keys and tailors pedagogy per subject.
 */

import { PLAIN_TEXT_OUTPUT_RULES } from '@/lib/ai/plain-text'

export const SUBJECT_GUIDELINES: Record<string, string> = {
  'Mathematics (Core)': `
    - Include 3-5 worked examples with step-by-step solutions
    - Use mathematical notation and formulas (e.g., ax² + bx + c = 0)
    - Include practice problems for learners to solve
    - Reference real-world Zambian applications (surveying, commerce, construction, banking)
    - Emphasize problem-solving strategies and critical thinking
    - Show multiple solution methods where applicable
  `,
  'English (Core)': `
    - Include literature examples and quotations from English and African authors
    - Focus on comprehension, grammar, writing, and communication skills
    - Use diverse examples from published texts
    - Emphasize critical analysis and interpretation
    - Reference cultural contexts and values
    - Include vocabulary development and language conventions
  `,
  'Additional Mathematics (Core)': `
    - Include advanced mathematical concepts with detailed explanations
    - Use calculus, complex algebra, and advanced statistics where appropriate
    - Provide worked examples with multiple solution methods
    - Reference higher-level applications (engineering, economics, finance)
    - Emphasize proof and mathematical reasoning
    - Include challenging practice problems for extension
  `,
  'Science (Science)': `
    - Include practical experiments or investigations with full instructions
    - Use scientific vocabulary and correct terminology
    - Reference Zambian natural resources, wildlife, environment, and climate
    - Include safety considerations for practical activities
    - Use hypotheses, predictions, observations, and conclusions
    - Connect to real-world applications and sustainability
  `,
  'Biology (Science)': `
    - Include diagrams of biological structures and systems
    - Use correct scientific nomenclature (Latin names where appropriate)
    - Reference Zambian fauna, flora, and ecosystems
    - Include experimental procedures for investigations
    - Focus on cell biology, genetics, ecology, and human body systems
    - Link to health, disease prevention, and conservation of Zambian biodiversity
  `,
  'Chemistry (Science)': `
    - Include chemical formulas, equations, and reactions
    - Reference industrial applications in Zambia (mining, agriculture, manufacturing)
    - Include safety procedures and hazard symbols for experiments
    - Use atomic structure, bonding, and reaction concepts
    - Provide balanced equations and stoichiometry problems
    - Connect to everyday applications and sustainability
  `,
  'Physics (Science)': `
    - Include formulas, calculations, and SI units
    - Use diagrams showing forces, motion, energy, waves
    - Reference real-world Zambian examples (electricity, transport, construction)
    - Include experiment descriptions and data analysis
    - Emphasize cause-and-effect relationships
    - Connect to technology and innovation
  `,
  'Agriculture Science (Science)': `
    - Reference Zambian farming practices, crops, and livestock
    - Include practical farm activities and seasonal planning
    - Discuss soil science, climate, water management
    - Include sustainable farming methods and conservation
    - Link to food security and rural development
    - Emphasize traditional knowledge and modern techniques
  `,
  'Geography (Humanities)': `
    - Include maps, coordinates, and geographical data
    - Reference Zambian provinces, cities, landmarks, and regions
    - Discuss climate patterns, vegetation zones, water bodies
    - Include case studies of Zambian geographical features
    - Link to environmental conservation and sustainability
    - Use correct geographical terminology and concepts
  `,
  'History (Humanities)': `
    - Include key dates, events, and historical figures
    - Reference Zambian history: pre-colonial, colonial, independence, post-colonial periods
    - Discuss multiple perspectives and use primary sources
    - Connect historical events to present-day Zambia
    - Encourage critical analysis and historical thinking
    - Link to heritage, cultural identity, and nation-building
  `,
  'Civic Education (Humanities)': `
    - Reference Zambian Constitution, laws, and governance structures
    - Discuss rights and responsibilities of Zambian citizens
    - Include examples from local and national governance
    - Emphasize democratic values and civic participation
    - Connect to Vision 2030 and development goals
    - Encourage active citizenship and social responsibility
  `,
  'Social Studies (Humanities)': `
    - Integrate geography, history, and social science concepts
    - Reference Zambian society, culture, and communities
    - Discuss social issues affecting Zambia
    - Include cultural diversity and respect for traditions
    - Connect to nation-building and sustainable development
    - Emphasize critical thinking about social phenomena
  `,
  'Religious Education 2046 (Humanities)': `
    - Reference diverse religious traditions and practices
    - Discuss ethical and moral values from various perspectives
    - Include Zambian religious contexts and practices
    - Encourage respectful exploration of beliefs
    - Connect to personal development and community values
    - Emphasize interfaith understanding and tolerance
  `,
  'Literature in English (Languages)': `
    - Include quotes and excerpts from published literature
    - Reference African, Zambian, and international authors
    - Analyze literary devices, themes, and characters
    - Discuss cultural contexts and historical periods
    - Encourage critical interpretation and analysis
    - Include poetry, drama, and prose examples
  `,
  'French (Languages)': `
    - Use authentic French language examples and dialogues
    - Include French cultural contexts and Francophone countries
    - Focus on vocabulary, grammar, pronunciation
    - Reference French-speaking African nations
    - Include practical communication scenarios
    - Emphasize cultural understanding
  `,
  'Bemba (Languages)': `
    - Use authentic Bemba language examples and expressions
    - Reference Bemba cultural traditions and communities in Zambia
    - Include vocabulary, grammar, and pronunciation
    - Discuss cultural contexts and oral traditions
    - Emphasize preservation of Zambian languages
    - Include proverbs and traditional sayings
  `,
  'Cinyanja (Languages)': `
    - Use authentic Cinyanja language examples
    - Reference Cinyanja-speaking communities in Zambia
    - Include vocabulary, grammar, and linguistic features
    - Discuss cultural contexts and traditions
    - Emphasize language preservation
    - Include cultural proverbs and stories
  `,
  'Chitonga (Languages)': `
    - Use authentic Chitonga language examples
    - Reference Chitonga-speaking communities in Southern Zambia
    - Include vocabulary, grammar, and speech patterns
    - Discuss cultural heritage and traditions
    - Emphasize language conservation
    - Include traditional expressions and wisdom
  `,
  'Kikaonde (Languages)': `
    - Use authentic Kikaonde language examples
    - Reference Kaonde-speaking communities in North-Western Zambia
    - Include vocabulary and linguistic patterns
    - Discuss cultural contexts and traditions
    - Emphasize preservation of minority languages
    - Include cultural narratives
  `,
  'Lunda (Languages)': `
    - Use authentic Lunda language examples
    - Reference Lunda-speaking communities in Northern Zambia
    - Include vocabulary and language structures
    - Discuss cultural traditions and heritage
    - Emphasize language preservation efforts
    - Include traditional knowledge
  `,
  'Luvale (Languages)': `
    - Use authentic Luvale language examples
    - Reference Luvale-speaking communities in Zambia
    - Include vocabulary, phonetics, and grammar
    - Discuss cultural practices and traditions
    - Emphasize language conservation
    - Include cultural wisdom and proverbs
  `,
  'Silozi (Languages)': `
    - Use authentic Silozi language examples
    - Reference Lozi-speaking communities in Western Province
    - Include vocabulary, grammar, and pronunciation
    - Discuss Lozi cultural heritage and traditions
    - Emphasize preservation of languages
    - Include traditional stories and expressions
  `,
  'Chinese (Languages)': `
    - Use authentic Chinese language examples
    - Include Mandarin Chinese vocabulary and characters
    - Focus on cultural contexts of Chinese-speaking regions
    - Include practical communication scenarios
    - Emphasize cross-cultural understanding
    - Reference China-Zambia relationships
  `,
  'Principles of Accounts (Business)': `
    - Include accounting principles and concepts
    - Use real-world examples from Zambian businesses
    - Show journal entries, ledgers, and financial statements
    - Include practice problems with solutions
    - Reference International Financial Reporting Standards (IFRS)
    - Emphasize accuracy and ethical practices
  `,
  'Commerce (Business)': `
    - Discuss commercial activities and trade
    - Reference Zambian commerce and business practices
    - Include types of businesses and entrepreneurship
    - Discuss markets, trade, and economic activities
    - Link to national economic development
    - Emphasize business ethics and sustainability
  `,
  'Business Studies (Business)': `
    - Include business management principles and practices
    - Reference Zambian businesses and entrepreneurs
    - Discuss organizational structures and functions
    - Include case studies of successful Zambian businesses
    - Focus on leadership, marketing, operations
    - Link to economic growth and employment
  `,
  'Computer Studies (Technology)': `
    - Include programming concepts and algorithms
    - Use practical coding examples in relevant languages (Python, Java, etc.)
    - Reference Zambian technology sector and digital initiatives
    - Include computer hardware, software, and networking concepts
    - Emphasize digital literacy and cybersecurity
    - Link to future technology careers
  `,
  'Information Technology (Technology)': `
    - Include IT systems, networks, and data management
    - Reference Zambian digital transformation initiatives
    - Discuss database design, data security, and privacy
    - Include practical IT scenarios and problem-solving
    - Emphasize digital skills and technical literacy
    - Connect to modern workplace IT requirements
  `,
  'Design and Technology (Technology)': `
    - Include design principles and processes
    - Reference Zambian manufacturing and production
    - Discuss materials, tools, and manufacturing methods
    - Include design thinking and problem-solving approaches
    - Emphasize innovation and creativity
    - Link to engineering and industrial development
  `,
  'Home Management (Practical)': `
    - Include practical demonstrations and household management
    - Reference Zambian home life and family structures
    - Focus on nutrition, health, hygiene, budgeting
    - Include family relationships and child development
    - Emphasize practical life skills for home management
    - Connect to family welfare and sustainable living
  `,
  'Food and Nutrition (Practical)': `
    - Include recipes, meal planning, and food preparation
    - Reference Zambian traditional foods and cooking methods
    - Focus on nutrition science and dietary requirements
    - Discuss food safety, hygiene, and storage
    - Include nutrition for different age groups
    - Emphasize health, food security, and sustainable agriculture
  `,
  'Fashion and Fabrics (Practical)': `
    - Include sewing techniques, pattern-making, and garment construction
    - Reference Zambian traditional textiles and fashion
    - Discuss fabric types, properties, and care
    - Include design principles and fashion trends
    - Emphasize clothing care, modification, and creativity
    - Link to entrepreneurship and self-employment
  `,
  'Metalwork (Practical)': `
    - Include metalworking techniques and safety procedures
    - Reference Zambian metalwork traditions and craftsmanship
    - Discuss tools, materials, and joining methods
    - Include design, measurement, and finishing techniques
    - Emphasize precision and craftsmanship
    - Link to vocational skills and entrepreneurship
  `,
  'Woodwork (Practical)': `
    - Include woodworking techniques and safety procedures
    - Reference Zambian wood types and traditional carpentry
    - Discuss tools, joints, and finishing methods
    - Include design, measurement, and construction
    - Emphasize precision, creativity, and craftsmanship
    - Link to vocational skills and furniture-making entrepreneurship
  `,
  'Physical Education (Practical)': `
    - Include exercise techniques, sports rules, and athletic training
    - Reference Zambian sports and sporting achievements
    - Discuss fitness, health, and wellness concepts
    - Include sports skill development and game strategies
    - Emphasize teamwork, discipline, and healthy living
    - Connect to physical development and competitive sports
  `,
  'Music (Arts)': `
    - Include musical notation, theory, and composition
    - Reference Zambian traditional music and instruments
    - Discuss music genres, styles, and cultural contexts
    - Include performance techniques and musical appreciation
    - Emphasize creativity and cultural expression
    - Connect to Zambian musical heritage and contemporary music
  `,
  'Art and Design (Arts)': `
    - Include visual analysis and design principles (line, form, colour, texture)
    - Reference Zambian motifs, crafts, and local materials
    - Provide creation briefs with tools, steps, and evaluation criteria
    - Emphasize creativity, craftsmanship, and cultural expression
    - Link to exhibition, critique, and entrepreneurship
  `,
}

/** Maps common UI / database subject names to canonical guideline keys. */
const SUBJECT_ALIASES: Record<string, string> = {
  mathematics: 'Mathematics (Core)',
  math: 'Mathematics (Core)',
  'mathematics (core)': 'Mathematics (Core)',
  english: 'English (Core)',
  'english language': 'English (Core)',
  'english (core)': 'English (Core)',
  'additional mathematics': 'Additional Mathematics (Core)',
  'additional math': 'Additional Mathematics (Core)',
  science: 'Science (Science)',
  'integrated science': 'Science (Science)',
  biology: 'Biology (Science)',
  chemistry: 'Chemistry (Science)',
  physics: 'Physics (Science)',
  'agriculture science': 'Agriculture Science (Science)',
  agriculture: 'Agriculture Science (Science)',
  geography: 'Geography (Humanities)',
  history: 'History (Humanities)',
  'civic education': 'Civic Education (Humanities)',
  'social studies': 'Social Studies (Humanities)',
  'religious education': 'Religious Education 2046 (Humanities)',
  'religious education 2046': 'Religious Education 2046 (Humanities)',
  'literature in english': 'Literature in English (Languages)',
  french: 'French (Languages)',
  bemba: 'Bemba (Languages)',
  chichewa: 'Cinyanja (Languages)',
  cinyanja: 'Cinyanja (Languages)',
  nyanja: 'Cinyanja (Languages)',
  chitonga: 'Chitonga (Languages)',
  tonga: 'Chitonga (Languages)',
  kikaonde: 'Kikaonde (Languages)',
  kaonde: 'Kikaonde (Languages)',
  lunda: 'Lunda (Languages)',
  luvale: 'Luvale (Languages)',
  silozi: 'Silozi (Languages)',
  lozi: 'Silozi (Languages)',
  chinese: 'Chinese (Languages)',
  'principles of accounts': 'Principles of Accounts (Business)',
  accounts: 'Principles of Accounts (Business)',
  commerce: 'Commerce (Business)',
  'business studies': 'Business Studies (Business)',
  'computer studies': 'Computer Studies (Technology)',
  'computer studies / ict': 'Computer Studies (Technology)',
  ict: 'Information Technology (Technology)',
  'information technology': 'Information Technology (Technology)',
  'design and technology': 'Design and Technology (Technology)',
  'home management': 'Home Management (Practical)',
  'home economics': 'Home Management (Practical)',
  'food and nutrition': 'Food and Nutrition (Practical)',
  'food & nutrition': 'Food and Nutrition (Practical)',
  'food & nutrition technology': 'Food and Nutrition (Practical)',
  'fashion and fabrics': 'Fashion and Fabrics (Practical)',
  'fashion & fabrics': 'Fashion and Fabrics (Practical)',
  metalwork: 'Metalwork (Practical)',
  woodwork: 'Woodwork (Practical)',
  'physical education': 'Physical Education (Practical)',
  pe: 'Physical Education (Practical)',
  music: 'Music (Arts)',
  'art & design': 'Art and Design (Arts)',
  'art and design': 'Art and Design (Arts)',
}

export const CANONICAL_SUBJECTS = Object.keys(SUBJECT_GUIDELINES)

export function resolveCanonicalSubject(subject: string): string {
  const raw = String(subject || '').trim()
  if (!raw) return 'English (Core)'
  if (SUBJECT_GUIDELINES[raw]) return raw

  const lower = raw.toLowerCase()
  if (SUBJECT_ALIASES[lower]) return SUBJECT_ALIASES[lower]

  for (const key of CANONICAL_SUBJECTS) {
    if (key.toLowerCase() === lower) return key
    const base = key
      .replace(/\s*\([^)]+\)\s*$/, '')
      .trim()
      .toLowerCase()
    if (base === lower || lower.startsWith(base) || base.startsWith(lower)) return key
  }

  return raw
}

export function getSubjectGuidelines(subject: string): string {
  const canonical = resolveCanonicalSubject(subject)
  return (SUBJECT_GUIDELINES[canonical] || SUBJECT_GUIDELINES['English (Core)']).trim()
}

export type StoryTypeLabel = 'Narrative Story' | 'Fable' | 'Dialogue' | 'Poem'

const STORY_SUBJECT_CONTEXT: Record<string, string> = {
  'Mathematics (Core)':
    'Weave in mathematical concepts, problem-solving, and real-world math applications. Characters use math to solve challenges.',
  'English (Core)':
    'Showcase strong writing, character development, dialogue, and literary devices. Focus on language and communication.',
  'Science (Science)':
    'Demonstrate scientific concepts, experiments, or discoveries. Include curiosity about how things work in nature.',
  'History (Humanities)':
    'Reference historical events, figures, or periods in Zambian history with accurate context.',
  'Geography (Humanities)':
    'Feature Zambian locations, geographical features, and climate. Characters explore and learn about places.',
  'Biology (Science)':
    'Highlight living organisms, ecosystems, or biological processes and observations of Zambian nature.',
  'Chemistry (Science)':
    'Feature chemical reactions or properties in practical, everyday Zambian contexts.',
  'Physics (Science)':
    'Demonstrate forces, motion, energy, or physics principles with real-world applications.',
  'Agriculture Science (Science)':
    'Showcase farming practices, crop growth, or sustainable agriculture in Zambian communities.',
  'Music (Arts)': 'Celebrate music, expression, and Zambian musical heritage and instruments.',
  'Physical Education (Practical)':
    'Feature sports, teamwork, athletic achievement, and healthy living in Zambia.',
  'Computer Studies (Technology)':
    'Demonstrate coding, digital innovation, or technology solving real problems.',
  'Business Studies (Business)':
    'Feature entrepreneurship, business creation, or problem-solving; highlight Zambian entrepreneurs.',
  'Civic Education (Humanities)':
    'Demonstrate rights, responsibilities, citizenship, and community participation.',
  'Home Management (Practical)':
    'Showcase practical life skills, nutrition, family values, and household management.',
}

export function mapStoryTypeToLabel(storyType: string): StoryTypeLabel {
  const map: Record<string, StoryTypeLabel> = {
    story: 'Narrative Story',
    narrative: 'Narrative Story',
    fable: 'Fable',
    dialogue: 'Dialogue',
    poem: 'Poem',
  }
  return map[String(storyType || 'story').toLowerCase()] || 'Narrative Story'
}

export function estimateWordCountFromLength(length: string): number {
  const s = String(length || '').toLowerCase()
  if (s.includes('short') || s.includes('2-3')) return 300
  if (s.includes('long') || s.includes('6-8')) return 1000
  if (/\d+/.test(s)) {
    const n = parseInt(s.match(/\d+/)?.[0] || '400', 10)
    return Math.min(1200, Math.max(200, n * 80))
  }
  return 450
}

export function performanceLevelFromPercentage(
  percentage: number
): 'Excellent' | 'Good' | 'Satisfactory' | 'Needs Improvement' {
  if (percentage >= 80) return 'Excellent'
  if (percentage >= 65) return 'Good'
  if (percentage >= 50) return 'Satisfactory'
  return 'Needs Improvement'
}

type SubjectExampleRequirements = {
  workedExamples: number
  practiceProblems: number
  format: string
}

const SUBJECT_EXAMPLE_REQUIREMENTS: Record<string, SubjectExampleRequirements> = {
  'Mathematics (Core)': {
    workedExamples: 5,
    practiceProblems: 4,
    format: `Each worked example MUST show:
1. Real Zambian scenario (name a person and place: Soweto Market Lusaka, Nkana Kitwe, etc.)
2. What is known (identify given values)
3. What formula/method to use (define every variable)
4. Step-by-step calculation (show ALL arithmetic)
5. Final answer clearly marked in context (use K for Kwacha)

Example format:
"Example 1: Bupe buys pens at K150 each.
Question: If she buys 5 pens, what is the total cost?
Given: cost per pen = K150, quantity = 5
Formula: Total cost = K150 × quantity
Step 1: Substitute: Total cost = K150 × 5
Step 2: Calculate: Total cost = K750
Answer: K750"`,
  },
  'Additional Mathematics (Core)': {
    workedExamples: 5,
    practiceProblems: 4,
    format: `Each worked example MUST show advanced notation, full algebraic steps, and a Zambian application (engineering, finance, or surveying). Define all variables and show every calculation step.`,
  },
  'Physics (Science)': {
    workedExamples: 4,
    practiceProblems: 4,
    format: `Each example MUST show:
1. Physical scenario in Zambian context (electricity, transport, construction)
2. Physics principle involved
3. Formula with ALL variables defined and SI units
4. Substitution with units shown
5. Calculation with every step
6. Final answer with correct units
Include at least 1 diagram description (e.g. "Draw a force diagram showing...").`,
  },
  'Chemistry (Science)': {
    workedExamples: 4,
    practiceProblems: 4,
    format: `Each example MUST show:
1. Chemical substance or reaction (Zambian context: mining, water treatment, cooking)
2. Balanced chemical equation
3. Step-by-step numerical calculation if applicable
4. Safety notes for any practical work
5. Real-world application explained`,
  },
  'Biology (Science)': {
    workedExamples: 3,
    practiceProblems: 3,
    format: `Each example MUST show:
1. Biological concept with diagram description ("Draw a diagram showing...")
2. Zambian organism or health context where applicable
3. Observable characteristics or processes step-by-step
4. Connection to learner's daily life in Zambia
Include at least 1 field observation activity.`,
  },
  'Science (Science)': {
    workedExamples: 3,
    practiceProblems: 4,
    format: `Include practical investigation steps, observations, and conclusions. Use Zambian environmental examples.`,
  },
}

const DEFAULT_EXAMPLE_REQUIREMENTS: SubjectExampleRequirements = {
  workedExamples: 3,
  practiceProblems: 3,
  format:
    'Include real-world Zambian examples with step-by-step explanations and clearly marked answers.',
}

export function getSubjectExampleRequirements(subject: string): SubjectExampleRequirements {
  const canonical = resolveCanonicalSubject(subject)
  return SUBJECT_EXAMPLE_REQUIREMENTS[canonical] || DEFAULT_EXAMPLE_REQUIREMENTS
}

export function getSubjectSpecificRequirements(subject: string): string {
  const canonical = resolveCanonicalSubject(subject)
  const requirements: Record<string, string> = {
    'Mathematics (Core)': `
- Include formulas with variables clearly defined
- Show all arithmetic steps — never skip calculations
- Use K (Kwacha) for currency examples
- Include at least 1 real-world problem from: market pricing, wages, farm production, or school budgets`,
    'Additional Mathematics (Core)': `
- Include calculus/algebra notation with full working
- Show proof steps or derivation where relevant
- Use Zambian engineering, economics, or finance contexts`,
    'Physics (Science)': `
- Include formulas: F=ma, v=u+at, P=IV, etc. as appropriate to the topic
- Show unit conversions (m/s, m, N, J, W)
- Include at least 1 practical experiment with observations
- Real-world examples: electricity load shedding, vehicle motion, construction`,
    'Chemistry (Science)': `
- Include balanced chemical equations
- Show atomic mass / mole calculations with steps
- Include at least 1 practical experiment with safety notes
- Real-world examples: Zambian mining, water treatment, food chemistry`,
    'Biology (Science)': `
- Include diagram descriptions ("Draw a diagram showing...")
- Describe cellular structures and processes step-by-step
- Include at least 1 field observation activity
- Real-world examples: Zambian flora/fauna, malaria prevention, nutrition`,
    'Science (Science)': `
- Combine biology, chemistry, and physics concepts as the topic requires
- Include hypothesis, method, observations, conclusion for investigations`,
  }

  return (requirements[canonical] || getSubjectGuidelines(canonical)).trim()
}

/** Mandatory worked-examples block — shared by CBC template and adaptive prompts. */
export function buildMandatoryWorkedExamplesBlock(params: {
  subject: string
  grade: string
  topic: string
  duration: number
}): string {
  const canonical = resolveCanonicalSubject(params.subject)
  const reqs = getSubjectExampleRequirements(canonical)
  const subjectSpecific = getSubjectSpecificRequirements(canonical)

  return `
CRITICAL REQUIREMENTS (NON-NEGOTIABLE — do NOT skip):

### SECTION A: WORKED EXAMPLES (${reqs.workedExamples} minimum, numbered Example 1, Example 2, …)
${reqs.format}

For EACH worked example you MUST:
- Use a real Zambian person's name (e.g. Chanda, Bwalya, Mwila, Nalubamba)
- Use a real Zambian place (e.g. Soweto Market Lusaka, Cairo Road, Nkana Kitwe, Chipata)
- Show EVERY calculation step — never write "students will learn" without solving a problem
- Mark the final answer clearly (Answer: …)

### SECTION B: PRACTICE EXERCISES (${reqs.practiceProblems} minimum)
For EACH practice exercise you MUST include:
1. Problem statement (clearly written)
2. Expected answer (with working or key steps)
3. Hint or solution outline

### SECTION C: FORBIDDEN CONTENT
Do NOT include:
- Generic statements like "students will learn algebraic expressions using Zambian context"
- Explanations without at least ${reqs.workedExamples} fully worked examples
- Practice exercises without answers
- Vague activities without concrete problems and solutions

### SECTION D: SUBJECT-SPECIFIC RULES FOR ${canonical}
${subjectSpecific}

Topic focus: "${params.topic}" for ${params.grade} (${params.duration} minutes).
Every sentence must be specific to ${canonical} — use correct terminology, formulas, or procedures.`
}

export function buildLessonPlanPrompt(params: {
  subject: string
  grade: string
  topic: string
  duration: number
  schoolName?: string
  subtopic?: string
  competenceFocus?: string
  additionalInstructions?: string
}): string {
  const canonical = resolveCanonicalSubject(params.subject)
  const reqs = getSubjectExampleRequirements(canonical)
  const subtopic = params.subtopic?.trim() || 'Not specified'
  const extras = params.additionalInstructions?.trim() || 'None'
  const competences = params.competenceFocus?.trim() || 'Critical Thinking and Problem Solving'
  const mandatoryBlock = buildMandatoryWorkedExamplesBlock({
    subject: canonical,
    grade: params.grade,
    topic: params.topic,
    duration: params.duration,
  })

  return `You are an experienced Zambian teacher creating a Competency-Based Curriculum (CBC) lesson plan aligned with the 2023 ZECF.

CREATE A LESSON PLAN FOR ${canonical}, ${params.grade}
Topic: ${params.topic}
Sub-topic: ${subtopic}
Duration: ${params.duration} minutes
School: ${params.schoolName || 'A Zambian school'}
Competence focus: ${competences}

${mandatoryBlock}

LESSON STRUCTURE (include all sections):
1. Introduction — hook with a real Zambian scenario related to "${params.topic}"
2. Worked Examples — ${reqs.workedExamples} full examples as specified in Section A above
3. Learner Activity — students solve similar problems in pairs/groups
4. Practice Exercises — ${reqs.practiceProblems} problems WITH answers (Section B)
5. Formative Assessment — quick check using one practice-style question
6. Conclusion — recap key formula/method and real-world link

Also include:
- LEARNING OUTCOMES (Know-Do-Value) specific to ${canonical}
- TEACHING & LEARNING MATERIALS (low-cost / local Zambian resources)
- DIFFERENTIATION (support + extension)
- ASSESSMENT rubric aligned to ${canonical}

Additional teacher instructions: ${extras}

Write the complete lesson plan now. Start with Worked Examples — they are the most important section.`
}

export type StoryQuestionTypes = {
  literal?: boolean
  inferential?: boolean
  evaluative?: boolean
}

export function buildStoryPrompt(params: {
  subject: string
  grade: string
  theme: string
  wordCount: number
  storyType?: string
  setting?: string
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
}): string {
  const canonical = resolveCanonicalSubject(params.subject)
  const storyType = mapStoryTypeToLabel(params.storyType || 'story')
  const context =
    STORY_SUBJECT_CONTEXT[canonical] ||
    'The story should be educational and engaging for learners in Zambia, integrating the subject naturally.'

  const setting = params.setting?.trim() || 'Zambia'
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
    if (params.questionTypes?.literal !== false) types.push('Literal — recall facts from the story')
    if (params.questionTypes?.inferential !== false)
      types.push('Inferential — read between the lines')
    if (params.questionTypes?.evaluative) types.push('Evaluative — opinion and judgement')
    const count = Math.min(Math.max(params.questionCount ?? 5, 1), 10)
    questionBlocks.push(`

COMPREHENSION QUESTIONS (${count} questions):
Question types to include: ${types.length ? types.join('; ') : 'Literal and inferential'}
Spread questions across the selected types and link to life in Zambia where possible.`)
    if (params.vocabularyExercises !== false) {
      questionBlocks.push(`
VOCABULARY EXERCISES:
Provide 3–5 short exercises using key words from the story.`)
    }
    if (params.discussionPrompts !== false) {
      questionBlocks.push(`
DISCUSSION PROMPTS:
Provide 2–3 open discussion prompts for the class.`)
    }
    if (params.writingExtension) {
      questionBlocks.push(`
WRITING EXTENSION:
Provide one short creative writing activity linked to the story theme.`)
    }
  }

  return `Write a ${storyType.toLowerCase()} for ${params.grade} Zambian students (approximately ${params.wordCount} words).

THEME / TOPIC: ${params.theme}
SUBJECT: ${canonical}
SETTING: ${setting}
CBC COMPETENCIES (Zambia 2023): ${competencies}

REQUIREMENTS:
1. Subject integration: ${context}
2. Zambian context: Zambian characters, places, culture. ${characterLine}
3. Educational value: Teach ${canonical} concepts through the narrative
4. Age-appropriate vocabulary for ${params.grade}${vocabularyLine ? `\n5. Vocabulary focus: ${vocabularyLine}` : ''}
${vocabularyLine ? '6' : '5'}. Engaging plot with clear beginning, middle, and end
${vocabularyLine ? '7' : '6'}. Learning outcome: Readers understand the subject concept by the end
${vocabularyLine ? '8' : '7'}. Language: ${languageLine}
${vocabularyLine ? '9' : '8'}. Align story outcomes to the listed CBC competencies${questionBlocks.join('')}

${PLAIN_TEXT_OUTPUT_RULES}

Write the ${storyType.toLowerCase()} now. Output plain text only — no markdown.`
}

export function buildQuizPrompt(params: {
  subject: string
  grade: string
  topic: string
  numQuestions: number
  difficulty?: string
  assessmentMode?: 'primary_mcq' | 'secondary_scenario' | 'sba_rubric'
}): string {
  const canonical = resolveCanonicalSubject(params.subject)
  const subjectGuidelines = getSubjectGuidelines(canonical)
  const difficulty = params.difficulty || 'medium'
  const mode = params.assessmentMode || 'primary_mcq'
  const isSecondary = mode === 'secondary_scenario'

  const typeRule = isSecondary
    ? 'Use ONLY structured, scenario, short, extended_response, or calculation types. NEVER use mcq or true_false.'
    : 'Use mcq, short, or true_false types (EPSC-style for primary).'

  const questionShape = isSecondary
    ? `{
      "id": "q1",
      "type": "structured|scenario|short|calculation",
      "question": "string with Zambian scenario context",
      "commandTerm": "State|Explain|Calculate|etc.",
      "elementOfConstruct": "string",
      "bloomsLevel": "Remembering|Understanding|Applying|Analysing|Evaluating|Creating",
      "answer": "string",
      "marks": number,
      "explanation": "string"
    }`
    : `{
      "id": "q1",
      "type": "mcq|short|true_false",
      "question": "string",
      "options": ["A", "B", "C", "D"],
      "answer": "string",
      "marks": number,
      "competencies": ["string"],
      "explanation": "string"
    }`

  return `Create a formative quiz for ${params.grade} ${canonical} learners and return ONLY valid JSON.

TOPIC: ${params.topic}
DIFFICULTY: ${difficulty}
QUESTION COUNT: ${params.numQuestions}
CURRICULUM: Zambian CBC / ECSEOL
ASSESSMENT MODE: ${mode}
QUESTION TYPES: ${typeRule}

SUBJECT-SPECIFIC APPROACH for ${canonical}:
${subjectGuidelines}

REQUIREMENTS:
1. Progressively increase difficulty
2. Include application/analysis questions (not only recall)
3. Use correct ${canonical} terminology
4. Reference Zambian examples where relevant (markets, provinces, local contexts)
5. Provide correct answer and brief explanation per question
6. Avoid trick questions
${isSecondary ? '7. Each item must include commandTerm and elementOfConstruct\n8. NEVER include multiple choice options' : ''}

Return JSON:
{
  "title": "string",
  "grade": "${params.grade}",
  "subject": "${canonical}",
  "topic": "${params.topic}",
  "totalMarks": number,
  "questions": [
    ${questionShape}
  ]
}

Do not include markdown, code fences, or extra text.`
}

export function buildReportCommentPrompt(params: {
  subject: string
  studentName: string
  grade: string
  performanceLevel: 'Excellent' | 'Good' | 'Satisfactory' | 'Needs Improvement'
  behavior?: string
  attendance?: string
  strengths?: string[]
  areasForImprovement?: string[]
}): string {
  const canonical = resolveCanonicalSubject(params.subject)
  const subjectGuidelines = getSubjectGuidelines(canonical)

  const performanceGuidance: Record<string, string> = {
    Excellent: 'Celebrate strengths and encourage continued excellence.',
    Good: 'Acknowledge good performance and suggest minor improvements.',
    Satisfactory: 'Recognize satisfactory work and identify specific development areas.',
    'Needs Improvement': 'Be constructive, identify specific challenges, and offer encouragement.',
  }

  const strengths = (params.strengths || []).filter(Boolean).join(', ') || 'Not specified'
  const areas = (params.areasForImprovement || []).filter(Boolean).join(', ') || 'Not specified'

  return `Write a professional report comment for ${params.studentName} in ${canonical} (Grade ${params.grade}).

PERFORMANCE LEVEL: ${params.performanceLevel}
TONE: ${performanceGuidance[params.performanceLevel]}
BEHAVIOR: ${params.behavior || 'Good'}
ATTENDANCE: ${params.attendance || 'Regular'}
STRENGTHS: ${strengths}
AREAS FOR IMPROVEMENT: ${areas}

SUBJECT-SPECIFIC FOCUS (${canonical}):
${subjectGuidelines}

The comment should:
1. Be specific to ${canonical} skills and knowledge
2. Be constructive and encouraging (2-4 sentences)
3. Suggest next steps
4. Reference CBC competences (Critical Thinking, Collaboration, Communication, Creativity, Citizenship)
5. Suit Zambian schools; simple English for parents
6. Do NOT include marks or percentages

${PLAIN_TEXT_OUTPUT_RULES}

Write the comment only (plain text, no JSON, no markdown).`
}

export function buildEczPracticePrompt(params: {
  subject: string
  examLevel: string
  topic: string
  questionCount: number
  assessmentMode?: 'primary_mcq' | 'secondary_scenario'
}): string {
  const canonical = resolveCanonicalSubject(params.subject)
  const subjectGuidelines = getSubjectGuidelines(canonical)
  const levelLabel = String(params.examLevel || 'grade9').trim()
  const isSecondary =
    params.assessmentMode === 'secondary_scenario' ||
    /^form[1-6]$/i.test(levelLabel.replace(/\s+/g, '')) ||
    /^grade(8|9|10|11|12)$/.test(levelLabel.replace(/\s+/g, ''))

  if (isSecondary) {
    return `Create ECSEOL-style scenario-based practice for Zambian secondary learners. Return ONLY valid JSON.

Subject: ${canonical}
Exam Level: ${levelLabel}
Topic: ${params.topic}
Scenario Count: ${Math.min(3, Math.max(1, Math.ceil(params.questionCount / 3)))}

SUBJECT-SPECIFIC APPROACH for ${canonical}:
${subjectGuidelines}

ECSEOL RULES (MANDATORY):
- NO multiple choice — hasMultipleChoice must be false on every scenario
- Each scenario: 2-4 sentence Zambian context (market, farm, school, province)
- 2-4 sub-questions per scenario with command terms (State, Explain, Calculate, etc.)
- Map each scenario to an element of construct
- Include Bloom level and model answer per sub-question

Return JSON:
{
  "paper": {
    "examInfo": {
      "subject": "${canonical}",
      "level": "${levelLabel}",
      "topic": "${params.topic}",
      "totalMarks": number,
      "timeAllowed": "string"
    },
    "scenarios": [
      {
        "questionNumber": 1,
        "zambianScenario": "string (min 30 chars, real Zambian context)",
        "elementOfConstruct": "string",
        "hasMultipleChoice": false,
        "subQuestions": [
          {
            "number": "(a)",
            "commandTerm": "Explain",
            "question": "string",
            "marks": number,
            "bloomsLevel": "Applying",
            "modelAnswer": "mark scheme"
          }
        ],
        "totalMarks": number
      }
    ],
    "questions": []
  }
}

No markdown or code fences.`
  }

  return `Create ECZ-style EPSC practice questions for Zambian primary learners and return ONLY valid JSON.

Subject: ${canonical}
Exam Level: ${levelLabel} (primary Grades 1–7 — MCQ allowed for external exam prep)
Topic: ${params.topic}
Question Count: ${params.questionCount}

Adapt question difficulty, vocabulary, and format to match ${levelLabel} exactly.

SUBJECT-SPECIFIC APPROACH for ${canonical}:
${subjectGuidelines}

Return JSON:
{
  "paper": {
    "examInfo": {
      "subject": "${canonical}",
      "level": "${levelLabel}",
      "topic": "${params.topic}",
      "totalMarks": number,
      "timeAllowed": "string"
    },
    "questions": [
      {
        "id": "q1",
        "type": "mcq|short",
        "question": "string",
        "options": ["string"],
        "marks": number,
        "answer": "string",
        "explanation": "string"
      }
    ]
  }
}

Rules:
- MCQ and short answer appropriate for EPSC primary levels
- Use Zambian context where relevant
- Include marking guidance in answer and explanation
- No markdown or code fences.`
}

export function buildEczExamPrompt(params: {
  subject: string
  form: string
  topic: string
  elementOfConstruct?: string
  scenarioCount?: number
}): string {
  const canonical = resolveCanonicalSubject(params.subject)
  const subjectGuidelines = getSubjectGuidelines(canonical)
  const form = String(params.form || 'Form 2').trim()
  const count = Math.min(3, Math.max(1, params.scenarioCount ?? 1))
  const eoc = params.elementOfConstruct
    ? `Focus on element of construct: ${params.elementOfConstruct}`
    : 'Select appropriate elements of construct for the topic.'

  return `Create ${count} ECSEOL-compliant exam scenario(s) for ${form} ${canonical} and return ONLY valid JSON.

Topic: ${params.topic}
${eoc}

SUBJECT-SPECIFIC APPROACH for ${canonical}:
${subjectGuidelines}

MANDATORY ECSEOL RULES:
- hasMultipleChoice: false on EVERY scenario
- zambianScenario: 2-4 sentences with authentic Zambian context
- 2-6 sub-questions per scenario with valid command terms
- Include bloomsLevel and modelAnswer (mark scheme) per sub-question
- totalMarks must equal sum of sub-question marks

Return JSON matching the scenarios array schema with questionNumber, zambianScenario, subject, form, elementOfConstruct, subQuestions, totalMarks, hasMultipleChoice: false.

No markdown or code fences.`
}

export function buildProjectPrompt(params: {
  subject: string
  grade: string
  topic: string
  taskType?: string
  resourceLevel?: string
}): string {
  const canonical = resolveCanonicalSubject(params.subject)
  const subjectGuidelines = getSubjectGuidelines(canonical)
  const taskType = params.taskType || 'Project'
  const resourceLevel = params.resourceLevel || 'moderate'

  return `Create an ECZ School-Based Assessment (SBA) ${taskType} brief for Zambian secondary learners.

Subject: ${params.subject}
Form / grade: ${params.grade}
Syllabus topic: ${params.topic}
Resource level: ${resourceLevel}

${subjectGuidelines}

MANDATORY RULES:
- Authentic Zambian context (named towns/provinces, occupations, community settings — not generic Africa)
- Age-appropriate for ${params.grade}
- Extended investigation style: clear aim, steps, timeline/checkpoints, deliverables
- Rubric: 4-level ECZ descriptors (Excellent / Good / Fair / Needs Improvement) with competence-based language
- Prefer criteria such as Planning & process, Application, Creativity, Presentation (adapt to subject)
- Materials must be realistic for a ${resourceLevel}-resourced Zambian school
- Align to Zambia CBC / ECSEOL competencies for this topic

Return JSON matching the project brief schema (title, context, instructions, steps, deliverables, timeline, materials, demonstration, competencies, criteria).

No markdown or code fences.`
}
