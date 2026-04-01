/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#0f0f23',
        card: '#1a1a2e',
        accent: '#e94560',
        'text-primary': '#eaeaea',
        'text-secondary': '#a0a0a0',
        'border-color': '#2a2a4e',
      }
    },
  },
  plugins: [],
}
