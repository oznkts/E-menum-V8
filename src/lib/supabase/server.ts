/**
 * Supabase Server Client
 *
 * This module provides a Supabase client for server-side usage in
 * Next.js App Router (Server Components, Server Actions, Route Handlers).
 *
 * IMPORTANT:
 * - Use this client in Server Components, Server Actions, and Route Handlers
 * - This client uses cookies() which requires async handling in Next.js 15+
 * - Respects RLS policies using the authenticated user's session
 *
 * @example
 * ```tsx
 * // In a Server Component
 * import { createClient } from '@/lib/supabase/server'
 *
 * export default async function Dashboard() {
 *   const supabase = await createClient()
 *   const { data: { user } } = await supabase.auth.getUser()
 *   // ...
 * }
 * ```
 *
 * @see https://supabase.com/docs/guides/auth/server-side/nextjs
 */

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database'

/**
 * Environment variable validation
 */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

/**
 * Creates a Supabase client for server-side usage.
 *
 * This is an async function because it needs to access cookies,
 * which is async in Next.js 15+ App Router.
 *
 * Features:
 * - Type-safe queries using the Database type
 * - Cookie-based session handling for SSR
 * - Respects Row Level Security (RLS) policies
 * - Can read and write cookies for session management
 *
 * @returns A promise that resolves to a typed Supabase client
 * @throws Error if environment variables are not configured
 *
 * @example
 * ```tsx
 * // Server Component
 * import { createClient } from '@/lib/supabase/server'
 *
 * export default async function ProductsPage() {
 *   const supabase = await createClient()
 *
 *   const { data: products, error } = await supabase
 *     .from('products')
 *     .select('*, category:categories(*)')
 *     .eq('is_active', true)
 *
 *   if (error) {
 *     // Handle error
 *   }
 *
 *   return <ProductList products={products} />
 * }
 * ```
 *
 * @example
 * ```tsx
 * // Server Action
 * 'use server'
 * import { createClient } from '@/lib/supabase/server'
 *
 * export async function createProduct(formData: FormData) {
 *   const supabase = await createClient()
 *
 *   const { data, error } = await supabase
 *     .from('products')
 *     .insert({
 *       name: formData.get('name') as string,
 *       // ...
 *     })
 *     .select()
 *     .single()
 *
 *   if (error) throw error
 *   return data
 * }
 * ```
 */
export async function createClient() {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing Supabase environment variables. ' +
      'Ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set.'
    )
  }

  const cookieStore = await cookies()

  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      /**
       * Gets all cookies from the request
       * Used by Supabase to read session data
       */
      getAll() {
        return cookieStore.getAll()
      },
      /**
       * Sets cookies on the response
       * Used by Supabase to update session data
       *
       * Note: In Server Components, setting cookies is only possible
       * during the initial request. For mutations, use Server Actions.
       */
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing
          // user sessions.
        }
      },
    },
  })
}

/**
 * Type export for the server Supabase client
 * Useful for typing function parameters
 */
export type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>
