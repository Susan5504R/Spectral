/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['selector', '.light'],
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        sunset: {
          50:  '#FFF7ED',
          100: '#FFEDD5',
          200: '#FDE8D0',
          300: '#FDBA74',
          400: '#FF8E53',
          500: '#FF6B6B',
          600: '#E85D45',
          700: '#D97729',
          800: '#9A3412',
          900: '#7C2D12',
        },
        surface: {
          dark:    '#22223a',
          darker:  '#1a1a2e',
          raised:  '#2a2a45',
          border:  '#2f2f4a',
          light:   '#FFFFFF',
          cream:   '#FFF7ED',
          'light-raised': '#FFF9F0',
          'light-border': '#FDE8D0',
        },
        warm: {
          text:    '#F8F0E3',
          muted:   '#9B8EC4',
          'muted-light': '#7C6E8A',
          gold:    '#F59E0B',
        },
      },
      fontFamily: {
        jakarta: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        mono:    ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        'neo':       '6px 6px 14px #12122a, -6px -6px 14px #24243e',
        'neo-sm':    '3px 3px 8px #12122a, -3px -3px 8px #24243e',
        'neo-inset': 'inset 3px 3px 8px #12122a, inset -3px -3px 8px #24243e',
        'neo-light':       '6px 6px 14px #E8DFD3, -6px -6px 14px #FFFFFF',
        'neo-sm-light':    '3px 3px 8px #E8DFD3, -3px -3px 8px #FFFFFF',
        'neo-inset-light': 'inset 3px 3px 8px #E8DFD3, inset -3px -3px 8px #FFFFFF',
        'glow-coral':  '0 0 24px -4px rgba(255, 107, 107, 0.4)',
        'glow-orange': '0 0 24px -4px rgba(255, 142, 83, 0.4)',
        'glow-gold':   '0 0 24px -4px rgba(245, 158, 11, 0.4)',
      },
      keyframes: {
        'warm-pulse': {
          '0%, 100%': { opacity: '0.4' },
          '50%':      { opacity: '0.8' },
        },
        'warm-spin': {
          '0%':   { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
      },
      animation: {
        'warm-pulse': 'warm-pulse 3s infinite ease-in-out',
        'warm-spin':  'warm-spin 1s linear infinite',
      },
    },
  },
  plugins: [],
};