/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class', // Add this line - this is what was missing!
  theme: {
    extend: {},
  },
  plugins: [],
};