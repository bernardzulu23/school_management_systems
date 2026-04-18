'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import ProviderLogos from '@/components/payments/ProviderLogos'
import {
  Phone,
  CreditCard,
  Receipt,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  TrendingUp,
} from 'lucide-react'

const PROVIDERS = [
  { value: 'airtel', label: 'Airtel Zambia' },
  { value: 'mtn', label: 'MTN Zambia' },
  { value: 'zamtel', label: 'Zamtel' },
]

const PAYMENT_TYPES = [
  { value: 'tuition', label: 'Tuition Fees' },
  { value: 'uniform', label: 'Uniform & Books' },
  { value: 'meals', label: 'Meal Program' },
  { value: 'transport', label: 'Transport' },
  { value: 'examination', label: 'Examination Fees' },
  { value: 'activation', label: 'Platform Activation' },
  { value: 'subscription', label: 'Monthly Subscription' },
  { value: 'other', label: 'Other' },
]

const PAYMENT_STATUS = {
  pending: { label: 'Pending', className: 'payment-status payment-status-pending', icon: Clock },
  completed: {
    label: 'Completed',
    className: 'payment-status payment-status-completed',
    icon: CheckCircle,
  },
  failed: { label: 'Failed', className: 'payment-status payment-status-failed', icon: XCircle },
}

function normalizeMsisdn(value) {
  const digits = String(value || '').replace(/\D/g, '')
  if (!digits) return ''
  if (digits.startsWith('260') && digits.length >= 11) return `+${digits}`
  if (digits.length === 9) return `+260${digits}`
  if (digits.length === 10 && digits.startsWith('0')) return `+260${digits.slice(1)}`
  return value
}

