/**
 * School Grading System Utilities
 * Implements the specific grading systems for different grade levels
 */

// Grading system for Forms 1, 2 and Grade 9
export const JUNIOR_GRADING_SYSTEM = {
  name: 'Junior Grading (Forms 1-2, Grade 9)',
  grades: [
    { min: 75, max: 100, grade: 'ONE', status: 'DISTINCTION', color: 'green', description: 'Excellent performance' },
    { min: 60, max: 74, grade: 'TWO', status: 'MERIT', color: 'blue', description: 'Good performance' },
    { min: 50, max: 59, grade: 'THREE', status: 'CREDIT', color: 'purple', description: 'Satisfactory performance' },
    { min: 40, max: 49, grade: 'FOUR', status: 'PASS', color: 'yellow', description: 'Minimum pass' },
    { min: 0, max: 39, grade: 'F', status: 'FAIL', color: 'red', description: 'Below minimum standard' },
  ],
  absent: { grade: 'X', status: 'ABSENT', color: 'gray', description: 'Student was absent' }
}

// Grading system for Forms 3, 4 and Grades 10, 11, 12
export const SENIOR_GRADING_SYSTEM = {
  name: 'Senior Grading (Forms 3-4, Grades 10-12)',
  grades: [
    { min: 75, max: 100, grade: '1', status: 'DISTINCTION', color: 'green', description: 'Outstanding achievement' },
    { min: 70, max: 74, grade: '2', status: 'DISTINCTION', color: 'green', description: 'Excellent achievement' },
    { min: 65, max: 69, grade: '3', status: 'MERIT', color: 'blue', description: 'Very good achievement' },
    { min: 60, max: 64, grade: '4', status: 'MERIT', color: 'blue', description: 'Good achievement' },
    { min: 55, max: 59, grade: '5', status: 'CREDIT', color: 'purple', description: 'Satisfactory achievement' },
    { min: 50, max: 54, grade: '6', status: 'CREDIT', color: 'purple', description: 'Acceptable achievement' },
    { min: 45, max: 49, grade: '7', status: 'SATISFACTORY', color: 'yellow', description: 'Basic achievement' },
    { min: 40, max: 44, grade: '8', status: 'SATISFACTORY', color: 'yellow', description: 'Minimum achievement' },
    { min: 0, max: 39, grade: '9', status: 'UNSATISFACTORILY', color: 'red', description: 'Below minimum standard' },
  ],
  absent: { grade: 'X', status: 'ABSENT', color: 'gray', description: 'Student was absent' }
}

/**
 * Determine which grading system to use based on grade level
 * @param {string} gradeLevel - The grade level (form1, form2, grade9, form3, form4, grade10, grade11, grade12)
 * @returns {object} The appropriate grading system
 */
export function getGradingSystem(gradeLevel) {
  const juniorLevels = ['form1', 'form2', 'grade9']
  const seniorLevels = ['form3', 'form4', 'grade10', 'grade11', 'grade12']
  
  if (juniorLevels.includes(gradeLevel?.toLowerCase())) {
    return JUNIOR_GRADING_SYSTEM
  } else if (seniorLevels.includes(gradeLevel?.toLowerCase())) {
    return SENIOR_GRADING_SYSTEM
  }
  
  // Default to junior system if grade level is not recognized
  return JUNIOR_GRADING_SYSTEM
}

/**
 * Calculate grade information for a given score and grade level
 * @param {number|null} score - The numerical score (0-100)
 * @param {string} gradeLevel - The grade level
 * @returns {object} Grade information including grade, status, color, and description
 */
export function calculateGrade(score, gradeLevel) {
  // Handle absent or null scores
  if (score === null || score === undefined || score === 'X') {
    const system = getGradingSystem(gradeLevel)
    return system.absent
  }
  
  const numericScore = Number(score)
  
  // Validate score range
  if (isNaN(numericScore) || numericScore < 0 || numericScore > 100) {
    return { grade: 'INVALID', status: 'INVALID SCORE', color: 'gray', description: 'Invalid score provided' }
  }
  
  const system = getGradingSystem(gradeLevel)
  
  // Find the appropriate grade
  for (const gradeInfo of system.grades) {
    if (numericScore >= gradeInfo.min && numericScore <= gradeInfo.max) {
      return {
        grade: gradeInfo.grade,
        status: gradeInfo.status,
        color: gradeInfo.color,
        description: gradeInfo.description,
        score: numericScore
      }
    }
  }
  
  // Fallback (should not reach here with valid data)
  return system.grades[system.grades.length - 1]
}

