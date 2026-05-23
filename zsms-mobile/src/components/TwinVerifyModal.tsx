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
import * as LocalAuthentication from 'expo-local-authentication'
import { BrutalButton } from '@/components/BrutalButton'
import { verifyTwinAuth } from '@/api/twinVerify'
import { ZsmsTheme } from '@/theme/colors'

type Props = {
  visible: boolean
  studentName: string
  sessionId: string
  studentId: string
  secondaryAuthMethod?: string | null
  onVerified: () => void
  onCancel: () => void
}

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
  const method = String(secondaryAuthMethod || 'PIN').toUpperCase()

  async function submitPin() {
    setLoading(true)
    setError(null)
    try {
      await verifyTwinAuth({ sessionId, studentId, pin })
      setPin('')
      onVerified()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Verification failed')
    } finally {
      setLoading(false)
    }
  }

  async function useBiometric() {
    setLoading(true)
    setError(null)
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync()
      const enrolled = await LocalAuthentication.isEnrolledAsync()
      if (!hasHardware || !enrolled) {
        setError('Biometrics not available on this device')
        return
      }
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: `Confirm identity: ${studentName}`,
        cancelLabel: 'Cancel',
      })
      if (!result.success) {
        setError('Biometric verification cancelled')
        return
      }
      await verifyTwinAuth({ sessionId, studentId, biometricVerified: true })
      onVerified()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Biometric failed')
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
            Another twin is already marked present. Confirm {studentName} is the pupil in front of
            you.
          </Text>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          {method !== 'FINGERPRINT' ? (
            <>
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
            </>
          ) : null}
          <BrutalButton
            title="Use fingerprint / Face ID"
            variant="secondary"
            onPress={useBiometric}
            loading={loading && method === 'FINGERPRINT'}
          />
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
