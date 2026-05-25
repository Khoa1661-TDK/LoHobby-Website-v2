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
      },
      keyframes: {
        fade: { from: { opacity: '0' }, to: { opacity: '1' } },
        marquee: {
          '0%': { transform: 'translateX(0%)' },
          '100%': { transform: 'translateX(-100%)' },
        },
        blink: {
          '0%': { opacity: '0.2' },
          '20%': { opacity: '1' },
          '100%': { opacity: '0.2' },
        },
      },
      animation: {
        fade: 'fade 100ms forwards',
        carousel: 'marquee 60s linear infinite',
        blink: 'blink 1.4s both infinite',
      },
      colors: {
        ink: '#1a1410',
        paper: '#fff8f0',
        // 3D-printing filament palette
        filament: {
          50: '#fff4ec',
          100: '#ffe2cc',
          200: '#ffbf8f',
          300: '#ff9b52',
          400: '#ff7d24',
          500: '#ff6b1a', // primary
          600: '#e35400',
          700: '#b84300',
          800: '#8a3200',
          900: '#5c2100',
        },
        spool: {
          50: '#effcfa',
          100: '#cff7f1',
          200: '#9fefe3',
          300: '#5ee0d0',
          400: '#26c8b8',
          500: '#0aa89a', // accent
          600: '#0a857b',
          700: '#0b6961',
          800: '#0d544d',
          900: '#0e433f',
        },
      },
    },
  },
  plugins: [containerQueries, typography],
};

export default config;
