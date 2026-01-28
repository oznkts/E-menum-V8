'use client'

/**
 * useOrganization Hook
 *
 * Client-side hook for managing organization context using TanStack Query.
 * Provides reactive organization state, membership management, and real-time updates.
 *
 * Features:
 * - TanStack Query for caching organization data (1 minute stale time)
 * - Real-time membership changes via Supabase Realtime
 * - Automatic query invalidation on organization events
 * - Type-safe organization and membership data
 * - Integration with Zustand UI store for activeOrgId
 *
 * @example
 * ```tsx
 * 'use client'
 * import { useOrganization, useCurrentOrg } from '@/lib/hooks/use-organization'
 *
 * function Dashboard() {
 *   const { organizations, currentOrg, isLoading, switchOrganization } = useOrganization()
 *
 *   if (isLoading) return <div>Yükleniyor...</div>
 *   if (!currentOrg) return <div>Organizasyon seçiniz</div>
 *
 *   return <div>Hoş geldiniz: {currentOrg.name}</div>
 * }
 * ```
 *
 * @see https://tanstack.com/query/latest/docs/react/guides/queries
 */

import { useEffect, useCallback, useMemo, useRef } from 'react'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useUIStore, useActiveOrgId } from '@/lib/stores/ui-store'
import { useAuth } from '@/lib/hooks/use-auth'
import type {
  Organization,
  Membership,
  OrganizationRole,
  SubscriptionTier,
  SubscriptionStatus,
} from '@/types/database'

// =============================================================================
// QUERY KEYS
// =============================================================================

/**
 * Organization query key factory
 * Follows TanStack Query key convention:
 * - ['organization'] → All organization-related queries
 * - ['organization', 'list', userId] → User's organizations list
 * - ['organization', 'current', orgId] → Single organization details
 * - ['organization', 'membership', orgId, userId] → User's membership in org
 */
export const organizationQueryKeys = {
  all: ['organization'] as const,
  list: (userId: string) => [...organizationQueryKeys.all, 'list', userId] as const,
  current: (orgId: string) => [...organizationQueryKeys.all, 'current', orgId] as const,
  membership: (orgId: string, userId: string) =>
    [...organizationQueryKeys.all, 'membership', orgId, userId] as const,
  members: (orgId: string) => [...organizationQueryKeys.all, 'members', orgId] as const,
}

// =============================================================================
// TYPES
// =============================================================================

/**
 * Organization with membership info
 */
export interface OrganizationWithMembership extends Organization {
  membership: Membership
}

/**
 * Organization state interface returned by useOrganization hook
 */
export interface OrganizationState {
  /** List of user's organizations with membership info */
  organizations: OrganizationWithMembership[]
  /** Currently active organization or null */
  currentOrg: Organization | null
  /** User's membership in current organization or null */
  currentMembership: Membership | null
  /** User's role in current organization or null */
  currentRole: OrganizationRole | null
  /** Whether organization data is being loaded */
  isLoading: boolean
  /** Whether there was an error fetching organization data */
  isError: boolean
  /** Error message if any */
  error: Error | null
  /** Whether user has any organizations */
  hasOrganizations: boolean
  /** Switch to a different organization */
  switchOrganization: (orgId: string) => void
  /** Refetch organization data manually */
  refetch: () => Promise<void>
  /** Check if user has a specific role in current org */
  hasRole: (role: OrganizationRole | OrganizationRole[]) => boolean
  /** Check if current org has a specific subscription tier or higher */
  hasTier: (tier: SubscriptionTier) => boolean
}

/**
 * Role hierarchy for permission checking
 * Higher index = more permissions
 */
const ROLE_HIERARCHY: OrganizationRole[] = [
  'viewer',
  'kitchen',
  'staff',
  'manager',
  'admin',
  'owner',
]

/**
 * Tier hierarchy for subscription checking
 * Higher index = more features
 */
