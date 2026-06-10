/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          950: '#070a13',
          900: '#0b1120',
          800: '#1e293b',
          700: '#334155',
          600: '#475569',
        },
        brand: {
          purple: '#a855f7',
          indigo: '#6366f1',
          cyan: '#22d3ee',
          pink: '#ec4899',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
        'glass-glow': '0 8px 32px 0 rgba(99, 102, 241, 0.15)',
      }
    },
  },
  plugins: [],
}
