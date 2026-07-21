/**
 * ECZ Rubric & SBA Assessment Builder — aligned with docs/doc/eczrubricbuilder.md
 * Zambia CBC / ECZ-ZECF 2023 · Forms 1–3 SBA · 4-level scale
 */

export const ECZ_RUBRIC_LEVELS = [
  { value: 4, key: 'excellent', label: 'Excellent', short: '4' },
  { value: 3, key: 'good', label: 'Good', short: '3' },
  { value: 2, key: 'fair', label: 'Fair', short: '2' },
  { value: 1, key: 'needs_improvement', label: 'Needs Improvement', short: '1' },
]

/** ECZ term weighting for annual SBA (Forms 1–3). */
export const ECZ_TERM_WEIGHTS = {
  1: { percent: 20, label: 'Term 1 (20%)' },
  2: { percent: 30, label: 'Term 2 (30%)' },
  3: { percent: 50, label: 'Term 3 (50%)' },
}

export const ECZ_SBA_TASK_TYPES = [
  { value: 'Project', label: 'Project (extended investigation)' },
  { value: 'Practical', label: 'Practical task (hands-on activity)' },
  { value: 'Assignment', label: 'Assignment / Homework' },
  { value: 'Presentation', label: 'Presentation (oral/visual)' },
  { value: 'Field Study', label: 'Fieldwork (data collection outside classroom)' },
  { value: 'Portfolio', label: 'Portfolio (collection of work over time)' },
  { value: 'Observation', label: 'Observation (teacher observation record)' },
  { value: 'Exercises', label: 'Exercises (class / homework practice items)' },
  { value: 'End of term test', label: 'End of term test (formal written)' },
  { value: 'Investigation', label: 'Investigation' },
  { value: 'Experiment', label: 'Experiment' },
]

export const ECZ_SBA_MARKS = {
  taskMax: 20,
  termTestMax: 40,
  totalMax: 100,
  tasksCount: 3,
}

function subjectCategory(subjectName = '') {
  const s = String(subjectName).toLowerCase()
  if (/math|algebra|geometry|calculus|statistics/.test(s)) return 'mathematics'
  if (/english|literature|language|french|zambian lang/.test(s)) return 'languages'
  if (/biology|chemistry|physics|science|agric/.test(s)) return 'sciences'
  if (/civic|history|geography|religious|social/.test(s)) return 'humanities'
  if (/art|music|food|nutrition|physical|sport|home econ|design|ict|computer|technical/.test(s))
    return 'practical'
  return 'general'
}

