'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import {
  UserPlus, Users, GraduationCap, User, Settings,
  Plus, Edit, Trash2, Search, Filter, Eye
} from 'lucide-react'
// Registration modals removed - using centralized registration system

export default function UserManagement() {
  const [activeUserType, setActiveUserType] = useState('all')

  const userTypes = [
    { id: 'all', name: 'All Users', icon: Users, count: 0 },
    { id: 'students', name: 'Students', icon: User, count: 0 },
    { id: 'teachers', name: 'Teachers', icon: GraduationCap, count: 0 },
    { id: 'hods', name: 'HODs', icon: Settings, count: 0 },
    { id: 'headteachers', name: 'Headteachers', icon: UserPlus, count: 0 }
  ]

  const handleCreateUser = (type) => {
    // Redirect to centralized registration system
    window.location.href = '/admin/registration'
  }

  const handleSaveUser = (userData, userType) => {
    console.log(`Saving ${userType}:`, userData)
    // Here you would typically send the data to your API
    // For now, we'll just log it and show a success message
  }

  const handleEditUser = (userId) => {
    alert(`Edit user ${userId} functionality would be implemented here`)
  }

  const handleDeleteUser = (userId) => {
    alert(`Delete user ${userId} functionality would be implemented here`)
  }

  const handleViewUser = (userId) => {
    alert(`View user ${userId} details functionality would be implemented here`)
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="backdrop-blur-lg bg-slate-800/60 border border-blue-500/40 rounded-3xl p-8 text-center shadow-2xl">
        <h2 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent mb-4">
          User Management
        </h2>
        <p className="text-slate-300 text-lg">Register, manage, and oversee all system users</p>
      </div>

      {/* User Type Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
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
            >
              <CardContent className="p-6 text-center">
                <div className={`backdrop-blur-md rounded-2xl p-4 mb-4 ${
                  isActive 
                    ? 'bg-blue-600/60 border border-blue-400/50' 
                    : 'bg-slate-700/60 border border-slate-500/40'
                }`}>
                  <Icon className="h-8 w-8 text-white mx-auto" />
                </div>
                <h3 className="font-bold text-white text-lg mb-2">{type.name}</h3>
                <p className="text-3xl font-bold text-blue-400">{type.count}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Management Actions */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card variant="glass" className="hover:scale-105 transition-all duration-300">
          <CardHeader className="backdrop-blur-md bg-green-600/60 border-b border-green-400/50 text-white rounded-t-3xl">
            <CardTitle className="flex items-center text-white">
              <UserPlus className="h-6 w-6 mr-3" />
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
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Student
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full border-green-400 text-green-300 hover:bg-green-600/20 font-semibold py-3"
                  onClick={() => alert('Bulk import functionality would be implemented here')}
                >
                  <Users className="h-4 w-4 mr-2" />
                  Bulk Import
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card variant="glass" className="hover:scale-105 transition-all duration-300">
          <CardHeader className="backdrop-blur-md bg-blue-600/60 border-b border-blue-400/50 text-white rounded-t-3xl">
            <CardTitle className="flex items-center text-white">
              <GraduationCap className="h-6 w-6 mr-3" />
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
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Teacher
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full border-blue-400 text-blue-300 hover:bg-blue-600/20 font-semibold py-3"
                  onClick={() => alert('Assign subjects functionality would be implemented here')}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Assign Subjects
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card variant="glass" className="hover:scale-105 transition-all duration-300">
          <CardHeader className="backdrop-blur-md bg-purple-600/60 border-b border-purple-400/50 text-white rounded-t-3xl">
            <CardTitle className="flex items-center text-white">
              <Settings className="h-6 w-6 mr-3" />
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
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add HOD
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full border-purple-400 text-purple-300 hover:bg-purple-600/20 font-semibold py-3"
                  onClick={() => alert('Assign departments functionality would be implemented here')}
                >
                  <Users className="h-4 w-4 mr-2" />
                  Assign Departments
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card variant="glass" className="hover:scale-105 transition-all duration-300">
          <CardHeader className="backdrop-blur-md bg-orange-600/60 border-b border-orange-400/50 text-white rounded-t-3xl">
            <CardTitle className="flex items-center text-white">
              <UserPlus className="h-6 w-6 mr-3" />
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
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Headteacher
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full border-orange-400 text-orange-300 hover:bg-orange-600/20 font-semibold py-3"
                  onClick={() => alert('Assign permissions functionality would be implemented here')}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Assign Permissions
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* User List */}
      <Card variant="glass">
        <CardHeader>
          <CardTitle className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            {activeUserType === 'all' ? 'All Users' : userTypes.find(t => t.id === activeUserType)?.name}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="backdrop-blur-sm bg-slate-800/60 border border-slate-600/40 rounded-2xl p-6">
            {/* Search and Filter */}
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                  <input
                    type="text"
                    placeholder="Search users..."
                    className="w-full pl-10 pr-4 py-3 bg-slate-700/60 border border-slate-500/40 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
              <Button variant="outline" className="border-slate-400 text-slate-300 hover:bg-slate-600/20">
                <Filter className="h-4 w-4 mr-2" />
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
                  {/* TODO: Load users from database */}
                  {[].map((user) => (
                    <tr key={user.id} className="border-b border-slate-700/50 hover:bg-slate-700/40 transition-colors duration-200">
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
                          >
                            <Eye className="h-3 w-3" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="border-yellow-400 text-yellow-300 hover:bg-yellow-600/20"
                            onClick={() => handleEditUser(user.id)}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="border-red-400 text-red-300 hover:bg-red-600/20"
                            onClick={() => handleDeleteUser(user.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Empty State */}
              <div className="text-center py-12">
                <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-medium text-white mb-2">No Users Found</h3>
                <p className="text-slate-300 mb-6">
                  No users have been registered yet. Users can be registered through the admin registration system.
                </p>
                <Button variant="outline" className="border-blue-400 text-blue-300 hover:bg-blue-600/20">
                  <Plus className="h-4 w-4 mr-2" />
                  Register New User
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Registration handled by centralized system at /admin/registration */}
    </div>
  )
}
