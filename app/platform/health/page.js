'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { PlatformShell } from '@/components/platform/PlatformShell'
import toast from 'react-hot-toast'

function StatusPill({ status }) {
  const map = {
    ok: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    warn: 'bg-amber-100 text-amber-900 border-amber-300',
    fail: 'bg-red-100 text-red-800 border-red-300',
  }
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded text-xs font-semibold border uppercase ${map[status] || map.warn}`}
    >
      {status}
    </span>
  )
}

export default function PlatformHealthPage() {
  const [checks, setChecks] = useState([])
  const [summary, setSummary] = useState(null)
  const [ragHealth, setRagHealth] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/platform/health', { cache: 'no-store' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to load')
      setChecks(json.checks || [])
      setSummary(json.summary)

      const ragRes = await fetch('/api/platform/health/rag', { cache: 'no-store' })
      const ragJson = await ragRes.json().catch(() => ({}))
      if (ragRes.ok) setRagHealth(ragJson)
    } catch (e) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return (
    <PlatformShell title="Platform health">
      {loading ? (
        <p className="text-muted">Running checks…</p>
      ) : (
        <div className="space-y-6">
          {summary ? (
            <p className="text-sm text-muted">
              {summary.ok} ok · {summary.warn} warnings · {summary.fail} failures
            </p>
          ) : null}
          {ragHealth ? (
            <div className="border-2 border-ink bg-white p-4 shadow-[2px_2px_0_#111111]">
              <p className="font-medium text-ink">RAG embeddings provider health</p>
              <p className="text-sm text-muted mt-1">
                {ragHealth.ragEmbeddingsConfigured
                  ? `Configured: ${ragHealth.configuredProviders.join(', ')}`
                  : 'Not configured'}
              </p>
              {ragHealth.recommendation ? (
                <p className="text-xs text-muted mt-1">{ragHealth.recommendation}</p>
              ) : null}
            </div>
          ) : null}
          <ul className="space-y-3">
            {checks.map((c) => (
              <li
                key={c.id}
                className="border-2 border-ink bg-white p-4 shadow-[2px_2px_0_#111111] flex flex-wrap items-start justify-between gap-3"
              >
                <div>
                  <p className="font-medium text-ink">{c.label}</p>
                  {c.hint ? <p className="text-sm text-muted mt-1">{c.hint}</p> : null}
                  {c.doc ? (
                    <Link
                      href={c.doc}
                      className="text-xs text-accent hover:underline mt-1 inline-block"
                    >
                      Documentation
                    </Link>
                  ) : null}
                </div>
                <StatusPill status={c.status} />
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted">
            See also{' '}
            <Link href="/docs/RLS.md" className="text-accent hover:underline">
              RLS
            </Link>
            ,{' '}
            <Link href="/docs/ORTOOLS_SOLVER.md" className="text-accent hover:underline">
              OR-Tools
            </Link>
            ,{' '}
            <Link href="/docs/USSD_GUIDE.md" className="text-accent hover:underline">
              USSD
            </Link>
            .
          </p>
        </div>
      )}
    </PlatformShell>
  )
}
