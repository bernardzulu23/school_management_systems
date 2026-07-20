'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { Compass, ExternalLink, Send } from 'lucide-react'

/**
 * Student navigation help — FAQ matcher only.
 * Calls POST /api/chat/navbot. Must never import lib/ai/chat/* or curriculum RAG.
 */

function isUsableRoute(route) {
  if (!route || typeof route !== 'string') return false
  // Skip template placeholders (e.g. /attend?t={token})
  if (route.includes('{') || route.includes('}')) return false
  return route.startsWith('/')
}

export function StudentNavBot() {
  const [message, setMessage] = useState('')
  const [turns, setTurns] = useState([])
  const [loading, setLoading] = useState(false)
  const listRef = useRef(null)

  useEffect(() => {
    if (!listRef.current) return
    listRef.current.scrollTop = listRef.current.scrollHeight
  }, [turns, loading])

  const ask = async () => {
    const text = message.trim()
    if (!text || loading) return

    setMessage('')
    setTurns((prev) => [...prev, { role: 'user', text }])
    setLoading(true)

    try {
      const res = await fetch('/api/chat/navbot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ message: text }),
      })
      const json = await res.json().catch(() => ({}))

      if (res.status === 429) {
        toast.error(json.message || json.error || 'Daily limit reached. Try again later.')
        setTurns((prev) => [
          ...prev,
          {
            role: 'bot',
            text: json.message || 'Daily navigation help limit reached. Please try again later.',
            route: null,
          },
        ])
        return
      }

      if (!res.ok) {
        toast.error(json.error || json.message || 'Could not get help right now.')
        setTurns((prev) => [
          ...prev,
          {
            role: 'bot',
            text: 'Something went wrong. Please try again in a moment.',
            route: null,
          },
        ])
        return
      }

      setTurns((prev) => [
        ...prev,
        {
          role: 'bot',
          text: json.answer || '',
          route: isUsableRoute(json.route) ? json.route : null,
        },
      ])
    } catch {
      toast.error('Network error — check your connection and try again.')
      setTurns((prev) => [
        ...prev,
        {
          role: 'bot',
          text: 'Could not reach navigation help. Please try again.',
          route: null,
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card variant="glass">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-royalPurple-text1">
          <Compass className="h-5 w-5" />
          ZSMS Help — Find your way
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-royalPurple-text2">
          Ask where to find something in ZSMS — timetable, results, attendance, materials, and more.
          This is navigation help only, not subject tutoring. For homework help, use Study
          Assistant.
        </p>

        <div
          ref={listRef}
          className="max-h-[420px] space-y-3 overflow-y-auto rounded-xl border border-royalPurple-border/40 bg-royalPurple-card/40 p-3"
          aria-live="polite"
        >
          {turns.length === 0 ? (
            <p className="text-sm text-royalPurple-text3 px-1 py-6 text-center">
              Try: &ldquo;Where are my results?&rdquo; or &ldquo;How do I see my timetable?&rdquo;
            </p>
          ) : null}

          {turns.map((turn, i) => (
            <div
              key={`${turn.role}-${i}`}
              className={
                turn.role === 'user'
                  ? 'ml-8 rounded-xl bg-royalPurple-accent/40 border border-royalPurple-border2/40 p-3 text-sm text-royalPurple-text1'
                  : 'mr-8 rounded-xl border border-royalPurple-border/40 bg-royalPurple-muted/50 p-3 text-sm text-royalPurple-text1 whitespace-pre-wrap'
              }
            >
              <p>{turn.text}</p>
              {turn.role === 'bot' && turn.route ? (
                <div className="mt-3">
                  <Link href={turn.route}>
                    <Button variant="outline" size="sm">
                      <ExternalLink className="h-3.5 w-3.5 mr-2" />
                      Open page
                    </Button>
                  </Link>
                </div>
              ) : null}
            </div>
          ))}

          {loading ? (
            <p className="text-sm text-royalPurple-text3 mr-8 px-1">Looking that up…</p>
          ) : null}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <textarea
            className="w-full min-h-[80px] flex-1 rounded-lg border border-royalPurple-border bg-royalPurple-card p-3 text-sm"
            placeholder="e.g. Where can I check my grades?"
            value={message}
            maxLength={1000}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                ask()
              }
            }}
            disabled={loading}
          />
          <Button onClick={ask} disabled={loading || !message.trim()} className="w-full sm:w-auto">
            <Send className="h-4 w-4 mr-2" />
            {loading ? 'Sending…' : 'Ask'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
