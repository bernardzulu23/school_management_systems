'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { ArrowLeft, LogOut, Shield, User } from 'lucide-react'
import { getPasswordFormError } from '@/components/ui/PasswordRequirements'
import PasswordRequirements from '@/components/ui/PasswordRequirements'

export default function PlatformProfilePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [profile, setProfile] = useState(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/platform/auth/profile', { cache: 'no-store' })
      const data = await res.json()
      if (res.status === 401 || res.status === 403) {
        router.replace('/login')
        return
      }
      if (!res.ok) {
        toast.error(data.error || 'Failed to load profile')
        if (data.error?.includes('seed:platform-admin')) {
          router.replace('/platform/dashboard')
        }
        return
      }
      setProfile(data.profile)
      setName(data.profile.name || '')
      setEmail(data.profile.email || '')
    } catch {
      toast.error('Failed to load profile')
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    load()
  }, [load])

  async function handleSubmit(e) {
    e.preventDefault()
    if (saving) return

    if (newPassword && newPassword !== confirmPassword) {
      toast.error('New passwords do not match')
      return
    }

    if (newPassword) {
      const passwordError = getPasswordFormError(newPassword)
      if (passwordError) {
        toast.error(passwordError)
        return
      }
    }

    const changingEmail = email.trim().toLowerCase() !== profile?.email?.toLowerCase()
    const changingPassword = Boolean(newPassword)

    if ((changingEmail || changingPassword) && !currentPassword) {
      toast.error('Enter your current password to change email or password')
      return
    }

    setSaving(true)
    try {
      const body = { name: name.trim() }
      if (changingEmail) body.email = email.trim().toLowerCase()
      if (changingPassword) {
        body.currentPassword = currentPassword
        body.newPassword = newPassword
      } else if (changingEmail) {
        body.currentPassword = currentPassword
      }

      const res = await fetch('/api/platform/auth/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Update failed')
        return
      }

      toast.success('Profile updated')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      if (data.profile) {
        setProfile((p) => ({ ...p, ...data.profile }))
        setEmail(data.profile.email)
        setName(data.profile.name)
      }
    } catch {
      toast.error('Update failed')
    } finally {
      setSaving(false)
    }
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {})
    router.push('/login')
  }

  return (
    <main className="min-h-screen bg-paper">
      <header className="border-b-2 border-ink bg-ink text-paper">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="text-accent" size={22} />
            <div>
              <h1 className="font-semibold">My profile</h1>
              <p className="text-xs text-paper/70">Platform super admin account</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/platform/dashboard"
              className="flex items-center gap-1 px-3 py-2 border-2 border-paper/30 text-paper hover:bg-paper/10 text-sm"
            >
              <ArrowLeft size={16} /> Schools
            </Link>
            <button
              type="button"
              onClick={logout}
              className="flex items-center gap-2 px-3 py-2 border-2 border-paper/30 text-paper hover:bg-paper/10 text-sm"
            >
              <LogOut size={16} /> Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-6 py-8">
        {loading ? (
          <p className="text-muted">Loading profile…</p>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="border-2 border-ink bg-white p-6 space-y-6 shadow-brutal"
          >
            <div className="flex items-center gap-3 pb-4 border-b-2 border-ink/10">
              <div className="w-12 h-12 rounded-full bg-accent/15 flex items-center justify-center">
                <User className="text-accent" size={24} />
              </div>
              <div>
                <p className="text-ink font-medium">{profile?.name}</p>
                <p className="text-sm text-muted">{profile?.email}</p>
              </div>
            </div>

            <div>
              <label className="block text-sm text-ink mb-1 font-medium">Display name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input"
                required
                minLength={2}
              />
            </div>

            <div>
              <label className="block text-sm text-ink mb-1 font-medium">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                required
                autoComplete="username"
              />
              <p className="text-xs text-muted mt-1">
                Changing email requires your current password below.
              </p>
            </div>

            <div className="pt-2 border-t-2 border-ink/10 space-y-4">
              <p className="text-sm font-medium text-ink">Change password</p>
              <div>
                <label className="block text-sm text-muted mb-1">Current password</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="input"
                  autoComplete="current-password"
                />
              </div>
              <div>
                <label className="block text-sm text-muted mb-1">New password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="input"
                  minLength={8}
                  autoComplete="new-password"
                  placeholder="Leave blank to keep current"
                />
              </div>
              {newPassword ? <PasswordRequirements password={newPassword} /> : null}
              <div>
                <label className="block text-sm text-muted mb-1">Confirm new password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="input"
                  autoComplete="new-password"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="btn-primary w-full disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </form>
        )}
      </div>
    </main>
  )
}
