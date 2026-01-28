'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useOrganization } from '@/lib/hooks/use-organization'
import { useSuperadmin } from '@/lib/hooks/use-superadmin'
import { createClient } from '@/lib/supabase/client'

// =============================================================================
// STAT CARD COMPONENT
// =============================================================================

interface StatCardProps {
  title: string
  value: string | number
  description: string
  icon: React.ReactNode
  trend?: {
    value: number
    isPositive: boolean
  }
  href?: string
}

function StatCard({ title, value, description, icon, trend, href }: StatCardProps) {
  const content = (
    <Card className="relative overflow-hidden transition-shadow hover:shadow-md">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className="rounded-md bg-primary-100 p-2 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400">
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">{value}</div>
        <div className="mt-1 flex items-center gap-2">
          {trend && (
            <span
              className={`flex items-center text-xs font-medium ${
                trend.isPositive
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-red-600 dark:text-red-400'
              }`}
            >
              {trend.isPositive ? (
                <svg
                  className="mr-0.5 h-3 w-3"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M7 17l5-5 5 5M7 7l5 5 5-5" />
                </svg>
              ) : (
                <svg
                  className="mr-0.5 h-3 w-3"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M7 7l5 5 5-5M7 17l5-5 5 5" />
                </svg>
              )}
              {trend.value}%
            </span>
          )}
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </CardContent>
    </Card>
  )

  if (href) {
    return (
      <Link href={href} className="block">
        {content}
      </Link>
    )
  }

  return content
}

// =============================================================================
// QUICK ACTION CARD COMPONENT
// =============================================================================

interface QuickActionCardProps {
  title: string
  description: string
  icon: React.ReactNode
  href: string
  variant?: 'default' | 'highlight'
}

function QuickActionCard({
  title,
  description,
  icon,
  href,
  variant = 'default',
}: QuickActionCardProps) {
  return (
    <Link href={href} className="block">
      <Card
        className={`group h-full transition-all hover:shadow-md ${
          variant === 'highlight'
            ? 'border-primary-200 bg-primary-50/50 dark:border-primary-900/50 dark:bg-primary-900/10'
            : ''
        }`}
      >
        <CardContent className="flex items-start gap-4 p-4">
          <div
            className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg transition-colors ${
              variant === 'highlight'
                ? 'bg-primary-100 text-primary-600 group-hover:bg-primary-200 dark:bg-primary-900/30 dark:text-primary-400'
                : 'bg-muted text-muted-foreground group-hover:bg-muted/80'
            }`}
          >
            {icon}
          </div>
          <div className="flex-1 space-y-1">
            <h3 className="font-medium leading-tight">{title}</h3>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
          <svg
            className="h-5 w-5 flex-shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </CardContent>
      </Card>
    </Link>
  )
}

// =============================================================================
// ONBOARDING STEP COMPONENT
// =============================================================================

interface OnboardingStepProps {
  step: number
  title: string
  description: string
  isComplete: boolean
  isActive: boolean
  href: string
}

function OnboardingStep({
  step,
  title,
  description,
  isComplete,
  isActive,
  href,
}: OnboardingStepProps) {
  return (
    <Link href={href} className="block">
      <div
        className={`flex items-start gap-3 rounded-lg border p-4 transition-all hover:shadow-sm ${
          isComplete
            ? 'border-green-200 bg-green-50/50 dark:border-green-900/50 dark:bg-green-900/10'
            : isActive
              ? 'border-primary-200 bg-primary-50/50 dark:border-primary-900/50 dark:bg-primary-900/10'
              : 'border-border bg-card'
        }`}
      >
        <div
          className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-sm font-medium ${
            isComplete
              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
              : isActive
                ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400'
                : 'bg-muted text-muted-foreground'
          }`}
        >
          {isComplete ? (
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M20 6L9 17l-5-5" />
            </svg>
          ) : (
            step
          )}
        </div>
        <div className="flex-1">
          <h3 className="font-medium">{title}</h3>
          <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
    </Link>
  )
}

// =============================================================================
// ACTIVITY ITEM COMPONENT
// =============================================================================

interface ActivityItemProps {
  type: 'order' | 'menu' | 'qr' | 'table'
  title: string
  time: string
  description?: string
}

