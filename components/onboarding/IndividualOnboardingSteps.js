'use client'

import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import ProviderLogos, { ProviderLogoImage } from '@/components/payments/ProviderLogos'
import { PLAN_LABELS } from '@/lib/billing/plan-pricing'

const PROVIDERS = [
  { value: 'mtn', label: 'MTN Zambia' },
  { value: 'airtel', label: 'Airtel Zambia' },
  { value: 'zamtel', label: 'Zamtel' },
]

export function IndividualVerifyStep({
  email,
  resendVerification,
  resending,
  resendCooldown,
  afterVerified,
}) {
  return (
    <div className="space-y-4 py-4 text-center">
      <p className="text-royalPurple-text2">
        We sent a verification link to <strong>{email}</strong>. Open it, then return here.
      </p>
      <Button onClick={afterVerified} fullWidth>
        I verified my email
      </Button>
      <p className="text-sm text-royalPurple-text3">
        Didn&apos;t receive it?{' '}
        <button
          type="button"
          disabled={resending || resendCooldown > 0}
          onClick={resendVerification}
          className="underline text-royalPurple-accentTx disabled:opacity-50"
        >
          {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend email'}
        </button>
      </p>
    </div>
  )
}

export function IndividualPaymentStep({
  plan,
  pricing,
  provider,
  setProvider,
  accountNumber,
  setAccountNumber,
  months,
  setMonths,
  paying,
  canPay,
  pay,
  paymentPollSeconds,
  paymentStatus,
  paymentReference,
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-royalPurple-border p-4 bg-royalPurple-accent/5">
        <p className="font-semibold text-royalPurple-text1">{PLAN_LABELS[plan] || plan}</p>
        <p className="text-sm text-royalPurple-text3 mt-1">{pricing?.label}</p>
      </div>
      <ProviderLogos size={32} />
      <div className="grid grid-cols-3 gap-2">
        {PROVIDERS.map((p) => (
          <button
            key={p.value}
            type="button"
            onClick={() => setProvider(p.value)}
            className={`rounded-lg border p-2 text-xs transition-colors ${
              provider === p.value
                ? 'border-royalPurple-accent bg-royalPurple-accent/10'
                : 'border-royalPurple-border'
            }`}
          >
            <ProviderLogoImage providerKey={p.value} size={28} className="mx-auto mb-1" />
            {p.label}
          </button>
        ))}
      </div>
      <div>
        <Label>Mobile money number</Label>
        <Input
          value={accountNumber}
          onChange={(e) => setAccountNumber(e.target.value)}
          placeholder="09XXXXXXXX"
        />
      </div>
      <div>
        <Label>Months</Label>
        <Input
          type="number"
          min={1}
          max={12}
          value={months}
          onChange={(e) => setMonths(Number(e.target.value) || 1)}
        />
      </div>
      <Button onClick={pay} disabled={!canPay || paying || !String(accountNumber).trim()} fullWidth>
        {paying ? 'Sending payment request…' : `Pay ${pricing?.label || ''}`}
      </Button>
      {paymentStatus === 'pending' ? (
        <p className="text-sm text-royalPurple-text3 text-center">
          Waiting for PIN approval… checking again in {paymentPollSeconds}s
          {paymentReference ? ` (ref: ${paymentReference})` : ''}
        </p>
      ) : null}
    </div>
  )
}
