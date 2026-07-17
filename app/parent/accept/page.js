'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/Button'
import FormField from '@/components/forms/FormField'

function AcceptInviteContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = String(searchParams.get('token') || '').trim()
  const [invite, setInvite] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')

  useEffect(() => {
    if (!token) {
      setLoading(false)
      return
    }
    ;(async () => {
      try {
        const res = await fetch(`/api/parent/accept-invite?token=${encodeURIComponent(token)}`)
        const json = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(json.error || 'Invite not found')
        setInvite(json.invite)
        setName(json.invite?.email?.split('@')[0] || '')
      } catch (e) {
        toast.error(e.message || 'Invalid invite')
        setInvite(null)
      } finally {
        setLoading(false)
      }
    })()
  }, [token])

  const onSubmit = async (e) => {
    e.preventDefault()
    if (password !== confirm) {
      toast.error('Passwords do not match')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/parent/accept-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password, name }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || json.message || 'Could not accept invite')
      toast.success('Account ready — please log in')
      router.push('/login')
    } catch (err) {
      toast.error(err.message || 'Failed')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <p className="text-sm text-ink/70">Loading invite…</p>
  }

  if (!token || !invite) {
    return (
      <div className="space-y-3 text-sm">
        <p>This invite link is invalid or has already been used.</p>
        <Link href="/login" className="text-accent underline">
          Go to login
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="rounded border border-ink/15 bg-paper p-4 text-sm space-y-1">
        <p>
          School: <strong>{invite.schoolName}</strong>
        </p>
        <p>
          Child: <strong>{invite.studentName}</strong> ({invite.studentClass})
        </p>
        <p>
          As: <strong>{invite.relationship}</strong>
        </p>
        <p>
          Email: <strong>{invite.email}</strong>
        </p>
      </div>
      <FormField label="Your name" value={name} onChange={(e) => setName(e.target.value)} />
      <FormField
        label="Create password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      <FormField
        label="Confirm password"
        type="password"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        required
      />
      <Button type="submit" disabled={submitting} className="w-full">
        {submitting ? 'Creating account…' : 'Accept invite'}
      </Button>
    </form>
  )
}

export default function ParentAcceptPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-paper text-ink p-4">
      <div className="w-full max-w-md space-y-4">
        <h1 className="text-xl font-semibold">Parent portal invite</h1>
        <Suspense fallback={<p className="text-sm">Loading…</p>}>
          <AcceptInviteContent />
        </Suspense>
      </div>
    </main>
  )
}
