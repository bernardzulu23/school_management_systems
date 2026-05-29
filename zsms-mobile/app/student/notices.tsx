import { useCallback, useState } from 'react'
import { FlatList, Text, View } from 'react-native'
import { useFocusEffect } from 'expo-router'
import { loadNotices } from '@/api/notices'
import { globalStyles } from '@/theme/styles'
import { ZsmsTheme } from '@/theme/colors'
import type { Notice } from '@/types'

function formatDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })
}

export default function NoticesScreen() {
  const [notices, setNotices] = useState<Notice[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchNotices = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setNotices(await loadNotices(40))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load notices')
    } finally {
      setLoading(false)
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      fetchNotices()
    }, [fetchNotices])
  )

  return (
    <View style={globalStyles.container}>
      <Text style={globalStyles.title}>Notices</Text>
      <Text style={globalStyles.subtitle}>School events &amp; announcements</Text>
      {error ? <Text style={globalStyles.errorText}>{error}</Text> : null}
      <FlatList
        data={notices}
        keyExtractor={(n) => n.id}
        refreshing={loading}
        onRefresh={fetchNotices}
        ListEmptyComponent={
          loading ? null : <Text style={globalStyles.subtitle}>No notices right now.</Text>
        }
        renderItem={({ item }) => (
          <View style={globalStyles.card}>
            <View
              style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}
            >
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: '800',
                  textTransform: 'uppercase',
                  color: item.upcoming ? ZsmsTheme.accent : ZsmsTheme.textSecondary,
                }}
              >
                {item.upcoming ? 'Upcoming' : 'Past'} • {item.type}
              </Text>
              <Text style={{ fontSize: 12, color: ZsmsTheme.textSecondary }}>
                {formatDate(item.date)}
              </Text>
            </View>
            <Text style={{ fontWeight: '800', fontSize: 16, color: ZsmsTheme.ink }}>
              {item.title}
            </Text>
            {item.description ? (
              <Text style={{ color: ZsmsTheme.ink, marginTop: 4 }}>{item.description}</Text>
            ) : null}
            <Text style={{ color: ZsmsTheme.textSecondary, fontSize: 12, marginTop: 6 }}>
              {[item.location, item.organizer].filter(Boolean).join(' • ')}
            </Text>
          </View>
        )}
      />
    </View>
  )
}
