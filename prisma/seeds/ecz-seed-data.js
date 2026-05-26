/**
 * ECZ reference data (2023 ZECF) — competencies and 16 CBC subject constructs.
 * @see docs/ECZ_COMPLIANCE.md
 */

const ECZ_COMPETENCIES = [
  {
    name: 'Analytical Thinking',
    descriptor: 'Break down problems, evaluate situations and solutions',
    category: 'Cognitive',
  },
  {
    name: 'Citizenship',
    descriptor:
      'Engage in civic activities, promote social justice, show respect for human dignity',
    category: 'Social',
  },
  {
    name: 'Collaboration',
    descriptor: 'Work effectively in groups, respect diverse perspectives',
    category: 'Social',
  },
  {
    name: 'Communication',
    descriptor: 'Use appropriate language, express thoughts clearly',
    category: 'Social',
  },
  {
    name: 'Creativity and Innovation',
    descriptor: 'Generate new ideas, undertake projects',
    category: 'Cognitive',
  },
  {
    name: 'Critical Thinking',
    descriptor: 'Analyse texts, solve complex problems',
    category: 'Cognitive',
  },
  {
    name: 'Emotional Intelligence',
    descriptor: 'Manage emotions, empathise with others',
    category: 'Social',
  },
  {
    name: 'Environmental Sustainability',
    descriptor: 'Show personal role in environmental management',
    category: 'Applied',
  },
  {
    name: 'Problem Solving',
    descriptor: 'Analyse situations, identify resources, develop plans',
    category: 'Cognitive',
  },
  {
    name: 'Digital Literacy',
    descriptor: 'Use digital devices and software appropriately',
    category: 'Applied',
  },
  {
    name: 'Entrepreneurship',
    descriptor: 'Identify business opportunities, create business models',
    category: 'Applied',
  },
  {
    name: 'Financial Literacy',
    descriptor: 'Manage personal and business finances',
    category: 'Applied',
  },
]

