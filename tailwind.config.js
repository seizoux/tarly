/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./templates/**/*.{html,js,css,ts,jsx,tsx}", 
    "./node_modules/flowbite/**/*.js"
  ],
  theme: {
    extend: {
      colors: {
        'site-primary': '#161724',
        'file-dark': '#404652',
        'file-white': '#A7AAAF',
      }
    },
  },
  plugins: [
    require('flowbite/plugin'),
  ],
  variants: {
    extend: {
      opacity: ['group-hover'],
    },
  }
}
