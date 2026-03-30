import axios from 'axios'
import { sanitizeFormData, generateSecureToken } from './security'
import { logger } from './utils/logger'

class ApiClient {
  constructor() {
    this.baseURL = process.env.NEXT_PUBLIC_API_URL || '/api'
    this.csrfToken = null

    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'X-Content-Type-Options': 'nosniff',
      },
      withCredentials: true,
      timeout: 30000, // 30 seconds timeout
    })

    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        // Add CSRF token if available
        if (this.csrfToken) {
          config.headers['X-CSRF-TOKEN'] = this.csrfToken
        }

        // Sanitize request data
        if (config.data && typeof config.data === 'object') {
          config.data = sanitizeFormData(config.data)
        }

        // Add security headers
        config.headers['X-Frame-Options'] = 'DENY'
        config.headers['X-Content-Type-Options'] = 'nosniff'

        return config
      },
      (error) => {
        logger.error('API Request Error', error)
        return Promise.reject(error)
      }
    )

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => {
        return response
      },
      async (error) => {
        const originalRequest = error.config
        const status = error.response?.status
        const data = error.response?.data

        const url = String(originalRequest?.url || '')
        const isAuthRoute =
          url.includes('/auth/login') ||
          url.includes('/auth/register') ||
          url.includes('/auth/refresh') ||
          url.includes('/auth/logout')

        const shouldRetryWithRefresh =
          status === 401 ||
          (status === 403 &&
            (String(data?.error || '')
              .toLowerCase()
              .includes('school context required') ||
              String(data?.message || '')
                .toLowerCase()
                .includes('your role: undefined') ||
              String(data?.message || '')
                .toLowerCase()
                .includes('your role: null') ||
              String(data?.message || '')
                .toLowerCase()
                .includes('your role:')))

        if (!isAuthRoute && shouldRetryWithRefresh && !originalRequest._retry) {
          originalRequest._retry = true

          try {
            // Attempt to refresh the token
            await this.client.post('/auth/refresh')
            return this.client(originalRequest)
          } catch (refreshError) {
            logger.error('Token Refresh Failed', refreshError)
            // If refresh fails, redirect to login
            this.clearAuthToken()
            if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
              window.location.href = '/login'
            }
          }
        }

        logger.error('API Response Error', error, {
          status,
          url: originalRequest.url,
          method: originalRequest.method,
        })

        return Promise.reject(error)
      }
    )
  }

  setAuthToken(token) {
    this.client.defaults.headers.common['Authorization'] = `Bearer ${token}`
  }

  clearAuthToken() {
    delete this.client.defaults.headers.common['Authorization']
    this.csrfToken = null
  }

  // Set CSRF token
  setCsrfToken(token) {
    this.csrfToken = token
  }

  // Get CSRF token from server
  async getCsrfToken() {
    try {
      const response = await this.client.get('/csrf-token')
      this.csrfToken = response.data.token
      return this.csrfToken
    } catch (error) {
      console.warn('Failed to get CSRF token:', error)
      // Generate client-side token as fallback
      this.csrfToken = generateSecureToken()
      return this.csrfToken
    }
  }

  // Generic HTTP methods
  async get(url, params) {
    return this.client.get(url, { params })
  }

  async post(url, data) {
    return this.client.post(url, data)
  }

  async put(url, data) {
    return this.client.put(url, data)
  }

  async patch(url, data) {
    return this.client.patch(url, data)
  }

  async delete(url) {
    return this.client.delete(url)
  }

  // Authentication methods
  async login(credentials) {
    // Use simple PHP API
    return this.post('/auth/login', credentials)
  }

  async register(data) {
    return this.post('/auth/register', data)
  }

  async logout() {
    return this.post('/auth/logout')
  }

  async getMe() {
    return this.get('/auth/me')
  }

  // Dashboard methods
  async getDashboardStats() {
    return this.get('/dashboard/stats')
  }

  async getHeadteacherDashboard() {
    return this.get('/dashboard/headteacher')
  }

  async getHeadteacherClasses() {
    return this.get('/dashboard/headteacher/classes')
  }

  async getTeacherDashboard() {
    // Get real teacher dashboard data from the database
    return this.get('/dashboard/teacher')
  }

  async getHodDashboard() {
    return this.get('/dashboard/hod')
  }

  async getStudentDashboard() {
    return this.get('/dashboard/student')
  }

  async getStudentGameDashboard() {
    return this.get('/dashboard/student/games')
  }

  async getStudentSubjects() {
    return this.get('/student/subjects')
  }

  async getStudentAssessments() {
    return this.get('/student/assessments')
  }

  async getStudentGoals() {
    return this.get('/student/goals')
  }

  async createStudentGoal(data) {
    return this.post('/student/goals', data)
  }

  async updateStudentGoal(data) {
    return this.put('/student/goals', data)
  }

  async deleteStudentGoal(id) {
    return this.delete(`/student/goals?id=${id}`)
  }

  async getStudentMaterials() {
    return this.get('/student/materials')
  }

  async getStudentGameDashboard() {
    return this.get('/dashboard/student/games')
  }

  async toggleMaterialBookmark(materialId) {
    return this.post('/student/materials', { materialId, action: 'bookmark' })
  }

  async trackMaterialDownload(materialId) {
    return this.post('/student/materials', { materialId, action: 'download' })
  }

  async getHodDashboard() {
    return this.get('/dashboard/hod')
  }

  // User methods
  async getUsers(params) {
    return this.get('/users', params)
  }

  async getUser(id) {
    return this.get(`/users/${id}`)
  }

  async createUser(data) {
    return this.post('/users', data)
  }

  async updateUser(id, data) {
    return this.put(`/users/${id}`, data)
  }

  async deleteUser(id) {
    return this.delete(`/users/${id}`)
  }

  // Class methods
  async getClasses(params) {
    return this.get('/classes', params)
  }

  async getClass(id) {
    return this.get(`/classes/${id}`)
  }

  async createClass(data) {
    return this.post('/classes', data)
  }

  async updateClass(id, data) {
    return this.put(`/classes/${id}`, data)
  }

  async deleteClass(id) {
    return this.delete(`/classes/${id}`)
  }

  // Subject methods
  async getSubjects(params) {
    return this.get('/subjects', params)
  }

  async getSubject(id) {
    return this.get(`/subjects/${id}`)
  }

  async createSubject(data) {
    return this.post('/subjects', data)
  }

  async updateSubject(id, data) {
    return this.put(`/subjects/${id}`, data)
  }

  async deleteSubject(id) {
    return this.delete(`/subjects/${id}`)
  }

  async getStudentWorks(params) {
    return this.get('/student-works', params)
  }

  async getFieldTrips(params) {
    return this.get('/field-trips', params)
  }

  async getCreativeFeatures() {
    return this.get('/creative-features')
  }

  // Assessment methods
  async getAssessments(params) {
    return this.get('/assessments', params)
  }

  async getAssessment(id) {
    return this.get(`/assessments/${id}`)
  }

  async createAssessment(data) {
    return this.post('/assessments', data)
  }

  async updateAssessment(id, data) {
    return this.put(`/assessments/${id}`, data)
  }

  async deleteAssessment(id) {
    return this.delete(`/assessments/${id}`)
  }

  // File upload
  async uploadFile(file) {
    const formData = new FormData()
    formData.append('file', file)

    return this.client.post('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
  }

  // Timetable methods
  async getTimetables(params) {
    return this.get('/timetable', params)
  }

  async getTimetable(id) {
    return this.get(`/timetable/${id}`)
  }

  async createTimetable(data) {
    return this.post('/timetable', data)
  }

  async updateTimetable(id, data) {
    return this.put(`/timetable/${id}`, data)
  }

  async deleteTimetable(id) {
    return this.delete(`/timetable/${id}`)
  }

  // Attendance methods
  async getAttendances(params) {
    return this.get('/attendance', params)
  }

  async getAttendance(id) {
    return this.get(`/attendance/${id}`)
  }

  async createAttendance(data) {
    return this.post('/attendance', data)
  }

  async updateAttendance(id, data) {
    return this.put(`/attendance/${id}`, data)
  }

  async deleteAttendance(id) {
    return this.delete(`/attendance/${id}`)
  }

  // Announcement methods
  async getAnnouncements(params) {
    return this.get('/announcements', params)
  }

  async getAnnouncement(id) {
    return this.get(`/announcements/${id}`)
  }

  async createAnnouncement(data) {
    return this.post('/announcements', data)
  }

  async updateAnnouncement(id, data) {
    return this.put(`/announcements/${id}`, data)
  }

  async deleteAnnouncement(id) {
    return this.delete(`/announcements/${id}`)
  }
}

export const api = new ApiClient()
