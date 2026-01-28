'use client'

/**
 * Organization Provider
 *
 * Provides organization context to the application.
 * Wraps the useOrganization hook for easier access via React Context.
 *
 * Features:
 * - Provides organization state through React Context
 * - Handles loading and error states with customizable UI
 * - Optionally requires organization selection before rendering children
 * - Provides organization switcher UI component
 *
 * @example
 * ```tsx
 * // In app/(dashboard)/layout.tsx
 * import { OrganizationProvider } from '@/components/providers/organization-provider'
 *
 * export default function DashboardLayout({ children }) {
 *   return (
 *     <OrganizationProvider>
 *       {children}
 *     </OrganizationProvider>
 *   )
 * }
 * ```
 *
 * @see useOrganization hook for detailed organization state management
 */

import React, { createContext, useContext, ReactNode } from 'react'
import {
  useOrganization,
  OrganizationState,
  OrganizationWithMembership,
} from '@/lib/hooks/use-organization'
import type { Organization, OrganizationRole, SubscriptionTier } from '@/types/database'

// =============================================================================
// CONTEXT
// =============================================================================

/**
 * Organization context value type
 */
type OrganizationContextValue = OrganizationState | null

/**
 * Organization context
 */
const OrganizationContext = createContext<OrganizationContextValue>(null)

// =============================================================================
// PROVIDER PROPS
// =============================================================================

interface OrganizationProviderProps {
  /** Child components to render */
  children: ReactNode
  /**
   * If true, requires an organization to be selected before rendering children.
   * Shows organization selector when no org is selected.
   * @default false
   */
  requireOrganization?: boolean
  /**
   * Custom loading component to show while fetching organization data.
   * If not provided, children are rendered while loading.
   */
  loadingComponent?: ReactNode
  /**
   * Custom error component to show when there's an error fetching organization data.
   * If not provided, a default error message is shown.
   */
  errorComponent?: ReactNode
  /**
   * Custom no organization component to show when user has no organizations.
   * Only shown when requireOrganization is true.
   * If not provided, a default message is shown.
   */
  noOrganizationComponent?: ReactNode
}

// =============================================================================
// DEFAULT COMPONENTS
// =============================================================================

/**
 * Default loading component
 */
function DefaultLoading() {
  return (
    <div className="flex min-h-[200px] items-center justify-center">
      <div className="flex flex-col items-center gap-2">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground">Organizasyon yükleniyor...</p>
      </div>
    </div>
  )
}

/**
 * Default error component
 */
function DefaultError({ error, onRetry }: { error: Error | null; onRetry: () => void }) {
  return (
    <div className="flex min-h-[200px] items-center justify-center">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="rounded-full bg-destructive/10 p-3">
          <svg
            className="h-6 w-6 text-destructive"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <div>
          <h3 className="text-lg font-semibold">Organizasyon yüklenemedi</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {error?.message ?? 'Bir hata oluştu. Lütfen tekrar deneyin.'}
          </p>
        </div>
        <button
          onClick={onRetry}
          className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Tekrar Dene
        </button>
      </div>
    </div>
  )
}

/**
 * Default no organization component
 */
function DefaultNoOrganization() {
  return (
    <div className="flex min-h-[200px] items-center justify-center">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="rounded-full bg-muted p-3">
          <svg
            className="h-6 w-6 text-muted-foreground"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
            />
          </svg>
        </div>
        <div>
          <h3 className="text-lg font-semibold">Organizasyon bulunamadı</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Henüz bir organizasyona dahil değilsiniz. Yeni bir restoran oluşturun veya davet
            bekleyin.
          </p>
        </div>
        <a
          href="/onboarding/new-restaurant"
          className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Restoran Oluştur
        </a>
      </div>
    </div>
  )
}

// =============================================================================
// PROVIDER COMPONENT
// =============================================================================

/**
 * OrganizationProvider Component
 *
 * Provides organization context to child components.
 * Handles loading, error, and no-organization states.
 */
export function OrganizationProvider({
  children,
  requireOrganization = false,
  loadingComponent,
  errorComponent,
  noOrganizationComponent,
}: OrganizationProviderProps) {
  const organizationState = useOrganization()
  const { isLoading, isError, error, hasOrganizations, currentOrg, refetch } = organizationState

  // Show loading state if configured
  if (isLoading && loadingComponent) {
    return <>{loadingComponent}</>
  }

  // Show error state
  if (isError) {
    return (
      <OrganizationContext.Provider value={organizationState}>
        {errorComponent ?? <DefaultError error={error} onRetry={() => refetch()} />}
      </OrganizationContext.Provider>
    )
  }

  // Show no organization state if required
  if (requireOrganization && !hasOrganizations && !isLoading) {
    return (
      <OrganizationContext.Provider value={organizationState}>
        {noOrganizationComponent ?? <DefaultNoOrganization />}
      </OrganizationContext.Provider>
    )
  }

  // Render children with context
  return (
    <OrganizationContext.Provider value={organizationState}>
      {children}
    </OrganizationContext.Provider>
  )
}

// =============================================================================
// CONTEXT HOOK
// =============================================================================

/**
 * useOrganizationContext Hook
 *
 * Access organization context from anywhere in the component tree.
 * Must be used within OrganizationProvider.
 *
 * @throws Error if used outside of OrganizationProvider
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { currentOrg, switchOrganization } = useOrganizationContext()
 *
 *   return <div>{currentOrg?.name}</div>
 * }
 * ```
 */
export function useOrganizationContext(): OrganizationState {
  const context = useContext(OrganizationContext)

  if (context === null) {
    throw new Error(
      'useOrganizationContext must be used within an OrganizationProvider. ' +
        'Wrap your component tree with <OrganizationProvider>.'
    )
  }

  return context
}