const TIER_HIERARCHY: SubscriptionTier[] = ['lite', 'gold', 'platinum', 'enterprise']

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Fetch user's organizations with membership info
 */
async function fetchUserOrganizations(userId: string): Promise<OrganizationWithMembership[]> {
  const supabase = createClient()

  console.log('[fetchUserOrganizations] Fetching for userId:', userId)

  const { data, error } = await supabase
    .from('memberships')
    .select(
      `
      id,
      role,
      is_active,
      joined_at,
      created_at,
      updated_at,
      organization_id,
      user_id,
      invited_by,
      invited_at,
      invitation_token,
      invitation_expires_at,
      organization:organizations (*)
    `
    )
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('created_at', { ascending: true })

  console.log('[fetchUserOrganizations] Response:', { data, error })

  if (error) {
    console.error('[fetchUserOrganizations] Error:', error)
    throw new Error(error.message)
  }

  // Transform data to include organization with membership info
  const result = (data ?? [])
    .filter((item) => item.organization !== null)
    .map((item) => ({
      ...(item.organization as Organization),
      membership: {
        id: item.id,
        role: item.role,
        is_active: item.is_active,
        joined_at: item.joined_at,
        created_at: item.created_at,
        updated_at: item.updated_at,
        organization_id: item.organization_id,
        user_id: item.user_id,
        invited_by: item.invited_by,
        invited_at: item.invited_at,
        invitation_token: item.invitation_token,
        invitation_expires_at: item.invitation_expires_at,
      } as Membership,
    }))

  console.log('[fetchUserOrganizations] Result:', result)
  return result
}

/**
 * Fetch single organization details
 */
async function fetchOrganization(orgId: string): Promise<Organization | null> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', orgId)
    .eq('is_active', true)
    .single()

  if (error) {
    // Organization might not exist or user doesn't have access
    if (error.code === 'PGRST116') {
      return null
    }
    throw new Error(error.message)
  }

  return data
}

/**
 * Fetch user's membership in an organization
 */
async function fetchMembership(
  orgId: string,
  userId: string
): Promise<Membership | null> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('memberships')
    .select('*')
    .eq('organization_id', orgId)
    .eq('user_id', userId)
    .eq('is_active', true)
    .single()

  if (error) {
    // Membership might not exist
    if (error.code === 'PGRST116') {
      return null
    }
    throw new Error(error.message)
  }

  return data
}

/**
 * Check if a role meets or exceeds the required role
 */
function roleAtLeast(userRole: OrganizationRole, requiredRole: OrganizationRole): boolean {
  const userIndex = ROLE_HIERARCHY.indexOf(userRole)
  const requiredIndex = ROLE_HIERARCHY.indexOf(requiredRole)
  return userIndex >= requiredIndex
}

/**
 * Check if a tier meets or exceeds the required tier
 */
function tierAtLeast(orgTier: SubscriptionTier, requiredTier: SubscriptionTier): boolean {
  const orgIndex = TIER_HIERARCHY.indexOf(orgTier)
  const requiredIndex = TIER_HIERARCHY.indexOf(requiredTier)
  return orgIndex >= requiredIndex
}

// =============================================================================
// MAIN HOOK
// =============================================================================

/**
 * useOrganization Hook
 *
 * Main hook for client-side organization context management.
 * Uses TanStack Query for caching and Zustand for active org state.
 *
 * @returns OrganizationState object with organizations, current org, loading state, and actions
 */
