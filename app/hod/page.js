'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  FileText,
  Users,
  TrendingUp,
  Calendar,
  Book,
  CheckCircle,
  BarChart3,
  DollarSign,
  Package,
  Settings,
  GraduationCap,
  ClipboardCheck,
  Monitor,
  Clock,
  Building
} from 'lucide-react'

export default function HODDashboard() {
  const router = useRouter()
  const [stats, setStats] = useState({
    totalTeachers: 0,
    totalStudents: 0,
    totalClasses: 0,
    pendingTasks: 0
  })

  useEffect(() => {
    // Fetch HOD dashboard statistics from API
    fetchDashboardStats()
  }, [])

  const fetchDashboardStats = async () => {
    try {
      // TODO: Replace with actual API calls
      // const response = await api.getHODStats()
      // setStats(response.data)

      // For now, keep stats at 0 until API is implemented
      setStats({
        totalTeachers: 0,
        totalStudents: 0,
        totalClasses: 0,
        pendingTasks: 0
      })
    } catch (error) {
      console.error('Error fetching HOD stats:', error)
    }
  }

  // HOD Administrative Duties Configuration
  const hodDuties = {
    fileManagement: [
      {
        title: 'Correspondence File',
        description: 'Manage incoming/outgoing communications',
        icon: FileText,
        route: '/dashboard/hod',
        color: 'blue'
      },
      {
        title: 'Meeting Files',
        description: 'Department and staff meeting records',
        icon: Users,
        route: '/dashboard/hod',
        color: 'blue'
      },
      {
        title: 'Exam Analysis',
        description: 'Assessment performance analysis',
        icon: TrendingUp,
        route: '/dashboard/hod',
        color: 'blue'
      },
      {
        title: 'Monitoring File',
        description: 'Department oversight and tracking',
        icon: BarChart3,
        route: '/dashboard/hod',
        color: 'blue'
      },
      {
        title: 'Department Minutes',
        description: 'Meeting minutes and decisions',
        icon: FileText,
        route: '/dashboard/hod',
        color: 'blue'
      },
      {
        title: 'Staff Meeting File',
        description: 'Staff meeting documentation',
        icon: Users,
        route: '/dashboard/hod',
        color: 'blue'
      }
    ],
    academicManagement: [
      {
        title: 'CPD File',
        description: 'Continuous Professional Development records',
        icon: GraduationCap,
        route: '/dashboard/hod',
        color: 'green'
      },
      {
        title: 'Syllabus File',
        description: 'Curriculum and syllabus management',
        icon: Book,
        route: '/dashboard/hod',
        color: 'green'
      },
      {
        title: 'Assessment Results',
        description: 'Student assessment and results for learners',
        icon: ClipboardCheck,
        route: '/dashboard/hod',
        color: 'green'
      },
      {
        title: 'Computer SBA File',
        description: 'School-Based Assessment for computer subjects',
        icon: Monitor,
        route: '/dashboard/hod',
        color: 'green'
      },
      {
        title: 'Timetable & Class Allocation',
        description: 'Schedule and class management',
        icon: Calendar,
        route: '/dashboard/hod',
        color: 'green'
      },
      {
        title: 'Homework Checks',
        description: 'Daily homework monitoring',
        icon: CheckCircle,
        route: '/dashboard/hod',
        color: 'green'
      }
    ],
    dailyOperations: [
      {
        title: 'Daily Routine',
        description: 'Day-to-day operational tasks',
        icon: Clock,
        route: '/dashboard/hod',
        color: 'purple'
      },
      {
        title: 'Administration',
        description: 'General administrative duties',
        icon: Settings,
        route: '/dashboard/hod',
        color: 'purple'
      }
    ],
    financialManagement: [
      {
        title: 'Budget File',
        description: 'Department budget management',
        icon: DollarSign,
        route: '/dashboard/hod',
        color: 'orange'
      },
      {
        title: 'Stock Book',
        description: 'Inventory and stock management',
        icon: Package,
        route: '/dashboard/hod',
        color: 'orange'
      }
    ]
  }

  const handleNavigate = (route) => {
    router.push(route)
  }

  const renderDutySection = (title, duties, sectionColor) => (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <h3 className="text-xl font-semibold mb-4 text-gray-800">
        {title}
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {duties.map((duty, index) => {
          const IconComponent = duty.icon
          return (
            <div
              key={index}
              className="bg-gray-50 rounded-lg p-4 cursor-pointer hover:shadow-md transition-all duration-300 hover:-translate-y-1"
              onClick={() => handleNavigate(duty.route)}
            >
              <div className="flex items-center mb-2">
                <IconComponent
                  className={`w-6 h-6 mr-3 text-${duty.color}-600`}
                />
                <h4 className="font-semibold text-gray-800">
                  {duty.title}
                </h4>
              </div>
              <p className="text-sm text-gray-600">
                {duty.description}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          HOD Dashboard
        </h1>
        <p className="text-gray-600">
          Welcome back, Head of Department
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <p className="text-gray-600 text-sm mb-2">Total Teachers</p>
          <p className="text-3xl font-bold text-blue-600">{stats.totalTeachers}</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <p className="text-gray-600 text-sm mb-2">Total Students</p>
          <p className="text-3xl font-bold text-green-600">{stats.totalStudents}</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <p className="text-gray-600 text-sm mb-2">Total Classes</p>
          <p className="text-3xl font-bold text-purple-600">{stats.totalClasses}</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <p className="text-gray-600 text-sm mb-2">Pending Tasks</p>
          <p className="text-3xl font-bold text-orange-600">{stats.pendingTasks}</p>
        </div>
      </div>

      {/* HOD Administrative Duties */}
      <h2 className="text-2xl font-bold text-gray-900 mb-6">
        HOD Administrative Duties
      </h2>

      {/* File Management Section */}
      {renderDutySection(
        '📁 File Management',
        hodDuties.fileManagement,
        'blue'
      )}

      {/* Academic Management Section */}
      {renderDutySection(
        '🎓 Academic Management',
        hodDuties.academicManagement,
        'green'
      )}

      {/* Daily Operations Section */}
      {renderDutySection(
        '⏰ Daily Operations',
        hodDuties.dailyOperations,
        'purple'
      )}

      {/* Financial Management Section */}
      {renderDutySection(
        '💰 Financial Management',
        hodDuties.financialManagement,
        'orange'
      )}
    </div>
  )
}
