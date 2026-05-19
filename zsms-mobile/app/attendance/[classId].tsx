import { useEffect, useMemo, useState } from 'react'
import { Alert, FlatList, Text, TextInput, View } from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import { BrutalButton } from '@/components/BrutalButton'
import { StatusChip } from '@/components/StatusChip'
import { filterStudents, getAttendanceStats } from '@/api/attendance'
import { useAttendanceStore } from '@/store/attendanceStore'
import { todayIsoDate } from '@/utils/date'
import { globalStyles } from '@/theme/styles'
import type { AttendanceStatus } from '@/types'
import { ZsmsTheme } from '@/theme/colors'

const STATUSES: AttendanceStatus[] = ['present', 'absent', 'late', 'excused']

export default function AttendanceRegisterScreen() {
  const { classId, subjectId, className, subjectName } = useLocalSearchParams<{
    classId: string
    subjectId?: string
    className?: string
    subjectName?: string
  }>()
  const date = todayIsoDate()
  const { draft, loadRegister, setStatus, markAllPresent, save } = useAttendanceStore()
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (classId) loadRegister(classId, date, subjectId)
  }, [classId, subjectId, date, loadRegister])

  const students = useMemo(() => {
    if (!draft) return []
    const filtered = filterStudents(draft.students, search)
    return filtered.map((s) => ({
      student: s,
      record: draft.records.find((r) => r.studentId === s.id) || {
        studentId: s.id,
        status: 'present' as AttendanceStatus,
      },
    }))
  }, [draft, search])

  const stats = draft ? getAttendanceStats(draft.records) : null

  async function onSave() {
    setSaving(true)
    const result = await save(true)
    setSaving(false)
    Alert.alert(
      result === 'saved' ? 'Saved' : 'Queued',
      result === 'saved'
        ? 'Attendance saved to the school system.'
        : 'Saved offline — will sync when you are online.'
    )
  }

  if (draft?.loading) {
    return (
      <View style={globalStyles.container}>
        <Text>Loading register…</Text>
      </View>
    )
  }

  return (
    <View style={globalStyles.container}>
      <Text style={globalStyles.title}>{className || 'Class'}</Text>
      <Text style={globalStyles.subtitle}>
        {subjectName || 'All subjects'} · {date}
      </Text>
      {stats ? (
        <Text style={globalStyles.subtitle}>
          P {stats.present} · A {stats.absent} · L {stats.late} · E {stats.excused}
        </Text>
      ) : null}
      <TextInput
        style={globalStyles.input}
        placeholder="Search student"
        value={search}
        onChangeText={setSearch}
      />
      <BrutalButton title="Mark all present" variant="secondary" onPress={markAllPresent} />
      <FlatList
        data={students}
        keyExtractor={(row) => row.student.id}
        style={{ flex: 1, marginTop: 12 }}
        renderItem={({ item }) => (
          <View style={[globalStyles.card, { paddingVertical: 12 }]}>
            <Text style={{ fontWeight: '700', marginBottom: 8 }}>{item.student.name}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {STATUSES.map((st) => (
                <StatusChip
                  key={st}
                  status={st}
                  selected={item.record.status === st}
                  onPress={() => setStatus(item.student.id, st)}
                  compact
                />
              ))}
            </View>
          </View>
        )}
      />
      <BrutalButton title="Save attendance" onPress={onSave} loading={saving} />
      {draft?.error ? (
        <Text style={{ color: ZsmsTheme.danger, marginTop: 8 }}>{draft.error}</Text>
      ) : null}
    </View>
  )
}
