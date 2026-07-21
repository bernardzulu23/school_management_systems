/**
 * ECZ / ECSEOL reference constants (2023 ZECF, Assessment Schemes 2026).
 * @see docs/doc/ECSEOL Assessment Schemes_22_4_2026.pdf
 */

export const ECZ_COMMAND_TERMS = [
  {
    term: 'State',
    meaning: 'Provide a simple answer without explanation',
    example: 'List three causes of soil erosion',
  },
  {
    term: 'List',
    meaning: 'Provide a simple answer without explanation',
    example: 'List three causes of soil erosion',
  },
  {
    term: 'Define',
    meaning: 'Give the precise meaning of a term',
    example: 'Define photosynthesis',
  },
  {
    term: 'Describe',
    meaning: 'Give a detailed account',
    example: 'Describe the process of digestion',
  },
  {
    term: 'Explain',
    meaning: 'Give reasons for an event or phenomenon',
    example: 'Explain why leaves turn yellow',
  },
  {
    term: 'Calculate',
    meaning: 'Work out using mathematical operations',
    example: 'Calculate the area of the field',
  },
  {
    term: 'Compare',
    meaning: 'Describe similarities and differences',
    example: 'Compare modern and traditional farming',
  },
  {
    term: 'Contrast',
    meaning: 'Focus only on differences',
    example: 'Contrast UNIP and MMD governments',
  },
  {
    term: 'Analyse',
    meaning: 'Break down into components',
    example: 'Analyse causes of the Rwandan genocide',
  },
  {
    term: 'Evaluate',
    meaning: 'Make a judgement based on criteria',
    example: 'Evaluate the effectiveness of SBA',
  },
  {
    term: 'Design',
    meaning: 'Plan and create',
    example: 'Design an experiment to test water quality',
  },
  {
    term: 'Justify',
    meaning: 'Provide valid reasons',
    example: 'Justify your choice of farming method',
  },
  {
    term: 'Synthesise',
    meaning: 'Combine information from multiple sources',
    example: 'Synthesise passage and graph data',
  },
  {
    term: 'Discuss',
    meaning: 'Present arguments for and against',
    example: 'Discuss impact of deforestation',
  },
  {
    term: 'Identify',
    meaning: 'Name or point out',
    example: 'Identify the organelle responsible for photosynthesis',
  },
  { term: 'Outline', meaning: 'Give main points briefly', example: 'Outline the water cycle' },
  {
    term: 'Summarise',
    meaning: 'Give concise overview in own words',
    example: 'Summarise the passage in 80 words',
  },
]

/** Target Bloom distribution for secondary final examinations (ECSEOL §2.4.4). */
export const ECZ_BLOOM_TARGETS = {
  Remembering: { min: 10, max: 15 },
  Understanding: { min: 20, max: 25 },
  Applying: { min: 25, max: 30 },
  Analysing: { min: 15, max: 20 },
  Evaluating: { min: 10, max: 15 },
  Creating: { min: 5, max: 10 },
}

export const ECZ_SBA_TASK_TYPES = [
  'Project',
  'Practical task',
  'Assignment',
  'Presentation',
  'Fieldwork',
  'Portfolio',
  'Observation',
  'Exercises',
  'End of term test',
]

export const ECZ_ZAMBIAN_CONTEXTS = [
  'Soweto Market, Lusaka',
  'Mukuba Secondary School, Kitwe',
  'Mkushi maize farmer',
  'Victoria Falls, Livingstone',
  'Copperbelt mining community',
  'David Kaunda Secondary School, Lusaka',
  'Chipata General Hospital',
  'Kafue water treatment',
  'Luapula Province community health',
  'Kabwe soil neutralisation',
  'Kuomboka ceremony, Western Province',
  'Ncwala ceremony, Eastern Province',
  'Minibus driver Lusaka–Kabwe route',
  'Munali Secondary School canteen',
  'Agro-ecological Region II farmer',
]

export const ECZ_SECONDARY_QUESTION_TYPES = [
  'structured',
  'scenario',
  'problem_solving',
  'extended_response',
  'calculation',
  'case_study',
  'data_interpretation',
]
