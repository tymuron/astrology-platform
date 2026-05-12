/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                // Astrology palette (Holistic Vedic Astrology / Selbstentdeckung Academy).
                // Tailwind keys keep the "vastu-*" prefix so the rest of the codebase
                // doesn't need to be search-and-replaced; only the values are changed.
                vastu: {
                    dark: '#475D57',       // Deep teal-green (primary)
                    'dark-deep': '#36443F', // Deeper teal for hover/hero
                    accent: '#A9B5AF',     // Muted teal-grey for sidebar
                    gold: '#C5A97D',        // Warm gold-beige for accents
                    light: '#F7F2E9',      // Warm off-white background
                    cream: '#EFDECB',      // Cream surface for cards
                    sand: '#D9CDB6',       // Warm sand for borders
                    text: '#2A332F',       // Almost-black with green tint
                    'text-light': '#6B7872', // Muted teal-gray
                }
            },
            fontFamily: {
                serif: ['"Playfair Display"', 'Georgia', 'serif'],
                sans: ['"Inter"', 'system-ui', 'sans-serif'],
                body: ['"Source Sans 3"', 'sans-serif'],
                script: ['"Dancing Script"', 'cursive'],
            },
            backgroundImage: {
                'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
                'sidebar-gradient': 'linear-gradient(180deg, #A9B5AF 0%, #95A29C 100%)',
            },
            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0', transform: 'translateY(10px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                slideUp: {
                    '0%': { opacity: '0', transform: 'translateY(20px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                glow: {
                    '0%, 100%': { opacity: '0.6' },
                    '50%': { opacity: '1' },
                },
                celebrate: {
                    '0%': { transform: 'scale(1)' },
                    '50%': { transform: 'scale(1.05)' },
                    '100%': { transform: 'scale(1)' },
                },
            },
            animation: {
                'fade-in': 'fadeIn 0.5s ease-out forwards',
                'slide-up': 'slideUp 0.6s ease-out forwards',
                'glow': 'glow 2s ease-in-out infinite',
                'celebrate': 'celebrate 0.4s ease-out',
            }
        },
    },
    plugins: [],
}
