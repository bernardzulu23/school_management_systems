'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  PLAN_FEATURES,
  PRIMARY_ONLY_FEATURES,
  SECONDARY_ONLY_FEATURES,
  getAvailableFeaturesForSchool,
  planIncludes,
} from '@/lib/zambiaSchoolFeatures'
import { Check, Lock, School } from 'lucide-react'

export function FeatureGate({ featureId, children, fallback = null }) {
  const [access, setAccess] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    async function run() {
      setLoading(true)
      try {
        const res = await fetch('/api/features/check-access', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ featureId }),
        })
        const json = await res.json().catch(() => ({}))
        if (active) setAccess(json)
      } catch (e) {
        if (active) setAccess({ allowed: false, reason: e?.message || 'Failed to check access' })
      } finally {
        if (active) setLoading(false)
      }
    }
    run()
    return () => {
      active = false
    }
  }, [featureId])

  if (loading) return <div className="text-center py-8 text-royalPurple-text2">Loading...</div>

  if (!access?.allowed) {
    return (
      fallback || (
        <FeatureLockedPrompt
          featureId={featureId}
          reason={access?.reason}
          isPrimaryOnly={access?.isPrimaryOnly}
          isSecondaryOnly={access?.isSecondaryOnly}
          schoolLevel={access?.schoolLevel}
          upgradeHref={access?.billingUrl || '/dashboard/billing'}
        />
      )
    )
  }

  return children
}

