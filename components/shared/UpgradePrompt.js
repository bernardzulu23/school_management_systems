'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { toUserFacingMessage } from '@/lib/utils/errorMessages'

function getTitle(error) {
  const code = String(error?.code || '').toUpperCase()
  if (code === 'PLAN_EXPIRED' || code === 'SUBSCRIPTION_EXPIRED') return 'Plan Expired'
  if (code === 'PLAN_UPGRADE_REQUIRED' || code === 'UPGRADE_REQUIRED') return 'Upgrade Required'
  if (code === 'AI_LIMIT_REACHED' || code === 'AI_QUOTA_EXCEEDED') return 'AI Limit Reached'
  return 'Action Required'
}

function getMessage(error) {
  return toUserFacingMessage(
    error?.error || error?.message,
    'You cannot access this feature right now. Please upgrade your plan or try again later.'
  )
}

export default function UpgradePrompt({ error, onDismiss }) {
  if (!error) return null

  return (
    <div className="rounded-xl border border-royalPurple-border/40 bg-royalPurple-card p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-royalPurple-text1 font-bold">{getTitle(error)}</div>
          <div className="text-royalPurple-text2 text-sm mt-1">{getMessage(error)}</div>
          {error?.limit !== undefined || error?.used !== undefined ? (
            <div className="text-royalPurple-text3 text-xs mt-2">
              {typeof error.used === 'number' ? `Used: ${error.used}` : null}
              {typeof error.limit === 'number' ? `  Limit: ${error.limit}` : null}
            </div>
          ) : null}
        </div>

        {onDismiss ? (
          <button
            type="button"
            onClick={onDismiss}
            className="text-royalPurple-text2 hover:text-royalPurple-text1"
          >
            Close
          </button>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2 mt-4">
        <Link href={error?.billingUrl || '/dashboard/billing'} className="inline-flex">
          <Button
            type="button"
            className="bg-royalPurple-accent hover:opacity-90 text-royalPurple-accentTx"
          >
            Upgrade Plan
          </Button>
        </Link>
        {onDismiss ? (
          <Button variant="outline" onClick={onDismiss}>
            Dismiss
          </Button>
        ) : null}
      </div>
    </div>
  )
}
