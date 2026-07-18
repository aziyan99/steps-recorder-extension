/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./sidebar/**/*.{html,js}', './pages/**/*.{html,js}'],
  theme: {
    extend: {
      fontFamily: {
        inter: ['"Inter"', 'sans-serif']
      }
    },
  },
  plugins: [],
};
