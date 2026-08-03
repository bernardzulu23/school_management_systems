import { useEffect, useState } from 'react'
import { Alert, ScrollView, Text, TextInput, View } from 'react-native'
import { router } from 'expo-router'
import { BrutalButton } from '@/components/BrutalButton'
import { checkAppVersion } from '@/api/health'
import { useAuthStore } from '@/store/authStore'
import { useSessionStore } from '@/store/sessionStore'
import { useOfflineQueue } from '@/store/offlineQueue'
import { clearSubdomainOnly } from '@/storage/secure'
import { decryptSeedPayload, type SeedEnvelope } from '@/offline/seedCrypto'
import { getMobileSeedMeta, importSeedIntoMobileStore, type SeedMeta } from '@/offline/seedImport'
import { SEED_PASSPHRASE_MIN, SYNC_CONTRACT_VERSION } from '@/offline/syncContracts'
import { globalStyles } from '@/theme/styles'

export default function ProfileScreen() {
  const { user, school, logout } = useAuthStore()
  const { context } = useSessionStore()
  const { items, getPendingCount, clearOfflineQueue, flushOfflineQueue, syncing, hydrate } =
    useOfflineQueue()
  const [health, setHealth] = useState<string>('—')
  const [passphrase, setPassphrase] = useState('')
  const [seedPaste, setSeedPaste] = useState('')
  const [seedMeta, setSeedMeta] = useState<SeedMeta | null>(null)
  const [importing, setImporting] = useState(false)

  useEffect(() => {
    hydrate()
    checkAppVersion().then((h) => setHealth(h.ok ? h.version || 'OK' : 'Offline'))
    getMobileSeedMeta().then(setSeedMeta)
  }, [hydrate])

  async function onSyncNow() {
    const { synced, failed } = await flushOfflineQueue()
    Alert.alert(
      failed > 0 ? 'Sync partly failed' : 'Sync complete',
      `${synced} batch(es) synced${failed > 0 ? `, ${failed} failed` : ''}.`
    )
  }

  async function onLogout() {
    await logout()
    router.replace('/(auth)/school-select')
  }

  async function changeSchool() {
    await logout()
    await clearSubdomainOnly()
    router.replace('/(auth)/school-select')
  }

  function onClearQueue() {
    Alert.alert(
      'Clear offline queue?',
      'Removes unsynced attendance, lesson sessions, and scores.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => clearOfflineQueue(),
        },
      ]
    )
  }

  async function onImportSeed() {
    if (passphrase.length < SEED_PASSPHRASE_MIN) {
      Alert.alert(
        'Passphrase',
        `Use at least ${SEED_PASSPHRASE_MIN} characters (same as download).`
      )
      return
    }
    if (!seedPaste.trim()) {
      Alert.alert(
        'Seed file',
        'Paste the contents of your .zsmsseed JSON (download from web Offline & sync while online).'
      )
      return
    }
    setImporting(true)
    try {
      const envelope = JSON.parse(seedPaste) as SeedEnvelope
      const payload = await decryptSeedPayload(envelope, passphrase)
      const schoolId = String(school?.id || context?.school?.id || '')
      if (schoolId && payload.schoolId && String(payload.schoolId) !== schoolId) {
        throw new Error('This seed belongs to a different school. Change school first.')
      }
      const meta = await importSeedIntoMobileStore(
        payload as Parameters<typeof importSeedIntoMobileStore>[0]
      )
      setSeedMeta(meta)
      setSeedPaste('')
      setPassphrase('')
      Alert.alert(
        'Seed imported',
        `Loaded ${meta.cacheKeys} cache(s) and ${meta.rosters} roster(s). Sync contract v${SYNC_CONTRACT_VERSION}.`
      )
    } catch (e) {
      Alert.alert('Import failed', e instanceof Error ? e.message : 'Could not import seed')
    } finally {
      setImporting(false)
    }
  }

  return (
    <ScrollView style={globalStyles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <Text style={globalStyles.title}>Profile</Text>
      <View style={globalStyles.card}>
        <Text style={{ fontWeight: '700' }}>{context?.user?.name || user?.name}</Text>
        <Text style={globalStyles.subtitle}>{user?.email}</Text>
        <Text style={globalStyles.subtitle}>Role: {context?.user?.role || user?.role}</Text>
        <Text style={globalStyles.subtitle}>School: {school?.name || context?.school?.name}</Text>
        <Text style={globalStyles.subtitle}>Subdomain: {school?.subdomain}</Text>
        <Text style={globalStyles.subtitle}>API: {health}</Text>
        <Text style={globalStyles.subtitle}>Pending sync: {getPendingCount()}</Text>
        {items.some((i) => i.type === 'lessonSession') ? (
          <Text style={globalStyles.subtitle}>Includes lesson session marks</Text>
        ) : null}
      </View>
      {getPendingCount() > 0 ? (
        <BrutalButton
          title="Sync now"
          onPress={onSyncNow}
          loading={syncing}
          style={{ marginBottom: 12 }}
        />
      ) : null}

      <View style={[globalStyles.card, { marginTop: 8 }]}>
        <Text style={{ fontWeight: '700', marginBottom: 8 }}>Offline seed (.zsmsseed)</Text>
        <Text style={globalStyles.subtitle}>
          Download a seed on the web (Offline & sync), transfer the file, paste JSON here, then
          import. Assignments and SBA tasks become available offline.
        </Text>
        {seedMeta ? (
          <Text style={[globalStyles.subtitle, { marginTop: 8 }]}>
            Last import:{' '}
            {seedMeta.importedAt ? new Date(seedMeta.importedAt).toLocaleString() : '—'} ·{' '}
            {seedMeta.cacheKeys} caches · role {seedMeta.role || '—'}
          </Text>
        ) : (
          <Text style={[globalStyles.subtitle, { marginTop: 8 }]}>No seed imported yet.</Text>
        )}
        <TextInput
          value={passphrase}
          onChangeText={setPassphrase}
          placeholder="Seed passphrase"
          secureTextEntry
          style={{
            borderWidth: 2,
            borderColor: '#111',
            borderRadius: 8,
            padding: 10,
            marginTop: 12,
            backgroundColor: '#fff',
          }}
        />
        <TextInput
          value={seedPaste}
          onChangeText={setSeedPaste}
          placeholder="Paste .zsmsseed JSON"
          multiline
          numberOfLines={5}
          textAlignVertical="top"
          style={{
            borderWidth: 2,
            borderColor: '#111',
            borderRadius: 8,
            padding: 10,
            marginTop: 8,
            minHeight: 100,
            backgroundColor: '#fff',
            fontFamily: 'monospace',
            fontSize: 11,
          }}
        />
        <BrutalButton
          title="Import seed"
          onPress={onImportSeed}
          loading={importing}
          style={{ marginTop: 12 }}
        />
      </View>

      <BrutalButton title="Change school" variant="secondary" onPress={changeSchool} />
      <BrutalButton title="Sign out" onPress={onLogout} style={{ marginTop: 12 }} />
      <BrutalButton
        title="Clear offline queue"
        variant="ghost"
        onPress={onClearQueue}
        style={{ marginTop: 24 }}
      />
    </ScrollView>
  )
}
