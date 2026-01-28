/**
 * Supabase Browser Client
 *
 * This module provides a Supabase client for browser/client-side usage.
 * It uses the @supabase/ssr package's createBrowserClient for proper
 * cookie handling in the browser environment.
 *
 * IMPORTANT:
 * - Use this client ONLY in Client Components ('use client')
 * - Never use SUPABASE_SERVICE_ROLE_KEY on the client
 * - This client uses the anon key which respects RLS policies
 *
 * @example
 * ```tsx
 * 'use client'
 * import { createClient } from '@/lib/supabase/client'
 *
 * function MyComponent() {
 *   const supabase = createClient()
 *   // Use supabase for queries, auth, etc.
 * }
 * ```
 *
 * @see https://supabase.com/docs/guides/auth/server-side/nextjs
 */

import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database'

/**
 * Environment variable validation
 * These are NEXT_PUBLIC_ prefixed so they're available in the browser
 */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

/**
 * Singleton instance of the Supabase browser client
 * This prevents "Multiple GoTrueClient instances" warning and lock issues
 */
let browserClient: ReturnType<typeof createBrowserClient<Database>> | null = null

/**
 * Creates a Supabase client for browser-side usage.
 *
 * This function returns a SINGLETON client instance to prevent
 * multiple GoTrueClient instances which can cause auth lock issues.
 *
 * Features:
 * - Type-safe queries using the Database type
 * - Automatic cookie-based session handling
 * - Respects Row Level Security (RLS) policies
 * - Real-time subscriptions supported
 *
 * @returns A typed Supabase client for browser usage
 * @throws Error if environment variables are not configured
 *
 * @example
 * ```tsx
 * 'use client'
 * import { createClient } from '@/lib/supabase/client'
 *
 * export function ProductList({ orgId }: { orgId: string }) {
 *   const supabase = createClient()
 *
 *   // Fetch products with type safety
 *   const fetchProducts = async () => {
 *     const { data, error } = await supabase
 *       .from('products')
 *       .select('*')
 *       .eq('org_id', orgId)
 *
 *     if (error) throw error
 *     return data // Typed as Product[]
 *   }
 * }
 * ```
 */
export function createClient() {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing Supabase environment variables. ' +
      'Ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set.'
    )
  }

  // Return existing instance if available (singleton pattern)
  if (browserClient) {
    return browserClient
  }

  // Create new instance only once
  browserClient = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey)
  return browserClient
}

/**
 * Type export for the browser Supabase client
 * Useful for typing props or function parameters
 */
export type SupabaseBrowserClient = ReturnType<typeof createClient>
