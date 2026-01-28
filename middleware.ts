/**
 * Next.js Middleware
 *
 * This middleware handles authentication for protected routes using Supabase Auth.
 * It runs before every request and:
 * - Refreshes expired auth tokens
 * - Redirects unauthenticated users from protected routes to /login
 * - Redirects authenticated users away from auth pages to /dashboard
 *
 * Protected Routes:
 * - /dashboard/* - Restaurant management dashboard
 * - /admin/* - Platform admin panel
 * - /kitchen/* - Kitchen display system
 * - /settings/* - User settings
 *
 * Public Routes:
 * - / - Landing page
 * - /login, /register - Authentication pages
 * - /forgot-password, /reset-password - Password recovery
 * - /auth/* - OAuth callbacks
 * - /r/* - Public restaurant menus
 *
 * @see https://nextjs.org/docs/app/building-your-application/routing/middleware
 * @see https://supabase.com/docs/guides/auth/server-side/nextjs
 */

import { updateSession } from '@/lib/supabase/middleware'
import { type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

/**
 * Middleware Matcher Configuration
 *
 * This pattern matches all routes EXCEPT:
 * - _next/static (static files)
 * - _next/image (image optimization files)
 * - favicon.ico (favicon file)
 * - Static file extensions (svg, png, jpg, jpeg, gif, webp)
 *
 * The middleware will run for all page routes and API routes,
 * but not for static assets which improves performance.
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico (favicon)
     * - Public static files (images, fonts, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|eot)$).*)',
  ],
}
