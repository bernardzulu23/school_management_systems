'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, Trash2, BookOpen } from 'lucide-react'
import { deckDateKey } from '@/lib/flashcards/limits'

const MAX_CARDS = 10

function emptyCard(idx) {
  return { id: `card_${idx}`, front: '', back: '' }
}

export default function StudentFlashcardsPage() {
  const [subjects, setSubjects] = useState([])
  const [todayDecks, setTodayDecks] = useState([])
  const [subjectName, setSubjectName] = useState('')
  const [title, setTitle] = useState('')
  const [cards, setCards] = useState([emptyCard(1)])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const today = deckDateKey()
  const usedSubjects = new Set(todayDecks.map((d) => d.subjectName.toLowerCase()))
  const availableSubjects = subjects.filter((s) => !usedSubjects.has(s.name.toLowerCase()))

  const load = async () => {
    setLoading(true)
    try {
      const [subRes, deckRes] = await Promise.all([
        fetch('/api/student/subjects', { credentials: 'include' }),
        fetch(`/api/student/flashcards?date=${today}`, { credentials: 'include' }),
      ])
      const subJson = await subRes.json().catch(() => ({}))
      const deckJson = await deckRes.json().catch(() => ({}))
      setSubjects(Array.isArray(subJson?.data) ? subJson.data : [])
      setTodayDecks(Array.isArray(deckJson?.data?.decks) ? deckJson.data.decks : [])
    } catch {
      toast.error('Failed to load flashcards')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const patchCard = (idx, field, value) => {
    setCards((prev) => prev.map((c, i) => (i === idx ? { ...c, [field]: value } : c)))
  }

  const addCard = () => {
    if (cards.length >= MAX_CARDS) {
      toast.error(`Maximum ${MAX_CARDS} cards per deck`)
      return
    }
    setCards((prev) => [...prev, emptyCard(prev.length + 1)])
  }

  const removeCard = (idx) => {
    if (cards.length <= 1) return
    setCards((prev) => prev.filter((_, i) => i !== idx))
  }

  const createDeck = async () => {
    if (!subjectName) {
      toast.error('Select a subject')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/student/flashcards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ subjectName, title, cards, date: today }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Could not create deck')
      toast.success('Flashcard deck created!')
      setSubjectName('')
      setTitle('')
      setCards([emptyCard(1)])
      await load()
    } catch (e) {
      toast.error(e.message || 'Create failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <DashboardLayout title="My Flashcards">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-royalPurple-text1 flex items-center gap-2">
            <BookOpen className="h-6 w-6" />
            Daily Flashcards
          </h1>
          <p className="text-royalPurple-text2 text-sm mt-1">
            One deck per subject per day · up to {MAX_CARDS} cards each · {today}
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
                No decks yet today. Create one below.
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
                      {d.cardCount} cards · {d.title}
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
            <CardTitle className="text-base">Create today&apos;s deck</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {availableSubjects.length === 0 && !loading ? (
              <p className="text-sm text-royalPurple-text2">
                You have created a deck for every subject today, or you have no subjects enrolled.
              </p>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Subject</Label>
                    <select
                      className="w-full p-2 border border-royalPurple-border rounded-md bg-royalPurple-card"
                      value={subjectName}
                      onChange={(e) => setSubjectName(e.target.value)}
                    >
                      <option value="">Choose subject…</option>
                      {availableSubjects.map((s) => (
                        <option key={s.id || s.name} value={s.name}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Deck title (optional)</Label>
                    <Input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. Cell structure"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  {cards.map((c, idx) => (
                    <div
                      key={c.id}
                      className="p-3 rounded-lg border border-royalPurple-border space-y-2"
                    >
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Card {idx + 1}</span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeCard(idx)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <Input
                        placeholder="Front (question / term)"
                        value={c.front}
                        onChange={(e) => patchCard(idx, 'front', e.target.value)}
                      />
                      <Input
                        placeholder="Back (answer / definition)"
                        value={c.back}
                        onChange={(e) => patchCard(idx, 'back', e.target.value)}
                      />
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addCard}
                    disabled={cards.length >= MAX_CARDS}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add card ({cards.length}/{MAX_CARDS})
                  </Button>
                </div>

                <Button onClick={createDeck} disabled={saving}>
                  {saving ? 'Saving…' : 'Save deck for today'}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
