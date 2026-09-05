export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // DealFlow360 dark enterprise palette (from mockup)
        df: {
          bg: '#1a1d23',        // Main background
          surface: '#22262e',   // Panel/card background
          border: '#2e333d',    // Subtle borders
          'border-light': '#3a4049', // Slightly visible borders
          nav: '#2563eb',       // Muted blue navigation/actions
          'nav-hover': '#1d4ed8',
          'nav-active': '#1e40af',
          text: '#e2e8f0',      // Primary text
          'text-muted': '#94a3b8', // Secondary text
          'text-dim': '#64748b',   // Tertiary text
          success: '#22c55e',
          'success-bg': '#14532d',
          warning: '#eab308',
          'warning-bg': '#422006',
          danger: '#ef4444',
          'danger-bg': '#450a0a',
          info: '#3b82f6',
          'info-bg': '#1e3a5f',
          notice: '#fbbf24',    // Yellow guidance strips
          'notice-bg': '#78350f',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
