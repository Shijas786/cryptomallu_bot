import type { Config } from 'tailwindcss';

export default {
  darkMode: ['class'],
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './pages/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#0B1221',
        foreground: '#E6EDF3',
        primary: {
          DEFAULT: '#4C8DF6',
          foreground: '#0B1221'
        },
        baseBlue: '#0052FF',
      },
      boxShadow: {
        glow: '0 0 30px rgba(76, 141, 246, 0.25)'
      }
    }
  },
  plugins: [],
} satisfies Config;
