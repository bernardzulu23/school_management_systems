import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Modal,
  Text,
  TextInput,
  View,
  StyleSheet,
  FlatList,
  Pressable,
  Platform,
  Switch,
} from 'react-native'
import { CameraView, useCameraPermissions } from 'expo-camera'
import type { CameraView as CameraViewType } from 'expo-camera'
import { BrutalButton } from '@/components/BrutalButton'
import { parseEmbedding, findBestLocalMatch } from '@/utils/faceMatch'
import { extractProbeEmbedding, isMobileFaceNetAvailable, isProbeLive } from '@/face/mobileFaceNet'
import { verifyFaceMatch } from '@/api/attendanceSessions'
import { ZsmsTheme } from '@/theme/colors'
import type { RosterStudent } from '@/types'

type Props = {
  visible: boolean
  sessionId: string
  roster: RosterStudent[]
  onMatch: (student: RosterStudent, score: number) => void
  onClose: () => void
}

export function FaceScanPanel({ visible, sessionId, roster, onMatch, onClose }: Props) {
  const [permission, requestPermission] = useCameraPermissions()
  const cameraRef = useRef<CameraViewType>(null)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<string | null>(null)
  const [scanning, setScanning] = useState(false)
  const [liveScan, setLiveScan] = useState(false)
  const mlAvailable = isMobileFaceNetAvailable()

  const enrolled = useMemo(
    () => roster.filter((s) => parseEmbedding(s.faceEmbedding)?.length),
    [roster]
  )

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return roster
    return roster.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        String(s.qrCode || '')
          .toLowerCase()
          .includes(q)
    )
  }, [roster, search])

  useEffect(() => {
    if (!visible) {
      setSearch('')
      setStatus(null)
      setLiveScan(false)
      setScanning(false)
    }
  }, [visible])

  useEffect(() => {
    if (!visible || !liveScan || !permission?.granted || enrolled.length === 0) return
    const id = setInterval(() => {
      runMlIdentify().catch(() => {})
    }, 3500)
    return () => clearInterval(id)
  }, [visible, liveScan, permission?.granted, enrolled.length])

  async function runMlIdentify() {
    if (scanning || !cameraRef.current) return
    setScanning(true)
    setStatus('Scanning face…')
    try {
      const photo = await cameraRef.current.takePictureAsync({
        base64: true,
        quality: 0.35,
        skipProcessing: true,
      })
      if (!photo?.base64) {
        setStatus('Could not capture frame')
        return
      }

      if (mlAvailable) {
        const live = await isProbeLive(photo.base64)
        if (!live) {
          setStatus('Liveness check failed — use a live face, not a photo.')
          return
        }
        const { embedding, error } = await extractProbeEmbedding(photo.base64)
        if (!embedding) {
          setStatus(error || 'No face detected')
          return
        }
        await applyProbe(embedding)
        return
      }

      setStatus('ML Kit requires Android dev build. Pick pupil from list below.')
    } catch (e) {
      setStatus(e instanceof Error ? e.message : 'Scan failed')
    } finally {
      setScanning(false)
    }
  }

  async function applyProbe(embedding: number[]) {
    const local = findBestLocalMatch(embedding, roster)
    if (local) {
      const student = roster.find((s) => s.id === local.studentId)
      if (student) {
        setStatus(`Matched ${student.name} (${Math.round(local.score * 100)}%)`)
        onMatch(student, local.score)
        return
      }
    }

    try {
      const remote = await verifyFaceMatch({ sessionId, probeEmbedding: embedding })
      const student = roster.find((s) => s.id === remote.studentId)
      if (student) {
        setStatus(`Matched ${student.name} (${Math.round(remote.score * 100)}%)`)
        onMatch(student, remote.score)
        return
      }
    } catch {
      /* fall through */
    }

    setStatus('Face not recognised — use Present / Late on the class list for this pupil.')
  }

  function confirmManual(student: RosterStudent) {
    onMatch(student, 1)
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <Text style={styles.title}>Face scan</Text>
        <Text style={styles.hint}>
          {mlAvailable
            ? 'On-device match for pupils with parental consent only. Anyone without consent — or a failed match — use Present / Late on the class list (always available).'
            : `Automatic face match needs an Android Face ML build. Use Present / Late on the class list for every pupil (${Platform.OS}).`}
        </Text>
        <Text style={[styles.hint, { marginBottom: 8 }]}>
          Manual path is first-class: close this panel and tap Present or Late for any pupil.
        </Text>

        {!permission?.granted ? (
          <BrutalButton
            title="Allow camera"
            onPress={() => requestPermission()}
            loading={!permission}
          />
        ) : (
          <View style={styles.cameraWrap}>
            <CameraView ref={cameraRef} style={styles.camera} facing="front" />
          </View>
        )}

        {mlAvailable ? (
          <View style={styles.row}>
            <BrutalButton
              title="Identify face"
              onPress={() => runMlIdentify()}
              loading={scanning}
            />
            <View style={styles.liveRow}>
              <Text style={styles.liveLabel}>Live scan</Text>
              <Switch value={liveScan} onValueChange={setLiveScan} />
            </View>
          </View>
        ) : null}

        <Text style={styles.enrolled}>
          {enrolled.length} of {roster.length} pupils have face templates
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Search name or exam number"
          value={search}
          onChangeText={setSearch}
        />

        {status ? <Text style={styles.status}>{status}</Text> : null}

        <FlatList
          data={filtered.slice(0, 12)}
          keyExtractor={(s) => s.id}
          style={{ flex: 1 }}
          ListEmptyComponent={<Text style={styles.hint}>No pupils match your search.</Text>}
          renderItem={({ item }) => (
            <Pressable style={styles.listRow} onPress={() => confirmManual(item)}>
              <Text style={styles.rowName}>{item.name}</Text>
              <Text style={styles.rowMeta}>
                {item.qrCode || '—'}
                {item.requiresSecondaryAuth ? ' · twin' : ''}
                {item.faceEmbedding ? ' · face ✓' : ''}
              </Text>
            </Pressable>
          )}
        />

        <View style={styles.actions}>
          <BrutalButton title="Close" variant="secondary" onPress={onClose} />
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: ZsmsTheme.paper, padding: 16, paddingTop: 48 },
  title: { fontSize: 22, fontWeight: '800', color: ZsmsTheme.ink },
  hint: { marginTop: 6, color: ZsmsTheme.textSecondary, fontSize: 14, lineHeight: 20 },
  cameraWrap: {
    height: 220,
    marginTop: 12,
    borderWidth: 2,
    borderColor: ZsmsTheme.ink,
    borderRadius: 12,
    overflow: 'hidden',
  },
  camera: { flex: 1 },
  row: { marginTop: 12, gap: 10 },
  liveRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  liveLabel: { fontWeight: '600', color: ZsmsTheme.ink },
  enrolled: { marginTop: 8, fontSize: 12, color: ZsmsTheme.textMuted },
  input: {
    borderWidth: 2,
    borderColor: ZsmsTheme.ink,
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
    fontSize: 16,
  },
  status: { marginTop: 8, color: ZsmsTheme.success, fontWeight: '600' },
  listRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: ZsmsTheme.border,
  },
  rowName: { fontWeight: '700', color: ZsmsTheme.ink },
  rowMeta: { fontSize: 12, color: ZsmsTheme.textMuted, marginTop: 2 },
  actions: { marginTop: 8 },
})
