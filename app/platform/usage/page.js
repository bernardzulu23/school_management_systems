'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { PlatformShell } from '@/components/platform/PlatformShell'
import { sessionFetch } from '@/lib/auth/sessionFetch'

function KpiCard({ label, value }) {
  return (
    <div className="border-2 border-ink bg-white p-4 shadow-[3px_3px_0_#111111]">
      <p className="text-xs text-muted uppercase tracking-wide">{label}</p>
      <p className="text-3xl font-bold text-ink mt-1">{value}</p>
    </div>
  )
}

function statusClass(status) {
  const map = {
    active: 'bg-emerald-100 text-emerald-800',
    trial: 'bg-amber-100 text-amber-900',
    expired: 'bg-red-100 text-red-800',
    not_affiliated: 'bg-paper text-muted',
  }
  return map[status] || map.not_affiliated
}

export default function PlatformSchoolUsagePage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [includeInactive, setIncludeInactive] = useState(false)
  const [search, setSearch] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const qs = new URLSearchParams()
      if (includeInactive) qs.set('includeInactive', '1')
      const res = await sessionFetch(`/api/platform/stats/school-usage?${qs}`, {
        cache: 'no-store',
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to load usage stats')
      setData(json.data)
    } catch (e) {
      toast.error(e.message || 'Failed to load')
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [includeInactive])

  useEffect(() => {
    load()
  }, [load])

  const schools = useMemo(() => {
    const rows = data?.schools || []
    const q = search.trim().toLowerCase()
    if (!q) return rows
    return rows.filter(
      (s) =>
        String(s.name || '')
          .toLowerCase()
          .includes(q) ||
        String(s.subdomain || '')
          .toLowerCase()
          .includes(q) ||
        String(s.province || '')
          .toLowerCase()
          .includes(q)
    )
  }, [data, search])

  return (
    <PlatformShell title="School usage">
      <p className="text-sm text-muted mb-4 max-w-3xl">
        Aggregate counts only — how many students and teachers each school has added. No names,
        grades, attendance, or other tenant data.
      </p>

      <div className="mb-4 flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={includeInactive}
            onChange={(e) => setIncludeInactive(e.target.checked)}
          />
          Include suspended schools
        </label>
        <input
          type="search"
          placeholder="Search school, subdomain, province…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-ink/30 rounded px-3 py-2 text-sm min-w-[240px]"
        />
      </div>

      {loading ? (
        <p className="text-muted">Loading usage stats…</p>
      ) : !data ? (
        <p className="text-muted">No data available.</p>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard label="Schools listed" value={data.totals.schools} />
            <KpiCard label="Students (all schools)" value={data.totals.students} />
            <KpiCard label="Teachers (all schools)" value={data.totals.teachers} />
            <KpiCard label="Combined records" value={data.totals.students + data.totals.teachers} />
          </div>

          {schools.length === 0 ? (
            <div className="border-2 border-ink bg-white p-10 text-center shadow-[4px_4px_0_#111111]">
              <p className="text-ink">No schools match your search.</p>
            </div>
          ) : (
            <div className="overflow-x-auto border-2 border-ink bg-white shadow-[4px_4px_0_#111111]">
              <table className="w-full text-sm min-w-[720px]">
                <thead className="bg-ink text-paper text-left">
                  <tr>
                    <th className="px-4 py-3 font-medium">School</th>
                    <th className="px-4 py-3 font-medium">Subdomain</th>
                    <th className="px-4 py-3 font-medium">Province</th>
                    <th className="px-4 py-3 font-medium text-right">Students</th>
                    <th className="px-4 py-3 font-medium text-right">Teachers</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {schools.map((s) => (
                    <tr key={s.id} className="border-t border-ink/10 hover:bg-paper">
                      <td className="px-4 py-3 font-medium text-ink">{s.name}</td>
                      <td className="px-4 py-3 text-muted font-mono text-xs">{s.subdomain}</td>
                      <td className="px-4 py-3 text-muted">{s.province || '—'}</td>
                      <td className="px-4 py-3 text-right font-semibold tabular-nums">
                        {s.studentCount}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold tabular-nums">
                        {s.teacherCount}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${statusClass(s.subscriptionStatus)}`}
                        >
                          {!s.active ? 'suspended' : s.subscriptionStatus}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </PlatformShell>
  )
}
