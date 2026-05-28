'use client'

import { Suspense, useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { PlatformShell } from '@/components/platform/PlatformShell'
import toast from 'react-hot-toast'

function DistrictsContent() {
  const searchParams = useSearchParams()
  const province = searchParams?.get('province') || ''
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const qs = province ? `?province=${encodeURIComponent(province)}` : ''
      const res = await fetch(`/api/platform/stats/districts${qs}`, { cache: 'no-store' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to load')
      setRows(json.data || [])
    } catch (e) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }, [province])

  useEffect(() => {
    load()
  }, [load])

  return (
    <PlatformShell title={province ? `Districts — ${province}` : 'Districts'}>
      <div className="mb-4">
        <Link href="/platform/provinces" className="text-sm text-accent hover:underline">
          ← All provinces
        </Link>
      </div>
      {loading ? (
        <p className="text-muted">Loading…</p>
      ) : (
        <div className="overflow-x-auto border-2 border-ink bg-white shadow-[4px_4px_0_#111111]">
          <table className="w-full text-sm">
            <thead className="bg-ink text-paper text-left">
              <tr>
                <th className="px-4 py-3">District</th>
                <th className="px-4 py-3">Province</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Active</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={`${r.province}-${r.district}`}
                  className="border-t border-ink/10 hover:bg-paper"
                >
                  <td className="px-4 py-3 font-medium">{r.district}</td>
                  <td className="px-4 py-3">{r.province}</td>
                  <td className="px-4 py-3">{r.total}</td>
                  <td className="px-4 py-3">{r.active}</td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/platform/dashboard?province=${encodeURIComponent(r.province)}&district=${encodeURIComponent(r.district)}`}
                      className="text-accent text-xs font-medium hover:underline"
                    >
                      View stream
                    </Link>
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

export default function PlatformDistrictsPage() {
  return (
    <Suspense
      fallback={
        <PlatformShell title="Districts">
          <p className="text-muted">Loading…</p>
        </PlatformShell>
      }
    >
      <DistrictsContent />
    </Suspense>
  )
}
