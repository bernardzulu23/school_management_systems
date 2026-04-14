'use client'

import { useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/lib/auth'

const PROVIDERS = [
  { value: 'airtel', label: 'Airtel Zambia' },
  { value: 'mtn', label: 'MTN Zambia' },
  { value: 'zamtel', label: 'Zamtel' },
]

function normalizeMsisdn(value) {
  const digits = String(value || '').replace(/\D/g, '')
  if (!digits) return ''
  if (digits.startsWith('260') && digits.length >= 11) return `+${digits}`
  if (digits.length === 9) return `+260${digits}`
  if (digits.length === 10 && digits.startsWith('0')) return `+260${digits.slice(1)}`
  return value
}

export default function PaymentsPage() {
  const { user } = useAuth()
  const role = String(user?.role || '').toLowerCase()
  const canPay = ['headteacher', 'hod', 'teacher', 'admin', 'administrator'].includes(role)

  const [form, setForm] = useState({
    provider: 'airtel',
    accountNumber: '',
    amount: 100,
    narration: 'School fees payment',
  })
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)

  const msisdnPreview = useMemo(() => normalizeMsisdn(form.accountNumber), [form.accountNumber])

  const submit = async () => {
    if (!canPay) {
      toast.error('Access denied')
      return
    }
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch('/api/payments/mobile-money', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          provider: form.provider,
          accountNumber: form.accountNumber,
          amount: Number(form.amount),
          narration: form.narration,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || 'Payment request failed')
      setResult(json)
      toast.success('Payment request submitted')
    } catch (e) {
      toast.error(e?.message || 'Payment request failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <DashboardLayout title="Payments">
      <div className="space-y-6">
        <Card className="bg-royalPurple-muted/60 border-royalPurple-border/40">
          <CardHeader>
            <CardTitle className="text-royalPurple-text1">Mobile Money Payment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!canPay ? (
              <p className="text-royalPurple-text2">Only staff can initiate payments.</p>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Provider</Label>
                    <select
                      className="w-full bg-royalPurple-deep border border-royalPurple-border rounded-lg p-3 text-royalPurple-text1"
                      value={form.provider}
                      onChange={(e) => setForm((p) => ({ ...p, provider: e.target.value }))}
                    >
                      {PROVIDERS.map((p) => (
                        <option key={p.value} value={p.value}>
                          {p.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label>Phone Number</Label>
                    <Input
                      value={form.accountNumber}
                      placeholder="+26097... or 097..."
                      onChange={(e) => setForm((p) => ({ ...p, accountNumber: e.target.value }))}
                    />
                    {msisdnPreview ? (
                      <p className="text-xs text-royalPurple-text3">Normalized: {msisdnPreview}</p>
                    ) : null}
                  </div>

                  <div className="space-y-2">
                    <Label>Amount (ZMW)</Label>
                    <Input
                      type="number"
                      value={form.amount}
                      min={1}
                      onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Narration</Label>
                    <Input
                      value={form.narration}
                      onChange={(e) => setForm((p) => ({ ...p, narration: e.target.value }))}
                    />
                  </div>
                </div>

                <Button onClick={submit} disabled={loading}>
                  {loading ? 'Submitting...' : 'Submit Payment'}
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {result ? (
          <Card className="bg-royalPurple-muted/60 border-royalPurple-border/40">
            <CardHeader>
              <CardTitle className="text-royalPurple-text1">Result</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-xs text-royalPurple-text2 whitespace-pre-wrap">
                {JSON.stringify(result, null, 2)}
              </pre>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </DashboardLayout>
  )
}
