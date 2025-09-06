// Complete subject configuration for the school management system

export const SUBJECTS = [
  // Core Subjects
  'Mathematics',
  'Additional Mathematics',
  'Statistics',
  'English',
  'Literature in English',
  'Science',
  'Physics',
  'Chemistry',
  'Biology',
  'Environmental Science',

  // Languages
  'French',
  'Portuguese', 
  'Swahili',
  'Chinese',
  'Chichewa',
  'Chitonga',
  'Luvale',
  'Lunda',
  'Kikaonde',
  'Bemba',
  'Silozi',

  // Social Sciences
  'Geography',
  'History',
  'Social Studies',
  'Civic Education',
  'Psychology',
  'Sociology',
  'Philosophy',

  // Business & Economics
  'Business Studies',
  'Commerce',
  'Principles of Accounts',
  'Economics',
  'Entrepreneurship',

  // Technology & Computing
  'Computer Studies',
  'Computer Science',
  'Information Technology',
  'Electronics',
  'Technical Drawing',

  // Practical & Vocational
  'Food and Nutrition',
  'Metalwork',
  'Woodwork',
  'Fashion and Fabrics',
  'Design and Technology',
  'Agriculture Science',

  // Arts & Expression
  'Music',
  'Art and Design',
  'Drama/Theatre Arts',

  // Hospitality & Tourism
  'Hospitality Management',
  'Travel and Tourism',

  // Health & Wellness
  'Physical Education',
  'Health Education',
  'Life Skills',

  // Religious Studies
  'Religious Education 2046'
]

export const DEPARTMENTS = [
  {
    id: 'literature-languages',
    name: 'Literature and Languages',
    subjects: [
      'English',
      'Literature in English',
      'French',
      'Portuguese',
      'Swahili',
      'Chinese',
      'Chichewa',
      'Chitonga',
      'Luvale',
      'Lunda',
      'Kikaonde',
      'Bemba',
      'Silozi'
    ]
  },
  {
    id: 'mathematics',
    name: 'Mathematics',
    subjects: [
      'Mathematics',
      'Additional Mathematics',
      'Statistics'
    ]
  },
  {
    id: 'social-sciences',
    name: 'Social Sciences',
    subjects: [
      'Geography',
      'History',
      'Social Studies',
      'Civic Education',
      'Psychology',
      'Sociology',
      'Philosophy',
      'Religious Education 2046'
    ]
  },
  {
    id: 'home-economics',
    name: 'Home Economics',
    subjects: [
      'Food and Nutrition',
      'Fashion and Fabrics',
      'Health Education',
      'Life Skills'
    ]
  },
  {
    id: 'expressive-arts',
    name: 'Expressive Arts',
    subjects: [
      'Music',
      'Art and Design',
      'Drama/Theatre Arts',
      'Physical Education'
    ]
  },
  {
    id: 'business-studies',
    name: 'Business Studies',
    subjects: [
      'Business Studies',
      'Commerce',
      'Principles of Accounts',
      'Economics',
      'Entrepreneurship',
      'Hospitality Management',
      'Travel and Tourism'
    ]
  },
  {
    id: 'natural-sciences',
    name: 'Natural Sciences',
    subjects: [
      'Science',
      'Physics',
      'Chemistry',
      'Biology',
      'Environmental Science',
      'Computer Studies',
      'Computer Science',
      'Information Technology',
      'Electronics',
      'Technical Drawing',
      'Metalwork',
      'Woodwork',
      'Design and Technology',
      'Agriculture Science'
    ]
  }
]

export const SUBJECT_CATEGORIES = {
  'Core Academic': [
    'Mathematics',
    'Additional Mathematics',
    'English',
    'Literature in English',
    'Science',
    'Physics',
    'Chemistry',
    'Biology'
  ],
  'Languages': [
    'French',
    'Portuguese',
    'Swahili',
    'Chinese',
    'Chichewa',
    'Chitonga',
    'Luvale',
    'Lunda',
    'Kikaonde',
    'Bemba',
    'Silozi'
  ],
  'Social Sciences': [
    'Geography',
    'History',
    'Social Studies',
    'Civic Education',
    'Psychology',
    'Sociology',
    'Philosophy'
  ],
  'Business & Economics': [
    'Business Studies',
    'Commerce',
    'Principles of Accounts',
    'Economics',
    'Entrepreneurship'
  ],
  'Technology': [
    'Computer Studies',
    'Computer Science',
    'Information Technology',
    'Electronics',
    'Technical Drawing'
  ],
  'Practical Arts': [
    'Food and Nutrition',
    'Metalwork',
    'Woodwork',
    'Fashion and Fabrics',
    'Design and Technology',
    'Agriculture Science'
  ],
  'Creative Arts': [
    'Music',
    'Art and Design',
    'Drama/Theatre Arts'
  ],
  'Health & Wellness': [
    'Physical Education',
    'Health Education',
    'Life Skills'
  ],
  'Hospitality': [
    'Hospitality Management',
    'Travel and Tourism'
  ],
  'Religious Studies': [
    'Religious Education 2046'
  ]
}

// Helper functions
export const getSubjectsByDepartment = (departmentId) => {
  const department = DEPARTMENTS.find(dept => dept.id === departmentId)
  return department ? department.subjects : []
}

export const getDepartmentBySubject = (subject) => {
  return DEPARTMENTS.find(dept => dept.subjects.includes(subject))
}

export const getSubjectsByCategory = (category) => {
  return SUBJECT_CATEGORIES[category] || []
}

export const getAllSubjects = () => {
  return [...SUBJECTS].sort()
}

export const getAllDepartments = () => {
  return DEPARTMENTS.map(dept => ({
    id: dept.id,
    name: dept.name
  }))
}