export function FeatureLockedPrompt({
  featureId,
  reason,
  isPrimaryOnly,
  isSecondaryOnly,
  schoolLevel,
  onUpgrade,
  upgradeHref = '/dashboard/billing',
}) {
  const featureMeta = isSecondaryOnly
    ? SECONDARY_ONLY_FEATURES[featureId] || {}
    : PRIMARY_ONLY_FEATURES[featureId] || {}

  return (
    <div className="relative rounded-xl border border-royalPurple-border/40 bg-royalPurple-card p-6">
      <div className="absolute inset-0 rounded-xl bg-black/40 backdrop-blur-sm" />
      <div className="relative z-10 text-center">
        {isSecondaryOnly ? (
          <>
            <School className="w-10 h-10 mx-auto mb-3 text-royalPurple-text1" aria-hidden="true" />
            <h3 className="text-lg font-bold text-royalPurple-text1">
              {featureMeta.name || 'Secondary only'}
            </h3>
            <p className="text-royalPurple-text2 mt-2">
              {reason ||
                'This feature is not available for primary schools (ECE–Grade 7). Use CBC continuous assessment instead.'}
            </p>
            <p className="text-royalPurple-text3 text-sm mt-2">
              Your school level: <span className="font-semibold">{schoolLevel || 'unknown'}</span>
            </p>
          </>
        ) : isPrimaryOnly ? (
          <>
            <School className="w-10 h-10 mx-auto mb-3 text-royalPurple-text1" aria-hidden="true" />
            <h3 className="text-lg font-bold text-royalPurple-text1">
              {featureMeta.name || 'Primary Only'}
            </h3>
            <p className="text-royalPurple-text2 mt-2">
              This feature is only available for primary schools (Grades 1-7).
            </p>
            <p className="text-royalPurple-text3 text-sm mt-2">
              Your school level: <span className="font-semibold">{schoolLevel || 'unknown'}</span>
            </p>
          </>
        ) : (
          <>
            <Lock className="w-10 h-10 mx-auto mb-3 text-royalPurple-text1" aria-hidden="true" />
            <h3 className="text-lg font-bold text-royalPurple-text1">Feature Locked</h3>
            <p className="text-royalPurple-text2 mt-2">
              {reason || 'This feature requires a higher plan.'}
            </p>
            {typeof onUpgrade === 'function' ? (
              <button
                type="button"
                onClick={onUpgrade}
                className="mt-4 inline-flex items-center justify-center rounded-lg bg-amber-400 px-5 py-2 font-bold text-black hover:opacity-90"
              >
                Upgrade Plan
              </button>
            ) : (
              <Link
                href={upgradeHref}
                className="mt-4 inline-flex items-center justify-center rounded-lg bg-amber-400 px-5 py-2 font-bold text-black hover:opacity-90"
              >
                Upgrade Plan
              </Link>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export function FeatureBadge({ featureId, plan, schoolLevel, size = 'sm' }) {
  const isPrimaryOnly =
    Boolean(PRIMARY_ONLY_FEATURES[featureId]) &&
    String(schoolLevel || '').toLowerCase() === 'secondary'
  const isInPlan = planIncludes(plan, featureId)

  const cls = size === 'sm' ? 'text-xs px-2 py-1' : 'text-sm px-2.5 py-1.5'

  if (isPrimaryOnly) {
    return (
      <span className={`inline-flex items-center gap-1 rounded ${cls} bg-blue-100 text-blue-800`}>
        <School className="w-4 h-4" aria-hidden="true" /> Primary Only
      </span>
    )
  }

  if (!isInPlan) {
    return (
      <span className={`inline-flex items-center gap-1 rounded ${cls} bg-amber-100 text-amber-900`}>
        <Lock className="w-4 h-4" aria-hidden="true" /> Locked
      </span>
    )
  }

  return (
    <span
      className={`inline-flex items-center gap-1 rounded ${cls} bg-emerald-100 text-emerald-900`}
    >
      <Check className="w-4 h-4" aria-hidden="true" /> Included
    </span>
  )
}

export function AvailableFeaturesList({ schoolPlan, schoolLevel }) {
  const available = useMemo(
    () => getAvailableFeaturesForSchool(schoolPlan, schoolLevel),
    [schoolPlan, schoolLevel]
  )

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-royalPurple-text1">Available Features</h3>
      {available.length === 0 ? (
        <p className="text-royalPurple-text2">
          No features available for your school configuration.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {available.map((id) => {
            const meta = PRIMARY_ONLY_FEATURES[id] || SECONDARY_ONLY_FEATURES[id]
            return (
              <div
                key={id}
                className="rounded-xl border border-royalPurple-border/40 bg-royalPurple-card p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h4 className="font-semibold text-royalPurple-text1 truncate">
                      {meta?.name || id}
                    </h4>
                    {meta?.description ? (
                      <p className="text-sm text-royalPurple-text2 mt-1">{meta.description}</p>
                    ) : null}
                  </div>
                  <FeatureBadge featureId={id} plan={schoolPlan} schoolLevel={schoolLevel} />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function PlanComparisonCard({
  plan,
  schoolLevel = 'combined',
  selected = false,
  onSelect,
  showPrice = false,
  monthlyPrice,
}) {
  const planKey = String(plan || 'basic').toLowerCase()
  const level = String(schoolLevel || 'combined').toLowerCase()
  const display = useMemo(() => getAvailableFeaturesForSchool(planKey, level), [planKey, level])
  const interactive = typeof onSelect === 'function'

  const className = `rounded-xl border p-6 text-left w-full transition-all ${
    selected
      ? 'border-royalPurple-accent bg-royalPurple-accent/10 ring-2 ring-royalPurple-accent'
      : 'border-royalPurple-border/40 bg-royalPurple-card'
  } ${interactive ? 'cursor-pointer hover:border-royalPurple-accent/60' : ''}`

  const inner = (
    <>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-royalPurple-text1 capitalize">{planKey} Plan</h3>
        <span className="text-sm text-royalPurple-text2">{display.length} features</span>
      </div>

      {showPrice && monthlyPrice != null ? (
        <p className="text-2xl font-bold text-royalPurple-accent mb-3">
          K{monthlyPrice}
          <span className="text-sm font-normal text-royalPurple-text2"> / month</span>
        </p>
      ) : null}

      <ul className="space-y-2">
        {display.slice(0, 6).map((f) => (
          <li key={f} className="text-sm text-royalPurple-text2 flex items-center gap-2">
            <Check className="w-4 h-4 text-royalPurple-successTx" aria-hidden="true" />
            <span className="truncate">{f}</span>
          </li>
        ))}
        {display.length > 6 ? (
          <li className="text-sm text-royalPurple-text3 italic">+ {display.length - 6} more</li>
        ) : null}
      </ul>

      {interactive ? (
        <p className="text-xs text-royalPurple-accent mt-4 font-medium">
          {selected ? 'Selected — enter phone number below' : 'Tap to select this plan'}
        </p>
      ) : null}
    </>
  )

  if (interactive) {
    return (
      <button type="button" className={className} onClick={() => onSelect(planKey)}>
        {inner}
      </button>
    )
  }

  return <div className={className}>{inner}</div>
}
