/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        background: '#FAFAF7',
        surface: {
          DEFAULT: '#FFFFFF',
          subtle: '#F6F6F2',
          muted: '#F0EFEA',
        },
        slate: {
          950: '#141A24',
          900: '#1E2638',
          850: '#263044', // primary text
          700: '#475569',
          600: '#64748B', // secondary text
          400: '#94A3B8',
          300: '#CBD5E1',
          200: '#E2E8F0',
          100: '#F1F5F9',
        },
        accent: {
          DEFAULT: '#7667C8', // muted violet
          hover: '#6756B8',
          subtle: '#EAE5FF', // soft lavender gradient
          muted: '#F3F0FF',
        },
        gradient: {
          lavender: '#EAE5FF',
          blue: '#E3EEFF',
        },
        mint: {
          DEFAULT: '#DDF4E7',
          text: '#1E6B43',
          border: '#BFE7D0',
        },
        amber: {
          light: '#FEF3C7',
          text: '#92400E',
          border: '#FDE68A',
        },
        rose: {
          light: '#FEE2E2',
          text: '#991B1B',
          border: '#FECACA',
        },
      },
      boxShadow: {
        subtle: '0 1px 2px 0 rgba(16, 24, 40, 0.04)',
        card: '0 1px 3px 0 rgba(16, 24, 40, 0.05), 0 1px 2px -1px rgba(16, 24, 40, 0.05)',
        'card-hover': '0 10px 25px -3px rgba(16, 24, 40, 0.06), 0 4px 6px -4px rgba(16, 24, 40, 0.04)',
        glow: '0 0 50px -10px rgba(118, 103, 200, 0.15)',
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
    },
  },
  plugins: [],
};
