import { Stack } from 'expo-router'
import { ZsmsTheme } from '@/theme/colors'

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: ZsmsTheme.paper },
        headerTintColor: ZsmsTheme.ink,
        contentStyle: { backgroundColor: ZsmsTheme.paper },
      }}
    >
      <Stack.Screen name="school-select" options={{ title: 'Select school' }} />
      <Stack.Screen name="login" options={{ title: 'Staff login' }} />
    </Stack>
  )
}
