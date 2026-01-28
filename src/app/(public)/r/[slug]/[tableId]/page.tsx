'use client'

/**
 * Table-Specific Menu Page
 *
 * Displays the restaurant menu with table context loaded from QR code.
 * When a customer scans a table-specific QR code, this page:
 *
 * 1. Loads the table by its qr_uuid (unpredictable for security)
 * 2. Sets the cart context with table information
 * 3. Shows a "Call Waiter" button for service requests
 * 4. Persists table context in localStorage for page refreshes
 *
 * URL Pattern: /r/[slug]/[tableId] (e.g., /r/demo-restaurant/abc123-uuid)
 *
 * @see ek_ozellikler.md for table-based QR and waiter call requirements
 */

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { MenuView, MenuSkeleton } from '@/components/features/public-menu/menu-view'
import { WaiterCallButton } from '@/components/features/public-menu/waiter-call-button'
import { useCartStore } from '@/lib/stores/cart-store'
import type { Organization, Category, Product, RestaurantTable } from '@/types/database'

// =============================================================================
// TYPES
// =============================================================================

interface TableMenuPageProps {
  params: Promise<{
    slug: string
    tableId: string
  }>
}

interface TableContext {
  tableId: string
  tableName: string
  tableNumber: string | null
  section: string | null
  qrUuid: string
}

interface MenuData {
  organization: Organization
  categories: Category[]
  products: Product[]
  table: RestaurantTable
}

// =============================================================================
// LOCAL STORAGE KEYS
// =============================================================================

const TABLE_CONTEXT_KEY = 'e-menum-table-context'

/**
 * Save table context to localStorage for persistence across page refreshes
 */
function saveTableContext(context: TableContext): void {
  try {
    localStorage.setItem(TABLE_CONTEXT_KEY, JSON.stringify(context))
  } catch {
    // localStorage might not be available
  }
}

/**
 * Load table context from localStorage
 */
function loadTableContext(): TableContext | null {
  try {
    const stored = localStorage.getItem(TABLE_CONTEXT_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch {
    // localStorage might not be available or data corrupted
  }
  return null
}

/**
 * Clear table context from localStorage
 */
function clearTableContext(): void {
  try {
    localStorage.removeItem(TABLE_CONTEXT_KEY)
  } catch {
    // ignore
  }
}

// =============================================================================
// DATA FETCHING
// =============================================================================

async function getTableMenuData(
  slug: string,
  qrUuid: string
): Promise<MenuData | null> {
  const supabase = createClient()

  // Fetch organization by slug
  const { data: organization, error: orgError } = await supabase
    .from('organizations')
    .select('*')
    .eq('slug', slug)
    .eq('is_active', true)
    .is('deleted_at', null)
    .single()

  if (orgError || !organization) {
    return null
  }

  // Fetch table by qr_uuid for this organization
  const { data: table, error: tableError } = await supabase
    .from('restaurant_tables')
    .select('*')
    .eq('organization_id', organization.id)
    .eq('qr_uuid', qrUuid)
    .eq('is_visible', true)
    .is('deleted_at', null)
    .single()

  if (tableError || !table) {
    // Table not found or doesn't belong to this organization
    return null
  }

  // Fetch visible categories for this organization
  const { data: categories, error: catError } = await supabase
    .from('categories')
    .select('*')
    .eq('organization_id', organization.id)
    .eq('is_visible', true)
    .is('deleted_at', null)
    .order('sort_order', { ascending: true })

  if (catError) {
    return { organization, categories: [], products: [], table }
  }

  // Fetch available products for this organization
  const { data: products, error: prodError } = await supabase
    .from('products')
    .select('*')
    .eq('organization_id', organization.id)
    .eq('is_available', true)
    .in('status', ['active'])
    .is('deleted_at', null)
    .order('sort_order', { ascending: true })

  if (prodError) {
    return { organization, categories: categories || [], products: [], table }
  }

  return {
    organization,
    categories: categories || [],
    products: products || [],
    table,
  }
}


// =============================================================================
// TABLE CONTEXT BANNER
// =============================================================================

interface TableContextBannerProps {
  table: RestaurantTable
}

/**
 * Table Context Banner
 *
 * Shows which table the customer is at.
 * Sticky at the top so customers always know their table context.
 */
function TableContextBanner({ table }: TableContextBannerProps) {
  return (
    <div className="sticky top-0 z-40 bg-primary-600 dark:bg-primary-700 px-4 py-2 pt-safe">
      <div className="flex items-center justify-center gap-2 text-sm">
        <svg
          className="h-4 w-4 text-white/80"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
          />
        </svg>
        <span className="font-medium text-white">
          {table.section ? `${table.section} - ` : ''}
          {table.name}
          {table.table_number && ` (${table.table_number})`}
        </span>
      </div>
    </div>
  )
}

// =============================================================================
// ERROR STATES
// =============================================================================

function TableNotFound({ slug }: { slug: string }) {
  const router = useRouter()

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 py-16 text-center">
      <div className="rounded-full bg-destructive/10 p-4">
        <svg
          className="h-12 w-12 text-destructive"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      </div>
      <h1 className="mt-4 text-xl font-bold text-foreground">Masa Bulunamadı</h1>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        Bu QR kod geçersiz veya artık kullanılmıyor. Lütfen restorandaki başka bir QR
        kodu deneyin veya menüyü doğrudan görüntüleyin.
      </p>
      <button
        onClick={() => router.push(`/r/${slug}`)}
        className="mt-6 rounded-lg bg-primary-600 px-6 py-3 font-medium text-white transition-colors hover:bg-primary-700 active:scale-95"
      >
        Menüyü Görüntüle
      </button>
    </div>
  )
}

function RestaurantNotFound() {
  const router = useRouter()

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 py-16 text-center">
      <div className="rounded-full bg-destructive/10 p-4">
        <svg
          className="h-12 w-12 text-destructive"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>
      <h1 className="mt-4 text-xl font-bold text-foreground">Restoran Bulunamadı</h1>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        Bu restoran mevcut değil veya artık aktif değil.
      </p>
      <button
        onClick={() => router.push('/')}
        className="mt-6 rounded-lg bg-primary-600 px-6 py-3 font-medium text-white transition-colors hover:bg-primary-700 active:scale-95"
      >
        Ana Sayfaya Dön
      </button>
    </div>
  )
}

