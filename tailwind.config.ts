// tailwind.config.ts
import containerQueries from '@tailwindcss/container-queries';
import typography from '@tailwindcss/typography';
import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-geist-sans)'],
        serif: ['var(--font-playfair)', 'Georgia', 'serif'],
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
      },
      animation: {
        fade: 'fade 100ms forwards',
        blink: 'blink 1.4s both infinite',
        marquee: 'marquee var(--marquee-duration, 45s) linear infinite',
        'marquee-reverse':
          'marquee-reverse var(--marquee-duration, 45s) linear infinite',
        carousel: 'marquee var(--marquee-duration, 60s) linear infinite',
      },
      colors: {
        ink: '#000000',
        paper: '#f5f5f5',
        // Monochrome primary scale (maps legacy filament-* classes to black/white brand)
        filament: {
          50: '#fafafa',
          100: '#f5f5f5',
          200: '#e5e5e5',
          300: '#d4d4d4',
          400: '#a3a3a3',
          500: '#000000',
          600: '#171717',
          700: '#262626',
          800: '#404040',
          900: '#525252',
        },
        // Neutral accent scale (maps legacy spool-* classes)
        spool: {
          50: '#fafafa',
          100: '#f5f5f5',
          200: '#e5e5e5',
          300: '#d4d4d4',
          400: '#a3a3a3',
          500: '#737373',
          600: '#525252',
          700: '#404040',
          800: '#262626',
          900: '#171717',
        },
      },
    },
  },
  plugins: [containerQueries, typography],
};

export default config;
