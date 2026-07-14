'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Loader2, TrendingDown, TrendingUp } from 'lucide-react'
import toast from 'react-hot-toast'

/**
 * @param {{ items: Array<{id: string, itemName: string}>, onCreated?: () => void, trigger?: 'in' | 'out' | 'default', itemId?: string }} props
 */
export function HodStockMovementDialog({ items = [], onCreated, trigger = 'default', itemId }) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [form, setForm] = useState({
    itemId: itemId || '',
    movementType: trigger === 'out' ? 'out' : 'in',
    quantity: '1',
    note: '',
  })

  const submit = async () => {
    if (!form.itemId || !form.quantity) {
      setError('Item and quantity are required')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/hod/stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          kind: 'movement',
          itemId: form.itemId,
          movementType: form.movementType,
          quantity: Number(form.quantity),
          note: form.note || undefined,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Failed to record movement')
      toast.success(form.movementType === 'in' ? 'Stock in recorded' : 'Stock out recorded')
      setForm((p) => ({ ...p, quantity: '1', note: '' }))
      setOpen(false)
      onCreated?.()
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  if (!open) {
    if (trigger === 'in') {
      return (
        <Button variant="outline" className="w-full justify-start" onClick={() => setOpen(true)}>
          <TrendingUp className="h-4 w-4 mr-2" />
          Stock In
        </Button>
      )
    }
    if (trigger === 'out') {
      return (
        <Button variant="outline" className="w-full justify-start" onClick={() => setOpen(true)}>
          <TrendingDown className="h-4 w-4 mr-2" />
          Stock Out
        </Button>
      )
    }
    return (
      <Button
        size="sm"
        variant="outline"
        onClick={() => {
          setForm((p) => ({ ...p, itemId: itemId || p.itemId }))
          setOpen(true)
        }}
        title="Record movement"
      >
        <TrendingUp className="h-4 w-4" />
      </Button>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="w-full max-w-md rounded-xl border border-royalPurple-border bg-royalPurple-card p-4 space-y-3">
        <h3 className="font-semibold text-royalPurple-text1">Stock movement</h3>
        {error ? <p className="text-sm text-royalPurple-dangerTx">{error}</p> : null}
        <select
          className="w-full rounded-lg border border-royalPurple-border bg-royalPurple-deep p-2 text-sm"
          value={form.itemId}
          onChange={(e) => setForm((p) => ({ ...p, itemId: e.target.value }))}
        >
          <option value="">Select item</option>
          {items.map((i) => (
            <option key={i.id} value={i.id}>
              {i.itemName}
            </option>
          ))}
        </select>
        <select
          className="w-full rounded-lg border border-royalPurple-border bg-royalPurple-deep p-2 text-sm"
          value={form.movementType}
          onChange={(e) => setForm((p) => ({ ...p, movementType: e.target.value }))}
        >
          <option value="in">Stock in</option>
          <option value="out">Stock out</option>
        </select>
        <input
          type="number"
          min="1"
          className="w-full rounded-lg border border-royalPurple-border bg-royalPurple-deep p-2 text-sm"
          placeholder="Quantity"
          value={form.quantity}
          onChange={(e) => setForm((p) => ({ ...p, quantity: e.target.value }))}
        />
        <input
          className="w-full rounded-lg border border-royalPurple-border bg-royalPurple-deep p-2 text-sm"
          placeholder="Note (optional)"
          value={form.note}
          onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))}
        />
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Save
          </Button>
        </div>
      </div>
    </div>
  )
}
