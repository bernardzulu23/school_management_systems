import { useCallback, useMemo, useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native'
import { router, useFocusEffect } from 'expo-router'
import { BrutalButton } from '@/components/BrutalButton'
import { listOpenSessions, type AttendanceSessionDto } from '@/api/attendanceSessions'
import { useSessionStore } from '@/store/sessionStore'
import { ZsmsTheme } from '@/theme/colors'
import { globalStyles } from '@/theme/styles'

type ClassOption = { id: string; name: string }
type SubjectOption = { id: string; name: string }

export default function AttendanceClassPickerScreen() {
  const { context, load, loading } = useSessionStore()
  const assignments = context?.assignments || []

  const [classId, setClassId] = useState('')
  const [subjectId, setSubjectId] = useState('')
  const [periodLabel, setPeriodLabel] = useState('Period 1')
  const [openSessions, setOpenSessions] = useState<AttendanceSessionDto[]>([])
  const [sessionsLoading, setSessionsLoading] = useState(false)
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refreshSessions = useCallback(async () => {
    setSessionsLoading(true)
    try {
      const sessions = await listOpenSessions()
      setOpenSessions(Array.isArray(sessions) ? sessions : [])
    } catch {
      setOpenSessions([])
    } finally {
      setSessionsLoading(false)
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      load()
      refreshSessions()
    }, [load, refreshSessions])
  )

  const classes: ClassOption[] = useMemo(() => {
    const map = new Map<string, string>()
    for (const a of assignments) {
      if (!a.classId) continue
      map.set(String(a.classId), a.className || String(a.classId))
    }
    return [...map.entries()].map(([id, name]) => ({ id, name }))
  }, [assignments])

  const subjectsForClass: SubjectOption[] = useMemo(() => {
    return assignments
      .filter((a) => String(a.classId) === String(classId) && a.subjectId)
      .map((a) => ({
        id: String(a.subjectId),
        name: a.subjectName || String(a.subjectId),
      }))
  }, [assignments, classId])

  const selectedClass = classes.find((c) => c.id === classId)
  const selectedSubject = subjectsForClass.find((s) => s.id === subjectId)

  function startSession() {
    if (!classId || !subjectId) {
      setError('Select class and subject')
      return
    }
    setError(null)
    setStarting(true)
    router.push({
      pathname: '/attendance/session/[classId]',
      params: {
        classId,
        subjectId,
        className: selectedClass?.name || '',
        subjectName: selectedSubject?.name || '',
        periodLabel: periodLabel.trim() || 'Period 1',
      },
    })
    setStarting(false)
  }

  function openExisting(session: AttendanceSessionDto) {
    router.push({
      pathname: '/attendance/session/[classId]',
      params: {
        classId: session.classId,
        subjectId: session.subjectId,
        className: session.class?.name || '',
        subjectName: session.subject?.name || '',
        periodLabel: session.periodLabel || 'Period 1',
      },
    })
  }

  return (
    <ScrollView style={globalStyles.container} contentContainerStyle={{ paddingBottom: 32 }}>
      <Text style={globalStyles.title}>Lesson sessions</Text>
      <Text style={globalStyles.subtitle}>
        Open a per-lesson session (class, subject, period), then mark attendance. Parent SMS for
        absent/late runs when you close the session.
      </Text>

      {error ? <Text style={globalStyles.errorText}>{error}</Text> : null}

      <View style={globalStyles.card}>
        <Text style={[globalStyles.title, { fontSize: 18, marginBottom: 12 }]}>
          Open new session
        </Text>

        <Text style={globalStyles.label}>Class</Text>
        <View style={styles.chipRow}>
          {classes.length === 0 ? (
            <Text style={globalStyles.subtitle}>No teaching assignments found.</Text>
          ) : (
            classes.map((c) => (
              <Pressable
                key={c.id}
                onPress={() => {
                  setClassId(c.id)
                  setSubjectId('')
                  setError(null)
                }}
                style={[styles.chip, classId === c.id && styles.chipActive]}
              >
                <Text style={[styles.chipText, classId === c.id && styles.chipTextActive]}>
                  {c.name}
                </Text>
              </Pressable>
            ))
          )}
        </View>

        <Text style={globalStyles.label}>Subject</Text>
        <View style={styles.chipRow}>
          {!classId ? (
            <Text style={globalStyles.subtitle}>Select a class first.</Text>
          ) : subjectsForClass.length === 0 ? (
            <Text style={globalStyles.subtitle}>No subjects for this class.</Text>
          ) : (
            subjectsForClass.map((s) => (
              <Pressable
                key={s.id}
                onPress={() => {
                  setSubjectId(s.id)
                  setError(null)
                }}
                style={[styles.chip, subjectId === s.id && styles.chipActive]}
              >
                <Text style={[styles.chipText, subjectId === s.id && styles.chipTextActive]}>
                  {s.name}
                </Text>
              </Pressable>
            ))
          )}
        </View>

        <Text style={globalStyles.label}>Period</Text>
        <TextInput
          style={globalStyles.input}
          value={periodLabel}
          onChangeText={setPeriodLabel}
          placeholder="Period 1"
          placeholderTextColor={ZsmsTheme.textMuted}
        />

        <BrutalButton
          title="Start session"
          onPress={startSession}
          loading={starting}
          disabled={!classId || !subjectId || starting}
        />
      </View>

      <View style={globalStyles.card}>
        <Text style={[globalStyles.title, { fontSize: 18, marginBottom: 12 }]}>Open sessions</Text>
        {sessionsLoading ? (
          <ActivityIndicator color={ZsmsTheme.ink} />
        ) : openSessions.length === 0 ? (
          <Text style={globalStyles.subtitle}>No open sessions.</Text>
        ) : (
          openSessions.map((s) => (
            <Pressable key={s.id} onPress={() => openExisting(s)} style={styles.sessionRow}>
              <Text style={styles.sessionTitle}>
                {s.class?.name || s.classId} — {s.subject?.name || s.subjectId}
              </Text>
              <Text style={styles.sessionMeta}>{s.periodLabel || 'Lesson'}</Text>
            </Pressable>
          ))
        )}
      </View>

      <BrutalButton
        title="Daily register"
        variant="secondary"
        onPress={() => {
          const first = classes[0]
          if (!first) return
          router.push({
            pathname: '/attendance/[classId]',
            params: {
              classId: first.id,
              className: first.name,
            },
          })
        }}
        style={{ marginBottom: 12 }}
      />

      <BrutalButton
        title="Attendance history"
        variant="secondary"
        onPress={() => router.push('/attendance/history')}
      />

      {loading ? <ActivityIndicator style={{ marginTop: 16 }} color={ZsmsTheme.ink} /> : null}
    </ScrollView>
  )
}

const styles = {
  chipRow: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 8,
    marginBottom: 12,
  },
  chip: {
    borderWidth: 2,
    borderColor: ZsmsTheme.ink,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: ZsmsTheme.paper,
  },
  chipActive: {
    backgroundColor: ZsmsTheme.ink,
  },
  chipText: {
    color: ZsmsTheme.ink,
    fontWeight: '700' as const,
    fontSize: 14,
  },
  chipTextActive: {
    color: ZsmsTheme.paper,
  },
  sessionRow: {
    borderWidth: 2,
    borderColor: ZsmsTheme.border,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    backgroundColor: ZsmsTheme.white,
  },
  sessionTitle: {
    fontWeight: '700' as const,
    color: ZsmsTheme.ink,
    fontSize: 15,
  },
  sessionMeta: {
    color: ZsmsTheme.textMuted,
    fontSize: 12,
    marginTop: 4,
  },
}