const TEMPLATE_SETS = {
  sciences: [
    {
      name: 'Practical skills',
      description: 'Safe, accurate use of apparatus and procedures',
      excellent:
        'Demonstrates highly skilled, safe practical techniques with minimal guidance; procedures are precise and efficient.',
      good: 'Demonstrates competent practical skills with occasional guidance; procedures are mostly accurate.',
      fair: 'Demonstrates basic practical skills with frequent guidance; some errors in procedure.',
      needsImpr: 'Limited practical skills; unsafe or inaccurate procedures even with support.',
    },
    {
      name: 'Scientific knowledge',
      description: 'Understanding of concepts linked to the task',
      excellent:
        'Explains concepts clearly and accurately using correct scientific vocabulary and Zambian examples.',
      good: 'Explains most concepts accurately with appropriate vocabulary.',
      fair: 'Shows partial understanding; some misconceptions or incomplete explanations.',
      needsImpr: 'Limited understanding; cannot explain key concepts.',
    },
    {
      name: 'Application & analysis',
      description: 'Uses knowledge in the Zambian context',
      excellent:
        'Applies knowledge creatively to analyse real Zambian situations; draws justified conclusions.',
      good: 'Applies knowledge appropriately to familiar Zambian contexts.',
      fair: 'Some application to context; analysis is superficial.',
      needsImpr: 'Little or no application to real-life Zambian context.',
    },
    {
      name: 'Communication',
      description: 'Recording, diagrams, and reporting',
      excellent:
        'Records are clear, labelled, and well-organised; diagrams and tables enhance the report.',
      good: 'Records are mostly clear and organised with suitable diagrams.',
      fair: 'Records are incomplete or poorly organised.',
      needsImpr: 'Records are unclear, missing, or inaccurate.',
    },
    {
      name: 'Teamwork & responsibility',
      description: 'Collaboration and care of materials',
      excellent:
        'Works collaboratively, shares roles fairly, and cares for equipment and environment.',
      good: 'Works well with others and handles materials responsibly.',
      fair: 'Participates inconsistently; occasional carelessness.',
      needsImpr: 'Rarely collaborates or handles materials irresponsibly.',
    },
  ],
  mathematics: [
    {
      name: 'Problem understanding',
      description: 'Interprets the task and identifies what to solve',
      excellent:
        'Fully interprets the problem, identifies all variables, and selects an appropriate strategy.',
      good: 'Interprets the problem correctly and chooses a suitable strategy.',
      fair: 'Partial interpretation; strategy may not fit the problem.',
      needsImpr: 'Cannot interpret the problem or choose a strategy.',
    },
    {
      name: 'Accuracy',
      description: 'Correct calculations and final answers',
      excellent: 'Calculations are accurate throughout; units and rounding are correct.',
      good: 'Most calculations correct with minor errors that do not affect the conclusion.',
      fair: 'Several calculation errors; answer may be unreasonable.',
      needsImpr: 'Frequent errors; answer is incorrect or missing.',
    },
    {
      name: 'Method & working',
      description: 'Shows logical steps and working',
      excellent: 'Working is systematic, logical, and easy to follow from start to finish.',
      good: 'Working is mostly logical with clear steps shown.',
      fair: 'Working is incomplete or difficult to follow.',
      needsImpr: 'Little or no working shown; method is unclear.',
    },
    {
      name: 'Zambian context',
      description: 'Uses local data, currency, or situations',
      excellent:
        'Uses authentic Zambian contexts (Kwacha, local distances, market data) effectively in the solution.',
      good: 'Includes relevant Zambian context in the solution.',
      fair: 'Context is generic or only partly Zambian.',
      needsImpr: 'No meaningful Zambian context.',
    },
    {
      name: 'Presentation',
      description: 'Neat layout, labels, and communication',
      excellent: 'Solution is neatly presented with labels, units, and a clear final statement.',
      good: 'Presentation is clear and mostly neat.',
      fair: 'Presentation is untidy or missing labels.',
      needsImpr: 'Presentation is poor or disorganised.',
    },
  ],
  languages: [
    {
      name: 'Content & ideas',
      description: 'Relevance, depth, and creativity of ideas',
      excellent:
        'Ideas are insightful, well-developed, and fully relevant to the task and Zambian context.',
      good: 'Ideas are clear, relevant, and adequately developed.',
      fair: 'Ideas are basic or partly off-topic.',
      needsImpr: 'Ideas are unclear, minimal, or off-topic.',
    },
    {
      name: 'Language accuracy',
      description: 'Grammar, spelling, and vocabulary',
      excellent:
        'Consistent control of grammar, spelling, and vocabulary appropriate to form level.',
      good: 'Generally accurate language with minor errors.',
      fair: 'Frequent errors that sometimes obscure meaning.',
      needsImpr: 'Errors seriously limit communication.',
    },
    {
      name: 'Organisation',
      description: 'Structure, paragraphs, and flow',
      excellent: 'Text is well structured with effective openings, development, and conclusions.',
      good: 'Organisation is logical with clear paragraphs.',
      fair: 'Some organisation; parts are hard to follow.',
      needsImpr: 'Little organisation; difficult to follow.',
    },
    {
      name: 'Zambian context',
      description: 'Local settings, names, and cultural relevance',
      excellent: 'Rich use of Zambian settings, people, and experiences that strengthen the piece.',
      good: 'Includes appropriate Zambian references.',
      fair: 'Limited or stereotypical local references.',
      needsImpr: 'No meaningful Zambian context.',
    },
  ],
  humanities: [
    {
      name: 'Knowledge of content',
      description: 'Accurate use of facts and concepts',
      excellent:
        'Demonstrates thorough, accurate knowledge with relevant Zambian historical/geographic examples.',
      good: 'Demonstrates sound knowledge with some local examples.',
      fair: 'Basic knowledge; examples may be vague or inaccurate.',
      needsImpr: 'Limited or inaccurate knowledge.',
    },
    {
      name: 'Analysis & evaluation',
      description: 'Explains causes, effects, and viewpoints',
      excellent: 'Analyses issues deeply; evaluates viewpoints with justified conclusions.',
      good: 'Explains causes and effects with reasonable evaluation.',
      fair: 'Description with little analysis.',
      needsImpr: 'No analysis; only lists facts.',
    },
    {
      name: 'Use of evidence',
      description: 'Maps, data, sources, or case studies',
      excellent: 'Uses varied evidence skillfully to support arguments.',
      good: 'Uses evidence appropriately to support main points.',
      fair: 'Limited evidence; may not support points.',
      needsImpr: 'No evidence used.',
    },
    {
      name: 'Communication',
      description: 'Clarity of writing or presentation',
      excellent: 'Communicates ideas clearly and persuasively.',
      good: 'Communicates ideas clearly.',
      fair: 'Communication is sometimes unclear.',
      needsImpr: 'Communication is unclear.',
    },
  ],
  practical: [
    {
      name: 'Technical skill',
      description: 'Quality of practical work or product',
      excellent: 'High-quality finish; techniques show mastery and creativity.',
      good: 'Good quality with competent techniques.',
      fair: 'Acceptable quality with support.',
      needsImpr: 'Poor quality; incomplete work.',
    },
    {
      name: 'Creativity',
      description: 'Originality and design choices',
      excellent: 'Highly original design appropriate to Zambian context.',
      good: 'Some creative choices evident.',
      fair: 'Limited creativity; closely follows a model.',
      needsImpr: 'No evidence of creativity.',
    },
    {
      name: 'Planning & process',
      description: 'Follows stages and records process',
      excellent: 'Plans thoroughly and documents each stage clearly.',
      good: 'Plans adequately and records most stages.',
      fair: 'Incomplete planning or documentation.',
      needsImpr: 'No planning evident.',
    },
    {
      name: 'Health & safety',
      description: 'Safe use of tools and materials',
      excellent: 'Consistently follows safety rules and cares for workspace.',
      good: 'Usually works safely.',
      fair: 'Needs reminders about safety.',
      needsImpr: 'Unsafe practices observed.',
    },
  ],
  general: [
    {
      name: 'Quality of work',
      description: 'Overall standard of the response',
      excellent: 'Exceeds expectations; work is thorough, accurate, and polished.',
      good: 'Meets expectations; work is complete and accurate.',
      fair: 'Partially meets expectations; noticeable gaps.',
      needsImpr: 'Below expectations; incomplete or inaccurate.',
    },
    {
      name: 'Understanding',
      description: 'Demonstrates grasp of key ideas',
      excellent: 'Deep understanding; explains and applies ideas confidently.',
      good: 'Solid understanding shown in the response.',
      fair: 'Basic understanding with errors.',
      needsImpr: 'Limited understanding demonstrated.',
    },
    {
      name: 'Application',
      description: 'Applies learning to the task and context',
      excellent: 'Creative application to real Zambian situations.',
      good: 'Appropriate application to the task.',
      fair: 'Some application with support.',
      needsImpr: 'Minimal application.',
    },
    {
      name: 'Presentation',
      description: 'Organisation, neatness, and clarity',
      excellent: 'Well organised, neat, and easy to follow.',
      good: 'Organised and mostly clear.',
      fair: 'Somewhat organised.',
      needsImpr: 'Poorly organised or unclear.',
    },
  ],
}

