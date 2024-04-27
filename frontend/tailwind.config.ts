/** @type {import('tailwindcss').Config} */
const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#0f766e", // Tailwind CSS teal-700
          light: "#0d9488" // Tailwind CSS teal-600
        },
        gray: {
            DEFAULT: "#f3f4f6", // Tailwind CSS gray-100
        }
      }
    },
  },
  plugins: [],
};
export default config;