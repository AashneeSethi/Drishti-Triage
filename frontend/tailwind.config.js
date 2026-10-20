/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        forensic: {
          darkest: '#080c14',
          bg: '#0c111d',
          surface: '#131b2c',
          panel: '#182238',
          card: '#1e293b',
          border: '#26344d',
          borderSubtle: '#1b2537',
          textMuted: '#8b9bb4',
          textMain: '#e2e8f0',
          accent: '#0284c7',
          accentLight: '#38bdf8',
          accentGlow: 'rgba(56, 189, 248, 0.12)',
        },
        status: {
          verified: '#10b981',
          verifiedBg: 'rgba(16, 185, 129, 0.12)',
          verifiedBorder: 'rgba(16, 185, 129, 0.3)',
          inferred: '#f59e0b',
          inferredBg: 'rgba(245, 158, 11, 0.12)',
          inferredBorder: 'rgba(245, 158, 11, 0.3)',
          contradicted: '#ef4444',
          contradictedBg: 'rgba(239, 68, 68, 0.12)',
          contradictedBorder: 'rgba(239, 68, 68, 0.35)',
          notFound: '#94a3b8',
          notFoundBg: 'rgba(148, 163, 184, 0.12)',
          notFoundBorder: 'rgba(148, 163, 184, 0.3)',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
      }
    },
  },
  plugins: [],
}
