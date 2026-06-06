'use client'

import { useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Trophy } from 'lucide-react'

export default function StudentExtracurricularPage() {
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/activities/mine', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : { data: [] }))
      .then((json) => setActivities(json.data || []))
      .catch(() => setActivities([]))
      .finally(() => setLoading(false))
  }, [])

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-3xl space-y-6 p-4 md:p-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-royalPurple-text1">
          <Trophy className="size-7" />
          My Activities
        </h1>
        {loading ? (
          <p className="text-sm text-royalPurple-text3">Loading…</p>
        ) : activities.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-royalPurple-text3">
              You are not registered for any extracurricular activities yet.
            </CardContent>
          </Card>
        ) : (
          <ul className="flex flex-col gap-3">
            {activities.map((activity) => (
              <li key={activity.id}>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">{activity.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-royalPurple-text2">
                    <p>Type: {activity.type}</p>
                    {activity.location ? <p>Location: {activity.location}</p> : null}
                    {activity.date ? (
                      <p>Date: {new Date(activity.date).toLocaleDateString()}</p>
                    ) : null}
                    {activity.description ? <p className="mt-2">{activity.description}</p> : null}
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </div>
    </DashboardLayout>
  )
}
