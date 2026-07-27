import { useCallback, useEffect, useMemo, useState } from 'react'
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
  const [classId, setClassId] = useState<string | undefined>()
  const assignments = context?.assignments || []

  const subjects = useMemo(() => {
    const map = new Map<string, string>()
    for (const a of assignments) {
      if (a.subjectId) map.set(String(a.subjectId), a.subjectName || String(a.subjectId))
    }
    return [...map.entries()].map(([id, name]) => ({ id, name }))
  }, [assignments])

  const classesForSubject = useMemo(() => {
    return assignments
      .filter((a) => !subjectId || String(a.subjectId) === String(subjectId))
      .map((a) => ({
        id: String(a.classId),
        name: a.className || String(a.classId),
        subjectId: String(a.subjectId),
      }))
      .filter((c, i, arr) => c.id && arr.findIndex((x) => x.id === c.id) === i)
  }, [assignments, subjectId])

  useFocusEffect(
    useCallback(() => {
      load()
    }, [load])
  )

  useEffect(() => {
    if (!subjectId && assignments[0]?.subjectId) {
      setSubjectId(String(assignments[0].subjectId))
    }
  }, [assignments, subjectId])

  useEffect(() => {
    if (!classesForSubject.length) {
      setClassId(undefined)
      return
    }
    if (!classId || !classesForSubject.some((c) => c.id === classId)) {
      setClassId(classesForSubject[0].id)
    }
  }, [classesForSubject, classId])

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

  function openTask(item: SbaTask) {
    const taskClassId = String(item.classId || item.class?.id || '').trim()
    const resolvedClassId = taskClassId || classId || ''
    const resolvedSubjectId = String(item.subject?.id || subjectId || '')
    router.push({
      pathname: '/scores/[assessmentId]',
      params: {
        assessmentId: item.id,
        formLevel: String(item.formLevel || formLevel),
        subjectId: resolvedSubjectId,
        classId: resolvedClassId,
        title: item.title,
      },
    })
  }

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
        data={subjects}
        horizontal
        keyExtractor={(s) => s.id}
        style={{ maxHeight: 48, marginBottom: 8 }}
        ListEmptyComponent={
          <Text style={globalStyles.subtitle}>No teaching assignments loaded.</Text>
        }
        renderItem={({ item }) => (
          <BrutalButton
            title={item.name}
            variant={subjectId === item.id ? 'primary' : 'ghost'}
            onPress={() => setSubjectId(item.id)}
            style={{ marginRight: 8, paddingVertical: 8 }}
          />
        )}
      />
      {classesForSubject.length > 1 ? (
        <FlatList
          data={classesForSubject}
          horizontal
          keyExtractor={(c) => c.id}
          style={{ maxHeight: 48, marginBottom: 12 }}
          renderItem={({ item }) => (
            <BrutalButton
              title={item.name}
              variant={classId === item.id ? 'primary' : 'ghost'}
              onPress={() => setClassId(item.id)}
              style={{ marginRight: 8, paddingVertical: 8 }}
            />
          )}
        />
      ) : classesForSubject.length === 1 ? (
        <Text style={[globalStyles.subtitle, { marginBottom: 12 }]}>
          Class: {classesForSubject[0].name}
        </Text>
      ) : null}
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
            onPress={() => openTask(item)}
            style={{ marginBottom: 8 }}
          />
        )}
      />
    </View>
  )
}
