import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        nocturna: {
          dark: '#0a0e27',
          navy: '#1a1f3a',
          accent: '#4a90e2',
          light: '#e8f4f8',
        },
      },
    },
  },
  plugins: [],
};
export default config;
