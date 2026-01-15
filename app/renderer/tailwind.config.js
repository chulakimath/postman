/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  
  // Force dark mode (no toggle yet, dark by default)
  darkMode: 'class',
  
  theme: {
    extend: {
      // Custom color palette inspired by Postman
      colors: {
        // Surface colors for backgrounds
        surface: {
          1: '#1a1a1a',  // Darkest - main background
          2: '#252525',  // Sidebar, panels
          3: '#2d2d2d',  // Cards, elevated surfaces
          4: '#363636',  // Hover states
        },
        
        // Border colors
        border: {
          DEFAULT: '#3d3d3d',
          light: '#4a4a4a',
        },
        
        // Accent colors
        accent: {
          orange: '#ff6c37',     // Postman's signature orange
          'orange-hover': '#ff8250',
          green: '#22c55e',      // Success
          red: '#ef4444',        // Error
          blue: '#3b82f6',       // Info
          yellow: '#eab308',     // Warning
        },
        
        // HTTP Method colors
        method: {
          GET: '#22c55e',
          POST: '#eab308',
          PUT: '#3b82f6',
          PATCH: '#8b5cf6',
          DELETE: '#ef4444',
          HEAD: '#22c55e',
          OPTIONS: '#ec4899',
        },
        
        // Text colors
        text: {
          primary: '#ffffff',
          secondary: '#a1a1a1',
          muted: '#737373',
        },
      },
      
      // Typography
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      
      // Font sizes
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.875rem' }],
      },
      
      // Animations
      animation: {
        'fade-in': 'fadeIn 150ms ease-out',
        'slide-in': 'slideIn 150ms ease-out',
        'scale-in': 'scaleIn 150ms ease-out',
      },
      
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
      
      // Spacing
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      },
      
      // Box shadow
      boxShadow: {
        'glow': '0 0 20px rgba(255, 108, 55, 0.15)',
        'glow-lg': '0 0 40px rgba(255, 108, 55, 0.2)',
      },
    },
  },
  
  plugins: [],
}
