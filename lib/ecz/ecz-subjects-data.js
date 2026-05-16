/**
 * ECZ Assessment Guidelines — subjects, constructs, and elements.
 * Reference: docs/doc/ECZ ASSESSMENT GUIDELINES.pdf (via update-2.md)
 */

export const ECZ_SUBJECTS = [
  {
    name: 'Mathematics I',
    code: 'MATH1',
    construct:
      'Demonstrates numerical proficiency, critical thinking, logical and spatial reasoning to solve problems in real life.',
    elements: [
      {
        number: 1,
        statement:
          'Interprets and performs operations on numbers to make decisions (Numbers, Integers, Approximation)',
      },
      {
        number: 2,
        statement:
          'Uses algebraic thinking to model and solve problems (Algebra, Sets, Relations & Functions)',
      },
      {
        number: 3,
        statement:
          'Applies spatial reasoning to geometric situations (Angles, Polygons, Similarity & Congruency)',
      },
      {
        number: 4,
        statement:
          'Interprets and analyses data to make informed decisions (Statistics, Financial Arithmetic)',
      },
    ],
  },
  {
    name: 'Mathematics II',
    code: 'MATH2',
    construct:
      'Demonstrates numerical proficiency, critical thinking, logical and spatial reasoning to solve problems in real life.',
    elements: [
      { number: 1, statement: 'Index notation and number bases' },
      { number: 2, statement: 'Equations and matrices' },
      { number: 3, statement: 'Variation and mensuration' },
      { number: 4, statement: 'Symmetry and probability' },
    ],
  },
  {
    name: 'English Language',
    code: 'ENG',
    construct:
      'Communicates effectively and confidently in English language both orally and in writing across various contexts and audiences.',
    elements: [
      {
        number: 1,
        statement:
          'Listens and responds appropriately in various contexts (Listening and Speaking)',
      },
      { number: 2, statement: 'Reads and comprehends various text types (Reading Comprehension)' },
      {
        number: 3,
        statement: 'Writes clearly and coherently for different purposes (Composition Writing)',
      },
      { number: 4, statement: 'Applies grammatical structures accurately (Structure)' },
      { number: 5, statement: 'Summarises information concisely (Summary)' },
    ],
  },
  {
    name: 'Biology',
    code: 'BIO',
    construct:
      'Demonstrates understanding of living organisms, their structure, functions, and interactions with the environment through scientific inquiry.',
    elements: [
      { number: 1, statement: 'Demonstrates understanding of cell structure and function' },
      {
        number: 2,
        statement: 'Explains the processes of nutrition, transport, and respiration in organisms',
      },
      {
        number: 3,
        statement: 'Demonstrates understanding of reproduction, growth, and development',
      },
      {
        number: 4,
        statement: 'Analyses ecological relationships and human impact on the environment',
      },
    ],
  },
  {
    name: 'Chemistry',
    code: 'CHEM',
    construct:
      'Demonstrates understanding of the composition, structure, properties, and transformations of matter through experimental inquiry.',
    elements: [
      { number: 1, statement: 'Understands the structure of atoms and the periodic table' },
      { number: 2, statement: 'Explains chemical bonding and the properties of compounds' },
      { number: 3, statement: 'Performs calculations using the mole concept and stoichiometry' },
      { number: 4, statement: 'Analyses chemical reactions and energy changes' },
      { number: 5, statement: 'Demonstrates practical laboratory skills' },
    ],
  },
  {
    name: 'Physics',
    code: 'PHYS',
    construct:
      'Demonstrates understanding of matter, energy, and their interactions through experimental investigation and problem-solving.',
    elements: [
      { number: 1, statement: 'Applies measurement and units to physical quantities' },
      { number: 2, statement: 'Analyses forces, motion, and energy in real-life contexts' },
      { number: 3, statement: 'Understands wave phenomena including light and sound' },
      { number: 4, statement: 'Demonstrates knowledge of electricity, magnetism, and electronics' },
    ],
  },
  {
    name: 'Civic Education',
    code: 'CIVIC',
    construct:
      'Demonstrates understanding of civic rights, responsibilities, governance systems, and national values to participate effectively in Zambian society.',
    elements: [
      { number: 1, statement: 'Understands the political development and governance of Zambia' },
      {
        number: 2,
        statement: 'Demonstrates knowledge of citizenship rights, duties, and responsibilities',
      },
      { number: 3, statement: 'Analyses the constitution, elections, and the legal system' },
      { number: 4, statement: 'Promotes national values, peace, and conflict resolution' },
    ],
  },
  {
    name: 'History',
    code: 'HIST',
    construct:
      "Demonstrates understanding of Zambia's historical development, African heritage, and global events to promote good citizenship and national identity.",
    elements: [
      {
        number: 1,
        statement: "Analyses Zambia's early history, including the origins of its peoples",
      },
      {
        number: 2,
        statement: 'Examines the slave trade, colonialism, and the independence struggle',
      },
      { number: 3, statement: 'Evaluates post-independence political and economic development' },
      { number: 4, statement: 'Analyses global events such as the World Wars and the Cold War' },
    ],
  },
  {
    name: 'Geography',
    code: 'GEOG',
    construct:
      'Analyses spatial relationships, human-environmental interaction, and sustainable development using geographical tools and technologies.',
    elements: [
      {
        number: 1,
        statement: "Understands the solar system, Earth's structure, and weather/climate",
      },
      { number: 2, statement: 'Applies map reading skills to locate features and navigate' },
      { number: 3, statement: 'Analyses population, settlement patterns, and urbanisation' },
      { number: 4, statement: 'Evaluates the use and management of natural resources' },
    ],
  },
  {
    name: 'Religious Education',
    code: 'RE',
    construct:
      'Demonstrates understanding of religious beliefs, values, and practices from Christianity, Islam, Hinduism, and Zambian Traditional Religion to promote moral living and social harmony.',
    elements: [
      { number: 1, statement: 'Demonstrates knowledge of the four main religions in Zambia' },
      { number: 2, statement: 'Analyses moral issues and ethical decision-making' },
      { number: 3, statement: 'Applies religious teachings to real-life situations' },
      { number: 4, statement: 'Evaluates the role of religion in promoting peace and unity' },
    ],
  },
  {
    name: 'Zambian Languages',
    code: 'ZLANG',
    construct:
      'Communicates effectively in a Zambian language, demonstrating appreciation of Zambian cultural values, oral traditions, and linguistic structures.',
    elements: [
      { number: 1, statement: 'Listens and speaks appropriately in various contexts' },
      { number: 2, statement: 'Reads and comprehends texts in a Zambian language' },
      { number: 3, statement: 'Writes clearly and correctly in a Zambian language' },
      { number: 4, statement: 'Applies grammatical structures appropriately' },
      {
        number: 5,
        statement: 'Understands and uses oral literature (proverbs, riddles, folktales)',
      },
    ],
  },
  {
    name: 'Literature in English',
    code: 'LIT',
    construct:
      'Demonstrates understanding and appreciation of literary works through critical analysis, interpretation, and creative expression.',
    elements: [
      { number: 1, statement: 'Understands the genres and forms of literature' },
      { number: 2, statement: 'Analyses prose, drama, and poetry using literary devices' },
      { number: 3, statement: 'Interprets themes, characters, and settings in literary texts' },
      { number: 4, statement: 'Creates original literary works' },
    ],
  },
  {
    name: 'Computer Studies/ICT',
    code: 'ICT',
    construct:
      'Demonstrates digital literacy skills to use ICT tools responsibly and effectively for learning, communication, and problem-solving.',
    elements: [
      { number: 1, statement: 'Demonstrates understanding of computer hardware and software' },
      {
        number: 2,
        statement: 'Uses productivity tools (word processors, spreadsheets, presentations)',
      },
      { number: 3, statement: 'Navigates the internet and uses online tools safely' },
      { number: 4, statement: 'Understands cybersecurity and digital citizenship' },
    ],
  },
  {
    name: 'Physical Education and Sport',
    code: 'PE',
    construct:
      'Demonstrates physical literacy, understanding of health, fitness, and sports skills to promote lifelong healthy living.',
    elements: [
      {
        number: 1,
        statement: 'Demonstrates knowledge of the history and importance of physical education',
      },
      {
        number: 2,
        statement: 'Performs fitness activities and understands health-related components',
      },
      { number: 3, statement: 'Applies skills in various sports and games' },
      { number: 4, statement: 'Understands anatomy, physiology, and sports biomechanics' },
    ],
  },
  {
    name: 'Art and Design',
    code: 'ART',
    construct:
      'Demonstrates creative expression, visual literacy, and technical skills through various art forms to communicate ideas and appreciate cultural heritage.',
    elements: [
      { number: 1, statement: 'Demonstrates understanding of visual arts elements and principles' },
      {
        number: 2,
        statement: 'Creates original artworks in various media (drawing, painting, crafts)',
      },
      { number: 3, statement: 'Appreciates Zambian and African art heritage' },
      { number: 4, statement: 'Applies entrepreneurial skills in art' },
    ],
  },
  {
    name: 'Music Arts',
    code: 'MUSIC',
    construct:
      'Demonstrates musical understanding, creativity, and performance skills through analysing, composing, and performing music.',
    elements: [
      { number: 1, statement: 'Understands music theory (rhythm, pitch, intervals, harmony)' },
      { number: 2, statement: 'Appreciates Zambian and African music styles' },
      { number: 3, statement: 'Demonstrates performance skills on voice or instrument' },
      { number: 4, statement: 'Composes original music' },
    ],
  },
  {
    name: 'Food and Nutrition',
    code: 'FN',
    construct:
      'Demonstrates understanding of food science, nutrition principles, and practical culinary skills to promote health and entrepreneurship.',
    elements: [
      { number: 1, statement: 'Understands food nutrients and their importance' },
      { number: 2, statement: 'Applies principles of meal planning and food preparation' },
      { number: 3, statement: 'Demonstrates food safety and hygiene practices' },
      { number: 4, statement: 'Explores entrepreneurial opportunities in food' },
    ],
  },
  {
    name: 'Travel and Tourism',
    code: 'TT',
    construct:
      'Demonstrates understanding of the travel and tourism industry, including destinations, services, sustainability, and entrepreneurship.',
    elements: [
      {
        number: 1,
        statement: 'Understands the history and structure of the tourism industry in Zambia',
      },
      { number: 2, statement: 'Identifies and promotes tourist attractions in Zambia' },
      { number: 3, statement: 'Applies principles of customer care and tour guiding' },
      { number: 4, statement: 'Analyses sustainable tourism practices' },
    ],
  },
  {
    name: 'Agricultural Science',
    code: 'AGR',
    construct:
      'Demonstrates understanding of agricultural principles, practices, and enterprises to contribute to food security and economic development.',
    elements: [
      {
        number: 1,
        statement: 'Understands agriculture in Zambia (importance, activities, factors)',
      },
      { number: 2, statement: 'Applies principles of soil science and crop production' },
      { number: 3, statement: 'Demonstrates knowledge of livestock production' },
      { number: 4, statement: 'Understands farm management and entrepreneurship' },
    ],
  },
]

export const SBA_TASK_TYPES = [
  'Project',
  'Practical',
  'Assignment',
  'Investigation',
  'Field Study',
  'Portfolio',
  'Oral Presentation',
  'Experiment',
]

export const ACCOMMODATION_TYPES = [
  'Visual_Impairment',
  'Hearing_Impairment',
  'Physical_Disability',
  'Learning_Difficulty',
  'Medical_Condition',
  'Other',
]

export function getSubjectByCode(code) {
  return ECZ_SUBJECTS.find((s) => s.code === code)
}

export function getSubjectByName(name) {
  return ECZ_SUBJECTS.find((s) => s.name.toLowerCase() === String(name || '').toLowerCase())
}

export function getAllSubjects() {
  return ECZ_SUBJECTS
}

/** Normalize element to { number, statement } */
export function normalizeElement(el, fallbackIndex) {
  if (el && typeof el === 'object' && 'statement' in el) {
    return { number: el.number ?? fallbackIndex, statement: el.statement }
  }
  return { number: fallbackIndex, statement: String(el) }
}
