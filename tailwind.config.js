// tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        neu: {
          bg: '#111113', surface: '#1a1a1f', surface2: '#222228', surface3: '#2a2a32',
          dark: '#0a0a0c', light: '#262630', accent: '#ff6b00', accent2: '#ff9a3c',
          gold: '#f5c542', text: '#e8e8f0', dim: '#888899', muted: '#555566',
          blue: '#4f8ef7', purple: '#9b6dff', green: '#3ecf8e', pink: '#ff4d8b', red: '#ff4f4f',
        },
        chill: {
          bg:          '#050506',
          bg2:         '#0a0a10',
          surface:     '#0d0d16',
          surface2:    '#14141f',
          surface3:    '#1b1b28',
          border:      'rgba(124,102,255,0.14)',
          borderBright:'rgba(124,102,255,0.4)',
          violet:      '#6c50ff',
          violetSoft:  '#a78bfa',
          cyan:        '#00e5ff',
          pink:        '#ff4ecd',
          amber:       '#ffb800',
          green:       '#00ff87',
          red:         '#ff4f4f',
          text:        '#f2f0fb',
          textSecondary:'#9b96c0',
          textMuted:   '#5a5678',
        },
      },
      fontFamily: { sans: ['Inter', 'sans-serif'] },
    },
  },
  plugins: [],
}