function ActivityItem({ type, title, time, description }: ActivityItemProps) {
  const icons = {
    order: (
      <svg
        className="h-4 w-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M16 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V8l-5-5z" />
        <path d="M15 3v5h6M7 13h10M7 17h6" />
      </svg>
    ),
    menu: (
      <svg
        className="h-4 w-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4zM3 6h18M16 10a4 4 0 01-8 0" />
      </svg>
    ),
    qr: (
      <svg
        className="h-4 w-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <path d="M14 14h3v3h-3zM17 17h3v3h-3zM14 17h3v3h-3z" />
      </svg>
    ),
    table: (
      <svg
        className="h-4 w-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <rect x="3" y="4" width="18" height="14" rx="2" />
        <path d="M3 10h18M7 20v-2M17 20v-2" />
      </svg>
    ),
  }

  const colors = {
    order: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    menu: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
    qr: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
    table: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
  }

  return (
    <div className="flex items-start gap-3 py-3">
      <div className={`flex h-8 w-8 items-center justify-center rounded-full ${colors[type]}`}>
        {icons[type]}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{title}</p>
        {description && (
          <p className="text-sm text-muted-foreground truncate">{description}</p>
        )}
      </div>
      <span className="text-xs text-muted-foreground whitespace-nowrap">{time}</span>
    </div>
  )
}

// =============================================================================
// MAIN DASHBOARD PAGE
// =============================================================================

/**
 * Dashboard Home Page
 *
 * Overview page showing key metrics, quick actions, and recent activity.
 * Provides a comprehensive view of the restaurant's current status.
 *
 * Widgets included:
 * - Quick stats: Orders today, menu items, QR scans, active tables
 * - Quick actions: Common tasks for restaurant management
 * - Getting started guide: Onboarding steps for new users
 * - Recent activity: Latest events in the restaurant
 *
 * All data is currently static/placeholder - will be connected to
 * real data via TanStack Query in future phases.
 */
