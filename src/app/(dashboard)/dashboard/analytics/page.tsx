'use client'

import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useOrganization } from '@/lib/hooks/use-organization'
import { fetchOrderStatistics } from '@/lib/actions/analytics'

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
}

function StatCard({ title, value, description, icon, trend }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className="rounded-md bg-muted p-2 text-muted-foreground">
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
}

// =============================================================================
// MAIN PAGE
// =============================================================================

/**
 * Analytics Dashboard Page
 *
 * Displays key business metrics and analytics for the restaurant.
 */
export default function AnalyticsPage() {
  const { currentOrg, isLoading: orgLoading } = useOrganization()

  // Calculate date range for this month
  const now = new Date()
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

  // Fetch order statistics
  const { data: statsResponse, isLoading: statsLoading, error: statsError } = useQuery({
    queryKey: ['analytics', currentOrg?.id, firstDayOfMonth.toISOString(), lastDayOfMonth.toISOString()],
    queryFn: async () => {
      if (!currentOrg?.id) {
        console.log('[Analytics] No organization ID')
        return null
      }
      console.log('[Analytics] Fetching stats for org:', currentOrg.id)
      console.log('[Analytics] Date range:', firstDayOfMonth.toISOString(), 'to', lastDayOfMonth.toISOString())
      const result = await fetchOrderStatistics(
        currentOrg.id,
        firstDayOfMonth.toISOString(),
        lastDayOfMonth.toISOString()
      )
      console.log('[Analytics] Stats result:', result)
      return result
    },
    enabled: !!currentOrg?.id,
    staleTime: 60 * 1000, // 1 minute
  })

  if (statsError) {
    console.error('[Analytics] Error:', statsError)
  }

  const stats = statsResponse || {
    totalOrders: 0,
    totalRevenue: 0,
    averageOrderValue: 0,
    completedOrders: 0,
    cancelledOrders: 0,
    ordersByType: {},
    ordersByStatus: {},
  }

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  }

  const isLoading = orgLoading || statsLoading

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
        <p className="text-muted-foreground">Organizasyon seçilmedi</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
          Analitik
        </h1>
        <p className="mt-1 text-muted-foreground">
          Restoran performansinizi takip edin ve analiz edin.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="Toplam Siparis"
          value={stats.totalOrders}
          description="bu ay"
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
        />

        <StatCard
          title="Toplam Gelir"
          value={formatCurrency(stats.totalRevenue)}
          description="bu ay"
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
              <line x1="12" y1="1" x2="12" y2="23" />
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          }
        />

        <StatCard
          title="Ortalama Siparis"
          value={formatCurrency(stats.averageOrderValue)}
          description="siparis basina"
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
              <circle cx="12" cy="12" r="10" />
              <path d="M16 8l-8 8M8 8l8 8" />
            </svg>
          }
        />

        <StatCard
          title="Menu Goruntulenme"
          value={0}
          description="bu ay"
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
              <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          }
        />

        <StatCard
          title="QR Taramalari"
          value={0}
          description="bu ay"
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
        />

        <StatCard
          title="En Populer Urun"
          value="-"
          description="bu ay"
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
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
          }
        />
      </div>

      {/* Charts Section - Placeholder */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Revenue Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Gelir Grafigi</CardTitle>
            <CardDescription>
              Aylik gelir trendi
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-border">
              <div className="text-center">
                <svg
                  className="mx-auto h-12 w-12 text-muted-foreground/50"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M18 20V10M12 20V4M6 20v-6" />
                </svg>
                <p className="mt-2 text-sm text-muted-foreground">
                  Veri toplandikca grafik burada gorunecek
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Popular Items Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Populer Urunler</CardTitle>
            <CardDescription>
              En cok satilan urunler
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-border">
              <div className="text-center">
                <svg
                  className="mx-auto h-12 w-12 text-muted-foreground/50"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M21.21 15.89A10 10 0 118 2.83M22 12A10 10 0 0012 2v10z" />
                </svg>
                <p className="mt-2 text-sm text-muted-foreground">
                  Siparis verildikce veriler burada gorunecek
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

    </div>
  )
}
