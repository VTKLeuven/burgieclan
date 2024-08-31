
const config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
          roboto: ['Roboto', 'sans-serif'],
      },
      fontSize: {
        'xs': '10px',
        'base': '14px',
        'lg': '16px',
        'xl': '18px',
      },
      borderRadius: {
        'notificationBorder': '0.5rem',
      },
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
        },
        wireframe: {
          midGrey: "#959EAC",
          darkestGrey: "#4A5A71",
        }
      }
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
};
export default config;