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
  const { getPendingCount, clearOfflineQueue } = useOfflineQueue()
  const [health, setHealth] = useState<string>('—')

  useEffect(() => {
    checkAppVersion().then((h) => setHealth(h.ok ? h.version || 'OK' : 'Offline'))
  }, [])

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
    Alert.alert('Clear offline queue?', 'Removes unsynced attendance and scores.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: () => clearOfflineQueue(),
      },
    ])
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
      </View>
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
