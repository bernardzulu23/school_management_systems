/**
 * ZSMS brutalist palette — canonical source: /color.md + app/globals.css
 * Mobile teacher app uses the same tokens as the school management web UI.
 */
export const ZsmsTheme = {
  // Core (color.md § Core palette)
  paper: '#F5F2ED',
  ink: '#111111',
  accent: '#FF3B00',
  accentHover: '#CC2F00',
  white: '#FFFFFF',

  // Surfaces (globals.css --color-dash-*)
  card: '#FFFFFF',
  cardAlt: '#F5F2EB',
  border: '#111111',
  borderMuted: 'rgba(17, 17, 17, 0.12)',
  borderStrong: 'rgba(17, 17, 17, 0.24)',

  // Text
  textSecondary: '#666666',
  textMuted: 'rgba(17, 17, 17, 0.5)',
  placeholder: 'rgba(17, 17, 17, 0.4)',

  // Tints (color.md opacity modifiers)
  accentTint: 'rgba(255, 59, 0, 0.1)',
  inkTint: 'rgba(17, 17, 17, 0.1)',
  hoverInk: 'rgba(17, 17, 17, 0.05)',

  // KPI / status (globals.css --color-kpi-*)
  success: '#1A6B6A',
  successBg: '#E6FAF0',
  danger: '#FF3B00',
  dangerBg: 'rgba(255, 59, 0, 0.1)',
  warn: '#C99A2E',
  warnBg: '#FFFBEB',
  kpiZero: '#A8A7A2',

  // Navigation (color.md App.tsx — cream bar, active inverted)
  navBg: '#F5F2ED',
  navActiveBg: '#111111',
  navActiveText: '#F5F2ED',
  navInactiveText: '#111111',

  // Attendance semantics (aligned with web status chips)
  present: '#1A6B6A',
  absent: '#FF3B00',
  late: '#C99A2E',
  excused: '#666666',

  // Legacy alias (cream variant in color.md)
  paperAlt: '#EFECE5',
} as const

export const ZsmsSpacing = {
  cardRadius: 14,
  buttonRadius: 10,
  brutalShadow: { width: 4, height: 4, color: '#111111' },
  brutalShadowHover: { width: 6, height: 6, color: '#111111' },
} as const