export default function DashboardPage() {
  const router = useRouter()
  const { isSuperadmin, isLoading: isSuperadminLoading } = useSuperadmin()
  const { currentOrg, isLoading: orgLoading } = useOrganization()

  // Redirect superadmin to admin panel
  useEffect(() => {
    if (!isSuperadminLoading && isSuperadmin) {
      router.push('/admin')
    }
  }, [isSuperadmin, isSuperadminLoading, router])

  // Fetch today's orders
  const { data: ordersData } = useQuery({
    queryKey: ['dashboard', 'orders', 'today', currentOrg?.id],
    queryFn: async () => {
      if (!currentOrg?.id) return { orders: [], count: 0 }
      const supabase = createClient()
      
      // Get today's date range
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)

      const { data: orders, error } = await supabase
        .from('orders')
        .select('id, status, created_at')
        .eq('organization_id', currentOrg.id)
        .gte('created_at', today.toISOString())
        .lt('created_at', tomorrow.toISOString())
        .neq('status', 'cancelled')

      if (error) {
        console.error('[Dashboard] Error fetching orders:', error)
        return { orders: [], count: 0 }
      }

      return { orders: orders || [], count: orders?.length || 0 }
    },
    enabled: !!currentOrg?.id,
    staleTime: 30 * 1000, // 30 seconds
  })

  // Fetch products count
  const { data: productsData } = useQuery({
    queryKey: ['dashboard', 'products', currentOrg?.id],
    queryFn: async () => {
      if (!currentOrg?.id) return { count: 0 }
      const supabase = createClient()
      
      // Try to fetch products - handle both with and without is_active column
      const { data: products, error } = await supabase
        .from('products')
        .select('id')
        .eq('organization_id', currentOrg.id)

      if (error) {
        console.error('[Dashboard] Error fetching products:', error.message || error)
        return { count: 0 }
      }

      return { count: products?.length || 0 }
    },
    enabled: !!currentOrg?.id,
    staleTime: 60 * 1000, // 1 minute
  })

  // Calculate stats
  const stats = {
    ordersToday: ordersData?.count || 0,
    menuItems: productsData?.count || 0,
    qrScans: 0, // TODO: Implement QR scan tracking
    activeTables: 0, // TODO: Implement table status tracking
    totalTables: 0, // TODO: Implement table count
  }

  // Onboarding state - will be fetched from organization settings
  const onboardingComplete = {
    categories: productsData && productsData.count > 0, // If there are products, categories likely exist
    products: (productsData?.count || 0) > 0,
    qrCodes: false, // TODO: Check if QR codes exist
  }

  const isLoading = orgLoading

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <svg className="h-8 w-8 animate-spin text-primary" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="text-sm text-muted-foreground">Yükleniyor...</p>
        </div>
      </div>
    )
  }

  if (!currentOrg) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <p className="text-muted-foreground">Lütfen bir organizasyon seçin.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
            Kontrol Paneli
          </h1>
          <p className="mt-1 text-muted-foreground">
            Restoranınızın genel durumunu buradan takip edebilirsiniz.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/dashboard/orders">
              <svg
                className="mr-2 h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M16 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V8l-5-5z" />
                <path d="M15 3v5h6M7 13h10M7 17h6" />
              </svg>
              Siparişler
            </Link>
          </Button>
          <Button asChild>
            <Link href="/dashboard/products">
              <svg
                className="mr-2 h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M12 5v14M5 12h14" />
              </svg>
              Ürün Ekle
            </Link>
          </Button>
        </div>
      </div>

      {/* Quick stats grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Bugünkü Siparişler"
          value={stats.ordersToday}
          description={stats.ordersToday === 0 ? 'Henüz sipariş yok' : 'bugün alındı'}
          icon={
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M16 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V8l-5-5z" />
              <path d="M15 3v5h6M7 13h10M7 17h6" />
            </svg>
          }
          href="/dashboard/orders"
        />

        <StatCard
          title="Menü Ürünleri"
          value={stats.menuItems}
          description={stats.menuItems === 0 ? 'Menünüzü oluşturun' : 'aktif ürün'}
          icon={
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4zM3 6h18M16 10a4 4 0 01-8 0" />
            </svg>
          }
          href="/dashboard/products"
        />

        <StatCard
          title="QR Taramaları"
          value={stats.qrScans}
          description={stats.qrScans === 0 ? 'Bugün taranmadı' : 'bugün tarandı'}
          icon={
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <path d="M14 14h3v3h-3zM17 17h3v3h-3zM14 17h3v3h-3z" />
            </svg>
          }
          href="/dashboard/analytics"
        />

        <StatCard
          title="Aktif Masalar"
          value={`${stats.activeTables} / ${stats.totalTables}`}
          description={stats.totalTables === 0 ? 'Masa tanımlayın' : 'masa dolu'}
          icon={
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect x="3" y="4" width="18" height="14" rx="2" />
              <path d="M3 10h18M7 20v-2M17 20v-2" />
            </svg>
          }
          href="/dashboard/tables"
        />
      </div>

      {/* Main content grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column - Getting started & Quick actions */}
        <div className="space-y-6 lg:col-span-2">
          {/* Getting started guide */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Hızlı Başlangıç</CardTitle>
              <CardDescription>
                Restoranınızı kurmak için aşağıdaki adımları takip edin.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-3">
              <OnboardingStep
                step={1}
                title="Kategoriler Oluşturun"
                description="Yiyecekler, İçecekler vb."
                isComplete={onboardingComplete.categories}
                isActive={!onboardingComplete.categories}
                href="/dashboard/categories"
              />
              <OnboardingStep
                step={2}
                title="Ürünler Ekleyin"
                description="Fiyatları belirleyin"
                isComplete={onboardingComplete.products}
                isActive={onboardingComplete.categories && !onboardingComplete.products}
                href="/dashboard/products"
              />
              <OnboardingStep
                step={3}
                title="QR Kodlar Oluşturun"
                description="Masalar için yazdırın"
                isComplete={onboardingComplete.qrCodes}
                isActive={onboardingComplete.products && !onboardingComplete.qrCodes}
                href="/dashboard/qr-codes"
              />
            </CardContent>
          </Card>

          {/* Quick actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Hızlı İşlemler</CardTitle>
              <CardDescription>
                En sık kullanılan işlemlere hızlıca erişin.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <QuickActionCard
                title="Yeni Kategori"
                description="Menünüze kategori ekleyin"
                icon={
                  <svg
                    className="h-5 w-5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
                    <path d="M12 11v6M9 14h6" />
                  </svg>
                }
                href="/dashboard/categories"
                variant="highlight"
              />
              <QuickActionCard
                title="Yeni Ürün"
                description="Menünüze ürün ekleyin"
                icon={
                  <svg
                    className="h-5 w-5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4zM3 6h18M16 10a4 4 0 01-8 0" />
                  </svg>
                }
                href="/dashboard/products"
              />
              <QuickActionCard
                title="QR Kod Oluştur"
                description="Masa için QR kod üretin"
                icon={
                  <svg
                    className="h-5 w-5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <rect x="3" y="3" width="7" height="7" rx="1" />
                    <rect x="14" y="3" width="7" height="7" rx="1" />
                    <rect x="3" y="14" width="7" height="7" rx="1" />
                    <path d="M14 14h3v3h-3zM17 17h3v3h-3zM14 17h3v3h-3z" />
                  </svg>
                }
                href="/dashboard/qr-codes"
              />
              <QuickActionCard
                title="Ayarlar"
                description="Restoran bilgilerinizi düzenleyin"
                icon={
                  <svg
                    className="h-5 w-5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M12.22 2h-.44a2 2 0 00-2 2v.18a2 2 0 01-1 1.73l-.43.25a2 2 0 01-2 0l-.15-.08a2 2 0 00-2.73.73l-.22.38a2 2 0 00.73 2.73l.15.1a2 2 0 011 1.72v.51a2 2 0 01-1 1.74l-.15.09a2 2 0 00-.73 2.73l.22.38a2 2 0 002.73.73l.15-.08a2 2 0 012 0l.43.25a2 2 0 011 1.73V20a2 2 0 002 2h.44a2 2 0 002-2v-.18a2 2 0 011-1.73l.43-.25a2 2 0 012 0l.15.08a2 2 0 002.73-.73l.22-.39a2 2 0 00-.73-2.73l-.15-.08a2 2 0 01-1-1.74v-.5a2 2 0 011-1.74l.15-.09a2 2 0 00.73-2.73l-.22-.38a2 2 0 00-2.73-.73l-.15.08a2 2 0 01-2 0l-.43-.25a2 2 0 01-1-1.73V4a2 2 0 00-2-2z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                }
                href="/dashboard/settings"
              />
            </CardContent>
          </Card>
        </div>

        {/* Right column - Recent activity */}
        <div className="space-y-6">
          <Card className="h-fit">
            <CardHeader>
              <CardTitle className="text-lg">Son Aktiviteler</CardTitle>
              <CardDescription>
                Restoranınızdaki son gelişmeler
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Empty state */}
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="rounded-full bg-muted p-3">
                  <svg
                    className="h-6 w-6 text-muted-foreground"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                </div>
                <h3 className="mt-4 font-medium">Henüz aktivite yok</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Sipariş ve menü işlemleri burada görünecek.
                </p>
              </div>

              {/* Example activity items (commented out - will be shown when there's real data) */}
              {/*
              <div className="divide-y">
                <ActivityItem
                  type="order"
                  title="Yeni sipariş alındı"
                  description="Masa 5 - 3 ürün"
                  time="2 dk önce"
                />
                <ActivityItem
                  type="menu"
                  title="Ürün güncellendi"
                  description="Karışık Pizza - Fiyat değişikliği"
                  time="15 dk önce"
                />
                <ActivityItem
                  type="qr"
                  title="QR tarandı"
                  description="Masa 3"
                  time="1 saat önce"
                />
                <ActivityItem
                  type="table"
                  title="Masa durumu değişti"
                  description="Masa 7 - Boşaltıldı"
                  time="2 saat önce"
                />
              </div>
              */}
            </CardContent>
          </Card>

          {/* Help card */}
          <Card className="border-primary-200 bg-primary-50/50 dark:border-primary-900/50 dark:bg-primary-900/10">
            <CardContent className="flex items-start gap-4 p-4">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400">
                <svg
                  className="h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3M12 17h.01" />
                </svg>
              </div>
              <div className="flex-1 space-y-1">
                <h3 className="font-medium">Yardıma mı ihtiyacınız var?</h3>
                <p className="text-sm text-muted-foreground">
                  Sorularınız için destek ekibimize ulaşabilirsiniz.
                </p>
                <Button variant="link" className="h-auto p-0 text-primary-600 dark:text-primary-400">
                  Destek Al
                  <svg
                    className="ml-1 h-3 w-3"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

    </div>
  )
}
