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
          bg:          '#04040f',
          bg2:         '#080820',
          surface:     '#0f0f28',
          surface2:    '#16163a',
          border:      'rgba(108,80,255,0.16)',
          borderBright:'rgba(108,80,255,0.42)',
          violet:      '#6c50ff',
          violetSoft:  '#a78bfa',
          cyan:        '#00e5ff',
          pink:        '#ff4ecd',
          amber:       '#ffb800',
          green:       '#00ff87',
          red:         '#ff4f4f',
          text:        '#eeeaff',
          textSecondary:'#9b96c0',
          textMuted:   '#5a5678',
        },
      },
      fontFamily: { sans: ['Inter', 'sans-serif'] },
    },
  },
  plugins: [],
}
