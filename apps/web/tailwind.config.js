/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Espresso & Obsidian macOS Pro Design System
        macos: {
          bg: '#0B0A09',
          sidebar: 'rgba(22, 19, 17, 0.82)',
          card: 'rgba(30, 26, 23, 0.65)',
          border: 'rgba(255, 255, 255, 0.08)',
          bone: '#F5F0E6',
          muted: '#A3998E',
          amber: '#E5A93C',
          green: '#34C759',
          red: '#FF453A',
          hover: 'rgba(255, 255, 255, 0.04)',
          active: 'rgba(229, 169, 60, 0.12)',
        },
        obsidian: {
          950: '#070605',
          900: '#0B0A09',
          850: '#110F0D',
          800: '#161311',
          750: '#1A1714',
          700: '#1E1A17',
          600: '#2A2420',
          500: '#3D352F',
          400: '#5C5147',
        },
        amber: {
          highlight: '#F3BE58',
          gold: '#E5A93C',
          brass: '#C88D25',
          glow: 'rgba(229, 169, 60, 0.25)',
        },
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"SF Pro Text"',
          '"SF Pro Display"',
          'Inter',
          'system-ui',
          'sans-serif',
        ],
        mono: [
          '"SF Mono"',
          '"JetBrains Mono"',
          'Menlo',
          'Monaco',
          'Consolas',
          'monospace',
        ],
      },
      boxShadow: {
        'macos-window': '0 25px 60px -15px rgba(0, 0, 0, 0.85), 0 0 0 1px rgba(255, 255, 255, 0.08)',
        'macos-card': '0 4px 16px -2px rgba(0, 0, 0, 0.5), inset 0 1px 0 0 rgba(255, 255, 255, 0.06)',
        'amber-glow': '0 0 16px -2px rgba(229, 169, 60, 0.35)',
      },
    },
  },
  plugins: [],
};
