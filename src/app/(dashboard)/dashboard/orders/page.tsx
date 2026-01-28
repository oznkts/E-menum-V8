'use client'

/**
 * Orders Management Page
 *
 * Dashboard page for managing restaurant orders.
 * Provides order listing, filtering, and status updates.
 *
 * Features:
 * - Order list with card view
 * - Status filter tabs
 * - Search functionality
 * - Status update via dropdown
 * - Order stats overview
 * - Mobile-first responsive design
 * - Turkish UI
 *
 * @see spec.md
 * @see MOBILE-FIRST-TALIMATNAME-v3.md
 */

import { useState, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { OrderList } from '@/components/features/orders/order-list'
import type { OrderWithItems } from '@/components/features/orders/order-card'
import { useOrganization } from '@/lib/hooks/use-organization'
import { useToast } from '@/lib/hooks/use-toast'
import { useRealtimeOrders } from '@/lib/hooks/use-realtime-orders'
import { createClient } from '@/lib/supabase/client'
import type { Order, OrderItem, OrderStatus } from '@/types/database'

// =============================================================================
// QUERY KEYS
// =============================================================================

const orderQueryKeys = {
  all: ['orders'] as const,
  list: (orgId: string) => [...orderQueryKeys.all, 'list', orgId] as const,
}

// =============================================================================
// DATA FETCHING
// =============================================================================

async function fetchOrders(organizationId: string): Promise<OrderWithItems[]> {
  const supabase = createClient()

  // Fetch orders
  const { data: orders, error: ordersError } = await supabase
    .from('orders')
    .select('*')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })
    .limit(100)

  if (ordersError) {
    throw new Error(ordersError.message)
  }

  if (!orders || orders.length === 0) {
    return []
  }

  // Fetch order items count for each order
  const orderIds = orders.map((o) => o.id)
  const { data: itemCounts, error: itemsError } = await supabase
    .from('order_items')
    .select('order_id')
    .in('order_id', orderIds)

  if (itemsError) {
    // Don't fail if we can't get item counts
    return orders.map((order) => ({ ...order, item_count: 0 }))
  }

  // Count items per order
  const countMap = new Map<string, number>()
  itemCounts?.forEach((item) => {
    countMap.set(item.order_id, (countMap.get(item.order_id) || 0) + 1)
  })

  return orders.map((order) => ({
    ...order,
    item_count: countMap.get(order.id) || 0,
  }))
}

async function updateOrderStatus(
  orderId: string,
  newStatus: OrderStatus
): Promise<void> {
  const supabase = createClient()

  const updateData: Partial<Order> = {
    status: newStatus,
    status_changed_at: new Date().toISOString(),
  }

  // Set additional fields based on status
  if (newStatus === 'ready') {
    updateData.actual_ready_at = new Date().toISOString()
  } else if (newStatus === 'served') {
    updateData.served_at = new Date().toISOString()
  } else if (newStatus === 'cancelled') {
    updateData.cancelled_at = new Date().toISOString()
  }

  const { error } = await supabase
    .from('orders')
    .update(updateData)
    .eq('id', orderId)

  if (error) {
    throw new Error(error.message)
  }
}

// =============================================================================
// ICONS
// =============================================================================

function RefreshIcon({ className }: { className?: string }) {
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
      <polyline points="23 4 23 10 17 10" />
      <polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
    </svg>
  )
}

// =============================================================================
// COMPONENT
// =============================================================================

