/**
 * Supabase Admin Client
 *
 * This module provides a Supabase client with service role permissions
 * for administrative operations that bypass Row Level Security (RLS).
 *
 * ⚠️ SECURITY WARNING:
 * - This client BYPASSES all RLS policies
 * - NEVER use this client in Client Components
 * - NEVER expose SUPABASE_SERVICE_ROLE_KEY to the browser
 * - Only use for trusted server-side admin operations
 *
 * Use Cases:
 * - User management (create, delete users)
 * - Cross-tenant operations (platform admin)
 * - Database migrations and seeding
 * - Webhook handlers that need full access
 * - Background jobs and cron tasks
 *
 * @example
 * ```tsx
 * // In a Server Action or API Route (NEVER in client code)
 * import { createAdminClient } from '@/lib/supabase/admin'
 *
 * export async function deleteUser(userId: string) {
 *   const supabase = createAdminClient()
 *   const { error } = await supabase.auth.admin.deleteUser(userId)
 *   if (error) throw error
 * }
 * ```
 *
 * @see https://supabase.com/docs/guides/auth/server-side/nextjs
 */

import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

/**
 * Environment variables for admin client
 * SUPABASE_SERVICE_ROLE_KEY is server-only (no NEXT_PUBLIC_ prefix)
 */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

/**
 * Creates a Supabase client with service role (admin) permissions.
 *
 * ⚠️ SECURITY: This client bypasses all RLS policies.
 * Only use in trusted server-side code.
 *
 * Features:
 * - Full database access (bypasses RLS)
 * - Admin auth operations (create/delete users)
 * - Storage admin operations
 * - No cookie handling (stateless)
 *
 * @returns A typed Supabase client with admin permissions
 * @throws Error if environment variables are not configured
 *
 * @example
 * ```tsx
 * // Server Action for platform admin
 * 'use server'
 * import { createAdminClient } from '@/lib/supabase/admin'
 *
 * export async function getAllOrganizations() {
 *   const supabase = createAdminClient()
 *
 *   // This bypasses RLS - returns ALL organizations
 *   const { data, error } = await supabase
 *     .from('organizations')
 *     .select('*')
 *     .order('created_at', { ascending: false })
 *
 *   if (error) throw error
 *   return data
 * }
 * ```
 *
 * @example
 * ```tsx
 * // Webhook handler for user signup
 * import { createAdminClient } from '@/lib/supabase/admin'
 *
 * export async function POST(request: Request) {
 *   const supabase = createAdminClient()
 *   const payload = await request.json()
 *
 *   // Create profile for new user (bypasses RLS)
 *   const { error } = await supabase
 *     .from('profiles')
 *     .insert({
 *       id: payload.user.id,
 *       email: payload.user.email,
 *       full_name: payload.user.user_metadata?.full_name,
 *     })
 *
 *   if (error) {
 *     return new Response('Error creating profile', { status: 500 })
 *   }
 *
 *   return new Response('OK', { status: 200 })
 * }
 * ```
 */
export function createAdminClient() {
  if (!supabaseUrl) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL environment variable.'
    )
  }

  if (!supabaseServiceRoleKey) {
    throw new Error(
      'Missing SUPABASE_SERVICE_ROLE_KEY environment variable. ' +
      'This key is required for admin operations and should only be available server-side.'
    )
  }

  return createClient<Database>(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      /**
       * Disable auto-refresh for service role client
       * Service role doesn't use session-based auth
       */
      autoRefreshToken: false,
      /**
       * Don't persist session for service role
       * Each request creates a new stateless client
       */
      persistSession: false,
    },
  })
}

/**
 * Type export for the admin Supabase client
 * Useful for typing function parameters
 */
export type SupabaseAdminClient = ReturnType<typeof createAdminClient>
