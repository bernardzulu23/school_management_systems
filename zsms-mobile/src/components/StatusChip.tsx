import { Pressable, StyleSheet, Text } from 'react-native'
import { ZsmsTheme } from '@/theme/colors'
import type { AttendanceStatus } from '@/types'

const COLORS: Record<AttendanceStatus, string> = {
  present: ZsmsTheme.present,
  absent: ZsmsTheme.absent,
  late: ZsmsTheme.late,
  excused: ZsmsTheme.excused,
}

type Props = {
  status: AttendanceStatus
  selected?: boolean
  onPress?: () => void
  compact?: boolean
}

export function StatusChip({ status, selected, onPress, compact }: Props) {
  const color = COLORS[status]
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        compact && styles.compact,
        { borderColor: color },
        selected && { backgroundColor: color },
      ]}
    >
      <Text style={[styles.label, selected && styles.labelSelected]}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  chip: {
    borderWidth: 2,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 6,
    marginBottom: 6,
    backgroundColor: ZsmsTheme.white,
  },
  compact: { paddingHorizontal: 8, paddingVertical: 4 },
  label: { fontSize: 12, fontWeight: '600', color: ZsmsTheme.ink, textTransform: 'capitalize' },
  labelSelected: { color: ZsmsTheme.white },
})
