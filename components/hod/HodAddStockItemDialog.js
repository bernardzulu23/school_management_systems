'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Plus, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

export function HodAddStockItemDialog({ onCreated }) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [form, setForm] = useState({
    itemName: '',
    category: 'General',
    currentStock: '0',
    minimumStock: '0',
    maximumStock: '100',
    unitPrice: '0',
    supplier: '',
    location: '',
  })

  const submit = async () => {
    if (!form.itemName.trim()) {
      setError('Item name is required')
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
          itemName: form.itemName.trim(),
          category: form.category || 'General',
          currentStock: Number(form.currentStock) || 0,
          minimumStock: Number(form.minimumStock) || 0,
          maximumStock: Number(form.maximumStock) || 100,
          unitPrice: Number(form.unitPrice) || 0,
          supplier: form.supplier || undefined,
          location: form.location || undefined,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Failed to add item')
      toast.success('Stock item added')
      setForm({
        itemName: '',
        category: 'General',
        currentStock: '0',
        minimumStock: '0',
        maximumStock: '100',
        unitPrice: '0',
        supplier: '',
        location: '',
      })
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
        Add Item
      </Button>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="w-full max-w-md rounded-xl border border-royalPurple-border bg-royalPurple-card p-4 space-y-3 max-h-[90vh] overflow-y-auto">
        <h3 className="font-semibold text-royalPurple-text1">Add stock item</h3>
        {error ? <p className="text-sm text-royalPurple-dangerTx">{error}</p> : null}
        {[
          ['itemName', 'Item name'],
          ['category', 'Category'],
          ['currentStock', 'Current stock'],
          ['minimumStock', 'Minimum stock'],
          ['maximumStock', 'Maximum stock'],
          ['unitPrice', 'Unit price'],
          ['supplier', 'Supplier'],
          ['location', 'Location'],
        ].map(([key, label]) => (
          <input
            key={key}
            className="w-full rounded-lg border border-royalPurple-border bg-royalPurple-deep p-2 text-sm"
            placeholder={label}
            type={
              ['currentStock', 'minimumStock', 'maximumStock', 'unitPrice'].includes(key)
                ? 'number'
                : 'text'
            }
            value={form[key]}
            onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
          />
        ))}
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
