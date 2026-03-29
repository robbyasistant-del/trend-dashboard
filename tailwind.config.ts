import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        dark: {
          900: '#0a0a1a',
          800: '#0f0f2e',
          700: '#161638',
          600: '#1e1e48',
          500: '#2a2a5a',
        },
        neon: {
          cyan: '#22d3ee',
          magenta: '#ec4899',
          green: '#10b981',
          amber: '#f59e0b',
          purple: '#a855f7',
          red: '#ef4444',
        },
      },
    },
  },
  plugins: [],
};

export default config;
