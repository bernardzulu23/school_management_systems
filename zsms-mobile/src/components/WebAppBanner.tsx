import { useEffect, useState } from 'react'
import { Linking, Pressable, Text, View } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useSessionStore } from '@/store/sessionStore'

const DISMISS_KEY = 'zsms_web_banner_dismissed'

export function WebAppBanner() {
  const { context } = useSessionStore()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    AsyncStorage.getItem(DISMISS_KEY).then((v) => setVisible(v !== '1'))
  }, [])

  const dismiss = async () => {
    await AsyncStorage.setItem(DISMISS_KEY, '1')
    setVisible(false)
  }

  if (!visible) return null

  const sub = String(context?.school?.subdomain || '').trim()
  const base = String(process.env.EXPO_PUBLIC_WEB_BASE || 'bluepeacktechnologies.com')
  const url = sub ? `https://${sub}.${base}/login` : `https://www.${base}/login`

  return (
    <View
      style={{
        backgroundColor: '#E8F4FC',
        borderWidth: 2,
        borderColor: '#111',
        padding: 12,
        marginBottom: 12,
      }}
    >
      <Text style={{ fontWeight: '700', color: '#111', marginBottom: 4 }}>
        Full features on the web
      </Text>
      <Text style={{ color: '#333', fontSize: 13, marginBottom: 8 }}>
        Timetables, lesson plans, results, and billing are available on the web dashboard.
      </Text>
      <Pressable onPress={() => Linking.openURL(url)}>
        <Text style={{ color: '#0066cc', fontWeight: '600', marginBottom: 8 }}>
          Open web dashboard
        </Text>
      </Pressable>
      <Pressable onPress={dismiss}>
        <Text style={{ fontSize: 12, color: '#666' }}>Dismiss</Text>
      </Pressable>
    </View>
  )
}
