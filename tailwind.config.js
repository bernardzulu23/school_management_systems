/** @type {import('tailwindcss').Config} */
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
          muted: '#f3f4f6',
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
        header: 'linear-gradient(135deg, #1C1C1A 0%, #333331 55%, #4E4D4A 100%)',
      },
      fontFamily: {
        sans: ['var(--font-geist-sans)', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
