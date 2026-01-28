'use client'

/**
 * useSuperadmin Hook
 *
 * Client-side hook for checking if current user is a superadmin.
 * Uses TanStack Query for caching and real-time updates.
 *
 * @example
 * ```tsx
 * 'use client'
 * import { useSuperadmin } from '@/lib/hooks/use-superadmin'
 *
 * function AdminPanel() {
 *   const { isSuperadmin, isLoading } = useSuperadmin()
 *
 *   if (isLoading) return <div>Yükleniyor...</div>
 *   if (!isSuperadmin) return <div>Yetkiniz yok</div>
 *
 *   return <div>Admin Paneli</div>
 * }
 * ```
 */

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { authQueryKeys } from './use-auth'

/**
 * Check if current user is a superadmin
 */
async function checkSuperadmin(): Promise<boolean> {
  const supabase = createClient()
  const { data: authData } = await supabase.auth.getUser()

  if (!authData?.user) {
    return false
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('system_role')
    .eq('id', authData.user.id)
    .single()

  return profile?.system_role === 'superadmin'
}

/**
 * Hook to check if current user is a superadmin
 */
export function useSuperadmin() {
  const { data: isSuperadmin = false, isLoading, error } = useQuery({
    queryKey: [...authQueryKeys.all, 'superadmin'],
    queryFn: checkSuperadmin,
    staleTime: 1000 * 60, // 1 minute
    retry: false,
  })

  return {
    isSuperadmin,
    isLoading,
    isError: !!error,
    error: error as Error | null,
  }
}

