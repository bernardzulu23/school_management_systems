'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MessageSquare, User, Calendar, Star, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/Button'

const CATEGORY_LABELS = {
  general: 'General',
  usability: 'Usability',
  feature: 'Feature Request',
  bug: 'Bug Report',
  other: 'Other',
}

export function HeadteacherFeedbackView() {
  const [feedbacks, setFeedbacks] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchFeedbacks = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/feedback', { credentials: 'include' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to load feedback')
      }
      const data = await res.json()
      setFeedbacks(data.feedbacks || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchFeedbacks()
  }, [])

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-royalPurple-card2 dark:bg-royalPurple-muted rounded w-3/4 mx-auto" />
            <div className="h-4 bg-royalPurple-card2 dark:bg-royalPurple-muted rounded w-1/2 mx-auto" />
            <div className="h-4 bg-royalPurple-card2 dark:bg-royalPurple-muted rounded w-2/3 mx-auto" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-royalPurple-dangerTx dark:text-royalPurple-dangerTx mb-4">{error}</p>
          <Button onClick={fetchFeedbacks}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            User Feedback
          </CardTitle>
          <Button variant="outline" size="sm" onClick={fetchFeedbacks}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-royalPurple-text2 dark:text-royalPurple-text3 mb-6">
            Feedback submitted by teachers, students, and HODs. Administrators cannot submit
            feedback.
          </p>

          {feedbacks.length === 0 ? (
            <div className="text-center py-12 text-royalPurple-text3 dark:text-royalPurple-text3">
              <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No feedback yet.</p>
            </div>
          ) : (
            <ul className="space-y-4" role="list">
              {feedbacks.map((fb) => (
                <li
                  key={fb.id}
                  className="border border-royalPurple-border dark:border-royalPurple-border rounded-lg p-4 bg-royalPurple-page/50 dark:bg-royalPurple-card/50"
                >
                  <p className="text-royalPurple-text1 mb-3">{fb.message}</p>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-royalPurple-text3 dark:text-royalPurple-text3">
                    <span className="flex items-center gap-1">
                      <User className="h-4 w-4" />
                      {fb.user?.name} ({fb.user?.role})
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {new Date(fb.createdAt).toLocaleDateString()}
                    </span>
                    {fb.category && (
                      <span className="px-2 py-0.5 rounded bg-royalPurple-accent dark:bg-royalPurple-accent/30 text-royalPurple-accentTx dark:text-royalPurple-accentTx">
                        {CATEGORY_LABELS[fb.category] || fb.category}
                      </span>
                    )}
                    {fb.rating && (
                      <span className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-amber-400 text-royalPurple-accentTx" />
                        {fb.rating}/5
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
