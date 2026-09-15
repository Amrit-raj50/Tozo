/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        dusk: {
          base: '#1B2430',
          surface: '#232E3D',
          hover: '#2C394B',
          deep: '#141B24',
          border: 'rgba(242, 237, 228, 0.1)',
        },
        amber: {
          collar: '#E8A33D',
          hover: '#F0B254',
          subtle: 'rgba(232, 163, 61, 0.15)',
        },
        moss: {
          trail: '#7A9B76',
          subtle: 'rgba(122, 155, 118, 0.15)',
        },
        clay: {
          rust: '#C1633B',
          subtle: 'rgba(193, 99, 59, 0.15)',
        },
        cream: {
          text: '#F2EDE4',
          muted: '#A8ADB8',
          faint: '#787E8C',
        },
      },
      fontFamily: {
        sans: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        mono: ['"Fira Code"', 'Consolas', 'Monaco', 'monospace'],
      },
    },
  },
  plugins: [],
}
