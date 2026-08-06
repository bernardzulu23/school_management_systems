'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { FileText, Download, Printer, Search, Loader2, IdCard } from 'lucide-react'
import toast from 'react-hot-toast'
import { listTrackedResultTypes } from '@/lib/results/resultTypes'

function buildQuery({ term, year, resultType }) {
  const params = new URLSearchParams()
  if (term) params.set('term', term)
  if (year) params.set('year', String(year))
  if (resultType) params.set('resultType', resultType)
  return params.toString()
}

async function downloadCard(studentId, format, filters) {
  const qs = buildQuery(filters)
  const url = `/api/dashboard/results/cards/${encodeURIComponent(studentId)}?format=${format}${qs ? `&${qs}` : ''}`
  const res = await fetch(url, { credentials: 'include' })
  if (!res.ok) {
    const json = await res.json().catch(() => ({}))
    throw new Error(json.error || `Failed to export ${format.toUpperCase()}`)
  }
  const blob = await res.blob()
  const disposition = res.headers.get('Content-Disposition') || ''
  const match = disposition.match(/filename="?([^"]+)"?/i)
  const filename = match?.[1] || `ResultCard.${format === 'word' ? 'docx' : format}`
  const objectUrl = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = objectUrl
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(objectUrl)
}

/**
 * Admin panel: create printable/shareable student result cards (PDF / DOCX / print).
 * Cards include assessment results only — never teacher names.
 */
