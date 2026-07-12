'use client'

import { useEffect, useState } from 'react'
import { Bell, Save } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import LoadingSpinner from '@/components/LoadingSpinner'
import toast from 'react-hot-toast'
import { isWebPushSupported, subscribeToWebPush } from '@/lib/notifications/clientWebPush'

export function NotificationPreferences() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [subscribing, setSubscribing] = useState(false)
  const [prefs, setPrefs] = useState({
    webPushEnabled: true,
    emailEnabled: true,
    smsEnabled: true,
    quietHoursStart: '15:00',
    quietHoursEnd: '06:45',
    timezone: 'Africa/Lusaka',
  })

  const load = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/notifications/preferences', { credentials: 'include' })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Failed to load preferences')
      setPrefs({
        webPushEnabled: Boolean(json.data?.webPushEnabled),
        emailEnabled: Boolean(json.data?.emailEnabled),
        smsEnabled: Boolean(json.data?.smsEnabled),
        quietHoursStart: json.data?.quietHoursStart || '15:00',
        quietHoursEnd: json.data?.quietHoursEnd || '06:45',
        timezone: json.data?.timezone || 'Africa/Lusaka',
      })
    } catch (error) {
      toast.error(error.message || 'Could not load preferences')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const save = async () => {
    if (!prefs.webPushEnabled && !prefs.emailEnabled && !prefs.smsEnabled) {
      toast.error('At least one channel must stay enabled')
      return
    }
    try {
      setSaving(true)
      const res = await fetch('/api/notifications/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(prefs),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Could not save preferences')
      toast.success('Notification preferences saved')
      setPrefs((p) => ({ ...p, ...json.data }))
    } catch (error) {
      toast.error(error.message || 'Could not save')
    } finally {
      setSaving(false)
    }
  }

  const enableBrowserPush = async () => {
    try {
      setSubscribing(true)
      const result = await subscribeToWebPush()
      if (!result.ok) {
        toast.error(result.error || 'Could not enable browser push')
        return
      }
      setPrefs((p) => ({ ...p, webPushEnabled: true }))
      toast.success('Browser push enabled')
    } catch (error) {
      toast.error(error.message || 'Could not enable browser push')
    } finally {
      setSubscribing(false)
    }
  }

  if (loading) return <LoadingSpinner />

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notification preferences
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <p className="text-sm text-royalPurple-text2">
          Teachers and admins receive mandatory alerts. You can turn channels on or off, but at
          least one must stay enabled. Quiet hours default to 15:00–06:45 (local).
        </p>

        <div className="space-y-3">
          {[
            { key: 'webPushEnabled', label: 'Web push (browser)' },
            { key: 'emailEnabled', label: 'Email' },
            { key: 'smsEnabled', label: 'SMS (critical alerts only)' },
          ].map((item) => (
            <label
              key={item.key}
              className="flex items-center justify-between gap-3 text-sm text-royalPurple-text1"
            >
              <span>{item.label}</span>
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={Boolean(prefs[item.key])}
                onChange={(e) => setPrefs((p) => ({ ...p, [item.key]: e.target.checked }))}
              />
            </label>
          ))}
        </div>

        {isWebPushSupported() ? (
          <Button variant="outline" size="sm" onClick={enableBrowserPush} disabled={subscribing}>
            {subscribing ? 'Enabling…' : 'Enable browser push on this device'}
          </Button>
        ) : (
          <p className="text-xs text-royalPurple-text3">
            This browser does not support web push notifications.
          </p>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="text-royalPurple-text2">Quiet hours start</span>
            <input
              type="time"
              className="mt-1 w-full rounded-lg border border-royalPurple-border bg-royalPurple-card1 px-3 py-2"
              value={prefs.quietHoursStart}
              onChange={(e) => setPrefs((p) => ({ ...p, quietHoursStart: e.target.value }))}
            />
          </label>
          <label className="block text-sm">
            <span className="text-royalPurple-text2">Quiet hours end</span>
            <input
              type="time"
              className="mt-1 w-full rounded-lg border border-royalPurple-border bg-royalPurple-card1 px-3 py-2"
              value={prefs.quietHoursEnd}
              onChange={(e) => setPrefs((p) => ({ ...p, quietHoursEnd: e.target.value }))}
            />
          </label>
        </div>

        <Button onClick={save} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving…' : 'Save preferences'}
        </Button>
      </CardContent>
    </Card>
  )
}
