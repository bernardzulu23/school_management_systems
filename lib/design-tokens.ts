/** Design tokens aligned with color.md brutalist palette */
export const colors = {
  paper: '#EFECE5',
  ink: '#111111',
  accent: '#FF3B00',
  accentHover: '#CC2F00',
  white: '#FFFFFF',
  muted: '#666666',
  cardAlt: '#F5F2EB',
  primary: {
    50: '#F5F2EB',
    100: '#EFECE5',
    600: '#FF3B00',
    700: '#CC2F00',
  },
  gray: {
    50: '#F5F2EB',
    100: '#EFECE5',
    200: 'rgba(17, 17, 17, 0.08)',
    300: 'rgba(17, 17, 17, 0.15)',
    400: '#666666',
    600: '#4E4D4A',
    900: '#111111',
  },
  success: '#1A6B6A',
  warning: '#C99A2E',
  error: '#FF3B00',
}

export const typography = {
  h1: {
    fontSize: '36px',
    fontWeight: 700,
    lineHeight: '1.2',
  },
  h2: {
    fontSize: '28px',
    fontWeight: 700,
    lineHeight: '1.3',
  },
  h3: {
    fontSize: '20px',
    fontWeight: 600,
    lineHeight: '1.4',
  },
  body: {
    fontSize: '16px',
    fontWeight: 400,
    lineHeight: '1.5',
  },
  caption: {
    fontSize: '12px',
    fontWeight: 400,
    lineHeight: '1.5',
  },
}

export const spacing = {
  xs: '8px',
  sm: '16px',
  md: '24px',
  lg: '32px',
  xl: '48px',
  xxl: '64px',
}

export const shadows = {
  sm: '0 1px 2px rgba(17, 17, 17, 0.05)',
  md: '4px 4px 0 0 #111111',
}

export const radius = {
  sm: '6px',
  md: '8px',
  lg: '12px',
}
