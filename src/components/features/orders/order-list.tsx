'use client'

/**
 * OrderList Component
 *
 * A list component for displaying and filtering orders.
 * Provides status filtering, search, and real-time updates.
 *
 * Features:
 * - Status tab filtering
 * - Search by order number or customer name
 * - Grid layout with responsive design
 * - Empty state handling
 * - Loading skeleton
 *
 * @example
 * ```tsx
 * <OrderList
 *   orders={orders}
 *   isLoading={isLoading}
 *   onStatusChange={(orderId, newStatus) => updateOrderStatus(orderId, newStatus)}
 * />
 * ```
 */

import { useState, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { OrderCard, type OrderWithItems } from './order-card'
import type { OrderStatus } from '@/types/database'

// =============================================================================
// TYPES
// =============================================================================

interface OrderListProps {
  /** Array of orders to display */
  orders: OrderWithItems[]
  /** Is data loading */
  isLoading?: boolean
  /** Callback when order status is changed */
  onStatusChange?: (orderId: string, newStatus: OrderStatus) => Promise<void>
  /** Callback when order details are requested */
  onViewDetails?: (order: OrderWithItems) => void
  /** Called after successful mutation to refresh data */
  onRefetch?: () => void
}

// =============================================================================
// CONSTANTS
// =============================================================================

type StatusFilter = OrderStatus | 'all' | 'active'

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'Tümü' },
  { value: 'active', label: 'Aktif' },
  { value: 'pending', label: 'Beklemede' },
  { value: 'confirmed', label: 'Onaylı' },
  { value: 'preparing', label: 'Hazırlanıyor' },
  { value: 'ready', label: 'Hazır' },
  { value: 'served', label: 'Servis Edildi' },
  { value: 'completed', label: 'Tamamlanan' },
  { value: 'cancelled', label: 'İptal' },
]

/** Active order statuses (not completed or cancelled) */
const ACTIVE_STATUSES: OrderStatus[] = ['pending', 'confirmed', 'preparing', 'ready', 'served']

// =============================================================================
// ICONS
// =============================================================================

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  )
}

function ClipboardIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2" />
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
    </svg>
  )
}

// =============================================================================
// COMPONENT
// =============================================================================

export function OrderList({
  orders,
  isLoading = false,
  onStatusChange,
  onViewDetails,
}: OrderListProps) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active')
  const [searchQuery, setSearchQuery] = useState('')

  // ==========================================================================
  // FILTERED DATA
  // ==========================================================================

  const filteredOrders = useMemo(() => {
    let result = [...orders]

    // Apply status filter
    if (statusFilter === 'active') {
      result = result.filter((order) => ACTIVE_STATUSES.includes(order.status))
    } else if (statusFilter !== 'all') {
      result = result.filter((order) => order.status === statusFilter)
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      result = result.filter((order) =>
        order.order_number.toLowerCase().includes(query) ||
        order.customer_name?.toLowerCase().includes(query) ||
        order.table_name?.toLowerCase().includes(query)
      )
    }

    // Sort by created_at descending (newest first)
    result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    return result
  }, [orders, statusFilter, searchQuery])

  // ==========================================================================
  // STATUS COUNTS
  // ==========================================================================

  const statusCounts = useMemo(() => {
    const counts: Record<StatusFilter, number> = {
      all: orders.length,
      active: orders.filter((o) => ACTIVE_STATUSES.includes(o.status)).length,
      pending: orders.filter((o) => o.status === 'pending').length,
      confirmed: orders.filter((o) => o.status === 'confirmed').length,
      preparing: orders.filter((o) => o.status === 'preparing').length,
      ready: orders.filter((o) => o.status === 'ready').length,
      served: orders.filter((o) => o.status === 'served').length,
      completed: orders.filter((o) => o.status === 'completed').length,
      cancelled: orders.filter((o) => o.status === 'cancelled').length,
    }
    return counts
  }, [orders])

  // ==========================================================================
  // HANDLERS
  // ==========================================================================

  const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    if (onStatusChange) {
      await onStatusChange(orderId, newStatus)
    }
  }

  // ==========================================================================
  // LOADING STATE
  // ==========================================================================

  if (isLoading) {
    return (
      <div className="space-y-4">
        {/* Filter skeleton */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="h-9 w-20 animate-pulse rounded-full bg-muted"
            />
          ))}
        </div>
        {/* Cards skeleton */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="h-48 animate-pulse rounded-lg border bg-muted/40"
            />
          ))}
        </div>
      </div>
    )
  }

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <div className="space-y-4">
      {/* Filters Section */}
      <div className="space-y-3">
        {/* Status Filter Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {STATUS_FILTERS.map((filter) => {
            const count = statusCounts[filter.value]
            const isActive = statusFilter === filter.value
            return (
              <Button
                key={filter.value}
                variant={isActive ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter(filter.value)}
                className={`flex-shrink-0 ${
                  isActive ? '' : 'bg-background hover:bg-accent'
                }`}
              >
                {filter.label}
                {count > 0 && (
                  <span
                    className={`ml-1.5 rounded-full px-1.5 py-0.5 text-xs ${
                      isActive
                        ? 'bg-primary-foreground/20 text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {count}
                  </span>
                )}
              </Button>
            )
          })}
        </div>

        {/* Search */}
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Sipariş no, müşteri adı veya masa ara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Orders Grid or Empty State */}
      {filteredOrders.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-muted p-4">
              <ClipboardIcon className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="mt-4 text-lg font-semibold">
              {searchQuery || statusFilter !== 'all'
                ? 'Sipariş bulunamadı'
                : 'Henüz sipariş yok'}
            </h3>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              {searchQuery || statusFilter !== 'all'
                ? 'Arama kriterlerinizi değiştirin veya filtreleri temizleyin.'
                : 'Müşterileriniz sipariş verdiğinde burada görünecek.'}
            </p>
            {(searchQuery || statusFilter !== 'all') && (
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => {
                  setSearchQuery('')
                  setStatusFilter('all')
                }}
              >
                Filtreleri Temizle
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredOrders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              onStatusChange={(newStatus) => handleStatusChange(order.id, newStatus)}
              onViewDetails={onViewDetails ? () => onViewDetails(order) : undefined}
            />
          ))}
        </div>
      )}

      {/* Results count */}
      {filteredOrders.length > 0 && (
        <p className="text-center text-sm text-muted-foreground">
          {filteredOrders.length === orders.length
            ? `${orders.length} sipariş`
            : `${orders.length} siparişten ${filteredOrders.length} tanesi gösteriliyor`}
        </p>
      )}
    </div>
  )
}
