'use client'

import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Upload } from 'lucide-react'

export default function CloudinaryTestPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">File Upload Test</h1>
          <p className="text-muted-foreground">
            Testing file upload functionality
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload Feature
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">
              File upload functionality is being implemented.
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
