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
    },
  })

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Subjects</h1>
          <p className="text-muted-foreground">View and manage your enrolled subjects</p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader className="h-24 bg-royalPurple-card2 dark:bg-royalPurple-card" />
                <CardContent className="h-32" />
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {subjectsData?.map((subject) => (
              <Card
                key={subject.id}
                className="hover:shadow-lg transition-shadow duration-200 bg-royalPurple-card/50 backdrop-blur-sm border-royalPurple-border/60"
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xl font-bold text-royalPurple-text1">
                    {subject.name}
                  </CardTitle>
                  <div className="p-2 bg-royalPurple-accent rounded-lg">
                    <BookOpen className="h-5 w-5 text-royalPurple-accentTx" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4 mt-4">
                    <div className="flex items-center text-sm text-royalPurple-text2">
                      <span className="font-mono bg-royalPurple-card2 px-2 py-1 rounded text-royalPurple-text1 mr-2 border border-royalPurple-border">
                        {subject.code || 'N/A'}
                      </span>
                      <span className="text-xs uppercase tracking-wider text-royalPurple-text3">
                        Code
                      </span>
                    </div>
                    {subject.department && (
                      <div className="flex items-center text-sm text-royalPurple-text2">
                        <School className="h-4 w-4 mr-2 text-royalPurple-text3" />
                        {subject.department}
                      </div>
                    )}
                    <div className="pt-4 flex items-center justify-between border-t border-royalPurple-border">
                      <span className="text-xs font-semibold text-royalPurple-successTx bg-royalPurple-success px-3 py-1 rounded-full border border-royalPurple-border">
                        Enrolled
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {(!subjectsData || subjectsData.length === 0) && (
              <div className="col-span-full text-center py-12 bg-royalPurple-card2/50 rounded-xl border border-dashed border-royalPurple-border">
                <BookOpen className="h-12 w-12 mx-auto text-royalPurple-text2 mb-4" />
                <h3 className="text-lg font-medium text-royalPurple-text1">No subjects found</h3>
                <p className="text-royalPurple-text2 mt-1">
                  You haven't been enrolled in any subjects yet.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
