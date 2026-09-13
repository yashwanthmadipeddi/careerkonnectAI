/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class', // Enable class-based dark mode
  theme: {
    extend: {
      colors: {
        // Sleek modern SaaS colors (curated slate/indigo/violet theme)
        brand: {
          50: '#f5f7ff',
          100: '#ebf0ff',
          200: '#d6e0ff',
          300: '#adc2ff',
          400: '#7599ff',
          500: '#3b66ff', // CareerKonnect primary blue
          600: '#2544eb',
          700: '#1d32d4',
          800: '#1c2aa8',
          900: '#1c2885',
          950: '#111752',
        },
        darkbg: {
          50: '#1e293b',
          100: '#0f172a', // Main dashboard bg
          200: '#020617', // Sidebar / Darker bg
          300: '#1e293b', // Card bg in dark mode
        }
      },
      fontFamily: {
        sans: ['Outfit', 'Inter', 'sans-serif'],
      },
      boxShadow: {
        'glass-light': '0 8px 32px 0 rgba(31, 38, 135, 0.08)',
        'glass-dark': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
      },
      backdropBlur: {
        xs: '2px',
      }
    },
  },
  plugins: [],
}
