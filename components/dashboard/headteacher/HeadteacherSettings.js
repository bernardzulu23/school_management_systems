import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import {
  Settings,
  Database,
  Shield,
  Globe,
  Monitor,
  School,
  FileText,
  Calendar,
  Users,
  BarChart3,
  CheckCircle,
} from 'lucide-react'

export function HeadteacherSettings() {
  return (
    <div className="space-y-6">
      {/* Settings Header */}
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-royalPurple-text1 mb-2">School Settings</h2>
        <p className="text-royalPurple-text2">System configuration and administrative settings</p>
      </div>

      {/* Settings Categories */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="bg-royalPurple-accent text-royalPurple-text1">
            <CardTitle className="flex items-center">
              <Settings className="h-5 w-5 mr-2" />
              System Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-3">
              <Button variant="outline" className="w-full justify-start">
                <Database className="h-4 w-4 mr-2" />
                Database Management
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Shield className="h-4 w-4 mr-2" />
                Security Settings
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Globe className="h-4 w-4 mr-2" />
                Integration Management
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Monitor className="h-4 w-4 mr-2" />
                System Monitoring
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="bg-royalPurple-success text-royalPurple-text1">
            <CardTitle className="flex items-center">
              <School className="h-5 w-5 mr-2" />
              School Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-3">
              <Button variant="outline" className="w-full justify-start">
                <FileText className="h-4 w-4 mr-2" />
                School Information
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Calendar className="h-4 w-4 mr-2" />
                Academic Calendar
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Users className="h-4 w-4 mr-2" />
                User Permissions
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <BarChart3 className="h-4 w-4 mr-2" />
                Grading System
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Status */}
      <Card>
        <CardHeader>
          <CardTitle>System Status Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-royalPurple-success rounded-lg">
              <CheckCircle className="h-8 w-8 text-royalPurple-successTx mx-auto mb-2" />
              <h4 className="font-medium text-royalPurple-successTx">Database</h4>
              <p className="text-sm text-royalPurple-successTx">Operational</p>
            </div>
            <div className="text-center p-4 bg-royalPurple-success rounded-lg">
              <CheckCircle className="h-8 w-8 text-royalPurple-successTx mx-auto mb-2" />
              <h4 className="font-medium text-royalPurple-successTx">API Services</h4>
              <p className="text-sm text-royalPurple-successTx">Running</p>
            </div>
            <div className="text-center p-4 bg-royalPurple-success rounded-lg">
              <CheckCircle className="h-8 w-8 text-royalPurple-successTx mx-auto mb-2" />
              <h4 className="font-medium text-royalPurple-successTx">Security</h4>
              <p className="text-sm text-royalPurple-successTx">Protected</p>
            </div>
            <div className="text-center p-4 bg-royalPurple-success rounded-lg">
              <CheckCircle className="h-8 w-8 text-royalPurple-successTx mx-auto mb-2" />
              <h4 className="font-medium text-royalPurple-successTx">Backups</h4>
              <p className="text-sm text-royalPurple-successTx">Up to Date</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
