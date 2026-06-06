'use client'

import { useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import ProviderLogos, { ProviderLogoImage } from '@/components/payments/ProviderLogos'
import {
  formatPlanPrice,
  PLAN_DESCRIPTIONS,
  PLAN_LABELS,
  PLAN_PRICING,
} from '@/lib/billing/plan-pricing'

const PROVIDERS = [
  { value: 'mtn', label: 'MTN Zambia' },
  { value: 'airtel', label: 'Airtel Zambia' },
  { value: 'zamtel', label: 'Zamtel' },
]

export default function SubscriptionUpgradePanel({
  selectedPlan: selectedPlanProp,
  onPlanChange,
  currentPlan = 'trial',
  planOptions = ['basic', 'standard', 'premium'],
  onPaymentStarted,
}) {
  const defaultPlan = planOptions.includes(String(currentPlan).toLowerCase())
    ? String(currentPlan).toLowerCase()
    : planOptions[0] || 'standard'
  const [internalPlan, setInternalPlan] = useState(defaultPlan)
  const selectedPlan = selectedPlanProp || internalPlan
  const setSelectedPlan = onPlanChange || setInternalPlan
  const [provider, setProvider] = useState('mtn')
  const [accountNumber, setAccountNumber] = useState('')
  const [months, setMonths] = useState(1)
  const [paying, setPaying] = useState(false)

  const pricing = useMemo(() => formatPlanPrice(selectedPlan, months), [selectedPlan, months])

  const startPayment = async () => {
    if (!pricing) {
      toast.error('Select a valid plan')
      return
    }
    if (!String(accountNumber).trim()) {
      toast.error('Enter your mobile money phone number')
      return
    }

    setPaying(true)
    try {
      const res = await fetch('/api/billing/subscription-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          plan: selectedPlan,
          provider,
          accountNumber,
          months,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(json.error || 'Payment could not be started')
      }
      toast.success(json.message || 'Check your phone and enter your PIN to approve payment.')
      onPaymentStarted?.(json)
    } catch (e) {
      toast.error(e.message || 'Payment failed')
    } finally {
      setPaying(false)
    }
  }

  return (
    <div className="space-y-6" id="upgrade-payment">
      <div>
        <h3 className="text-lg font-semibold text-royalPurple-text1">Upgrade your plan</h3>
        <p className="text-sm text-royalPurple-text2 mt-1">
          Select a plan, enter your mobile money number, then approve the USSD prompt on your phone.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {planOptions.map((planKey) => {
          const price = formatPlanPrice(planKey, 1)
          const active = selectedPlan === planKey
          return (
            <button
              key={planKey}
              type="button"
              onClick={() => setSelectedPlan(planKey)}
              className={`rounded-xl border p-5 text-left transition-all ${
                active
                  ? 'border-royalPurple-accent bg-royalPurple-accent/10 ring-2 ring-royalPurple-accent'
                  : 'border-royalPurple-border/40 bg-royalPurple-card hover:border-royalPurple-accent/50'
              }`}
            >
              <div className="font-bold text-royalPurple-text1 capitalize">
                {PLAN_LABELS[planKey] || planKey}
              </div>
              <div className="text-2xl font-bold text-royalPurple-accent mt-2">
                K{price?.monthly}
                <span className="text-sm font-normal text-royalPurple-text2"> / month</span>
              </div>
              <p className="text-sm text-royalPurple-text2 mt-2">{PLAN_DESCRIPTIONS[planKey]}</p>
              {active ? (
                <p className="text-xs text-royalPurple-accent mt-3 font-medium">Selected</p>
              ) : (
                <p className="text-xs text-royalPurple-text3 mt-3">Tap to select</p>
              )}
            </button>
          )
        })}
      </div>

      <div className="rounded-xl border border-royalPurple-border/40 bg-royalPurple-card p-5 space-y-4">
        <ProviderLogos size={36} />

        <div className="flex flex-wrap gap-2">
          {PROVIDERS.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => setProvider(p.value)}
              className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
                provider === p.value
                  ? 'border-royalPurple-accent bg-royalPurple-accent/10'
                  : 'border-royalPurple-border/40'
              }`}
            >
              <ProviderLogoImage providerKey={p.value} size={24} />
              {p.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="billing-phone">Mobile money number</Label>
            <Input
              id="billing-phone"
              type="tel"
              placeholder="097... or +26097..."
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="billing-months">Billing period</Label>
            <select
              id="billing-months"
              className="w-full h-10 rounded-lg border border-royalPurple-border bg-royalPurple-deep px-3 text-royalPurple-text1"
              value={String(months)}
              onChange={(e) => setMonths(Number(e.target.value))}
            >
              {[1, 2, 3, 6, 12].map((n) => (
                <option key={n} value={n}>
                  {n} month{n === 1 ? '' : 's'}
                </option>
              ))}
            </select>
          </div>
        </div>

        {pricing ? (
          <p className="text-royalPurple-text1">
            Total due: <strong>{pricing.label}</strong>
          </p>
        ) : null}

        <Button type="button" onClick={startPayment} disabled={paying} className="w-full md:w-auto">
          {paying ? 'Sending payment request…' : `Pay ${pricing?.label || ''} via mobile money`}
        </Button>
      </div>
    </div>
  )
}
