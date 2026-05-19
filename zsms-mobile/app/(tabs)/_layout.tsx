import { Tabs } from 'expo-router'
import { useOfflineQueue } from '@/store/offlineQueue'
import { ZsmsTheme } from '@/theme/colors'

export default function TabsLayout() {
  const pending = useOfflineQueue((s) => s.getPendingCount())

  return (
    <Tabs
      screenOptions={{
        tabBarStyle: { backgroundColor: ZsmsTheme.navBg },
        tabBarActiveTintColor: ZsmsTheme.accent,
        tabBarInactiveTintColor: ZsmsTheme.navText,
        headerStyle: { backgroundColor: ZsmsTheme.paper },
        headerTintColor: ZsmsTheme.ink,
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarLabel: 'Home' }} />
      <Tabs.Screen name="attendance" options={{ title: 'Attendance' }} />
      <Tabs.Screen
        name="scores"
        options={{
          title: 'Scores',
          tabBarBadge: pending > 0 ? pending : undefined,
        }}
      />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  )
}
