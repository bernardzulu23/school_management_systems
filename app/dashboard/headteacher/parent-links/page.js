'use client'

import { useCallback, useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import FormField from '@/components/forms/FormField'
import { sessionFetch } from '@/lib/auth/sessionFetch'
import toast from 'react-hot-toast'
import LoadingSpinner from '@/components/LoadingSpinner'

export default function AdminParentLinksPage() {
  const [links, setLinks] = useState([])
  const [relationships, setRelationships] = useState(['father', 'mother', 'guardian', 'other'])
  const [loading, setLoading] = useState(true)
  const [students, setStudents] = useState([])
  const [form, setForm] = useState({
    studentId: '',
    relationship: 'guardian',
    inviteEmail: '',
    invitePhone: '',
  })
  const [lastInvite, setLastInvite] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [linksRes, studentsRes] = await Promise.all([
        sessionFetch('/api/admin/parent-links'),
        sessionFetch('/api/students?limit=200'),
      ])
      const linksJson = await linksRes.json().catch(() => ({}))
      if (!linksRes.ok) throw new Error(linksJson.error || 'Failed to load links')
      setLinks(linksJson.links || [])
      if (linksJson.relationships) setRelationships(linksJson.relationships)

      const studentsJson = await studentsRes.json().catch(() => ({}))
      const list = studentsJson.students || studentsJson.data || []
      setStudents(Array.isArray(list) ? list : [])
    } catch (e) {
      toast.error(e.message || 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const createInvite = async (e) => {
    e.preventDefault()
    try {
      const res = await sessionFetch('/api/admin/parent-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Failed to create invite')
      setLastInvite(json.link)
      toast.success('Invite created')
      setForm((f) => ({ ...f, inviteEmail: '', invitePhone: '' }))
      load()
    } catch (err) {
      toast.error(err.message || 'Failed')
    }
  }

  const revoke = async (linkId) => {
    if (!window.confirm('Revoke this parent link?')) return
    try {
      const res = await sessionFetch('/api/admin/parent-links', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ linkId }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Failed to revoke')
      toast.success('Link revoked')
      load()
    } catch (err) {
      toast.error(err.message || 'Failed')
    }
  }

  const copyInvite = async () => {
    if (!lastInvite?.acceptPath) return
    const url =
      typeof window !== 'undefined'
        ? `${window.location.origin}${lastInvite.acceptPath}`
        : lastInvite.acceptPath
    try {
      await navigator.clipboard.writeText(url)
      toast.success('Invite link copied')
    } catch {
      toast.error('Could not copy — select the link manually')
    }
  }

  return (
    <DashboardLayout title="Parent links">
      <div className="space-y-6">
        <p className="text-sm text-ink/70 max-w-2xl">
          Invite parents/guardians to a read-only portal linked to their child. They set a password
          via the invite link, then log in at the school login page.
        </p>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Create invite</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={createInvite} className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm sm:col-span-2">
                <span className="font-medium">Student</span>
                <select
                  className="mt-1 w-full rounded border border-ink/20 px-2 py-2"
                  value={form.studentId}
                  onChange={(e) => setForm((f) => ({ ...f, studentId: e.target.value }))}
                  required
                >
                  <option value="">Select student…</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} {s.class ? `(${s.class})` : ''}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm">
                <span className="font-medium">Relationship</span>
                <select
                  className="mt-1 w-full rounded border border-ink/20 px-2 py-2"
                  value={form.relationship}
                  onChange={(e) => setForm((f) => ({ ...f, relationship: e.target.value }))}
                >
                  {relationships.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </label>
              <FormField
                label="Parent email"
                type="email"
                value={form.inviteEmail}
                onChange={(e) => setForm((f) => ({ ...f, inviteEmail: e.target.value }))}
                required
              />
              <FormField
                label="Parent phone (optional)"
                value={form.invitePhone}
                onChange={(e) => setForm((f) => ({ ...f, invitePhone: e.target.value }))}
              />
              <div className="sm:col-span-2">
                <Button type="submit">Create invite</Button>
              </div>
            </form>
            {lastInvite?.acceptPath ? (
              <div className="mt-4 rounded border border-ink/15 p-3 text-sm space-y-2">
                <p className="font-medium">Invite link for {lastInvite.inviteEmail}</p>
                <code className="block break-all text-xs bg-ink/5 p-2 rounded">
                  {typeof window !== 'undefined'
                    ? `${window.location.origin}${lastInvite.acceptPath}`
                    : lastInvite.acceptPath}
                </code>
                <Button type="button" variant="outline" size="sm" onClick={copyInvite}>
                  Copy link
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Active & pending links</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <LoadingSpinner />
            ) : !links.length ? (
              <p className="text-sm text-ink/60">No parent links yet.</p>
            ) : (
              <ul className="divide-y divide-ink/10 text-sm">
                {links.map((link) => (
                  <li
                    key={link.id}
                    className="py-3 flex flex-wrap items-center justify-between gap-2"
                  >
                    <div>
                      <p className="font-medium">
                        {link.student?.name}{' '}
                        <span className="text-ink/50 font-normal">({link.student?.class})</span>
                      </p>
                      <p className="text-ink/70">
                        {link.inviteEmail || link.parentUser?.email} · {link.relationship} ·{' '}
                        <span className="uppercase tracking-wide text-xs">{link.status}</span>
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => revoke(link.id)}
                    >
                      Revoke
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
