'use client'

import { useCallback, useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Brain, RefreshCw } from 'lucide-react'
import { toast } from 'react-hot-toast'

export function QuizClassAnalysisPanel({ assessmentId, publishedAssignmentId }) {
  const [loading, setLoading] = useState(false)
  const [analysis, setAnalysis] = useState(null)

  const loadCached = useCallback(async () => {
    if (!assessmentId) return
    try {
      const res = await fetch(`/api/assessments/${assessmentId}/ai-analysis`, {
        credentials: 'include',
      })
      const json = await res.json().catch(() => ({}))
      if (res.ok) setAnalysis(json.data || null)
    } catch {
      setAnalysis(null)
    }
  }, [assessmentId])

  const generate = async () => {
    if (!assessmentId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/assessments/${assessmentId}/ai-analysis`, {
        method: 'POST',
        credentials: 'include',
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Analysis failed')
      setAnalysis(json.data || null)
      toast.success('AI analysis ready')
    } catch (e) {
      toast.error(e.message || 'Failed to generate analysis')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (publishedAssignmentId) loadCached()
    else setAnalysis(null)
  }, [publishedAssignmentId, loadCached])

  if (!publishedAssignmentId) return null

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3 flex-wrap">
        <CardTitle className="text-base flex items-center gap-2">
          <Brain className="h-5 w-5 text-royalPurple-accentTx" />
          AI progress analysis
        </CardTitle>
        <Button variant="outline" size="sm" onClick={generate} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          {analysis ? 'Refresh' : 'Analyse class results'}
        </Button>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 text-sm">
        {loading ? (
          <div className="flex flex-col gap-2" aria-busy="true">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-16 w-full rounded-lg" />
          </div>
        ) : !analysis ? (
          <p className="text-royalPurple-text2">
            Generate recommendations on whether to re-teach this topic based on student attempts.
          </p>
        ) : (
          <>
            <p className="text-royalPurple-text1">{analysis.summary}</p>
            <Alert variant={analysis.recommendReteach ? 'warning' : 'success'}>
              <div className="flex flex-wrap items-center gap-2">
                <AlertTitle>Re-teach recommendation</AlertTitle>
                <Badge variant={analysis.recommendReteach ? 'warning' : 'success'}>
                  {analysis.recommendReteach ? 'Yes — re-teach' : 'No — on track'}
                </Badge>
              </div>
              <AlertDescription className="mt-1 text-royalPurple-text2">
                {analysis.reteachRationale}
              </AlertDescription>
            </Alert>
            {Array.isArray(analysis.strugglingTopics) && analysis.strugglingTopics.length > 0 ? (
              <div className="flex flex-col gap-2">
                <p className="font-medium text-royalPurple-text1">Struggling topics</p>
                <div className="flex flex-wrap gap-2">
                  {analysis.strugglingTopics.map((t) => (
                    <Badge key={t} variant="secondary">
                      {t}
                    </Badge>
                  ))}
                </div>
              </div>
            ) : null}
            {Array.isArray(analysis.suggestedActivities) &&
            analysis.suggestedActivities.length > 0 ? (
              <div className="flex flex-col gap-2">
                <p className="font-medium text-royalPurple-text1">Suggested activities</p>
                <ul className="list-disc pl-5 text-royalPurple-text2">
                  {analysis.suggestedActivities.map((a) => (
                    <li key={a}>{a}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {analysis.studentsNeedingSupport ? (
              <Alert variant="info">
                <AlertTitle>Students needing support</AlertTitle>
                <AlertDescription>{analysis.studentsNeedingSupport}</AlertDescription>
              </Alert>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  )
}
