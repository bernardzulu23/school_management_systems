'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { ArrowLeft, RotateCcw } from 'lucide-react'

export default function StudentFlashcardStudyPage() {
  const params = useParams()
  const deckId = params?.id
  const [deck, setDeck] = useState(null)
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)

  useEffect(() => {
    if (!deckId) return
    const load = async () => {
      const res = await fetch('/api/student/flashcards', { credentials: 'include' })
      const json = await res.json().catch(() => ({}))
      const found = (json?.data?.decks || []).find((d) => String(d.id) === String(deckId))
      setDeck(found || null)
    }
    load()
  }, [deckId])

  const cards = Array.isArray(deck?.cards) ? deck.cards : []
  const card = cards[index]

  const next = () => {
    setFlipped(false)
    setIndex((i) => (i + 1 < cards.length ? i + 1 : 0))
  }

  if (!deck) {
    return (
      <DashboardLayout title="Study">
        <p className="text-royalPurple-text2">Deck not found.</p>
        <Link href="/dashboard/student/flashcards">
          <Button className="mt-4">Back</Button>
        </Link>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title={`${deck.subjectName} flashcards`}>
      <div className="space-y-4 max-w-xl mx-auto">
        <Link href="/dashboard/student/flashcards">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            All decks
          </Button>
        </Link>

        <Card>
          <CardHeader>
            <CardTitle>
              {deck.subjectName} · Card {index + 1} of {cards.length}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <button
              type="button"
              onClick={() => setFlipped((f) => !f)}
              className="w-full min-h-[180px] p-6 rounded-xl border-2 border-royalPurple-primary bg-royalPurple-card text-left transition-transform"
            >
              <p className="text-xs text-royalPurple-text3 mb-2">
                {flipped ? 'Answer' : 'Tap to reveal'}
              </p>
              <p className="text-lg font-medium text-royalPurple-text1">
                {flipped ? card?.back : card?.front}
              </p>
            </button>
            <div className="flex gap-2">
              <Button className="flex-1" onClick={next}>
                Next card
              </Button>
              <Button variant="outline" onClick={() => setFlipped(false)}>
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
