import { useCallback, useState } from 'react'
import { FlatList, Text, View } from 'react-native'
import { router, useFocusEffect } from 'expo-router'
import { loadSbaTasks } from '@/api/assessments'
import { BrutalButton } from '@/components/BrutalButton'
import { useSessionStore } from '@/store/sessionStore'
import { currentAcademicYear } from '@/utils/date'
import { globalStyles } from '@/theme/styles'
import type { SbaTask } from '@/types'

export default function ScoresHomeScreen() {
  const { context, load } = useSessionStore()
  const [formLevel, setFormLevel] = useState(1)
  const [tasks, setTasks] = useState<SbaTask[]>([])
  const [loading, setLoading] = useState(false)
  const [subjectId, setSubjectId] = useState<string | undefined>()
  const assignments = context?.assignments || []

  useFocusEffect(
    useCallback(() => {
      load()
      if (assignments[0] && !subjectId) setSubjectId(assignments[0].subjectId)
    }, [load, assignments, subjectId])
  )

  async function fetchTasks() {
    setLoading(true)
    try {
      const list = await loadSbaTasks({
        formLevel,
        subjectId,
        component: 'SBA_TASK',
      })
      setTasks(list)
    } finally {
      setLoading(false)
    }
  }

  useFocusEffect(
    useCallback(() => {
      fetchTasks()
    }, [formLevel, subjectId])
  )

  return (
    <View style={globalStyles.container}>
      <Text style={globalStyles.title}>ECZ SBA scores</Text>
      <Text style={globalStyles.subtitle}>Year {currentAcademicYear()}</Text>
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
        {[1, 2, 3, 4].map((lvl) => (
          <BrutalButton
            key={lvl}
            title={`F${lvl}`}
            variant={formLevel === lvl ? 'primary' : 'secondary'}
            onPress={() => setFormLevel(lvl)}
            style={{ flex: 1, paddingVertical: 8 }}
          />
        ))}
      </View>
      <FlatList
        data={assignments}
        horizontal
        keyExtractor={(a) => a.id}
        style={{ maxHeight: 48, marginBottom: 12 }}
        renderItem={({ item }) => (
          <BrutalButton
            title={item.subjectName || 'Subject'}
            variant={subjectId === item.subjectId ? 'primary' : 'ghost'}
            onPress={() => setSubjectId(item.subjectId)}
            style={{ marginRight: 8, paddingVertical: 8 }}
          />
        )}
      />
      <FlatList
        data={tasks}
        keyExtractor={(t) => t.id}
        refreshing={loading}
        onRefresh={fetchTasks}
        ListEmptyComponent={
          <Text style={globalStyles.subtitle}>No SBA tasks for this filter.</Text>
        }
        renderItem={({ item }) => (
          <BrutalButton
            title={`${item.title} — ${item.subject?.name || ''}`}
            variant="secondary"
            onPress={() =>
              router.push({
                pathname: '/scores/[assessmentId]',
                params: {
                  assessmentId: item.id,
                  formLevel: String(item.formLevel || formLevel),
                  subjectId: item.subject?.id || subjectId || '',
                  title: item.title,
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
