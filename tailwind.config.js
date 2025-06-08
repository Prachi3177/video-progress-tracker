

// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        // Adding 'Inter' to be easily used with Tailwind
        inter: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
