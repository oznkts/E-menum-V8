'use client'

/**
 * OrderCard Component
 *
 * A card component for displaying order information in the dashboard.
 * Supports status updates and displays order details.
 *
 * Features:
 * - Order number and table info display
 * - Status badge with color coding
 * - Customer name and notes
 * - Total amount display
 * - Items count
 * - Time elapsed since order
 * - Status update dropdown
 *
 * @example
 * ```tsx
 * <OrderCard
 *   order={order}
 *   onStatusChange={(newStatus) => handleStatusChange(order.id, newStatus)}
 * />
 * ```
 */

import { useState, useTransition } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { Order, OrderStatus, OrderItem } from '@/types/database'

// =============================================================================
// TYPES
// =============================================================================

export interface OrderWithItems extends Order {
  items?: OrderItem[]
  item_count?: number
}

interface OrderCardProps {
  /** Order data to display */
  order: OrderWithItems
  /** Callback when status is changed */
  onStatusChange?: (newStatus: OrderStatus) => Promise<void>
  /** Callback when card is clicked for details */
  onViewDetails?: () => void
}

// =============================================================================
// CONSTANTS
// =============================================================================

/** Order status configuration with labels and colors */
const ORDER_STATUS_CONFIG: Record<OrderStatus, { label: string; color: string; bgColor: string }> = {
  pending: {
    label: 'Beklemede',
    color: 'text-yellow-700 dark:text-yellow-400',
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
  },
  confirmed: {
    label: 'Onaylandı',
    color: 'text-blue-700 dark:text-blue-400',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
  },
  preparing: {
    label: 'Hazırlanıyor',
    color: 'text-orange-700 dark:text-orange-400',
    bgColor: 'bg-orange-100 dark:bg-orange-900/30',
  },
  ready: {
    label: 'Hazır',
    color: 'text-green-700 dark:text-green-400',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
  },
  served: {
    label: 'Servis Edildi',
    color: 'text-purple-700 dark:text-purple-400',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
  },
  completed: {
    label: 'Tamamlandı',
    color: 'text-gray-700 dark:text-gray-400',
    bgColor: 'bg-gray-100 dark:bg-gray-900/30',
  },
  cancelled: {
    label: 'İptal Edildi',
    color: 'text-red-700 dark:text-red-400',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
  },
}

/** Valid status transitions */
const STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['preparing', 'cancelled'],
  preparing: ['ready', 'cancelled'],
  ready: ['served', 'cancelled'],
  served: ['completed'],
  completed: [],
  cancelled: [],
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Format price for display in Turkish locale
 */
function formatPrice(price: number, currency: string = 'TRY'): string {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(price)
}

/**
 * Calculate time elapsed since order creation
 */
function getTimeElapsed(createdAt: string): string {
  const now = new Date()
  const created = new Date(createdAt)
  const diffMs = now.getTime() - created.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))

  if (diffMins < 1) return 'Az önce'
  if (diffMins < 60) return `${diffMins} dk önce`

  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours} saat önce`

  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays} gün önce`
}

/**
 * Format order type for display
 */
function formatOrderType(type: string): string {
  switch (type) {
    case 'dine_in':
      return 'Masada'
    case 'takeaway':
      return 'Paket'
    case 'delivery':
      return 'Teslimat'
    default:
      return type
  }
}

// =============================================================================
// ICONS
// =============================================================================

function ClockIcon({ className }: { className?: string }) {
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
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  )
}

function TableIcon({ className }: { className?: string }) {
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
      <rect x="3" y="4" width="18" height="14" rx="2" />
      <path d="M3 10h18M7 20v-2M17 20v-2" />
    </svg>
  )
}

function UserIcon({ className }: { className?: string }) {
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
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}

function ChevronDownIcon({ className }: { className?: string }) {
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
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

function PackageIcon({ className }: { className?: string }) {
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
      <line x1="16.5" y1="9.4" x2="7.5" y2="4.21" />
      <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  )
}

