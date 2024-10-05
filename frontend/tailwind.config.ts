const config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        roboto: ['Roboto', 'sans-serif'],
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
          lightest: {
            gray: "#F0F1F7",
          },
          mid:{
            gray: "#959EAC",
          },
          primary: {
            blue: "#1A1F4A",
            panache: "#FFD400",
          }
        }
      },
      typography: (theme) => ({
        DEFAULT: {
          css: {
            h1: { fontFamily: theme('fontFamily.roboto').join(', ') },
            h2: { fontFamily: theme('fontFamily.roboto').join(', ') },
            h3: { fontFamily: theme('fontFamily.roboto').join(', ') },
            h4: { fontFamily: theme('fontFamily.roboto').join(', ') },
            h5: { fontFamily: theme('fontFamily.roboto').join(', ') },
            h6: { fontFamily: theme('fontFamily.roboto').join(', ') },
            p: { fontFamily: theme('fontFamily.roboto').join(', ') },
          },
        },
      }),
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
  ],
};
export default config;