export default function OrdersPage() {
  const queryClient = useQueryClient()
  const { currentOrg, isLoading: orgLoading } = useOrganization()
  const { toast } = useToast()

  // Local state for order details modal
  const [selectedOrder, setSelectedOrder] = useState<OrderWithItems | null>(null)

  // ==========================================================================
  // QUERIES
  // ==========================================================================

  const {
    data: orders = [],
    isLoading: ordersLoading,
    error: ordersError,
    refetch: refetchOrders,
    isFetching,
  } = useQuery({
    queryKey: orderQueryKeys.list(currentOrg?.id || ''),
    queryFn: () => fetchOrders(currentOrg!.id),
    enabled: !!currentOrg?.id,
    staleTime: 10 * 1000, // 10 seconds - orders change frequently
    refetchInterval: 30 * 1000, // Auto-refresh every 30 seconds
  })

  // ==========================================================================
  // REALTIME SUBSCRIPTION
  // ==========================================================================

  const handleNewOrder = useCallback(
    (order: Order) => {
      toast({
        title: 'Yeni Sipariş!',
        description: `#${order.order_number} - ${order.table_name || 'Masa belirtilmedi'}`,
      })
      // Play notification sound if available
      if (typeof window !== 'undefined' && 'Audio' in window) {
        const audio = new Audio('/sounds/notification.mp3')
        audio.volume = 0.5
        audio.play().catch(() => {
          // Ignore audio play errors (e.g., user hasn't interacted with page)
        })
      }
    },
    [toast]
  )

  const handleOrderUpdate = useCallback(
    (order: Order, oldOrder: Partial<Order> | null) => {
      // Only show toast for status changes
      if (oldOrder?.status && oldOrder.status !== order.status) {
        const statusLabels: Record<string, string> = {
          pending: 'Beklemede',
          confirmed: 'Onaylandı',
          preparing: 'Hazırlanıyor',
          ready: 'Hazır',
          served: 'Servis Edildi',
          completed: 'Tamamlandı',
          cancelled: 'İptal Edildi',
        }
        toast({
          title: 'Sipariş Güncellendi',
          description: `#${order.order_number} - ${statusLabels[order.status] || order.status}`,
        })
      }
    },
    [toast]
  )

  const { isConnected: isRealtimeConnected, connectionStatus } = useRealtimeOrders({
    organizationId: currentOrg?.id,
    onNewOrder: handleNewOrder,
    onOrderUpdate: handleOrderUpdate,
    enabled: !!currentOrg?.id,
  })

  // ==========================================================================
  // HANDLERS
  // ==========================================================================

  const handleStatusChange = useCallback(
    async (orderId: string, newStatus: OrderStatus) => {
      try {
        await updateOrderStatus(orderId, newStatus)
        toast({
          title: 'Başarılı',
          description: 'Sipariş durumu güncellendi',
        })
        // Invalidate queries to refetch
        queryClient.invalidateQueries({ queryKey: orderQueryKeys.all })
      } catch (error) {
        toast({
          title: 'Hata',
          description: error instanceof Error ? error.message : 'Durum güncellenemedi',
          variant: 'destructive',
        })
      }
    },
    [queryClient, toast]
  )

  const handleViewDetails = useCallback((order: OrderWithItems) => {
    setSelectedOrder(order)
  }, [])

  // ==========================================================================
  // STATS CALCULATION
  // ==========================================================================

  const stats = {
    total: orders.length,
    pending: orders.filter((o) => o.status === 'pending').length,
    preparing: orders.filter((o) => o.status === 'preparing' || o.status === 'confirmed').length,
    ready: orders.filter((o) => o.status === 'ready').length,
    todayRevenue: orders
      .filter((o) => {
        const orderDate = new Date(o.created_at)
        const today = new Date()
        return (
          orderDate.getDate() === today.getDate() &&
          orderDate.getMonth() === today.getMonth() &&
          orderDate.getFullYear() === today.getFullYear() &&
          o.status !== 'cancelled'
        )
      })
      .reduce((sum, o) => sum + o.total_amount, 0),
  }

  // ==========================================================================
  // LOADING STATE
  // ==========================================================================

  if (orgLoading) {
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
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Organizasyon Seçilmedi</CardTitle>
            <CardDescription>
              Siparişleri yönetmek için önce bir organizasyon seçmeniz gerekiyor.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <div className="space-y-6 p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Siparişler</h1>
            {/* Realtime Connection Status Indicator */}
            <div
              className="flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs"
              title={
                connectionStatus === 'connected'
                  ? 'Canlı bağlantı aktif'
                  : connectionStatus === 'connecting'
                  ? 'Bağlanıyor...'
                  : connectionStatus === 'error'
                  ? 'Bağlantı hatası'
                  : 'Bağlantı kesildi'
              }
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  connectionStatus === 'connected'
                    ? 'bg-green-500 animate-pulse'
                    : connectionStatus === 'connecting'
                    ? 'bg-yellow-500 animate-pulse'
                    : connectionStatus === 'error'
                    ? 'bg-red-500'
                    : 'bg-gray-400'
                }`}
              />
              <span className="text-muted-foreground">
                {connectionStatus === 'connected'
                  ? 'Canlı'
                  : connectionStatus === 'connecting'
                  ? 'Bağlanıyor'
                  : connectionStatus === 'error'
                  ? 'Hata'
                  : 'Çevrimdışı'}
              </span>
            </div>
          </div>
          <p className="text-muted-foreground">
            Restoranınızdaki siparişleri yönetin
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => refetchOrders()}
          disabled={isFetching}
        >
          <RefreshIcon className={`mr-2 h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
          Yenile
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Toplam Sipariş</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            <p className="text-xs text-muted-foreground">Beklemede</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-orange-600">{stats.preparing}</div>
            <p className="text-xs text-muted-foreground">Hazırlanıyor</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">{stats.ready}</div>
            <p className="text-xs text-muted-foreground">Hazır</p>
          </CardContent>
        </Card>
      </div>

      {/* Today's Revenue Card */}
      <Card className="border-primary-200 bg-primary-50/50 dark:border-primary-900/50 dark:bg-primary-900/10">
        <CardContent className="flex items-center justify-between p-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Bugünkü Gelir</p>
            <p className="text-2xl font-bold text-primary-600 dark:text-primary-400">
              {new Intl.NumberFormat('tr-TR', {
                style: 'currency',
                currency: 'TRY',
              }).format(stats.todayRevenue)}
            </p>
          </div>
          <div className="rounded-full bg-primary-100 p-3 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400">
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
            </svg>
          </div>
        </CardContent>
      </Card>

      {/* Orders List */}
      {ordersError ? (
        <Card>
          <CardContent className="p-8 text-center">
            <svg
              className="mx-auto h-12 w-12 text-destructive"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <h3 className="mt-4 text-lg font-semibold">Siparişler yüklenemedi</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Lütfen sayfayı yenileyip tekrar deneyin.
            </p>
            <Button onClick={() => refetchOrders()} className="mt-4">
              Tekrar Dene
            </Button>
          </CardContent>
        </Card>
      ) : (
        <OrderList
          orders={orders}
          isLoading={ordersLoading}
          onStatusChange={handleStatusChange}
          onViewDetails={handleViewDetails}
        />
      )}

      {/* Order Details Modal */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Sipariş #{selectedOrder?.order_number}
            </DialogTitle>
            <DialogDescription>
              Sipariş detayları ve durum bilgisi
            </DialogDescription>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              {/* Order Info */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-medium text-muted-foreground">Masa</p>
                  <p>{selectedOrder.table_name || 'Belirtilmemiş'}</p>
                </div>
                <div>
                  <p className="font-medium text-muted-foreground">Müşteri</p>
                  <p>{selectedOrder.customer_name || 'Anonim'}</p>
                </div>
                <div>
                  <p className="font-medium text-muted-foreground">Sipariş Tipi</p>
                  <p>
                    {selectedOrder.order_type === 'dine_in'
                      ? 'Masada'
                      : selectedOrder.order_type === 'takeaway'
                      ? 'Paket'
                      : 'Teslimat'}
                  </p>
                </div>
                <div>
                  <p className="font-medium text-muted-foreground">Toplam</p>
                  <p className="font-bold">
                    {new Intl.NumberFormat('tr-TR', {
                      style: 'currency',
                      currency: selectedOrder.currency,
                    }).format(selectedOrder.total_amount)}
                  </p>
                </div>
              </div>

              {/* Notes */}
              {selectedOrder.customer_notes && (
                <div>
                  <p className="font-medium text-muted-foreground">Müşteri Notu</p>
                  <p className="mt-1 rounded-md bg-muted p-3 text-sm italic">
                    "{selectedOrder.customer_notes}"
                  </p>
                </div>
              )}

              {/* Timestamps */}
              <div className="border-t pt-4 text-xs text-muted-foreground">
                <p>
                  Sipariş Tarihi:{' '}
                  {new Date(selectedOrder.created_at).toLocaleString('tr-TR')}
                </p>
                {selectedOrder.actual_ready_at && (
                  <p>
                    Hazır Olma:{' '}
                    {new Date(selectedOrder.actual_ready_at).toLocaleString('tr-TR')}
                  </p>
                )}
                {selectedOrder.served_at && (
                  <p>
                    Servis Edilme:{' '}
                    {new Date(selectedOrder.served_at).toLocaleString('tr-TR')}
                  </p>
                )}
              </div>

              {/* Close Button */}
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setSelectedOrder(null)}
              >
                Kapat
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