// =============================================================================
// COMPONENT
// =============================================================================

export function OrderCard({
  order,
  onStatusChange,
  onViewDetails,
}: OrderCardProps) {
  const [isPending, startTransition] = useTransition()
  const [showStatusDropdown, setShowStatusDropdown] = useState(false)

  const statusConfig = ORDER_STATUS_CONFIG[order.status]
  const nextStatuses = STATUS_TRANSITIONS[order.status]
  const itemCount = order.item_count ?? order.items?.length ?? 0

  // ==========================================================================
  // HANDLERS
  // ==========================================================================

  const handleStatusChange = (newStatus: OrderStatus) => {
    if (!onStatusChange) return

    startTransition(async () => {
      await onStatusChange(newStatus)
      setShowStatusDropdown(false)
    })
  }

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <Card
      className={`relative overflow-hidden transition-all hover:shadow-md ${
        order.status === 'cancelled' ? 'opacity-60' : ''
      }`}
    >
      <CardHeader className="space-y-0 pb-2">
        <div className="flex items-start justify-between gap-2">
          {/* Order Number & Type */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold">#{order.order_number}</span>
              <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium">
                {formatOrderType(order.order_type)}
              </span>
            </div>
          </div>

          {/* Status Badge with Dropdown */}
          <div className="relative">
            <button
              onClick={() => nextStatuses.length > 0 && setShowStatusDropdown(!showStatusDropdown)}
              disabled={nextStatuses.length === 0 || isPending}
              className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-colors ${statusConfig.bgColor} ${statusConfig.color} ${
                nextStatuses.length > 0 ? 'cursor-pointer hover:opacity-80' : 'cursor-default'
              }`}
            >
              {isPending ? (
                <svg className="h-3 w-3 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : (
                <>
                  {statusConfig.label}
                  {nextStatuses.length > 0 && <ChevronDownIcon className="h-3 w-3" />}
                </>
              )}
            </button>

            {/* Status Dropdown */}
            {showStatusDropdown && nextStatuses.length > 0 && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowStatusDropdown(false)}
                />
                <div className="absolute right-0 z-20 mt-1 min-w-[140px] rounded-md border bg-popover py-1 shadow-md">
                  {nextStatuses.map((status) => {
                    const config = ORDER_STATUS_CONFIG[status]
                    return (
                      <button
                        key={status}
                        onClick={() => handleStatusChange(status)}
                        className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent"
                      >
                        <span className={`h-2 w-2 rounded-full ${config.bgColor}`} />
                        {config.label}
                      </button>
                    )
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Table & Customer Info */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
          {order.table_name && (
            <div className="flex items-center gap-1.5">
              <TableIcon className="h-4 w-4" />
              <span>{order.table_name}</span>
            </div>
          )}
          {order.customer_name && (
            <div className="flex items-center gap-1.5">
              <UserIcon className="h-4 w-4" />
              <span>{order.customer_name}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <PackageIcon className="h-4 w-4" />
            <span>{itemCount} ürün</span>
          </div>
        </div>

        {/* Customer Notes */}
        {order.customer_notes && (
          <p className="rounded-md bg-muted/50 px-3 py-2 text-sm italic text-muted-foreground">
            "{order.customer_notes}"
          </p>
        )}

        {/* Footer: Price & Time */}
        <div className="flex items-center justify-between border-t pt-3">
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <ClockIcon className="h-4 w-4" />
            <span>{getTimeElapsed(order.created_at)}</span>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold">
              {formatPrice(order.total_amount, order.currency)}
            </div>
            {order.payment_status !== 'paid' && (
              <span className="text-xs text-muted-foreground">
                {order.payment_status === 'pending' ? 'Ödenmedi' :
                 order.payment_status === 'partial' ? 'Kısmi Ödeme' : ''}
              </span>
            )}
          </div>
        </div>

        {/* View Details Button */}
        {onViewDetails && (
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={onViewDetails}
          >
            Detayları Gör
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
