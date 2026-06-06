import { useState } from 'react'
import { Modal, Text, View, StyleSheet, Platform } from 'react-native'
import { BrutalButton } from '@/components/BrutalButton'
import { saveStudentFaceEmbedding } from '@/api/faceEnrollment'
import { isMobileFaceNetAvailable } from '@/face/mobileFaceNet'
import { ZsmsTheme } from '@/theme/colors'

type Props = {
  visible: boolean
  studentId: string
  studentName: string
  onDone: () => void
  onClose: () => void
}

export function FaceEnrollPanel({ visible, studentId, studentName, onDone, onClose }: Props) {
  const [capturePhoto, setCapturePhoto] = useState(false)
  const [instruction, setInstruction] = useState('Look at the camera')
  const [photosRemaining, setPhotosRemaining] = useState(3)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const mlAvailable = isMobileFaceNetAvailable()

  if (!mlAvailable) {
    return (
      <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
        <View style={styles.container}>
          <Text style={styles.title}>Enrol face</Text>
          <Text style={styles.hint}>
            Face ML (MobileFaceNet) is not installed in this build. Attendance still works via the
            class register and manual pupil picker. Platform: {Platform.OS}.
          </Text>
          <BrutalButton title="Close" variant="secondary" onPress={onClose} />
        </View>
      </Modal>
    )
  }

  const { FaceDetectionCameraView } = require('expo-face-detection') as {
    FaceDetectionCameraView: React.ComponentType<Record<string, unknown>>
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <Text style={styles.title}>Enrol face — {studentName}</Text>
        <Text style={styles.hint}>{instruction}</Text>
        <Text style={styles.sub}>Photos left: {photosRemaining}</Text>

        <View style={styles.cameraWrap}>
          <FaceDetectionCameraView
            style={styles.camera}
            mode="enrollment"
            cameraFacing="front"
            capturePhoto={capturePhoto}
            onEnrollmentStatus={({ nativeEvent }) => {
              setInstruction(nativeEvent.instruction || 'Follow on-screen guidance')
              setPhotosRemaining(nativeEvent.photosRemaining)
            }}
            onEnrollmentCapture={() => {
              setCapturePhoto(false)
            }}
            onEnrollmentComplete={async ({ nativeEvent }) => {
              if (!nativeEvent.success || !nativeEvent.embedding?.length) {
                setError(nativeEvent.errorMessage || 'Enrollment failed')
                return
              }
              setSaving(true)
              setError(null)
              try {
                await saveStudentFaceEmbedding(studentId, nativeEvent.embedding)
                onDone()
              } catch (e) {
                setError(e instanceof Error ? e.message : 'Failed to save embedding')
              } finally {
                setSaving(false)
              }
            }}
            onError={({ nativeEvent }) => {
              setError(nativeEvent.error || 'Camera error')
            }}
          />
        </View>

        <BrutalButton
          title="Capture photo"
          onPress={() => setCapturePhoto(true)}
          loading={saving}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <BrutalButton
          title="Cancel"
          variant="secondary"
          onPress={onClose}
          style={{ marginTop: 12 }}
        />
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: ZsmsTheme.paper, padding: 16, paddingTop: 48 },
  title: { fontSize: 20, fontWeight: '800', color: ZsmsTheme.ink },
  hint: { marginTop: 8, color: ZsmsTheme.textSecondary, lineHeight: 20 },
  sub: { marginTop: 4, color: ZsmsTheme.textMuted },
  cameraWrap: {
    flex: 1,
    marginVertical: 16,
    borderWidth: 2,
    borderColor: ZsmsTheme.ink,
    borderRadius: 12,
    overflow: 'hidden',
    minHeight: 320,
  },
  camera: { flex: 1 },
  error: { color: ZsmsTheme.danger, marginTop: 8 },
})
