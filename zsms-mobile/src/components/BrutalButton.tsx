import { ActivityIndicator, Pressable, StyleSheet, Text, ViewStyle } from 'react-native'
import { ZsmsSpacing, ZsmsTheme } from '@/theme/colors'

type Props = {
  title: string
  onPress: () => void
  variant?: 'primary' | 'secondary' | 'ghost'
  loading?: boolean
  disabled?: boolean
  style?: ViewStyle
}

export function BrutalButton({
  title,
  onPress,
  variant = 'primary',
  loading,
  disabled,
  style,
}: Props) {
  const isPrimary = variant === 'primary'
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        isPrimary ? styles.primary : variant === 'secondary' ? styles.secondary : styles.ghost,
        pressed && styles.pressed,
        (disabled || loading) && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary ? ZsmsTheme.ink : ZsmsTheme.ink} />
      ) : (
        <Text style={[styles.text, isPrimary ? styles.textPrimary : styles.textInk]}>{title}</Text>
      )}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  base: {
    borderWidth: 2,
    borderColor: ZsmsTheme.ink,
    borderRadius: ZsmsSpacing.buttonRadius,
    paddingVertical: 14,
    paddingHorizontal: 18,
    alignItems: 'center',
    shadowColor: ZsmsTheme.ink,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  primary: { backgroundColor: ZsmsTheme.accent },
  secondary: { backgroundColor: ZsmsTheme.paper },
  ghost: { backgroundColor: 'transparent', shadowOpacity: 0, elevation: 0 },
  pressed: {
    transform: [{ translateX: 2 }, { translateY: 2 }],
    shadowOffset: { width: 2, height: 2 },
  },
  disabled: { opacity: 0.5 },
  text: { fontSize: 16, fontWeight: '700' },
  textPrimary: { color: ZsmsTheme.ink },
  textInk: { color: ZsmsTheme.ink },
})
