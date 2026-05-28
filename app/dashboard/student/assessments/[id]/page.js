'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { ArrowLeft } from 'lucide-react'
import { api } from '@/lib/api'
import { toast } from 'react-hot-toast'

export default function StudentInteractiveAssessmentPage({ params }) {
  const [answers, setAnswers] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState(null)
  const [revealed, setRevealed] = useState({})

  const assignmentId = params?.id

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['student-interactive-assessment', assignmentId],
    enabled: Boolean(assignmentId),
    queryFn: async () => {
      const res = await api.get(`/assignments/${assignmentId}/submissions`)
      return res.data?.data
    },
  })

  const quiz = data?.quiz || null
  const submission = data?.submission || null

  const totalMarks = useMemo(() => {
    const questions = Array.isArray(quiz?.questions) ? quiz.questions : []
    const declared = Number(quiz?.totalMarks)
    if (Number.isFinite(declared) && declared > 0) return declared
    return questions.length
  }, [quiz])

  const handlePick = (questionId, option) => {
    setAnswers((prev) => ({ ...prev, [questionId]: option }))
    setRevealed((prev) => ({ ...prev, [questionId]: true }))
  }

  const handleSubmit = async () => {
    if (!assignmentId || !quiz) return
    setSubmitting(true)
    try {
      const res = await api.post(`/assignments/${assignmentId}/submissions`, {
        answers,
        submit: true,
      })
      setResult(res.data?.data || null)
      toast.success('Assessment submitted and graded')
      await refetch()
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Failed to submit attempt')
    } finally {
      setSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <DashboardLayout title="Assessment Attempt">
        <div className="text-royalPurple-text2">Loading assessment...</div>
      </DashboardLayout>
    )
  }

  if (!quiz) {
    return (
      <DashboardLayout title="Assessment Attempt">
        <Card>
          <CardContent className="p-6">
            <p className="text-royalPurple-dangerTx">
              This assessment is not available for interactive attempt.
            </p>
            <Link href="/dashboard/student/assessments">
              <Button className="mt-4">Back to assessments</Button>
            </Link>
          </CardContent>
        </Card>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title={data?.assignment?.title || 'Assessment Attempt'}>
      <div className="space-y-4">
        <Link href="/dashboard/student/assessments">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Assessments
          </Button>
        </Link>

        <Card>
          <CardHeader>
            <CardTitle>{data?.assignment?.title || quiz.title || 'Interactive Quiz'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-royalPurple-text2">
            <div>
              {data?.assignment?.subject} • Total marks: {totalMarks}
            </div>
            <div>
              Answers stay hidden until you choose an option. After you choose, immediate feedback
              is shown.
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {(quiz.questions || []).map((q, idx) => {
            const qid = String(q.id || `q_${idx + 1}`)
            const selected = answers[qid] ?? submission?.answers?.[qid]
            const shouldReveal = Boolean(revealed[qid] || selected)
            const isCorrect =
              shouldReveal &&
              String(selected || '')
                .trim()
                .toLowerCase() ===
                String(q.answer || '')
                  .trim()
                  .toLowerCase()

            return (
              <Card key={qid}>
                <CardContent className="p-4 space-y-3">
                  <div className="font-semibold text-royalPurple-text1">
                    Q{idx + 1}. {q.question}
                  </div>
                  <div className="space-y-2">
                    {(q.options || []).map((opt, optionIdx) => (
                      <button
                        key={`${qid}_${optionIdx}`}
                        type="button"
                        onClick={() => handlePick(qid, opt)}
                        className={`w-full text-left px-3 py-2 rounded border ${
                          selected === opt
                            ? 'border-royalPurple-primary bg-royalPurple-pill/30'
                            : 'border-royalPurple-border bg-royalPurple-card'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                  {shouldReveal ? (
                    <div
                      className={`text-sm ${isCorrect ? 'text-royalPurple-successTx' : 'text-royalPurple-dangerTx'}`}
                    >
                      {isCorrect
                        ? 'Correct answer chosen.'
                        : `Not correct. Correct answer: ${q.answer}`}
                      {q.explanation ? (
                        <div className="mt-1 text-royalPurple-text2">{q.explanation}</div>
                      ) : null}
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            )
          })}
        </div>

        <Card>
          <CardContent className="p-4 flex flex-wrap items-center gap-3">
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Submitting...' : 'Submit for Grading'}
            </Button>
            {submission ? (
              <div className="text-sm text-royalPurple-text2">
                Last score: {Math.round(Number(submission.grade || 0))}% •{' '}
                {submission.encouragement}
              </div>
            ) : null}
            {result ? (
              <div className="text-sm text-royalPurple-successTx">
                Score: {result.score}/{result.totalMarks} ({result.percentage}%) -{' '}
                {result.encouragement}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
