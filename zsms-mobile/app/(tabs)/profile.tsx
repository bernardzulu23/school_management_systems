import { useEffect, useState } from 'react'
import { Alert, Text, View } from 'react-native'
import { router } from 'expo-router'
import { BrutalButton } from '@/components/BrutalButton'
import { checkAppVersion } from '@/api/health'
import { useAuthStore } from '@/store/authStore'
import { useSessionStore } from '@/store/sessionStore'
import { useOfflineQueue } from '@/store/offlineQueue'
import { clearSubdomainOnly } from '@/storage/secure'
import { globalStyles } from '@/theme/styles'

export default function ProfileScreen() {
  const { user, school, logout } = useAuthStore()
  const { context } = useSessionStore()
  const { items, getPendingCount, clearOfflineQueue, flushOfflineQueue, syncing, hydrate } =
    useOfflineQueue()
  const [health, setHealth] = useState<string>('—')

  useEffect(() => {
    hydrate()
    checkAppVersion().then((h) => setHealth(h.ok ? h.version || 'OK' : 'Offline'))
  }, [hydrate])

  async function onSyncNow() {
    const { synced, failed } = await flushOfflineQueue()
    Alert.alert(
      failed > 0 ? 'Sync partly failed' : 'Sync complete',
      `${synced} batch(es) synced${failed > 0 ? `, ${failed} failed` : ''}.`
    )
  }

  async function onLogout() {
    await logout()
    router.replace('/(auth)/school-select')
  }

  async function changeSchool() {
    await logout()
    await clearSubdomainOnly()
    router.replace('/(auth)/school-select')
  }

  function onClearQueue() {
    Alert.alert(
      'Clear offline queue?',
      'Removes unsynced attendance, lesson sessions, and scores.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => clearOfflineQueue(),
        },
      ]
    )
  }

  return (
    <View style={globalStyles.container}>
      <Text style={globalStyles.title}>Profile</Text>
      <View style={globalStyles.card}>
        <Text style={{ fontWeight: '700' }}>{context?.user?.name || user?.name}</Text>
        <Text style={globalStyles.subtitle}>{user?.email}</Text>
        <Text style={globalStyles.subtitle}>Role: {context?.user?.role || user?.role}</Text>
        <Text style={globalStyles.subtitle}>School: {school?.name || context?.school?.name}</Text>
        <Text style={globalStyles.subtitle}>Subdomain: {school?.subdomain}</Text>
        <Text style={globalStyles.subtitle}>API: {health}</Text>
        <Text style={globalStyles.subtitle}>Pending sync: {getPendingCount()}</Text>
        {items.some((i) => i.type === 'lessonSession') ? (
          <Text style={globalStyles.subtitle}>Includes lesson session marks</Text>
        ) : null}
      </View>
      {getPendingCount() > 0 ? (
        <BrutalButton
          title="Sync now"
          onPress={onSyncNow}
          loading={syncing}
          style={{ marginBottom: 12 }}
        />
      ) : null}
      <BrutalButton title="Change school" variant="secondary" onPress={changeSchool} />
      <BrutalButton title="Sign out" onPress={onLogout} style={{ marginTop: 12 }} />
      <BrutalButton
        title="Clear offline queue"
        variant="ghost"
        onPress={onClearQueue}
        style={{ marginTop: 24 }}
      />
    </View>
  )
}