const CBC_SUBJECTS = [
  {
    subjectName: 'Mathematics I',
    construct:
      'Demonstrates numerical proficiency, critical thinking, logical and spatial reasoning to solve problems in real life.',
    elementsOfConstruct: [
      'Interprets and performs operations on numbers to make decisions',
      'Uses algebraic thinking to model and solve problems',
      'Applies spatial reasoning to geometric situations',
      'Interprets and analyses data to make informed decisions',
    ],
    sbaWeight: 30,
    examWeight: 70,
  },
  {
    subjectName: 'Mathematics II',
    construct:
      'Demonstrates numerical proficiency, critical thinking, logical and spatial reasoning to solve problems in real life.',
    elementsOfConstruct: [
      'Applies index notation and number bases',
      'Solves equations and works with matrices',
      'Applies mensuration and symmetry',
      'Uses probability to make decisions',
    ],
    sbaWeight: 30,
    examWeight: 70,
  },
  {
    subjectName: 'English Language',
    construct:
      'Communicates effectively and confidently in English language both orally and in writing across various contexts and audiences.',
    elementsOfConstruct: [
      'Listens and responds appropriately in various contexts',
      'Reads and comprehends various text types',
      'Writes clearly and coherently for different purposes',
      'Applies grammatical structures accurately',
      'Summarises information concisely',
    ],
    sbaWeight: 30,
    examWeight: 70,
  },
  {
    subjectName: 'Biology',
    construct:
      'Demonstrates understanding of living organisms, their structure, functions, and interactions with the environment through scientific inquiry.',
    elementsOfConstruct: [
      'Demonstrates understanding of cell structure and function',
      'Explains the processes of nutrition, transport, and respiration in organisms',
      'Demonstrates understanding of reproduction, growth, and development',
      'Analyses ecological relationships and human impact on the environment',
    ],
    sbaWeight: 30,
    examWeight: 70,
  },
  {
    subjectName: 'Chemistry',
    construct:
      'Demonstrates understanding of the composition, structure, properties, and transformations of matter through experimental inquiry.',
    elementsOfConstruct: [
      'Understands the structure of atoms and the periodic table',
      'Explains chemical bonding and the properties of compounds',
      'Performs calculations using the mole concept and stoichiometry',
      'Analyses chemical reactions and energy changes',
    ],
    sbaWeight: 30,
    examWeight: 70,
  },
  {
    subjectName: 'Physics',
    construct:
      'Demonstrates understanding of matter, energy, and their interactions through experimental investigation and problem-solving.',
    elementsOfConstruct: [
      'Applies measurement and units to physical quantities',
      'Analyses forces, motion, and energy in real-life contexts',
      'Understands wave phenomena including light and sound',
      'Demonstrates knowledge of electricity, magnetism, and electronics',
    ],
    sbaWeight: 30,
    examWeight: 70,
  },
  {
    subjectName: 'Civic Education',
    construct:
      'Demonstrates understanding of civic rights, responsibilities, governance systems, and national values to participate effectively in Zambian society.',
    elementsOfConstruct: [
      'Understands the political development and governance of Zambia',
      'Demonstrates knowledge of citizenship rights, duties, and responsibilities',
      'Analyses the constitution, elections, and the legal system',
      'Promotes national values, peace, and conflict resolution',
    ],
    sbaWeight: 30,
    examWeight: 70,
  },
  {
    subjectName: 'History',
    construct:
      "Demonstrates understanding of Zambia's historical development, African heritage, and global events to promote good citizenship and national identity.",
    elementsOfConstruct: [
      "Analyses Zambia's early history, including the origins of its peoples",
      'Examines the slave trade, colonialism, and the independence struggle',
      'Evaluates post-independence political and economic development',
      'Analyses global events such as the World Wars and the Cold War',
    ],
    sbaWeight: 30,
    examWeight: 70,
  },
  {
    subjectName: 'Geography',
    construct:
      'Analyses spatial relationships, human-environmental interaction, and sustainable development using geographical tools and technologies.',
    elementsOfConstruct: [
      "Understands the solar system, Earth's structure, and weather/climate",
      'Applies map reading skills to locate features and navigate',
      'Analyses population, settlement patterns, and urbanisation',
      'Evaluates the use and management of natural resources',
    ],
    sbaWeight: 30,
    examWeight: 70,
  },
  {
    subjectName: 'Religious Education',
    construct:
      'Demonstrates understanding of religious beliefs, values, and practices from Christianity, Islam, Hinduism, and Zambian Traditional Religion to promote moral living and social harmony.',
    elementsOfConstruct: [
      'Demonstrates knowledge of the four main religions in Zambia',
      'Analyses moral issues and ethical decision-making',
      'Applies religious teachings to real-life situations',
      'Evaluates the role of religion in promoting peace and unity',
    ],
    sbaWeight: 30,
    examWeight: 70,
  },
  {
    subjectName: 'Zambian Languages',
    construct:
      'Communicates effectively in a Zambian language, demonstrating appreciation of Zambian cultural values, oral traditions, and linguistic structures.',
    elementsOfConstruct: [
      'Listens and speaks appropriately in various contexts',
      'Reads and comprehends texts in a Zambian language',
      'Writes clearly and correctly in a Zambian language',
      'Understands and uses oral literature (proverbs, riddles, folktales)',
    ],
    sbaWeight: 30,
    examWeight: 70,
  },
  {
    subjectName: 'Literature in English',
    construct:
      'Demonstrates understanding and appreciation of literary works through critical analysis, interpretation, and creative expression.',
    elementsOfConstruct: [
      'Understands the genres and forms of literature',
      'Analyses prose, drama, and poetry using literary devices',
      'Interprets themes, characters, and settings in literary texts',
      'Creates original literary works',
    ],
    sbaWeight: 30,
    examWeight: 70,
  },
  {
    subjectName: 'Computer Studies / ICT',
    construct:
      'Demonstrates digital literacy skills to use ICT tools responsibly and effectively for learning, communication, and problem-solving.',
    elementsOfConstruct: [
      'Demonstrates understanding of computer hardware and software',
      'Uses productivity tools (word processors, spreadsheets, presentations)',
      'Navigates the internet and uses online tools safely',
      'Understands cybersecurity and digital citizenship',
    ],
    sbaWeight: 30,
    examWeight: 70,
  },
  {
    subjectName: 'Physical Education and Sport',
    construct:
      'Demonstrates physical literacy, understanding of health, fitness, and sports skills to promote lifelong healthy living.',
    elementsOfConstruct: [
      'Demonstrates knowledge of the history and importance of physical education',
      'Performs fitness activities and understands health-related components',
      'Applies skills in various sports and games',
      'Understands anatomy, physiology, and sports biomechanics',
    ],
    sbaWeight: 40,
    examWeight: 60,
  },
  {
    subjectName: 'Art and Design',
    construct:
      'Demonstrates creative expression, visual literacy, and technical skills through various art forms to communicate ideas and appreciate cultural heritage.',
    elementsOfConstruct: [
      'Demonstrates understanding of visual arts elements and principles',
      'Creates original artworks in various media',
      'Appreciates Zambian and African art heritage',
      'Applies entrepreneurial skills in art',
    ],
    sbaWeight: 30,
    examWeight: 70,
  },
  {
    subjectName: 'Agricultural Science',
    construct:
      'Demonstrates understanding of agricultural principles, practices, and enterprises to contribute to food security and economic development.',
    elementsOfConstruct: [
      'Understands agriculture in Zambia (importance, activities, factors)',
      'Applies principles of soil science and crop production',
      'Demonstrates knowledge of livestock production',
      'Understands farm management and entrepreneurship',
    ],
    sbaWeight: 30,
    examWeight: 70,
  },
]

module.exports = { ECZ_COMPETENCIES, CBC_SUBJECTS }
