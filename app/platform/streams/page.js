'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { PlatformShell } from '@/components/platform/PlatformShell'
import toast from 'react-hot-toast'

export default function PlatformStreamsPage() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/platform/stats/streams', { cache: 'no-store' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to load')
      setRows(json.data || [])
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
    <PlatformShell title="Reporting streams">
      <p className="text-sm text-muted mb-6 max-w-2xl">
        Each stream groups schools in the same province and district for monitoring and reporting.
        Future province and district admins will manage schools within their stream only.
      </p>
      {loading ? (
        <p className="text-muted">Loading…</p>
      ) : (
        <div className="overflow-x-auto border-2 border-ink bg-white shadow-[4px_4px_0_#111111]">
          <table className="w-full text-sm">
            <thead className="bg-ink text-paper text-left">
              <tr>
                <th className="px-4 py-3">Stream</th>
                <th className="px-4 py-3">Schools</th>
                <th className="px-4 py-3">Active</th>
                <th className="px-4 py-3">Trial</th>
                <th className="px-4 py-3">Expired</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.reportingStreamKey} className="border-t border-ink/10 hover:bg-paper">
                  <td className="px-4 py-3">
                    <div className="font-medium">{r.label}</div>
                    <div className="text-xs text-muted font-mono">{r.reportingStreamKey}</div>
                  </td>
                  <td className="px-4 py-3">{r.schoolCount}</td>
                  <td className="px-4 py-3">{r.active}</td>
                  <td className="px-4 py-3">{r.trial}</td>
                  <td className="px-4 py-3">{r.expired}</td>
                  <td className="px-4 py-3">
                    {r.reportingStreamKey !== 'unassigned' ? (
                      <Link
                        href={`/platform/dashboard?stream=${encodeURIComponent(r.reportingStreamKey)}`}
                        className="text-accent text-xs font-medium hover:underline"
                      >
                        View schools
                      </Link>
                    ) : (
                      <span className="text-muted text-xs">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PlatformShell>
  )
}
