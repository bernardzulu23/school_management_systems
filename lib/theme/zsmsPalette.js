/**
 * ZSMS design tokens — canonical JS export of app/globals.css + tailwind.config.js.
 * Sync to: lib/mobile/theme.js, zsms-mobile/src/theme/colors.ts
 * Reference: color.md
 */
export const ZsmsTheme = {
  // ── Brutalist core ──
  paper: '#F5F2ED',
  ink: '#111111',
  accent: '#FF3B00',
  accentHover: '#CC2F00',
  white: '#FFFFFF',
  muted: '#666666',
  paperAlt: '#EFECE5',

  // ── Brand ──
  brandPrimary: '#FF3B00',
  brandHover: '#CC2F00',
  brandLight: 'rgba(255, 59, 0, 0.1)',

  // ── Dashboard surfaces ──
  card: '#FFFFFF',
  cardAlt: '#F5F2EB',
  dashBg: '#F5F2ED',
  dashBorder: '#111111',
  dashText: '#111111',
  dashMuted: '#666666',

  // ── Borders & text ──
  border: '#111111',
  borderMuted: 'rgba(17, 17, 17, 0.12)',
  borderStrong: 'rgba(17, 17, 17, 0.24)',
  borderHover: 'rgba(17, 17, 17, 0.3)',
  textSecondary: '#666666',
  textMuted: 'rgba(17, 17, 17, 0.5)',
  placeholder: 'rgba(17, 17, 17, 0.4)',

  // ── Tints ──
  accentTint: 'rgba(255, 59, 0, 0.1)',
  accentBg: 'rgba(255, 59, 0, 0.15)',
  inkTint: 'rgba(17, 17, 17, 0.1)',
  hoverInk: 'rgba(17, 17, 17, 0.05)',
  tableHover: 'rgba(255, 59, 0, 0.05)',

  // ── KPI / status ──
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

  // ── Navigation (web sidebar + mobile tab bar) ──
  navBg: '#1A1A1A',
  navText: '#F5F2ED',
  navBorder: 'rgba(239, 236, 229, 0.1)',
  navActiveBg: '#111111',
  navActiveText: '#F5F2ED',
  navInactiveText: '#111111',
  navBarBg: '#F5F2ED',

  // ── Tables ──
  tableHeader: '#111111',
  tableRow: '#FFFFFF',
  tableRowAlt: '#F5F2EB',
  tableText: '#111111',
  tableBorder: 'rgba(17, 17, 17, 0.1)',

  // ── Avatar / date chips ──
  avatarBg: '#FF3B00',
  avatarText: '#FFFFFF',
  dateBg: '#111111',
  dateText: '#EFECE5',

  // ── Legacy royalPurple remaps (dashboard class names) ──
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

  // ── Badges ──
  badgeUpBg: '#E6FAF0',
  badgeUpColor: '#0D7A4C',
  badgeDnBg: '#FEF2F2',
  badgeDnColor: '#B91C1C',

  // ── Attendance (mobile + web chips) ──
  present: '#1A6B6A',
  absent: '#FF3B00',
  late: '#C99A2E',
  excused: '#666666',

  // ── Neutral scale (tailwind g.*) ──
  g50: '#F8F8F7',
  g100: '#EEEEED',
  g200: '#DDDCDA',
  g400: '#A8A7A2',
  g600: '#6B6A66',
  g700: '#4E4D4A',
  g800: '#333331',
  g900: '#1C1C1A',
}

export const ZsmsSpacing = {
  cardRadius: 14,
  cardRadiusLg: 20,
  buttonRadius: 10,
  brutalShadow: { width: 4, height: 4, color: '#111111' },
  brutalShadowHover: { width: 6, height: 6, color: '#111111' },
  brutalShadowAccent: { width: 4, height: 4, color: '#FF3B00' },
}

/** @deprecated Use ZsmsTheme — kept for inline-style imports */
export const BRUTALIST = {
  paper: ZsmsTheme.paper,
  ink: ZsmsTheme.ink,
  accent: ZsmsTheme.accent,
  accentHover: ZsmsTheme.accentHover,
  white: ZsmsTheme.white,
  muted: ZsmsTheme.muted,
  card: ZsmsTheme.card,
  cardAlt: ZsmsTheme.cardAlt,
  border: ZsmsTheme.border,
  borderMuted: ZsmsTheme.borderMuted,
  accentTint: ZsmsTheme.accentTint,
}
