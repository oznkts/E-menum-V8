import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // Design Tokens - Brand Colors
      colors: {
        // Primary brand color (customizable per restaurant)
        primary: {
          50: 'hsl(var(--primary-50) / <alpha-value>)',
          100: 'hsl(var(--primary-100) / <alpha-value>)',
          200: 'hsl(var(--primary-200) / <alpha-value>)',
          300: 'hsl(var(--primary-300) / <alpha-value>)',
          400: 'hsl(var(--primary-400) / <alpha-value>)',
          500: 'hsl(var(--primary-500) / <alpha-value>)',
          600: 'hsl(var(--primary-600) / <alpha-value>)',
          700: 'hsl(var(--primary-700) / <alpha-value>)',
          800: 'hsl(var(--primary-800) / <alpha-value>)',
          900: 'hsl(var(--primary-900) / <alpha-value>)',
          950: 'hsl(var(--primary-950) / <alpha-value>)',
        },
        // Secondary accent color
        secondary: {
          50: 'hsl(var(--secondary-50) / <alpha-value>)',
          100: 'hsl(var(--secondary-100) / <alpha-value>)',
          200: 'hsl(var(--secondary-200) / <alpha-value>)',
          300: 'hsl(var(--secondary-300) / <alpha-value>)',
          400: 'hsl(var(--secondary-400) / <alpha-value>)',
          500: 'hsl(var(--secondary-500) / <alpha-value>)',
          600: 'hsl(var(--secondary-600) / <alpha-value>)',
          700: 'hsl(var(--secondary-700) / <alpha-value>)',
          800: 'hsl(var(--secondary-800) / <alpha-value>)',
          900: 'hsl(var(--secondary-900) / <alpha-value>)',
          950: 'hsl(var(--secondary-950) / <alpha-value>)',
        },
        // Semantic colors
        success: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
          950: '#052e16',
        },
        warning: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
          950: '#451a03',
        },
        error: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
          950: '#450a0a',
        },
        // Background colors (supports dark mode)
        background: 'hsl(var(--background) / <alpha-value>)',
        foreground: 'hsl(var(--foreground) / <alpha-value>)',
        // Card and surface colors
        card: {
          DEFAULT: 'hsl(var(--card) / <alpha-value>)',
          foreground: 'hsl(var(--card-foreground) / <alpha-value>)',
        },
        // Muted colors for secondary text
        muted: {
          DEFAULT: 'hsl(var(--muted) / <alpha-value>)',
          foreground: 'hsl(var(--muted-foreground) / <alpha-value>)',
        },
        // Popover colors (for Dialog, Dropdown, etc.)
        popover: {
          DEFAULT: 'hsl(var(--popover) / <alpha-value>)',
          foreground: 'hsl(var(--popover-foreground) / <alpha-value>)',
        },
        // Accent colors (for hover states)
        accent: {
          DEFAULT: 'hsl(var(--accent) / <alpha-value>)',
          foreground: 'hsl(var(--accent-foreground) / <alpha-value>)',
        },
        // Destructive colors (for delete buttons, error states)
        destructive: {
          DEFAULT: 'hsl(var(--destructive) / <alpha-value>)',
          foreground: 'hsl(var(--destructive-foreground) / <alpha-value>)',
        },
        // Border color
        border: 'hsl(var(--border) / <alpha-value>)',
        // Input fields
        input: 'hsl(var(--input) / <alpha-value>)',
        // Ring (focus)
        ring: 'hsl(var(--ring) / <alpha-value>)',
      },

      // Typography
      fontFamily: {
        sans: ['Roboto', 'system-ui', 'sans-serif'],
        mono: ['monospace'],
      },

      // Spacing for mobile-first touch targets (min 44x44px)
      spacing: {
        '11': '2.75rem', // 44px - minimum touch target
      },

      // Border radius
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },

      // Custom animations
      keyframes: {
        // Button highlight glow
        glow: {
          '0%, 100%': {
            boxShadow: '0 0 5px hsl(var(--primary-500) / 0.5)',
          },
          '50%': {
            boxShadow: '0 0 20px hsl(var(--primary-500) / 0.8), 0 0 30px hsl(var(--primary-500) / 0.6)',
          },
        },
        // Notification badge pulse
        'pulse-ring': {
          '0%': {
            transform: 'scale(0.95)',
            boxShadow: '0 0 0 0 hsl(var(--primary-500) / 0.7)',
          },
          '70%': {
            transform: 'scale(1)',
            boxShadow: '0 0 0 10px hsl(var(--primary-500) / 0)',
          },
          '100%': {
            transform: 'scale(0.95)',
            boxShadow: '0 0 0 0 hsl(var(--primary-500) / 0)',
          },
        },
        // Skeleton loading shimmer
        shimmer: {
          '0%': {
            backgroundPosition: '-200% 0',
          },
          '100%': {
            backgroundPosition: '200% 0',
          },
        },
        // Background gradient animation
        'gradient-shift': {
          '0%, 100%': {
            backgroundPosition: '0% 50%',
          },
          '50%': {
            backgroundPosition: '100% 50%',
          },
        },
        // Slide up animation for modals/sheets
        'slide-up': {
          '0%': {
            transform: 'translateY(100%)',
            opacity: '0',
          },
          '100%': {
            transform: 'translateY(0)',
            opacity: '1',
          },
        },
        // Slide down animation
        'slide-down': {
          '0%': {
            transform: 'translateY(-100%)',
            opacity: '0',
          },
          '100%': {
            transform: 'translateY(0)',
            opacity: '1',
          },
        },
        // Fade in animation
        'fade-in': {
          '0%': {
            opacity: '0',
          },
          '100%': {
            opacity: '1',
          },
        },
        // Scale in animation
        'scale-in': {
          '0%': {
            transform: 'scale(0.95)',
            opacity: '0',
          },
          '100%': {
            transform: 'scale(1)',
            opacity: '1',
          },
        },
      },
      animation: {
        glow: 'glow 2s ease-in-out infinite',
        'pulse-ring': 'pulse-ring 1.5s ease-in-out infinite',
        shimmer: 'shimmer 2s linear infinite',
        'gradient-shift': 'gradient-shift 3s ease infinite',
        'slide-up': 'slide-up 0.3s ease-out',
        'slide-down': 'slide-down 0.3s ease-out',
        'fade-in': 'fade-in 0.2s ease-out',
        'scale-in': 'scale-in 0.2s ease-out',
      },

      // Screens for mobile-first responsive design
      screens: {
        xs: '475px',
        // sm: 640px (default)
        // md: 768px (default)
        // lg: 1024px (default)
        // xl: 1280px (default)
        // 2xl: 1536px (default)
      },

      // Z-index scale
      zIndex: {
        'header': '100',
        'sidebar': '200',
        'modal': '300',
        'drawer': '400',
        'toast': '500',
        'tooltip': '600',
      },
    },
  },
  plugins: [],
}

export default config
