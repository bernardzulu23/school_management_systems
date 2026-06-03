'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Plus, Loader2 } from 'lucide-react'
import { HodFileUpload } from '@/components/hod/HodFileUpload'

export function HodAddCorrespondenceDialog({ onCreated }) {
  const [open, setOpen] = useState(false)
  const [createdId, setCreatedId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [form, setForm] = useState({
    direction: 'incoming',
    subject: '',
    party: '',
    priority: 'medium',
    itemType: 'letter',
  })

  const submit = async () => {
    if (!form.subject.trim() || !form.party.trim()) {
      setError('Subject and party are required')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/hod/correspondence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(form),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed')
      setCreatedId(json.data?.id)
      onCreated?.()
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4 mr-2" />
        Add Correspondence
      </Button>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-royalPurple-card border border-royalPurple-border rounded-xl max-w-md w-full p-6 space-y-3">
        <h3 className="font-semibold text-royalPurple-text1">
          {createdId ? 'Upload letter / document' : 'Add correspondence'}
        </h3>
        {!createdId ? (
          <>
            <select
              className="w-full px-3 py-2 border rounded-md"
              value={form.direction}
              onChange={(e) => setForm((f) => ({ ...f, direction: e.target.value }))}
            >
              <option value="incoming">Incoming</option>
              <option value="outgoing">Outgoing</option>
            </select>
            <input
              className="w-full px-3 py-2 border rounded-md"
              placeholder="Subject"
              value={form.subject}
              onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
            />
            <input
              className="w-full px-3 py-2 border rounded-md"
              placeholder={form.direction === 'incoming' ? 'Sender' : 'Recipient'}
              value={form.party}
              onChange={(e) => setForm((f) => ({ ...f, party: e.target.value }))}
            />
            {error && <p className="text-sm text-royalPurple-dangerTx">{error}</p>}
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={submit} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                Continue
              </Button>
            </div>
          </>
        ) : (
          <>
            <HodFileUpload entityType="correspondence" entityId={createdId} defaultLabel="letter" />
            <Button
              className="w-full"
              onClick={() => {
                setOpen(false)
                setCreatedId(null)
              }}
            >
              Done
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
