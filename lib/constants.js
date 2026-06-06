export const GRADE_LEVELS = [
  'Grade 1',
  'Grade 2',
  'Grade 3',
  'Grade 4',
  'Grade 5',
  'Grade 6',
  'Grade 7',
  'Form 1',
  'Form 2',
  'Form 3',
  'Form 4',
  'Form 5',
  'Form 6',
  'Grade 8',
  'Grade 9',
  'Grade 10',
  'Grade 11',
  'Grade 12',
]

export const SECTIONS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

export const DEPARTMENTS = [
  'Mathematics',
  'Languages',
  'Natural Sciences',
  'Home Economics',
  'Technical Studies',
  'Commercial Studies',
  'Social Sciences',
  'Arts and Design',
  'Technology',
]

export const USER_ROLES = {
  ADMIN: 'ADMIN',
  HOD: 'HOD',
  TEACHER: 'TEACHER',
  STUDENT: 'STUDENT',
  PARENT: 'PARENT',
  HEADTEACHER: 'HEADTEACHER',
}

export const SYSTEM_STATUS = {
  OPERATIONAL: 'operational',
  MAINTENANCE: 'maintenance',
  DEGRADED: 'degraded',
  ACTIVE: 'active',
  INACTIVE: 'inactive',
}

export const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']

export const GENDERS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
]

export const RELATIONSHIPS = [
  { value: 'spouse', label: 'Spouse' },
  { value: 'parent', label: 'Parent' },
  { value: 'sibling', label: 'Sibling' },
  { value: 'child', label: 'Child' },
  { value: 'friend', label: 'Friend' },
  { value: 'other', label: 'Other' },
]

export const STUDENT_SUBJECTS_MIN = 7
export const STUDENT_SUBJECTS_MAX = 9
export const PRIMARY_STUDENT_SUBJECTS_MIN = 8
export const PRIMARY_STUDENT_SUBJECTS_MAX = 12

const PRIMARY_GRADES = GRADE_LEVELS.filter((g) => /^Grade [1-7]$/i.test(g))
const SECONDARY_GRADES = GRADE_LEVELS.filter(
  (g) => /^Form [1-6]$/i.test(g) || /^Grade (8|9|10|11|12)$/i.test(g)
)

export function getGradeLevelsForSchoolLevel(schoolLevel) {
  const level = String(schoolLevel || 'combined').toLowerCase()
  if (level === 'primary') return PRIMARY_GRADES
  if (level === 'secondary') return SECONDARY_GRADES
  return GRADE_LEVELS
}

export function getStudentSubjectLimits({ schoolLevel, yearGroup } = {}) {
  const level = String(schoolLevel || 'combined').toLowerCase()
  if (level === 'primary') {
    return { min: PRIMARY_STUDENT_SUBJECTS_MIN, max: PRIMARY_STUDENT_SUBJECTS_MAX }
  }
  if (level === 'secondary') {
    return { min: STUDENT_SUBJECTS_MIN, max: STUDENT_SUBJECTS_MAX }
  }
  const yg = String(yearGroup || '')
  if (/^Grade [1-7]$/i.test(yg)) {
    return { min: PRIMARY_STUDENT_SUBJECTS_MIN, max: PRIMARY_STUDENT_SUBJECTS_MAX }
  }
  return { min: STUDENT_SUBJECTS_MIN, max: STUDENT_SUBJECTS_MAX }
}
