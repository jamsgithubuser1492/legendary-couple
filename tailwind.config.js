/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: { display: ['"Baloo 2"', 'ui-rounded', 'system-ui', 'sans-serif'] },
      colors: {
        cream: '#fff8ef',
        blush: '#ffd9e2',
        peach: '#ffe0cc',
        sage: '#cfe8c4',
        sky: '#bfe6f2',
        cocoa: '#6b4f4f',
      },
    },
  },
  plugins: [],
};
