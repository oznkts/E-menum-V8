'use client'

/**
 * Theme Provider Component
 *
 * Manages theme state (light/dark/system) and syncs it with the DOM.
 * Uses Zustand UI store for persistence and provides theme context.
 *
 * Features:
 * - Syncs theme preference with document.documentElement
 * - Listens to system preference changes when theme is 'system'
 * - Persists preference to localStorage for FOUC prevention
 * - Provides useTheme hook for easy access
 *
 * @see THEME-ACCESSIBILITY-TALIMATNAME.md for design guidelines
 *
 * @example
 * ```tsx
 * // In app/layout.tsx
 * import { ThemeProvider } from '@/components/providers/theme-provider'
 *
 * export default function RootLayout({ children }) {
 *   return (
 *     <html>
 *       <body>
 *         <ThemeProvider>{children}</ThemeProvider>
 *       </body>
 *     </html>
 *   )
 * }
 * ```
 */

import { useEffect, useCallback, createContext, useContext, useMemo } from 'react'
import { useUIStore, Theme } from '@/lib/stores/ui-store'

// =============================================================================
// TYPES
// =============================================================================

interface ThemeContextValue {
  /** Current theme setting ('light' | 'dark' | 'system') */
  theme: Theme
  /** Resolved theme based on system preference if theme is 'system' */
  resolvedTheme: 'light' | 'dark'
  /** Set theme preference */
  setTheme: (theme: Theme) => void
  /** Toggle between light and dark mode */
  toggleTheme: () => void
  /** Check if dark mode is currently active */
  isDark: boolean
}

interface ThemeProviderProps {
  /** Child components to render */
  children: React.ReactNode
  /** Default theme if none is stored (defaults to 'system') */
  defaultTheme?: Theme
  /** Enable system theme detection (defaults to true) */
  enableSystem?: boolean
  /** Attribute to apply to document element (defaults to 'data-theme') */
  attribute?: 'class' | 'data-theme'
}

// =============================================================================
// CONTEXT
// =============================================================================

const ThemeContext = createContext<ThemeContextValue | null>(null)

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get the system's color scheme preference
 */
function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') {
    return 'light'
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

/**
 * Apply theme to the document element
 */
function applyTheme(theme: 'light' | 'dark'): void {
  if (typeof document === 'undefined') return

  const root = document.documentElement

  // Apply data-theme attribute
  root.dataset.theme = theme

  // Apply/remove dark class for Tailwind
  if (theme === 'dark') {
    root.classList.add('dark')
  } else {
    root.classList.remove('dark')
  }
}

/**
 * Update accessibility-settings in localStorage for FOUC prevention
 * This syncs with the AccessibilityScript in layout.tsx
 */
function syncAccessibilityStorage(theme: Theme): void {
  if (typeof localStorage === 'undefined') return

  try {
    const stored = localStorage.getItem('accessibility-settings')
    let settings: Record<string, unknown> = {}

    if (stored) {
      const parsed = JSON.parse(stored)
      settings = parsed.state?.settings ?? parsed ?? {}
    }

    // Update theme in accessibility settings
    settings.theme = theme

    // Store in the format expected by AccessibilityScript
    localStorage.setItem(
      'accessibility-settings',
      JSON.stringify({ state: { settings } })
    )
  } catch {
    // Ignore localStorage errors
  }
}

// =============================================================================
// PROVIDER COMPONENT
// =============================================================================

/**
 * ThemeProvider Component
 *
 * Provides theme context and manages theme state synchronization.
 * Must be wrapped around components that need theme access.
 */
export function ThemeProvider({
  children,
  defaultTheme = 'system',
  enableSystem = true,
  attribute = 'data-theme',
}: ThemeProviderProps) {
  const { theme, setTheme } = useUIStore()

  // Resolve the actual theme to apply
  const resolvedTheme = useMemo<'light' | 'dark'>(() => {
    if (theme === 'system' && enableSystem) {
      return getSystemTheme()
    }
    return theme === 'dark' ? 'dark' : 'light'
  }, [theme, enableSystem])

  // Check if dark mode is active
  const isDark = resolvedTheme === 'dark'

  // Apply theme to document when resolved theme changes
  useEffect(() => {
    applyTheme(resolvedTheme)
  }, [resolvedTheme])

  // Sync theme to accessibility storage for FOUC prevention
  useEffect(() => {
    syncAccessibilityStorage(theme)
  }, [theme])

  // Listen to system preference changes
  useEffect(() => {
    if (!enableSystem || theme !== 'system') return
    if (typeof window === 'undefined') return

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

    const handleChange = (event: MediaQueryListEvent) => {
      applyTheme(event.matches ? 'dark' : 'light')
    }

    // Add listener for system preference changes
    mediaQuery.addEventListener('change', handleChange)

    return () => {
      mediaQuery.removeEventListener('change', handleChange)
    }
  }, [enableSystem, theme])

  // Toggle between light and dark mode
  const toggleTheme = useCallback(() => {
    if (theme === 'system') {
      // If system, switch to the opposite of current resolved theme
      setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')
    } else if (theme === 'light') {
      setTheme('dark')
    } else {
      setTheme('light')
    }
  }, [theme, resolvedTheme, setTheme])

  // Context value with memoization
  const contextValue = useMemo<ThemeContextValue>(
    () => ({
      theme,
      resolvedTheme,
      setTheme,
      toggleTheme,
      isDark,
    }),
    [theme, resolvedTheme, setTheme, toggleTheme, isDark]
  )

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  )
}

// =============================================================================
// HOOKS
// =============================================================================

/**
 * useThemeContext Hook
 *
 * Access theme context from anywhere in the component tree.
 * Must be used within ThemeProvider.
 *
 * @throws Error if used outside of ThemeProvider
 *
 * @example
 * ```tsx
 * function ThemeToggle() {
 *   const { theme, toggleTheme, isDark } = useThemeContext()
 *
 *   return (
 *     <button onClick={toggleTheme}>
 *       {isDark ? 'Switch to Light' : 'Switch to Dark'}
 *     </button>
 *   )
 * }
 * ```
 */
export function useThemeContext(): ThemeContextValue {
  const context = useContext(ThemeContext)

  if (context === null) {
    throw new Error(
      'useThemeContext must be used within a ThemeProvider. ' +
        'Wrap your component tree with <ThemeProvider>.'
    )
  }

  return context
}

// =============================================================================
// CONVENIENCE EXPORTS
// =============================================================================

/**
 * Alias for useThemeContext for brevity
 */
export const useTheme = useThemeContext

export { ThemeContext }
export type { ThemeContextValue, ThemeProviderProps }
