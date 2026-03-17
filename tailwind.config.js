/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: { 50: '#eff6ff', 100: '#dbeafe', 500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8', 900: '#1e3a8a' },
        sport: { orange: '#f97316', green: '#22c55e', red: '#ef4444' },
        dark: { 
          bg: '#0f172a',
          card: '#1e293b',
          border: '#334155'
        }
      }
    }
  },
  plugins: []
}
