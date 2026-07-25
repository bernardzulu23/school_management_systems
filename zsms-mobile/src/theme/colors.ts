/**
 * ZSMS brutalist palette — keep in sync with lib/theme/zsmsPalette.js + app/globals.css
 * Used by the teacher companion app (Android APK, iOS, tablet/desktop-class devices).
 * @see ../../color.md
 */
export const ZsmsTheme = {
  paper: '#F5F2ED',
  ink: '#111111',
  accent: '#FF3B00',
  accentHover: '#CC2F00',
  white: '#FFFFFF',
  muted: '#666666',
  paperAlt: '#EFECE5',

  brandPrimary: '#FF3B00',
  brandHover: '#CC2F00',
  brandLight: 'rgba(255, 59, 0, 0.1)',

  card: '#FFFFFF',
  cardAlt: '#F5F2EB',
  dashBg: '#F5F2ED',
  dashBorder: '#111111',
  dashText: '#111111',
  dashMuted: '#666666',

  border: '#111111',
  borderMuted: 'rgba(17, 17, 17, 0.12)',
  borderStrong: 'rgba(17, 17, 17, 0.24)',
  borderHover: 'rgba(17, 17, 17, 0.3)',
  textSecondary: '#666666',
  textMuted: 'rgba(17, 17, 17, 0.5)',
  placeholder: 'rgba(17, 17, 17, 0.4)',

  accentTint: 'rgba(255, 59, 0, 0.1)',
  accentBg: 'rgba(255, 59, 0, 0.15)',
  inkTint: 'rgba(17, 17, 17, 0.1)',
  hoverInk: 'rgba(17, 17, 17, 0.05)',
  tableHover: 'rgba(255, 59, 0, 0.05)',

  kpiZero: '#A8A7A2',
  kpiFail: '#FF3B00',
  kpiWarn: '#C99A2E',
  kpiPass: '#1A6B6A',
  success: '#1A6B6A',
  successBg: '#E6FAF0',
  successTx: '#6EDDB8',
  danger: '#FF3B00',
  dangerBg: 'rgba(255, 59, 0, 0.1)',
  dangerTx: '#FF8080',
  warn: '#C99A2E',
  warnBg: '#FFFBEB',

  navBg: '#1A1A1A',
  navText: '#F5F2ED',
  navBorder: 'rgba(239, 236, 229, 0.1)',
  navActiveBg: '#111111',
  navActiveText: '#F5F2ED',
  /** Muted paper on dark nav — must stay readable on `navBg` (#1A1A1A). */
  navInactiveText: '#A8A7A2',
  navBarBg: '#F5F2ED',

  tableHeader: '#111111',
  tableRow: '#FFFFFF',
  tableRowAlt: '#F5F2EB',
  tableText: '#111111',
  tableBorder: 'rgba(17, 17, 17, 0.1)',

  avatarBg: '#FF3B00',
  avatarText: '#FFFFFF',
  dateBg: '#111111',
  dateText: '#EFECE5',

  rpPage: '#F5F2ED',
  rpDeep: '#1A1A1A',
  rpCard: '#FFFFFF',
  rpCard2: '#F5F2EB',
  rpBorder: 'rgba(17, 17, 17, 0.12)',
  rpBorder2: 'rgba(17, 17, 17, 0.24)',
  rpText1: '#111111',
  rpText2: '#666666',
  rpText3: '#666666',
  rpAccent: '#FF3B00',
  rpAccentBg: 'rgba(255, 59, 0, 0.15)',
  rpAccentTx: '#FFFFFF',
  rpPill: '#EFECE5',
  rpPillText: '#111111',
  rpSuccess: '#1A4A3A',
  rpSuccessTx: '#6EDDB8',
  rpDanger: '#4A1A1A',
  rpDangerTx: '#FF8080',
  rpMuted: 'rgba(17, 17, 17, 0.06)',
  /** Light text for dark `--rp-deep` / nav surfaces */
  rpOnDeep: '#F5F2ED',
  rpOnDeepMuted: '#A8A7A2',

  badgeUpBg: '#E6FAF0',
  badgeUpColor: '#0D7A4C',
  badgeDnBg: '#FEF2F2',
  badgeDnColor: '#B91C1C',

  present: '#1A6B6A',
  absent: '#FF3B00',
  late: '#C99A2E',
  excused: '#666666',

  g50: '#F8F8F7',
  g100: '#EEEEED',
  g200: '#DDDCDA',
  g400: '#A8A7A2',
  g600: '#6B6A66',
  g700: '#4E4D4A',
  g800: '#333331',
  g900: '#1C1C1A',
} as const

export const ZsmsSpacing = {
  cardRadius: 14,
  cardRadiusLg: 20,
  buttonRadius: 10,
  brutalShadow: { width: 4, height: 4, color: '#111111' },
  brutalShadowHover: { width: 6, height: 6, color: '#111111' },
  brutalShadowAccent: { width: 4, height: 4, color: '#FF3B00' },
} as const
