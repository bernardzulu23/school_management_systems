'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import {
  BatteryCharging,
  CheckCircle2,
  Download,
  KeyRound,
  Radio,
  ShieldCheck,
  Smartphone,
} from 'lucide-react'
import toast from 'react-hot-toast'

const STEPS = [
  { id: 'overview', title: 'Overview', Icon: Radio },
  { id: 'install', title: 'Install', Icon: Download },
  { id: 'permissions', title: 'Permissions', Icon: ShieldCheck },
  { id: 'pair', title: 'Pair', Icon: KeyRound },
  { id: 'verify', title: 'Verify', Icon: Smartphone },
  { id: 'done', title: 'Done', Icon: CheckCircle2 },
]

export default function SMSGatewaySetup() {
  const [step, setStep] = useState(0)
  const [verifying, setVerifying] = useState(false)
  const [verifyStatus, setVerifyStatus] = useState(null)
  const [pollCount, setPollCount] = useState(0)
  const [verifyRun, setVerifyRun] = useState(0)

  const checkInfo = useCallback(async () => {
    const res = await fetch('/api/sms/gateway/info', {
      credentials: 'include',
      cache: 'no-store',
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(json?.error || 'Could not check gateway')
    return json
  }, [])

  useEffect(() => {
    if (step !== 4 || verifyRun === 0) return undefined
    let cancelled = false
    let ticks = 0
    let timer

    async function poll() {
      setVerifying(true)
      try {
        const info = await checkInfo()
        if (cancelled) return
        setVerifyStatus(info.status)
        ticks += 1
        setPollCount(ticks)
        if (info.status === 'connected') {
          setVerifying(false)
          toast.success('Gateway connected')
          return
        }
        if (ticks >= 12) {
          setVerifying(false)
          toast.error('Still offline — see troubleshooting below')
          return
        }
        timer = setTimeout(poll, 5000)
      } catch (e) {
        if (!cancelled) {
          setVerifying(false)
          toast.error(e?.message || 'Verify failed')
        }
      }
    }

    poll()
    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
    }
  }, [step, verifyRun, checkInfo])

  const next = () => setStep((s) => Math.min(s + 1, STEPS.length - 1))
  const back = () => setStep((s) => Math.max(s - 1, 0))

  return (
    <div className="space-y-6">
      <nav className="flex flex-wrap gap-2">
        {STEPS.map((s, i) => {
          const Icon = s.Icon
          const active = i === step
          const done = i < step
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => setStep(i)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                active
                  ? 'bg-royalPurple-accent text-royalPurple-accentTx border-transparent'
                  : done
                    ? 'bg-emerald-500/10 text-emerald-800 border-emerald-300'
                    : 'bg-royalPurple-page text-royalPurple-text3 border-royalPurple-border'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {i + 1}. {s.title}
            </button>
          )
        })}
      </nav>

      <Card className="p-6 space-y-4">
        {step === 0 && (
          <>
            <h2 className="text-lg font-semibold text-royalPurple-text1">Custom SMS bridge</h2>
            <p className="text-sm text-royalPurple-text2">
              The ZSMS Gateway app turns an Android phone with a local SIM into a school SMS bridge.
              The phone polls ZSMS for queued messages and sends them over the SIM — your server
              never dials into the phone.
            </p>
            <ul className="text-sm text-royalPurple-text3 space-y-2 list-disc pl-5">
              <li>Pilot rate limit: about 100 SMS per 5 minutes per gateway.</li>
              <li>Pairing tokens are created only by platform admins.</li>
              <li>This is not the commercial Play Store “SMS Gateway” / sms-gate.app product.</li>
            </ul>
          </>
        )}

        {step === 1 && (
          <>
            <h2 className="text-lg font-semibold text-royalPurple-text1">Install ZSMS Gateway</h2>
            <p className="text-sm text-royalPurple-text2">
              Install the <strong>ZSMS Gateway</strong> APK on a dedicated Android phone (sideload
              or internal distribution link from your platform team). Do not install a third-party
              commercial SMS gateway from the Play Store for this flow.
            </p>
            <div className="rounded-md border border-royalPurple-border bg-royalPurple-page p-4 text-sm text-royalPurple-text2">
              Ask Blue Peak / platform support for the latest APK if you do not already have it.
              Enable “Install unknown apps” for your file manager or browser before installing.
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h2 className="text-lg font-semibold text-royalPurple-text1">Permissions</h2>
            <p className="text-sm text-royalPurple-text2">
              Grant the permissions the app requests so it can send SMS reliably in the background.
            </p>
            <ul className="text-sm text-royalPurple-text3 space-y-2 list-disc pl-5">
              <li>SMS send / receive (required to deliver messages)</li>
              <li>Phone / SIM selection (pick the correct subscription)</li>
              <li>Notifications (foreground service must stay visible)</li>
              <li className="flex items-start gap-2 list-none -ml-5">
                <BatteryCharging className="w-4 h-4 mt-0.5 shrink-0" />
                <span>Battery optimization exemption — keep the app unrestricted</span>
              </li>
            </ul>
          </>
        )}

        {step === 3 && (
          <>
            <h2 className="text-lg font-semibold text-royalPurple-text1">
              Pair with platform token
            </h2>
            <p className="text-sm text-royalPurple-text2">
              School accounts cannot create pairing tokens. Ask a platform admin to open{' '}
              <span className="font-mono text-xs">/platform/sms-gateway</span>, register this
              school’s device, then share the one-time QR code or token.
            </p>
            <ol className="text-sm text-royalPurple-text3 space-y-2 list-decimal pl-5">
              <li>Open ZSMS Gateway on the phone.</li>
              <li>Scan the QR from the platform page, or paste the token.</li>
              <li>Confirm the API base URL points at your ZSMS deployment.</li>
              <li>Tap Connect — the phone should begin polling.</li>
            </ol>
          </>
        )}

        {step === 4 && (
          <>
            <h2 className="text-lg font-semibold text-royalPurple-text1">Verify connection</h2>
            <p className="text-sm text-royalPurple-text2">
              Checking gateway status for this school. Leave the phone on with the app running.
            </p>
            <div className="rounded-md border border-royalPurple-border p-4 space-y-2">
              <p className="text-sm font-medium text-royalPurple-text1">
                Status:{' '}
                <span className="capitalize">
                  {verifyStatus || (verifying ? 'checking…' : '—')}
                </span>
              </p>
              <p className="text-xs text-royalPurple-text3">
                {verifying
                  ? `Polling… attempt ${pollCount}/12`
                  : verifyStatus === 'connected'
                    ? 'Phone is online.'
                    : 'Timed out or offline — check troubleshooting.'}
              </p>
              <Button
                type="button"
                className="btn-secondary btn-sm"
                disabled={verifying}
                onClick={() => {
                  setPollCount(0)
                  setVerifyStatus(null)
                  setVerifyRun((n) => n + 1)
                }}
              >
                Check again
              </Button>
            </div>
            {verifyStatus && verifyStatus !== 'connected' ? (
              <ul className="text-sm text-royalPurple-text3 space-y-1.5 list-disc pl-5">
                <li>Phone powered on, Wi‑Fi/data connected</li>
                <li>App notification visible (service running)</li>
                <li>Battery unrestricted</li>
                <li>Re-pair from platform if the token was rotated</li>
              </ul>
            ) : null}
          </>
        )}

        {step === 5 && (
          <>
            <h2 className="text-lg font-semibold text-royalPurple-text1">You’re set</h2>
            <p className="text-sm text-royalPurple-text2">
              Return to the SMS dashboard to monitor gateway health and recent deliveries. Platform
              admins enable school routing with the custom gateway flag when ready for production
              traffic.
            </p>
            <Link href="/dashboard/sms" className="inline-flex">
              <Button type="button" className="btn-primary">
                Back to SMS dashboard
              </Button>
            </Link>
          </>
        )}

        <div className="flex flex-wrap justify-between gap-2 pt-2 border-t border-royalPurple-border">
          <Button
            type="button"
            className="btn-secondary btn-sm"
            onClick={back}
            disabled={step === 0}
          >
            Back
          </Button>
          {step < STEPS.length - 1 ? (
            <Button
              type="button"
              className="btn-primary btn-sm"
              onClick={() => {
                if (step === 3) {
                  setPollCount(0)
                  setVerifyStatus(null)
                  setVerifyRun((n) => n + 1)
                }
                next()
              }}
            >
              {step === 4 && verifyStatus === 'connected' ? 'Continue' : 'Next'}
            </Button>
          ) : null}
        </div>
      </Card>
    </div>
  )
}
