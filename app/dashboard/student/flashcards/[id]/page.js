'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { ArrowLeft, BookOpen, CheckCircle2, FileText, Loader2, Star, XCircle } from 'lucide-react'
import { isFlashcardAnswerCorrect, resolveFlashcardAnswer } from '@/lib/flashcards/resolveAnswer'
import toast from 'react-hot-toast'

function StarRating({ count = 0, max = 5 }) {
  return (
    <div className="flex gap-1" aria-label={`${count} out of ${max} stars`}>
      {Array.from({ length: max }, (_, i) => (
        <Star
          key={i}
          className={`h-5 w-5 ${i < count ? 'fill-amber-400 text-amber-400' : 'text-royalPurple-text3'}`}
        />
      ))}
    </div>
  )
}

export default function StudentFlashcardStudyPage() {
  const params = useParams()
  const deckId = params?.id
  const [deck, setDeck] = useState(null)
  const [index, setIndex] = useState(0)
  const [selected, setSelected] = useState(null)
  const [answers, setAnswers] = useState({})
  const [phase, setPhase] = useState('study')
  const [completing, setCompleting] = useState(false)
  const [sessionResult, setSessionResult] = useState(null)

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

  const score = useMemo(() => {
    const cards = Array.isArray(deck?.cards) ? deck.cards : []
    let correct = 0
    for (const c of cards) {
      const a = answers[c.id]
      if (a && isFlashcardAnswerCorrect(a, c.options, c.answer)) correct += 1
    }
    return correct
  }, [answers, deck?.cards])

  const cards = Array.isArray(deck?.cards) ? deck.cards : []
  const card = cards[index]
  const revealed = selected != null
  const isLastCard = index + 1 >= cards.length

  const resolvedAnswer = useMemo(() => {
    if (!card) return null
    return resolveFlashcardAnswer(card.options, card.answer)
  }, [card])

  const isCorrect = useMemo(() => {
    if (!revealed || !card || selected == null) return false
    return isFlashcardAnswerCorrect(selected, card.options, card.answer)
  }, [revealed, selected, card])

  const choose = (option) => {
    if (revealed) return
    setSelected(option)
    setAnswers((prev) => ({ ...prev, [card.id]: option }))
  }

  const finishSession = async (finalAnswers) => {
    const id = deck?.id || deckId
    if (!id) {
      alert('Could not identify this deck. Go back and open it again from the list.')
      return
    }

    setCompleting(true)
    try {
      const res = await fetch(`/api/student/flashcards/${id}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ answers: finalAnswers }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || json?.message || 'Could not complete session')
      setSessionResult(json.data)
      setPhase('complete')
    } catch (e) {
      alert(e.message || 'Failed to load your results. Please try again.')
    } finally {
      setCompleting(false)
    }
  }

  const next = async () => {
    if (!revealed) return

    if (isLastCard) {
      await finishSession(answers)
      return
    }

    setSelected(null)
    setIndex((i) => i + 1)
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

  if (phase === 'complete' && sessionResult) {
    const { score: finalScore, feedback } = sessionResult
    return (
      <DashboardLayout title={`${deck.subjectName} — Results`}>
        <div className="space-y-4 max-w-2xl mx-auto">
          <Link href="/dashboard/student/flashcards">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to flashcards
            </Button>
          </Link>

          <Card>
            <CardHeader>
              <CardTitle>Session complete</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex flex-wrap items-center gap-4">
                <div className="text-3xl font-bold text-royalPurple-text1">
                  {finalScore.correct}/{finalScore.total}
                </div>
                <div>
                  <p className="text-lg font-semibold text-royalPurple-accentTx">
                    {finalScore.rating.label}
                  </p>
                  <StarRating count={finalScore.rating.stars} />
                  <p className="text-sm text-royalPurple-text3 mt-1">
                    {finalScore.percent}% correct
                  </p>
                </div>
              </div>

              <p className="text-royalPurple-text2">{feedback.summary}</p>

              {feedback.strengths?.length ? (
                <div>
                  <h3 className="font-medium text-royalPurple-text1 mb-2">What you did well</h3>
                  <ul className="list-disc pl-5 space-y-1 text-sm text-royalPurple-text2">
                    {feedback.strengths.map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {feedback.topicsToImprove?.length ? (
                <div>
                  <h3 className="font-medium text-royalPurple-text1 mb-2">Topics to study more</h3>
                  <ul className="list-disc pl-5 space-y-1 text-sm text-royalPurple-text2">
                    {feedback.topicsToImprove.map((t) => (
                      <li key={t}>{t}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {feedback.readingList?.length ? (
                <div>
                  <h3 className="font-medium text-royalPurple-text1 mb-2">
                    Books &amp; articles to read
                  </h3>
                  <div className="space-y-3">
                    {feedback.readingList.map((item) => (
                      <div
                        key={`${item.type}-${item.title}`}
                        className="rounded-lg border border-royalPurple-border p-3 bg-royalPurple-card"
                      >
                        <div className="flex items-start gap-2">
                          {item.type === 'book' ? (
                            <BookOpen className="h-4 w-4 mt-0.5 text-royalPurple-accentTx shrink-0" />
                          ) : (
                            <FileText className="h-4 w-4 mt-0.5 text-royalPurple-accentTx shrink-0" />
                          )}
                          <div>
                            <p className="font-medium text-royalPurple-text1">{item.title}</p>
                            {item.author ? (
                              <p className="text-xs text-royalPurple-text3">{item.author}</p>
                            ) : null}
                            <p className="text-sm text-royalPurple-text2 mt-1">{item.reason}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              <Link href="/dashboard/student/flashcards">
                <Button className="w-full">Done — return to decks</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
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
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              try {
                const { downloadAssessmentPaper } =
                  await import('@/lib/exports/downloadAssessmentPaper')
                await downloadAssessmentPaper(
                  {
                    kind: 'flashcards',
                    title: deck.title || `${deck.subjectName} flashcards`,
                    subject: deck.subjectName,
                    includeAnswers: true,
                    cards,
                  },
                  'pdf'
                )
              } catch (e) {
                toast.error(e?.message || 'PDF export failed')
              }
            }}
          >
            Save PDF
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              try {
                const { downloadAssessmentPaper } =
                  await import('@/lib/exports/downloadAssessmentPaper')
                await downloadAssessmentPaper(
                  {
                    kind: 'flashcards',
                    title: deck.title || `${deck.subjectName} flashcards`,
                    subject: deck.subjectName,
                    includeAnswers: true,
                    cards,
                  },
                  'word'
                )
              } catch (e) {
                toast.error(e?.message || 'Word export failed')
              }
            }}
          >
            Save Word
          </Button>
        </div>

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
                  resolvedAnswer &&
                  String(opt).trim().toLowerCase() === resolvedAnswer.trim().toLowerCase()
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
                    disabled={revealed || completing}
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
                {isCorrect
                  ? 'Correct! '
                  : `Not quite. Correct answer: ${resolvedAnswer || card.answer}. `}
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
              <Button onClick={next} disabled={!revealed || completing}>
                {completing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Finishing…
                  </>
                ) : isLastCard ? (
                  'Finish & see results'
                ) : (
                  'Next question'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
