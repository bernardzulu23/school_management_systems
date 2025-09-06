// Centralized timetable data management
// This simulates a database/API that would store the master timetable

// Global timetable storage (in a real app, this would be in a database)
let masterTimetableData = null

// Time slots configuration
export const timeSlots = [
  { id: 1, time: '08:00-08:40', label: 'Period 1' },
  { id: 2, time: '08:40-09:20', label: 'Period 2' },
  { id: 3, time: '09:20-10:00', label: 'Period 3' },
  { id: 4, time: '10:00-10:20', label: 'Break', isBreak: true },
  { id: 5, time: '10:20-11:00', label: 'Period 4' },
  { id: 6, time: '11:00-11:40', label: 'Period 5' },
  { id: 7, time: '11:40-12:20', label: 'Period 6' },
  { id: 8, time: '12:20-13:00', label: 'Lunch', isBreak: true },
  { id: 9, time: '13:00-13:40', label: 'Period 7' },
  { id: 10, time: '13:40-14:20', label: 'Period 8' },
  { id: 11, time: '14:20-15:00', label: 'Period 9' }
]

export const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']

// Classes data - In production, this should come from the classes API
// TODO: Replace with actual API call to fetch registered classes
export const classes = []

// Teachers data - In production, this should come from the teachers API
// TODO: Replace with actual API call to fetch registered teachers
export const teachers = []

// Subjects data - In production, this should come from the subjects API
// TODO: Replace with actual API call to fetch registered subjects
export const subjects = []

// Classrooms data - In production, this should come from the classrooms API
// TODO: Replace with actual API call to fetch registered classrooms
export const classrooms = []

// Initialize empty timetable data structure
function initializeEmptyTimetable() {
  // Return empty timetable structure - data should be populated through the master timetable interface
  return {
    Monday: {},
    Tuesday: {},
    Wednesday: {},
    Thursday: {},
    Friday: {}
  }


}

// Initialize the master timetable with empty structure
if (!masterTimetableData) {
  masterTimetableData = initializeEmptyTimetable()
}

// API functions for timetable management
export const timetableAPI = {
  // Get the complete master timetable
  getMasterTimetable: () => {
    return masterTimetableData || {}
  },

  // Save/update the master timetable
  saveMasterTimetable: (timetableData) => {
    masterTimetableData = { ...timetableData }
    // In a real app, this would save to a database
    localStorage.setItem('masterTimetable', JSON.stringify(masterTimetableData))
    return true
  },

  // Get timetable for a specific student (by class)
  getStudentTimetable: (classId) => {
    const timetable = masterTimetableData || {}
    const studentTimetable = {}

    // Extract only the assignments for the student's class
    Object.keys(timetable).forEach(day => {
      studentTimetable[day] = {}
      Object.keys(timetable[day]).forEach(slotId => {
        if (timetable[day][slotId][classId]) {
          const assignment = timetable[day][slotId][classId]
          const subject = subjects.find(s => s.id === assignment.subjectId)
          const teacher = teachers.find(t => t.id === assignment.teacherId)
          const classroom = classrooms.find(c => c.id === assignment.classroomId)

          studentTimetable[day][slotId] = {
            subject: subject?.name || 'Unknown Subject',
            teacher: teacher?.name || 'Unknown Teacher',
            classroom: classroom?.name || 'Unknown Classroom',
            color: subject?.color || '#6B7280',
            notes: assignment.notes || ''
          }
        }
      })
    })

    return studentTimetable
  },

  // Get timetable for a specific teacher
  getTeacherTimetable: (teacherId) => {
    const timetable = masterTimetableData || {}
    const teacherTimetable = {}

    // Extract only the assignments for the teacher
    Object.keys(timetable).forEach(day => {
      teacherTimetable[day] = {}
      Object.keys(timetable[day]).forEach(slotId => {
        Object.keys(timetable[day][slotId]).forEach(classId => {
          const assignment = timetable[day][slotId][classId]
          if (assignment.teacherId === teacherId) {
            const subject = subjects.find(s => s.id === assignment.subjectId)
            const classInfo = classes.find(c => c.id === parseInt(classId))
            const classroom = classrooms.find(c => c.id === assignment.classroomId)

            teacherTimetable[day][slotId] = {
              subject: subject?.name || 'Unknown Subject',
              class: classInfo?.name || 'Unknown Class',
              classroom: classroom?.name || 'Unknown Classroom',
              students: classInfo?.students || 0,
              color: subject?.color || '#6B7280',
              notes: assignment.notes || ''
            }
          }
        })
      })
    })

    return teacherTimetable
  },

  // Get department timetable for HOD (by department)
  getDepartmentTimetable: (department) => {
    const timetable = masterTimetableData || {}
    const departmentTimetable = {}

    // Get teachers in the department
    const departmentTeachers = teachers.filter(teacher => 
      teacher.subjects.some(subject => 
        subjects.find(s => s.name === subject && s.department === department)
      )
    )
    const departmentTeacherIds = departmentTeachers.map(t => t.id)

    // Extract assignments for department teachers
    Object.keys(timetable).forEach(day => {
      departmentTimetable[day] = {}
      Object.keys(timetable[day]).forEach(slotId => {
        const assignments = []
        Object.keys(timetable[day][slotId]).forEach(classId => {
          const assignment = timetable[day][slotId][classId]
          if (departmentTeacherIds.includes(assignment.teacherId)) {
            const subject = subjects.find(s => s.id === assignment.subjectId)
            const teacher = teachers.find(t => t.id === assignment.teacherId)
            const classInfo = classes.find(c => c.id === parseInt(classId))
            const classroom = classrooms.find(c => c.id === assignment.classroomId)

            assignments.push({
              teacher: teacher?.name || 'Unknown Teacher',
              subject: subject?.name || 'Unknown Subject',
              class: classInfo?.name || 'Unknown Class',
              classroom: classroom?.name || 'Unknown Classroom',
              students: classInfo?.students || 0,
              color: subject?.color || '#6B7280'
            })
          }
        })
        if (assignments.length > 0) {
          departmentTimetable[day][slotId] = assignments
        }
      })
    })

    return departmentTimetable
  },

  // Load timetable from localStorage (for persistence)
  loadFromStorage: () => {
    try {
      const stored = localStorage.getItem('masterTimetable')
      if (stored) {
        masterTimetableData = JSON.parse(stored)
        return true
      }
    } catch (error) {
      console.error('Error loading timetable from storage:', error)
    }
    return false
  }
}

// Load from storage on module initialization
if (typeof window !== 'undefined') {
  timetableAPI.loadFromStorage()
}
