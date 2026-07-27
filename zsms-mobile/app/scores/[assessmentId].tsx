import { useEffect, useState } from 'react'
import { FlatList, Text, View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import {
  loadRosterForScores,
  loadScoresForAssessment,
  getCompletionPercent,
} from '@/api/assessments'
import { BrutalButton } from '@/components/BrutalButton'
import { useSessionStore } from '@/store/sessionStore'
import { currentAcademicYear } from '@/utils/date'
import { globalStyles } from '@/theme/styles'
import type { RosterStudent } from '@/types'

export default function ScoreClassGridScreen() {
  const {
    assessmentId,
    formLevel,
    subjectId,
    title,
    classId: classIdParam,
  } = useLocalSearchParams<{
    assessmentId: string
    formLevel: string
    subjectId: string
    title?: string
    classId?: string
  }>()
  const context = useSessionStore((s) => s.context)
  const loadSession = useSessionStore((s) => s.load)
  const assignments = context?.assignments || []
  const paramClassId = String(classIdParam || '').trim()
  const assignment =
    assignments.find(
      (a) =>
        String(a.subjectId) === String(subjectId) &&
        (!paramClassId || String(a.classId) === paramClassId)
    ) ||
    assignments.find((a) => String(a.subjectId) === String(subjectId)) ||
    null
  const classId = paramClassId || String(assignment?.classId || '').trim()
  const [students, setStudents] = useState<RosterStudent[]>([])
  const [scoredIds, setScoredIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!context) loadSession()
  }, [context, loadSession])

  useEffect(() => {
    // Wait for session context when class was not passed from the task.
    if (!classId && !context) {
      setLoading(true)
      return
    }
    if (!classId) {
      setStudents([])
      setLoading(false)
      setError(
        'No class linked to this SBA task. Select a class on the scores tab, or check your teaching assignments.'
      )
      return
    }
    setLoading(true)
    setError(null)
    Promise.all([
      loadRosterForScores(classId, subjectId),
      loadScoresForAssessment({
        subjectId,
        formLevel: Number(formLevel),
        academicYear: currentAcademicYear(),
        assessmentId,
      }),
    ])
      .then(([roster, scores]) => {
        setStudents(roster)
        const ids = new Set(
          scores.map((s) => s.studentId).filter((id): id is string => Boolean(id))
        )
        setScoredIds(ids)
        if (!roster.length) {
          setError('No students found for this class.')
        }
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : 'Failed to load scores')
      })
      .finally(() => setLoading(false))
  }, [classId, subjectId, formLevel, assessmentId, context])

  const pct = getCompletionPercent(students.length, scoredIds.size)

  return (
    <View style={globalStyles.container}>
      <Text style={globalStyles.title}>{title || 'Scores'}</Text>
      <Text style={globalStyles.subtitle}>
        {assignment?.className || 'Class'} · {pct}% complete
      </Text>
      {error ? <Text style={globalStyles.errorText}>{error}</Text> : null}
      <FlatList
        data={students}
        keyExtractor={(s) => s.id}
        refreshing={loading}
        ListEmptyComponent={
          !loading ? <Text style={globalStyles.subtitle}>No students to score yet.</Text> : null
        }
        renderItem={({ item }) => (
          <BrutalButton
            title={`${item.name}${scoredIds.has(item.id) ? ' ✓' : ''}`}
            variant={scoredIds.has(item.id) ? 'secondary' : 'primary'}
            onPress={() =>
              router.push({
                pathname: '/scores/student/[studentId]',
                params: {
                  studentId: item.id,
                  studentName: item.name,
                  assessmentId,
                  formLevel,
                  taskNumber: '1',
                },
              })
            }
            style={{ marginBottom: 8 }}
          />
        )}
      />
    </View>
  )
}