const TASK_TYPE_CRITERIA_HINTS = {
  Project: ['Planning & process', 'Application', 'Creativity', 'Presentation'],
  Practical: ['Practical skills', 'Technical skill', 'Health & safety', 'Application'],
  Presentation: ['Content & ideas', 'Communication', 'Zambian context', 'Organisation'],
  'Field Study': ['Use of evidence', 'Application & analysis', 'Zambian context', 'Communication'],
  Portfolio: ['Quality of work', 'Planning & process', 'Creativity', 'Presentation'],
  Observation: ['Understanding', 'Application', 'Communication', 'Quality of work'],
}

/**
 * Generate ECZ-aligned rubric criteria (template-based, no external API required).
 */
export function generateEczRubricCriteria({
  subjectName = '',
  taskType = 'Project',
  numCriteria = 4,
  title = '',
  description = '',
} = {}) {
  const n = Math.min(6, Math.max(3, Number(numCriteria) || 4))
  const category = subjectCategory(subjectName)
  const pool = [...(TEMPLATE_SETS[category] || TEMPLATE_SETS.general)]

  const hints = TASK_TYPE_CRITERIA_HINTS[taskType] || []
  const picked = []
  const used = new Set()

  for (const hint of hints) {
    if (picked.length >= n) break
    const match = pool.find((c) => c.name.includes(hint) || hint.includes(c.name.split(' ')[0]))
    if (match && !used.has(match.name)) {
      picked.push({ ...match })
      used.add(match.name)
    }
  }

  for (const c of pool) {
    if (picked.length >= n) break
    if (!used.has(c.name)) {
      picked.push({ ...c })
      used.add(c.name)
    }
  }

  if (title || description) {
    const ctx = [title, description].filter(Boolean).join(' — ')
    picked[0] = {
      ...picked[0],
      description: picked[0]?.description
        ? `${picked[0].description} (Task: ${ctx.slice(0, 120)})`
        : `Aligned to: ${ctx.slice(0, 120)}`,
    }
  }

  return picked.slice(0, n)
}

/** Map generated criteria to Prisma create shape for EczRubricCriterion */
export function criteriaToPrismaCreate(criteria = []) {
  return criteria.map((c) => ({
    name: String(c.name || 'Criterion').trim(),
    excellent: String(c.excellent || '').trim(),
    good: String(c.good || '').trim(),
    fair: String(c.fair || '').trim(),
    needsImpr: String(c.needs_improvement || c.needsImpr || '').trim(),
  }))
}

export function rubricMaxPoints(numCriteria) {
  return (Number(numCriteria) || 4) * 4
}

export function scoreFromCriterionLevels(levels = [], numCriteria) {
  const vals = levels.map((v) => Number(v)).filter((v) => v >= 1 && v <= 4)
  if (!vals.length) return { total: 0, outOf: rubricMaxPoints(numCriteria || vals.length) }
  const total = vals.reduce((a, b) => a + b, 0)
  const outOf = (numCriteria || vals.length) * 4
  const scaled = Math.round((total / outOf) * ECZ_SBA_MARKS.taskMax)
  return { total, outOf, scaled }
}
