import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
        // Brand purple color palette based on #724a9e
        brand: {
          50: '#f5f3f7',
          100: '#ebe7ef',
          200: '#d4cce0',
          300: '#b9a8cb',
          400: '#9a7bb3',
          500: '#724a9e', // Main brand color
          600: '#5f3d85',
          700: '#4d326c',
          800: '#3d2856',
          900: '#2e1f42',
        },
      },
    },
  },
  plugins: [],
};

export default config;
