'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { ArrowLeft, CheckCircle2, XCircle } from 'lucide-react'

export default function StudentFlashcardStudyPage() {
  const params = useParams()
  const deckId = params?.id
  const [deck, setDeck] = useState(null)
  const [index, setIndex] = useState(0)
  const [selected, setSelected] = useState(null)
  const [answers, setAnswers] = useState({})

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
  const revealed = selected != null

  const isCorrect = useMemo(() => {
    if (!revealed || !card) return false
    return String(selected).trim().toLowerCase() === String(card.answer).trim().toLowerCase()
  }, [revealed, selected, card])

  const score = useMemo(() => {
    let correct = 0
    for (const c of cards) {
      const a = answers[c.id]
      if (a && String(a).trim().toLowerCase() === String(c.answer).trim().toLowerCase())
        correct += 1
    }
    return correct
  }, [answers, cards])

  const choose = (option) => {
    if (revealed) return
    setSelected(option)
    setAnswers((prev) => ({ ...prev, [card.id]: option }))
  }

  const next = () => {
    setSelected(null)
    setIndex((i) => (i + 1 < cards.length ? i + 1 : i))
  }

  const answeredCount = Object.keys(answers).length
  const finished = answeredCount === cards.length && cards.length > 0

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
              {deck.subjectName} · Question {index + 1} of {cards.length}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-lg font-medium text-royalPurple-text1">{card?.front}</p>

            <div className="space-y-2">
              {(card?.options || []).map((opt, optIdx) => {
                const chosen = selected === opt
                const correctOption =
                  revealed &&
                  String(opt).trim().toLowerCase() === String(card.answer).trim().toLowerCase()
                let cls = 'border-royalPurple-border bg-royalPurple-card'
                if (revealed && correctOption)
                  cls = 'border-royalPurple-successTx bg-royalPurple-success/20'
                else if (revealed && chosen)
                  cls = 'border-royalPurple-dangerTx bg-royalPurple-danger/20'
                else if (chosen) cls = 'border-royalPurple-primary bg-royalPurple-pill/30'
                return (
                  <button
                    key={`${card.id}_${optIdx}`}
                    type="button"
                    onClick={() => choose(opt)}
                    disabled={revealed}
                    className={`w-full text-left px-3 py-2 rounded-lg border flex items-center justify-between ${cls}`}
                  >
                    <span className="text-royalPurple-text1">{opt}</span>
                    {revealed && correctOption ? (
                      <CheckCircle2 className="h-4 w-4 text-royalPurple-successTx" />
                    ) : revealed && chosen ? (
                      <XCircle className="h-4 w-4 text-royalPurple-dangerTx" />
                    ) : null}
                  </button>
                )
              })}
            </div>

            {revealed ? (
              <div
                className={`text-sm rounded-lg p-3 ${
                  isCorrect
                    ? 'bg-royalPurple-success/20 text-royalPurple-successTx'
                    : 'bg-royalPurple-danger/20 text-royalPurple-dangerTx'
                }`}
              >
                {isCorrect ? 'Correct! ' : `Not quite. Correct answer: ${card.answer}. `}
                {card.explanation ? (
                  <span className="text-royalPurple-text2">{card.explanation}</span>
                ) : null}
              </div>
            ) : (
              <p className="text-xs text-royalPurple-text3">
                Select an answer to reveal whether it is correct.
              </p>
            )}

            <div className="flex items-center justify-between gap-2">
              <span className="text-sm text-royalPurple-text2">
                Score: {score}/{cards.length}
              </span>
              <Button onClick={next} disabled={!revealed || index + 1 >= cards.length}>
                Next question
              </Button>
            </div>

            {finished ? (
              <div className="rounded-lg p-3 bg-royalPurple-accent/20 text-royalPurple-accentTx text-sm">
                Deck complete! You scored {score}/{cards.length}. Keep practising to improve.
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
