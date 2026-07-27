import { useCallback, useMemo, useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { router, useFocusEffect } from 'expo-router'
import { loadTimetable, weekdayKey } from '@/api/timetable'
import { BrutalButton } from '@/components/BrutalButton'
import { globalStyles } from '@/theme/styles'
import { ZsmsTheme } from '@/theme/colors'
import type { TimetableAssignment } from '@/types'

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
const TERMS = ['Term 1', 'Term 2', 'Term 3']

function dayLabel(key: string): string {
  return key.charAt(0).toUpperCase() + key.slice(1)
}

export default function TeacherTimetableScreen() {
  const [selectedTerm, setSelectedTerm] = useState<string | null>(null)
  const [resolvedTerm, setResolvedTerm] = useState('')
  const [academicYear, setAcademicYear] = useState('')
  const [mode, setMode] = useState<'today' | 'week'>('today')
  const [assignments, setAssignments] = useState<TimetableAssignment[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | undefined>()
  const today = weekdayKey()

  const fetchTimetable = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await loadTimetable(selectedTerm ? { term: selectedTerm } : {})
      setAssignments(data.assignments)
      setMessage(data.message)
      setResolvedTerm(data.term)
      setAcademicYear(data.academicYear)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load timetable')
    } finally {
      setLoading(false)
    }
  }, [selectedTerm])

  useFocusEffect(
    useCallback(() => {
      void fetchTimetable()
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

  const visibleDays =
    mode === 'today' ? (DAYS.includes(today) ? [today] : []) : DAYS.filter((d) => byDay[d]?.length)

  function openSession(a: TimetableAssignment) {
    if (!a.classId) return
    router.push({
      pathname: '/attendance/session/[classId]',
      params: {
        classId: a.classId,
        subjectId: a.subjectId || '',
        className: a.className || '',
        subjectName: a.subjectName || '',
      },
    })
  }

  return (
    <ScrollView style={globalStyles.screen} contentContainerStyle={{ padding: 16 }}>
      <Text style={globalStyles.title}>My timetable</Text>
      <Text style={globalStyles.subtitle}>
        {academicYear ? `Year ${academicYear}` : 'Published schedule'}
        {resolvedTerm ? ` · ${resolvedTerm}` : ''}
      </Text>

      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
        <BrutalButton
          title="Today"
          variant={mode === 'today' ? 'primary' : 'secondary'}
          onPress={() => setMode('today')}
          style={{ flex: 1, paddingVertical: 8 }}
        />
        <BrutalButton
          title="Week"
          variant={mode === 'week' ? 'primary' : 'secondary'}
          onPress={() => setMode('week')}
          style={{ flex: 1, paddingVertical: 8 }}
        />
      </View>

      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
        {TERMS.map((t) => (
          <BrutalButton
            key={t}
            title={t.replace('Term ', 'T')}
            variant={(selectedTerm || resolvedTerm) === t ? 'primary' : 'secondary'}
            onPress={() => setSelectedTerm(t)}
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
      {!loading && mode === 'today' && DAYS.includes(today) && !byDay[today]?.length ? (
        <Text style={globalStyles.subtitle}>No lessons scheduled for today.</Text>
      ) : null}
      {mode === 'today' && !DAYS.includes(today) ? (
        <Text style={globalStyles.subtitle}>Weekend — switch to Week to browse Mon–Fri.</Text>
      ) : null}

      {visibleDays.map((day) => (
        <View key={day} style={globalStyles.card}>
          <Text style={{ fontWeight: '800', fontSize: 16, color: ZsmsTheme.ink, marginBottom: 8 }}>
            {dayLabel(day)}
            {day === today ? ' · Today' : ''}
          </Text>
          {(byDay[day] || []).map((a) => (
            <Pressable
              key={a.id}
              onPress={() => openSession(a)}
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                paddingVertical: 8,
                borderTopWidth: 1,
                borderTopColor: ZsmsTheme.borderMuted,
              }}
            >
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={{ fontWeight: '700', color: ZsmsTheme.ink }}>
                  {a.subjectName || 'Subject'}
                </Text>
                {a.className ? (
                  <Text style={{ color: ZsmsTheme.textSecondary, fontSize: 12 }}>
                    {a.className}
                  </Text>
                ) : null}
                {a.classId ? (
                  <Text style={{ color: ZsmsTheme.accent, fontSize: 11, marginTop: 2 }}>
                    Tap to start attendance
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
            </Pressable>
          ))}
        </View>
      ))}
    </ScrollView>
  )
}
