'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { PlatformShell } from '@/components/platform/PlatformShell'
import { sessionFetch } from '@/lib/auth/sessionFetch'

function formatSeen(iso) {
  if (!iso) return 'Never'
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return String(iso)
  }
}

export default function PlatformSmsGatewayPage() {
  const router = useRouter()
  const [schools, setSchools] = useState([])
  const [gateways, setGateways] = useState([])
  const [loadingSchools, setLoadingSchools] = useState(true)
  const [loadingGateways, setLoadingGateways] = useState(true)

  const [schoolId, setSchoolId] = useState('')
  const [deviceName, setDeviceName] = useState('')
  const [enableForSchool, setEnableForSchool] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  /** Shown once after register — React state only; never persisted to browser storage. */
  const [issuedToken, setIssuedToken] = useState(null)
  const [issuedMeta, setIssuedMeta] = useState(null)

  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  const [editActive, setEditActive] = useState(true)
  const [editEnableSchool, setEditEnableSchool] = useState(false)
  const [savingEdit, setSavingEdit] = useState(false)
  const [deletingId, setDeletingId] = useState(null)

  const loadSchools = useCallback(async () => {
    setLoadingSchools(true)
    try {
      const qs = new URLSearchParams({ includeUnpaid: '1' })
      const res = await sessionFetch(`/api/platform/schools?${qs}`, { cache: 'no-store' })
      if (res.status === 401 || res.status === 403) {
        router.replace('/login')
        return
      }
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Failed to load schools')
        return
      }
      setSchools(data.schools || [])
    } catch {
      toast.error('Failed to load schools')
    } finally {
      setLoadingSchools(false)
    }
  }, [router])

  const loadGateways = useCallback(async () => {
    setLoadingGateways(true)
    try {
      const res = await sessionFetch('/api/admin/sms-gateway-status', { cache: 'no-store' })
      if (res.status === 401 || res.status === 403) {
        router.replace('/login')
        return
      }
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Failed to load gateways')
        return
      }
      setGateways(data.gateways || [])
    } catch {
      toast.error('Failed to load gateways')
    } finally {
      setLoadingGateways(false)
    }
  }, [router])

  useEffect(() => {
    loadSchools()
    loadGateways()
  }, [loadSchools, loadGateways])

  /** Status API returns the full fleet; filter to the selected school in the UI. */
  const schoolGateways = useMemo(() => {
    if (!schoolId) return []
    return gateways.filter((g) => g.schoolId === schoolId)
  }, [gateways, schoolId])

  const schoolCustomEnabled = useMemo(() => {
    const first = schoolGateways[0]
    return Boolean(first?.customGatewayEnabled)
  }, [schoolGateways])

  function startEdit(g) {
    setEditingId(g.id)
    setEditName(g.deviceName || '')
    setEditActive(Boolean(g.isActive))
    setEditEnableSchool(Boolean(g.customGatewayEnabled))
  }

  function cancelEdit() {
    setEditingId(null)
    setEditName('')
    setEditActive(true)
    setEditEnableSchool(false)
  }

  async function onSubmit(e) {
    e.preventDefault()
    if (!schoolId) {
      toast.error('Select a school')
      return
    }
    if (!deviceName.trim()) {
      toast.error('Enter a device name')
      return
    }

    setSubmitting(true)
    setIssuedToken(null)
    setIssuedMeta(null)
    try {
      const res = await sessionFetch('/api/sms/gateway/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolId,
          deviceName: deviceName.trim(),
          enableForSchool,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data.error || 'Registration failed')
        return
      }

      const token = String(data.deviceToken || '')
      if (!token) {
        toast.error('No device token returned')
        return
      }

      setIssuedToken(token)
      setIssuedMeta({
        deviceName: data.gateway?.deviceName || deviceName.trim(),
        schoolName: data.gateway?.schoolName || '',
        enabled: Boolean(data.customGatewayEnabled),
      })
      setDeviceName('')
      setEnableForSchool(false)
      toast.success('Gateway registered — copy the token now')
      loadGateways()
    } catch {
      toast.error('Registration failed')
    } finally {
      setSubmitting(false)
    }
  }

  async function saveEdit(e) {
    e.preventDefault()
    if (!editingId || !schoolId) return
    if (!editName.trim()) {
      toast.error('Device name cannot be empty')
      return
    }

    setSavingEdit(true)
    try {
      const res = await sessionFetch(`/api/sms/gateway/${editingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolId,
          deviceName: editName.trim(),
          isActive: editActive,
          enableForSchool: editEnableSchool,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data.error || 'Update failed')
        return
      }
      toast.success('Gateway updated')
      cancelEdit()
      loadGateways()
    } catch {
      toast.error('Update failed')
    } finally {
      setSavingEdit(false)
    }
  }

  async function revokeGateway(g) {
    if (!schoolId) return
    const ok = window.confirm(
      `Revoke gateway “${g.deviceName}”? The pairing token will stop working. Re-register to issue a new token.`
    )
    if (!ok) return

    setDeletingId(g.id)
    try {
      const qs = new URLSearchParams({ schoolId })
      const res = await sessionFetch(`/api/sms/gateway/${g.id}?${qs}`, {
        method: 'DELETE',
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data.error || 'Revoke failed')
        return
      }
      if (editingId === g.id) cancelEdit()
      toast.success('Gateway revoked')
      loadGateways()
    } catch {
      toast.error('Revoke failed')
    } finally {
      setDeletingId(null)
    }
  }

  async function copyToken() {
    if (!issuedToken) return
    try {
      await navigator.clipboard.writeText(issuedToken)
      toast.success('Token copied')
    } catch {
      toast.error('Could not copy — select and copy manually')
    }
  }

  return (
    <PlatformShell title="SMS Gateway">
      <div className="space-y-8 max-w-3xl">
        <p className="text-sm text-muted">
          Register, update, or revoke physical Android phones used as SIM SMS bridges. Copy the
          pairing token into the ZSMS Gateway app when registering. Leave &quot;Enable for this
          school&quot; unchecked until Day-4 staged rollout. To rotate a token, revoke the device
          and register again.
        </p>

        <form
          onSubmit={onSubmit}
          className="border-2 border-ink bg-white p-6 shadow-[4px_4px_0_#111111] space-y-4"
        >
          <h2 className="font-semibold text-ink">Register device</h2>

          <label className="block space-y-1">
            <span className="text-xs uppercase tracking-wide text-muted">School</span>
            <select
              className="w-full border-2 border-ink bg-paper px-3 py-2 text-sm"
              value={schoolId}
              onChange={(e) => {
                setSchoolId(e.target.value)
                cancelEdit()
              }}
              disabled={loadingSchools || submitting}
              required
            >
              <option value="">{loadingSchools ? 'Loading schools…' : 'Select a school'}</option>
              {schools.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                  {s.subdomain ? ` (${s.subdomain})` : ''}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-1">
            <span className="text-xs uppercase tracking-wide text-muted">Device name</span>
            <input
              type="text"
              className="w-full border-2 border-ink bg-paper px-3 py-2 text-sm"
              placeholder="Front office Samsung"
              value={deviceName}
              onChange={(e) => setDeviceName(e.target.value)}
              disabled={submitting}
              required
            />
          </label>

          <label className="flex items-start gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              className="mt-1"
              checked={enableForSchool}
              onChange={(e) => setEnableForSchool(e.target.checked)}
              disabled={submitting}
            />
            <span>
              <span className="font-medium text-ink">Enable for this school now</span>
              <span className="block text-xs text-muted mt-0.5">
                Off by default. When on, outbound SMS for this school queues to the Android gateway
                instead of Africala/Mocean.
              </span>
            </span>
          </label>

          <button
            type="submit"
            disabled={submitting || loadingSchools}
            className="border-2 border-ink bg-accent text-paper px-4 py-2 text-sm font-semibold shadow-[2px_2px_0_#111111] disabled:opacity-50"
          >
            {submitting ? 'Registering…' : 'Register gateway'}
          </button>
        </form>

        {issuedToken ? (
          <div className="border-2 border-amber-700 bg-amber-50 p-6 shadow-[4px_4px_0_#111111] space-y-3">
            <p className="font-semibold text-amber-950">Device token — copy now</p>
            <p className="text-sm text-amber-900">
              This token will not be shown again — copy it now before leaving this page.
              {issuedMeta?.schoolName ? ` Registered for ${issuedMeta.schoolName}` : ''}
              {issuedMeta?.deviceName ? ` (${issuedMeta.deviceName})` : ''}.
              {issuedMeta?.enabled
                ? ' Custom gateway is enabled for this school.'
                : ' Custom gateway flag left off — enable later when ready.'}
            </p>
            <pre className="bg-white border-2 border-ink p-3 text-xs break-all whitespace-pre-wrap font-mono">
              {issuedToken}
            </pre>
            <button
              type="button"
              onClick={copyToken}
              className="border-2 border-ink bg-ink text-paper px-4 py-2 text-sm font-semibold"
            >
              Copy to clipboard
            </button>
          </div>
        ) : null}

        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h2 className="font-semibold text-ink">Gateways for selected school</h2>
              {schoolId && schoolGateways.length > 0 ? (
                <p className="text-xs text-muted mt-0.5">
                  School routing:{' '}
                  {schoolCustomEnabled ? 'custom gateway enabled' : 'custom gateway off'}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={loadGateways}
              className="text-xs border border-ink px-2 py-1 hover:bg-paper"
              disabled={loadingGateways || !schoolId}
            >
              Refresh
            </button>
          </div>

          {!schoolId ? (
            <p className="text-muted text-sm">Select a school to view its registered gateways.</p>
          ) : loadingGateways ? (
            <p className="text-muted text-sm">Loading…</p>
          ) : schoolGateways.length === 0 ? (
            <p className="text-muted text-sm">No gateways registered for this school yet.</p>
          ) : (
            <ul className="space-y-3">
              {schoolGateways.map((g) => (
                <li
                  key={g.id}
                  className="border-2 border-ink bg-white p-4 shadow-[2px_2px_0_#111111] text-sm"
                >
                  {editingId === g.id ? (
                    <form onSubmit={saveEdit} className="space-y-3">
                      <label className="block space-y-1">
                        <span className="text-xs uppercase tracking-wide text-muted">
                          Device name
                        </span>
                        <input
                          type="text"
                          className="w-full border-2 border-ink bg-paper px-3 py-2 text-sm"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          disabled={savingEdit}
                          required
                        />
                      </label>
                      <label className="flex items-start gap-2 text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          className="mt-1"
                          checked={editActive}
                          onChange={(e) => setEditActive(e.target.checked)}
                          disabled={savingEdit}
                        />
                        <span>
                          <span className="font-medium text-ink">Device active</span>
                          <span className="block text-xs text-muted mt-0.5">
                            Inactive devices cannot poll the queue or report status.
                          </span>
                        </span>
                      </label>
                      <label className="flex items-start gap-2 text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          className="mt-1"
                          checked={editEnableSchool}
                          onChange={(e) => setEditEnableSchool(e.target.checked)}
                          disabled={savingEdit}
                        />
                        <span>
                          <span className="font-medium text-ink">Enable for this school</span>
                          <span className="block text-xs text-muted mt-0.5">
                            School-level flag — applies to all gateways for this school.
                          </span>
                        </span>
                      </label>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="submit"
                          disabled={savingEdit}
                          className="border-2 border-ink bg-accent text-paper px-3 py-1.5 text-sm font-semibold disabled:opacity-50"
                        >
                          {savingEdit ? 'Saving…' : 'Save'}
                        </button>
                        <button
                          type="button"
                          onClick={cancelEdit}
                          disabled={savingEdit}
                          className="border-2 border-ink bg-white px-3 py-1.5 text-sm font-semibold disabled:opacity-50"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="font-medium text-ink">{g.deviceName}</p>
                          <p className="text-xs text-muted mt-0.5">
                            {g.schoolName}
                            {g.subdomain ? ` · ${g.subdomain}` : ''}
                          </p>
                        </div>
                        <span
                          className={`text-xs font-semibold uppercase px-2 py-0.5 border ${
                            g.phoneStatus === 'online'
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                              : 'bg-red-100 text-red-800 border-red-300'
                          }`}
                        >
                          {g.phoneStatus}
                          {!g.isActive ? ' · inactive' : ''}
                        </span>
                      </div>
                      <dl className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted">
                        <div>
                          <dt className="uppercase tracking-wide">Last seen</dt>
                          <dd className="text-ink">{formatSeen(g.lastSeenAt)}</dd>
                        </div>
                        <div>
                          <dt className="uppercase tracking-wide">Active</dt>
                          <dd className="text-ink">{g.isActive ? 'Yes' : 'No'}</dd>
                        </div>
                        <div>
                          <dt className="uppercase tracking-wide">Total sent</dt>
                          <dd className="text-ink">{g.totalSent}</dd>
                        </div>
                        <div>
                          <dt className="uppercase tracking-wide">Total failed</dt>
                          <dd className="text-ink">{g.totalFailed}</dd>
                        </div>
                        {g.last24h ? (
                          <div className="col-span-2">
                            <dt className="uppercase tracking-wide">Last 24h</dt>
                            <dd className="text-ink">
                              {g.last24h.sent} sent · {g.last24h.failed} failed ·{' '}
                              {g.last24h.pending} pending · {g.last24h.dispatched} dispatched
                            </dd>
                          </div>
                        ) : null}
                      </dl>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => startEdit(g)}
                          disabled={Boolean(deletingId)}
                          className="border border-ink px-3 py-1 text-xs font-semibold hover:bg-paper disabled:opacity-50"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => revokeGateway(g)}
                          disabled={deletingId === g.id}
                          className="border border-red-700 text-red-800 px-3 py-1 text-xs font-semibold hover:bg-red-50 disabled:opacity-50"
                        >
                          {deletingId === g.id ? 'Revoking…' : 'Revoke'}
                        </button>
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </PlatformShell>
  )
}
