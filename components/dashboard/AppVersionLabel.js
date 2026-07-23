'use client'

import { getAppName, getAppVersion, getAppVersionLabel } from '@/lib/app-version'
import { cn } from '@/lib/utils'

/**
 * @param {{ compact?: boolean; className?: string }} props
 */
export function AppVersionLabel({ compact = false, className }) {
  const version = getAppVersion()
  const label = getAppVersionLabel()
  const appName = getAppName()

  if (compact) {
    return (
      <p
        className={cn('text-xs text-royalPurple-text3 tabular-nums', className)}
        title={`${appName} — version ${label}`}
      >
        v{label}
      </p>
    )
  }

  return (
    <div className={cn('text-sm text-royalPurple-text2', className)}>
      <p className="font-medium text-royalPurple-text1">{appName}</p>
      <p className="text-xs text-royalPurple-text3 mt-0.5 tabular-nums">
        Version <span className="text-royalPurple-text2">{label}</span>
        {label !== version ? <span className="sr-only"> (release {version})</span> : null}
      </p>
    </div>
  )
}
