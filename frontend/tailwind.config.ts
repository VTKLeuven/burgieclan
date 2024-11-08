const config = {
    darkMode: ["class"],
    content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
  	extend: {
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
  		}
  	}
  },
  plugins: [
    require('@tailwindcss/forms'),
      require("tailwindcss-animate")
],
};
export default config;