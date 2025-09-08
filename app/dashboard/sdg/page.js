'use client'

import { useState } from 'react'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import SDGDashboard from '@/components/sdg/SDGDashboard'
import SDG1PovertyModule from '@/components/sdg/SDG1PovertyModule'
import SDG2HungerModule from '@/components/sdg/SDG2HungerModule'
import SDG3HealthModule from '@/components/sdg/SDG3HealthModule'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { 
  Globe, Target, TrendingUp, Users, 
  ArrowLeft, BarChart3, FileText, Settings 
} from 'lucide-react'

export default function SDGPage() {
  const [activeView, setActiveView] = useState('dashboard')
  const [selectedSDG, setSelectedSDG] = useState(null)

  // Mock school data - replace with actual data from your API
  const schoolData = {
    metrics: {
      // SDG 1 metrics
      students_below_poverty_line: 45,
      scholarship_recipients: 78,
      fee_assistance_provided: 65,
      family_income_levels: 2500,
      
      // SDG 2 metrics
      students_receiving_meals: 234,
      nutrition_status: 85,
      food_security_index: 78,
      agricultural_education_participation: 65,
      
      // SDG 3 metrics
      vaccination_coverage: 92,
      health_checkup_completion: 88,
      mental_health_support_access: 45,
      health_education_participation: 76,
      
      // SDG 4 metrics (already strong)
      enrollment_rates: 95,
      completion_rates: 87,
      literacy_rates: 89,
      teacher_student_ratio: 25,
      
      // SDG 5 metrics
      gender_parity_index: 0.92,
      female_teacher_percentage: 48,
      girls_completion_rate: 85,
      leadership_positions_by_gender: 0.45,
      
      // Add more metrics for other SDGs...
    }
  }

  const mockStudentData = [
    { id: 1, householdIncome: 1500, povertyStatus: 'below_poverty_line', hasScholarship: true, receivesSchoolMeals: true },
    { id: 2, householdIncome: 3000, povertyStatus: 'above_poverty_line', hasScholarship: false, receivesSchoolMeals: true },
    // Add more mock student data...
  ]

  const renderActiveView = () => {
    switch (activeView) {
      case 'dashboard':
        return <SDGDashboard schoolData={schoolData} />
      case 'sdg1':
        return <SDG1PovertyModule schoolId="school-1" studentData={mockStudentData} />
      case 'sdg2':
        return <SDG2HungerModule schoolId="school-1" studentData={mockStudentData} />
      case 'sdg3':
        return <SDG3HealthModule schoolId="school-1" studentData={mockStudentData} />
      case 'sdg5':
        return <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">👩‍🎓 SDG 5: Gender Equality Module</h2>
          <p className="text-gray-600">Gender equality module coming soon...</p>
        </div>
      default:
        return <SDGDashboard schoolData={schoolData} />
    }
  }

  const getPageTitle = () => {
    switch (activeView) {
      case 'dashboard':
        return 'UN Sustainable Development Goals Dashboard'
      case 'sdg1':
        return 'SDG 1: No Poverty'
      case 'sdg2':
        return 'SDG 2: Zero Hunger'
      case 'sdg3':
        return 'SDG 3: Good Health and Well-being'
      case 'sdg5':
        return 'SDG 5: Gender Equality'
      default:
        return 'UN Sustainable Development Goals'
    }
  }

  return (
    <DashboardLayout title={getPageTitle()}>
      <div className="space-y-6">
        {/* Navigation Header */}
        {activeView !== 'dashboard' && (
          <div className="flex items-center justify-between">
            <Button 
              variant="outline" 
              onClick={() => setActiveView('dashboard')}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to SDG Dashboard</span>
            </Button>
            
            <div className="flex items-center space-x-4">
              <Button variant="outline" size="sm">
                <FileText className="h-4 w-4 mr-2" />
                Generate Report
              </Button>
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
            </div>
          </div>
        )}

        {/* Quick Navigation for Dashboard */}
        {activeView === 'dashboard' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Target className="h-5 w-5" />
                <span>Quick Access to SDG Modules</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Button 
                  variant="outline" 
                  className="h-auto p-4 flex-col space-y-2"
                  onClick={() => setActiveView('sdg1')}
                >
                  <span className="text-2xl">🏚️</span>
                  <span className="font-semibold">No Poverty</span>
                  <span className="text-xs text-gray-500">Scholarships & Support</span>
                </Button>
                
                <Button 
                  variant="outline" 
                  className="h-auto p-4 flex-col space-y-2"
                  onClick={() => setActiveView('sdg2')}
                >
                  <span className="text-2xl">🍽️</span>
                  <span className="font-semibold">Zero Hunger</span>
                  <span className="text-xs text-gray-500">Nutrition & Agriculture</span>
                </Button>
                
                <Button 
                  variant="outline" 
                  className="h-auto p-4 flex-col space-y-2"
                  onClick={() => setActiveView('sdg3')}
                >
                  <span className="text-2xl">🏥</span>
                  <span className="font-semibold">Good Health</span>
                  <span className="text-xs text-gray-500">Health & Well-being</span>
                </Button>
                
                <Button 
                  variant="outline" 
                  className="h-auto p-4 flex-col space-y-2"
                  onClick={() => setActiveView('sdg5')}
                >
                  <span className="text-2xl">👩‍🎓</span>
                  <span className="font-semibold">Gender Equality</span>
                  <span className="text-xs text-gray-500">Equal Opportunities</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Content */}
        {renderActiveView()}

        {/* Global Actions (always visible) */}
        <Card className="bg-gradient-to-r from-blue-50 to-purple-50">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Globe className="h-5 w-5 text-blue-600" />
              <span>Global Impact & Partnerships</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600 mb-2">17</div>
                <div className="text-sm text-gray-600">SDGs Tracked</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600 mb-2">2030</div>
                <div className="text-sm text-gray-600">Target Year</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600 mb-2">🇿🇲</div>
                <div className="text-sm text-gray-600">Zambia Contribution</div>
              </div>
            </div>
            
            <div className="mt-6 flex justify-center space-x-4">
              <Button className="bg-blue-600 hover:bg-blue-700">
                <TrendingUp className="h-4 w-4 mr-2" />
                View Global Progress
              </Button>
              <Button variant="outline">
                <Users className="h-4 w-4 mr-2" />
                Partner Organizations
              </Button>
              <Button variant="outline">
                <BarChart3 className="h-4 w-4 mr-2" />
                Impact Reports
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
