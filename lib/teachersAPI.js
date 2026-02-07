/**
 * Teachers API Service
 * Handles fetching registered teachers from the database
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'

export class TeachersAPI {
  /**
   * Fetch all registered teachers from the database
   */
  static async getRegisteredTeachers() {
    try {
      const response = await fetch(`${API_BASE_URL}/teachers`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      
      if (result.success && result.data) {
        // Transform backend teacher data to timetable format
        return result.data.map(teacher => ({
          id: teacher.id,
          name: teacher.name,
          email: teacher.email,
          subjects: teacher.subjects || [],
          department: teacher.department,
          maxPeriods: 8, // Default max periods per day
          isActive: teacher.isActive,
          employeeId: teacher.teacherId || teacher.employee_id,
          phone: teacher.phone
        }))
      }

      return []
    } catch (error) {
      console.error('Error fetching registered teachers:', error)
      
      // Return empty array if API fails - teachers should be registered through the system
      return []
    }
  }

  /**
   * Fetch teachers by department
   */
  static async getTeachersByDepartment(department) {
    try {
      const response = await fetch(`${API_BASE_URL}/teachers?department=${encodeURIComponent(department)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      
      if (result.success && result.data) {
        return result.data.map(teacher => ({
          id: teacher.id,
          name: teacher.name,
          email: teacher.email,
          subjects: teacher.subjects || [],
          department: teacher.department,
          maxPeriods: 8,
          isActive: teacher.isActive,
          employeeId: teacher.teacherId || teacher.employee_id,
          phone: teacher.phone
        }))
      }

      return []
    } catch (error) {
      console.error('Error fetching teachers by department:', error)
      return []
    }
  }

  /**
   * Fetch teachers by subject
   */
  static async getTeachersBySubject(subject) {
    try {
      const response = await fetch(`${API_BASE_URL}/teachers?subject=${encodeURIComponent(subject)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      
      if (result.success && result.data) {
        return result.data.map(teacher => ({
          id: teacher.id,
          name: teacher.name,
          email: teacher.email,
          subjects: teacher.subjects || [],
          department: teacher.department,
          maxPeriods: 8,
          isActive: teacher.isActive,
          employeeId: teacher.teacherId || teacher.employee_id,
          phone: teacher.phone
        }))
      }

      return []
    } catch (error) {
      console.error('Error fetching teachers by subject:', error)
      return []
    }
  }

  /**
   * Get teacher by ID
   */
  static async getTeacherById(teacherId) {
    try {
      const response = await fetch(`${API_BASE_URL}/teachers/${teacherId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      
      if (result.success && result.data) {
        const teacher = result.data
        return {
          id: teacher.id,
          name: teacher.name,
          email: teacher.email,
          subjects: teacher.subjects || [],
          department: teacher.department,
          maxPeriods: 8,
          isActive: teacher.isActive,
          employeeId: teacher.teacherId || teacher.employee_id,
          phone: teacher.phone
        }
      }

      return null
    } catch (error) {
      console.error('Error fetching teacher by ID:', error)
      return null
    }
  }
}

export default TeachersAPI
