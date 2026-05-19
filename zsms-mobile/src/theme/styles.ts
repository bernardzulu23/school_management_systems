import { StyleSheet } from 'react-native'
import { ZsmsSpacing, ZsmsTheme } from './colors'

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
    borderWidth: 1,
    borderColor: ZsmsTheme.border,
    padding: 16,
    marginBottom: 12,
  },
  input: {
    backgroundColor: ZsmsTheme.white,
    borderWidth: 2,
    borderColor: ZsmsTheme.ink,
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
    color: ZsmsTheme.danger,
    fontSize: 13,
    marginBottom: 8,
  },
})
