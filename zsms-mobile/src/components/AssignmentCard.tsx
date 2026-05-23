import { Pressable, StyleSheet, Text, View } from 'react-native'
import { ZsmsSpacing, ZsmsTheme } from '@/theme/colors'
import type { TeachingAssignment } from '@/types'

type Props = {
  assignment: TeachingAssignment
  onPress: () => void
  subtitle?: string
}

export function AssignmentCard({ assignment, onPress, subtitle }: Props) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      {({ pressed }) => (
        <>
          <Text style={[styles.className, pressed && styles.pressedText]}>
            {assignment.className || 'Class'}
          </Text>
          <Text style={[styles.subject, pressed && styles.pressedText]}>
            {assignment.subjectName || 'Subject'}
          </Text>
          {subtitle ? (
            <Text style={[styles.sub, pressed && styles.pressedSub]}>{subtitle}</Text>
          ) : null}
        </>
      )}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: ZsmsTheme.card,
    borderRadius: ZsmsSpacing.cardRadius,
    borderWidth: 2,
    borderColor: ZsmsTheme.border,
    padding: 16,
    marginBottom: 12,
    shadowColor: ZsmsTheme.ink,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  pressed: {
    backgroundColor: ZsmsTheme.ink,
  },
  className: { fontSize: 18, fontWeight: '800', color: ZsmsTheme.ink },
  subject: { fontSize: 14, color: ZsmsTheme.textSecondary, marginTop: 4 },
  sub: { fontSize: 12, color: ZsmsTheme.textMuted, marginTop: 8 },
  pressedText: { color: ZsmsTheme.paperAlt },
  pressedSub: { color: ZsmsTheme.paperAlt, opacity: 0.8 },
})
