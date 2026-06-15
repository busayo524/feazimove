/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: ['attribute', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        // FeaziMove brand — exact logo colors
        feazi: {
          lime:   '#C4FF00',   // Primary — lime/neon green from logo
          dark:   '#0F0F0F',   // Near-black background
          darker: '#080808',
          light:  '#F5F5F0',   // Off-white for light mode
          card:   '#1A1A1A',   // Dark card background
          green:  '#0D7A3E',   // Secondary deep green
          accent: '#FFB800',   // Gold accent
          muted:  '#888888',
        },
      },
      fontFamily: {
        sans:    ['Inter', 'system-ui', 'sans-serif'],
        display: ['Poppins', 'Inter', 'sans-serif'],
      },
      animation: {
        'float':       'float 6s ease-in-out infinite',
        'float-slow':  'float 9s ease-in-out infinite',
        'float-fast':  'float 4s ease-in-out infinite',
        'slide-up':    'slideUp 0.6s ease-out forwards',
        'fade-in':     'fadeIn 0.8s ease-out forwards',
        'walk':        'walk 2s linear infinite',
        'drive':       'drive 8s linear infinite',
        'bounce-slow': 'bounce 3s infinite',
        'spin-slow':   'spin 8s linear infinite',
        'pulse-lime':  'pulseLime 2s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':      { transform: 'translateY(-18px)' },
        },
        slideUp: {
          '0%':   { opacity: '0', transform: 'translateY(30px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        walk: {
          '0%':   { transform: 'translateX(-10px)' },
          '50%':  { transform: 'translateX(10px)' },
          '100%': { transform: 'translateX(-10px)' },
        },
        drive: {
          '0%':   { transform: 'translateX(-100px)' },
          '100%': { transform: 'translateX(100vw)' },
        },
        pulseLime: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(196,255,0,0.4)' },
          '50%':      { boxShadow: '0 0 0 20px rgba(196,255,0,0)' },
        },
      },
    },
  },
  plugins: [],
}
