import { useCallback } from 'react'
import { FlatList, Text, View } from 'react-native'
import { router, useFocusEffect } from 'expo-router'
import { AssignmentCard } from '@/components/AssignmentCard'
import { BrutalButton } from '@/components/BrutalButton'
import { useSessionStore } from '@/store/sessionStore'
import { todayIsoDate } from '@/utils/date'
import { globalStyles } from '@/theme/styles'

export default function AttendanceClassPickerScreen() {
  const { context, load, loading } = useSessionStore()
  const assignments = context?.assignments || []

  useFocusEffect(
    useCallback(() => {
      load()
    }, [load])
  )

  return (
    <View style={globalStyles.container}>
      <Text style={globalStyles.title}>Attendance</Text>
      <Text style={globalStyles.subtitle}>
        Pick a class for a lesson session (per subject) or daily register.
      </Text>
      <FlatList
        data={assignments}
        keyExtractor={(item) => item.id}
        refreshing={loading}
        onRefresh={load}
        ListEmptyComponent={
          <Text style={globalStyles.subtitle}>No teaching assignments found.</Text>
        }
        renderItem={({ item }) => (
          <AssignmentCard
            assignment={item}
            subtitle={`Date: ${todayIsoDate()}`}
            onPress={() => {
              const params = {
                classId: item.classId,
                subjectId: item.subjectId,
                className: item.className || '',
                subjectName: item.subjectName || '',
              }
              if (item.subjectId) {
                router.push({ pathname: '/attendance/session/[classId]', params })
              } else {
                router.push({ pathname: '/attendance/[classId]', params })
              }
            }}
          />
        )}
      />
      <BrutalButton
        title="Attendance history"
        variant="secondary"
        onPress={() => router.push('/attendance/history')}
      />
    </View>
  )
}
