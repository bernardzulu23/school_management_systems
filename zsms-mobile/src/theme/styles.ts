import { StyleSheet } from 'react-native'
import { ZsmsSpacing, ZsmsTheme } from './colors'

const brutalShadow = {
  shadowColor: ZsmsTheme.ink,
  shadowOffset: { width: 4, height: 4 },
  shadowOpacity: 1,
  shadowRadius: 0,
  elevation: 4,
}

export const globalStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: ZsmsTheme.paper,
  },
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: ZsmsTheme.paper,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: ZsmsTheme.ink,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: ZsmsTheme.textSecondary,
    marginBottom: 16,
  },
  card: {
    backgroundColor: ZsmsTheme.card,
    borderRadius: ZsmsSpacing.cardRadius,
    borderWidth: 2,
    borderColor: ZsmsTheme.border,
    padding: 16,
    marginBottom: 12,
    ...brutalShadow,
  },
  input: {
    backgroundColor: ZsmsTheme.white,
    borderWidth: 2,
    borderColor: ZsmsTheme.border,
    borderRadius: ZsmsSpacing.buttonRadius,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: ZsmsTheme.ink,
    marginBottom: 12,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: ZsmsTheme.ink,
    marginBottom: 6,
  },
  errorText: {
    color: ZsmsTheme.accent,
    fontSize: 13,
    marginBottom: 8,
    backgroundColor: ZsmsTheme.dangerBg,
    padding: 8,
    borderWidth: 2,
    borderColor: ZsmsTheme.accent,
    borderRadius: ZsmsSpacing.buttonRadius,
  },
  headerDark: {
    backgroundColor: ZsmsTheme.ink,
    padding: 16,
  },
  headerDarkText: {
    color: ZsmsTheme.paperAlt,
    fontWeight: '800',
    fontSize: 18,
  },
})
