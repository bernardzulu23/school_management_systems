import { useCallback, useState } from 'react'
import { Alert, FlatList, Linking, Text, View } from 'react-native'
import { useFocusEffect } from 'expo-router'
import * as FileSystem from 'expo-file-system'
import { api, ApiError, getApiBaseUrl } from '@/api/client'
import { BrutalButton } from '@/components/BrutalButton'
import { getAccessToken, getSubdomain } from '@/storage/secure'
import { globalStyles } from '@/theme/styles'

type Material = {
  id: string
  title: string
  subject?: string
  type?: string
  size?: string
  fileUrl?: string
  description?: string
}

async function loadMaterials(): Promise<Material[]> {
  const data = await api<{ data?: Material[]; materials?: Material[] }>('/api/teacher/materials')
  if (Array.isArray(data.data)) return data.data
  if (Array.isArray(data.materials)) return data.materials
  return Array.isArray(data) ? (data as Material[]) : []
}

function isPublicHttpUrl(url: string): boolean {
  return /^https?:\/\//i.test(url) && !/\/api\/teacher\/materials\/file\//i.test(url)
}

async function openMaterial(item: Material) {
  const raw = String(item.fileUrl || '').trim()
  if (!raw) {
    Alert.alert('Unavailable', 'This material has no file URL.')
    return
  }

  if (isPublicHttpUrl(raw)) {
    const ok = await Linking.canOpenURL(raw)
    if (!ok) throw new Error('Cannot open this URL on the device')
    await Linking.openURL(raw)
    return
  }

  const path = raw.startsWith('/api/')
    ? raw
    : raw.includes('/api/teacher/materials/file/')
      ? `/api/teacher/materials/file/${raw.split('/api/teacher/materials/file/')[1]}`
      : null

  if (!path) {
    await Linking.openURL(raw)
    return
  }

  const token = await getAccessToken()
  const subdomain = await getSubdomain()
  const headers: Record<string, string> = {
    'X-Client-Type': 'mobile',
    Accept: '*/*',
  }
  if (token) headers.Authorization = `Bearer ${token}`
  if (subdomain) headers['x-school-subdomain'] = subdomain

  const cacheDir = FileSystem.cacheDirectory || FileSystem.documentDirectory
  if (!cacheDir) {
    throw new Error('File cache is unavailable on this device')
  }
  const dest = `${cacheDir}material-${item.id}-${Date.now()}`
  const result = await FileSystem.downloadAsync(`${getApiBaseUrl()}${path}`, dest, { headers })
  if (result.status < 200 || result.status >= 300) {
    throw new Error(`Download failed (${result.status})`)
  }
  const canOpen = await Linking.canOpenURL(result.uri)
  if (!canOpen) {
    Alert.alert('Downloaded', `Saved to cache. Open from Files if needed:\n${result.uri}`)
    return
  }
  await Linking.openURL(result.uri)
}

export default function MaterialsScreen() {
  const [items, setItems] = useState<Material[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [openingId, setOpeningId] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setItems(await loadMaterials())
    } catch (e) {
      setError(e instanceof ApiError || e instanceof Error ? e.message : 'Failed to load materials')
    } finally {
      setLoading(false)
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      void refresh()
    }, [refresh])
  )

  return (
    <View style={globalStyles.container}>
      <Text style={globalStyles.title}>Study materials</Text>
      <Text style={globalStyles.subtitle}>Open PDFs and files uploaded for your school</Text>
      {error ? <Text style={globalStyles.errorText}>{error}</Text> : null}
      <FlatList
        data={items}
        keyExtractor={(m) => m.id}
        refreshing={loading}
        onRefresh={refresh}
        ListEmptyComponent={
          !loading ? <Text style={globalStyles.subtitle}>No materials yet.</Text> : null
        }
        renderItem={({ item }) => (
          <View style={[globalStyles.card, { marginBottom: 10 }]}>
            <Text style={{ fontWeight: '700', color: '#111' }}>{item.title}</Text>
            <Text style={globalStyles.subtitle}>
              {[item.subject, item.type, item.size].filter(Boolean).join(' · ') || 'File'}
            </Text>
            <BrutalButton
              title={openingId === item.id ? 'Opening…' : 'Open file'}
              loading={openingId === item.id}
              onPress={async () => {
                setOpeningId(item.id)
                try {
                  await openMaterial(item)
                } catch (e) {
                  Alert.alert('Open failed', e instanceof Error ? e.message : 'Could not open file')
                } finally {
                  setOpeningId(null)
                }
              }}
              style={{ marginTop: 10 }}
            />
          </View>
        )}
      />
    </View>
  )
}
