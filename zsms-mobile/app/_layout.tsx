import { useEffect } from 'react'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { AuthGuard } from '@/components/AuthGuard'
import { useOfflineQueue } from '@/store/offlineQueue'
import { usePushRegistration } from '@/hooks/usePushRegistration'
import { ZsmsTheme } from '@/theme/colors'

export default function RootLayout() {
  const hydrate = useOfflineQueue((s) => s.hydrate)
  usePushRegistration()

  useEffect(() => {
    hydrate()
  }, [hydrate])

  return (
    <AuthGuard>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: ZsmsTheme.paper },
          headerTintColor: ZsmsTheme.ink,
          headerTitleStyle: { fontWeight: '800' },
          contentStyle: { backgroundColor: ZsmsTheme.paper },
        }}
      >
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="attendance/[classId]" options={{ title: 'Attendance register' }} />
        <Stack.Screen
          name="attendance/session/[classId]"
          options={{ title: 'Lesson attendance' }}
        />
        <Stack.Screen name="attendance/history" options={{ title: 'Attendance history' }} />
        <Stack.Screen name="scores/[assessmentId]" options={{ title: 'Record scores' }} />
        <Stack.Screen name="scores/student/[studentId]" options={{ title: 'Student score' }} />
        <Stack.Screen name="student/timetable" options={{ title: 'My Timetable' }} />
        <Stack.Screen name="student/results" options={{ title: 'My Results' }} />
        <Stack.Screen name="student/ecz-practice" options={{ title: 'ECZ Practice' }} />
        <Stack.Screen name="student/notices" options={{ title: 'Notices' }} />
        <Stack.Screen name="lesson-plans/index" options={{ title: 'Lesson Plans' }} />
        <Stack.Screen name="lesson-plans/[id]" options={{ title: 'Lesson Plan' }} />
      </Stack>
    </AuthGuard>
  )
}