// =============================================================================
// LOADING STATE
// =============================================================================

function TableMenuLoading() {
  return (
    <div className="min-h-dvh">
      {/* Skeleton header */}
      <div className="relative h-40 bg-gradient-to-br from-muted to-muted-foreground/20 sm:h-48">
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
      </div>
      <div className="relative -mt-12 px-4 pb-4">
        <div className="flex items-end gap-4">
          <div className="h-20 w-20 rounded-xl bg-muted sm:h-24 sm:w-24" />
          <div className="flex-1 space-y-2 pb-1">
            <div className="h-6 w-48 rounded bg-muted" />
            <div className="h-4 w-32 rounded bg-muted" />
          </div>
        </div>
      </div>

      {/* Skeleton table banner */}
      <div className="bg-muted/50 px-4 py-2">
        <div className="mx-auto h-5 w-32 rounded bg-muted" />
      </div>

      {/* Skeleton content */}
      <MenuSkeleton />
    </div>
  )
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function TableMenuPage({ params }: TableMenuPageProps) {
  const [data, setData] = useState<MenuData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<'table' | 'restaurant' | null>(null)
  const [resolvedParams, setResolvedParams] = useState<{ slug: string; tableId: string } | null>(null)

  const setContext = useCartStore((state) => state.setContext)

  // Resolve params (Next.js 15+ returns Promise)
  useEffect(() => {
    params.then((p) => setResolvedParams(p))
  }, [params])

  // Fetch data when params are resolved
  useEffect(() => {
    if (!resolvedParams) return

    const fetchData = async () => {
      setIsLoading(true)
      setError(null)

      const result = await getTableMenuData(resolvedParams.slug, resolvedParams.tableId)

      if (!result) {
        // Check if organization exists
        const supabase = createClient()
        const { data: org } = await supabase
          .from('organizations')
          .select('id')
          .eq('slug', resolvedParams.slug)
          .eq('is_active', true)
          .single()

        if (!org) {
          setError('restaurant')
        } else {
          setError('table')
        }
        setIsLoading(false)
        return
      }

      setData(result)

      // Set cart context with table info
      setContext({
        organization_id: result.organization.id,
        organization_slug: result.organization.slug,
        organization_name: result.organization.name,
        table_id: result.table.id,
        table_name: result.table.name,
        currency: result.organization.currency,
      })

      // Save table context to localStorage for persistence
      saveTableContext({
        tableId: result.table.id,
        tableName: result.table.name,
        tableNumber: result.table.table_number,
        section: result.table.section,
        qrUuid: result.table.qr_uuid,
      })

      setIsLoading(false)
    }

    fetchData()
  }, [resolvedParams, setContext])

  // Loading state
  if (isLoading || !resolvedParams) {
    return <TableMenuLoading />
  }

  // Error states
  if (error === 'restaurant') {
    return <RestaurantNotFound />
  }

  if (error === 'table') {
    return <TableNotFound slug={resolvedParams.slug} />
  }

  // No data (shouldn't happen if no error)
  if (!data) {
    return <TableNotFound slug={resolvedParams.slug} />
  }

  const { organization, categories, products, table } = data

  return (
    <>
      {/* Table Context Banner - shown before menu content */}
      <TableContextBanner table={table} />

      {/* Menu View */}
      <MenuView
        organization={organization}
        categories={categories}
        products={products}
      />

      {/* Waiter Call Button */}
      <WaiterCallButton
        tableId={table.id}
        tableName={table.name}
        organizationId={organization.id}
      />

      {/* Add padding at bottom for the floating button */}
      <div className="h-20" aria-hidden="true" />
    </>
  )
}
