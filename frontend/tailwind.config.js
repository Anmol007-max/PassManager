import { m3ThemeExtend } from './tailwind.m3.extend.js';

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      ...m3ThemeExtend,
    },
  },
  plugins: [],
};
