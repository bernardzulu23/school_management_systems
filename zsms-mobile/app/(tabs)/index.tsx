import { useCallback } from 'react'
import { RefreshControl, ScrollView, Text, View } from 'react-native'
import { router, useFocusEffect } from 'expo-router'
import { BrutalButton } from '@/components/BrutalButton'
import { WebAppBanner } from '@/components/WebAppBanner'
import { useSessionStore } from '@/store/sessionStore'
import { useOfflineQueue } from '@/store/offlineQueue'
import { useAuthStore } from '@/store/authStore'
import { ERROR_MESSAGES } from '@/lib/security/userFacingErrors'
import { globalStyles } from '@/theme/styles'

export default function HomeScreen() {
  const { context, loading, error, load, getTodaySummary } = useSessionStore()
  const { items, hydrate, flushOfflineQueue, syncing, lastSyncError } = useOfflineQueue()
  const logout = useAuthStore((s) => s.logout)
  const summary = getTodaySummary()
  const sessionExpired = error === ERROR_MESSAGES.SESSION_EXPIRED

  useFocusEffect(
    useCallback(() => {
      load()
      hydrate()
    }, [load, hydrate])
  )

  return (
    <ScrollView
      style={globalStyles.screen}
      contentContainerStyle={globalStyles.container}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
    >
      <Text style={globalStyles.title}>{context?.school?.name || 'ZSMS Teacher'}</Text>
      <Text style={globalStyles.subtitle}>Welcome, {context?.user?.name || 'Teacher'}</Text>
      <WebAppBanner />
      <View style={globalStyles.card}>
        <Text style={{ fontWeight: '700', color: '#111' }}>Today</Text>
        <Text style={globalStyles.subtitle}>{summary.message}</Text>
      </View>
      {items.length > 0 ? (
        <View style={[globalStyles.card, { backgroundColor: '#FFFBEB' }]}>
          <Text>{items.length} item(s) waiting to sync</Text>
          {lastSyncError ? (
            <Text style={[globalStyles.errorText, { marginTop: 8 }]}>{lastSyncError}</Text>
          ) : null}
          <BrutalButton
            title={syncing ? 'Syncing…' : 'Sync now'}
            onPress={() => flushOfflineQueue()}
            loading={syncing}
            style={{ marginTop: 12 }}
          />
        </View>
      ) : null}
      <BrutalButton
        title="Study materials"
        variant="secondary"
        onPress={() => router.push('/materials')}
        style={{ marginTop: 12, marginBottom: 12 }}
      />
      {error ? <Text style={globalStyles.errorText}>{error}</Text> : null}
      {sessionExpired ? (
        <BrutalButton
          title="Log in again"
          onPress={async () => {
            await logout()
            router.replace('/(auth)/login')
          }}
          style={{ marginBottom: 12 }}
        />
      ) : null}

      <BrutalButton title="Mark attendance" onPress={() => router.push('/(tabs)/attendance')} />
      <BrutalButton
        title="My timetable"
        variant="secondary"
        onPress={() => router.push('/timetable')}
        style={{ marginTop: 12 }}
      />
      <BrutalButton
        title="Record SBA scores"
        variant="secondary"
        onPress={() => router.push('/(tabs)/scores')}
        style={{ marginTop: 12 }}
      />
      <BrutalButton
        title="Lesson plans (offline)"
        variant="secondary"
        onPress={() => router.push('/lesson-plans')}
        style={{ marginTop: 12 }}
      />
    </ScrollView>
  )
}
