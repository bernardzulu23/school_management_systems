'use client'

import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Construction } from 'lucide-react'

export default function LearningPathPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Learning Path</h1>
          <p className="text-muted-foreground">
            Personalized learning journey and progress tracking
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Construction className="h-5 w-5" />
              Under Development
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">
              The Learning Path feature is currently under development.
              This page will provide personalized learning recommendations
              and track your academic progress.
            </p>
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <h3 className="font-semibold text-blue-900">Coming Soon:</h3>
              <ul className="mt-2 text-blue-800 space-y-1">
                <li>• Personalized learning recommendations</li>
                <li>• Progress tracking and analytics</li>
                <li>• Adaptive learning paths</li>
                <li>• Achievement milestones</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}