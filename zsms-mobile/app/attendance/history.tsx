import { Text, View } from 'react-native'
import { useAttendanceStore } from '@/store/attendanceStore'
import { globalStyles } from '@/theme/styles'

export default function AttendanceHistoryScreen() {
  const { historyCache } = useAttendanceStore()
  const keys = Object.keys(historyCache)

  return (
    <View style={globalStyles.container}>
      <Text style={globalStyles.title}>Attendance history</Text>
      <Text style={globalStyles.subtitle}>Cached registers from this device.</Text>
      {keys.length === 0 ? (
        <Text style={globalStyles.subtitle}>
          No history yet. Mark attendance to cache sessions.
        </Text>
      ) : (
        keys.map((key) => (
          <View key={key} style={globalStyles.card}>
            <Text style={{ fontWeight: '700' }}>{key}</Text>
            <Text style={globalStyles.subtitle}>{historyCache[key].length} students</Text>
          </View>
        ))
      )}
    </View>
  )
}
