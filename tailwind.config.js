// tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        neu: {
          bg:      '#111113',
          surface: '#1a1a1f',
          surface2:'#222228',
          surface3:'#2a2a32',
          dark:    '#0a0a0c',
          light:   '#262630',
          accent:  '#ff6b00',
          accent2: '#ff9a3c',
          gold:    '#f5c542',
          text:    '#e8e8f0',
          dim:     '#888899',
          muted:   '#555566',
          blue:    '#4f8ef7',
          purple:  '#9b6dff',
          green:   '#3ecf8e',
          pink:    '#ff4d8b',
          red:     '#ff4f4f',
        },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
