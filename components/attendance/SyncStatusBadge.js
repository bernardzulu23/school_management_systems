'use client'

/**
 * Shows offline/online state and pending sync count.
 * labelNoun defaults to "mark" (attendance); use "result" on gradebook / SBA pages.
 */
import { Loader2, Wifi, WifiOff, CloudUpload } from 'lucide-react'
import { useOfflineSync } from '@/lib/offline/use-sync'

/**
 * @param {{
 *   channel?: 'all' | 'attendance' | 'results',
 *   userId?: string,
 *   postGradebook?: (payload: object) => Promise<unknown>,
 *   noun?: string,
 * }} [props]
 */
export function SyncStatusBadge({
  channel = 'attendance',
  userId = '',
  postGradebook,
  noun = 'mark',
} = {}) {
  const { isOnline, pendingCount, syncing, lastSync, syncNow } = useOfflineSync({
    channel,
    userId,
    postGradebook,
  })

  const plural = pendingCount !== 1 ? 's' : ''

  if (syncing) {
    return (
      <div
        className="flex items-center gap-1.5 text-xs text-royalPurple-accent bg-royalPurple-accent/15 px-3 py-1.5 rounded-full border border-royalPurple-border/40"
        role="status"
        aria-live="polite"
      >
        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
        Syncing {pendingCount} {noun}
        {plural}…
      </div>
    )
  }

  if (!isOnline && pendingCount > 0) {
    return (
      <div
        className="flex items-center gap-1.5 text-xs text-amber-800 bg-amber-50 px-3 py-1.5 rounded-full border border-amber-200"
        role="status"
      >
        <WifiOff className="h-3.5 w-3.5 shrink-0" aria-hidden />
        Offline — {pendingCount} {noun}
        {plural} pending
      </div>
    )
  }

  if (!isOnline) {
    return (
      <div
        className="flex items-center gap-1.5 text-xs text-royalPurple-text3 bg-royalPurple-muted/60 px-3 py-1.5 rounded-full border border-royalPurple-border/40"
        role="status"
      >
        <WifiOff className="h-3.5 w-3.5 shrink-0" aria-hidden />
        Offline — {noun}s saved on this device
      </div>
    )
  }

  if (pendingCount > 0) {
    return (
      <button
        type="button"
        onClick={() => syncNow()}
        className="flex items-center gap-1.5 text-xs text-amber-800 bg-amber-50 px-3 py-1.5 rounded-full border border-amber-200 hover:bg-amber-100 transition-colors"
        aria-label={`Sync ${pendingCount} pending ${noun}${plural}`}
      >
        <CloudUpload className="h-3.5 w-3.5 shrink-0" aria-hidden />
        {pendingCount} not synced — tap to sync
      </button>
    )
  }

  return (
    <div
      className="flex items-center gap-1.5 text-xs text-royalPurple-successTx bg-royalPurple-success/15 px-3 py-1.5 rounded-full border border-royalPurple-border/40"
      role="status"
    >
      <Wifi className="h-3.5 w-3.5 shrink-0" aria-hidden />
      {lastSync?.synced > 0 ? 'Synced ✓' : 'Online'}
    </div>
  )
}