export function useOrganization(): OrganizationState {
  const queryClient = useQueryClient()
  const { user, isAuthenticated, isLoading: authLoading } = useAuth({ fetchProfile: false })
  const activeOrgId = useActiveOrgId()
  const setActiveOrgId = useUIStore((state) => state.setActiveOrgId)

  // Debug auth state
  useEffect(() => {
    console.log('[useOrganization] Auth state: userId=' + user?.id + ', isAuthenticated=' + isAuthenticated + ', authLoading=' + authLoading)
  }, [user, isAuthenticated, authLoading])

  // ==========================================================================
  // ORGANIZATIONS LIST QUERY
  // ==========================================================================

  const organizationsQuery = useQuery({
    queryKey: organizationQueryKeys.list(user?.id ?? ''),
    queryFn: () => fetchUserOrganizations(user!.id),
    enabled: isAuthenticated && !!user?.id,
    staleTime: 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
    refetchOnMount: false, // Don't refetch on mount - use cached data first
    retry: 1,
  })

  const organizations = organizationsQuery.data ?? []

  // ==========================================================================
  // AUTO-SELECT FIRST ORGANIZATION
  // ==========================================================================

  // Track if we've already initialized to prevent multiple auto-selects
  const hasInitialized = useRef(false)

  useEffect(() => {
    if (!isAuthenticated || authLoading) {
      if (!isAuthenticated && activeOrgId) {
        setActiveOrgId(null)
        hasInitialized.current = false
      }
      return
    }

    // Wait for organizations to load completely
    if (organizationsQuery.isLoading || organizationsQuery.isFetching) {
      return
    }

    // If we've already initialized and activeOrgId is valid, don't change it
    if (hasInitialized.current && activeOrgId) {
      const activeOrgExists = organizations.find((org) => org.id === activeOrgId)
      if (activeOrgExists) {
        return // Don't change anything
      }
    }

    // Only auto-select if:
    // 1. We have organizations
    // 2. Organizations are fully loaded
    // 3. We haven't initialized yet OR activeOrgId is invalid
    if (organizations.length > 0) {
      const activeOrgExists = activeOrgId ? organizations.find((org) => org.id === activeOrgId) : null

      // If activeOrgId is valid, mark as initialized and keep it
      if (activeOrgExists) {
        hasInitialized.current = true
        console.log('[useOrganization] activeOrgId is valid, keeping it:', activeOrgExists.name)
        return
      }

      // Only auto-select if we haven't initialized yet OR activeOrgId is invalid
      if (!hasInitialized.current || !activeOrgId) {
        // Try to find "boracafe" or "anadolu-sofrasi" first
        const preferredOrg = organizations.find(
          (org) => org.slug === 'anadolu-sofrasi' || org.name.toLowerCase() === 'boracafe'
        )

        if (preferredOrg) {
          console.log('[useOrganization] Selecting preferred org:', preferredOrg.name)
          setActiveOrgId(preferredOrg.id)
        } else {
          console.log('[useOrganization] No preferred org, selecting first:', organizations[0].name)
          setActiveOrgId(organizations[0].id)
        }
        hasInitialized.current = true
      }
    }
  }, [
    organizations,
    activeOrgId,
    setActiveOrgId,
    isAuthenticated,
    authLoading,
    organizationsQuery.isLoading,
    organizationsQuery.isFetching,
  ])

  // ==========================================================================
  // CURRENT ORGANIZATION QUERY
  // ==========================================================================

  const currentOrgQuery = useQuery({
    queryKey: organizationQueryKeys.current(activeOrgId ?? ''),
    queryFn: () => fetchOrganization(activeOrgId!),
    enabled: isAuthenticated && !!activeOrgId,
    staleTime: 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  })

  const currentOrg = currentOrgQuery.data ?? null

  // ==========================================================================
  // CURRENT MEMBERSHIP QUERY
  // ==========================================================================

  const membershipQuery = useQuery({
    queryKey: organizationQueryKeys.membership(activeOrgId ?? '', user?.id ?? ''),
    queryFn: () => fetchMembership(activeOrgId!, user!.id),
    enabled: isAuthenticated && !!activeOrgId && !!user?.id,
    staleTime: 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  })

  const currentMembership = membershipQuery.data ?? null
  const currentRole = currentMembership?.role ?? null

  // ==========================================================================
  // REALTIME SUBSCRIPTION
  // ==========================================================================

  useEffect(() => {
    if (!user?.id) return

    const supabase = createClient()

    // Subscribe to membership changes
    const membershipChannel = supabase
      .channel('memberships-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'memberships',
          filter: `user_id=eq.${user.id}`,
        },
        async () => {
          // Invalidate organizations list on membership change
          await queryClient.invalidateQueries({
            queryKey: organizationQueryKeys.list(user.id),
          })
        }
      )
      .subscribe()

    // Subscribe to current org changes if selected
    let orgChannel: ReturnType<typeof supabase.channel> | null = null
    if (activeOrgId) {
      orgChannel = supabase
        .channel('organization-changes')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'organizations',
            filter: `id=eq.${activeOrgId}`,
          },
          async () => {
            // Invalidate current org on update
            await queryClient.invalidateQueries({
              queryKey: organizationQueryKeys.current(activeOrgId),
            })
          }
        )
        .subscribe()
    }

    // Cleanup subscriptions
    return () => {
      supabase.removeChannel(membershipChannel)
      if (orgChannel) {
        supabase.removeChannel(orgChannel)
      }
    }
  }, [user?.id, activeOrgId, queryClient])

  // ==========================================================================
  // ACTIONS
  // ==========================================================================

  /**
   * Switch to a different organization
   */
  const switchOrganization = useCallback(
    (orgId: string) => {
      // Verify org is in user's list
      const orgExists = organizations.find((org) => org.id === orgId)
      if (orgExists) {
        setActiveOrgId(orgId)
      }
    },
    [organizations, setActiveOrgId]
  )

  /**
   * Manually refetch organization data
   */
  const refetch = useCallback(async () => {
    await queryClient.invalidateQueries({
      queryKey: organizationQueryKeys.all,
    })
  }, [queryClient])

  /**
   * Check if user has a specific role (or one of multiple roles)
   */
  const hasRole = useCallback(
    (role: OrganizationRole | OrganizationRole[]): boolean => {
      if (!currentRole) return false

      if (Array.isArray(role)) {
        return role.some((r) => roleAtLeast(currentRole, r))
      }
      return roleAtLeast(currentRole, role)
    },
    [currentRole]
  )

  /**
   * Check if current org has a specific subscription tier or higher
   */
  const hasTier = useCallback(
    (tier: SubscriptionTier): boolean => {
      if (!currentOrg) return false
      return tierAtLeast(currentOrg.subscription_tier, tier)
    },
    [currentOrg]
  )

  // ==========================================================================
  // COMPUTED VALUES
  // ==========================================================================

  const isLoading =
    organizationsQuery.isLoading ||
    (!!activeOrgId && currentOrgQuery.isLoading) ||
    (!!activeOrgId && !!user?.id && membershipQuery.isLoading)

  const rawError =
    organizationsQuery.error ?? currentOrgQuery.error ?? membershipQuery.error ?? null

  const isAbortError = (err: unknown): boolean => {
    if (!err) return false
    if (err instanceof Error && err.name === 'AbortError') return true
    if (err instanceof DOMException && err.name === 'AbortError') return true
    if (typeof err === 'string' && err.includes('AbortError')) return true
    if (typeof err === 'object') {
      const maybeError = err as { name?: string; message?: string }
      if (maybeError.name === 'AbortError') return true
      if (typeof maybeError.message === 'string' && maybeError.message.includes('AbortError')) {
        return true
      }
    }
    return false
  }

  const error = isAbortError(rawError) ? null : rawError

  const isError =
    !!error &&
    (organizationsQuery.isError || currentOrgQuery.isError || membershipQuery.isError)

  const hasOrganizations = organizations.length > 0

  // ==========================================================================
  // RETURN
  // ==========================================================================

  return {
    organizations,
    currentOrg,
    currentMembership,
    currentRole,
    isLoading,
    isError,
    error,
    hasOrganizations,
    switchOrganization,
    refetch,
    hasRole,
    hasTier,
  }
}

