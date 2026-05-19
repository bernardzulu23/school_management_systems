import { useEffect } from 'react'
import { ActivityIndicator, View } from 'react-native'
import { router, useSegments } from 'expo-router'
import { useAuthStore } from '@/store/authStore'
import { ZsmsTheme } from '@/theme/colors'

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isReady, isAuthenticated, hydrate } = useAuthStore()
  const segments = useSegments()

  useEffect(() => {
    hydrate()
  }, [hydrate])

  useEffect(() => {
    if (!isReady) return
    const inAuth = segments[0] === '(auth)'
    if (!isAuthenticated && !inAuth) {
      router.replace('/(auth)/school-select')
    } else if (isAuthenticated && inAuth) {
      router.replace('/(tabs)')
    }
  }, [isReady, isAuthenticated, segments])

  if (!isReady) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: ZsmsTheme.paper,
        }}
      >
        <ActivityIndicator size="large" color={ZsmsTheme.accent} />
      </View>
    )
  }

  return <>{children}</>
}
