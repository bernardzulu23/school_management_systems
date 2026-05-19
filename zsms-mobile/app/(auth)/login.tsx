import { useEffect, useState } from 'react'
import { Text, TextInput, View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { BrutalButton } from '@/components/BrutalButton'
import { useAuthStore } from '@/store/authStore'
import { getSubdomain } from '@/storage/secure'
import { globalStyles } from '@/theme/styles'
import { ApiError } from '@/api/client'

export default function LoginScreen() {
  const params = useLocalSearchParams<{ subdomain?: string }>()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [subdomain, setSubdomain] = useState(params.subdomain || '')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const login = useAuthStore((s) => s.login)

  useEffect(() => {
    if (!subdomain) getSubdomain().then((s) => s && setSubdomain(s))
  }, [subdomain])

  async function onLogin() {
    setError(null)
    setLoading(true)
    try {
      await login({ email: email.trim(), password, subdomain: subdomain.trim().toLowerCase() })
      router.replace('/(tabs)')
    } catch (e) {
      const msg =
        e instanceof ApiError ? e.message : e instanceof Error ? e.message : 'Login failed'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={globalStyles.container}>
      <Text style={globalStyles.title}>Staff login</Text>
      <Text style={globalStyles.subtitle}>School: {subdomain || '—'}</Text>
      <Text style={globalStyles.label}>Email</Text>
      <TextInput
        style={globalStyles.input}
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <Text style={globalStyles.label}>Password</Text>
      <TextInput
        style={globalStyles.input}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      {error ? <Text style={globalStyles.errorText}>{error}</Text> : null}
      <BrutalButton title="Sign in" onPress={onLogin} loading={loading} />
      <BrutalButton
        title="Change school"
        variant="secondary"
        onPress={() => router.replace('/(auth)/school-select')}
        style={{ marginTop: 12 }}
      />
    </View>
  )
}
