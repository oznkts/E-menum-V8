import { Suspense } from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'

import { createClient } from '@/lib/supabase/server'
import { SuccessAnimation } from './success-animation'

// =============================================================================
// TYPES
// =============================================================================

interface OrderConfirmationPageProps {
  params: Promise<{
    slug: string
  }>
  searchParams: Promise<{
    orderId?: string
    orderNumber?: string
  }>
}

// =============================================================================
// METADATA
// =============================================================================

export const metadata: Metadata = {
  title: 'Sipariş Onayı',
  description: 'Siparişiniz başarıyla alındı',
}

// =============================================================================
// DATA FETCHING
// =============================================================================

async function getOrderData(orderId: string | undefined, slug: string) {
  if (!orderId) {
    return { order: null, organization: null }
  }

  const supabase = await createClient()

  // Fetch organization by slug
  const { data: organization } = await supabase
    .from('organizations')
    .select('id, name, slug, logo_url, currency')
    .eq('slug', slug)
    .eq('is_active', true)
    .is('deleted_at', null)
    .single()

  if (!organization) {
    return { order: null, organization: null }
  }

  // Fetch order with items
  const { data: order } = await supabase
    .from('orders')
    .select(`
      id,
      order_number,
      status,
      order_type,
      total_amount,
      currency,
      table_name,
      customer_name,
      created_at,
      estimated_ready_at,
      order_items (
        id,
        product_name,
        quantity,
        item_total,
        currency
      )
    `)
    .eq('id', orderId)
    .eq('organization_id', organization.id)
    .single()

  return { order, organization }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function formatPrice(price: number, currency: string = 'TRY'): string {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(price)
}

function formatDateTime(dateString: string): string {
  const date = new Date(dateString)
  return new Intl.DateTimeFormat('tr-TR', {
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(date)
}

function formatTime(dateString: string): string {
  const date = new Date(dateString)
  return new Intl.DateTimeFormat('tr-TR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

// Status labels in Turkish
const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: 'Bekliyor',
  confirmed: 'Onaylandı',
  preparing: 'Hazırlanıyor',
  ready: 'Hazır',
  served: 'Servis Edildi',
  completed: 'Tamamlandı',
  cancelled: 'İptal Edildi',
}

const ORDER_STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  pending: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-800 dark:text-yellow-400' },
  confirmed: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-800 dark:text-blue-400' },
  preparing: { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-800 dark:text-orange-400' },
  ready: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-800 dark:text-green-400' },
  served: { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-800 dark:text-emerald-400' },
  completed: { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-800 dark:text-gray-400' },
  cancelled: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-800 dark:text-red-400' },
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

/**
 * Order Details Card
 */
function OrderDetailsCard({
  order,
  organization,
}: {
  order: NonNullable<Awaited<ReturnType<typeof getOrderData>>['order']>
  organization: NonNullable<Awaited<ReturnType<typeof getOrderData>>['organization']>
}) {
  const statusColors = ORDER_STATUS_COLORS[order.status] || ORDER_STATUS_COLORS.pending
  const statusLabel = ORDER_STATUS_LABELS[order.status] || order.status

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm">
      {/* Header */}
      <div className="border-b border-border px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {organization.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={organization.logo_url}
                alt={organization.name}
                className="h-10 w-10 rounded-lg object-cover"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-100 dark:bg-primary-900/30">
                <span className="text-lg font-bold text-primary-600">
                  {organization.name.charAt(0)}
                </span>
              </div>
            )}
            <div>
              <h3 className="font-medium text-foreground">{organization.name}</h3>
              {order.table_name && (
                <p className="text-sm text-muted-foreground">{order.table_name}</p>
              )}
            </div>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ${statusColors.bg} ${statusColors.text}`}
          >
            {statusLabel}
          </span>
        </div>
      </div>

      {/* Order Info */}
      <div className="space-y-3 px-4 py-4">
        {/* Order Number */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Sipariş No</span>
          <span className="font-mono font-semibold text-foreground">
            {order.order_number}
          </span>
        </div>

        {/* Order Time */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Sipariş Zamanı</span>
          <span className="text-sm text-foreground">
            {formatDateTime(order.created_at)}
          </span>
        </div>

        {/* Estimated Ready Time */}
        {order.estimated_ready_at && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Tahmini Hazır</span>
            <span className="text-sm font-medium text-primary-600">
              {formatTime(order.estimated_ready_at)}
            </span>
          </div>
        )}

        {/* Customer Name */}
        {order.customer_name && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Müşteri</span>
            <span className="text-sm text-foreground">{order.customer_name}</span>
          </div>
        )}
      </div>

      {/* Order Items */}
      {order.order_items && order.order_items.length > 0 && (
        <div className="border-t border-border px-4 py-4">
          <h4 className="mb-3 text-sm font-medium text-muted-foreground">
            Sipariş Detayları
          </h4>
          <div className="space-y-2">
            {order.order_items.map((item) => (
              <div key={item.id} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-5 min-w-5 items-center justify-center rounded bg-muted px-1.5 text-xs font-medium text-muted-foreground">
                    {item.quantity}x
                  </span>
                  <span className="text-sm text-foreground">{item.product_name}</span>
                </div>
                <span className="text-sm text-foreground">
                  {formatPrice(item.item_total, item.currency)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Total */}
      <div className="border-t border-border bg-muted/30 px-4 py-4">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-foreground">Toplam</span>
          <span className="text-lg font-bold text-primary-600">
            {formatPrice(order.total_amount, order.currency)}
          </span>
        </div>
      </div>
    </div>
  )
}

/**
 * Error State
 */
function OrderNotFound({ slug }: { slug: string }) {
  return (
    <div className="flex min-h-[60dvh] flex-col items-center justify-center px-6 text-center">
      <div className="rounded-full bg-yellow-100 p-4 dark:bg-yellow-900/30">
        <svg
          className="h-12 w-12 text-yellow-600 dark:text-yellow-400"
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
      <h1 className="mt-4 text-xl font-semibold text-foreground">
        Sipariş Bulunamadı
      </h1>
      <p className="mt-2 text-muted-foreground">
        Bu sipariş bilgisi bulunamadı veya süre dolmuş olabilir.
      </p>
      <Link
        href={`/r/${slug}`}
        className="mt-6 inline-flex h-12 items-center justify-center rounded-lg bg-primary-600 px-6 text-base font-medium text-white transition-colors hover:bg-primary-700"
      >
        Menüye Dön
      </Link>
    </div>
  )
}

/**
 * Loading Skeleton
 */
function OrderConfirmationSkeleton() {
  return (
    <div className="min-h-dvh px-4 py-8">
      <div className="mx-auto max-w-md animate-pulse space-y-6">
        <div className="flex flex-col items-center space-y-4">
          <div className="h-24 w-24 rounded-full bg-muted" />
          <div className="h-8 w-48 rounded bg-muted" />
          <div className="h-4 w-64 rounded bg-muted" />
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="space-y-3">
            <div className="h-6 w-full rounded bg-muted" />
            <div className="h-4 w-2/3 rounded bg-muted" />
            <div className="h-4 w-1/2 rounded bg-muted" />
          </div>
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// PAGE COMPONENT
// =============================================================================

/**
 * Order Confirmation Page
 *
 * Displays order confirmation after successful submission.
 * Features:
 * - Success animation
 * - Order details with order number
 * - Order items summary
 * - Status indicator
 * - Back to menu link
 *
 * URL Pattern: /r/[slug]/order-confirmation?orderId=xxx&orderNumber=xxx
 */
export default async function OrderConfirmationPage({
  params,
  searchParams,
}: OrderConfirmationPageProps) {
  const { slug } = await params
  const { orderId, orderNumber } = await searchParams

  const { order, organization } = await getOrderData(orderId, slug)

  // Show order not found if no order data
  if (!order || !organization) {
    // If we have an order number from URL, show a basic confirmation
    if (orderNumber) {
      return (
        <div className="min-h-dvh px-4 py-8">
          <div className="mx-auto max-w-md">
            {/* Success Header */}
            <div className="text-center">
              <SuccessAnimation />
              <h1 className="mt-6 text-2xl font-bold text-foreground">
                Siparişiniz Alındı!
              </h1>
              <p className="mt-2 text-muted-foreground">
                Siparişiniz başarıyla oluşturuldu ve mutfağımıza iletildi.
              </p>
            </div>

            {/* Order Number Card */}
            <div className="mt-8 rounded-xl border border-border bg-card p-6 text-center shadow-sm">
              <p className="text-sm text-muted-foreground">Sipariş Numaranız</p>
              <p className="mt-2 font-mono text-3xl font-bold tracking-wider text-primary-600">
                {orderNumber}
              </p>
              <p className="mt-4 text-sm text-muted-foreground">
                Bu numarayı siparişinizi takip etmek için saklayın.
              </p>
            </div>

            {/* What's Next */}
            <div className="mt-6 rounded-xl border border-border bg-muted/30 p-4">
              <h2 className="font-medium text-foreground">Sırada ne var?</h2>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <svg className="mt-0.5 h-5 w-5 shrink-0 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Siparişiniz mutfağa iletildi
                </li>
                <li className="flex items-start gap-2">
                  <svg className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" strokeWidth="2" />
                  </svg>
                  Hazırlanmaya başlanacak
                </li>
                <li className="flex items-start gap-2">
                  <svg className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" strokeWidth="2" />
                  </svg>
                  Hazır olduğunda masanıza servis edilecek
                </li>
              </ul>
            </div>

            {/* Payment Notice */}
            <div className="mt-6 flex items-start gap-3 rounded-lg border border-border px-4 py-3">
              <svg
                className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              <p className="text-sm text-muted-foreground">
                Ödemenizi sipariş servis edildikten sonra masada yapabilirsiniz.
              </p>
            </div>

            {/* Back to Menu Button */}
            <div className="mt-8">
              <Link
                href={`/r/${slug}`}
                className="flex h-12 w-full items-center justify-center rounded-lg border border-border bg-card font-medium text-foreground transition-colors hover:bg-muted"
              >
                <svg
                  className="mr-2 h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 19l-7-7m0 0l7-7m-7 7h18"
                  />
                </svg>
                Menüye Dön
              </Link>
            </div>
          </div>
        </div>
      )
    }

    return <OrderNotFound slug={slug} />
  }

  return (
    <Suspense fallback={<OrderConfirmationSkeleton />}>
      <div className="min-h-dvh px-4 py-8">
        <div className="mx-auto max-w-md">
          {/* Success Header */}
          <div className="text-center">
            <SuccessAnimation />
            <h1 className="mt-6 text-2xl font-bold text-foreground">
              Siparişiniz Alındı!
            </h1>
            <p className="mt-2 text-muted-foreground">
              Siparişiniz başarıyla oluşturuldu ve mutfağımıza iletildi.
            </p>
          </div>

          {/* Order Number Highlight */}
          <div className="mt-8 rounded-xl border-2 border-primary-200 bg-primary-50 p-4 text-center dark:border-primary-800 dark:bg-primary-950/30">
            <p className="text-sm text-primary-700 dark:text-primary-400">
              Sipariş Numaranız
            </p>
            <p className="mt-1 font-mono text-3xl font-bold tracking-wider text-primary-600">
              {order.order_number}
            </p>
          </div>

          {/* Order Details */}
          <div className="mt-6">
            <OrderDetailsCard order={order} organization={organization} />
          </div>

          {/* What's Next */}
          <div className="mt-6 rounded-xl border border-border bg-muted/30 p-4">
            <h2 className="font-medium text-foreground">Sırada ne var?</h2>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <svg className="mt-0.5 h-5 w-5 shrink-0 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Siparişiniz mutfağa iletildi
              </li>
              <li className="flex items-start gap-2">
                {order.status === 'preparing' ? (
                  <svg className="mt-0.5 h-5 w-5 shrink-0 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" strokeWidth="2" />
                  </svg>
                )}
                Hazırlanmaya başlanacak
              </li>
              <li className="flex items-start gap-2">
                {order.status === 'ready' || order.status === 'served' ? (
                  <svg className="mt-0.5 h-5 w-5 shrink-0 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" strokeWidth="2" />
                  </svg>
                )}
                Hazır olduğunda masanıza servis edilecek
              </li>
            </ul>
          </div>

          {/* Payment Notice */}
          <div className="mt-6 flex items-start gap-3 rounded-lg border border-border px-4 py-3">
            <svg
              className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            <p className="text-sm text-muted-foreground">
              Ödemenizi sipariş servis edildikten sonra masada yapabilirsiniz.
            </p>
          </div>

          {/* Back to Menu Button */}
          <div className="mt-8">
            <Link
              href={`/r/${slug}`}
              className="flex h-12 w-full items-center justify-center rounded-lg border border-border bg-card font-medium text-foreground transition-colors hover:bg-muted"
            >
              <svg
                className="mr-2 h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
              Menüye Dön
            </Link>
          </div>

          {/* New Order Button */}
          <div className="mt-3">
            <Link
              href={`/r/${slug}`}
              className="flex h-12 w-full items-center justify-center rounded-lg bg-primary-600 font-medium text-white transition-colors hover:bg-primary-700"
            >
              <svg
                className="mr-2 h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Yeni Sipariş Ver
            </Link>
          </div>
        </div>
      </div>
    </Suspense>
  )
}
