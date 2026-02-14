'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/auth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import {
  Users,
  Search,
  Filter,
  UserPlus,
  Edit,
  Trash2,
  Eye,
  Mail,
  Phone,
  Calendar,
  GraduationCap,
  BookOpen,
  UserCheck,
  MoreVertical
} from 'lucide-react'

export default function UsersPage() {
  const { user } = useAuth()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedRole, setSelectedRole] = useState('all')
  const [selectedStatus, setSelectedStatus] = useState('all')

  // TODO: Replace with actual API call to load users
  // User data should come from database with proper role-based access control
  const users = []

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesRole = selectedRole === 'all' || user.role === selectedRole
    const matchesStatus = selectedStatus === 'all' || user.status === selectedStatus
    
    return matchesSearch && matchesRole && matchesStatus
  })

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'headteacher': return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'hod': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'teacher': return 'bg-green-100 text-green-800 border-green-200'
      case 'student': return 'bg-orange-100 text-orange-800 border-orange-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200'
      case 'inactive': return 'bg-red-100 text-red-800 border-red-200'
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  // Simple Badge component
  const Badge = ({ children, className = '' }) => (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${className}`}>
      {children}
    </span>
  )

  const userStats = {
    total: users.length,
    teachers: users.filter(u => u.role === 'teacher').length,
    hods: users.filter(u => u.role === 'hod').length,
    students: users.filter(u => u.role === 'student').length,
    active: users.filter(u => u.status === 'active').length
  }

  return (
    <DashboardLayout title="User Management">
      <main className="space-y-6">
        {/* Header */}
        <header className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
            <p className="text-gray-600 mt-1">Manage all system users and their permissions</p>
          </div>
          <Button 
            className="bg-blue-600 hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 outline-none"
            aria-label="Add New User"
          >
            <UserPlus className="h-4 w-4 mr-2" aria-hidden="true" />
            Add New User
          </Button>
        </header>

        {/* Stats Cards */}
        <section className="grid grid-cols-1 md:grid-cols-5 gap-4" aria-label="User Statistics">
          <Card className="focus-within:ring-2 focus-within:ring-blue-500 transition-shadow">
            <CardContent className="p-4 text-center">
              <Users className="h-8 w-8 text-blue-600 mx-auto mb-2" aria-hidden="true" />
              <p className="text-2xl font-bold text-gray-900">{userStats.total}</p>
              <p className="text-sm text-gray-600">Total Users</p>
            </CardContent>
          </Card>
          <Card className="focus-within:ring-2 focus-within:ring-blue-500 transition-shadow">
            <CardContent className="p-4 text-center">
              <BookOpen className="h-8 w-8 text-green-600 mx-auto mb-2" aria-hidden="true" />
              <p className="text-2xl font-bold text-gray-900">{userStats.teachers}</p>
              <p className="text-sm text-gray-600">Teachers</p>
            </CardContent>
          </Card>
          <Card className="focus-within:ring-2 focus-within:ring-blue-500 transition-shadow">
            <CardContent className="p-4 text-center">
              <UserCheck className="h-8 w-8 text-blue-600 mx-auto mb-2" aria-hidden="true" />
              <p className="text-2xl font-bold text-gray-900">{userStats.hods}</p>
              <p className="text-sm text-gray-600">HODs</p>
            </CardContent>
          </Card>
          <Card className="focus-within:ring-2 focus-within:ring-blue-500 transition-shadow">
            <CardContent className="p-4 text-center">
              <GraduationCap className="h-8 w-8 text-orange-600 mx-auto mb-2" aria-hidden="true" />
              <p className="text-2xl font-bold text-gray-900">{userStats.students}</p>
              <p className="text-sm text-gray-600">Students</p>
            </CardContent>
          </Card>
          <Card className="focus-within:ring-2 focus-within:ring-blue-500 transition-shadow">
            <CardContent className="p-4 text-center">
              <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2" aria-hidden="true">
                <div className="h-3 w-3 bg-green-600 rounded-full"></div>
              </div>
              <p className="text-2xl font-bold text-gray-900">{userStats.active}</p>
              <p className="text-sm text-gray-600">Active Users</p>
            </CardContent>
          </Card>
        </section>

        {/* Filters */}
        <section aria-label="Search and Filters">
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" aria-hidden="true" />
                    <input
                      type="text"
                      placeholder="Search users by name or email..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      aria-label="Search users by name or email"
                      className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <select
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value)}
                    aria-label="Filter by role"
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="all">All Roles</option>
                    <option value="headteacher">Headteacher</option>
                    <option value="hod">HOD</option>
                    <option value="teacher">Teacher</option>
                    <option value="student">Student</option>
                  </select>
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    aria-label="Filter by status"
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="pending">Pending</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Users List */}
        <section aria-labelledby="users-list-title">
          <Card>
            <CardHeader>
              <CardTitle id="users-list-title">Users ({filteredUsers.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4" role="list">
                {filteredUsers.length === 0 ? (
                  <p className="text-center py-8 text-gray-500" role="status">No users found matching your criteria.</p>
                ) : (
                  filteredUsers.map((userData) => (
                    <article 
                      key={userData.id} 
                      className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors focus-within:ring-2 focus-within:ring-blue-500 outline-none"
                      role="listitem"
                      tabIndex="0"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div 
                            className="h-12 w-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center"
                            aria-hidden="true"
                          >
                            <span className="text-white font-semibold text-lg">
                              {userData.name.split(' ').map(n => n[0]).join('')}
                            </span>
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">{userData.name}</h3>
                            <div className="flex items-center space-x-2 text-sm text-gray-600">
                              <Mail className="h-4 w-4" aria-hidden="true" />
                              <span className="sr-only">Email: </span>
                              <span>{userData.email}</span>
                            </div>
                            {userData.phone && (
                              <div className="flex items-center space-x-2 text-sm text-gray-600">
                                <Phone className="h-4 w-4" aria-hidden="true" />
                                <span className="sr-only">Phone: </span>
                                <span>{userData.phone}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <div className="text-right">
                            <div className="flex space-x-2 mb-2 justify-end">
                              <Badge className={getRoleBadgeColor(userData.role)}>
                                {userData.role.charAt(0).toUpperCase() + userData.role.slice(1)}
                              </Badge>
                              <Badge className={getStatusBadgeColor(userData.status)}>
                                {userData.status.charAt(0).toUpperCase() + userData.status.slice(1)}
                              </Badge>
                            </div>
                            <div className="flex items-center text-sm text-gray-600 justify-end">
                              <Calendar className="h-4 w-4 mr-1" aria-hidden="true" />
                              <span>Joined {new Date(userData.joinDate).toLocaleDateString()}</span>
                            </div>
                          </div>
                          <div className="flex space-x-1">
                            <Button variant="outline" size="sm" aria-label={`View details for ${userData.name}`}>
                              <Eye className="h-4 w-4" aria-hidden="true" />
                            </Button>
                            <Button variant="outline" size="sm" aria-label={`Edit ${userData.name}`}>
                              <Edit className="h-4 w-4" aria-hidden="true" />
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="text-red-600 hover:text-red-700 focus:ring-red-500"
                              aria-label={`Delete ${userData.name}`}
                            >
                              <Trash2 className="h-4 w-4" aria-hidden="true" />
                            </Button>
                          </div>
                        </div>
                      </div>
                      
                      {/* Additional Info */}
                      {userData.role !== 'student' && userData.subjects && (
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <div className="flex items-center space-x-2 text-sm">
                            <BookOpen className="h-4 w-4 text-gray-400" aria-hidden="true" />
                            <span className="text-gray-600">Subjects:</span>
                            <div className="flex space-x-1" aria-label="Subjects taught">
                              {userData.subjects.map((subject, index) => (
                                <Badge key={index} className="bg-gray-100 text-gray-800 border-gray-200 text-xs">
                                  {subject}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {userData.role === 'student' && userData.class && (
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <div className="flex items-center space-x-2 text-sm">
                            <GraduationCap className="h-4 w-4 text-gray-400" aria-hidden="true" />
                            <span className="text-gray-600">Class:</span>
                            <Badge className="bg-gray-100 text-gray-800 border-gray-200 text-xs">{userData.class}</Badge>
                            <span className="text-gray-600 ml-2">ID:</span>
                            <span className="font-mono text-xs">{userData.studentId}</span>
                          </div>
                        </div>
                      )}
                    </article>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </section>
      </main>
    </DashboardLayout>
  )
}
