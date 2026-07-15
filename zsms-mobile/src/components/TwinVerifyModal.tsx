import { useState } from 'react'
import {
  Modal,
  Text,
  TextInput,
  View,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from 'react-native'
import { BrutalButton } from '@/components/BrutalButton'
import { verifyTwinAuth } from '@/api/twinVerify'
import { ZsmsTheme } from '@/theme/colors'

type Props = {
  visible: boolean
  studentName: string
  sessionId: string
  studentId: string
  /** Stored preference only — server always requires PIN until attestation exists. */
  secondaryAuthMethod?: string | null
  onVerified: (twinAuthToken: string) => void
  onCancel: () => void
}

/**
 * Twin disambiguation: PIN path with server bcrypt only.
 * Device fingerprint / Face ID is not offered — a client-asserted biometricVerified
 * flag previously bypassed the server (Prompt 23). Success returns twinAuthToken for marking.
 */
export function TwinVerifyModal({
  visible,
  studentName,
  sessionId,
  studentId,
  secondaryAuthMethod,
  onVerified,
  onCancel,
}: Props) {
  const [pin, setPin] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const preferred = String(secondaryAuthMethod || 'PIN').toUpperCase()

  async function submitPin() {
    setLoading(true)
    setError(null)
    try {
      const data = await verifyTwinAuth({ sessionId, studentId, pin })
      if (!data.twinAuthToken) {
        setError('Server did not return a twin auth ticket')
        return
      }
      setPin('')
      onVerified(data.twinAuthToken)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Verification failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>Twin verification</Text>
          <Text style={styles.sub}>
            Another twin is already marked present. Enter the PIN for {studentName} to confirm who
            is in front of you.
          </Text>
          {preferred === 'FINGERPRINT' ? (
            <Text style={styles.note}>
              Fingerprint preference is on file, but twin confirmation uses a server-checked PIN
              until device-attested biometrics are implemented.
            </Text>
          ) : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <TextInput
            style={styles.input}
            placeholder="Enter twin PIN"
            value={pin}
            onChangeText={setPin}
            keyboardType="number-pad"
            secureTextEntry
            maxLength={8}
          />
          <BrutalButton title="Verify PIN" onPress={submitPin} loading={loading} />
          <Pressable onPress={onCancel} style={styles.cancel}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
          {loading ? <ActivityIndicator style={{ marginTop: 8 }} /> : null}
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  card: {
    backgroundColor: ZsmsTheme.paper,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: ZsmsTheme.ink,
  },
  title: { fontSize: 20, fontWeight: '800', color: ZsmsTheme.ink },
  sub: { marginTop: 8, color: ZsmsTheme.textSecondary, lineHeight: 20 },
  note: { marginTop: 8, color: ZsmsTheme.textMuted, fontSize: 12, lineHeight: 18 },
  error: { color: ZsmsTheme.danger, marginTop: 8 },
  input: {
    borderWidth: 2,
    borderColor: ZsmsTheme.ink,
    borderRadius: 10,
    padding: 12,
    marginTop: 16,
    marginBottom: 12,
    fontSize: 18,
  },
  cancel: { alignItems: 'center', marginTop: 16, padding: 8 },
  cancelText: { color: ZsmsTheme.textMuted, fontWeight: '600' },
})
