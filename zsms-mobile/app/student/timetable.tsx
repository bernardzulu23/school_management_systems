import { useCallback, useMemo, useState } from 'react'
import { ScrollView, Text, View } from 'react-native'
import { useFocusEffect } from 'expo-router'
import { loadTimetable } from '@/api/timetable'
import { currentAcademicYear } from '@/utils/date'
import { globalStyles } from '@/theme/styles'
import { ZsmsTheme } from '@/theme/colors'
import { BrutalButton } from '@/components/BrutalButton'
import type { TimetableAssignment } from '@/types'

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
const TERMS = ['Term 1', 'Term 2', 'Term 3']

function dayLabel(key: string): string {
  return key.charAt(0).toUpperCase() + key.slice(1)
}

export default function TimetableScreen() {
  const [term, setTerm] = useState('Term 1')
  const [assignments, setAssignments] = useState<TimetableAssignment[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | undefined>()

  const fetchTimetable = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await loadTimetable({ term, academicYear: currentAcademicYear() })
      setAssignments(data.assignments)
      setMessage(data.message)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load timetable')
    } finally {
      setLoading(false)
    }
  }, [term])

  useFocusEffect(
    useCallback(() => {
      fetchTimetable()
    }, [fetchTimetable])
  )

  const byDay = useMemo(() => {
    const map: Record<string, TimetableAssignment[]> = {}
    for (const a of assignments) {
      const key = String(a.dayOfWeek || '').toLowerCase()
      if (!map[key]) map[key] = []
      map[key].push(a)
    }
    for (const key of Object.keys(map)) {
      map[key].sort((x, y) => (x.period || 0) - (y.period || 0))
    }
    return map
  }, [assignments])

  return (
    <ScrollView style={globalStyles.screen} contentContainerStyle={{ padding: 16 }}>
      <Text style={globalStyles.title}>My Timetable</Text>
      <Text style={globalStyles.subtitle}>Year {currentAcademicYear()}</Text>

      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
        {TERMS.map((t) => (
          <BrutalButton
            key={t}
            title={t.replace('Term ', 'T')}
            variant={term === t ? 'primary' : 'secondary'}
            onPress={() => setTerm(t)}
            style={{ flex: 1, paddingVertical: 8 }}
          />
        ))}
      </View>

      {loading ? <Text style={globalStyles.subtitle}>Loading…</Text> : null}
      {error ? <Text style={globalStyles.errorText}>{error}</Text> : null}
      {!loading && !error && assignments.length === 0 ? (
        <Text style={globalStyles.subtitle}>
          {message || 'No published timetable for this term.'}
        </Text>
      ) : null}

      {DAYS.filter((d) => byDay[d]?.length).map((day) => (
        <View key={day} style={globalStyles.card}>
          <Text style={{ fontWeight: '800', fontSize: 16, color: ZsmsTheme.ink, marginBottom: 8 }}>
            {dayLabel(day)}
          </Text>
          {byDay[day].map((a) => (
            <View
              key={a.id}
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                paddingVertical: 6,
                borderTopWidth: 1,
                borderTopColor: ZsmsTheme.borderMuted,
              }}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '700', color: ZsmsTheme.ink }}>
                  {a.subjectName || 'Subject'}
                </Text>
                {a.className ? (
                  <Text style={{ color: ZsmsTheme.textSecondary, fontSize: 12 }}>
                    {a.className}
                  </Text>
                ) : null}
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ fontWeight: '700', color: ZsmsTheme.accent }}>P{a.period}</Text>
                {a.startTime ? (
                  <Text style={{ color: ZsmsTheme.textSecondary, fontSize: 12 }}>
                    {a.startTime}
                    {a.endTime ? `–${a.endTime}` : ''}
                  </Text>
                ) : null}
              </View>
            </View>
          ))}
        </View>
      ))}
    </ScrollView>
  )
}