// =============================================================================
// UTILITY HOOKS
// =============================================================================

/**
 * useCurrentOrg Hook
 *
 * Simplified hook that only returns the current organization.
 *
 * @example
 * ```tsx
 * const currentOrg = useCurrentOrg()
 * if (currentOrg) console.log(currentOrg.name)
 * ```
 */
export function useCurrentOrg(): Organization | null {
  const { currentOrg } = useOrganization()
  return currentOrg
}

/**
 * useOrganizations Hook
 *
 * Simplified hook that only returns the list of user's organizations.
 *
 * @example
 * ```tsx
 * const organizations = useOrganizations()
 * organizations.map(org => console.log(org.name))
 * ```
 */
export function useOrganizations(): OrganizationWithMembership[] {
  const { organizations } = useOrganization()
  return organizations
}

/**
 * useCurrentRole Hook
 *
 * Simplified hook that returns user's role in current organization.
 *
 * @example
 * ```tsx
 * const role = useCurrentRole()
 * if (role === 'owner' || role === 'admin') console.log('Has admin access')
 * ```
 */
export function useCurrentRole(): OrganizationRole | null {
  const { currentRole } = useOrganization()
  return currentRole
}

/**
 * useHasRole Hook
 *
 * Hook that checks if user has at least a specific role.
 *
 * @param minRole - Minimum required role
 * @returns Boolean indicating if user has the role or higher
 *
 * @example
 * ```tsx
 * const isManager = useHasRole('manager')
 * if (isManager) console.log('Can manage menu')
 * ```
 */
