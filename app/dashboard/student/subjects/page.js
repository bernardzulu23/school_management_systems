'use client'

import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BookOpen } from 'lucide-react'

export default function SubjectsPage() {

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Subjects</h1>
          <p className="text-muted-foreground">
            View and manage your enrolled subjects
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Subjects Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">
              Subject management features are currently under development.
            </p>
            <div className="mt-4 p-4 bg-green-50 rounded-lg">
              <h3 className="font-semibold text-green-900">Coming Soon:</h3>
              <ul className="mt-2 text-green-800 space-y-1">
                <li>• View enrolled subjects</li>
                <li>• Track grades and assignments</li>
                <li>• Subject performance analytics</li>
                <li>• Teacher communication</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
