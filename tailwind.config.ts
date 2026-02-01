import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Condition colors
        condition: {
          clear: '#22c55e',    // green-500
          wet: '#3b82f6',      // blue-500
          slush: '#f59e0b',    // amber-500
          snow: '#f97316',     // orange-500
          ice: '#ef4444',      // red-500
          whiteout: '#7c3aed', // violet-500
        },
        // Passability colors
        pass: {
          ok: '#22c55e',
          slow: '#f59e0b',
          avoid: '#ef4444',
        },
        // Brand colors
        brand: {
          primary: '#1e40af',   // blue-800
          secondary: '#60a5fa', // blue-400
          accent: '#f59e0b',    // amber-500
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        display: ['var(--font-outfit)', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
