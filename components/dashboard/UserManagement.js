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
  RefreshCcw,
  X,
} from 'lucide-react'
import { api } from '@/lib/api'
import toast from 'react-hot-toast'
import LoadingSpinner from '@/components/LoadingSpinner'
import { SCHOOL_SUBJECTS } from '@/data/subjects'

export default function UserManagement() {
  const [activeUserType, setActiveUserType] = useState('all')
  const [users, setUsers] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [hasError, setHasError] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [viewingUser, setViewingUser] = useState(null)

  const userTypes = [
    { id: 'all', name: 'All Users', icon: Users, count: users.length },
    {
      id: 'students',
      name: 'Students',
      icon: User,
      count: users.filter((u) => u.role === 'student').length,
    },
    {
      id: 'teachers',
      name: 'Teachers',
      icon: GraduationCap,
      count: users.filter((u) => u.role === 'teacher').length,
    },
    {
      id: 'hods',
      name: 'HODs',
      icon: Settings,
      count: users.filter((u) => u.role === 'hod').length,
    },
    {
      id: 'headteachers',
      name: 'Headteachers',
      icon: UserPlus,
      count: users.filter((u) => u.role === 'headteacher').length,
    },
  ]

  useEffect(() => {
    fetchUsers()
  }, [activeUserType])

  const fetchUsers = async () => {
    setIsLoading(true)
    setHasError(false)
    try {
      let data = []
      if (activeUserType === 'all') {
        const [studentsRes, teachersRes, hodsRes] = await Promise.allSettled([
          api.get('/students'),
          api.get('/teachers'),
          api.get('/hods'),
        ])

        const students = studentsRes.status === 'fulfilled' ? studentsRes.value.data.data || [] : []
        const teachers = teachersRes.status === 'fulfilled' ? teachersRes.value.data.data || [] : []
        const hods = hodsRes.status === 'fulfilled' ? hodsRes.value.data.data || [] : []

        data = [
          ...students.map((u) => ({
            id: u.id,
            name: u.name,
            email: u.user?.email || 'N/A',
            role: 'student',
            status: 'Active',
            original: u,
          })),
          ...teachers.map((u) => ({
            id: u.id,
            name: u.user?.name || 'Unknown',
            email: u.user?.email || 'N/A',
            role: 'teacher',
            status: 'Active',
            original: u,
          })),
          ...hods.map((u) => ({
            id: u.id,
            name: u.user?.name || 'Unknown',
            email: u.user?.email || 'N/A',
            role: 'hod',
            status: 'Active',
            original: u,
          })),
        ]
      } else if (activeUserType === 'students') {
        const res = await api.get('/students')
        data = (res.data.data || []).map((u) => ({
          id: u.id,
          name: u.name,
          email: u.user?.email || 'N/A',
          role: 'student',
          status: 'Active',
          original: u,
        }))
      } else if (activeUserType === 'teachers') {
        const res = await api.get('/teachers')
        data = (res.data.data || []).map((u) => ({
          id: u.id,
          name: u.user?.name || 'Unknown',
          email: u.user?.email || 'N/A',
          role: 'teacher',
          status: 'Active',
          original: u,
        }))
      } else if (activeUserType === 'hods') {
        const res = await api.get('/hods')
        data = (res.data.data || []).map((u) => ({
          id: u.id,
          name: u.user?.name || 'Unknown',
          email: u.user?.email || 'N/A',
          role: 'hod',
          status: 'Active',
          original: u,
        }))
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
    // For now, we use a simple prompt for name update as a proof of concept
    // In a real app, this would be a modal
    const newName = prompt(`Edit name for ${user.role}:`, user.name)
    if (newName && newName !== user.name) {
      updateUser(user, { name: newName })
    }
  }

  const updateUser = async (user, updates) => {
    try {
      const endpoint =
        user.role === 'student'
          ? `/students/${user.id}`
          : user.role === 'teacher'
            ? `/teachers/${user.id}`
            : `/hods/${user.id}`

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
              : `/hods/${user.id}`

        await api.delete(endpoint)
        fetchUsers()
        toast.success('User deleted successfully')
      } catch (error) {
        toast.error('Failed to delete user: ' + error.message)
      }
    }
  }

  const handleViewUser = (userId) => {
    const user = users.find((u) => u.id === userId)
    if (user) {
      setViewingUser(user)
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="backdrop-blur-lg bg-slate-800/60 border border-blue-500/40 rounded-3xl p-8 text-center shadow-2xl">
        <h2 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent mb-4">
          User Management
        </h2>
        <p className="text-slate-300 text-lg">Register, manage, and oversee all system users</p>
      </header>

      <main className="space-y-8">
        {/* User Type Cards */}
        <section
          aria-label="User categories summary"
          className="grid grid-cols-1 md:grid-cols-5 gap-6"
        >
          {userTypes.map((type) => {
            const Icon = type.icon
            const isActive = activeUserType === type.id
            return (
              <Card
                key={type.id}
                variant="glass"
                className={`cursor-pointer transition-all duration-300 ${
                  isActive
                    ? 'scale-105 border-blue-500/60'
                    : 'hover:scale-105 hover:border-blue-400/40'
                }`}
                onClick={() => setActiveUserType(type.id)}
                role="button"
                aria-pressed={isActive}
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && setActiveUserType(type.id)}
              >
                <CardContent className="p-6 text-center">
                  <div
                    className={`backdrop-blur-md rounded-2xl p-4 mb-4 ${
                      isActive
                        ? 'bg-blue-600/60 border border-blue-400/50'
                        : 'bg-slate-700/60 border border-slate-500/40'
                    }`}
                  >
                    <Icon className="h-8 w-8 text-white mx-auto" aria-hidden="true" />
                  </div>
                  <h3 className="font-bold text-white text-lg mb-2">{type.name}</h3>
                  <p className="text-3xl font-bold text-blue-400">{type.count}</p>
                </CardContent>
              </Card>
            )
          })}
        </section>

        {/* Management Actions */}
        <section
          aria-label="Registration actions"
          className="grid grid-cols-1 md:grid-cols-4 gap-6"
        >
          <Card variant="glass" className="hover:scale-105 transition-all duration-300">
            <CardHeader className="backdrop-blur-md bg-green-600/60 border-b border-green-400/50 text-white rounded-t-3xl">
              <CardTitle className="flex items-center text-white">
                <UserPlus className="h-6 w-6 mr-3" aria-hidden="true" />
                Register Students
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                <p className="text-slate-300 text-sm">Add new students to the system</p>
                <div className="space-y-3">
                  <Button
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3"
                    onClick={() => handleCreateUser('student')}
                    aria-label="Add a new student"
                  >
                    <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
                    Add Student
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full border-green-400 text-green-300 hover:bg-green-600/20 font-semibold py-3"
                    onClick={() => toast('Bulk import functionality - Coming soon')}
                    aria-label="Import multiple students via CSV"
                  >
                    <Users className="h-4 w-4 mr-2" aria-hidden="true" />
                    Bulk Import
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card variant="glass" className="hover:scale-105 transition-all duration-300">
            <CardHeader className="backdrop-blur-md bg-blue-600/60 border-b border-blue-400/50 text-white rounded-t-3xl">
              <CardTitle className="flex items-center text-white">
                <GraduationCap className="h-6 w-6 mr-3" aria-hidden="true" />
                Register Teachers
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                <p className="text-slate-300 text-sm">Add new teachers to the system</p>
                <div className="space-y-3">
                  <Button
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3"
                    onClick={() => handleCreateUser('teacher')}
                    aria-label="Add a new teacher"
                  >
                    <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
                    Add Teacher
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full border-blue-400 text-blue-300 hover:bg-blue-600/20 font-semibold py-3"
                    onClick={() => toast('Assign subjects functionality - Coming soon')}
                    aria-label="Assign subjects to teachers"
                  >
                    <Settings className="h-4 w-4 mr-2" aria-hidden="true" />
                    Assign Subjects
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card variant="glass" className="hover:scale-105 transition-all duration-300">
            <CardHeader className="backdrop-blur-md bg-purple-600/60 border-b border-purple-400/50 text-white rounded-t-3xl">
              <CardTitle className="flex items-center text-white">
                <Settings className="h-6 w-6 mr-3" aria-hidden="true" />
                Register HODs
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                <p className="text-slate-300 text-sm">Add new HODs to the system</p>
                <div className="space-y-3">
                  <Button
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3"
                    onClick={() => handleCreateUser('hod')}
                    aria-label="Add a new Head of Department"
                  >
                    <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
                    Add HOD
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full border-purple-400 text-purple-300 hover:bg-purple-600/20 font-semibold py-3"
                    onClick={() => toast('Assign departments functionality - Coming soon')}
                    aria-label="Assign departments to HODs"
                  >
                    <Users className="h-4 w-4 mr-2" aria-hidden="true" />
                    Assign Departments
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card variant="glass" className="hover:scale-105 transition-all duration-300">
            <CardHeader className="backdrop-blur-md bg-orange-600/60 border-b border-orange-400/50 text-white rounded-t-3xl">
              <CardTitle className="flex items-center text-white">
                <UserPlus className="h-6 w-6 mr-3" aria-hidden="true" />
                Register Headteachers
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                <p className="text-slate-300 text-sm">Add new headteachers to the system</p>
                <div className="space-y-3">
                  <Button
                    className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold py-3"
                    onClick={() => handleCreateUser('headteacher')}
                    aria-label="Add a new headteacher"
                  >
                    <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
                    Add Headteacher
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full border-orange-400 text-orange-300 hover:bg-orange-600/20 font-semibold py-3"
                    onClick={() => toast('Assign permissions functionality - Coming soon')}
                    aria-label="Assign permissions to headteachers"
                  >
                    <Settings className="h-4 w-4 mr-2" aria-hidden="true" />
                    Assign Permissions
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* User List */}
        <section aria-label="User list and search" className="space-y-4">
          <Card variant="glass">
            <CardHeader>
              <CardTitle className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                {activeUserType === 'all'
                  ? 'All Users'
                  : userTypes.find((t) => t.id === activeUserType)?.name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="backdrop-blur-sm bg-slate-800/60 border border-slate-600/40 rounded-2xl p-6">
                {/* Search and Filter */}
                <div className="flex flex-col md:flex-row gap-4 mb-6">
                  <div className="flex-1">
                    <div className="relative">
                      <Search
                        className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4"
                        aria-hidden="true"
                      />
                      <input
                        type="text"
                        placeholder="Search users..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-slate-700/60 border border-slate-500/40 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50"
                        aria-label="Search users by name or email"
                      />
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    className="border-slate-400 text-slate-300 hover:bg-slate-600/20"
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
                      <tr className="border-b border-slate-600/50">
                        <th className="text-left py-4 text-slate-200 font-bold">Name</th>
                        <th className="text-left py-4 text-slate-200 font-bold">Email</th>
                        <th className="text-left py-4 text-slate-200 font-bold">Role</th>
                        <th className="text-left py-4 text-slate-200 font-bold">Status</th>
                        <th className="text-left py-4 text-slate-200 font-bold">Actions</th>
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
                              <p className="text-slate-400">Fetching users...</p>
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
                              <p className="text-red-400">Failed to load users.</p>
                              <Button
                                onClick={fetchUsers}
                                variant="outline"
                                className="border-red-400 text-red-300 hover:bg-red-600/20"
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
                              <Users className="h-12 w-12 text-slate-500 mb-2" aria-hidden="true" />
                              <p className="text-slate-400">No users found.</p>
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
                              className="border-b border-slate-700/50 hover:bg-slate-700/40 transition-colors duration-200"
                            >
                              <td className="py-4 text-white font-medium">{user.name}</td>
                              <td className="py-4 text-slate-300">{user.email}</td>
                              <td className="py-4">
                                <span className="px-3 py-1 text-xs rounded-full backdrop-blur-md bg-blue-600/60 text-blue-100 border border-blue-400/50 capitalize font-medium">
                                  {user.role}
                                </span>
                              </td>
                              <td className="py-4">
                                <span className="px-3 py-1 text-xs rounded-full backdrop-blur-md bg-green-600/60 text-green-100 border border-green-400/50 font-medium">
                                  {user.status}
                                </span>
                              </td>
                              <td className="py-4">
                                <div className="flex space-x-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="border-blue-400 text-blue-300 hover:bg-blue-600/20"
                                    onClick={() => handleViewUser(user.id)}
                                    aria-label={`View details for ${user.name}`}
                                  >
                                    <Eye className="h-3 w-3" aria-hidden="true" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="border-yellow-400 text-yellow-300 hover:bg-yellow-600/20"
                                    onClick={() => handleEditUser(user)}
                                    aria-label={`Edit ${user.name}`}
                                  >
                                    <Edit className="h-3 w-3" aria-hidden="true" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="border-red-400 text-red-300 hover:bg-red-600/20"
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

      {viewingUser && <UserDetailsModal user={viewingUser} onClose={() => setViewingUser(null)} />}
    </div>
  )
}

function UserDetailsModal({ user, onClose }) {
  const data = user.original || user

  const getSubjectName = (id) => {
    const numId = Number(id)
    const sub = SCHOOL_SUBJECTS.find((s) => s.id === numId)
    return sub ? sub.name : id
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-slate-700">
        <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">User Details</h3>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Header Info */}
          <div className="flex items-center space-x-4">
            <div className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-2xl font-bold">
              {data.name?.charAt(0) || data.user?.name?.charAt(0) || 'U'}
            </div>
            <div>
              <h4 className="text-xl font-bold text-slate-900 dark:text-white">
                {data.name || data.user?.name}
              </h4>
              <span className="px-3 py-1 text-xs rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200 border border-blue-200 dark:border-blue-500/30 capitalize font-medium">
                {data.role}
              </span>
            </div>
          </div>

          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Email</p>
              <p className="text-slate-900 dark:text-white font-medium break-all">
                {data.email || data.user?.email}
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Contact</p>
              <p className="text-slate-900 dark:text-white font-medium">
                {data.contact_number || data.user?.contact_number || 'N/A'}
              </p>
            </div>
          </div>

          {/* Teacher Specific */}
          {data.role === 'teacher' && (
            <>
              <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
                <h4 className="text-lg font-semibold text-blue-600 dark:text-blue-400 mb-3">
                  Professional Info
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Department</p>
                    <p className="text-slate-900 dark:text-white">{data.department || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">TS Number</p>
                    <p className="text-slate-900 dark:text-white">{data.ts_number || 'N/A'}</p>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">Assigned Classes</p>
                <div className="flex flex-wrap gap-2">
                  {data.classes && data.classes.length > 0 ? (
                    data.classes.map((cls) => (
                      <span
                        key={cls.id}
                        className="px-2 py-1 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-200 rounded text-xs border border-blue-100 dark:border-blue-500/20"
                      >
                        {cls.name}
                      </span>
                    ))
                  ) : (
                    <p className="text-slate-500 italic">No classes assigned</p>
                  )}
                </div>
              </div>

              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">Assigned Subjects</p>
                <div className="flex flex-wrap gap-2">
                  {data.assignedSubjects && data.assignedSubjects.length > 0 ? (
                    data.assignedSubjects.map((sub, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-1 bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-200 rounded text-xs border border-purple-100 dark:border-purple-500/20"
                      >
                        {getSubjectName(sub)}
                      </span>
                    ))
                  ) : (
                    <p className="text-slate-500 italic">No subjects assigned</p>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Student Specific */}
          {data.role === 'student' && (
            <>
              <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
                <h4 className="text-lg font-semibold text-green-600 dark:text-green-400 mb-3">
                  Academic Info
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Class</p>
                    <p className="text-slate-900 dark:text-white">{data.class || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Exam Number</p>
                    <p className="text-slate-900 dark:text-white">{data.exam_number || 'N/A'}</p>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">Enrolled Subjects</p>
                <div className="flex flex-wrap gap-2">
                  {data.selected_subjects && data.selected_subjects.length > 0 ? (
                    data.selected_subjects.map((sub, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-1 bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-200 rounded text-xs border border-green-100 dark:border-green-500/20"
                      >
                        {getSubjectName(sub)}
                      </span>
                    ))
                  ) : (
                    <p className="text-slate-500 italic">No subjects enrolled</p>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex justify-end">
          <Button
            onClick={onClose}
            className="bg-slate-200 text-slate-800 hover:bg-slate-300 dark:bg-slate-700 dark:text-white dark:hover:bg-slate-600"
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  )
}
