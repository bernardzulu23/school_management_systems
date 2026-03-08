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
} from 'lucide-react'
import { api } from '@/lib/api'
import toast from 'react-hot-toast'
import LoadingSpinner from '@/components/LoadingSpinner'

export default function UserManagement() {
  const [activeUserType, setActiveUserType] = useState('all')
  const [users, setUsers] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [hasError, setHasError] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

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
    toast(`View user ${userId} details functionality - Coming soon`)
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
    </div>
  )
}
