/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Dark Mode Colors
        'dark-primary': '#E0E0E0', // Off-white
        'dark-secondary': '#888888', // Muted steel gray
        'dark-background': '#0A0A0A', // Very dark gray
        'dark-surface': '#000000', // Pure black
        'dark-alert': '#B33A3A', // Desaturated red
        'dark-success': '#4E6E50', // Desaturated green
        'dark-highlight': '#6E7F8D', // Pale muted cyan
        
        // Light Mode Colors
        'light-primary': '#111111', // Dark charcoal
        'light-secondary': '#666666', // Medium gray
        'light-background': '#F2F2F2', // Pale gray
        'light-surface': '#FFFFFF', // Pure white
        'light-alert': '#B33A3A', // Same desaturated red
        'light-success': '#4E6E50', // Same desaturated green
        'light-highlight': '#7B8A91', // Pale cyan
        
        // Theme-aware colors (will be overridden by CSS variables)
        'primary': 'var(--color-primary)',
        'secondary': 'var(--color-secondary)',
        'background': 'var(--color-background)',
        'surface': 'var(--color-surface)',
        'alert': 'var(--color-alert)',
        'success': 'var(--color-success)',
        'highlight': 'var(--color-highlight)',
      },
      fontFamily: {
        'sans': ['Inter', 'system-ui', 'sans-serif'],
        'mono': ['"IBM Plex Mono"', 'monospace'],
      },
      animation: {
        'glitch': 'glitch 0.3s linear infinite',
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'typewriter': 'typewriter 2s steps(40, end)',
      },
      keyframes: {
        glitch: {
          '0%, 100%': { transform: 'translate(0, 0)' },
          '25%': { transform: 'translate(-2px, 2px)' },
          '50%': { transform: 'translate(2px, -2px)' },
          '75%': { transform: 'translate(-2px, -2px)' },
        },
        fadeIn: {
          '0%': { opacity: 0 },
          '100%': { opacity: 1 },
        },
        typewriter: {
          '0%': { width: '0' },
          '100%': { width: '100%' },
        },
      },
    },
  },
  plugins: [],
};
