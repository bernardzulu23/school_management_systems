// School Subjects Data
export const SCHOOL_SUBJECTS = [
  {
    id: 1,
    name: "Design and Technology",
    code: "DT",
    category: "Technology",
    description: "Creative design and practical technology skills"
  },
  {
    id: 2,
    name: "Mathematics",
    code: "MATH",
    category: "Core",
    description: "Mathematical concepts and problem solving"
  },
  {
    id: 3,
    name: "English",
    code: "ENG",
    category: "Core",
    description: "English language and communication skills"
  },
  {
    id: 4,
    name: "Science",
    code: "SCI",
    category: "Science",
    description: "General science concepts and principles"
  },
  {
    id: 5,
    name: "Physics",
    code: "PHY",
    category: "Science",
    description: "Physical sciences and natural phenomena"
  },
  {
    id: 6,
    name: "Chemistry",
    code: "CHEM",
    category: "Science",
    description: "Chemical processes and reactions"
  },
  {
    id: 7,
    name: "Biology",
    code: "BIO",
    category: "Science",
    description: "Life sciences and biological systems"
  },
  {
    id: 8,
    name: "Food and Nutrition",
    code: "FN",
    category: "Practical",
    description: "Nutrition science and food preparation"
  },
  {
    id: 9,
    name: "Metalwork",
    code: "MW",
    category: "Practical",
    description: "Metal fabrication and engineering skills"
  },
  {
    id: 10,
    name: "Woodwork",
    code: "WW",
    category: "Practical",
    description: "Woodworking and carpentry skills"
  },
  {
    id: 11,
    name: "Principles of Accounts",
    code: "POA",
    category: "Business",
    description: "Accounting principles and financial literacy"
  },
  {
    id: 12,
    name: "Agriculture Science",
    code: "AGRI",
    category: "Science",
    description: "Agricultural practices and crop science"
  },
  {
    id: 13,
    name: "French",
    code: "FR",
    category: "Languages",
    description: "French language and culture"
  },
  {
    id: 14,
    name: "Chichewa",
    code: "CHI",
    category: "Languages",
    description: "Chichewa language and literature"
  },
  {
    id: 15,
    name: "Chitonga",
    code: "TON",
    category: "Languages",
    description: "Chitonga language and culture"
  },
  {
    id: 16,
    name: "Luvale",
    code: "LUV",
    category: "Languages",
    description: "Luvale language and traditions"
  },
  {
    id: 17,
    name: "Lunda",
    code: "LUN",
    category: "Languages",
    description: "Lunda language and heritage"
  },
  {
    id: 18,
    name: "Kikaonde",
    code: "KIK",
    category: "Languages",
    description: "Kikaonde language and customs"
  },
  {
    id: 19,
    name: "Bemba",
    code: "BEM",
    category: "Languages",
    description: "Bemba language and culture"
  },
  {
    id: 20,
    name: "Silozi",
    code: "SIL",
    category: "Languages",
    description: "Silozi language and traditions"
  },
  {
    id: 21,
    name: "Business Studies",
    code: "BS",
    category: "Business",
    description: "Business principles and entrepreneurship"
  },
  {
    id: 22,
    name: "Geography",
    code: "GEO",
    category: "Humanities",
    description: "Physical and human geography"
  },
  {
    id: 23,
    name: "Social Studies",
    code: "SS",
    category: "Humanities",
    description: "Society, culture, and civic education"
  },
  {
    id: 24,
    name: "Music",
    code: "MUS",
    category: "Arts",
    description: "Music theory, performance, and appreciation"
  },
  {
    id: 25,
    name: "Commerce",
    code: "COM",
    category: "Business",
    description: "Commercial practices and trade"
  },
  {
    id: 26,
    name: "Computer Studies",
    code: "CS",
    category: "Technology",
    description: "Computer literacy and programming basics"
  },
  {
    id: 27,
    name: "Information Technology",
    code: "IT",
    category: "Technology",
    description: "Advanced IT skills and digital literacy"
  },
  {
    id: 28,
    name: "Fashion and Fabrics",
    code: "FF",
    category: "Practical",
    description: "Fashion design and textile work"
  },
  {
    id: 29,
    name: "Literature in English",
    code: "LIT",
    category: "Languages",
    description: "English literature and creative writing"
  },
  {
    id: 30,
    name: "Religious Education 2046",
    code: "RE",
    category: "Humanities",
    description: "Religious studies and moral education"
  },
  {
    id: 31,
    name: "Additional Mathematics",
    code: "AMATH",
    category: "Core",
    description: "Advanced mathematical concepts"
  }
]

// Subject categories for filtering
export const SUBJECT_CATEGORIES = [
  { id: "Core", name: "Core Subjects", color: "blue" },
  { id: "Science", name: "Sciences", color: "green" },
  { id: "Languages", name: "Languages", color: "purple" },
  { id: "Business", name: "Business Studies", color: "orange" },
  { id: "Humanities", name: "Humanities", color: "red" },
  { id: "Technology", name: "Technology", color: "indigo" },
  { id: "Practical", name: "Practical Skills", color: "yellow" },
  { id: "Arts", name: "Arts", color: "pink" }
]

// Helper functions
export const getSubjectById = (id) => {
  return SCHOOL_SUBJECTS.find(subject => subject.id === id)
}

export const getSubjectsByCategory = (category) => {
  return SCHOOL_SUBJECTS.filter(subject => subject.category === category)
}

export const getSubjectsByIds = (ids) => {
  return SCHOOL_SUBJECTS.filter(subject => ids.includes(subject.id))
}

export const searchSubjects = (query) => {
  const lowercaseQuery = query.toLowerCase()
  return SCHOOL_SUBJECTS.filter(subject => 
    subject.name.toLowerCase().includes(lowercaseQuery) ||
    subject.code.toLowerCase().includes(lowercaseQuery)
  )
}