export function useHasRole(minRole: OrganizationRole): boolean {
  const { hasRole } = useOrganization()
  return hasRole(minRole)
}

/**
 * useHasTier Hook
 *
 * Hook that checks if current org has at least a specific tier.
 *
 * @param minTier - Minimum required tier
 * @returns Boolean indicating if org has the tier or higher
 *
 * @example
 * ```tsx
 * const hasPremium = useHasTier('gold')
 * if (!hasPremium) console.log('Upgrade required')
 * ```
 */
export function useHasTier(minTier: SubscriptionTier): boolean {
  const { hasTier } = useOrganization()
  return hasTier(minTier)
}

/**
 * useIsOrgOwner Hook
 *
 * Simple boolean hook to check if user is the organization owner.
 *
 * @example
 * ```tsx
 * const isOwner = useIsOrgOwner()
 * if (isOwner) console.log('Can delete organization')
 * ```
 */
export function useIsOrgOwner(): boolean {
  const { currentRole } = useOrganization()
  return currentRole === 'owner'
}

/**
 * useIsOrgAdmin Hook
 *
 * Simple boolean hook to check if user is admin or owner.
 *
 * @example
 * ```tsx
 * const isAdmin = useIsOrgAdmin()
 * if (isAdmin) console.log('Can manage team')
 * ```
 */
export function useIsOrgAdmin(): boolean {
  const { hasRole } = useOrganization()
  return hasRole('admin')
}

/**
 * useCanManageMenu Hook
 *
 * Hook to check if user can manage menu (manager role or higher).
 *
 * @example
 * ```tsx
 * const canManageMenu = useCanManageMenu()
 * if (canManageMenu) showMenuEditor()
 * ```
 */
export function useCanManageMenu(): boolean {
  const { hasRole } = useOrganization()
  return hasRole('manager')
}

/**
 * useCanManageOrders Hook
 *
 * Hook to check if user can manage orders (staff role or higher).
 *
 * @example
 * ```tsx
 * const canManageOrders = useCanManageOrders()
 * if (canManageOrders) showOrderDashboard()
 * ```
 */
export function useCanManageOrders(): boolean {
  const { hasRole } = useOrganization()
  return hasRole('staff')
}

/**
 * useOrgLoading Hook
 *
 * Returns only the loading state of organization data.
 *
 * @example
 * ```tsx
 * const isLoading = useOrgLoading()
 * if (isLoading) return <Spinner />
 * ```
 */
export function useOrgLoading(): boolean {
  const { isLoading } = useOrganization()
  return isLoading
}
