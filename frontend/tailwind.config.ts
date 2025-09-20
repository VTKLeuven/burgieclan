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
					},
					yellow: {
						'400': '#fce400',
						'500': '#ffd400',
						'600': '#febc00'
					}
				},
				wireframe: {
					darkest: {
						gray: "#4A5A71",
					},
					lightest: {
						gray: "#F0F1F7",
					},
					mid: {
						gray: "#959EAC",
					},
					primary: {
						blue: "#1A1F4A",
						panache: "#FFD400",
					},
					content: "#1A1F4A",

				},
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
			},
		}
	},
	plugins: [
		require('@tailwindcss/forms'),
		require("tailwindcss-animate")
	],
};
export default config;