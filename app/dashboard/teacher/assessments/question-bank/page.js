'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'react-hot-toast'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { ArrowLeft, ClipboardList, Plus, Save, Trash2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function TeacherQuestionBankPage() {
  const [assignments, setAssignments] = useState([])
  const [subject, setSubject] = useState('')
  const [sets, setSets] = useState([])
  const [selectedId, setSelectedId] = useState('')
  const [loading, setLoading] = useState(false)

  const [newSetTitle, setNewSetTitle] = useState('')
  const [newSetGrade, setNewSetGrade] = useState('')
  const [creating, setCreating] = useState(false)

  const [newQuestion, setNewQuestion] = useState({
    type: 'mcq',
    question: '',
    options: '',
    answer: '',
    marks: 1,
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function loadAssignments() {
      try {
        const res = await fetch('/api/teaching-assignments', { credentials: 'include' })
        const json = await res.json().catch(() => ({}))
        const data = Array.isArray(json?.data) ? json.data : []
        setAssignments(data)
        const firstSubject = data?.[0]?.subjectName ? String(data[0].subjectName) : ''
        setSubject((prev) => prev || firstSubject)
      } catch {
        toast.error('Failed to load teaching assignments')
      }
    }
    loadAssignments()
  }, [])

  useEffect(() => {
    async function loadSets() {
      if (!subject) {
        setSets([])
        setSelectedId('')
        return
      }
      setLoading(true)
      try {
        const params = new URLSearchParams()
        params.set('subject', subject)
        const res = await fetch(`/api/question-bank?${params.toString()}`, {
          credentials: 'include',
        })
        const json = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(json?.error || 'Failed')
        const data = Array.isArray(json?.data) ? json.data : []
        setSets(data)
        setSelectedId((prev) => prev || (data[0]?.id ? String(data[0].id) : ''))
      } catch (e) {
        toast.error(e?.message || 'Failed to load question bank')
        setSets([])
        setSelectedId('')
      } finally {
        setLoading(false)
      }
    }
    loadSets()
  }, [subject])

  const selectedSet = useMemo(
    () => sets.find((s) => String(s.id) === String(selectedId)) || null,
    [sets, selectedId]
  )
  const selectedQuestions = useMemo(
    () => (Array.isArray(selectedSet?.content?.questions) ? selectedSet.content.questions : []),
    [selectedSet]
  )

  const createSet = async () => {
    if (!newSetTitle.trim() || !subject) return
    setCreating(true)
    try {
      const res = await fetch('/api/question-bank', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title: newSetTitle.trim(),
          subject,
          grade: newSetGrade.trim() || null,
          questions: [],
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || 'Failed to create set')
      toast.success('Question set created')
      setNewSetTitle('')
      setNewSetGrade('')
      setSets((prev) => [json.data, ...prev])
      setSelectedId(String(json.data.id))
    } catch (e) {
      toast.error(e?.message || 'Failed to create question set')
    } finally {
      setCreating(false)
    }
  }

  const saveQuestions = async (nextQuestions) => {
    if (!selectedSet) return
    setSaving(true)
    try {
      const res = await fetch(`/api/question-bank/${selectedSet.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title: selectedSet.title,
          subject,
          content: { ...(selectedSet.content || {}), questions: nextQuestions },
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || 'Failed to save')
      setSets((prev) => prev.map((s) => (String(s.id) === String(selectedSet.id) ? json.data : s)))
      toast.success('Saved')
    } catch (e) {
      toast.error(e?.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const addQuestion = async () => {
    if (!selectedSet) return
    const q = String(newQuestion.question || '').trim()
    if (!q) return
    const options =
      newQuestion.type === 'mcq'
        ? String(newQuestion.options || '')
            .split('\n')
            .map((s) => s.trim())
            .filter(Boolean)
        : []
    const next = [
      ...selectedQuestions,
      {
        type: newQuestion.type,
        question: q,
        options,
        answer: String(newQuestion.answer || '').trim(),
        marks: Number(newQuestion.marks || 1),
      },
    ]
    await saveQuestions(next)
    setNewQuestion({ type: 'mcq', question: '', options: '', answer: '', marks: 1 })
  }

  const removeQuestion = async (index) => {
    if (!selectedSet) return
    const next = selectedQuestions.filter((_, i) => i !== index)
    await saveQuestions(next)
  }

  const deleteSet = async () => {
    if (!selectedSet) return
    if (!confirm('Delete this question set?')) return
    try {
      const res = await fetch(`/api/question-bank/${selectedSet.id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || 'Failed to delete')
      toast.success('Deleted')
      setSets((prev) => prev.filter((s) => String(s.id) !== String(selectedSet.id)))
      setSelectedId('')
    } catch (e) {
      toast.error(e?.message || 'Failed to delete')
    }
  }

  return (
    <DashboardLayout userRole="teacher" title="Question Bank">
      <div className="space-y-6">
        <Button asChild variant="outline">
          <Link href="/dashboard/teacher/assessments">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Assessments
          </Link>
        </Button>

        <Card variant="glass">
          <CardHeader>
            <CardTitle className="text-royalPurple-text1 flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              Question Bank
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Subject</Label>
                <select
                  className="w-full bg-royalPurple-deep border border-royalPurple-border rounded-lg p-3 text-royalPurple-text1"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                >
                  {assignments.map((a) => (
                    <option key={a.id} value={a.subjectName}>
                      {a.subjectName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label>New Set Title</Label>
                <Input value={newSetTitle} onChange={(e) => setNewSetTitle(e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label>Grade (optional)</Label>
                <Input value={newSetGrade} onChange={(e) => setNewSetGrade(e.target.value)} />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button onClick={createSet} disabled={creating || !newSetTitle.trim() || !subject}>
                <Plus className="h-4 w-4 mr-2" />
                {creating ? 'Creating...' : 'Create Set'}
              </Button>
              {selectedSet ? (
                <Button variant="outline" onClick={deleteSet}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Set
                </Button>
              ) : null}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-1">
                <CardHeader>
                  <CardTitle className="text-sm">Sets</CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <p className="text-royalPurple-text2 text-sm">Loading...</p>
                  ) : sets.length === 0 ? (
                    <p className="text-royalPurple-text2 text-sm">No question sets yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {sets.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => setSelectedId(String(s.id))}
                          className={`w-full text-left p-3 rounded-lg border ${
                            String(s.id) === String(selectedId)
                              ? 'border-royalPurple-accent bg-royalPurple-muted/60'
                              : 'border-royalPurple-border bg-royalPurple-card/60'
                          }`}
                        >
                          <div className="text-royalPurple-text1 font-semibold truncate">
                            {s.title}
                          </div>
                          <div className="text-xs text-royalPurple-text3">
                            {s.questionCount || 0} questions
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-sm">
                    {selectedSet ? selectedSet.title : 'Select a set'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {!selectedSet ? (
                    <p className="text-royalPurple-text2 text-sm">
                      Create or select a set to manage questions.
                    </p>
                  ) : (
                    <>
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Question Type</Label>
                            <select
                              className="w-full bg-royalPurple-deep border border-royalPurple-border rounded-lg p-3 text-royalPurple-text1"
                              value={newQuestion.type}
                              onChange={(e) =>
                                setNewQuestion((p) => ({ ...p, type: e.target.value }))
                              }
                            >
                              <option value="mcq">Multiple Choice</option>
                              <option value="short">Short Answer</option>
                            </select>
                          </div>
                          <div className="space-y-2">
                            <Label>Marks</Label>
                            <Input
                              type="number"
                              min={1}
                              value={newQuestion.marks}
                              onChange={(e) =>
                                setNewQuestion((p) => ({ ...p, marks: Number(e.target.value) }))
                              }
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label>Question</Label>
                          <Input
                            value={newQuestion.question}
                            onChange={(e) =>
                              setNewQuestion((p) => ({ ...p, question: e.target.value }))
                            }
                          />
                        </div>

                        {newQuestion.type === 'mcq' ? (
                          <div className="space-y-2">
                            <Label>Options (one per line)</Label>
                            <textarea
                              className="w-full bg-royalPurple-deep border border-royalPurple-border rounded-lg p-3 text-royalPurple-text1 min-h-[100px]"
                              value={newQuestion.options}
                              onChange={(e) =>
                                setNewQuestion((p) => ({ ...p, options: e.target.value }))
                              }
                            />
                          </div>
                        ) : null}

                        <div className="space-y-2">
                          <Label>Answer</Label>
                          <Input
                            value={newQuestion.answer}
                            onChange={(e) =>
                              setNewQuestion((p) => ({ ...p, answer: e.target.value }))
                            }
                          />
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            onClick={addQuestion}
                            disabled={saving || !newQuestion.question.trim()}
                          >
                            <Save className="h-4 w-4 mr-2" />
                            {saving ? 'Saving...' : 'Add Question'}
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="text-sm font-semibold text-royalPurple-text1">
                          Questions
                        </div>
                        {selectedQuestions.length === 0 ? (
                          <p className="text-royalPurple-text2 text-sm">No questions yet.</p>
                        ) : (
                          <div className="space-y-2">
                            {selectedQuestions.map((q, i) => (
                              <div
                                key={`${selectedSet.id}:${i}`}
                                className="p-3 rounded-lg border border-royalPurple-border bg-royalPurple-card/60"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <div className="text-royalPurple-text1 font-medium truncate">
                                      {i + 1}. {q.question}
                                    </div>
                                    <div className="text-xs text-royalPurple-text3">
                                      {q.type} • {q.marks || 1} marks
                                    </div>
                                  </div>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => removeQuestion(i)}
                                    disabled={saving}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
