'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { PlatformShell } from '@/components/platform/PlatformShell'
import toast from 'react-hot-toast'
import { sessionFetch } from '@/lib/auth/sessionFetch'

export default function PlatformProvincesPage() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await sessionFetch('/api/platform/stats/provinces', { cache: 'no-store' })
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
    <PlatformShell title="Provinces">
      {loading ? (
        <p className="text-muted">Loading…</p>
      ) : (
        <div className="overflow-x-auto border-2 border-ink bg-white shadow-[4px_4px_0_#111111]">
          <table className="w-full text-sm">
            <thead className="bg-ink text-paper text-left">
              <tr>
                <th className="px-4 py-3">Province</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Active</th>
                <th className="px-4 py-3">Trial</th>
                <th className="px-4 py-3">Expired</th>
                <th className="px-4 py-3">Suspended</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.province} className="border-t border-ink/10 hover:bg-paper">
                  <td className="px-4 py-3 font-medium">{r.province}</td>
                  <td className="px-4 py-3">{r.total}</td>
                  <td className="px-4 py-3">{r.active}</td>
                  <td className="px-4 py-3">{r.trial}</td>
                  <td className="px-4 py-3">{r.expired}</td>
                  <td className="px-4 py-3">{r.suspended}</td>
                  <td className="px-4 py-3">
                    {r.province !== 'Unspecified' ? (
                      <div className="flex flex-col gap-1">
                        <Link
                          href={`/platform/districts?province=${encodeURIComponent(r.province)}`}
                          className="text-accent text-xs font-medium hover:underline"
                        >
                          Districts
                        </Link>
                        <Link
                          href={`/platform/dashboard?province=${encodeURIComponent(r.province)}`}
                          className="text-accent text-xs font-medium hover:underline"
                        >
                          All schools
                        </Link>
                      </div>
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
