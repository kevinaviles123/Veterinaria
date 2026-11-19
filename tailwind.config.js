/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,ts}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#14110E',
          900: '#1C1814',
          700: '#3D342C',
          500: '#6B5E52',
          300: '#B7A99A',
          100: '#E8DFD3',
        },
        pine: {
          900: '#143028',
          700: '#1F4A3C',
          500: '#2F6B54',
          300: '#7DA992',
          100: '#D7E8DF',
        },
        clay: {
          700: '#9A3E16',
          500: '#C45C26',
          300: '#E29A6A',
          100: '#F7E1D2',
        },
        paper: {
          50: '#FBF7F0',
          100: '#F3EBE0',
          200: '#E6D9C8',
        },
      },
      fontFamily: {
        display: ['Fraunces', 'Georgia', 'serif'],
        sans: ['Outfit', 'Segoe UI', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 18px 50px -24px rgba(28, 24, 20, 0.35)',
        lift: '0 10px 30px -18px rgba(20, 48, 40, 0.35)',
      },
      backgroundImage: {
        grain:
          'radial-gradient(circle at 20% 20%, rgba(196,92,38,0.08), transparent 28%), radial-gradient(circle at 80% 0%, rgba(47,107,84,0.12), transparent 32%)',
      },
    },
  },
  plugins: [],
};
