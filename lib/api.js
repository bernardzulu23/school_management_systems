import axios from 'axios'
import { sanitizeFormData, generateSecureToken } from './security'
import { logger } from './utils/logger'

let isRefreshing = false
let failedQueue = []

function processQueue(error) {
  failedQueue.forEach((prom) => (error ? prom.reject(error) : prom.resolve()))
  failedQueue = []
}

class ApiClient {
  constructor() {
    this.baseURL = '/api'
    this.csrfToken = null

    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      },
      withCredentials: true,
      timeout: 30000, // 30 seconds timeout
    })

    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        const method = String(config.method || 'get').toLowerCase()
        const isMutation = ['post', 'put', 'patch', 'delete'].includes(method)

        // Add CSRF token on state-changing requests.
        if (isMutation) {
          const cookieToken =
            typeof document !== 'undefined'
              ? document.cookie
                  .split('; ')
                  .find((row) => row.startsWith('csrf_token='))
                  ?.split('=')[1]
              : null
          const token = cookieToken || this.csrfToken
          if (token) {
            config.headers['X-CSRF-Token'] = decodeURIComponent(token)
          }
        }

        // Sanitize request data
        if (config.data && typeof config.data === 'object') {
          config.data = sanitizeFormData(config.data)
        }

        // Add security headers
        delete config.headers['X-Frame-Options']
        delete config.headers['X-Content-Type-Options']

        // Cache buster for GET requests
        if (config.method?.toLowerCase() === 'get') {
          config.params = {
            ...config.params,
            _t: Date.now(),
          }
        }

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

        const shouldRetryWithRefresh = status === 401 || status === 403

        if (!isAuthRoute && shouldRetryWithRefresh && originalRequest && !originalRequest._retry) {
          if (isRefreshing) {
            return new Promise((resolve, reject) => {
              failedQueue.push({ resolve, reject })
            })
              .then(() => this.client(originalRequest))
              .catch((err) => Promise.reject(err))
          }

          originalRequest._retry = true
          isRefreshing = true

          try {
            const refreshRes = await axios.post('/api/auth/refresh', undefined, {
              withCredentials: true,
              validateStatus: () => true,
            })

            if (refreshRes.status === 200 && refreshRes.data?.success) {
              processQueue(null)
              return this.client(originalRequest)
            }

            const refreshError = new Error('refresh_failed')
            refreshError.response = refreshRes
            processQueue(refreshError)

            try {
              if (typeof window !== 'undefined') {
                localStorage.removeItem('auth-storage')
              }
            } catch {}

            try {
              const mod = await import('./auth')
              mod.useAuth?.setState?.({
                user: null,
                token: null,
                isAuthenticated: false,
                lastActivityAt: 0,
              })
            } catch {}

            if (typeof window !== 'undefined') window.location.href = '/login'
            return Promise.reject(error)
          } catch (refreshError) {
            processQueue(refreshError)

            try {
              if (typeof window !== 'undefined') {
                localStorage.removeItem('auth-storage')
              }
            } catch {}

            try {
              const mod = await import('./auth')
              mod.useAuth?.setState?.({
                user: null,
                token: null,
                isAuthenticated: false,
                lastActivityAt: 0,
              })
            } catch {}

            if (typeof window !== 'undefined') window.location.href = '/login'
            return Promise.reject(refreshError)
          } finally {
            isRefreshing = false
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
      this.csrfToken = response.data?.token || this.csrfToken
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

  async delete(url, config) {
    return this.client.delete(url, config)
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

  async getHeadteacherDashboard(params = {}) {
    const qs = new URLSearchParams()
    if (params?.term && String(params.term).trim() && String(params.term).trim() !== 'All Terms') {
      qs.set('term', String(params.term).trim())
    }
    if (params?.year && String(params.year).trim()) {
      qs.set('year', String(params.year).trim())
    }
    const suffix = qs.toString()
    return this.get(`/dashboard/headteacher${suffix ? `?${suffix}` : ''}`)
  }

  async getHeadteacherClasses() {
    return this.get('/dashboard/headteacher/classes')
  }

  async getTeacherDashboard() {
    // Get real teacher dashboard data from the database
    return this.get('/dashboard/teacher')
  }

  async getHodDashboard(params = {}) {
    const qs = new URLSearchParams()
    if (params?.term && String(params.term).trim() && String(params.term).trim() !== 'All Terms') {
      qs.set('term', String(params.term).trim())
    }
    if (params?.year && String(params.year).trim()) {
      qs.set('year', String(params.year).trim())
    }
    const suffix = qs.toString()
    return this.get(`/dashboard/hod${suffix ? `?${suffix}` : ''}`)
  }

  async getStudentDashboard() {
    return this.get('/dashboard/student')
  }

  async getStudentGameDashboard() {
    return this.get('/dashboard/student/games')
  }

  async completeStudentGame(payload) {
    return this.post('/dashboard/student/games/complete', payload)
  }

  async getStudentSubjects() {
    return this.get('/student/subjects')
  }

  // Marketplace (shared teaching materials)
  async getMarketplace(params) {
    return this.get('/marketplace', params)
  }

  async getMarketplaceItem(id) {
    return this.get(`/marketplace/${id}`)
  }

  async submitMarketplaceMaterial(payload) {
    return this.post('/marketplace/submit', payload)
  }

  async getMyMarketplaceSubmissions(scope) {
    return this.get('/marketplace/mine', scope ? { scope } : undefined)
  }

  async reviewMarketplaceMaterial(id, payload) {
    return this.post(`/marketplace/${id}/review`, payload)
  }

  async downloadMarketplaceMaterial(id) {
    return this.post(`/marketplace/${id}/download`)
  }

  async rateMarketplaceMaterial(id, payload) {
    return this.post(`/marketplace/${id}/rate`, payload)
  }

  async getMockExamHistory() {
    return this.get('/student/mock-exam')
  }

  async startMockExam(payload) {
    return this.post('/student/mock-exam/start', payload)
  }

  async getMockExam(id) {
    return this.get(`/student/mock-exam/${id}`)
  }

  async submitMockExam(id, payload) {
    return this.post(`/student/mock-exam/${id}/submit`, payload)
  }

  async getNationalPercentile(params) {
    return this.get('/analytics/national-percentile', params)
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
