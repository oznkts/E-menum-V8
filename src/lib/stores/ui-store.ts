import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

/**
 * Toast notification type
 */
export interface Toast {
  id: string
  title: string
  description?: string
  variant?: 'default' | 'success' | 'warning' | 'destructive'
  duration?: number
}

/**
 * Sidebar state for dashboard navigation
 */
export interface SidebarState {
  isOpen: boolean
  isCollapsed: boolean
}

/**
 * Theme preferences
 */
export type Theme = 'light' | 'dark' | 'system'

/**
 * Modal/dialog state
 */
export interface ModalState {
  isOpen: boolean
  type: string | null
  data: Record<string, unknown> | null
}

/**
 * UI Store State Interface
 */
interface UIState {
  // Theme
  theme: Theme
  setTheme: (theme: Theme) => void

  // Sidebar
  sidebar: SidebarState
  toggleSidebar: () => void
  setSidebarOpen: (isOpen: boolean) => void
  setSidebarCollapsed: (isCollapsed: boolean) => void

  // Mobile menu
  isMobileMenuOpen: boolean
  setMobileMenuOpen: (isOpen: boolean) => void
  toggleMobileMenu: () => void

  // Modal/Dialog
  modal: ModalState
  openModal: (type: string, data?: Record<string, unknown>) => void
  closeModal: () => void

  // Loading states
  isLoading: boolean
  loadingMessage: string | null
  setLoading: (isLoading: boolean, message?: string | null) => void

  // Toast notifications (for imperative use)
  toasts: Toast[]
  addToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void
  clearToasts: () => void

  // Active organization context (for multi-tenant)
  activeOrgId: string | null
  setActiveOrgId: (orgId: string | null) => void

  // Command palette / search
  isCommandPaletteOpen: boolean
  setCommandPaletteOpen: (isOpen: boolean) => void
  toggleCommandPalette: () => void
}

/**
 * Generate unique ID for toasts
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

/**
 * UI Store
 *
 * Central store for UI state management including:
 * - Theme preferences (persisted to localStorage)
 * - Sidebar state (persisted to localStorage)
 * - Mobile menu state
 * - Modal/dialog state
 * - Loading states
 * - Toast notifications
 * - Active organization context
 *
 * @example
 * ```tsx
 * import { useUIStore } from '@/lib/stores/ui-store'
 *
 * function Component() {
 *   const { theme, setTheme, toggleSidebar } = useUIStore()
 *
 *   return (
 *     <button onClick={() => setTheme('dark')}>
 *       Current theme: {theme}
 *     </button>
 *   )
 * }
 * ```
 */
export const useUIStore = create<UIState>()(
  devtools(
    persist(
      (set) => ({
        // Theme - default to system
        theme: 'system',
        setTheme: (theme) => set({ theme }, false, 'setTheme'),

        // Sidebar
        sidebar: {
          isOpen: true,
          isCollapsed: false,
        },
        toggleSidebar: () =>
          set(
            (state) => ({
              sidebar: { ...state.sidebar, isOpen: !state.sidebar.isOpen },
            }),
            false,
            'toggleSidebar'
          ),
        setSidebarOpen: (isOpen) =>
          set(
            (state) => ({
              sidebar: { ...state.sidebar, isOpen },
            }),
            false,
            'setSidebarOpen'
          ),
        setSidebarCollapsed: (isCollapsed) =>
          set(
            (state) => ({
              sidebar: { ...state.sidebar, isCollapsed },
            }),
            false,
            'setSidebarCollapsed'
          ),

        // Mobile menu
        isMobileMenuOpen: false,
        setMobileMenuOpen: (isOpen) =>
          set({ isMobileMenuOpen: isOpen }, false, 'setMobileMenuOpen'),
        toggleMobileMenu: () =>
          set(
            (state) => ({ isMobileMenuOpen: !state.isMobileMenuOpen }),
            false,
            'toggleMobileMenu'
          ),

        // Modal/Dialog
        modal: {
          isOpen: false,
          type: null,
          data: null,
        },
        openModal: (type, data = {}) =>
          set(
            { modal: { isOpen: true, type, data } },
            false,
            'openModal'
          ),
        closeModal: () =>
          set(
            { modal: { isOpen: false, type: null, data: null } },
            false,
            'closeModal'
          ),

        // Loading states
        isLoading: false,
        loadingMessage: null,
        setLoading: (isLoading, message = null) =>
          set({ isLoading, loadingMessage: message }, false, 'setLoading'),

        // Toast notifications
        toasts: [],
        addToast: (toast) =>
          set(
            (state) => ({
              toasts: [...state.toasts, { ...toast, id: generateId() }],
            }),
            false,
            'addToast'
          ),
        removeToast: (id) =>
          set(
            (state) => ({
              toasts: state.toasts.filter((t) => t.id !== id),
            }),
            false,
            'removeToast'
          ),
        clearToasts: () => set({ toasts: [] }, false, 'clearToasts'),

        // Active organization
        activeOrgId: null,
        setActiveOrgId: (orgId) =>
          set({ activeOrgId: orgId }, false, 'setActiveOrgId'),

        // Command palette
        isCommandPaletteOpen: false,
        setCommandPaletteOpen: (isOpen) =>
          set({ isCommandPaletteOpen: isOpen }, false, 'setCommandPaletteOpen'),
        toggleCommandPalette: () =>
          set(
            (state) => ({ isCommandPaletteOpen: !state.isCommandPaletteOpen }),
            false,
            'toggleCommandPalette'
          ),
      }),
      {
        name: 'e-menum-ui-store',
        // Only persist theme and sidebar preferences
        partialize: (state) => ({
          theme: state.theme,
          sidebar: state.sidebar,
          activeOrgId: state.activeOrgId,
        }),
        onRehydrateStorage: () => (state) => {
          // Store has been rehydrated from localStorage
          if (state?.activeOrgId) {
            console.log('[UIStore] Rehydrated activeOrgId:', state.activeOrgId)
          }
        },
      }
    ),
    { name: 'UIStore' }
  )
)

/**
 * Selector hooks for optimized re-renders
 */
export const useTheme = () => useUIStore((state) => state.theme)
export const useSidebar = () => useUIStore((state) => state.sidebar)
export const useModal = () => useUIStore((state) => state.modal)
export const useToasts = () => useUIStore((state) => state.toasts)
export const useActiveOrgId = () => useUIStore((state) => state.activeOrgId)
