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
  const { assessmentId, formLevel, subjectId, title } = useLocalSearchParams<{
    assessmentId: string
    formLevel: string
    subjectId: string
    title?: string
  }>()
  const assignments = useSessionStore((s) => s.context?.assignments || [])
  const assignment = assignments.find((a) => a.subjectId === subjectId) || assignments[0]
  const [students, setStudents] = useState<RosterStudent[]>([])
  const [scoredIds, setScoredIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!assignment?.classId) return
    setLoading(true)
    Promise.all([
      loadRosterForScores(assignment.classId, subjectId),
      loadScoresForAssessment({
        subjectId,
        formLevel: Number(formLevel),
        academicYear: currentAcademicYear(),
      }),
    ])
      .then(([roster, scores]) => {
        setStudents(roster)
        const ids = new Set(
          (scores as Array<{ studentId?: string }>)
            .map((s) => s.studentId)
            .filter(Boolean) as string[]
        )
        setScoredIds(ids)
      })
      .finally(() => setLoading(false))
  }, [assignment?.classId, subjectId, formLevel])

  const pct = getCompletionPercent(students.length, scoredIds.size)

  return (
    <View style={globalStyles.container}>
      <Text style={globalStyles.title}>{title || 'Scores'}</Text>
      <Text style={globalStyles.subtitle}>
        {assignment?.className} · {pct}% complete
      </Text>
      <FlatList
        data={students}
        keyExtractor={(s) => s.id}
        refreshing={loading}
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