export default function PaymentForm({ onSuccess, schoolId, userRole }) {
  const [form, setForm] = useState({
    provider: 'airtel',
    accountNumber: '',
    amount: '',
    paymentType: 'tuition',
    studentId: '',
    description: '',
  })
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  const canPay = ['headteacher', 'hod', 'teacher', 'admin', 'administrator'].includes(userRole)
  const msisdnPreview = normalizeMsisdn(form.accountNumber)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!canPay) return

    setLoading(true)
    setResult(null)
    setError(null)

    try {
      const payload = {
        provider: form.provider,
        accountNumber: form.accountNumber,
        amount: Number(form.amount),
        narration:
          `${PAYMENT_TYPES.find((t) => t.value === form.paymentType)?.label || 'Payment'} - ${form.description || ''}`.trim(),
      }

      if (form.studentId) {
        payload.studentId = form.studentId
      }

      const res = await fetch('/api/payments/mobile-money', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      })

      const json = await res.json()

      if (!res.ok) {
        throw new Error(json?.error || json?.message || 'Payment request failed')
      }

      setResult(json)
      if (onSuccess) onSuccess(json)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  if (!canPay) {
    return (
      <Card className="bg-royalPurple-muted/60 border-royalPurple-border/40">
        <CardContent className="py-8 text-center">
          <AlertCircle className="w-12 h-12 mx-auto text-royalPurple-text3 mb-3" />
          <p className="text-royalPurple-text2">Only staff members can initiate payments.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card className="bg-royalPurple-muted/60 border-royalPurple-border/40">
        <CardHeader>
          <CardTitle className="text-royalPurple-text1 flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Mobile Money Payment
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Payment Type</Label>
              <select
                className="zsms-select"
                value={form.paymentType}
                onChange={(e) => setForm((p) => ({ ...p, paymentType: e.target.value }))}
              >
                {PAYMENT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label>Amount (ZMW)</Label>
              <Input
                type="number"
                min={1}
                placeholder="0.00"
                value={form.amount}
                onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Provider</Label>
              <div className="provider-row">
                {PROVIDERS.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, provider: p.value }))}
                    className={`provider-pill zsms-hover-raise ${
                      form.provider === p.value ? 'provider-pill-active' : ''
                    }`}
                  >
                    <span
                      className={`provider-dot ${
                        p.value === 'mtn'
                          ? 'provider-dot-mtn'
                          : p.value === 'zamtel'
                            ? 'provider-dot-zamtel'
                            : 'provider-dot-airtel'
                      }`}
                    >
                      {p.label.charAt(0)}
                    </span>
                    <span className="step-label">{p.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Phone Number</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-royalPurple-text3" />
                <Input
                  type="tel"
                  placeholder="+26097... or 097..."
                  value={form.accountNumber}
                  onChange={(e) => setForm((p) => ({ ...p, accountNumber: e.target.value }))}
                  className="pl-10"
                  required
                />
              </div>
              {msisdnPreview && (
                <p className="text-xs text-royalPurple-text3">Normalized: {msisdnPreview}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Student ID (Optional)</Label>
              <Input
                placeholder="Student identifier"
                value={form.studentId}
                onChange={(e) => setForm((p) => ({ ...p, studentId: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Description (Optional)</Label>
              <Input
                placeholder="Payment description"
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading || !form.amount || !form.accountNumber}
            className="w-full zsms-hover-raise"
          >
            {loading ? (
              <>
                <Clock className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Phone className="w-4 h-4 mr-2" />
                Pay K{form.amount || '0'} via{' '}
                {PROVIDERS.find((p) => p.value === form.provider)?.label}
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {error && (
        <Card className="bg-red-500/10 border-red-500/40">
          <CardContent className="py-4">
            <div className="flex items-center gap-2 text-red-500">
              <XCircle className="w-5 h-5" />
              <span>{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {result && (
        <Card className="bg-green-500/10 border-green-500/40">
          <CardHeader>
            <CardTitle className="text-green-500 flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              Payment Initiated
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              {result.reference && (
                <div className="flex justify-between">
                  <span className="text-royalPurple-text2">Reference:</span>
                  <span className="font-mono text-royalPurple-text1">{result.reference}</span>
                </div>
              )}
              {result.message && <p className="text-royalPurple-text2">{result.message}</p>}
              <div className="flex items-center gap-2 mt-3 p-3 bg-royalPurple-deep rounded-lg">
                <Phone className="w-4 h-4 text-royalPurple-text3" />
                <span className="text-royalPurple-text2 text-xs">
                  Check your phone for a USSD prompt to complete payment
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="bg-royalPurple-muted/60 border-royalPurple-border/40">
        <CardHeader>
          <CardTitle className="text-royalPurple-text1 text-sm">Supported Providers</CardTitle>
        </CardHeader>
        <CardContent>
          <ProviderLogos size={36} />
        </CardContent>
      </Card>
    </form>
  )
}

export function PaymentHistory({ transactions = [] }) {
  if (transactions.length === 0) {
    return (
      <Card className="bg-royalPurple-muted/60 border-royalPurple-border/40">
        <CardContent className="py-8 text-center">
          <Receipt className="w-12 h-12 mx-auto text-royalPurple-text3 mb-3" />
          <p className="text-royalPurple-text2">No payment history yet</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-royalPurple-muted/60 border-royalPurple-border/40">
      <CardHeader>
        <CardTitle className="text-royalPurple-text1 flex items-center gap-2">
          <Receipt className="w-5 h-5" />
          Recent Transactions
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {transactions.map((tx, i) => {
            const status = PAYMENT_STATUS[tx.status] || PAYMENT_STATUS.pending
            const StatusIcon = status.icon
            const provider = PROVIDERS.find((p) => p.value === tx.provider) || PROVIDERS[0]
            const providerBadge =
              tx.provider === 'mtn'
                ? 'provider-dot-mtn'
                : tx.provider === 'zamtel'
                  ? 'provider-dot-zamtel'
                  : 'provider-dot-airtel'

            return (
              <div
                key={tx.id || i}
                className="flex items-center justify-between p-3 bg-royalPurple-deep rounded-lg border border-royalPurple-border/40 zsms-hover-raise"
              >
                <div className="flex items-center gap-3">
                  <div className={`provider-dot ${providerBadge}`}>{provider.label.charAt(0)}</div>
                  <div>
                    <p className="font-medium text-royalPurple-text1">
                      K{tx.amount?.toFixed(2)} - {tx.type || 'Payment'}
                    </p>
                    <p className="text-xs text-royalPurple-text3">
                      {provider.label} • {tx.phone || tx.accountNumber}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className={status.className}>
                    <StatusIcon className="w-4 h-4" />
                    <span>{status.label}</span>
                  </div>
                  <p className="text-xs text-royalPurple-text3">
                    {new Date(tx.createdAt || tx.timestamp).toLocaleDateString()}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

export function PaymentStats({ stats }) {
  const defaultStats = {
    totalTransactions: 0,
    totalAmount: 0,
    successRate: 0,
    pendingCount: 0,
  }

  const s = { ...defaultStats, ...stats }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card className="bg-royalPurple-muted/60 border-royalPurple-border/40">
        <CardContent className="py-4 text-center">
          <TrendingUp className="w-6 h-6 mx-auto text-royalPurple-accent mb-2" />
          <p className="text-2xl font-bold text-royalPurple-text1">{s.totalTransactions}</p>
          <p className="text-xs text-royalPurple-text3">Total Transactions</p>
        </CardContent>
      </Card>

      <Card className="bg-royalPurple-muted/60 border-royalPurple-border/40">
        <CardContent className="py-4 text-center">
          <CreditCard className="w-6 h-6 mx-auto kpi-pass mb-2" />
          <p className="text-2xl font-bold text-royalPurple-text1">K{s.totalAmount?.toFixed(2)}</p>
          <p className="text-xs text-royalPurple-text3">Total Amount</p>
        </CardContent>
      </Card>

      <Card className="bg-royalPurple-muted/60 border-royalPurple-border/40">
        <CardContent className="py-4 text-center">
          <CheckCircle className="w-6 h-6 mx-auto kpi-pass mb-2" />
          <p className="text-2xl font-bold text-royalPurple-text1">{s.successRate}%</p>
          <p className="text-xs text-royalPurple-text3">Success Rate</p>
        </CardContent>
      </Card>

      <Card className="bg-royalPurple-muted/60 border-royalPurple-border/40">
        <CardContent className="py-4 text-center">
          <Clock className="w-6 h-6 mx-auto kpi-warn mb-2" />
          <p className="text-2xl font-bold text-royalPurple-text1">{s.pendingCount}</p>
          <p className="text-xs text-royalPurple-text3">Pending</p>
        </CardContent>
      </Card>
    </div>
  )
}
