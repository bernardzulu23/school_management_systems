import { useCallback } from 'react'
import { FlatList, Pressable, Text, View } from 'react-native'
import { router, useFocusEffect } from 'expo-router'
import { useLessonPlanCache } from '@/store/lessonPlanCache'
import { globalStyles } from '@/theme/styles'
import { ZsmsTheme } from '@/theme/colors'

function statusColor(status: string): string {
  const s = String(status || '').toUpperCase()
  if (s === 'APPROVED') return ZsmsTheme.success
  if (s === 'REJECTED') return ZsmsTheme.danger
  if (s === 'SUBMITTED') return ZsmsTheme.warn
  return ZsmsTheme.textSecondary
}

export default function LessonPlansScreen() {
  const { plans, loading, fromCache, cachedAt, error, hydrate, refresh } = useLessonPlanCache()

  useFocusEffect(
    useCallback(() => {
      ;(async () => {
        await hydrate()
        await refresh()
      })()
    }, [hydrate, refresh])
  )

  return (
    <View style={globalStyles.container}>
      <Text style={globalStyles.title}>Lesson Plans</Text>
      <Text style={globalStyles.subtitle}>
        {fromCache && cachedAt
          ? `Offline copy from ${new Date(cachedAt).toLocaleString()}`
          : 'Your lesson plans (available offline)'}
      </Text>
      {error ? <Text style={globalStyles.errorText}>{error}</Text> : null}
      <FlatList
        data={plans}
        keyExtractor={(p) => p.id}
        refreshing={loading}
        onRefresh={refresh}
        ListEmptyComponent={
          loading ? null : <Text style={globalStyles.subtitle}>No lesson plans cached yet.</Text>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push({ pathname: '/lesson-plans/[id]', params: { id: item.id } })}
            style={globalStyles.card}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontWeight: '800', fontSize: 15, color: ZsmsTheme.ink, flex: 1 }}>
                {item.subject} • {item.grade}
              </Text>
              <Text style={{ fontWeight: '800', fontSize: 11, color: statusColor(item.status) }}>
                {item.status}
              </Text>
            </View>
            <Text style={{ color: ZsmsTheme.ink, marginTop: 4 }}>{item.topic}</Text>
            {item.subTopic ? (
              <Text style={{ color: ZsmsTheme.textSecondary, fontSize: 12, marginTop: 2 }}>
                {item.subTopic}
              </Text>
            ) : null}
          </Pressable>
        )}
      />
    </View>
  )
}
