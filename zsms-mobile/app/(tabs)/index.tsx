import { useCallback } from 'react'
import { RefreshControl, ScrollView, Text, View } from 'react-native'
import { router, useFocusEffect } from 'expo-router'
import { BrutalButton } from '@/components/BrutalButton'
import { WebAppBanner } from '@/components/WebAppBanner'
import { useSessionStore } from '@/store/sessionStore'
import { useOfflineQueue } from '@/store/offlineQueue'
import { globalStyles } from '@/theme/styles'

export default function HomeScreen() {
  const { context, loading, error, load, getTodaySummary } = useSessionStore()
  const { items, hydrate, flushOfflineQueue, syncing } = useOfflineQueue()
  const summary = getTodaySummary()

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
          <BrutalButton
            title={syncing ? 'Syncing…' : 'Sync now'}
            onPress={() => flushOfflineQueue()}
            loading={syncing}
            style={{ marginTop: 12 }}
          />
        </View>
      ) : null}
      {error ? <Text style={globalStyles.errorText}>{error}</Text> : null}

      <BrutalButton title="Mark attendance" onPress={() => router.push('/(tabs)/attendance')} />
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
