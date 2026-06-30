// tailwind.config.ts
import containerQueries from '@tailwindcss/container-queries';
import typography from '@tailwindcss/typography';
import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
    // lib/page-builder.ts returns class strings (e.g. blk-custom-bg, bg-ink) that
    // are never written in JSX. Without scanning lib, those classes are purged and
    // the page-builder custom background silently stops applying.
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-sans-active, var(--font-inter))', 'system-ui', 'sans-serif'],
        display: ['var(--font-display-active, var(--font-archivo))', 'system-ui', 'sans-serif'],
        logo: ['var(--font-logo-active, var(--font-playfair))', 'Georgia', 'serif'],
        serif: ['var(--font-serif-active, var(--font-playfair))', 'Georgia', 'serif'],
        mono: ['var(--font-mono-active, var(--font-space-mono))', 'ui-monospace', 'monospace'],
      },
      keyframes: {
        fade: { from: { opacity: '0' }, to: { opacity: '1' } },
        blink: {
          '0%': { opacity: '0.2' },
          '20%': { opacity: '1' },
          '100%': { opacity: '0.2' },
        },
        marquee: {
          from: { transform: 'translateX(0)' },
          to: { transform: 'translateX(-50%)' },
        },
        'marquee-reverse': {
          from: { transform: 'translateX(-50%)' },
          to: { transform: 'translateX(0)' },
        },
        'dropdown-in': {
          from: { opacity: '0', transform: 'translateY(-6px) scale(0.98)' },
          to: { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'dropdown-item': {
          from: { opacity: '0', transform: 'translateX(-10px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        // New warm editorial animations
        'reveal-up': {
          from: { opacity: '0', transform: 'translateY(24px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'reveal-right': {
          from: { opacity: '0', transform: 'translateX(-16px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.94)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'float-gentle': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        'draw-line': {
          from: { width: '0%' },
          to: { width: '100%' },
        },
        'text-gradient-shift': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
      },
      animation: {
        fade: 'fade 100ms forwards',
        blink: 'blink 1.4s both infinite',
        marquee: 'marquee var(--marquee-duration, 45s) linear infinite',
        'marquee-reverse':
          'marquee-reverse var(--marquee-duration, 45s) linear infinite',
        carousel: 'marquee var(--marquee-duration, 60s) linear infinite',
        'dropdown-in': 'dropdown-in 200ms ease-out both',
        'dropdown-item': 'dropdown-item 300ms cubic-bezier(0.16, 1, 0.3, 1) both',
        // New warm editorial animations
        'reveal-up': 'reveal-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) both',
        'reveal-right': 'reveal-right 0.5s cubic-bezier(0.16, 1, 0.3, 1) both',
        'scale-in': 'scale-in 0.5s cubic-bezier(0.16, 1, 0.3, 1) both',
        shimmer: 'shimmer 2s linear infinite',
        'float-gentle': 'float-gentle 3s ease-in-out infinite',
        'draw-line': 'draw-line 0.7s cubic-bezier(0.16, 1, 0.3, 1) both',
      },
      colors: {
        paper: '#f5f5f5',
        // Lô Hobby neutral "paper" ramp — the storefront backbone. Body bg,
        // borders, and muted text all reference these directly.
        cream: {
          50: '#ffffff',
          100: '#fafafa',
          200: '#f5f5f5',
          300: '#ededed',
          400: '#e0e0e0',
          500: '#d4d4d4',
        },
        // Neutral greige replaced by a true monochrome scale: 50 = white,
        // 950 = near-black. Drives bg-warm-50/text-warm-900 baseline + lines.
        warm: {
          50: '#ffffff',
          100: '#f5f5f5',
          200: '#e5e5e5',
          300: '#d4d4d4',
          400: '#a3a3a3',
          500: '#737373',
          600: '#525252',
          700: '#404040',
          800: '#262626',
          900: '#111111',
          950: '#0b0b0b',
        },
        // Accent retuned to monochrome ink — focus rings, selection, and any
        // legacy terracotta-* class now render as neutral ink, not orange.
        terracotta: {
          50: '#fafafa',
          100: '#f5f5f5',
          200: '#e5e5e5',
          300: '#d4d4d4',
          400: '#737373',
          500: '#525252',
          600: '#404040',
          700: '#262626',
          800: '#1a1a1a',
          900: '#111111',
          950: '#000000',
        },
        // Monochrome primary scale — overridden at runtime via --brand-primary CSS vars
        filament: {
          50: '#fafafa',
          100: '#f5f5f5',
          200: '#e5e5e5',
          300: '#d4d4d4',
          400: '#a3a3a3',
          500: 'var(--brand-primary, #000000)',
          600: 'var(--brand-primary-hover, #171717)',
          700: '#262626',
          800: '#404040',
          900: '#525252',
        },
        // Accent scale — overridden via --brand-accent
        spool: {
          50: '#fafafa',
          100: '#f5f5f5',
          200: '#e5e5e5',
          300: '#d4d4d4',
          400: '#a3a3a3',
          500: 'var(--brand-secondary, var(--brand-accent, #737373))',
          600: '#525252',
          700: '#404040',
          800: '#262626',
          900: '#171717',
        },
        // Semantic color tokens (light/dark modes)
        surface: {
          DEFAULT: 'var(--surface)',
          raised: 'var(--surface-raised)',
        },
        ink: 'var(--ink)',
        line: 'var(--line)',
        accent: {
          DEFAULT: 'var(--accent)',
          2: 'var(--accent-2)',
          3: 'var(--accent-3)',
        },
      },
      // Custom border radius scales
      borderRadius: {
        xs: '0.25rem',
        sm: '0.375rem',
        md: '0.5rem',
        lg: '0.75rem',
        xl: '1rem',
        '2xl': '1.25rem',
        '3xl': '1.75rem',
        full: '9999px',
        // Lô Hobby mockup geometry — token-driven card + pill radii.
        card: 'var(--r, 14px)',
        'card-sm': 'var(--r-sm, 10px)',
        pill: 'var(--r-pill, 9999px)',
      },
      // Enhanced shadow system
      boxShadow: {
        'soft-sm': '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.03)',
        'soft-md': '0 4px 12px rgba(0,0,0,0.05), 0 1px 3px rgba(0,0,0,0.04)',
        'soft-lg': '0 12px 32px rgba(0,0,0,0.06), 0 2px 8px rgba(0,0,0,0.04)',
        'soft-xl': '0 24px 48px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.04)',
        'inner-soft': 'inset 0 2px 4px rgba(0,0,0,0.03)',
        'glow': '0 0 24px rgba(17, 17, 17, 0.12)',
        // Lô Hobby mockup elevation scale — token-driven so light/dark swap.
        'sh-1': 'var(--sh-1)',
        'sh-2': 'var(--sh-2)',
        'sh-3': 'var(--sh-3)',
      },
      // Extended spacing for editorial layouts
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
        '30': '7.5rem',
      },
      // Transition timing functions
      transitionTimingFunction: {
        'spring': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        'smooth': 'cubic-bezier(0.16, 1, 0.3, 1)',
        'snappy': 'cubic-bezier(0.2, 0, 0, 1)',
      },
    },
  },
  plugins: [containerQueries, typography],
};

export default config;