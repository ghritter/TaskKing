/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/renderer/**/*.{html,js,svelte}'],
  theme: {
    extend: {
      colors: {
        purple: {
          DEFAULT: '#6b21a8',
          light: '#9333ea',
          bg: 'rgba(107, 33, 168, 0.06)',
          border: 'rgba(107, 33, 168, 0.2)'
        },
        gold: {
          DEFAULT: '#b8860b',
          light: '#d4a017',
          bg: 'rgba(184, 134, 11, 0.08)',
          border: 'rgba(184, 134, 11, 0.3)'
        }
      }
    }
  },
  plugins: []
};
