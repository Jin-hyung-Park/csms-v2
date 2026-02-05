/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#ecf9ff',
          100: '#d9f0ff',
          200: '#b3e1ff',
          300: '#82ceff',
          400: '#4ab3ff',
          500: '#1f95ff',
          600: '#0c74db',
          700: '#095cb0',
          800: '#0d4c8c',
          900: '#103f70',
        },
      },
    },
  },
  plugins: [],
};

