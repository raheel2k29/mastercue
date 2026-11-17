/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        cue: {
          dark: '#0f172a',
          surface: '#1e293b',
          border: '#334155',
          gold: '#eab308',
          accent: '#06b6d4',
          wood: '#78350f',
        }
      }
    },
  },
  plugins: [],
};
