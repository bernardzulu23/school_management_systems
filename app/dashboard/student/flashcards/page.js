'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { BookOpen, Sparkles } from 'lucide-react'
import { deckDateKey } from '@/lib/flashcards/limits'
import { CurriculumTopicSelect } from '@/components/curriculum/CurriculumTopicSelect'
import {
  useStudentCurriculumTopics,
  useStudentEnrolledSubjects,
} from '@/hooks/useStudentCurriculumTopics'

const MAX_CARDS = 10

export default function StudentFlashcardsPage() {
  const {
    subjects,
    gradeOrForm,
    loading: subjectsLoading,
    error: subjectsError,
  } = useStudentEnrolledSubjects()
  const [todayDecks, setTodayDecks] = useState([])
  const [subjectName, setSubjectName] = useState('')
  const [topic, setTopic] = useState('')
  const [count, setCount] = useState(MAX_CARDS)
  const [decksLoading, setDecksLoading] = useState(true)
  const [generating, setGenerating] = useState(false)

  const { topics } = useStudentCurriculumTopics(subjectName)
  const today = deckDateKey()
  const usedSubjects = new Set(todayDecks.map((d) => d.subjectName.toLowerCase()))
  const replacingExisting = Boolean(subjectName && usedSubjects.has(subjectName.toLowerCase()))
  const loading = subjectsLoading || decksLoading

  const loadDecks = useCallback(async () => {
    setDecksLoading(true)
    try {
      const deckRes = await fetch(`/api/student/flashcards?date=${today}`, {
        credentials: 'include',
      })
      const deckJson = await deckRes.json().catch(() => ({}))
      setTodayDecks(Array.isArray(deckJson?.data?.decks) ? deckJson.data.decks : [])
    } catch {
      toast.error('Failed to load flashcards')
    } finally {
      setDecksLoading(false)
    }
  }, [today])

  useEffect(() => {
    loadDecks()
  }, [loadDecks])

  useEffect(() => {
    if (subjectsError) toast.error(subjectsError)
  }, [subjectsError])

  useEffect(() => {
    setTopic('')
  }, [subjectName])

  const generateDeck = async () => {
    if (!subjectName) {
      toast.error('Select a subject')
      return
    }
    if (topics.length > 0 && !topic) {
      toast.error('Select a curriculum topic')
      return
    }
    setGenerating(true)
    try {
      const variationSeed =
        typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : `flash-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
      const res = await fetch('/api/student/flashcards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          subjectName,
          topic,
          count,
          date: today,
          forceRefresh: true,
          variationSeed,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(json.message || json.error || 'Could not generate deck')
      }
      toast.success(
        replacingExisting ? 'Flashcards regenerated with new cards!' : 'AI flashcards generated!'
      )
      setSubjectName('')
      setTopic('')
      setCount(MAX_CARDS)
      await loadDecks()
    } catch (e) {
      toast.error(e.message || 'Generation failed')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <DashboardLayout title="My Flashcards">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-royalPurple-text1 flex items-center gap-2">
            <BookOpen className="h-6 w-6" />
            AI Daily Flashcards
          </h1>
          <p className="text-royalPurple-text2 text-sm mt-1">
            Fresh cards every generate · up to {MAX_CARDS} questions · answers stay hidden until you
            choose · {today}
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Today&apos;s decks ({todayDecks.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {loading ? (
              <p className="text-sm text-royalPurple-text2">Loading…</p>
            ) : todayDecks.length === 0 ? (
              <p className="text-sm text-royalPurple-text2">
                No decks yet today. Generate one below.
              </p>
            ) : (
              todayDecks.map((d) => (
                <div
                  key={d.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-royalPurple-border"
                >
                  <div>
                    <div className="font-medium text-royalPurple-text1">{d.subjectName}</div>
                    <div className="text-xs text-royalPurple-text3">
                      {d.cardCount} questions · {d.title}
                    </div>
                  </div>
                  <Link href={`/dashboard/student/flashcards/${d.id}`}>
                    <Button size="sm">Study</Button>
                  </Link>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Generate today&apos;s AI deck
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {subjects.length === 0 && !loading ? (
              <p className="text-sm text-royalPurple-text2">You have no subjects enrolled.</p>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Subject</Label>
                    <select
                      className="w-full p-2 border border-royalPurple-border rounded-md bg-royalPurple-card"
                      value={subjectName}
                      onChange={(e) => setSubjectName(e.target.value)}
                    >
                      <option value="">Choose enrolled subject…</option>
                      {subjects.map((s) => (
                        <option key={s.id || s.name} value={s.name}>
                          {s.name}
                          {usedSubjects.has(s.name.toLowerCase()) ? ' (replace today)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  <CurriculumTopicSelect
                    subject={subjectName}
                    gradeOrForm={gradeOrForm || ''}
                    value={topic}
                    onChange={setTopic}
                    label="Curriculum topic"
                    required={topics.length > 0}
                    allowFreeFormWhenEmpty={false}
                    id="flashcards-topic"
                  />
                  <div className="space-y-2">
                    <Label>Number of questions (max {MAX_CARDS})</Label>
                    <Input
                      type="number"
                      min={1}
                      max={MAX_CARDS}
                      value={count}
                      onChange={(e) =>
                        setCount(Math.min(MAX_CARDS, Math.max(1, Number(e.target.value) || 1)))
                      }
                    />
                  </div>
                </div>

                <Button
                  onClick={generateDeck}
                  disabled={generating || !subjectName || (topics.length > 0 && !topic.trim())}
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  {generating
                    ? 'Generating…'
                    : replacingExisting
                      ? 'Regenerate with new cards'
                      : 'Generate AI flashcards'}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
