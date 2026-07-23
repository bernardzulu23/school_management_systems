'use client'

import { Suspense, useCallback, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import toast from 'react-hot-toast'
import { PlatformShell } from '@/components/platform/PlatformShell'
import { ZAMBIA_PROVINCES } from '@/lib/platform/zambiaProvinces'
import { sessionFetch } from '@/lib/auth/sessionFetch'

function statusBadge(status) {
  const map = {
    active: 'bg-emerald-100 text-emerald-800 border border-emerald-800/20',
    trial: 'bg-amber-100 text-amber-900 border border-amber-800/20',
    expired: 'bg-red-100 text-red-800 border border-red-800/20',
    not_affiliated: 'bg-paper text-muted border border-ink/20',
  }
  return map[status] || map.not_affiliated
}

function PlatformDashboardContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const provinceFilter = searchParams?.get('province') || ''
  const districtFilter = searchParams?.get('district') || ''
  const streamFilter = searchParams?.get('stream') || ''

  const [schools, setSchools] = useState([])
  const [loading, setLoading] = useState(true)
  const [includeUnpaid, setIncludeUnpaid] = useState(true)
  const [editingId, setEditingId] = useState(null)
  const [editProvince, setEditProvince] = useState('')
  const [editDistrict, setEditDistrict] = useState('')
  const [deletingId, setDeletingId] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [pilotMonthsById, setPilotMonthsById] = useState({})
  const [extendingId, setExtendingId] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const qs = new URLSearchParams()
      if (includeUnpaid) qs.set('includeUnpaid', '1')
      if (provinceFilter) qs.set('province', provinceFilter)
      if (districtFilter) qs.set('district', districtFilter)
      if (streamFilter) qs.set('stream', streamFilter)
      const schoolsRes = await sessionFetch(`/api/platform/schools?${qs}`, { cache: 'no-store' })
      if (schoolsRes.status === 401) {
        router.replace('/login')
        return
      }
      const schoolsData = await schoolsRes.json()
      if (!schoolsRes.ok) {
        toast.error(schoolsData.error || 'Failed to load schools')
        return
      }
      setSchools(schoolsData.schools || [])
    } catch {
      toast.error('Failed to load platform data')
    } finally {
      setLoading(false)
    }
  }, [router, includeUnpaid, provinceFilter, districtFilter, streamFilter])

  useEffect(() => {
    load()
  }, [load])

  async function toggleActive(school) {
    try {
      const res = await sessionFetch(`/api/platform/schools/${school.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !school.active }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Update failed')
        return
      }
      toast.success(`${school.name} ${data.school.active ? 'activated' : 'suspended'}`)
      load()
    } catch {
      toast.error('Update failed')
    }
  }

  async function extendPilot(school) {
    const months = Number(pilotMonthsById[school.id] || 2)
    if (!Number.isFinite(months) || months < 1 || months > 12) {
      toast.error('Choose 1–12 months')
      return
    }
    setExtendingId(school.id)
    try {
      const res = await sessionFetch(`/api/platform/schools/${school.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ extendPilotMonths: months }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data.error || 'Could not extend pilot')
        return
      }
      const ends = data?.school?.trialEndsAt
        ? new Date(data.school.trialEndsAt).toLocaleDateString('en-GB')
        : 'updated'
      toast.success(`Pilot extended by ${months} month${months === 1 ? '' : 's'} · ends ${ends}`)
      load()
    } catch {
      toast.error('Could not extend pilot')
    } finally {
      setExtendingId(null)
    }
  }

  function formatTrialEnd(school) {
    if (!school?.trialEndsAt) return '—'
    try {
      return new Date(school.trialEndsAt).toLocaleDateString('en-GB')
    } catch {
      return '—'
    }
  }

  async function saveProvince(school) {
    try {
      const res = await sessionFetch(`/api/platform/schools/${school.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ province: editProvince, district: editDistrict }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Update failed')
        return
      }
      toast.success('Location updated')
      setEditingId(null)
      load()
    } catch {
      toast.error('Update failed')
    }
  }

  async function deleteSchool(school) {
    if (deleteConfirm !== school.subdomain) {
      toast.error('Type the subdomain exactly to confirm deletion')
      return
    }
    try {
      const res = await sessionFetch(`/api/platform/schools/${school.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Delete failed')
        return
      }
      toast.success(`${school.name} deleted permanently`)
      setDeletingId(null)
      setDeleteConfirm('')
      load()
    } catch {
      toast.error('Delete failed')
    }
  }

  return (
    <PlatformShell
      title={
        streamFilter
          ? 'Schools — reporting stream'
          : districtFilter
            ? `Schools — ${provinceFilter || '?'}, ${districtFilter}`
            : provinceFilter
              ? `Schools — ${provinceFilter}`
              : 'Schools'
      }
    >
      <div className="mb-4 flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={includeUnpaid}
            onChange={(e) => setIncludeUnpaid(e.target.checked)}
          />
          Include unpaid / inactive
        </label>
        {provinceFilter || districtFilter || streamFilter ? (
          <button
            type="button"
            onClick={() => router.push('/platform/dashboard')}
            className="text-sm text-accent hover:underline"
          >
            Clear filters
          </button>
        ) : null}
      </div>

      {loading ? (
        <p className="text-muted">Loading schools…</p>
      ) : schools.length === 0 ? (
        <div className="border-2 border-ink bg-white p-10 text-center shadow-[4px_4px_0_#111111]">
          <p className="text-ink">No schools match this filter.</p>
        </div>
      ) : (
        <div className="overflow-x-auto border-2 border-ink bg-white shadow-[4px_4px_0_#111111]">
          <table className="w-full text-sm">
            <thead className="bg-ink text-paper text-left">
              <tr>
                <th className="px-4 py-3 font-medium">School</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Subdomain</th>
                <th className="px-4 py-3 font-medium">Location</th>
                <th className="px-4 py-3 font-medium">Creator contact</th>
                <th className="px-4 py-3 font-medium">Plan</th>
                <th className="px-4 py-3 font-medium">Pilot / trial end</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {schools.map((s) => (
                <tr key={s.id} className="border-t border-ink/10 hover:bg-paper align-top">
                  <td className="px-4 py-3 text-ink font-medium">{s.name}</td>
                  <td className="px-4 py-3 text-muted text-xs uppercase">
                    {s.schoolType === 'INDIVIDUAL' ? 'Individual' : 'School'}
                  </td>
                  <td className="px-4 py-3 text-muted">{s.subdomain}</td>
                  <td className="px-4 py-3">
                    {editingId === s.id ? (
                      <div className="space-y-1">
                        <select
                          className="border border-ink/30 rounded px-2 py-1 text-xs w-full"
                          value={editProvince}
                          onChange={(e) => setEditProvince(e.target.value)}
                        >
                          <option value="">— Province —</option>
                          {ZAMBIA_PROVINCES.map((p) => (
                            <option key={p} value={p}>
                              {p}
                            </option>
                          ))}
                        </select>
                        <input
                          className="border border-ink/30 rounded px-2 py-1 text-xs w-full"
                          placeholder="District"
                          value={editDistrict}
                          onChange={(e) => setEditDistrict(e.target.value)}
                        />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => saveProvince(s)}
                            className="text-xs text-accent font-medium"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="text-xs text-muted"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <span>{s.province || '—'}</span>
                        {s.district ? (
                          <span className="block text-xs text-muted">{s.district}</span>
                        ) : null}
                        {s.reportingStreamKey ? (
                          <span className="block text-xs text-muted font-mono truncate max-w-[140px]">
                            {s.reportingStreamKey}
                          </span>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(s.id)
                            setEditProvince(s.province || '')
                            setEditDistrict(s.district || '')
                          }}
                          className="block text-xs text-accent hover:underline mt-1"
                        >
                          Edit
                        </button>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {s.creatorName ? (
                      <span className="block text-ink text-xs font-medium">{s.creatorName}</span>
                    ) : null}
                    {s.creatorPhone ? (
                      <a
                        href={`tel:${s.creatorPhone.replace(/\s/g, '')}`}
                        className="text-accent hover:underline text-sm"
                      >
                        {s.creatorPhone}
                      </a>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                    {s.creatorEmail ? (
                      <a
                        href={`mailto:${s.creatorEmail}`}
                        className="block text-xs text-muted hover:underline mt-0.5 truncate max-w-[180px]"
                      >
                        {s.creatorEmail}
                      </a>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-muted capitalize">{s.plan}</td>
                  <td className="px-4 py-3">
                    <p className="text-xs text-ink font-medium">{formatTrialEnd(s)}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <select
                        className="border border-ink/30 rounded px-2 py-1 text-xs"
                        value={String(pilotMonthsById[s.id] || 2)}
                        onChange={(e) =>
                          setPilotMonthsById((prev) => ({
                            ...prev,
                            [s.id]: Number(e.target.value),
                          }))
                        }
                        aria-label={`Extend pilot months for ${s.name}`}
                      >
                        {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                          <option key={m} value={m}>
                            +{m} month{m === 1 ? '' : 's'}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => extendPilot(s)}
                        disabled={extendingId === s.id}
                        className="text-xs font-semibold text-accent hover:underline disabled:opacity-50"
                      >
                        {extendingId === s.id ? 'Extending…' : 'Extend pilot'}
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${statusBadge(s.subscriptionStatus)}`}
                    >
                      {s.subscriptionStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={() => toggleActive(s)}
                        className="text-xs text-accent hover:underline font-medium text-left"
                      >
                        {s.active ? 'Suspend' : 'Activate'}
                      </button>
                      {deletingId === s.id ? (
                        <div className="space-y-2 rounded border border-red-200 bg-red-50 p-2">
                          <p className="text-xs text-red-800">
                            Type <strong>{s.subdomain}</strong> to permanently delete this tenant
                            and all data.
                          </p>
                          <input
                            className="border border-red-300 rounded px-2 py-1 text-xs w-full"
                            placeholder={s.subdomain}
                            value={deleteConfirm}
                            onChange={(e) => setDeleteConfirm(e.target.value)}
                          />
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => deleteSchool(s)}
                              className="text-xs text-red-700 font-medium"
                            >
                              Delete forever
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setDeletingId(null)
                                setDeleteConfirm('')
                              }}
                              className="text-xs text-muted"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setDeletingId(s.id)
                            setDeleteConfirm('')
                          }}
                          className="text-xs text-red-700 hover:underline font-medium text-left"
                        >
                          Delete
                        </button>
                      )}
                    </div>
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

export default function PlatformDashboardPage() {
  return (
    <Suspense
      fallback={
        <PlatformShell title="Schools">
          <p className="text-muted">Loading…</p>
        </PlatformShell>
      }
    >
      <PlatformDashboardContent />
    </Suspense>
  )
}
