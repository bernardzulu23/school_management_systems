'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { ArrowLeft } from 'lucide-react'
import { api } from '@/lib/api'
import { toast } from 'react-hot-toast'

function isMcqType(type) {
  const t = String(type || '').toLowerCase()
  return t === 'mcq' || t === 'true_false'
}

export default function StudentInteractiveAssessmentPage({ params }) {
  const [answers, setAnswers] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState(null)

  const assignmentId = params?.id

  useEffect(() => {
    const blockPrint = (e) => {
      e.preventDefault()
      toast.error('Printing is disabled for assessments')
    }
    window.addEventListener('beforeprint', blockPrint)
    return () => window.removeEventListener('beforeprint', blockPrint)
  }, [])

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
  const isSubmitted = submission?.status === 'submitted'

  const totalMarks = useMemo(() => {
    const questions = Array.isArray(quiz?.questions) ? quiz.questions : []
    const declared = Number(quiz?.totalMarks)
    if (Number.isFinite(declared) && declared > 0) return declared
    return questions.reduce((sum, q) => sum + (Number(q.marks) || 1), 0)
  }, [quiz])

  const handlePick = (questionId, option) => {
    if (isSubmitted) return
    setAnswers((prev) => ({ ...prev, [questionId]: option }))
  }

  const handleNoteChange = (questionId, value) => {
    if (isSubmitted) return
    setAnswers((prev) => ({ ...prev, [questionId]: value }))
  }

  const handleSubmit = async () => {
    if (!assignmentId || !quiz || isSubmitted) return
    const questions = quiz.questions || []
    const unanswered = questions.filter((q, idx) => {
      const qid = String(q.id || `q_${idx + 1}`)
      return !String(answers[qid] || '').trim()
    })
    if (unanswered.length > 0) {
      toast.error('Answer all questions before submitting')
      return
    }
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
      <div
        className="space-y-4 select-none"
        onContextMenu={(e) => e.preventDefault()}
        style={{ WebkitUserSelect: 'none' }}
      >
        <Link href="/dashboard/student/assessments">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Assessments
          </Button>
        </Link>

        <Card>
          <CardHeader>
            <CardTitle>{data?.assignment?.title || quiz.title || 'Assessment'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-royalPurple-text2">
            <div>
              {data?.assignment?.subject} • Total marks: {totalMarks}
            </div>
            <div>
              Answer in this app only — questions have no answer key visible. Type short answers in
              the note fields; choose an option for multiple-choice items. Content cannot be
              downloaded or printed.
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {(quiz.questions || []).map((q, idx) => {
            const qid = String(q.id || `q_${idx + 1}`)
            const selected = answers[qid] ?? submission?.answers?.[qid] ?? ''
            const reviewItem = (submission?.review || result?.review || []).find(
              (r) => String(r.id) === qid
            )
            const mcq = isMcqType(q.type) && Array.isArray(q.options) && q.options.length > 0

            return (
              <Card key={qid}>
                <CardContent className="p-4 space-y-3">
                  <div className="font-semibold text-royalPurple-text1">
                    Q{idx + 1}. {q.question}
                    {q.marks ? (
                      <span className="text-xs font-normal text-royalPurple-text2 ml-2">
                        ({q.marks} mark{q.marks === 1 ? '' : 's'})
                      </span>
                    ) : null}
                  </div>

                  {mcq ? (
                    <div className="space-y-2">
                      {q.options.map((opt, optionIdx) => (
                        <button
                          key={`${qid}_${optionIdx}`}
                          type="button"
                          disabled={isSubmitted}
                          onClick={() => handlePick(qid, opt)}
                          className={`w-full text-left px-3 py-2 rounded border select-text ${
                            selected === opt
                              ? 'border-royalPurple-primary bg-royalPurple-pill/30'
                              : 'border-royalPurple-border bg-royalPurple-card'
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <textarea
                      className="w-full min-h-[100px] rounded border border-royalPurple-border bg-royalPurple-card p-3 text-sm text-royalPurple-text1 select-text"
                      placeholder="Type your answer here (in-app only, not downloadable)"
                      value={selected}
                      disabled={isSubmitted}
                      onChange={(e) => handleNoteChange(qid, e.target.value)}
                    />
                  )}

                  {isSubmitted && reviewItem ? (
                    <div
                      className={`text-sm ${reviewItem.isCorrect ? 'text-royalPurple-successTx' : 'text-royalPurple-dangerTx'}`}
                    >
                      {reviewItem.isCorrect
                        ? `Correct (${reviewItem.awarded ?? reviewItem.marks}/${reviewItem.marks} marks)`
                        : `Incorrect (${reviewItem.awarded ?? 0}/${reviewItem.marks} marks)`}
                      {reviewItem.explanation ? (
                        <div className="mt-1 text-royalPurple-text2">{reviewItem.explanation}</div>
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
            {!isSubmitted ? (
              <Button onClick={handleSubmit} disabled={submitting}>
                {submitting ? 'Submitting...' : 'Submit for grading'}
              </Button>
            ) : (
              <div className="text-sm text-royalPurple-successTx font-medium">
                Submitted — your attempt has been graded.
              </div>
            )}
            {submission?.grade != null ? (
              <div className="text-sm text-royalPurple-text2">
                Score: {Math.round(Number(submission.grade || 0))}% • {submission.encouragement}
              </div>
            ) : null}
            {result && !submission ? (
              <div className="text-sm text-royalPurple-successTx">
                Score: {result.score}/{result.totalMarks} ({result.percentage}%) —{' '}
                {result.encouragement}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
