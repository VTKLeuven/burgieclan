const config = {
    darkMode: ["class"],
    content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
  	extend: {
        fontFamily: {
            roboto: ['Roboto', 'sans-serif'],
        },
  		screens: {
  			xs: '320px'
  		},
  		colors: {
  			vtk: {
  				blue: {
  					'400': '#353761',
  					'500': '#212347',
  					'600': '#1b1d40'
  				}
  			}
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
        wireframe: {
            darkest: {
                gray: "#4A5A71",
            },
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
      require("tailwindcss-animate")
      require('@tailwindcss/forms'),
      require('@tailwindcss/typography'),
  ],
};
export default config;