import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#1B2D4F',
          50:  '#EEF1F7',
          100: '#D5DCEB',
          200: '#AABAD7',
          300: '#7F97C3',
          400: '#5475AF',
          500: '#1B2D4F',
          600: '#162440',
          700: '#111B30',
          800: '#0B1220',
          900: '#060910',
        },
        steel: '#2C5F8A',
        gold: {
          DEFAULT: '#C9A84C',
          light:   '#E0C47A',
          dark:    '#A8883A',
          muted:   '#F5EDD8',
        },
        ivory: {
          DEFAULT: '#FAFAF8',
          dark:    '#F5F3EF',
          deeper:  '#EDE9E3',
        },
        border: '#E4E2DD',
        muted:  '#6B7280',
        status: {
          active:    '#1B2D4F',
          pending:   '#D97706',
          sold:      '#9CA3AF',
          draft:     '#6B7280',
          withdrawn: '#9CA3AF',
        },
        success: '#16A34A',
        warning: '#D97706',
        error:   '#DC2626',
        info:    '#0EA5E9',
      },
      fontFamily: {
        display: ['var(--font-playfair)', 'Georgia', 'serif'],
        sans:    ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'display-2xl': ['4rem',    { lineHeight: '1.05', fontWeight: '700', letterSpacing: '-0.02em' }],
        'display-xl':  ['3rem',    { lineHeight: '1.1',  fontWeight: '700', letterSpacing: '-0.01em' }],
        'display-lg':  ['2.25rem', { lineHeight: '1.15', fontWeight: '600', letterSpacing: '-0.01em' }],
        'display-md':  ['1.75rem', { lineHeight: '1.2',  fontWeight: '600' }],
        'display-sm':  ['1.375rem',{ lineHeight: '1.3',  fontWeight: '600' }],
        'heading-xl':  ['1.5rem',  { lineHeight: '1.3',  fontWeight: '600' }],
        'heading-lg':  ['1.25rem', { lineHeight: '1.35', fontWeight: '600' }],
        'heading-md':  ['1.125rem',{ lineHeight: '1.4',  fontWeight: '600' }],
        'heading-sm':  ['1rem',    { lineHeight: '1.5',  fontWeight: '600' }],
        'label':       ['0.6875rem', { lineHeight: '1.4', fontWeight: '600', letterSpacing: '0.08em' }],
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
        '26': '6.5rem',
        '30': '7.5rem',
      },
      maxWidth: {
        '8xl': '88rem',
      },
      borderRadius: {
        card:  '8px',
        modal: '12px',
        pill:  '9999px',
      },
      boxShadow: {
        'card':       '0 1px 3px rgba(0,0,0,0.07), 0 1px 2px rgba(0,0,0,0.04)',
        'card-hover': '0 6px 20px rgba(0,0,0,0.10), 0 2px 6px rgba(0,0,0,0.05)',
        'floating':   '0 4px 16px rgba(0,0,0,0.10), 0 2px 4px rgba(0,0,0,0.05)',
        'modal':      '0 24px 64px rgba(0,0,0,0.16), 0 8px 24px rgba(0,0,0,0.08)',
        'nav':        '0 1px 0 #E4E2DD',
      },
      transitionDuration: { DEFAULT: '200ms' },
      transitionTimingFunction: {
        DEFAULT:  'cubic-bezier(0.16, 1, 0.3, 1)',
        'in-out': 'cubic-bezier(0.65, 0, 0.35, 1)',
      },
      keyframes: {
        'fade-in':  {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        'pulse-ring': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(201,168,76,0.4)' },
          '50%':      { boxShadow: '0 0 0 8px rgba(201,168,76,0)' },
        },
      },
      animation: {
        'fade-in':    'fade-in 0.4s cubic-bezier(0.16, 1, 0.3, 1) both',
        'slide-up':   'slide-up 0.4s cubic-bezier(0.16, 1, 0.3, 1) both',
        'pulse-ring': 'pulse-ring 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}

export default config
