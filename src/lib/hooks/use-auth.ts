'use client'

/**
 * useAuth Hook
 *
 * Client-side hook for managing authentication state using TanStack Query.
 * Provides reactive auth state, session management, and real-time auth updates.
 *
 * Features:
 * - TanStack Query for caching auth state (1 minute stale time)
 * - Real-time auth state subscription via Supabase onAuthStateChange
 * - Automatic query invalidation on auth events
 * - Type-safe user and session data
 * - Profile fetching support
 *
 * @example
 * ```tsx
 * 'use client'
 * import { useAuth } from '@/lib/hooks/use-auth'
 *
 * function Dashboard() {
 *   const { user, isLoading, isAuthenticated } = useAuth()
 *
 *   if (isLoading) return <div>Yükleniyor...</div>
 *   if (!isAuthenticated) return <div>Lütfen giriş yapın</div>
 *
 *   return <div>Hoş geldiniz, {user?.email}</div>
 * }
 * ```
 *
 * @see https://tanstack.com/query/latest/docs/react/guides/queries
 * @see https://supabase.com/docs/guides/auth/sessions
 */

import { useEffect, useCallback, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { User, Session, AuthChangeEvent } from '@supabase/supabase-js'
import type { Profile } from '@/types/database'

// =============================================================================
// QUERY KEYS
// =============================================================================

/**
 * Auth query key factory
 * Follows TanStack Query key convention:
 * - ['auth'] → All auth-related queries
 * - ['auth', 'session'] → Session data
 * - ['auth', 'user'] → User data
 * - ['auth', 'profile', userId] → User profile
 */
export const authQueryKeys = {
  all: ['auth'] as const,
  session: () => [...authQueryKeys.all, 'session'] as const,
  user: () => [...authQueryKeys.all, 'user'] as const,
  profile: (userId: string) => [...authQueryKeys.all, 'profile', userId] as const,
}

// =============================================================================
// TYPES
// =============================================================================

/**
 * Auth state interface returned by useAuth hook
 */
export interface AuthState {
  /** Currently authenticated user or null */
  user: User | null
  /** Current session or null */
  session: Session | null
  /** User profile from profiles table or null */
  profile: Profile | null
  /** Whether auth state is being loaded */
  isLoading: boolean
  /** Whether there was an error fetching auth state */
  isError: boolean
  /** Error message if any */
  error: Error | null
  /** Whether user is authenticated */
  isAuthenticated: boolean
  /** Whether session is expired or about to expire */
  isSessionExpiring: boolean
  /** Refetch auth state manually */
  refetch: () => Promise<void>
  /** Sign out the current user */
  signOut: () => Promise<void>
}

/**
 * Session data from Supabase
 */
interface SessionData {
  user: User | null
  session: Session | null
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Check if session is expiring soon (within 5 minutes)
 */
function isSessionExpiringSoon(session: Session | null): boolean {
  if (!session?.expires_at) return false

  const expiresAt = new Date(session.expires_at * 1000)
  const now = new Date()
  const fiveMinutes = 5 * 60 * 1000

  return expiresAt.getTime() - now.getTime() < fiveMinutes
}

/**
 * Parse session from auth cookie
 * Workaround for @supabase/ssr getSession() hanging issue
 */
function getSessionFromCookie(): { access_token: string; refresh_token: string; user: User } | null {
  if (typeof document === 'undefined') return null
  
  // Find the local auth cookie (sb-127-auth-token for local, or production variant)
  const cookies = document.cookie.split(';')
  const authCookie = cookies.find(c => 
    c.trim().startsWith('sb-127-auth-token=') || 
    c.trim().match(/^sb-[a-z]+-auth-token=/)
  )
  
  if (!authCookie) {
    console.log('[getSessionFromCookie] No auth cookie found')
    return null
  }
  
  try {
    const cookieValue = authCookie.split('=').slice(1).join('=').trim()
    const base64Data = cookieValue.replace('base64-', '')
    const jsonStr = atob(base64Data)
    const sessionData = JSON.parse(jsonStr)
    
    // Check if token is expired
    const now = Math.floor(Date.now() / 1000)
    if (sessionData.expires_at && now > sessionData.expires_at) {
      console.log('[getSessionFromCookie] Token expired')
      return null
    }
    
    return {
      access_token: sessionData.access_token,
      refresh_token: sessionData.refresh_token,
      user: sessionData.user,
    }
  } catch (err) {
    console.error('[getSessionFromCookie] Parse error:', err)
    return null
  }
}

/**
 * Fetch session data from Supabase
 * Uses cookie parsing as workaround for SSR lock issues
 */
async function fetchSessionData(): Promise<SessionData> {
  console.log('[fetchSessionData] Checking cookie...')
  
  // First try to get session from cookie (fast path)
  const cookieSession = getSessionFromCookie()
  
  if (cookieSession) {
    console.log('[fetchSessionData] Found session in cookie:', cookieSession.user?.email)
    
    // Create a minimal session object
    const session: Session = {
      access_token: cookieSession.access_token,
      refresh_token: cookieSession.refresh_token,
      token_type: 'bearer',
      expires_in: 3600,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      user: cookieSession.user,
    }
    
    return {
      user: cookieSession.user,
      session,
    }
  }
  
  console.log('[fetchSessionData] No cookie session, returning null')
  return { user: null, session: null }
}

/**
 * Fetch user profile from profiles table
 */
async function fetchUserProfile(userId: string): Promise<Profile | null> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) {
    // Profile might not exist yet (user just registered)
    if (error.code === 'PGRST116') {
      return null
    }
    throw new Error(error.message)
  }

  return data
}

// =============================================================================
// MAIN HOOK
// =============================================================================

