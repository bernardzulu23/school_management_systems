'use client'

import { useEffect, useState } from 'react'
import { ECZ_SBA_TASK_TYPES } from '@/lib/ecz/ecz-reference-constants'

export function EczReferencePanel() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/ecz/reference', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => setData(json))
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <p className="text-sm text-muted-foreground">Loading ECSEOL reference…</p>
  if (!data) return <p className="text-sm text-red-600">Could not load reference data.</p>

  return (
    <div className="space-y-6">
      <section>
        <h3 className="font-semibold text-royalPurple-text1 mb-2">Command terms (ECSEOL §2.4)</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border border-royalPurple-border rounded-lg">
            <thead>
              <tr className="bg-royalPurple-card2">
                <th className="text-left p-2">Term</th>
                <th className="text-left p-2">Meaning</th>
                <th className="text-left p-2">Example</th>
              </tr>
            </thead>
            <tbody>
              {(data.commandTerms || []).map((row) => (
                <tr key={row.term} className="border-t border-royalPurple-border/50">
                  <td className="p-2 font-medium">{row.term}</td>
                  <td className="p-2">{row.meaning}</td>
                  <td className="p-2 text-muted-foreground">{row.example}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h3 className="font-semibold text-royalPurple-text1 mb-2">Bloom targets (final exams)</h3>
        <ul className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
          {Object.entries(data.bloomTargets || {}).map(([level, t]) => (
            <li key={level} className="rounded border border-royalPurple-border px-3 py-2">
              <span className="font-medium">{level}</span>: {t.min}–{t.max}%
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h3 className="font-semibold text-royalPurple-text1 mb-2">SBA task types</h3>
        <div className="flex flex-wrap gap-2">
          {(data.sbaTaskTypes || ECZ_SBA_TASK_TYPES).map((t) => (
            <span
              key={t}
              className="text-xs rounded-full border border-royalPurple-border px-3 py-1"
            >
              {t}
            </span>
          ))}
        </div>
      </section>
    </div>
  )
}