export function StudentResultCardPanel({ initialStudentId = '', initialStudentName = '' }) {
  const [q, setQ] = useState(initialStudentName || '')
  const [students, setStudents] = useState([])
  const [loadingList, setLoadingList] = useState(false)
  const [selectedId, setSelectedId] = useState(initialStudentId || '')
  const [term, setTerm] = useState('')
  const [year, setYear] = useState('')
  const [resultType, setResultType] = useState('')
  const [preview, setPreview] = useState(null)
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [exporting, setExporting] = useState(null)

  const resultTypeOptions = useMemo(() => listTrackedResultTypes([]), [])
  const yearOptions = useMemo(() => {
    const y = new Date().getFullYear()
    return [y, y - 1, y - 2]
  }, [])

  const filters = useMemo(() => ({ term, year, resultType }), [term, year, resultType])

  useEffect(() => {
    let cancelled = false
    const t = setTimeout(async () => {
      setLoadingList(true)
      try {
        const params = new URLSearchParams()
        if (q.trim()) params.set('q', q.trim())
        params.set('limit', '40')
        const res = await fetch(`/api/dashboard/results/cards?${params}`, {
          credentials: 'include',
        })
        const json = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(json.error || 'Failed to load students')
        if (!cancelled) setStudents(json.students || [])
      } catch (e) {
        if (!cancelled) {
          setStudents([])
          toast.error(e.message || 'Failed to load students')
        }
      } finally {
        if (!cancelled) setLoadingList(false)
      }
    }, 250)
    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [q])

  useEffect(() => {
    if (!selectedId) {
      setPreview(null)
      return
    }
    let cancelled = false
    ;(async () => {
      setLoadingPreview(true)
      try {
        const qs = buildQuery(filters)
        const res = await fetch(
          `/api/dashboard/results/cards/${encodeURIComponent(selectedId)}?format=json${qs ? `&${qs}` : ''}`,
          { credentials: 'include' }
        )
        const json = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(json.error || 'Failed to load result card')
        if (!cancelled) setPreview(json.card || null)
      } catch (e) {
        if (!cancelled) {
          setPreview(null)
          toast.error(e.message || 'Failed to load preview')
        }
      } finally {
        if (!cancelled) setLoadingPreview(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [selectedId, filters])

  const onExport = async (format) => {
    if (!selectedId) {
      toast.error('Select a student first')
      return
    }
    setExporting(format)
    try {
      if (format === 'print') {
        const qs = buildQuery(filters)
        const url = `/api/dashboard/results/cards/${encodeURIComponent(selectedId)}?format=print${qs ? `&${qs}` : ''}`
        window.open(url, '_blank', 'noopener,noreferrer')
        toast.success('Print view opened')
        return
      }
      await downloadCard(selectedId, format, filters)
      toast.success(`Result card downloaded (${format.toUpperCase()})`)
    } catch (e) {
      toast.error(e.message || 'Export failed')
    } finally {
      setExporting(null)
    }
  }

  const selected = students.find((s) => s.id === selectedId)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-royalPurple-text1">
          <IdCard className="h-5 w-5" />
          Student result cards
        </CardTitle>
        <p className="text-sm text-royalPurple-text2">
          Create a printable card for all entered results for a student. PDF and Word exports
          include scores and grades only — teacher names are never shown.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <label className="block text-sm font-medium text-royalPurple-text2 mb-1">
              Find student
            </label>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-royalPurple-text3" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search name, class, or exam number"
                className="w-full pl-8 p-2 border border-royalPurple-border rounded-md bg-royalPurple-card"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-royalPurple-text2 mb-1">Term</label>
            <select
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              className="w-full p-2 border border-royalPurple-border rounded-md bg-royalPurple-card"
            >
              <option value="">All terms</option>
              <option value="Term 1">Term 1</option>
              <option value="Term 2">Term 2</option>
              <option value="Term 3">Term 3</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-royalPurple-text2 mb-1">Year</label>
            <select
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className="w-full p-2 border border-royalPurple-border rounded-md bg-royalPurple-card"
            >
              <option value="">All years</option>
              {yearOptions.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2 lg:col-span-4">
            <label className="block text-sm font-medium text-royalPurple-text2 mb-1">
              Result type
            </label>
            <select
              value={resultType}
              onChange={(e) => setResultType(e.target.value)}
              className="w-full p-2 border border-royalPurple-border rounded-md bg-royalPurple-card"
            >
              <option value="">All entered types</option>
              {resultTypeOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="border border-royalPurple-border rounded-md max-h-64 overflow-y-auto">
            {loadingList ? (
              <p className="p-3 text-sm text-royalPurple-text3 flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading students…
              </p>
            ) : students.length === 0 ? (
              <p className="p-3 text-sm text-royalPurple-text3">
                No students with entered results found.
              </p>
            ) : (
              <ul className="divide-y divide-royalPurple-border">
                {students.map((s) => (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(s.id)}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-royalPurple-page ${
                        selectedId === s.id ? 'bg-royalPurple-page font-medium' : ''
                      }`}
                    >
                      <span className="text-royalPurple-text1">{s.name}</span>
                      <span className="block text-xs text-royalPurple-text3">
                        {s.class || 'No class'} · {s.resultCount} result
                        {s.resultCount === 1 ? '' : 's'}
                        {s.examNumber ? ` · Exam ${s.examNumber}` : ''}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="border border-royalPurple-border rounded-md p-3 min-h-[16rem]">
            {!selectedId ? (
              <p className="text-sm text-royalPurple-text3">
                Select a student to preview their card.
              </p>
            ) : loadingPreview ? (
              <p className="text-sm text-royalPurple-text3 flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Building preview…
              </p>
            ) : !preview ? (
              <p className="text-sm text-royalPurple-text3">No preview available.</p>
            ) : (
              <div className="space-y-3 text-sm">
                <div>
                  <p className="font-semibold text-royalPurple-text1">{preview.student?.name}</p>
                  <p className="text-royalPurple-text2">
                    {preview.student?.class || 'N/A'}
                    {preview.summary?.overallAverage != null
                      ? ` · Overall ${preview.summary.overallAverage}%`
                      : ''}
                    {` · ${preview.summary?.totalResults || 0} result(s)`}
                  </p>
                </div>
                <div className="max-h-40 overflow-y-auto space-y-2">
                  {(preview.groups || []).map((g) => (
                    <div key={`${g.year}-${g.term}-${g.resultType}`}>
                      <p className="font-medium text-royalPurple-text1">
                        {g.term} {g.year} — {g.resultTypeLabel}
                      </p>
                      <ul className="text-xs text-royalPurple-text2 pl-2">
                        {g.rows.slice(0, 8).map((r) => (
                          <li key={r.id}>
                            {r.subject}: {r.score ?? '—'}% ({r.grade || '—'})
                          </li>
                        ))}
                        {g.rows.length > 8 ? <li>…and {g.rows.length - 8} more</li> : null}
                      </ul>
                    </div>
                  ))}
                  {(preview.groups || []).length === 0 ? (
                    <p className="text-royalPurple-text3">No results for these filters.</p>
                  ) : null}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button size="sm" disabled={!selectedId || !!exporting} onClick={() => onExport('pdf')}>
            {exporting === 'pdf' ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            PDF
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={!selectedId || !!exporting}
            onClick={() => onExport('docx')}
          >
            {exporting === 'docx' ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <FileText className="h-4 w-4 mr-2" />
            )}
            Word (DOCX)
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={!selectedId || !!exporting}
            onClick={() => onExport('print')}
          >
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
