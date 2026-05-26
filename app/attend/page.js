'use client'

import { Suspense, useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { CheckCircle2, Loader2, AlertCircle } from 'lucide-react'

function AttendPageContent() {
  const searchParams = useSearchParams()
  const token = String(searchParams.get('t') || '').trim()

  const [phase, setPhase] = useState('loading')
  const [error, setError] = useState('')
  const [sessionInfo, setSessionInfo] = useState(null)
  const [studentName, setStudentName] = useState('')
  const [selectedId, setSelectedId] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [confirmed, setConfirmed] = useState(null)

  const loadSession = useCallback(async () => {
    if (!token) {
      setError('Missing attendance link. Scan the QR code from your teacher again.')
      setPhase('error')
      return
    }

    setPhase('loading')
    setError('')

    try {
      const res = await fetch(`/api/attendance/qr-info?t=${encodeURIComponent(token)}`)
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(json.error || 'Could not load attendance session')
        setPhase('error')
        return
      }
      setSessionInfo(json)
      setPhase('ready')
    } catch {
      setError('Network error. Check your connection and try again.')
      setPhase('error')
    }
  }, [token])

  useEffect(() => {
    loadSession()
  }, [loadSession])

  async function markAttendance(payload) {
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/attendance/qr-mark', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, ...payload }),
      })
      const json = await res.json().catch(() => ({}))
      if (res.status === 409 && json.studentName) {
        setConfirmed({
          studentName: json.studentName,
          markedAt: json.markedAt,
          alreadyMarked: true,
        })
        setPhase('done')
        return
      }
      if (!res.ok) {
        setError(json.error || 'Could not mark attendance')
        return
      }
      setConfirmed({
        studentName: json.studentName,
        status: json.status,
        markedAt: json.markedAt,
        alreadyMarked: false,
      })
      setPhase('done')
    } catch {
      setError('Network error. Try again.')
    } finally {
      setSubmitting(false)
    }
  }

  function handleRosterPick(student) {
    if (sessionInfo?.markedStudentIds?.includes(student.id)) return
    setSelectedId(student.id)
    markAttendance({ studentId: student.id })
  }

  function handleNameSubmit(e) {
    e.preventDefault()
    const name = studentName.trim()
    if (!name) {
      setError('Enter your full name as on the class register')
      return
    }
    markAttendance({ studentName: name })
  }

  const roster = sessionInfo?.roster || []
  const markedSet = new Set(sessionInfo?.markedStudentIds || [])
  const showRoster = roster.length > 0 && roster.length <= 40

  return (
    <div className="min-h-screen bg-[#1a5c36] text-white flex flex-col">
      <header className="px-4 py-6 text-center border-b border-white/20">
        <p className="text-sm uppercase tracking-wide opacity-90">ZSMS Attendance</p>
        <h1 className="text-2xl font-bold mt-1">Mark present</h1>
      </header>

      <main className="flex-1 px-4 py-6 max-w-lg mx-auto w-full">
        {phase === 'loading' && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 className="h-10 w-10 animate-spin" aria-hidden />
            <p className="text-lg">Loading class…</p>
          </div>
        )}

        {phase === 'error' && (
          <div className="bg-white/10 rounded-xl p-6 flex gap-3 items-start">
            <AlertCircle className="h-8 w-8 shrink-0" aria-hidden />
            <div>
              <p className="text-lg font-semibold">Cannot continue</p>
              <p className="mt-2 opacity-95">{error}</p>
              <button
                type="button"
                onClick={loadSession}
                className="mt-4 w-full py-3 rounded-lg bg-white text-[#1a5c36] font-semibold text-lg"
              >
                Try again
              </button>
            </div>
          </div>
        )}

        {phase === 'ready' && sessionInfo && (
          <div className="space-y-6">
            <div className="text-center">
              <p className="text-xl font-semibold">{sessionInfo.className}</p>
              <p className="text-lg opacity-90">{sessionInfo.subjectName}</p>
              <p className="text-sm mt-2 opacity-80">Confirm your name to mark present</p>
            </div>

            {error && (
              <p className="bg-red-900/40 border border-red-300/50 rounded-lg px-4 py-3 text-base">
                {error}
              </p>
            )}

            {showRoster ? (
              <ul className="space-y-2" aria-label="Class register">
                {roster.map((student) => {
                  const done = markedSet.has(student.id)
                  return (
                    <li key={student.id}>
                      <button
                        type="button"
                        disabled={submitting || done}
                        onClick={() => handleRosterPick(student)}
                        className={`w-full text-left py-4 px-4 rounded-xl text-lg font-medium transition-colors ${
                          done
                            ? 'bg-white/20 opacity-70 cursor-default'
                            : 'bg-white text-[#1a5c36] hover:bg-white/95 active:scale-[0.99]'
                        }`}
                      >
                        {student.name}
                        {done ? ' ✓' : ''}
                      </button>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <form onSubmit={handleNameSubmit} className="space-y-4">
                <label className="block">
                  <span className="text-sm opacity-90">Your full name</span>
                  <input
                    type="text"
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    autoComplete="name"
                    className="mt-2 w-full py-4 px-4 rounded-xl text-lg text-[#1a5c36] font-medium"
                    placeholder="e.g. Chanda Banda"
                    disabled={submitting}
                  />
                </label>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-4 rounded-xl bg-white text-[#1a5c36] font-bold text-lg disabled:opacity-60"
                >
                  {submitting ? 'Marking…' : 'Mark present'}
                </button>
              </form>
            )}

            {!showRoster && selectedId && submitting && (
              <p className="text-center text-sm opacity-80">Submitting…</p>
            )}
          </div>
        )}

        {phase === 'done' && confirmed && (
          <div className="text-center py-10 space-y-4">
            <CheckCircle2 className="h-16 w-16 mx-auto text-white" aria-hidden />
            <p className="text-2xl font-bold">
              {confirmed.alreadyMarked ? 'Already marked' : 'Marked present'}
            </p>
            <p className="text-xl">{confirmed.studentName}</p>
            {confirmed.status && <p className="text-sm opacity-90">Status: {confirmed.status}</p>}
            <p className="text-sm opacity-80">You can close this page.</p>
          </div>
        )}
      </main>
    </div>
  )
}

export default function AttendPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#1a5c36] flex items-center justify-center text-white">
          <Loader2 className="h-10 w-10 animate-spin" />
        </div>
      }
    >
      <AttendPageContent />
    </Suspense>
  )
}
