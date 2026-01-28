'use client'

import { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'

/**
 * Default query client options optimized for the E-Menum platform
 *
 * Query Key Convention:
 * - ['products', orgId]              → List of products for an organization
 * - ['products', orgId, productId]   → Single product
 * - ['categories', orgId]            → List of categories
 * - ['orders', 'active', orgId]      → Filtered orders
 * - ['menu', slug]                   → Public menu data
 */
function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Data is considered fresh for 1 minute
        staleTime: 60 * 1000,
        // Keep unused data in cache for 5 minutes
        gcTime: 5 * 60 * 1000,
        // Don't refetch on window focus (prevents unnecessary API calls)
        refetchOnWindowFocus: false,
        // Only retry once on failure
        retry: 1,
        // Retry delay increases with each attempt
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      },
      mutations: {
        // Retry mutations once on failure
        retry: 1,
      },
    },
  })
}

// Browser query client singleton
let browserQueryClient: QueryClient | undefined = undefined

/**
 * Get or create query client
 * Server: Always creates a new client
 * Browser: Uses singleton to persist cache across navigations
 */
function getQueryClient() {
  if (typeof window === 'undefined') {
    // Server: always make a new query client
    return makeQueryClient()
  }
  // Browser: make a new query client if we don't already have one
  // This is very important, so we don't re-make a new client if React
  // suspends during the initial render
  if (!browserQueryClient) {
    browserQueryClient = makeQueryClient()
  }
  return browserQueryClient
}

interface QueryProviderProps {
  children: React.ReactNode
}

/**
 * TanStack Query Provider Component
 *
 * Provides query client context to the application.
 * Includes DevTools in development mode only.
 *
 * @example
 * ```tsx
 * // In app/layout.tsx
 * import { QueryProvider } from '@/components/providers/query-provider'
 *
 * export default function RootLayout({ children }) {
 *   return (
 *     <html>
 *       <body>
 *         <QueryProvider>{children}</QueryProvider>
 *       </body>
 *     </html>
 *   )
 * }
 * ```
 */
export function QueryProvider({ children }: QueryProviderProps) {
  // Use useState to ensure the query client is only created once per component
  // This follows the recommended pattern for Next.js App Router
  const [queryClient] = useState(getQueryClient)

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools
          initialIsOpen={false}
          buttonPosition="bottom-right"
        />
      )}
    </QueryClientProvider>
  )
}
