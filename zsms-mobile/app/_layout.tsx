import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { AuthGuard } from '@/components/AuthGuard'
import { ZsmsTheme } from '@/theme/colors'

export default function RootLayout() {
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
        <Stack.Screen name="attendance/history" options={{ title: 'Attendance history' }} />
        <Stack.Screen name="scores/[assessmentId]" options={{ title: 'Record scores' }} />
        <Stack.Screen name="scores/student/[studentId]" options={{ title: 'Student score' }} />
      </Stack>
    </AuthGuard>
  )
}
