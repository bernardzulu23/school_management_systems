import { useEffect, useMemo, useState } from 'react'
import { Alert, FlatList, Text, TextInput, View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { BrutalButton } from '@/components/BrutalButton'
import { FaceScanPanel } from '@/components/FaceScanPanel'
import { FaceEnrollPanel } from '@/components/FaceEnrollPanel'
import { TwinVerifyModal } from '@/components/TwinVerifyModal'
import { useSessionAttendanceStore } from '@/store/sessionAttendanceStore'
import { globalStyles } from '@/theme/styles'
import { ZsmsTheme } from '@/theme/colors'
import type { RosterStudent } from '@/types'

function paramOne(value: string | string[] | undefined, fallback = ''): string {
  if (Array.isArray(value)) return String(value[0] || fallback)
  return String(value || fallback)
}

export default function LessonAttendanceSessionScreen() {
  const raw = useLocalSearchParams<{
    classId: string | string[]
    subjectId: string | string[]
    className?: string | string[]
    subjectName?: string | string[]
    periodLabel?: string | string[]
  }>()
  const classId = paramOne(raw.classId)
  const subjectId = paramOne(raw.subjectId)
  const className = paramOne(raw.className)
  const subjectName = paramOne(raw.subjectName)
  const periodLabel = paramOne(raw.periodLabel, 'Period 1')

  const {
    draft,
    twinPending,
    startSession,
    markPresent,
    markByFace,
    completeTwinVerification,
    clearTwinPending,
    endSession,
  } = useSessionAttendanceStore()
  const [search, setSearch] = useState('')
  const [scanOpen, setScanOpen] = useState(false)
  const [enrollStudent, setEnrollStudent] = useState<{
    id: string
    name: string
  } | null>(null)

  useEffect(() => {
    if (classId && subjectId) {
      void startSession({
        classId,
        subjectId,
        className,
        subjectName,
        periodLabel,
      })
    }
    // Intentionally omit startSession from deps — zustand action is stable; including it
    // can re-open sessions on store churn.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId, subjectId, className, subjectName, periodLabel])

  const rows = useMemo(() => {
    if (!draft) return []
    const q = search.trim().toLowerCase()
    const list = draft.students || []
    if (!q) return list
    return list.filter(
      (s) =>
        String(s.name || '')
          .toLowerCase()
          .includes(q) ||
        String(s.qrCode || '')
          .toLowerCase()
          .includes(q)
    )
  }, [draft, search])

  const counts = useMemo(() => {
    if (!draft) return null
    let present = 0
    let absent = 0
    let unmarked = 0
    for (const s of draft.students || []) {
      if (s.mark === 'unmarked') unmarked += 1
      else if (s.mark === 'present' || s.mark === 'late') present += 1
      else absent += 1
    }
    return { present, absent, unmarked }
  }, [draft])

  async function onEndSession() {
    Alert.alert(
      'End lesson?',
      'Unmarked pupils will be marked absent and parents may be notified.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End session',
          style: 'destructive',
          onPress: async () => {
            const result = await endSession()
            if (result === 'closed') {
              Alert.alert('Session closed', 'Attendance saved for this lesson.')
              router.back()
            } else if (result === 'queued') {
              Alert.alert('Queued offline', 'Session will sync when you are back online.')
              router.back()
            }
          },
        },
      ]
    )
  }

  function onFaceMatch(student: RosterStudent, score: number) {
    setScanOpen(false)
    void markByFace(student, score)
  }

  if (!classId || !subjectId) {
    return (
      <View style={globalStyles.container}>
        <Text style={globalStyles.errorText}>Missing class or subject. Go back and try again.</Text>
        <BrutalButton title="Back" variant="secondary" onPress={() => router.back()} />
      </View>
    )
  }

  if (draft?.loading) {
    return (
      <View style={globalStyles.container}>
        <Text>Starting lesson session…</Text>
      </View>
    )
  }

  return (
    <View style={globalStyles.container}>
      <Text style={globalStyles.title}>{draft?.className || className || 'Class'}</Text>
      <Text style={globalStyles.subtitle}>
        {draft?.subjectName || subjectName || 'Subject'}
        {periodLabel ? ` · ${periodLabel}` : ''} · lesson session
      </Text>
      <Text style={{ color: ZsmsTheme.textMuted, marginBottom: 8, fontSize: 13 }}>
        Manual Present / Late is always available for every pupil (required when there is no
        parental facial consent or face match fails). Face scan is optional.
      </Text>
      {counts ? (
        <Text style={globalStyles.subtitle}>
          Present/late {counts.present} · Absent {counts.absent} · Unmarked {counts.unmarked}
        </Text>
      ) : null}
      {draft?.sessionId ? (
        <BrutalButton title="Optional: face scan" onPress={() => setScanOpen(true)} />
      ) : null}
      <TextInput
        style={globalStyles.input}
        placeholder="Search student"
        value={search}
        onChangeText={setSearch}
      />
      <FlatList
        data={rows}
        keyExtractor={(s) => s.id}
        style={{ flex: 1, marginTop: 12 }}
        ListEmptyComponent={
          <Text style={globalStyles.subtitle}>
            {draft?.error || 'No pupils in this roster yet.'}
          </Text>
        }
        renderItem={({ item }) => (
          <View style={[globalStyles.card, { paddingVertical: 12 }]}>
            <Text style={{ fontWeight: '700' }}>{item.name}</Text>
            <Text style={{ marginTop: 4, color: ZsmsTheme.textMuted }}>
              {item.mark === 'unmarked' ? 'Not marked' : item.mark}
              {item.requiresSecondaryAuth ? ' · twin' : ''}
              {item.hasFacialConsent === false ? ' · no face consent' : ''}
            </Text>
            <View style={{ flexDirection: 'row', marginTop: 8, gap: 8, flexWrap: 'wrap' }}>
              <BrutalButton title="Present" onPress={() => void markPresent(item.id, 'present')} />
              <BrutalButton
                title="Late"
                variant="secondary"
                onPress={() => void markPresent(item.id, 'late')}
              />
              {!item.faceEmbedding && item.hasFacialConsent !== false ? (
                <BrutalButton
                  title="Enrol face"
                  variant="secondary"
                  onPress={() => setEnrollStudent({ id: item.id, name: item.name })}
                />
              ) : null}
            </View>
          </View>
        )}
      />
      <BrutalButton
        title="End session"
        onPress={onEndSession}
        loading={draft?.closing}
        variant="secondary"
        disabled={!draft?.sessionId}
      />
      {draft?.error ? (
        <Text style={{ color: ZsmsTheme.danger, marginTop: 8 }}>{draft.error}</Text>
      ) : null}

      {/* Mount camera only while scanning — avoids native permission hooks on every open. */}
      {scanOpen && draft?.sessionId ? (
        <FaceScanPanel
          visible={scanOpen}
          sessionId={draft.sessionId}
          roster={draft.roster || []}
          onMatch={onFaceMatch}
          onClose={() => setScanOpen(false)}
        />
      ) : null}

      {enrollStudent ? (
        <FaceEnrollPanel
          visible
          studentId={enrollStudent.id}
          studentName={enrollStudent.name}
          onDone={() => {
            setEnrollStudent(null)
            if (classId && subjectId) {
              void startSession({
                classId,
                subjectId,
                className,
                subjectName,
                periodLabel,
              })
            }
          }}
          onClose={() => setEnrollStudent(null)}
        />
      ) : null}

      {draft?.sessionId && twinPending ? (
        <TwinVerifyModal
          visible
          studentName={twinPending.studentName}
          sessionId={draft.sessionId}
          studentId={twinPending.studentId}
          secondaryAuthMethod={twinPending.secondaryAuthMethod}
          onVerified={(twinAuthToken) => void completeTwinVerification(twinAuthToken)}
          onCancel={() => clearTwinPending()}
        />
      ) : null}
    </View>
  )
}
