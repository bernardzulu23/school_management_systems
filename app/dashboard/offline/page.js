'use client'

import { useCallback, useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SyncStatusBadge } from '@/components/attendance/SyncStatusBadge'
import { useAuth } from '@/lib/auth'
import { flushOfflineQueues, getAllPendingCount } from '@/lib/offline/sync/engine'
import { decryptSeedPayload } from '@/lib/offline/seed-crypto'
import { getSeedMeta, importSeedIntoOfflineStore } from '@/lib/offline/seed-import'
import { isBrowserOnline } from '@/lib/offline/network'
import { toast } from 'react-hot-toast'
import { Download, Upload, RefreshCw, Wifi, WifiOff } from 'lucide-react'

export default function OfflineSyncPage() {
  const { user } = useAuth()
  const [passphrase, setPassphrase] = useState('')
  const [importPassphrase, setImportPassphrase] = useState('')
  const [busy, setBusy] = useState(false)
  const [online, setOnline] = useState(true)
  const [pending, setPending] = useState(null)
  const [seedMeta, setSeedMeta] = useState(null)

  const refresh = useCallback(async () => {
    setPending(await getAllPendingCount(user?.id || ''))
    setSeedMeta(await getSeedMeta())
    setOnline(isBrowserOnline())
  }, [user?.id])

  useEffect(() => {
    refresh()
    const onOnline = () => {
      setOnline(true)
      refresh()
    }
    const onOffline = () => setOnline(false)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    window.addEventListener('zsms-offline-queue', refresh)
    window.addEventListener('zsms-offline-synced', refresh)
    window.addEventListener('zsms-offline-seed', refresh)
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
      window.removeEventListener('zsms-offline-queue', refresh)
      window.removeEventListener('zsms-offline-synced', refresh)
      window.removeEventListener('zsms-offline-seed', refresh)
    }
  }, [refresh])

  const downloadSeed = async () => {
    if (passphrase.length < 6) {
      toast.error('Choose a passphrase of at least 6 characters')
      return
    }
    if (!online) {
      toast.error('Download a seed while you briefly have internet')
      return
    }
    setBusy(true)
    try {
      const res = await fetch('/api/offline/seed', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passphrase, role: user?.role }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || json.message || 'Seed download failed')

      const blob = new Blob([JSON.stringify(json.seed, null, 2)], {
        type: 'application/json',
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = json.fileName || 'zsms-offline.zsmsseed'
      a.click()
      URL.revokeObjectURL(url)
      toast.success(`Seed downloaded (expires ${new Date(json.expiresAt).toLocaleDateString()})`)
    } catch (e) {
      toast.error(e.message || 'Seed failed')
    } finally {
      setBusy(false)
    }
  }

  const onImportFile = async (file) => {
    if (!file) return
    if (importPassphrase.length < 6) {
      toast.error('Enter the passphrase used when the seed was created')
      return
    }
    setBusy(true)
    try {
      const text = await file.text()
      const envelope = JSON.parse(text)
      const payload = await decryptSeedPayload(envelope, importPassphrase)
      if (payload.userId && user?.id && payload.userId !== user.id) {
        toast.error('This seed was made for a different user. Download your own pack.')
        return
      }
      const result = await importSeedIntoOfflineStore(payload)
      toast.success(
        `Imported seed: ${result.rosters} class list(s), ${result.cacheKeys} cache keys`
      )
      await refresh()
    } catch (e) {
      toast.error(e.message || 'Import failed — check passphrase')
    } finally {
      setBusy(false)
    }
  }

  const syncNow = async () => {
    setBusy(true)
    try {
      const result = await flushOfflineQueues({ userId: user?.id || '' })
      if (result.skipped) toast('Nothing to sync or still offline')
      else if (result.synced > 0)
        toast.success(
          `Synced ${result.synced} change(s)${result.failed ? `, ${result.failed} failed` : ''}`
        )
      else if (result.failed > 0) toast.error('Sync failed — will retry later')
      else toast.success('Everything already synced')
      await refresh()
    } finally {
      setBusy(false)
    }
  }

  return (
    <DashboardLayout title="Offline & sync">
      <div className="max-w-3xl mx-auto space-y-6 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-royalPurple-text1">Offline & sync</h1>
            <p className="text-sm text-royalPurple-text2">
              Prepare this device for 2G / no-signal days. Core marks and attendance sync when you
              reconnect. AI, payments, and SMS need internet.
            </p>
          </div>
          <SyncStatusBadge channel="all" userId={user?.id || ''} noun="change" />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              {online ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
              Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>
              Network: <strong>{online ? 'Online' : 'Offline'}</strong>
            </p>
            <p>
              Pending sync: attendance {pending?.attendance ?? '—'}, results{' '}
              {pending?.results ?? '—'}, other {pending?.mutations ?? '—'}
              {pending?.conflicts ? ` · conflicts ${pending.conflicts}` : ''}
            </p>
            {seedMeta?.importedAt && (
              <p>
                Last seed import: {new Date(seedMeta.importedAt).toLocaleString()} (role{' '}
                {seedMeta.role || '—'})
              </p>
            )}
            <Button onClick={syncNow} disabled={busy || !online} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Sync now
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">1. Download seed pack (while online)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-royalPurple-text2">
              Creates an encrypted <code>.zsmsseed</code> file with only your assigned classes /
              children. Move it by USB, ShareIt, or WhatsApp to a rural device.
            </p>
            <div>
              <Label htmlFor="seed-pass">Passphrase (min 6 characters)</Label>
              <Input
                id="seed-pass"
                type="password"
                autoComplete="new-password"
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                placeholder="Remember this phrase"
              />
            </div>
            <Button onClick={downloadSeed} disabled={busy || !online}>
              <Download className="h-4 w-4 mr-2" />
              Download .zsmsseed
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">2. Import seed pack (rural device)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label htmlFor="import-pass">Passphrase from step 1</Label>
              <Input
                id="import-pass"
                type="password"
                autoComplete="off"
                value={importPassphrase}
                onChange={(e) => setImportPassphrase(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="seed-file">Seed file</Label>
              <Input
                id="seed-file"
                type="file"
                accept=".zsmsseed,application/json"
                disabled={busy}
                onChange={(e) => onImportFile(e.target.files?.[0])}
              />
            </div>
            <p className="text-xs text-royalPurple-text3 flex items-start gap-2">
              <Upload className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              After import, open Attendance / Results / SBA while offline and enter marks. Sync when
              you next have signal.
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
