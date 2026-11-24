/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'sans-serif']
      },
      colors: {
        brand: {
          orange: '#FF7A00',
          black: '#111111',
          surface: '#F6F6F6',
          sand: '#F2D5BB'
        }
      }
    }
  },
  plugins: []
};
