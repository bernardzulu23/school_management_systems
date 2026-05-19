import { Pressable, StyleSheet, Text, View } from 'react-native'
import { ZsmsTheme } from '@/theme/colors'
import type { TeachingAssignment } from '@/types'

type Props = {
  assignment: TeachingAssignment
  onPress: () => void
  subtitle?: string
}

export function AssignmentCard({ assignment, onPress, subtitle }: Props) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <Text style={styles.className}>{assignment.className || 'Class'}</Text>
      <Text style={styles.subject}>{assignment.subjectName || 'Subject'}</Text>
      {subtitle ? <Text style={styles.sub}>{subtitle}</Text> : null}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: ZsmsTheme.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: ZsmsTheme.border,
    padding: 16,
    marginBottom: 12,
  },
  pressed: { opacity: 0.9 },
  className: { fontSize: 18, fontWeight: '800', color: ZsmsTheme.ink },
  subject: { fontSize: 14, color: ZsmsTheme.textSecondary, marginTop: 4 },
  sub: { fontSize: 12, color: ZsmsTheme.textMuted, marginTop: 8 },
})
