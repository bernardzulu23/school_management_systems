'use client'

import Link from 'next/link'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { CurriculumStudio } from '@/components/curriculum/CurriculumStudio'
import { ArrowLeft } from 'lucide-react'

export default function SchemesPage() {
  return (
    <DashboardLayout userRole="teacher" title="Schemes of Work">
      <div className="space-y-6">
        <div>
          <Link
            href="/dashboard/teacher/curriculum"
            className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            Lesson plans studio
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">Curriculum Studio</h1>
          <p className="mt-2 text-muted-foreground">
            Generate schemes of work, lesson plans, and record of work templates
          </p>
        </div>

        <CurriculumStudio />
      </div>
    </DashboardLayout>
  )
}
