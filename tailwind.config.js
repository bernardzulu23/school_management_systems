/** @type {import('tailwindcss').Config} */

/** Brutalist neutral scale — maps legacy slate/gray usage to color.md */
const brutalistNeutral = {
  50: '#F5F2EB',
  100: '#EFECE5',
  200: 'rgba(17, 17, 17, 0.08)',
  300: 'rgba(17, 17, 17, 0.15)',
  400: '#666666',
  500: '#666666',
  600: '#4E4D4A',
  700: '#333331',
  800: '#111111',
  900: '#111111',
  950: '#111111',
}

/** Maps legacy violet/purple/indigo UI to accent (color.md) */
const brutalistAccentScale = {
  50: 'rgba(255, 59, 0, 0.08)',
  100: 'rgba(255, 59, 0, 0.12)',
  200: 'rgba(255, 59, 0, 0.2)',
  300: '#FF6B33',
  400: '#FF3B00',
  500: '#FF3B00',
  600: '#CC2F00',
  700: '#991F00',
  800: '#7A1800',
  900: '#5C1200',
  950: '#3D0C00',
}

module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        paper: '#F5F2ED',
        ink: '#111111',
        accent: '#FF3B00',
        muted: '#666666',
        /* Remap Tailwind defaults so every route inherits color.md */
        slate: brutalistNeutral,
        gray: brutalistNeutral,
        zinc: brutalistNeutral,
        neutral: brutalistNeutral,
        stone: brutalistNeutral,
        violet: brutalistAccentScale,
        purple: brutalistAccentScale,
        indigo: brutalistAccentScale,
        fuchsia: brutalistAccentScale,
        pink: {
          500: '#FF3B00',
          600: '#CC2F00',
          700: '#991F00',
        },
        brand: {
          primary: 'var(--color-brand-primary)',
          hover: 'var(--color-brand-hover)',
          light: 'var(--color-brand-light)',
          accent: 'var(--color-brand-accent)',
        },
        dash: {
          bg: 'var(--color-dash-bg)',
          card: 'var(--color-dash-card)',
          text: 'var(--color-dash-text)',
          muted: 'var(--color-dash-muted)',
        },
        kpi: {
          zero: 'var(--color-kpi-zero)',
          fail: 'var(--color-kpi-fail)',
          warn: 'var(--color-kpi-warn)',
          pass: 'var(--color-kpi-pass)',
        },
        royalPurple: {
          page: 'var(--rp-page)',
          deep: 'var(--rp-deep)',
          card: 'var(--rp-card)',
          card2: 'var(--rp-card2)',
          border: 'var(--rp-border)',
          border2: 'var(--rp-border2)',
          text1: 'var(--rp-text1)',
          text2: 'var(--rp-text2)',
          text3: 'var(--rp-text3)',
          accent: 'var(--rp-accent)',
          accentBg: 'var(--rp-accentbg)',
          accentTx: 'var(--rp-accenttx)',
          pill: 'var(--rp-pill)',
          pillTx: 'var(--rp-pill-text)',
          success: '#ecfdf5',
          successTx: '#16a34a',
          danger: '#fef2f2',
          dangerTx: '#dc2626',
          muted: '#F5F2EB',
        },
        g: {
          50: '#F8F8F7',
          100: '#EEEEED',
          200: '#DDDCDA',
          300: '#C4C3BF',
          400: '#A8A7A2',
          600: '#6B6A66',
          700: '#4E4D4A',
          800: '#333331',
          900: '#1C1C1A',
        },
        up: { bg: '#e6faf0', text: '#0d7a4c' },
        down: { bg: '#fef2f2', text: '#b91c1c' },
        warn: { bg: '#fffbeb', text: '#92400e' },
      },
      borderRadius: {
        card: '14px',
        lg2: '20px',
      },
      backgroundImage: {
        header: 'linear-gradient(135deg, #111111 0%, #333331 55%, #4E4D4A 100%)',
      },
      fontFamily: {
        sans: ['var(--font-geist-sans)', 'system-ui', 'sans-serif'],
        tech: ['JetBrains Mono', 'monospace'],
        statement: ['Montserrat', 'sans-serif'],
      },
      boxShadow: {
        brutal: '4px 4px 0 0 #111111',
        'brutal-hover': '6px 6px 0 0 #111111',
        'brutal-accent': '4px 4px 0 0 #FF3B00',
      },
    },
  },
  plugins: [],
}
