/**
 * Supabase Middleware Client
 *
 * This module provides a Supabase client specifically designed for use
 * in Next.js middleware. It handles session refresh and cookie management
 * during the middleware request/response cycle.
 *
 * The middleware is responsible for:
 * - Refreshing expired auth tokens before they reach Server Components
 * - Redirecting unauthenticated users from protected routes
 * - Allowing public routes without authentication
 *
 * @example
 * ```ts
 * // middleware.ts at project root
 * import { updateSession } from '@/lib/supabase/middleware'
 * import { type NextRequest } from 'next/server'
 *
 * export async function middleware(request: NextRequest) {
 *   return await updateSession(request)
 * }
 *
 * export const config = {
 *   matcher: [
 *     '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
 *   ],
 * }
 * ```
 *
 * @see https://supabase.com/docs/guides/auth/server-side/nextjs
 */

import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from '@/types/database'

/**
 * Environment variables for middleware
 */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

/**
 * Routes that don't require authentication
 */
const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/auth/callback',
  '/auth/confirm',
  '/r', // Public menu routes /r/[slug]
]

/**
 * Check if a path is a public route
 */
function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some((route) => {
    if (route === '/') {
      return pathname === '/'
    }
    return pathname === route || pathname.startsWith(`${route}/`)
  })
}

/**
 * Check if a path is a static asset or API route
 */
function isStaticOrApi(pathname: string): boolean {
  return (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.') // Static files like images, fonts, etc.
  )
}

/**
 * Updates the user session and handles auth redirects.
 *
 * This function should be called from the Next.js middleware to:
 * 1. Refresh the user's session if it's about to expire
 * 2. Redirect unauthenticated users from protected routes
 * 3. Pass through requests for public routes
 *
 * Cookie Management:
 * - Reads session cookies from the incoming request
 * - Refreshes tokens if needed
 * - Sets updated cookies on the response
 *
 * @param request - The incoming Next.js request
 * @returns A NextResponse with updated cookies and potential redirects
 *
 * @example
 * ```ts
 * // middleware.ts
 * import { updateSession } from '@/lib/supabase/middleware'
 *
 * export async function middleware(request: NextRequest) {
 *   return await updateSession(request)
 * }
 * ```
 */
export async function updateSession(request: NextRequest) {
  // Create a response that we'll modify with new cookies
  let supabaseResponse = NextResponse.next({
    request,
  })

  // Skip middleware for static assets and API routes
  if (isStaticOrApi(request.nextUrl.pathname)) {
    return supabaseResponse
  }

  // Validate environment variables
  if (!supabaseUrl || !supabaseAnonKey) {
    // In development, log warning and continue
    // In production, this should never happen
    return supabaseResponse
  }

  // Create Supabase client with custom cookie handling for middleware
  const supabase = createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      /**
       * Get all cookies from the request
       */
      getAll() {
        return request.cookies.getAll()
      },
      /**
       * Set cookies on the response
       * This is how we update the session cookies after refresh
       */
      setAll(cookiesToSet) {
        // First, set cookies on the request (for subsequent handlers)
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        )

        // Create a new response with the request's cookies
        supabaseResponse = NextResponse.next({
          request,
        })

        // Set cookies on the response (for the browser)
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        )
      },
    },
  })

  // IMPORTANT: Don't run auth checks on public routes first
  // This avoids unnecessary database calls
  const { pathname } = request.nextUrl

  // Refresh the session (important for keeping users logged in)
  // This also refreshes expired tokens
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Handle authentication redirects
  if (!user && !isPublicRoute(pathname)) {
    // User is not authenticated and trying to access a protected route
    const loginUrl = new URL('/login', request.url)
    // Preserve the original URL so we can redirect back after login
    loginUrl.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Optional: Redirect authenticated users away from auth pages
  if (user && (pathname === '/login' || pathname === '/register')) {
    // Check if user is superadmin and redirect to admin panel
    try {
      const { data: isSuperadmin } = await supabase.rpc('is_superadmin')
      if (isSuperadmin) {
        return NextResponse.redirect(new URL('/admin', request.url))
      }
    } catch (error) {
      // If RPC fails, continue with normal redirect
      console.error('[Middleware] Error checking superadmin:', error)
    }
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return supabaseResponse
}

/**
 * Type for the response from updateSession
 */
export type UpdateSessionResponse = Awaited<ReturnType<typeof updateSession>>
