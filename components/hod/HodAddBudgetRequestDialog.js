'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Plus, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

export function HodAddBudgetRequestDialog({ onCreated, categories = [] }) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [form, setForm] = useState({
    description: '',
    amount: '',
    categoryId: '',
    status: 'pending',
  })

  const submit = async () => {
    if (!form.description.trim() || !form.amount) {
      setError('Description and amount are required')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/hod/budget', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          kind: 'transaction',
          description: form.description.trim(),
          amount: Number(form.amount),
          categoryId: form.categoryId || undefined,
          status: form.status,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Failed to create request')
      toast.success('Budget request created')
      setForm({ description: '', amount: '', categoryId: '', status: 'pending' })
      setOpen(false)
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
        New Request
      </Button>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="w-full max-w-md rounded-xl border border-royalPurple-border bg-royalPurple-card p-4 space-y-3">
        <h3 className="font-semibold text-royalPurple-text1">New budget request</h3>
        {error ? <p className="text-sm text-royalPurple-dangerTx">{error}</p> : null}
        <input
          className="w-full rounded-lg border border-royalPurple-border bg-royalPurple-deep p-2 text-sm"
          placeholder="Description"
          value={form.description}
          onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
        />
        <input
          type="number"
          min="0"
          step="0.01"
          className="w-full rounded-lg border border-royalPurple-border bg-royalPurple-deep p-2 text-sm"
          placeholder="Amount"
          value={form.amount}
          onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
        />
        <select
          className="w-full rounded-lg border border-royalPurple-border bg-royalPurple-deep p-2 text-sm"
          value={form.categoryId}
          onChange={(e) => setForm((p) => ({ ...p, categoryId: e.target.value }))}
        >
          <option value="">Uncategorized</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Submit
          </Button>
        </div>
      </div>
    </div>
  )
}