/**
 * Check if a student requires attention (scoring below 40%)
 * @param {number} score - The numerical score
 * @returns {boolean} True if student requires attention
 */
export function requiresAttention(score) {
  const numericScore = Number(score)
  return !isNaN(numericScore) && numericScore < 40
}

/**
 * Determine risk level based on score and attendance
 * @param {number} score - The numerical score
 * @param {number} attendance - Attendance percentage
 * @returns {string} Risk level: 'critical', 'high', 'medium', 'low'
 */
export function calculateRiskLevel(score, attendance = 100) {
  const numericScore = Number(score)
  const numericAttendance = Number(attendance)
  
  // Critical risk: Very low score or very low attendance
  if (numericScore < 30 || numericAttendance < 60) {
    return 'critical'
  }
  
  // High risk: Below pass mark or low attendance
  if (numericScore < 40 || numericAttendance < 75) {
    return 'high'
  }
  
  // Medium risk: Just above pass mark or moderate attendance issues
  if (numericScore < 50 || numericAttendance < 85) {
    return 'medium'
  }
  
  // Low risk: Good performance and attendance
  return 'low'
}

/**
 * Get CSS classes for grade colors
 * @param {string} color - Color name from grading system
 * @returns {string} CSS classes for styling
 */
export function getGradeColorClasses(color) {
  const colorMap = {
    green: 'bg-green-100 text-green-800 border-green-200',
    blue: 'bg-blue-100 text-blue-800 border-blue-200',
    purple: 'bg-purple-100 text-purple-800 border-purple-200',
    yellow: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    red: 'bg-red-100 text-red-800 border-red-200',
    gray: 'bg-gray-100 text-gray-800 border-gray-200'
  }
  
  return colorMap[color] || colorMap.gray
}

/**
 * Calculate overall grade from multiple subject scores
 * @param {Array} subjects - Array of subject objects with scores
 * @param {string} gradeLevel - The grade level
 * @returns {object} Overall grade information
 */
export function calculateOverallGrade(subjects, gradeLevel) {
  if (!subjects || subjects.length === 0) {
    return { grade: 'N/A', status: 'NO DATA', color: 'gray', average: 0 }
  }
  
  const validScores = subjects
    .map(subject => Number(subject.score))
    .filter(score => !isNaN(score))
  
  if (validScores.length === 0) {
    return { grade: 'N/A', status: 'NO VALID SCORES', color: 'gray', average: 0 }
  }
  
  const average = validScores.reduce((sum, score) => sum + score, 0) / validScores.length
  const roundedAverage = Math.round(average * 10) / 10 // Round to 1 decimal place
  
  const gradeInfo = calculateGrade(roundedAverage, gradeLevel)
  
  return {
    ...gradeInfo,
    average: roundedAverage
  }
}

/**
 * Get performance insights for a student
 * @param {object} student - Student object with scores and attendance
 * @returns {object} Performance insights and recommendations
 */
export function getPerformanceInsights(student) {
  const insights = {
    strengths: [],
    weaknesses: [],
    recommendations: [],
    riskFactors: []
  }
  
  if (!student.subjects || student.subjects.length === 0) {
    insights.recommendations.push('No assessment data available - schedule immediate evaluation')
    return insights
  }
  
  // Analyze subject performance
  const passingSubjects = student.subjects.filter(s => Number(s.score) >= 40)
  const failingSubjects = student.subjects.filter(s => Number(s.score) < 40)
  
  if (passingSubjects.length > 0) {
    insights.strengths.push(`Performing well in ${passingSubjects.map(s => s.name).join(', ')}`)
  }
  
  if (failingSubjects.length > 0) {
    insights.weaknesses.push(`Struggling in ${failingSubjects.map(s => s.name).join(', ')}`)
    insights.recommendations.push('Immediate tutoring required for failing subjects')
  }
  
  // Analyze attendance
  if (student.attendance_rate < 75) {
    insights.riskFactors.push('Poor attendance affecting academic performance')
    insights.recommendations.push('Address attendance issues with parent/guardian meeting')
  }
  
  // Overall performance recommendations
  if (student.overall_average < 30) {
    insights.recommendations.push('Consider academic support program or grade repetition')
  } else if (student.overall_average < 40) {
    insights.recommendations.push('Intensive remedial classes and regular progress monitoring')
  }
  
  return insights
}
