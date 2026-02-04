'use client'

import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BookOpen, School } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

export default function SubjectsPage() {
  const { data: subjectsData, isLoading } = useQuery({
    queryKey: ['student-subjects'],
    queryFn: async () => {
      const res = await api.getStudentSubjects()
      return res.data.data
    }
  })

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Subjects</h1>
          <p className="text-muted-foreground">
            View and manage your enrolled subjects
          </p>
        </div>

        {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                    <Card key={i} className="animate-pulse">
                        <CardHeader className="h-24 bg-slate-100 dark:bg-slate-800" />
                        <CardContent className="h-32" />
                    </Card>
                ))}
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {subjectsData?.map((subject) => (
                    <Card key={subject.id} className="hover:shadow-lg transition-shadow duration-200 bg-white/50 backdrop-blur-sm border-slate-200/60">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-xl font-bold text-slate-800">
                                {subject.name}
                            </CardTitle>
                            <div className="p-2 bg-blue-100 rounded-lg">
                                <BookOpen className="h-5 w-5 text-blue-600" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4 mt-4">
                                <div className="flex items-center text-sm text-slate-500">
                                    <span className="font-mono bg-slate-100 px-2 py-1 rounded text-slate-700 mr-2 border border-slate-200">
                                        {subject.code || 'N/A'}
                                    </span>
                                    <span className="text-xs uppercase tracking-wider text-slate-400">Code</span>
                                </div>
                                {subject.department && (
                                    <div className="flex items-center text-sm text-slate-600">
                                        <School className="h-4 w-4 mr-2 text-slate-400" />
                                        {subject.department}
                                    </div>
                                )}
                                <div className="pt-4 flex items-center justify-between border-t border-slate-100">
                                    <span className="text-xs font-semibold text-green-700 bg-green-100 px-3 py-1 rounded-full border border-green-200">
                                        Enrolled
                                    </span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
                
                {(!subjectsData || subjectsData.length === 0) && (
                    <div className="col-span-full text-center py-12 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                        <BookOpen className="h-12 w-12 mx-auto text-slate-300 mb-4" />
                        <h3 className="text-lg font-medium text-slate-900">No subjects found</h3>
                        <p className="text-slate-500 mt-1">You haven't been enrolled in any subjects yet.</p>
                    </div>
                )}
            </div>
        )}
      </div>
    </DashboardLayout>
  )
}
