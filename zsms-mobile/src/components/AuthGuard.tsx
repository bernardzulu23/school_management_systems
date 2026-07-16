import { useEffect } from 'react'
import { ActivityIndicator, View } from 'react-native'
import { router, useSegments } from 'expo-router'
import { useAuthStore } from '@/store/authStore'
import { ZsmsTheme } from '@/theme/colors'
import { isStaffRole, isStudentOnlyPath, isStudentRole } from '@/lib/security/roleGuards'

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isReady, isAuthenticated, user, hydrate, logout } = useAuthStore()
  const segments = useSegments()

  useEffect(() => {
    hydrate()
  }, [hydrate])

  useEffect(() => {
    if (!isReady) return
    const inAuth = segments[0] === '(auth)'
    const pathSegments = segments.map(String)

    if (!isAuthenticated && !inAuth) {
      router.replace('/(auth)/school-select')
      return
    }

    if (isAuthenticated && inAuth) {
      router.replace('/(tabs)')
      return
    }

    if (!isAuthenticated) return

    // Staff companion: reject student sessions (BOLA / wrong-app).
    if (user?.role && isStudentRole(user.role)) {
      void logout().finally(() => router.replace('/(auth)/login'))
      return
    }

    // Block /student/* deep links for staff tokens.
    if (isStudentOnlyPath(pathSegments)) {
      router.replace('/(tabs)')
      return
    }

    // If role is known and not staff, bounce to login.
    if (user?.role && !isStaffRole(user.role)) {
      void logout().finally(() => router.replace('/(auth)/login'))
    }
  }, [isReady, isAuthenticated, segments, user?.role, logout])

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