/**
 * useAuth Hook
 *
 * Main hook for client-side authentication state management.
 * Uses TanStack Query for caching and Supabase Realtime for live updates.
 *
 * @param options - Hook options
 * @param options.fetchProfile - Whether to fetch user profile (default: true)
 * @returns AuthState object with user, session, profile, loading state, and actions
 */
export function useAuth(options?: { fetchProfile?: boolean }): AuthState {
  const { fetchProfile = true } = options ?? {}
  const queryClient = useQueryClient()

  // ==========================================================================
  // SESSION QUERY
  // ==========================================================================

  const sessionQuery = useQuery({
    queryKey: authQueryKeys.session(),
    queryFn: fetchSessionData,
    staleTime: 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true, // Refetch when user returns to tab
    refetchOnReconnect: true, // Refetch when network reconnects
    retry: 1,
  })

  const user = sessionQuery.data?.user ?? null
  const session = sessionQuery.data?.session ?? null

  // ==========================================================================
  // PROFILE QUERY
  // ==========================================================================

  const profileQuery = useQuery({
    queryKey: authQueryKeys.profile(user?.id ?? ''),
    queryFn: () => fetchUserProfile(user!.id),
    enabled: fetchProfile && !!user?.id,
    staleTime: 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  })

  const profile = profileQuery.data ?? null

  // ==========================================================================
  // AUTH STATE CHANGE SUBSCRIPTION
  // ==========================================================================

  useEffect(() => {
    const supabase = createClient()

    // Subscribe to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, currentSession: Session | null) => {
        // Handle different auth events
        switch (event) {
          case 'SIGNED_IN':
          case 'TOKEN_REFRESHED':
            // Invalidate and refetch session data
            await queryClient.invalidateQueries({
              queryKey: authQueryKeys.session(),
            })
            break

          case 'SIGNED_OUT':
            // Clear all auth-related queries
            queryClient.setQueryData(authQueryKeys.session(), {
              user: null,
              session: null,
            })
            await queryClient.invalidateQueries({
              queryKey: authQueryKeys.all,
            })
            break

          case 'USER_UPDATED':
            // Refetch user and profile data
            await queryClient.invalidateQueries({
              queryKey: authQueryKeys.session(),
            })
            if (currentSession?.user?.id) {
              await queryClient.invalidateQueries({
                queryKey: authQueryKeys.profile(currentSession.user.id),
              })
            }
            break

          case 'PASSWORD_RECOVERY':
            // User clicked password recovery link
            // Session will be set, user can now update password
            await queryClient.invalidateQueries({
              queryKey: authQueryKeys.session(),
            })
            break

          default:
            // Handle any other events by refetching
            await queryClient.invalidateQueries({
              queryKey: authQueryKeys.session(),
            })
        }
      }
    )

    // Cleanup subscription on unmount
    return () => {
      subscription.unsubscribe()
    }
  }, [queryClient])

  // ==========================================================================
  // ACTIONS
  // ==========================================================================

  /**
   * Manually refetch auth state
   */
  const refetch = useCallback(async () => {
    await queryClient.invalidateQueries({
      queryKey: authQueryKeys.all,
    })
  }, [queryClient])

  /**
   * Sign out the current user
   */
  const signOut = useCallback(async () => {
    const supabase = createClient()

    // Optimistically clear the cache
    queryClient.setQueryData(authQueryKeys.session(), {
      user: null,
      session: null,
    })

    // Sign out from Supabase
    await supabase.auth.signOut()

    // Invalidate all auth queries
    await queryClient.invalidateQueries({
      queryKey: authQueryKeys.all,
    })
  }, [queryClient])

  // ==========================================================================
  // COMPUTED VALUES
  // ==========================================================================

  const isLoading = sessionQuery.isLoading || (fetchProfile && !!user && profileQuery.isLoading)
  const isError = sessionQuery.isError || profileQuery.isError
  const error = sessionQuery.error ?? profileQuery.error ?? null
  const isAuthenticated = !!user && !!session
  const isSessionExpiring = useMemo(() => isSessionExpiringSoon(session), [session])

  // ==========================================================================
  // RETURN
  // ==========================================================================

  return {
    user,
    session,
    profile,
    isLoading,
    isError,
    error,
    isAuthenticated,
    isSessionExpiring,
    refetch,
    signOut,
  }
}

// =============================================================================
// UTILITY HOOKS
// =============================================================================

/**
 * useUser Hook
 *
 * Simplified hook that only returns the current user.
 * Use when you only need user data without session or profile.
 *
 * @example
 * ```tsx
 * const user = useUser()
 * if (user) console.log(user.email)
 * ```
 */
export function useUser(): User | null {
  const { user } = useAuth({ fetchProfile: false })
  return user
}

/**
 * useSession Hook
 *
 * Simplified hook that only returns the current session.
 *
 * @example
 * ```tsx
 * const session = useSession()
 * if (session) console.log('Token expires:', session.expires_at)
 * ```
 */
export function useSession(): Session | null {
  const { session } = useAuth({ fetchProfile: false })
  return session
}

/**
 * useIsAuthenticated Hook
 *
 * Simple boolean hook to check if user is authenticated.
 *
 * @example
 * ```tsx
 * const isAuthenticated = useIsAuthenticated()
 * if (!isAuthenticated) redirect('/login')
 * ```
 */
export function useIsAuthenticated(): boolean {
  const { isAuthenticated } = useAuth({ fetchProfile: false })
  return isAuthenticated
}

/**
 * useAuthLoading Hook
 *
 * Returns only the loading state of auth.
 *
 * @example
 * ```tsx
 * const isLoading = useAuthLoading()
 * if (isLoading) return <Spinner />
 * ```
 */
export function useAuthLoading(): boolean {
  const { isLoading } = useAuth({ fetchProfile: false })
  return isLoading
}
