import { Redirect } from 'expo-router'
import { useAuthStore } from '@/store/authStore'

export default function Index() {
  const { isAuthenticated, isReady } = useAuthStore()
  if (!isReady) return null
  return <Redirect href={isAuthenticated ? '/(tabs)' : '/(auth)/school-select'} />
}
