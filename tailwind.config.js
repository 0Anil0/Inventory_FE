/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        darkBg: '#0b0f19',
        cardBg: 'rgba(18, 24, 38, 0.85)',
        brandIndigo: '#6366f1',
      },
    },
  },
  plugins: [],
  corePlugins: {
    preflight: false, // Disables Tailwind preflight to avoid resetting Antd default styles
  },
};
