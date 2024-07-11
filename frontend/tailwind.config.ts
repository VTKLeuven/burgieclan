
const config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      screens: {
        'xs': '320px',
      },
      colors: {
        vtk: {
          blue: {
            400: "#353761",
            500: "#212347",  // dark blue vtk logo
            600: "#1b1d40",
          }
        }
      }
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
};
export default config;