// =============================================================================
// ORGANIZATION SWITCHER COMPONENT
// =============================================================================

interface OrganizationSwitcherProps {
  /** Additional CSS classes */
  className?: string
  /** Show organization logo */
  showLogo?: boolean
  /** Compact mode (icon only) */
  compact?: boolean
}

/**
 * OrganizationSwitcher Component
 *
 * Dropdown component for switching between organizations.
 * Uses Zustand UI store for popover state management.
 *
 * @example
 * ```tsx
 * <OrganizationSwitcher className="w-full" showLogo />
 * ```
 */
export function OrganizationSwitcher({
  className = '',
  showLogo = true,
  compact = false,
}: OrganizationSwitcherProps) {
  const { organizations, currentOrg, switchOrganization, isLoading } = useOrganization()
  const [isOpen, setIsOpen] = React.useState(false)

  // Debug: Log organization state
  React.useEffect(() => {
    console.log('[OrganizationSwitcher] isLoading=' + isLoading + ', orgsCount=' + organizations.length + ', currentOrg=' + currentOrg?.name)
  }, [isLoading, organizations, currentOrg])

  // Show loading state
  if (isLoading) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        {!compact && <span className="text-sm text-muted-foreground">Yükleniyor...</span>}
      </div>
    )
  }

  // Don't render if no organizations
  if (organizations.length === 0) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        {!compact && <span className="text-sm text-muted-foreground">Organizasyon yok</span>}
      </div>
    )
  }

  // Single organization - just show the name
  if (organizations.length === 1) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        {showLogo && currentOrg?.logo_url && (
          <img
            src={currentOrg.logo_url}
            alt={currentOrg.name}
            className="h-8 w-8 rounded-md object-cover"
          />
        )}
        {!compact && (
          <span className="font-medium truncate">{currentOrg?.name ?? 'Organizasyon'}</span>
        )}
      </div>
    )
  }

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading}
        className="flex w-full items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        {showLogo && currentOrg?.logo_url && (
          <img
            src={currentOrg.logo_url}
            alt={currentOrg.name}
            className="h-6 w-6 rounded-md object-cover"
          />
        )}
        {!compact && (
          <span className="flex-1 truncate text-left">
            {currentOrg?.name ?? 'Organizasyon Seç'}
          </span>
        )}
        <svg
          className={`h-4 w-4 text-muted-foreground transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />

          {/* Dropdown */}
          <div
            className="absolute left-0 top-full z-50 mt-1 w-full min-w-[200px] rounded-md border border-border bg-popover shadow-lg"
            role="listbox"
          >
            <div className="max-h-60 overflow-auto p-1">
              {organizations.map((org) => (
                <button
                  key={org.id}
                  type="button"
                  onClick={() => {
                    switchOrganization(org.id)
                    setIsOpen(false)
                  }}
                  className={`flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground ${
                    org.id === currentOrg?.id ? 'bg-accent text-accent-foreground' : ''
                  }`}
                  role="option"
                  aria-selected={org.id === currentOrg?.id}
                >
                  {showLogo && org.logo_url && (
                    <img
                      src={org.logo_url}
                      alt={org.name}
                      className="h-6 w-6 rounded-md object-cover"
                    />
                  )}
                  <span className="flex-1 truncate text-left">{org.name}</span>
                  {org.id === currentOrg?.id && (
                    <svg
                      className="h-4 w-4 text-primary"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  )}
                </button>
              ))}
            </div>

            {/* Add Organization Link */}
            <div className="border-t border-border p-1">
              <a
                href="/onboarding/new-restaurant"
                className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                <span>Yeni Restoran Ekle</span>
              </a>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// =============================================================================
// PERMISSION GATE COMPONENTS
// =============================================================================

interface RequireRoleProps {
  /** Minimum role required to render children */
  minRole: OrganizationRole
  /** Children to render if user has required role */
  children: ReactNode
  /** Fallback component to render if user doesn't have required role */
  fallback?: ReactNode
}

/**
 * RequireRole Component
 *
 * Conditionally renders children based on user's organization role.
 *
 * @example
 * ```tsx
 * <RequireRole minRole="manager" fallback={<AccessDenied />}>
 *   <MenuEditor />
 * </RequireRole>
 * ```
 */
export function RequireRole({ minRole, children, fallback = null }: RequireRoleProps) {
  const { hasRole, isLoading } = useOrganization()

  // Don't show anything while loading
  if (isLoading) {
    return null
  }

  // Check role permission
  if (!hasRole(minRole)) {
    return <>{fallback}</>
  }

  return <>{children}</>
}

interface RequireTierProps {
  /** Minimum subscription tier required */
  minTier: SubscriptionTier
  /** Children to render if organization has required tier */
  children: ReactNode
  /** Fallback component (e.g., upgrade prompt) */
  fallback?: ReactNode
}

/**
 * RequireTier Component
 *
 * Conditionally renders children based on organization's subscription tier.
 *
 * @example
 * ```tsx
 * <RequireTier minTier="gold" fallback={<UpgradePrompt feature="analytics" />}>
 *   <AnalyticsDashboard />
 * </RequireTier>
 * ```
 */
export function RequireTier({ minTier, children, fallback = null }: RequireTierProps) {
  const { hasTier, isLoading } = useOrganization()

  // Don't show anything while loading
  if (isLoading) {
    return null
  }

  // Check tier permission
  if (!hasTier(minTier)) {
    return <>{fallback}</>
  }

  return <>{children}</>
}

// =============================================================================
// EXPORTS
// =============================================================================

export { OrganizationContext }
export type { OrganizationProviderProps, OrganizationSwitcherProps, RequireRoleProps, RequireTierProps }
