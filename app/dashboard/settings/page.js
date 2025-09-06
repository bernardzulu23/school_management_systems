'use client'

import { useState } from 'react'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { 
  Settings, School, Users, Bell, Shield, Database, 
  Globe, Mail, Calendar, Clock, Save, RefreshCw 
} from 'lucide-react'

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('school')
  const [settings, setSettings] = useState({
    school_name: 'Springfield High School',
    school_address: '123 Education Street, Springfield',
    school_phone: '+1-555-0123',
    school_email: 'admin@springfield.edu',
    academic_year: '2024-2025',
    term_start: '2024-09-01',
    term_end: '2024-12-15',
    timezone: 'America/New_York',
    language: 'English',
    currency: 'USD',
    notifications_email: true,
    notifications_sms: false,
    auto_backup: true,
    backup_frequency: 'daily',
    max_class_size: 30,
    attendance_required: true,
  })

  const tabs = [
    { id: 'school', name: 'School Information', icon: School },
    { id: 'academic', name: 'Academic Settings', icon: Calendar },
    { id: 'users', name: 'User Management', icon: Users },
    { id: 'notifications', name: 'Notifications', icon: Bell },
    { id: 'security', name: 'Security', icon: Shield },
    { id: 'system', name: 'System', icon: Database },
  ]

  const handleSettingChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  const handleSave = () => {
    // Here you would save the settings
    console.log('Saving settings:', settings)
    alert('Settings saved successfully!')
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'school':
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">School Name</label>
                    <input
                      type="text"
                      value={settings.school_name}
                      onChange={(e) => handleSettingChange('school_name', e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                    <input
                      type="text"
                      value={settings.school_phone}
                      onChange={(e) => handleSettingChange('school_phone', e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                  <textarea
                    value={settings.school_address}
                    onChange={(e) => handleSettingChange('school_address', e.target.value)}
                    rows={3}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                  <input
                    type="email"
                    value={settings.school_email}
                    onChange={(e) => handleSettingChange('school_email', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        )

      case 'academic':
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Academic Year Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Academic Year</label>
                    <input
                      type="text"
                      value={settings.academic_year}
                      onChange={(e) => handleSettingChange('academic_year', e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Term Start Date</label>
                    <input
                      type="date"
                      value={settings.term_start}
                      onChange={(e) => handleSettingChange('term_start', e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Term End Date</label>
                    <input
                      type="date"
                      value={settings.term_end}
                      onChange={(e) => handleSettingChange('term_end', e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Maximum Class Size</label>
                    <input
                      type="number"
                      value={settings.max_class_size}
                      onChange={(e) => handleSettingChange('max_class_size', parseInt(e.target.value))}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Attendance Required</label>
                    <select
                      value={settings.attendance_required ? 'true' : 'false'}
                      onChange={(e) => handleSettingChange('attendance_required', e.target.value === 'true')}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="true">Yes</option>
                      <option value="false">No</option>
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )

      case 'notifications':
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Email Notifications</h4>
                    <p className="text-sm text-gray-500">Receive notifications via email</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.notifications_email}
                      onChange={(e) => handleSettingChange('notifications_email', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">SMS Notifications</h4>
                    <p className="text-sm text-gray-500">Receive notifications via SMS</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.notifications_sms}
                      onChange={(e) => handleSettingChange('notifications_sms', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </CardContent>
            </Card>
          </div>
        )

      case 'system':
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>System Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Timezone</label>
                    <select
                      value={settings.timezone}
                      onChange={(e) => handleSettingChange('timezone', e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="America/New_York">Eastern Time</option>
                      <option value="America/Chicago">Central Time</option>
                      <option value="America/Denver">Mountain Time</option>
                      <option value="America/Los_Angeles">Pacific Time</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Language</label>
                    <select
                      value={settings.language}
                      onChange={(e) => handleSettingChange('language', e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="English">English</option>
                      <option value="Spanish">Spanish</option>
                      <option value="French">French</option>
                    </select>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Automatic Backup</h4>
                    <p className="text-sm text-gray-500">Enable automatic system backups</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.auto_backup}
                      onChange={(e) => handleSettingChange('auto_backup', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </CardContent>
            </Card>
          </div>
        )

      default:
        return <div>Select a tab to view settings</div>
    }
  }

  return (
    <DashboardLayout title="Settings">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">System Settings</h1>
            <p className="text-gray-600">Configure your school management system</p>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Reset
            </Button>
            <Button onClick={handleSave}>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Settings Navigation */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <nav className="space-y-2">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center px-3 py-2 text-left rounded-md transition-colors ${
                      activeTab === tab.id
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <tab.icon className="h-4 w-4 mr-3" />
                    {tab.name}
                  </button>
                ))}
              </nav>
            </CardContent>
          </Card>

          {/* Settings Content */}
          <div className="lg:col-span-3">
            {renderTabContent()}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
