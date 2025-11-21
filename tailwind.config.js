/** @type {import('tailwindcss').Config} */
module.exports = {
  // Enable dark: classes to respond to Docusaurus' data-theme attribute
  darkMode: ['class', '[data-theme="dark"]'],
  content: [
    './src/**/*.{js,jsx,ts,tsx,md,mdx}',
    './docs/**/*.{md,mdx}',
    './static/**/*.html',
    './docusaurus.config.ts',
  ],
  theme: {
    extend: {},
  },
  // Avoid Tailwind's base reset to prevent overriding Infima defaults
  corePlugins: {
    preflight: false,
  },
  plugins: [],
}

