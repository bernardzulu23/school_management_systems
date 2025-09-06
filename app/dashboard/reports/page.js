'use client'

import { useState } from 'react'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { 
  FileText, Download, Calendar, Users, BookOpen, TrendingUp, 
  BarChart3, PieChart, Filter, Search, Eye, Share2 
} from 'lucide-react'

export default function ReportsPage() {
  const [selectedPeriod, setSelectedPeriod] = useState('current-term')
  const [selectedType, setSelectedType] = useState('')

  const reportCategories = [
    {
      title: 'Academic Reports',
      icon: BookOpen,
      color: 'blue',
      reports: [
        { name: 'Student Performance Report', description: 'Comprehensive academic performance analysis', type: 'academic' },
        { name: 'Class Progress Report', description: 'Class-wise progress tracking', type: 'academic' },
        { name: 'Subject Analysis Report', description: 'Subject performance breakdown', type: 'academic' },
        { name: 'Assessment Results Report', description: 'Detailed assessment outcomes', type: 'academic' }
      ]
    },
    {
      title: 'Administrative Reports',
      icon: Users,
      color: 'green',
      reports: [
        { name: 'Attendance Report', description: 'Student and teacher attendance tracking', type: 'administrative' },
        { name: 'Enrollment Report', description: 'Student enrollment statistics', type: 'administrative' },
        { name: 'Staff Report', description: 'Teacher and staff information', type: 'administrative' },
        { name: 'Resource Utilization Report', description: 'Classroom and resource usage', type: 'administrative' }
      ]
    },
    {
      title: 'Financial Reports',
      icon: TrendingUp,
      color: 'purple',
      reports: [
        { name: 'Fee Collection Report', description: 'Student fee payment tracking', type: 'financial' },
        { name: 'Budget Analysis Report', description: 'School budget breakdown', type: 'financial' },
        { name: 'Expense Report', description: 'Operational expenses tracking', type: 'financial' },
        { name: 'Revenue Report', description: 'Income and revenue analysis', type: 'financial' }
      ]
    },
    {
      title: 'Analytics Reports',
      icon: BarChart3,
      color: 'orange',
      reports: [
        { name: 'Performance Trends Report', description: 'Long-term performance analysis', type: 'analytics' },
        { name: 'Comparative Analysis Report', description: 'Cross-class and subject comparison', type: 'analytics' },
        { name: 'Predictive Analytics Report', description: 'Future performance predictions', type: 'analytics' },
        { name: 'Custom Dashboard Report', description: 'Personalized analytics dashboard', type: 'analytics' }
      ]
    }
  ]

  const recentReports = [
    { name: 'Monthly Performance Report', generated: '2024-02-15', type: 'Academic', status: 'Ready' },
    { name: 'Attendance Summary', generated: '2024-02-14', type: 'Administrative', status: 'Ready' },
    { name: 'Fee Collection Report', generated: '2024-02-13', type: 'Financial', status: 'Processing' },
    { name: 'Class Progress Analysis', generated: '2024-02-12', type: 'Academic', status: 'Ready' },
  ]

  const getColorClasses = (color) => {
    const colors = {
      blue: 'bg-blue-600 text-white',
      green: 'bg-green-600 text-white',
      purple: 'bg-purple-600 text-white',
      orange: 'bg-orange-600 text-white'
    }
    return colors[color] || 'bg-gray-600 text-white'
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'Ready': return 'bg-green-100 text-green-800'
      case 'Processing': return 'bg-yellow-100 text-yellow-800'
      case 'Failed': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <DashboardLayout title="Reports & Analytics">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
            <p className="text-gray-600">Generate comprehensive reports and analytics</p>
          </div>
          <Button>
            <FileText className="h-4 w-4 mr-2" />
            Custom Report
          </Button>
        </div>

        {/* Report Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Report Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Time Period</label>
                <select
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="current-term">Current Term</option>
                  <option value="last-term">Last Term</option>
                  <option value="current-year">Current Academic Year</option>
                  <option value="last-year">Last Academic Year</option>
                  <option value="custom">Custom Range</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Report Type</label>
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Types</option>
                  <option value="academic">Academic</option>
                  <option value="administrative">Administrative</option>
                  <option value="financial">Financial</option>
                  <option value="analytics">Analytics</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Format</label>
                <select className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500">
                  <option value="pdf">PDF</option>
                  <option value="excel">Excel</option>
                  <option value="csv">CSV</option>
                  <option value="html">HTML</option>
                </select>
              </div>
              
              <div className="flex items-end">
                <Button className="w-full">
                  <Filter className="h-4 w-4 mr-2" />
                  Apply Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Report Categories */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {reportCategories.map((category) => (
            <Card key={category.title} className="hover:shadow-lg transition-shadow">
              <CardHeader className={getColorClasses(category.color)}>
                <CardTitle className="flex items-center">
                  <category.icon className="h-5 w-5 mr-2" />
                  {category.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-3">
                  {category.reports.map((report) => (
                    <div key={report.name} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                      <div>
                        <h4 className="font-medium">{report.name}</h4>
                        <p className="text-sm text-gray-500">{report.description}</p>
                      </div>
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm">
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Recent Reports */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Reports</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">Report Name</th>
                    <th className="text-left py-3 px-4">Type</th>
                    <th className="text-left py-3 px-4">Generated</th>
                    <th className="text-left py-3 px-4">Status</th>
                    <th className="text-left py-3 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {recentReports.map((report, index) => (
                    <tr key={index} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium">{report.name}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                          {report.type}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-500">
                        {new Date(report.generated).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(report.status)}`}>
                          {report.status}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex space-x-2">
                          <Button variant="outline" size="sm">
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm">
                            <Share2 className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Quick Report Generation */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Report Generation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Button className="h-20 flex flex-col">
                <BarChart3 className="h-6 w-6 mb-2" />
                Performance Report
              </Button>
              <Button className="h-20 flex flex-col">
                <Users className="h-6 w-6 mb-2" />
                Attendance Report
              </Button>
              <Button className="h-20 flex flex-col">
                <TrendingUp className="h-6 w-6 mb-2" />
                Financial Report
              </Button>
              <Button className="h-20 flex flex-col">
                <PieChart className="h-6 w-6 mb-2" />
                Analytics Report
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
