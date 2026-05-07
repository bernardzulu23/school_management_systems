'use client'

import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAuth } from '@/lib/auth'
import { calculateGrade } from '@/lib/gradingSystem'
import { toast } from 'react-hot-toast'
import { Save, ArrowLeft, Loader2, CheckCircle, AlertCircle, Trash2 } from 'lucide-react'
import Link from 'next/link'

export default function ResultEntryPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [syncing, setSyncing] = useState(false)

  const [assignments, setAssignments] = useState([])
  const [selectedAssignmentId, setSelectedAssignmentId] = useState('')
  const [selectedTerm, setSelectedTerm] = useState('')
  const [termError, setTermError] = useState(false)

  const [pupils, setPupils] = useState([])
  const [scores, setScores] = useState({})
  const [baseUpdatedAtByPupil, setBaseUpdatedAtByPupil] = useState({})
  const [resultIdByPupil, setResultIdByPupil] = useState({})

  const [conflicts, setConflicts] = useState([])
  const [showConflicts, setShowConflicts] = useState(false)
  const [isOnline, setIsOnline] = useState(true)
  const SAVE_BATCH_SIZE = 60

  const terms = (() => {
    const year = new Date().getFullYear()
    return [`Term 1 ${year}`, `Term 2 ${year}`, `Term 3 ${year}`]
  })()

  const selectedAssignment = assignments.find((a) => a.id === selectedAssignmentId) || null

  const queueKey = user?.id ? `gradebook_queue_v1:${user.id}` : 'gradebook_queue_v1'
  const draftKey = user?.id ? `gradebook_drafts_v1:${user.id}` : 'gradebook_drafts_v1'

  const parseTermYear = (termRaw) => {
    const t = String(termRaw || '').trim()
    const match = t.match(/(Term\\s*\\d+)\\s*(\\d{4})/i)
    if (match) return { term: match[1].trim(), year: Number(match[2]) }
    return { term: t || 'Term 1', year: new Date().getFullYear() }
  }

  const getQueue = () => {
    try {
      const raw = localStorage.getItem(queueKey)
      const parsed = raw ? JSON.parse(raw) : []
      const now = Date.now()
      const keepMs = 8 * 24 * 60 * 60 * 1000
      const filtered = Array.isArray(parsed)
        ? parsed.filter((x) => x?.createdAt && now - new Date(x.createdAt).getTime() <= keepMs)
        : []
      if (filtered.length !== parsed.length)
        localStorage.setItem(queueKey, JSON.stringify(filtered))
      return filtered
    } catch {
      return []
    }
  }

  const setQueue = (items) => {
    localStorage.setItem(queueKey, JSON.stringify(items))
  }

  const saveDraft = (draft) => {
    try {
      const raw = localStorage.getItem(draftKey)
      const parsed = raw ? JSON.parse(raw) : {}
      const next = { ...(parsed || {}), ...draft }
      localStorage.setItem(draftKey, JSON.stringify(next))
    } catch {}
  }

  const loadDraft = () => {
    try {
      const raw = localStorage.getItem(draftKey)
      return raw ? JSON.parse(raw) : {}
    } catch {
      return {}
    }
  }

  useEffect(() => {
    setIsOnline(typeof navigator !== 'undefined' ? navigator.onLine : true)
  }, [])

  useEffect(() => {
    const loadAssignments = async () => {
      try {
        const res = await fetch('/api/teaching-assignments', {
          cache: 'no-store',
          credentials: 'include',
        })
        if (!res.ok) throw new Error('Failed to load assignments')
        const json = await res.json()
        const data = Array.isArray(json?.data) ? json.data : []
        setAssignments(data)
        const draft = loadDraft()
        const preferred = draft?.selectedAssignmentId
        const draftTerm = String(draft?.selectedTerm || '').trim()
        if (draftTerm && terms.includes(draftTerm)) setSelectedTerm(draftTerm)
        if (preferred && data.some((a) => a.id === preferred)) {
          setSelectedAssignmentId(preferred)
        } else if (!selectedAssignmentId && data.length > 0) {
          setSelectedAssignmentId(data[0].id)
        }
      } catch (e) {
        toast.error('Failed to load teaching assignments')
      }
    }
    loadAssignments()
  }, [])

  useEffect(() => {
    saveDraft({ selectedAssignmentId, selectedTerm })
  }, [selectedAssignmentId, selectedTerm])

  const fetchPupilsAndResults = async () => {
    if (!selectedAssignment || !selectedTerm) return
    setLoading(true)
    try {
      const { term, year } = parseTermYear(selectedTerm)

      const pupilsRes = await fetch(
        `/api/teacher/pupils?classId=${encodeURIComponent(selectedAssignment.classId)}&subjectId=${encodeURIComponent(selectedAssignment.subjectId)}`,
        { cache: 'no-store', credentials: 'include' }
      )
      if (!pupilsRes.ok) throw new Error('Failed to load pupils')
      const pupilsJson = await pupilsRes.json()
      const pupilsData = Array.isArray(pupilsJson?.data) ? pupilsJson.data : []
      setPupils(pupilsData)

      const fetchResultsOnce = async () =>
        fetch(
          `/api/teacher/results?classId=${encodeURIComponent(selectedAssignment.classId)}&subjectId=${encodeURIComponent(selectedAssignment.subjectId)}&term=${encodeURIComponent(term)}&year=${encodeURIComponent(year)}`,
          { cache: 'no-store', credentials: 'include' }
        )

      let resultsRes = await fetchResultsOnce()
      if (resultsRes.status === 401 || resultsRes.status === 403) {
        const refreshRes = await fetch('/api/auth/refresh', {
          method: 'POST',
          credentials: 'include',
          cache: 'no-store',
        })
        if (refreshRes.ok) {
          resultsRes = await fetchResultsOnce()
        }
      }

      if (!resultsRes.ok) {
        const data = await resultsRes.json().catch(() => ({}))
        toast.error(data?.message || data?.error || 'Failed to load saved results')
        return
      }

      const resultsJson = await resultsRes.json()
      const results = Array.isArray(resultsJson?.data) ? resultsJson.data : []
      const byStudent = new Map(results.map((r) => [r.studentId, r]))

      const initialScores = {}
      const baseMap = {}
      const idMap = {}
      pupilsData.forEach((p) => {
        const existing = byStudent.get(p.id)
        if (existing) {
          initialScores[p.id] = existing.score
          baseMap[p.id] = existing.updatedAt
          idMap[p.id] = existing.id
        }
      })

      setScores(initialScores)
      setBaseUpdatedAtByPupil(baseMap)
      setResultIdByPupil(idMap)
    } catch (e) {
      toast.error('Failed to load gradebook data')
      setPupils([])
      setScores({})
      setBaseUpdatedAtByPupil({})
      setResultIdByPupil({})
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPupilsAndResults()
  }, [selectedAssignmentId, selectedTerm])

  const handleScoreChange = (studentId, value) => {
    // Allow empty string for clearing
    if (value === '') {
      setScores((prev) => ({ ...prev, [studentId]: '' }))
      return
    }

    const numValue = Number(value)
    if (!isNaN(numValue) && numValue >= 0 && numValue <= 100) {
      setScores((prev) => ({ ...prev, [studentId]: numValue }))
    }
  }

  const deleteResult = async (studentId) => {
    const resultId = resultIdByPupil[studentId]
    if (!resultId) {
      setScores((prev) => {
        const next = { ...prev }
        delete next[studentId]
        return next
      })
      setBaseUpdatedAtByPupil((prev) => {
        const next = { ...prev }
        delete next[studentId]
        return next
      })
      return
    }

    const ok = window.confirm('Delete this result entry?')
    if (!ok) return

    try {
      const res = await fetch(`/api/teacher/results?id=${encodeURIComponent(resultId)}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.message || json?.error || 'Failed to delete result')

      setScores((prev) => {
        const next = { ...prev }
        delete next[studentId]
        return next
      })
      setBaseUpdatedAtByPupil((prev) => {
        const next = { ...prev }
        delete next[studentId]
        return next
      })
      setResultIdByPupil((prev) => {
        const next = { ...prev }
        delete next[studentId]
        return next
      })

      toast.success('Result deleted')
      broadcastResultsUpdated()
    } catch (e) {
      toast.error(e.message || 'Something went wrong. Please try again.')
    }
  }

  const buildPayload = () => {
    if (!selectedAssignment || !selectedTerm) return null
    const { term, year } = parseTermYear(selectedTerm)
    const results = pupils
      .map((p) => ({
        studentId: p.id,
        subjectId: selectedAssignment.subjectId,
        classId: selectedAssignment.classId,
        term,
        year,
        score: scores[p.id] === '' ? null : scores[p.id],
        baseUpdatedAt: baseUpdatedAtByPupil[p.id] || null,
      }))
      .filter((r) => r.score !== undefined && r.score !== null)
    return { results }
  }

  const chunkPayload = (payload, size = SAVE_BATCH_SIZE) => {
    const results = Array.isArray(payload?.results) ? payload.results : []
    if (results.length <= size) return [payload]
    const chunks = []
    for (let i = 0; i < results.length; i += size) {
      chunks.push({ results: results.slice(i, i + size) })
    }
    return chunks
  }

  const enqueueOffline = (payload) => {
    const queue = getQueue()
    queue.push({
      id:
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : String(Date.now()),
      createdAt: new Date().toISOString(),
      selectedAssignment,
      selectedTerm,
      payload,
    })
    setQueue(queue)
  }

  const broadcastResultsUpdated = () => {
    try {
      if (typeof window === 'undefined') return
      const msg = { type: 'results-updated', at: Date.now() }
      if (typeof BroadcastChannel !== 'undefined') {
        const ch = new BroadcastChannel('zsms-events')
        ch.postMessage(msg)
        ch.close()
      }
      localStorage.setItem('zsms-events:last-results-updated', String(msg.at))
    } catch {}
  }

  const syncOnce = async (payload) => {
    const headers = { 'Content-Type': 'application/json' }
    const body = JSON.stringify(payload)

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 20000)

    const postOnce = async () =>
      fetch('/api/teacher/results', {
        method: 'POST',
        headers,
        body,
        credentials: 'include',
        signal: controller.signal,
      })

    let res
    try {
      res = await postOnce()

      if (res.status === 401 || res.status === 403) {
        const refreshRes = await fetch('/api/auth/refresh', {
          method: 'POST',
          credentials: 'include',
          cache: 'no-store',
        })
        if (refreshRes.ok) {
          res = await postOnce()
        }
      }
    } catch (e) {
      if (e?.name === 'AbortError') throw new Error('Request timed out')
      throw e
    } finally {
      clearTimeout(timeoutId)
    }

    if (res.status === 409) {
      const json = await res.json()
      setConflicts(Array.isArray(json?.conflicts) ? json.conflicts : [])
      setShowConflicts(true)
      throw new Error('conflicts')
    }

    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      throw new Error(
        json?.message ||
          json?.error ||
          (res.status === 401 || res.status === 403
            ? 'Session expired. Please login again.'
            : `Failed to save results (${res.status})`)
      )
    }
    return res.json()
  }

  const syncQueue = async () => {
    if (!isOnline) return
    const queue = getQueue()
    if (queue.length === 0) return
    setSyncing(true)
    try {
      for (const item of queue) {
        await syncOnce(item.payload)
      }
      setQueue([])
      toast.success('Offline changes synced')
      broadcastResultsUpdated()
      await fetchPupilsAndResults()
    } catch (e) {
      if (String(e?.message || '') !== 'conflicts') toast.error('Sync failed')
    } finally {
      setSyncing(false)
    }
  }

  useEffect(() => {
    const onlineHandler = () => setIsOnline(true)
    const offlineHandler = () => setIsOnline(false)
    window.addEventListener('online', onlineHandler)
    window.addEventListener('offline', offlineHandler)
    return () => {
      window.removeEventListener('online', onlineHandler)
      window.removeEventListener('offline', offlineHandler)
    }
  }, [])

  useEffect(() => {
    const handler = () => syncQueue()
    window.addEventListener('online', handler)
    return () => window.removeEventListener('online', handler)
  }, [isOnline])

  const handleSave = async () => {
    if (!selectedTerm) {
      setTermError(true)
      toast.error('Select the term you are entering the results')
      return
    }
    const payload = buildPayload()
    if (!payload || !selectedAssignment) {
      toast.error('Select a class and subject')
      return
    }
    setTermError(false)

    setSaving(true)
    try {
      if (!isOnline) {
        enqueueOffline(payload)
        toast.success('Saved offline. Will sync when online.')
        return
      }

      const batches = chunkPayload(payload)
      let totalApplied = 0
      let totalSkipped = 0

      for (const batch of batches) {
        const result = await syncOnce(batch)
        totalApplied += Number(result?.applied || 0)
        totalSkipped += Number(result?.skippedNotAssigned || 0)
      }

      if (totalApplied === 0) {
        toast.error('No results were saved. Check class/subject assignment and try again.')
      } else if (totalSkipped > 0) {
        toast.success(
          `Saved ${totalApplied} result(s). Skipped ${totalSkipped} unassigned entries.`
        )
      } else {
        toast.success(`Saved ${totalApplied} result(s) successfully`)
      }
      broadcastResultsUpdated()
      await fetchPupilsAndResults()
    } catch (e) {
      const msg = String(e?.message || '')
      if (msg !== 'conflicts')
        toast.error(msg === 'Request timed out' ? msg : 'Failed to save results')
    } finally {
      setSaving(false)
    }
  }

  const getGradeInfo = (score) => {
    if (score === '' || score === undefined || score === null) return null
    const level = selectedAssignment?.classYearGroup || selectedAssignment?.className || 'form1'
    return calculateGrade(score, level)
  }

  return (
    <DashboardLayout title="Enter Results">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/dashboard/teacher">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-royalPurple-text1">Result Entry</h1>
              <p className="text-royalPurple-text2">Enter subject results for your classes</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={syncQueue} disabled={syncing || !isOnline}>
              {syncing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              Sync
            </Button>
            <Button onClick={handleSave} disabled={saving || !selectedAssignment}>
              {saving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label>Term</Label>
                <Select
                  value={selectedTerm}
                  onValueChange={(v) => {
                    setSelectedTerm(v)
                    if (v) setTermError(false)
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Term" />
                  </SelectTrigger>
                  <SelectContent>
                    {terms.map((term) => (
                      <SelectItem key={term} value={term}>
                        {term}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {termError && (
                  <div className="text-sm text-royalPurple-dangerTx">
                    Select the term you are entering the results
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label>Rapid Subject Switcher</Label>
                <Select value={selectedAssignmentId} onValueChange={setSelectedAssignmentId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Class + Subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {assignments.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.className} · {a.subjectName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <div className="text-sm text-royalPurple-text2">
                  {isOnline ? 'Online' : 'Offline (7+ days supported)'}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Student List */}
        {selectedAssignment ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                <span>
                  {selectedAssignment.className} - {selectedAssignment.subjectName}
                </span>
                <span className="text-sm font-normal text-royalPurple-text3">
                  {pupils.length} Pupils
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-royalPurple-accentTx" />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="zsms-table text-sm text-left">
                    <thead className="text-xs uppercase">
                      <tr>
                        <th className="px-4 py-3">Student ID</th>
                        <th className="px-4 py-3">Name</th>
                        <th className="px-4 py-3 w-32">Score (0-100)</th>
                        <th className="px-4 py-3">Grade</th>
                        <th className="px-4 py-3">Comment</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pupils.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="px-4 py-8 text-center text-royalPurple-text2">
                            No students enrolled in this class and subject.
                          </td>
                        </tr>
                      ) : (
                        pupils.map((student) => {
                          const score = scores[student.id]
                          const gradeInfo = getGradeInfo(score)
                          const scoreInputId = `score-${student.id}`

                          return (
                            <tr key={student.id}>
                              <td className="px-4 py-3 font-medium">
                                {student.exam_number || student.id}
                              </td>
                              <td className="px-4 py-3">{student.name}</td>
                              <td className="px-4 py-3">
                                <Label htmlFor={scoreInputId} className="sr-only">
                                  Score for {student.name}
                                </Label>
                                <Input
                                  type="number"
                                  id={scoreInputId}
                                  name={scoreInputId}
                                  min="0"
                                  max="100"
                                  value={score === undefined ? '' : score}
                                  onChange={(e) => handleScoreChange(student.id, e.target.value)}
                                  className="w-24"
                                  autoComplete="off"
                                  inputMode="numeric"
                                />
                              </td>
                              <td className="px-4 py-3">
                                {gradeInfo ? (
                                  <span
                                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                                  ${
                                    gradeInfo.color === 'green'
                                      ? 'bg-royalPurple-success text-royalPurple-successTx'
                                      : gradeInfo.color === 'blue'
                                        ? 'bg-royalPurple-accent text-royalPurple-accentTx'
                                        : gradeInfo.color === 'purple'
                                          ? 'bg-royalPurple-pill text-royalPurple-pillTx'
                                          : gradeInfo.color === 'yellow'
                                            ? 'bg-warn/20 text-g-800'
                                            : 'bg-royalPurple-danger text-royalPurple-dangerTx'
                                  }`}
                                  >
                                    {gradeInfo.grade} - {gradeInfo.status}
                                  </span>
                                ) : (
                                  <span className="text-royalPurple-text3">-</span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-royalPurple-text3 italic">
                                {gradeInfo?.description || '-'}
                              </td>
                              <td className="px-4 py-3 text-right">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => deleteResult(student.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </td>
                            </tr>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-royalPurple-text3">
            <AlertCircle className="h-12 w-12 mb-4 text-royalPurple-text3" />
            <p className="text-lg font-medium">No teaching assignments found</p>
          </div>
        )}
      </div>

      {showConflicts && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-royalPurple-deep/80">
          <div className="bg-royalPurple-card rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-semibold text-royalPurple-text1">Sync Conflicts</h3>
              <Button variant="outline" onClick={() => setShowConflicts(false)}>
                Close
              </Button>
            </div>
            <div className="p-4 space-y-3">
              {conflicts.length === 0 ? (
                <p className="text-sm text-royalPurple-text2">No conflicts.</p>
              ) : (
                conflicts.map((c, idx) => (
                  <div key={idx} className="border rounded-lg p-3">
                    <div className="text-sm font-medium text-royalPurple-text1">
                      {c.key?.studentId}
                    </div>
                    <div className="text-sm text-royalPurple-text2">
                      Server: {c.server?.score} (updated{' '}
                      {new Date(c.server?.updatedAt).toLocaleString()})
                    </div>
                    <div className="text-sm text-royalPurple-text2">Yours: {c.client?.score}</div>
                    <div className="flex gap-2 mt-3">
                      <Button
                        onClick={async () => {
                          try {
                            const payload = buildPayload()
                            if (!payload) return
                            payload.results = payload.results.map((r) => {
                              if (
                                r.studentId === c.key.studentId &&
                                r.subjectId === c.key.subjectId &&
                                r.term === c.key.term &&
                                r.year === c.key.year
                              ) {
                                return { ...r, resolution: 'keep_latest' }
                              }
                              return r
                            })
                            await syncOnce(payload)
                            setShowConflicts(false)
                            setConflicts([])
                            toast.success('Applied your changes')
                            await fetchPupilsAndResults()
                          } catch {
                            toast.error('Failed to resolve conflict')
                          }
                        }}
                      >
                        Keep Latest
                      </Button>
                      <Button
                        variant="outline"
                        onClick={async () => {
                          try {
                            const payload = buildPayload()
                            if (!payload) return
                            payload.results = payload.results.map((r) => {
                              if (
                                r.studentId === c.key.studentId &&
                                r.subjectId === c.key.subjectId &&
                                r.term === c.key.term &&
                                r.year === c.key.year
                              ) {
                                return { ...r, resolution: 'keep_server' }
                              }
                              return r
                            })
                            await syncOnce(payload)
                            setShowConflicts(false)
                            setConflicts([])
                            toast.success('Kept server version')
                            await fetchPupilsAndResults()
                          } catch {
                            toast.error('Failed to resolve conflict')
                          }
                        }}
                      >
                        Keep Server
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
