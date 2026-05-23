import { Tabs } from 'expo-router'
import { useOfflineQueue } from '@/store/offlineQueue'
import { ZsmsTheme } from '@/theme/colors'

export default function TabsLayout() {
  const pending = useOfflineQueue((s) => s.getPendingCount())

  return (
    <Tabs
      screenOptions={{
        tabBarStyle: {
          backgroundColor: ZsmsTheme.navBg,
          borderTopWidth: 2,
          borderTopColor: ZsmsTheme.border,
        },
        tabBarActiveTintColor: ZsmsTheme.navActiveText,
        tabBarActiveBackgroundColor: ZsmsTheme.navActiveBg,
        tabBarInactiveTintColor: ZsmsTheme.navInactiveText,
        headerStyle: { backgroundColor: ZsmsTheme.paper },
        headerTintColor: ZsmsTheme.ink,
        headerTitleStyle: { fontWeight: '800' },
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
