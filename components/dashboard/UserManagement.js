'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import {
  UserPlus,
  Users,
  GraduationCap,
  User,
  Settings,
  Plus,
  Edit,
  Trash2,
  Search,
  Filter,
  Eye,
  EyeOff,
  RefreshCcw,
  X,
} from 'lucide-react'
import { api } from '@/lib/api'
import toast from 'react-hot-toast'
import LoadingSpinner from '@/components/LoadingSpinner'
import { SCHOOL_SUBJECTS } from '@/data/subjects'
import { useSchool } from '@/lib/context/SchoolContext'
import { canAccessHodFeatures } from '@/lib/subjects/resolveSubjectCatalog'
import { GRADE_LEVELS, SECTIONS } from '@/lib/constants'
import SubjectSelection from '@/components/registration/SubjectSelection'
import UserTypeCards from '@/components/dashboard/UserTypeCards'
import { getPasswordFormError } from '@/lib/security/passwordValidate'
import { evaluatePassword } from '@/lib/security/passwordValidate'

export default function UserManagement() {
  const { school } = useSchool()
  const showHodFeatures = canAccessHodFeatures({ schoolLevel: school?.level })
  const [activeUserType, setActiveUserType] = useState('all')
  const [users, setUsers] = useState([])
  const [hodAssignments, setHodAssignments] = useState([])
  const [userCounts, setUserCounts] = useState({
    totalUsers: 0,
    totalStudents: 0,
    totalTeachers: 0,
    totalHods: 0,
    totalHeadteachers: 0,
  })
  const [countsLoading, setCountsLoading] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [hasError, setHasError] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [viewingUser, setViewingUser] = useState(null)
  const [viewingLoading, setViewingLoading] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [editLookups, setEditLookups] = useState({ subjects: [], departments: [] })
  const [editLoading, setEditLoading] = useState(false)
  const [showHodAssign, setShowHodAssign] = useState(false)

  const fetchAllPaged = async (path, { limit = 200, params = {} } = {}) => {
    let page = 1
    let items = []
    while (true) {
      const query = new URLSearchParams()
      query.set('page', String(page))
      query.set('limit', String(limit))
      Object.entries(params).forEach(([k, v]) => {
        if (v === undefined || v === null || String(v) === '') return
        query.set(k, String(v))
      })

      const res = await api.get(`${path}?${query.toString()}`)
      const data = Array.isArray(res.data?.data) ? res.data.data : []
      const pagination = res.data?.pagination || null

      items = items.concat(data)

      if (!pagination?.totalPages) break
      if (page >= pagination.totalPages) break
      page += 1
      if (page > 200) break
    }
    return items
  }

  const fetchCounts = async () => {
    setCountsLoading(true)
    try {
      const res = await api.getDashboardStats()
      const data = res?.data?.data || {}
      setUserCounts({
        totalUsers: data.totalUsers || 0,
        totalStudents: data.totalStudents || 0,
        totalTeachers: data.totalTeachers || 0,
        totalHods: data.totalHods || 0,
        totalHeadteachers: data.totalHeadteachers || 0,
      })
    } catch {
      setUserCounts({
        totalUsers: 0,
        totalStudents: 0,
        totalTeachers: 0,
        totalHods: 0,
        totalHeadteachers: 0,
      })
    } finally {
      setCountsLoading(false)
    }
  }

  const userTypes = [
    { id: 'all', name: 'All Users', icon: Users, count: userCounts.totalUsers },
    {
      id: 'students',
      name: 'Students',
      icon: User,
      count: userCounts.totalStudents,
    },
    {
      id: 'teachers',
      name: 'Teachers',
      icon: GraduationCap,
      count: userCounts.totalTeachers,
    },
    ...(showHodFeatures
      ? [
          {
            id: 'hods',
            name: 'HODs',
            icon: Settings,
            count: userCounts.totalHods,
          },
        ]
      : []),
    {
      id: 'headteachers',
      name: 'Headteachers',
      icon: UserPlus,
      count: userCounts.totalHeadteachers,
    },
  ]

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search)
      const filter = String(params.get('filter') || '').toLowerCase()
      if (!filter) return
      if (['all', 'students', 'teachers', 'hods', 'headteachers'].includes(filter)) {
        setActiveUserType(filter)
      }
    } catch {}
  }, [])

  useEffect(() => {
    fetchUsers()
  }, [activeUserType])

  useEffect(() => {
    fetchCounts()
  }, [])

  useEffect(() => {
    if (!editingUser) return
    let active = true
    const load = async () => {
      setEditLoading(true)
      try {
        const [subjectsRes, departmentsRes] = await Promise.allSettled([
          api.get('/subjects'),
          api.get('/departments'),
        ])
        if (!active) return
        const subjects =
          subjectsRes.status === 'fulfilled' && Array.isArray(subjectsRes.value.data?.data)
            ? subjectsRes.value.data.data
            : []
        const departments =
          departmentsRes.status === 'fulfilled' && Array.isArray(departmentsRes.value.data?.data)
            ? departmentsRes.value.data.data
            : []
        setEditLookups({ subjects, departments })
      } finally {
        if (!active) return
        setEditLoading(false)
      }
    }
    load()
    return () => {
      active = false
    }
  }, [editingUser])

  const fetchUsers = async () => {
    setIsLoading(true)
    setHasError(false)
    try {
      let data = []
      let hodsForCounts = []
      if (activeUserType === 'all') {
        const [studentsRes, teachersRes, hodsRes, headteachersRes] = await Promise.allSettled([
          fetchAllPaged('/students', { limit: 200 }),
          fetchAllPaged('/teachers', { limit: 200 }),
          api.get('/hods'),
          api.get('/users?role=headteacher'),
        ])

        const students = studentsRes.status === 'fulfilled' ? studentsRes.value || [] : []
        const teachers = teachersRes.status === 'fulfilled' ? teachersRes.value || [] : []
        const hods = hodsRes.status === 'fulfilled' ? hodsRes.value.data.data || [] : []
        const headteachers =
          headteachersRes.status === 'fulfilled' ? headteachersRes.value.data.data || [] : []
        hodsForCounts = hods
        const hodByUserId = new Map(
          hods.map((h) => [
            String(h.userId || h.user?.id || ''),
            {
              id: String(h.id || ''),
              department: h.departmentRef?.name || h.department || '',
              departmentId: h.departmentId || h.departmentRef?.id || '',
            },
          ])
        )

        data = [
          ...students.map((u) => ({
            id: u.id,
            name: u.name,
            email: u.user?.email ?? u.email ?? '',
            role: 'student',
            status: 'Active',
            original: u,
          })),
          ...teachers.map((u) => ({
            id: u.id,
            name: u.user?.name || 'Unknown',
            email: u.user?.email ?? u.email ?? '',
            role: 'teacher',
            status: 'Active',
            isHod: hodByUserId.has(String(u.userId || '')),
            hodAssignment: hodByUserId.get(String(u.userId || '')) || null,
            original: u,
          })),
          ...headteachers.map((u) => ({
            id: u.id,
            name: u.name || 'Unknown',
            email: u.email ?? '',
            role: 'headteacher',
            status: 'Active',
            original: u,
          })),
        ]
      } else if (activeUserType === 'students') {
        const allStudents = await fetchAllPaged('/students', { limit: 200 })
        data = (allStudents || []).map((u) => ({
          id: u.id,
          name: u.name,
          email: u.user?.email ?? u.email ?? '',
          role: 'student',
          status: 'Active',
          original: u,
        }))
      } else if (activeUserType === 'teachers') {
        const [teachersRes, hodsRes] = await Promise.allSettled([
          fetchAllPaged('/teachers', { limit: 200 }),
          api.get('/hods'),
        ])
        const teacherData = teachersRes.status === 'fulfilled' ? teachersRes.value || [] : []
        const hods = hodsRes.status === 'fulfilled' ? hodsRes.value.data.data || [] : []
        hodsForCounts = hods
        const hodByUserId = new Map(
          hods.map((h) => [
            String(h.userId || h.user?.id || ''),
            {
              id: String(h.id || ''),
              department: h.departmentRef?.name || h.department || '',
              departmentId: h.departmentId || h.departmentRef?.id || '',
            },
          ])
        )
        data = teacherData.map((u) => ({
          id: u.id,
          name: u.user?.name || 'Unknown',
          email: u.user?.email ?? u.email ?? '',
          role: 'teacher',
          status: 'Active',
          isHod: hodByUserId.has(String(u.userId || '')),
          hodAssignment: hodByUserId.get(String(u.userId || '')) || null,
          original: u,
        }))
      } else if (activeUserType === 'hods') {
        const res = await api.get('/hods')
        hodsForCounts = res.data.data || []
        data = (res.data.data || []).map((u) => ({
          id: u.id,
          name: u.user?.name || 'Unknown',
          email: u.user?.email ?? u.email ?? '',
          role: 'hod',
          status: 'Active',
          original: u,
        }))
      } else if (activeUserType === 'headteachers') {
        const res = await api.get('/users?role=headteacher')
        data = (res.data.data || []).map((u) => ({
          id: u.id,
          name: u.name || 'Unknown',
          email: u.email ?? '',
          role: 'headteacher',
          status: 'Active',
          original: u,
        }))
      }

      if (Array.isArray(hodsForCounts)) {
        setHodAssignments(hodsForCounts)
      }
      setUsers(data)
    } catch (error) {
      console.error('Error fetching users:', error)
      setHasError(true)
      toast.error('Failed to load users. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateUser = (type) => {
    // Redirect to centralized registration system with specific role
    window.location.href = `/admin/registration?role=${type}`
  }

  const handleSaveUser = (userData, userType) => {
    console.log(`Saving ${userType}:`, userData)
  }

  const handleEditUser = (user) => {
    setEditingUser(user)
  }

  const updateUser = async (user, updates) => {
    try {
      const endpoint =
        user.role === 'student'
          ? `/students/${user.id}`
          : user.role === 'teacher'
            ? `/teachers/${user.id}`
            : user.role === 'hod'
              ? `/hods/${user.id}`
              : `/users/${user.id}`

      await api.put(endpoint, updates)
      fetchUsers()
      toast.success('User updated successfully')
    } catch (error) {
      toast.error('Failed to update user: ' + error.message)
    }
  }

  const handleDeleteUser = async (user) => {
    if (
      confirm(`Are you sure you want to delete this ${user.role}? This action cannot be undone.`)
    ) {
      try {
        const endpoint =
          user.role === 'student'
            ? `/students/${user.id}`
            : user.role === 'teacher'
              ? `/teachers/${user.id}`
              : user.role === 'hod'
                ? `/hods/${user.id}`
                : `/users/${user.id}`

        await api.delete(endpoint)
        fetchUsers()
        toast.success('User deleted successfully')
      } catch (error) {
        toast.error('Failed to delete user: ' + error.message)
      }
    }
  }

  const handleViewUser = async (userId) => {
    const user = users.find((u) => u.id === userId)
    if (!user) return

    setViewingUser(user)
    setViewingLoading(true)
    try {
      const endpoint =
        user.role === 'student'
          ? `/students/${user.id}`
          : user.role === 'teacher'
            ? `/teachers/${user.id}`
            : user.role === 'hod'
              ? `/hods/${user.id}`
              : `/users/${user.id}`

      const res = await api.get(endpoint)
      const detailed = res.data?.data || res.data
      setViewingUser({ ...user, original: detailed })
    } catch {
      setViewingUser(user)
    } finally {
      setViewingLoading(false)
    }
  }

  const roleLabel = (user) => {
    if (user.role === 'teacher' && user.isHod) return 'HOD'
    if (user.role === 'hod') return 'HOD'
    if (user.role === 'headteacher') return 'Headteacher'
    if (user.role === 'student') return 'Student'
    if (!user.role && (String(user.id || '').startsWith('STU') || user.original?.student_id))
      return 'Student'
    return user.role ? String(user.role).replace(/\b\w/g, (c) => c.toUpperCase()) : ''
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="backdrop-blur-lg bg-royalPurple-card/60 border border-royalPurple-border2/40 rounded-3xl p-8 text-center shadow-2xl">
        <h2 className="text-4xl font-bold text-royalPurple-text1 mb-4">User Management</h2>
        <p className="text-royalPurple-text2 text-lg">
          Register, manage, and oversee all system users
        </p>
      </header>

      <main className="space-y-8">
        {/* User Type Cards */}
        <UserTypeCards
          userTypes={userTypes}
          activeUserType={activeUserType}
          setActiveUserType={setActiveUserType}
          countsLoading={countsLoading}
        />

        {/* Management Actions */}
        <section
          aria-label="Registration actions"
          className="grid grid-cols-1 md:grid-cols-4 gap-6"
        >
          <Card className="bg-royalPurple-card border border-royalPurple-border rounded-xl overflow-hidden hover:scale-105 transition-all duration-300">
            <CardHeader className="bg-royalPurple-card2 p-4 border-b border-royalPurple-border">
              <div className="flex items-center gap-3">
                <div className="bg-royalPurple-card border border-royalPurple-border rounded-lg p-2">
                  <UserPlus className="h-5 w-5 text-royalPurple-text2" aria-hidden="true" />
                </div>
                <div>
                  <CardTitle className="text-royalPurple-text1 font-semibold text-base">
                    Register Students
                  </CardTitle>
                  <p className="text-royalPurple-text2 text-sm mt-1">
                    Add new students to the system
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-3">
                <Button
                  className="bg-royalPurple-accent text-royalPurple-deep font-semibold rounded-lg w-full py-2"
                  onClick={() => handleCreateUser('student')}
                  aria-label="Add a new student"
                >
                  <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
                  Add Student
                </Button>
                <Button
                  variant="outline"
                  className="border border-royalPurple-border2 text-royalPurple-text2 rounded-lg w-full py-2 hover:border-royalPurple-accent hover:text-royalPurple-accentTx"
                  onClick={() => toast('Bulk import functionality - Coming soon')}
                  aria-label="Import multiple students via CSV"
                >
                  <Users className="h-4 w-4 mr-2" aria-hidden="true" />
                  Bulk Import
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-royalPurple-card border border-royalPurple-border rounded-xl overflow-hidden hover:scale-105 transition-all duration-300">
            <CardHeader className="bg-royalPurple-card2 p-4 border-b border-royalPurple-border">
              <div className="flex items-center gap-3">
                <div className="bg-royalPurple-card border border-royalPurple-border rounded-lg p-2">
                  <GraduationCap className="h-5 w-5 text-royalPurple-text2" aria-hidden="true" />
                </div>
                <div>
                  <CardTitle className="text-royalPurple-text1 font-semibold text-base">
                    Register Teachers
                  </CardTitle>
                  <p className="text-royalPurple-text2 text-sm mt-1">
                    Add new teachers to the system
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-3">
                <Button
                  className="bg-royalPurple-accent text-royalPurple-deep font-semibold rounded-lg w-full py-2"
                  onClick={() => handleCreateUser('teacher')}
                  aria-label="Add a new teacher"
                >
                  <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
                  Add Teacher
                </Button>
                <Button
                  variant="outline"
                  className="border border-royalPurple-border2 text-royalPurple-text2 rounded-lg w-full py-2 hover:border-royalPurple-accent hover:text-royalPurple-accentTx"
                  onClick={() => toast('Assign subjects functionality - Coming soon')}
                  aria-label="Assign subjects to teachers"
                >
                  <Settings className="h-4 w-4 mr-2" aria-hidden="true" />
                  Assign Subjects
                </Button>
              </div>
            </CardContent>
          </Card>

          {showHodFeatures && (
            <Card className="bg-royalPurple-card border border-royalPurple-border rounded-xl overflow-hidden hover:scale-105 transition-all duration-300">
              <CardHeader className="bg-royalPurple-card2 p-4 border-b border-royalPurple-border">
                <div className="flex items-center gap-3">
                  <div className="bg-royalPurple-card border border-royalPurple-border rounded-lg p-2">
                    <Settings className="h-5 w-5 text-royalPurple-text2" aria-hidden="true" />
                  </div>
                  <div>
                    <CardTitle className="text-royalPurple-text1 font-semibold text-base">
                      Assign HODs
                    </CardTitle>
                    <p className="text-royalPurple-text2 text-sm mt-1">
                      Select an existing teacher and assign a department
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-3">
                  <Button
                    className="bg-royalPurple-accent text-royalPurple-deep font-semibold rounded-lg w-full py-2"
                    onClick={() => setShowHodAssign(true)}
                    aria-label="Assign a teacher as Head of Department"
                  >
                    <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
                    Assign HOD
                  </Button>
                  <Button
                    variant="outline"
                    className="border border-royalPurple-border2 text-royalPurple-text2 rounded-lg w-full py-2 hover:border-royalPurple-accent hover:text-royalPurple-accentTx"
                    onClick={() => setShowHodAssign(true)}
                    aria-label="Manage HOD assignments"
                  >
                    <Users className="h-4 w-4 mr-2" aria-hidden="true" />
                    Manage HOD Assignments
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="bg-royalPurple-card border border-royalPurple-border rounded-xl overflow-hidden hover:scale-105 transition-all duration-300">
            <CardHeader className="bg-royalPurple-card2 p-4 border-b border-royalPurple-border">
              <div className="flex items-center gap-3">
                <div className="bg-royalPurple-card border border-royalPurple-border rounded-lg p-2">
                  <UserPlus className="h-5 w-5 text-royalPurple-text2" aria-hidden="true" />
                </div>
                <div>
                  <CardTitle className="text-royalPurple-text1 font-semibold text-base">
                    Register Headteachers
                  </CardTitle>
                  <p className="text-royalPurple-text2 text-sm mt-1">
                    Add new headteachers to the system
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-3">
                <Button
                  className="bg-royalPurple-accent text-royalPurple-deep font-semibold rounded-lg w-full py-2"
                  onClick={() => handleCreateUser('headteacher')}
                  aria-label="Add a new headteacher"
                >
                  <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
                  Add Headteacher
                </Button>
                <Button
                  variant="outline"
                  className="border border-royalPurple-border2 text-royalPurple-text2 rounded-lg w-full py-2 hover:border-royalPurple-accent hover:text-royalPurple-accentTx"
                  onClick={() => toast('Assign permissions functionality - Coming soon')}
                  aria-label="Assign permissions to headteachers"
                >
                  <Settings className="h-4 w-4 mr-2" aria-hidden="true" />
                  Assign Permissions
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* User List */}
        <section aria-label="User list and search" className="space-y-4">
          <Card variant="glass">
            <CardHeader>
              <CardTitle className="text-royalPurple-text1">
                {activeUserType === 'all'
                  ? 'All Users'
                  : userTypes.find((t) => t.id === activeUserType)?.name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-royalPurple-card p-6 rounded-b-2xl">
                {/* Search and Filter */}
                <div className="flex flex-col md:flex-row gap-4 mb-6">
                  <div className="flex-1">
                    <div className="relative">
                      <Search
                        className="absolute left-3 top-1/2 transform -translate-y-1/2 text-royalPurple-text3 h-4 w-4"
                        aria-hidden="true"
                      />
                      <input
                        type="text"
                        placeholder="Search users..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-royalPurple-muted/60 border border-royalPurple-border/40 rounded-lg text-royalPurple-text1 placeholder-slate-400 focus:outline-none focus:border-royalPurple-border2 focus:ring-2 focus:ring-blue-500/50"
                        aria-label="Search users by name or email"
                      />
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    className="border-royalPurple-border text-royalPurple-text2 hover:bg-royalPurple-muted/20"
                    aria-label="Open filters"
                  >
                    <Filter className="h-4 w-4 mr-2" aria-hidden="true" />
                    Filter
                  </Button>
                </div>

                {/* Users Table */}
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-royalPurple-border/50">
                        <th className="text-left py-4 text-royalPurple-text2 font-bold">Name</th>
                        <th className="text-left py-4 text-royalPurple-text2 font-bold">Email</th>
                        <th className="text-left py-4 text-royalPurple-text2 font-bold">Role</th>
                        <th className="text-left py-4 text-royalPurple-text2 font-bold">Status</th>
                        <th className="text-left py-4 text-royalPurple-text2 font-bold">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {isLoading ? (
                        <tr>
                          <td colSpan="5" className="py-12">
                            <div
                              className="flex flex-col items-center justify-center space-y-4"
                              aria-live="polite"
                            >
                              <LoadingSpinner size="lg" />
                              <p className="text-royalPurple-text3">Fetching users...</p>
                            </div>
                          </td>
                        </tr>
                      ) : hasError ? (
                        <tr>
                          <td colSpan="5" className="py-12">
                            <div
                              className="flex flex-col items-center justify-center space-y-4"
                              aria-live="assertive"
                            >
                              <p className="text-royalPurple-dangerTx">Failed to load users.</p>
                              <Button
                                onClick={fetchUsers}
                                variant="outline"
                                className="border-royalPurple-border text-royalPurple-dangerTx hover:bg-royalPurple-danger/20"
                                aria-label="Retry fetching users"
                              >
                                <RefreshCcw className="h-4 w-4 mr-2" aria-hidden="true" />
                                Try Again
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ) : users.length === 0 ? (
                        <tr>
                          <td colSpan="5" className="py-12">
                            <div className="flex flex-col items-center justify-center space-y-4 text-center">
                              <Users
                                className="h-12 w-12 text-royalPurple-text2 mb-2"
                                aria-hidden="true"
                              />
                              <p className="text-royalPurple-text3">No users found.</p>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        users
                          .filter(
                            (user) =>
                              searchTerm === '' ||
                              user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                              user.email.toLowerCase().includes(searchTerm.toLowerCase())
                          )
                          .map((user) => (
                            <tr
                              key={user.id}
                              className="border-b border-royalPurple-border/50 hover:bg-royalPurple-muted/40 transition-colors duration-200"
                            >
                              <td className="py-4 text-royalPurple-text1 font-medium">
                                {user.name}
                              </td>
                              <td className="py-4 text-royalPurple-text2">
                                {user.email ? (
                                  user.email
                                ) : (
                                  <span className="text-gray-400 italic">No email</span>
                                )}
                              </td>
                              <td className="py-4">
                                <span className="px-3 py-1 text-xs rounded-full backdrop-blur-md bg-royalPurple-accent/60 text-royalPurple-accentTx border border-royalPurple-border2/50 capitalize font-medium">
                                  {roleLabel(user)}
                                </span>
                              </td>
                              <td className="py-4">
                                <span className="px-3 py-1 text-xs rounded-full backdrop-blur-md bg-royalPurple-success/60 text-royalPurple-successTx border border-royalPurple-border/50 font-medium">
                                  {user.status}
                                </span>
                              </td>
                              <td className="py-4">
                                <div className="flex space-x-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="border-royalPurple-border2 text-royalPurple-accentTx hover:bg-royalPurple-accent/20"
                                    onClick={() => handleViewUser(user.id)}
                                    aria-label={`View details for ${user.name}`}
                                  >
                                    <Eye className="h-3 w-3" aria-hidden="true" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="border-royalPurple-border2 text-royalPurple-text2 hover:bg-royalPurple-card2"
                                    onClick={() => handleEditUser(user)}
                                    aria-label={`Edit ${user.name}`}
                                  >
                                    <Edit className="h-3 w-3" aria-hidden="true" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="border-royalPurple-border text-royalPurple-dangerTx hover:bg-royalPurple-danger/20"
                                    onClick={() => handleDeleteUser(user)}
                                    aria-label={`Delete ${user.name}`}
                                  >
                                    <Trash2 className="h-3 w-3" aria-hidden="true" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      </main>

      {viewingUser && (
        <UserDetailsModal
          user={viewingUser}
          allUsers={users}
          onClose={() => setViewingUser(null)}
          loading={viewingLoading}
        />
      )}
      {editingUser && (
        <UserEditModal
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onSaved={() => {
            setEditingUser(null)
            fetchUsers()
          }}
          lookups={editLookups}
          loadingLookups={editLoading}
        />
      )}
      {showHodAssign && (
        <HodAssignmentModal
          onClose={() => setShowHodAssign(false)}
          onUpdated={() => {
            setShowHodAssign(false)
            fetchUsers()
          }}
        />
      )}
    </div>
  )
}

function HodAssignmentModal({ onClose, onUpdated }) {
  const [teachers, setTeachers] = useState([])
  const [hods, setHods] = useState([])
  const [departments, setDepartments] = useState([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedTeacherId, setSelectedTeacherId] = useState('')
  const [selectedDepartmentId, setSelectedDepartmentId] = useState('')

  useEffect(() => {
    let active = true
    const load = async () => {
      setLoading(true)
      try {
        const [teachersRes, hodsRes, departmentsRes] = await Promise.allSettled([
          api.get('/teachers'),
          api.get('/hods'),
          api.get('/departments'),
        ])

        const teacherData =
          teachersRes.status === 'fulfilled' ? teachersRes.value.data.data || [] : []
        const hodData = hodsRes.status === 'fulfilled' ? hodsRes.value.data.data || [] : []
        const deptData =
          departmentsRes.status === 'fulfilled' ? departmentsRes.value.data.data || [] : []

        if (!active) return
        setTeachers(teacherData)
        setHods(hodData)
        setDepartments(deptData)
      } catch (e) {
        toast.error('Failed to load HOD assignment data')
      } finally {
        if (!active) return
        setLoading(false)
      }
    }
    load()
    return () => {
      active = false
    }
  }, [])

  const hodByUserId = new Map(
    hods.map((h) => [
      String(h.userId || h.user?.id || ''),
      {
        id: String(h.id || ''),
        department: h.departmentRef?.name || h.department || '',
        departmentId: String(h.departmentId || h.departmentRef?.id || ''),
      },
    ])
  )

  const filteredTeachers = teachers.filter((t) => {
    const name = String(t.user?.name || '').toLowerCase()
    const email = String(t.user?.email || '').toLowerCase()
    const q = String(search || '')
      .toLowerCase()
      .trim()
    if (!q) return true
    return (
      name.includes(q) ||
      email.includes(q) ||
      String(t.ts_number || '')
        .toLowerCase()
        .includes(q)
    )
  })

  const selectedTeacher = teachers.find((t) => String(t.id) === String(selectedTeacherId))
  const selectedUserId = selectedTeacher ? String(selectedTeacher.userId || '') : ''
  const selectedHod = selectedUserId ? hodByUserId.get(selectedUserId) : null

  const assign = async () => {
    if (!selectedTeacherId) {
      toast.error('Select a teacher first')
      return
    }
    if (!selectedDepartmentId) {
      toast.error('Select a department')
      return
    }
    setSaving(true)
    try {
      await api.post('/hods/assign', {
        teacherId: selectedTeacherId,
        departmentId: selectedDepartmentId,
      })
      const [hodsRes] = await Promise.allSettled([api.get('/hods')])
      if (hodsRes.status === 'fulfilled') {
        setHods(hodsRes.value.data.data || [])
      }
      toast.success('HOD assignment saved')
      onUpdated()
    } catch (e) {
      toast.error(e?.response?.data?.error || e?.message || 'Failed to assign HOD')
    } finally {
      setSaving(false)
    }
  }

  const unassign = async () => {
    if (!selectedHod?.id) return
    setSaving(true)
    try {
      await api.delete('/hods/assign', { data: { hodId: selectedHod.id } })
      const [hodsRes] = await Promise.allSettled([api.get('/hods')])
      if (hodsRes.status === 'fulfilled') {
        setHods(hodsRes.value.data.data || [])
      }
      toast.success('HOD assignment removed')
      onUpdated()
    } catch (e) {
      toast.error(e?.response?.data?.error || e?.message || 'Failed to remove HOD assignment')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-royalPurple-deep/80">
      <div className="bg-royalPurple-card border border-royalPurple-border rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="p-6 bg-royalPurple-card2 border-b border-royalPurple-border rounded-t-2xl flex justify-between items-center">
          <h3 className="text-xl font-bold text-royalPurple-text1">Assign Head of Department</h3>
          <button
            onClick={onClose}
            className="text-royalPurple-text2 hover:text-royalPurple-text1"
            aria-label="Close"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 bg-royalPurple-card grid grid-cols-1 lg:grid-cols-2 gap-6 overflow-y-auto max-h-[calc(90vh-88px)]">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="h-4 w-4 text-royalPurple-text3 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 input"
                  placeholder="Search teachers by name, email, TS number..."
                />
              </div>
              <Button
                variant="outline"
                className="border border-royalPurple-border2"
                onClick={() => setSearch('')}
              >
                Clear
              </Button>
            </div>

            <div className="bg-royalPurple-card2 border border-royalPurple-border rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-royalPurple-border text-sm font-semibold text-royalPurple-text1">
                Teachers
              </div>
              <div className="max-h-[420px] overflow-y-auto">
                {loading ? (
                  <div className="p-4 text-sm text-royalPurple-text2">Loading…</div>
                ) : filteredTeachers.length === 0 ? (
                  <div className="p-4 text-sm text-royalPurple-text2">No teachers found</div>
                ) : (
                  filteredTeachers.map((t) => {
                    const userId = String(t.userId || '')
                    const hod = hodByUserId.get(userId)
                    const isSelected = String(selectedTeacherId) === String(t.id)
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => {
                          setSelectedTeacherId(String(t.id))
                          setSelectedDepartmentId(hod?.departmentId || '')
                        }}
                        className={`w-full text-left px-4 py-3 border-b border-royalPurple-border hover:bg-royalPurple-card transition-colors ${
                          isSelected
                            ? 'bg-royalPurple-card border-l-4 border-l-royalPurple-accent'
                            : ''
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="font-semibold text-royalPurple-text1 truncate">
                              {t.user?.name || 'Unknown'}
                            </div>
                            <div className="text-xs text-royalPurple-text2 truncate">
                              {t.user?.email || 'N/A'} {t.ts_number ? `• TS: ${t.ts_number}` : ''}
                            </div>
                          </div>
                          <div className="flex-shrink-0">
                            {hod ? (
                              <span className="px-2 py-1 text-xs rounded-full bg-royalPurple-accentBg text-royalPurple-accentTx border border-royalPurple-border2">
                                HOD: {hod.department || 'Assigned'}
                              </span>
                            ) : (
                              <span className="px-2 py-1 text-xs rounded-full bg-royalPurple-card border border-royalPurple-border text-royalPurple-text2">
                                Teacher
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    )
                  })
                )}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-royalPurple-card2 border border-royalPurple-border rounded-xl p-4">
              <div className="text-sm font-semibold text-royalPurple-text1 mb-3">Assignment</div>

              <div className="space-y-3">
                <div>
                  <div className="text-xs text-royalPurple-text3 mb-1">Selected Teacher</div>
                  <div className="text-royalPurple-text1 font-semibold">
                    {selectedTeacher ? selectedTeacher.user?.name || 'Unknown' : 'None'}
                  </div>
                  <div className="text-xs text-royalPurple-text2">
                    {selectedTeacher ? selectedTeacher.user?.email || 'N/A' : ''}
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-royalPurple-text2 mb-1">Department</label>
                  <select
                    className="select"
                    value={selectedDepartmentId}
                    disabled={loading || saving}
                    onChange={(e) => setSelectedDepartmentId(e.target.value)}
                  >
                    <option value="">Select department</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedHod ? (
                  <div className="p-3 bg-royalPurple-card border border-royalPurple-border rounded-lg">
                    <div className="text-sm text-royalPurple-text2">Current HOD Assignment</div>
                    <div className="font-semibold text-royalPurple-text1">
                      {selectedHod.department || 'N/A'}
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-royalPurple-card border border-royalPurple-border rounded-lg text-sm text-royalPurple-text2">
                    This teacher is not assigned as an HOD yet.
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    onClick={assign}
                    disabled={loading || saving}
                    className="flex-1 bg-royalPurple-accent text-royalPurple-deep font-semibold hover:opacity-90 transition-opacity"
                  >
                    Save Assignment
                  </Button>
                  <Button
                    onClick={unassign}
                    disabled={loading || saving || !selectedHod}
                    variant="outline"
                    className="flex-1 border border-royalPurple-border text-royalPurple-dangerTx hover:bg-royalPurple-danger/20"
                  >
                    Remove
                  </Button>
                </div>
              </div>
            </div>

            <div className="bg-royalPurple-card2 border border-royalPurple-border rounded-xl p-4">
              <div className="text-sm font-semibold text-royalPurple-text1 mb-3">
                Current HODs ({hods.length})
              </div>
              <div className="space-y-2 max-h-[220px] overflow-y-auto">
                {hods.length === 0 ? (
                  <div className="text-sm text-royalPurple-text2">No HODs assigned yet</div>
                ) : (
                  hods.map((h) => (
                    <div
                      key={h.id}
                      className="flex items-center justify-between gap-3 p-3 bg-royalPurple-card border border-royalPurple-border rounded-lg"
                    >
                      <div className="min-w-0">
                        <div className="font-semibold text-royalPurple-text1 truncate">
                          {h.user?.name || 'Unknown'}
                        </div>
                        <div className="text-xs text-royalPurple-text2 truncate">
                          {h.user?.email || 'N/A'} •{' '}
                          {h.departmentRef?.name || h.department || 'N/A'}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-royalPurple-border text-royalPurple-dangerTx hover:bg-royalPurple-danger/20"
                        onClick={async () => {
                          setSaving(true)
                          try {
                            await api.delete('/hods/assign', { data: { hodId: h.id } })
                            const next = hods.filter((x) => String(x.id) !== String(h.id))
                            setHods(next)
                            toast.success('HOD assignment removed')
                          } catch (e) {
                            toast.error(e?.response?.data?.error || 'Failed to remove HOD')
                          } finally {
                            setSaving(false)
                          }
                        }}
                        disabled={saving}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function UserDetailsModal({ user, allUsers, onClose, loading }) {
  const data = user.original || user
  const role = user.role || data.role || data.user?.role

  const getSubjectName = (id) => {
    const numId = Number(id)
    const sub = SCHOOL_SUBJECTS.find((s) => s.id === numId)
    return sub ? sub.name : id
  }

  const derivedTeacherClasses =
    Array.isArray(data.classes) && data.classes.length > 0
      ? data.classes
      : Array.isArray(data.teachingAssignments)
        ? Array.from(
            new Map(
              data.teachingAssignments
                .map((a) => a?.class)
                .filter(Boolean)
                .map((cls) => [cls.id || cls.name, cls])
            ).values()
          )
        : []

  const derivedTeacherSubjects =
    Array.isArray(data.assignedSubjects) && data.assignedSubjects.length > 0
      ? data.assignedSubjects
      : Array.isArray(data.teachingAssignments)
        ? Array.from(
            new Set(
              data.teachingAssignments
                .map((a) => a?.subject?.name || a?.subjectId)
                .filter(Boolean)
                .map(String)
            )
          )
        : []

  const hodAssignedClasses = Array.isArray(data.assignedClasses) ? data.assignedClasses : []
  const hodAssignedSubjects = Array.isArray(data.assignedSubjects) ? data.assignedSubjects : []

  const hodDeptId = data.departmentId || data.departmentRef?.id
  const hodDeptName = String(data.departmentRef?.name || data.department || '')
    .trim()
    .toLowerCase()

  const derivedHodFromTeachers =
    role === 'hod' && (hodAssignedClasses.length === 0 || hodAssignedSubjects.length === 0)
      ? (() => {
          const teacherUsers = Array.isArray(allUsers)
            ? allUsers.filter((u) => u.role === 'teacher' && u.original)
            : []

          const relevantTeachers = teacherUsers.filter((u) => {
            const t = u.original
            const deptLinks = Array.isArray(t.departments) ? t.departments : []
            if (hodDeptId) {
              return deptLinks.some(
                (d) => String(d.departmentId || d.department?.id || '') === String(hodDeptId)
              )
            }
            if (!hodDeptName) return false
            return deptLinks.some((d) => {
              const n = String(d.department?.name || d.name || d.department_name || '')
                .trim()
                .toLowerCase()
              return n && n === hodDeptName
            })
          })

          const allAssignments = relevantTeachers.flatMap((u) =>
            Array.isArray(u.original.teachingAssignments) ? u.original.teachingAssignments : []
          )

          const classes = Array.from(
            new Set(
              allAssignments
                .map((a) => a?.class?.name)
                .filter(Boolean)
                .map(String)
            )
          )

          const subjects = Array.from(
            new Set(
              allAssignments
                .map((a) => a?.subject?.name || a?.subjectId)
                .filter(Boolean)
                .map(String)
            )
          )

          return { classes, subjects }
        })()
      : null

  const resolvedHodClasses =
    hodAssignedClasses.length > 0 ? hodAssignedClasses : derivedHodFromTeachers?.classes || []
  const resolvedHodSubjects =
    hodAssignedSubjects.length > 0 ? hodAssignedSubjects : derivedHodFromTeachers?.subjects || []

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-royalPurple-deep/80">
      <div className="bg-royalPurple-card border border-royalPurple-border rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 bg-royalPurple-card2 border-b border-royalPurple-border rounded-t-2xl flex justify-between items-center">
          <h3 className="text-xl font-bold text-royalPurple-text1 dark:text-royalPurple-text1">
            User Details
          </h3>
          <button
            onClick={onClose}
            className="text-royalPurple-text2 hover:text-royalPurple-text1 dark:text-royalPurple-text3 dark:hover:text-royalPurple-text1"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 bg-royalPurple-card space-y-6">
          {loading && (
            <div className="text-sm text-royalPurple-text2 dark:text-royalPurple-text2">
              Loading…
            </div>
          )}
          {/* Header Info */}
          <div className="flex items-center space-x-4">
            <div className="h-16 w-16 rounded-full bg-royalPurple-accent flex items-center justify-center text-royalPurple-accentTx text-2xl font-bold">
              {(data.name || data.user?.name || 'U').charAt(0)}
            </div>
            <div>
              <h4 className="text-xl font-bold text-royalPurple-text1 dark:text-royalPurple-text1">
                {data.name || data.user?.name}
              </h4>
              <span className="px-3 py-1 text-xs rounded-full bg-royalPurple-accent text-royalPurple-accentTx dark:bg-royalPurple-accent/30 dark:text-royalPurple-accentTx border border-royalPurple-border2 dark:border-royalPurple-border2/30 capitalize font-medium">
                {role || 'user'}
              </span>
            </div>
          </div>

          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-royalPurple-text2 dark:text-royalPurple-text3">Email</p>
              <p className="text-royalPurple-text1 dark:text-royalPurple-text1 font-medium break-all">
                {data.email || data.user?.email}
              </p>
            </div>
            <div>
              <p className="text-sm text-royalPurple-text2 dark:text-royalPurple-text3">Contact</p>
              <p className="text-royalPurple-text1 dark:text-royalPurple-text1 font-medium">
                {data.contact_number || data.user?.contact_number || 'N/A'}
              </p>
            </div>
          </div>

          {/* Teacher Specific */}
          {role === 'teacher' && (
            <>
              <div className="border-t border-royalPurple-border dark:border-royalPurple-border pt-4">
                <h4 className="text-lg font-semibold text-royalPurple-accentTx dark:text-royalPurple-accentTx mb-3">
                  Professional Info
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-royalPurple-text2 dark:text-royalPurple-text3">
                      Department
                    </p>
                    {Array.isArray(data.departments) && data.departments.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {data.departments.map((d) => (
                          <span
                            key={d.departmentId || d.id}
                            className="px-2 py-1 bg-royalPurple-accent text-royalPurple-accentTx dark:bg-royalPurple-accent/20 dark:text-royalPurple-accentTx rounded text-xs border border-royalPurple-border2 dark:border-royalPurple-border2/20"
                          >
                            {d.department?.name || d.name || d.department_name || d.departmentId}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-royalPurple-text1 dark:text-royalPurple-text1">
                        {data.department || 'N/A'}
                      </p>
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-royalPurple-text2 dark:text-royalPurple-text3">
                      TS Number
                    </p>
                    <p className="text-royalPurple-text1 dark:text-royalPurple-text1">
                      {data.ts_number || 'N/A'}
                    </p>
                  </div>
                </div>
              </div>

              {Array.isArray(data.teachingAssignments) && data.teachingAssignments.length > 0 && (
                <div>
                  <p className="text-sm text-royalPurple-text2 dark:text-royalPurple-text3 mb-2">
                    Teaching Assignments
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {data.teachingAssignments.map((a) => (
                      <span
                        key={a.id}
                        className="px-2 py-1 bg-royalPurple-card2 text-royalPurple-text1 dark:bg-royalPurple-deep/20 dark:text-royalPurple-text2 rounded text-xs border border-royalPurple-border dark:border-royalPurple-border/30"
                      >
                        {(a.class?.name || a.classId) + ' - ' + (a.subject?.name || a.subjectId)}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <p className="text-sm text-royalPurple-text2 dark:text-royalPurple-text3 mb-2">
                  Assigned Classes
                </p>
                <div className="flex flex-wrap gap-2">
                  {derivedTeacherClasses.length > 0 ? (
                    derivedTeacherClasses.map((cls) => (
                      <span
                        key={cls.id || cls.name}
                        className="px-2 py-1 bg-royalPurple-accent text-royalPurple-accentTx dark:bg-royalPurple-accent/20 dark:text-royalPurple-accentTx rounded text-xs border border-royalPurple-border2 dark:border-royalPurple-border2/20"
                      >
                        {cls.name || String(cls)}
                      </span>
                    ))
                  ) : (
                    <p className="text-royalPurple-text2 italic">No classes assigned</p>
                  )}
                </div>
              </div>

              <div>
                <p className="text-sm text-royalPurple-text2 dark:text-royalPurple-text3 mb-2">
                  Assigned Subjects
                </p>
                <div className="flex flex-wrap gap-2">
                  {derivedTeacherSubjects.length > 0 ? (
                    derivedTeacherSubjects.map((sub, idx) => (
                      <span
                        key={`${sub}-${idx}`}
                        className="px-2 py-1 bg-royalPurple-pill text-royalPurple-pillTx dark:bg-royalPurple-pill/20 dark:text-royalPurple-pillTx rounded text-xs border border-royalPurple-border2 dark:border-royalPurple-border2/20"
                      >
                        {getSubjectName(sub)}
                      </span>
                    ))
                  ) : (
                    <p className="text-royalPurple-text2 italic">No subjects assigned</p>
                  )}
                </div>
              </div>
            </>
          )}

          {/* HOD Specific */}
          {role === 'hod' && (
            <>
              <div className="border-t border-royalPurple-border dark:border-royalPurple-border pt-4">
                <h4 className="text-lg font-semibold text-royalPurple-accentTx dark:text-royalPurple-accentTx mb-3">
                  Department Info
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-royalPurple-text2 dark:text-royalPurple-text3">
                      Department
                    </p>
                    <p className="text-royalPurple-text1 dark:text-royalPurple-text1 font-medium">
                      {data.departmentRef?.name || data.department || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-royalPurple-text2 dark:text-royalPurple-text3">
                      Department ID
                    </p>
                    <p className="text-royalPurple-text1 dark:text-royalPurple-text1 font-medium">
                      {data.departmentId || data.departmentRef?.id || 'N/A'}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-sm text-royalPurple-text2 dark:text-royalPurple-text3 mb-2">
                  Assigned Classes
                </p>
                <div className="flex flex-wrap gap-2">
                  {resolvedHodClasses.length > 0 ? (
                    resolvedHodClasses.map((cls, idx) => (
                      <span
                        key={`${cls}-${idx}`}
                        className="px-2 py-1 bg-royalPurple-accent text-royalPurple-accentTx dark:bg-royalPurple-accent/20 dark:text-royalPurple-accentTx rounded text-xs border border-royalPurple-border2 dark:border-royalPurple-border2/20"
                      >
                        {String(cls)}
                      </span>
                    ))
                  ) : (
                    <p className="text-royalPurple-text2 italic">No classes assigned</p>
                  )}
                </div>
              </div>

              <div>
                <p className="text-sm text-royalPurple-text2 dark:text-royalPurple-text3 mb-2">
                  Assigned Subjects
                </p>
                <div className="flex flex-wrap gap-2">
                  {resolvedHodSubjects.length > 0 ? (
                    resolvedHodSubjects.map((sub, idx) => (
                      <span
                        key={`${sub}-${idx}`}
                        className="px-2 py-1 bg-royalPurple-pill text-royalPurple-pillTx dark:bg-royalPurple-pill/20 dark:text-royalPurple-pillTx rounded text-xs border border-royalPurple-border2 dark:border-royalPurple-border2/20"
                      >
                        {getSubjectName(sub)}
                      </span>
                    ))
                  ) : (
                    <p className="text-royalPurple-text2 italic">No subjects assigned</p>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Student Specific */}
          {role === 'student' && (
            <>
              <div className="border-t border-royalPurple-border dark:border-royalPurple-border pt-4">
                <h4 className="text-lg font-semibold text-royalPurple-successTx dark:text-royalPurple-successTx mb-3">
                  Academic Info
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-royalPurple-text2 dark:text-royalPurple-text3">
                      Class
                    </p>
                    <p className="text-royalPurple-text1 dark:text-royalPurple-text1">
                      {data.class || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-royalPurple-text2 dark:text-royalPurple-text3">
                      Exam Number
                    </p>
                    <p className="text-royalPurple-text1 dark:text-royalPurple-text1">
                      {data.exam_number || 'N/A'}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-sm text-royalPurple-text2 dark:text-royalPurple-text3 mb-2">
                  Enrolled Subjects
                </p>
                <div className="flex flex-wrap gap-2">
                  {data.selected_subjects && data.selected_subjects.length > 0 ? (
                    data.selected_subjects.map((sub, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-1 bg-royalPurple-success text-royalPurple-successTx dark:bg-royalPurple-success/20 dark:text-royalPurple-successTx rounded text-xs border border-royalPurple-border dark:border-royalPurple-border/20"
                      >
                        {getSubjectName(sub)}
                      </span>
                    ))
                  ) : (
                    <p className="text-royalPurple-text2 italic">No subjects enrolled</p>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="p-6 bg-royalPurple-card2 border-t border-royalPurple-border rounded-b-2xl flex justify-end">
          <Button
            onClick={onClose}
            className="bg-royalPurple-card2 text-royalPurple-text1 hover:bg-royalPurple-card2 dark:bg-royalPurple-muted dark:text-royalPurple-text1 dark:hover:bg-royalPurple-muted"
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  )
}

function UserEditModal({ user, onClose, onSaved, lookups, loadingLookups }) {
  const data = user.original || user
  const role = String(user.role || data.role || data.user?.role || '').toLowerCase()
  const profileId = user.id
  const userId =
    role === 'headteacher' ? String(data.id || user.id) : String(data.userId || data.user?.id || '')

  const initialClass = String(data.class || '').trim()
  const initialYearGroup = initialClass.length > 1 ? initialClass.slice(0, -1).trim() : ''
  const initialSection = initialClass.length > 0 ? initialClass.slice(-1).trim() : ''

  const [saving, setSaving] = useState(false)
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)

  const [form, setForm] = useState(() => ({
    user: {
      name: String(data.user?.name || data.name || ''),
      email: String(data.user?.email || data.email || ''),
      contact_number: String(data.user?.contact_number || data.contact_number || ''),
    },
    student: {
      year_group: initialYearGroup,
      section: initialSection,
      exam_number: String(data.exam_number || ''),
      selected_subjects: Array.isArray(data.selected_subjects)
        ? data.selected_subjects.map(String)
        : [],
    },
    teacher: {
      ts_number: String(data.ts_number || ''),
      qualifications: String(data.qualifications || ''),
      specialization: String(data.specialization || ''),
      departmentIds: Array.isArray(data.departments)
        ? data.departments.map((d) => String(d.departmentId)).filter(Boolean)
        : [],
      assignments: Array.isArray(data.teachingAssignments)
        ? data.teachingAssignments.map((a) => ({
            year_group: String(a.class?.year_group || '').trim(),
            section: String(a.class?.section || '').trim(),
            classId: String(a.classId || ''),
            subjectId: String(a.subjectId || ''),
          }))
        : [],
    },
    hod: {
      department: String(data.department || ''),
      departmentId: data.departmentId ? String(data.departmentId) : '',
    },
  }))

  const setUserField = (key, value) => {
    setForm((prev) => ({ ...prev, user: { ...prev.user, [key]: value } }))
  }

  const save = async () => {
    setSaving(true)
    try {
      if (role === 'student') {
        await api.put(`/students/${profileId}`, {
          user: form.user,
          year_group: form.student.year_group,
          section: form.student.section,
          exam_number: form.student.exam_number,
          selected_subjects: form.student.selected_subjects,
        })
      } else if (role === 'teacher') {
        const assignments = Array.isArray(form.teacher.assignments)
          ? form.teacher.assignments
              .filter((a) => a.subjectId && a.year_group && a.section)
              .map((a) => ({
                classId: a.classId || undefined,
                className: `${String(a.year_group).trim()}${String(a.section).trim()}`,
                subjectId: a.subjectId,
              }))
          : []

        await api.put(`/teachers/${profileId}`, {
          user: form.user,
          ts_number: form.teacher.ts_number,
          qualifications: form.teacher.qualifications,
          specialization: form.teacher.specialization,
          assignments,
          departmentIds: form.teacher.departmentIds,
        })
      } else if (role === 'hod') {
        await api.put(`/hods/${profileId}`, {
          user: form.user,
          department: form.hod.department,
          departmentId: form.hod.departmentId || null,
        })
      } else if (role === 'headteacher') {
        await api.put(`/users/${userId}`, {
          name: form.user.name,
          email: form.user.email,
          contact_number: form.user.contact_number,
        })
      }

      toast.success('User updated')
      onSaved?.()
    } catch (e) {
      toast.error(e.response?.data?.error || e.message || 'Failed to update user')
    } finally {
      setSaving(false)
    }
  }

  const resetPassword = async () => {
    if (!userId) {
      toast.error('User account not linked')
      return
    }
    const passwordError = getPasswordFormError(newPassword)
    if (passwordError) {
      toast.error(passwordError)
      return
    }
    setPasswordSaving(true)
    try {
      await api.post(`/users/${userId}/password`, { newPassword })
      toast.success('Password updated')
      setNewPassword('')
    } catch (e) {
      toast.error(e.response?.data?.error || e.message || 'Failed to update password')
    } finally {
      setPasswordSaving(false)
    }
  }

  const addTeacherAssignment = () => {
    setForm((prev) => ({
      ...prev,
      teacher: {
        ...prev.teacher,
        assignments: [
          ...prev.teacher.assignments,
          { year_group: '', section: '', classId: '', subjectId: '' },
        ],
      },
    }))
  }

  const removeTeacherAssignment = (idx) => {
    setForm((prev) => ({
      ...prev,
      teacher: {
        ...prev.teacher,
        assignments: prev.teacher.assignments.filter((_, i) => i !== idx),
      },
    }))
  }

  const updateTeacherAssignment = (idx, patch) => {
    setForm((prev) => ({
      ...prev,
      teacher: {
        ...prev.teacher,
        assignments: prev.teacher.assignments.map((a, i) => (i === idx ? { ...a, ...patch } : a)),
      },
    }))
  }

  const departmentOptions = Array.isArray(lookups?.departments) ? lookups.departments : []
  const subjectOptions = Array.isArray(lookups?.subjects) ? lookups.subjects : []

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-royalPurple-deep/80">
      <div className="bg-royalPurple-card border border-royalPurple-border rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 bg-royalPurple-card2 border-b border-royalPurple-border rounded-t-2xl flex justify-between items-center">
          <h3 className="text-xl font-bold text-royalPurple-text1 dark:text-royalPurple-text1">
            Edit User
          </h3>
          <button
            onClick={onClose}
            className="text-royalPurple-text2 hover:text-royalPurple-text1 dark:text-royalPurple-text3 dark:hover:text-royalPurple-text1"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 bg-royalPurple-card space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-royalPurple-text1 dark:text-royalPurple-text2 mb-1">
                Full Name
              </label>
              <input
                value={form.user.name}
                onChange={(e) => setUserField('name', e.target.value)}
                className="input text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-royalPurple-text1 dark:text-royalPurple-text2 mb-1">
                Contact
              </label>
              <input
                value={form.user.contact_number}
                onChange={(e) => setUserField('contact_number', e.target.value)}
                className="input text-sm"
              />
            </div>
            <div className="md:col-span-3">
              <label className="block text-sm font-medium text-royalPurple-text1 dark:text-royalPurple-text2 mb-1">
                Email
              </label>
              <input
                value={form.user.email}
                onChange={(e) => setUserField('email', e.target.value)}
                className="input text-sm"
              />
            </div>
          </div>

          <div className="border-t border-royalPurple-border dark:border-royalPurple-border pt-4">
            <h4 className="text-lg font-semibold text-royalPurple-text1 dark:text-royalPurple-text1 mb-3">
              Admin Password Reset
            </h4>
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  placeholder="New password (min 6 chars)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="input text-sm pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-royalPurple-text3 hover:text-royalPurple-text1 transition-colors"
                  aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                >
                  {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              <Button
                onClick={resetPassword}
                disabled={passwordSaving || !newPassword || !evaluatePassword(newPassword).isValid}
              >
                Update Password
              </Button>
            </div>
          </div>

          {role === 'student' && (
            <div className="border-t border-royalPurple-border dark:border-royalPurple-border pt-4 space-y-4">
              <h4 className="text-lg font-semibold text-royalPurple-text1 dark:text-royalPurple-text1">
                Student
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-royalPurple-text1 dark:text-royalPurple-text2 mb-1">
                    Year Group
                  </label>
                  <select
                    value={form.student.year_group}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        student: { ...prev.student, year_group: e.target.value },
                      }))
                    }
                    className="select"
                  >
                    <option value="">Select</option>
                    {GRADE_LEVELS.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-royalPurple-text1 dark:text-royalPurple-text2 mb-1">
                    Section
                  </label>
                  <select
                    value={form.student.section}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        student: { ...prev.student, section: e.target.value },
                      }))
                    }
                    className="select"
                  >
                    <option value="">Select</option>
                    {SECTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-3">
                  <label className="block text-sm font-medium text-royalPurple-text1 dark:text-royalPurple-text2 mb-1">
                    Exam Number
                  </label>
                  <input
                    value={form.student.exam_number}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        student: { ...prev.student, exam_number: e.target.value },
                      }))
                    }
                    className="input text-sm"
                  />
                </div>
              </div>

              <div className="bg-royalPurple-success dark:bg-royalPurple-deep/40 p-4 rounded-xl border border-royalPurple-border dark:border-royalPurple-border">
                <SubjectSelection
                  selectedSubjects={form.student.selected_subjects}
                  onSubjectsChange={(subjects) =>
                    setForm((prev) => ({
                      ...prev,
                      student: { ...prev.student, selected_subjects: subjects },
                    }))
                  }
                  userRole="student"
                  valueType="name"
                  maxSelections={12}
                />
              </div>
            </div>
          )}

          {role === 'teacher' && (
            <div className="border-t border-royalPurple-border dark:border-royalPurple-border pt-4 space-y-4">
              <h4 className="text-lg font-semibold text-royalPurple-text1 dark:text-royalPurple-text1">
                Teacher
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-royalPurple-text1 dark:text-royalPurple-text2 mb-1">
                    TS Number
                  </label>
                  <input
                    value={form.teacher.ts_number}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        teacher: { ...prev.teacher, ts_number: e.target.value },
                      }))
                    }
                    className="input text-sm"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-royalPurple-text1 dark:text-royalPurple-text2 mb-1">
                    Specialization
                  </label>
                  <input
                    value={form.teacher.specialization}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        teacher: { ...prev.teacher, specialization: e.target.value },
                      }))
                    }
                    className="input text-sm"
                  />
                </div>
                <div className="md:col-span-3">
                  <label className="block text-sm font-medium text-royalPurple-text1 dark:text-royalPurple-text2 mb-1">
                    Qualifications
                  </label>
                  <textarea
                    value={form.teacher.qualifications}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        teacher: { ...prev.teacher, qualifications: e.target.value },
                      }))
                    }
                    rows={3}
                    className="textarea text-sm"
                  />
                </div>
              </div>

              <div className="bg-royalPurple-pill dark:bg-royalPurple-deep/40 p-4 rounded-xl border border-royalPurple-border2 dark:border-royalPurple-border">
                <div className="font-semibold text-royalPurple-text1 dark:text-royalPurple-text1 mb-2">
                  Departments
                </div>
                {loadingLookups ? (
                  <div className="text-sm text-royalPurple-text2 dark:text-royalPurple-text2">
                    Loading…
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {departmentOptions.map((d) => (
                      <label
                        key={d.id}
                        className="flex items-center gap-2 text-sm text-royalPurple-text1 dark:text-royalPurple-text1"
                      >
                        <input
                          type="checkbox"
                          checked={form.teacher.departmentIds.includes(String(d.id))}
                          onChange={(e) => {
                            const id = String(d.id)
                            const next = e.target.checked
                              ? [...form.teacher.departmentIds, id]
                              : form.teacher.departmentIds.filter((x) => x !== id)
                            setForm((prev) => ({
                              ...prev,
                              teacher: { ...prev.teacher, departmentIds: next },
                            }))
                          }}
                        />
                        <span>{d.name}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-royalPurple-card dark:bg-royalPurple-deep/40 p-4 rounded-xl border border-royalPurple-border dark:border-royalPurple-border">
                <div className="flex items-center justify-between mb-3">
                  <div className="font-semibold text-royalPurple-text1 dark:text-royalPurple-text1">
                    Teaching Assignments
                  </div>
                  <Button size="sm" onClick={addTeacherAssignment}>
                    Add
                  </Button>
                </div>

                {form.teacher.assignments.length === 0 ? (
                  <div className="text-sm text-royalPurple-text2 dark:text-royalPurple-text2">
                    No assignments
                  </div>
                ) : (
                  <div className="space-y-3">
                    {form.teacher.assignments.map((a, idx) => (
                      <div key={idx} className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
                        <div className="md:col-span-2">
                          <label className="block text-xs text-royalPurple-text2 dark:text-royalPurple-text2 mb-1">
                            Year Group
                          </label>
                          <select
                            value={a.year_group}
                            onChange={(e) =>
                              updateTeacherAssignment(idx, { year_group: e.target.value })
                            }
                            className="select"
                          >
                            <option value="">Select</option>
                            {GRADE_LEVELS.map((g) => (
                              <option key={g} value={g}>
                                {g}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-royalPurple-text2 dark:text-royalPurple-text2 mb-1">
                            Section
                          </label>
                          <select
                            value={a.section}
                            onChange={(e) =>
                              updateTeacherAssignment(idx, { section: e.target.value })
                            }
                            className="select"
                          >
                            <option value="">Select</option>
                            {SECTIONS.map((s) => (
                              <option key={s} value={s}>
                                {s}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-xs text-royalPurple-text2 dark:text-royalPurple-text2 mb-1">
                            Subject
                          </label>
                          <select
                            value={a.subjectId}
                            onChange={(e) =>
                              updateTeacherAssignment(idx, { subjectId: e.target.value })
                            }
                            className="select"
                          >
                            <option value="">Select</option>
                            {subjectOptions.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="flex justify-end">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => removeTeacherAssignment(idx)}
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {role === 'hod' && (
            <div className="border-t border-royalPurple-border dark:border-royalPurple-border pt-4 space-y-4">
              <h4 className="text-lg font-semibold text-royalPurple-text1 dark:text-royalPurple-text1">
                HOD
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-royalPurple-text1 dark:text-royalPurple-text2 mb-1">
                    Department
                  </label>
                  <input
                    value={form.hod.department}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        hod: { ...prev.hod, department: e.target.value },
                      }))
                    }
                    className="input text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-royalPurple-text1 dark:text-royalPurple-text2 mb-1">
                    Department (DB)
                  </label>
                  <select
                    value={form.hod.departmentId}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        hod: { ...prev.hod, departmentId: e.target.value },
                      }))
                    }
                    className="select"
                  >
                    <option value="">None</option>
                    {departmentOptions.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-6 bg-royalPurple-card2 border-t border-royalPurple-border rounded-b-2xl flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving}>
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  )
}
