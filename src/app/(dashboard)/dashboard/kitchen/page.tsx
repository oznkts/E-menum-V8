'use client'

/**
 * Kitchen Display System (KDS) Page
 *
 * Real-time kitchen display for managing order preparation.
 * Optimized for touch screens and kitchen environments.
 *
 * Features:
 * - Real-time order updates via Supabase Realtime
 * - Large, touch-friendly UI for kitchen staff
 * - Order status management (pending -> preparing -> ready)
 * - Visual and audio notifications for new orders
 * - Timer display for order age
 * - Mobile-first responsive design
 * - Turkish UI
 *
 * @see E-MENUM EKSİK SAYFALAR TALİMATNAMESİ.md
 * @see spec.md
 */

import { useState, useCallback, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useOrganization } from '@/lib/hooks/use-organization'
import { useToast } from '@/lib/hooks/use-toast'
import { useRealtimeOrders } from '@/lib/hooks/use-realtime-orders'
import { createClient } from '@/lib/supabase/client'
import type { Order, OrderItem, OrderStatus } from '@/types/database'

// =============================================================================
// TYPES
// =============================================================================

interface OrderWithItems extends Order {
  items: OrderItemWithProduct[]
}

interface OrderItemWithProduct extends OrderItem {
  product_name: string
  selected_modifiers: Array<{ name: string; option: string; price: number }> | null
}

// =============================================================================
// QUERY KEYS
// =============================================================================

const kdsQueryKeys = {
  all: ['kds'] as const,
  activeOrders: (orgId: string) => [...kdsQueryKeys.all, 'active', orgId] as const,
}

// =============================================================================
// DATA FETCHING
// =============================================================================

async function fetchKitchenOrders(organizationId: string): Promise<OrderWithItems[]> {
  const supabase = createClient()

  // Fetch orders that need kitchen attention
  const { data: orders, error: ordersError } = await supabase
    .from('orders')
    .select('*')
    .eq('organization_id', organizationId)
    .in('status', ['pending', 'confirmed', 'preparing'])
    .order('created_at', { ascending: true }) // Oldest first (FIFO)
    .limit(50)

  if (ordersError) {
    throw new Error(ordersError.message)
  }

  if (!orders || orders.length === 0) {
    return []
  }

  // Fetch order items with product details
  const orderIds = orders.map((o) => o.id)
  const { data: items, error: itemsError } = await supabase
    .from('order_items')
    .select(`
      *,
      products:product_id (name)
    `)
    .in('order_id', orderIds)

  if (itemsError) {
    console.error('Failed to fetch order items:', itemsError)
  }

  // Group items by order
  const itemsByOrder = new Map<string, OrderItemWithProduct[]>()
  items?.forEach((item) => {
    const orderItems = itemsByOrder.get(item.order_id) || []
    orderItems.push({
      ...item,
      product_name: (item.products as { name: string } | null)?.name || 'Bilinmeyen Ürün',
      selected_modifiers: item.selected_modifiers as OrderItemWithProduct['selected_modifiers'],
    })
    itemsByOrder.set(item.order_id, orderItems)
  })

  return orders.map((order) => ({
    ...order,
    items: itemsByOrder.get(order.id) || [],
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

  if (newStatus === 'ready') {
    updateData.actual_ready_at = new Date().toISOString()
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

function ChefIcon({ className }: { className?: string }) {
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
      <path d="M6 13.87A4 4 0 0 1 7.41 6a5.11 5.11 0 0 1 1.05-1.54 5 5 0 0 1 7.08 0A5.11 5.11 0 0 1 16.59 6 4 4 0 0 1 18 13.87V21H6Z" />
      <line x1="6" y1="17" x2="18" y2="17" />
    </svg>
  )
}

function CheckIcon({ className }: { className?: string }) {
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
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function BellIcon({ className }: { className?: string }) {
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
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  )
}

// =============================================================================
// AUDIO NOTIFICATION
// =============================================================================

function playKitchenBell() {
  if (typeof window === 'undefined') return
  const AudioContext =
    window.AudioContext ||
    (window as typeof window & { webkitAudioContext?: typeof window.AudioContext })
      .webkitAudioContext
  if (!AudioContext) return

  const ctx = new AudioContext()
  const oscillator = ctx.createOscillator()
  const gain = ctx.createGain()

  oscillator.type = 'sine'
  oscillator.frequency.value = 880
  gain.gain.value = 0.0001

  oscillator.connect(gain)
  gain.connect(ctx.destination)

  oscillator.start()
  gain.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.02)
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.25)
  oscillator.stop(ctx.currentTime + 0.28)

  oscillator.onended = () => {
    ctx.close().catch(() => {})
  }
}

// =============================================================================
// TIMER COMPONENT
// =============================================================================

function OrderTimer({ createdAt }: { createdAt: string }) {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    const startTime = new Date(createdAt).getTime()

    const updateElapsed = () => {
      const now = Date.now()
      setElapsed(Math.floor((now - startTime) / 1000))
    }

    updateElapsed()
    const interval = setInterval(updateElapsed, 1000)
    return () => clearInterval(interval)
  }, [createdAt])

  const minutes = Math.floor(elapsed / 60)
  const seconds = elapsed % 60

  // Color based on time
  const colorClass =
    minutes >= 15
      ? 'text-red-600 dark:text-red-400'
      : minutes >= 10
      ? 'text-orange-600 dark:text-orange-400'
      : minutes >= 5
      ? 'text-yellow-600 dark:text-yellow-400'
      : 'text-green-600 dark:text-green-400'

  return (
    <div className={`flex items-center gap-1 font-mono text-lg font-bold ${colorClass}`}>
      <ClockIcon className="h-5 w-5" />
      <span>
        {minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
      </span>
    </div>
  )
}

// =============================================================================
// KDS ORDER CARD COMPONENT
// =============================================================================

interface KDSOrderCardProps {
  order: OrderWithItems
  onStatusChange: (orderId: string, newStatus: OrderStatus) => Promise<void>
}

function KDSOrderCard({ order, onStatusChange }: KDSOrderCardProps) {
  const [isUpdating, setIsUpdating] = useState(false)

  const handleStatusChange = async (newStatus: OrderStatus) => {
    setIsUpdating(true)
    try {
      await onStatusChange(order.id, newStatus)
    } finally {
      setIsUpdating(false)
    }
  }

  const statusColors = {
    pending: 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20',
    confirmed: 'border-blue-500 bg-blue-50 dark:bg-blue-900/20',
    preparing: 'border-orange-500 bg-orange-50 dark:bg-orange-900/20',
  }

  const statusLabels = {
    pending: 'Beklemede',
    confirmed: 'Onaylandı',
    preparing: 'Hazırlanıyor',
  }

  return (
    <Card
      className={`border-l-4 ${statusColors[order.status as keyof typeof statusColors] || 'border-gray-300'} transition-all`}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-2xl font-bold">
              #{order.order_number}
            </CardTitle>
            <CardDescription className="text-base">
              {order.table_name || 'Masa belirtilmedi'} • {order.order_type === 'dine_in' ? 'Masada' : order.order_type === 'takeaway' ? 'Paket' : 'Teslimat'}
            </CardDescription>
          </div>
          <div className="flex flex-col items-end gap-2">
            <OrderTimer createdAt={order.created_at} />
            <span className={`rounded-full px-3 py-1 text-sm font-medium ${
              order.status === 'pending' ? 'bg-yellow-200 text-yellow-800' :
              order.status === 'confirmed' ? 'bg-blue-200 text-blue-800' :
              'bg-orange-200 text-orange-800'
            }`}>
              {statusLabels[order.status as keyof typeof statusLabels] || order.status}
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Order Items */}
        <div className="space-y-3">
          {order.items.map((item, index) => (
            <div
              key={item.id || index}
              className="flex items-start justify-between gap-2 rounded-lg bg-white/50 p-3 dark:bg-white/5"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-100 text-sm font-bold text-primary-700 dark:bg-primary-900/50 dark:text-primary-300">
                    {item.quantity}x
                  </span>
                  <span className="text-lg font-medium">{item.product_name}</span>
                </div>
                {/* Modifiers */}
                {item.selected_modifiers && item.selected_modifiers.length > 0 && (
                  <div className="mt-1 ml-9 space-y-1">
                    {item.selected_modifiers.map((mod, modIndex) => (
                      <span
                        key={modIndex}
                        className="block text-sm text-muted-foreground"
                      >
                        + {mod.name}: {mod.option}
                      </span>
                    ))}
                  </div>
                )}
                {/* Special Instructions */}
                {item.notes && (
                  <p className="mt-1 ml-9 text-sm italic text-orange-600 dark:text-orange-400">
                    Not: {item.notes}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Customer Notes */}
        {order.customer_notes && (
          <div className="rounded-lg bg-amber-100 p-3 dark:bg-amber-900/30">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
              <BellIcon className="mr-1 inline h-4 w-4" />
              Müşteri Notu: {order.customer_notes}
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          {order.status === 'pending' && (
            <Button
              className="flex-1 h-14 text-lg"
              onClick={() => handleStatusChange('preparing')}
              disabled={isUpdating}
            >
              <ChefIcon className="mr-2 h-5 w-5" />
              Hazırlamaya Başla
            </Button>
          )}
          {order.status === 'confirmed' && (
            <Button
              className="flex-1 h-14 text-lg"
              onClick={() => handleStatusChange('preparing')}
              disabled={isUpdating}
            >
              <ChefIcon className="mr-2 h-5 w-5" />
              Hazırlamaya Başla
            </Button>
          )}
          {order.status === 'preparing' && (
            <Button
              className="flex-1 h-14 text-lg bg-green-600 hover:bg-green-700"
              onClick={() => handleStatusChange('ready')}
              disabled={isUpdating}
            >
              <CheckIcon className="mr-2 h-5 w-5" />
              Hazır
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function KitchenDisplayPage() {
  const queryClient = useQueryClient()
  const { currentOrg, isLoading: orgLoading } = useOrganization()
  const { toast } = useToast()

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
    queryKey: kdsQueryKeys.activeOrders(currentOrg?.id || ''),
    queryFn: () => fetchKitchenOrders(currentOrg!.id),
    enabled: !!currentOrg?.id,
    staleTime: 5 * 1000, // 5 seconds - KDS needs fresh data
    refetchInterval: 10 * 1000, // Auto-refresh every 10 seconds
  })

  // ==========================================================================
  // REALTIME SUBSCRIPTION
  // ==========================================================================

  const handleNewOrder = useCallback(
    (order: Order) => {
      toast({
        title: '🔔 Yeni Sipariş!',
        description: `#${order.order_number} - ${order.table_name || 'Masa belirtilmedi'}`,
      })
      // Play a lightweight notification tone without external assets
      playKitchenBell()
      // Refetch orders
      queryClient.invalidateQueries({ queryKey: kdsQueryKeys.all })
    },
    [toast, queryClient]
  )

  const handleOrderUpdate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: kdsQueryKeys.all })
  }, [queryClient])

  const { connectionStatus } = useRealtimeOrders({
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
          description: newStatus === 'ready' ? 'Sipariş hazır olarak işaretlendi' : 'Sipariş durumu güncellendi',
        })
        queryClient.invalidateQueries({ queryKey: kdsQueryKeys.all })
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

  // ==========================================================================
  // STATS
  // ==========================================================================

  const stats = {
    pending: orders.filter((o) => o.status === 'pending' || o.status === 'confirmed').length,
    preparing: orders.filter((o) => o.status === 'preparing').length,
    total: orders.length,
  }

  // ==========================================================================
  // LOADING STATE
  // ==========================================================================

  if (orgLoading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <svg className="h-10 w-10 animate-spin text-primary" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="text-lg text-muted-foreground">Yükleniyor...</p>
        </div>
      </div>
    )
  }

  if (!currentOrg) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Organizasyon Seçilmedi</CardTitle>
            <CardDescription>
              Mutfak ekranını kullanmak için önce bir organizasyon seçmeniz gerekiyor.
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
    <div className="min-h-screen bg-slate-100 p-4 dark:bg-slate-900">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <ChefIcon className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold tracking-tight">Mutfak Ekranı</h1>
            {/* Connection Status */}
            <div
              className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-sm ${
                connectionStatus === 'connected'
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  connectionStatus === 'connected' ? 'bg-green-500 animate-pulse' : 'bg-yellow-500 animate-pulse'
                }`}
              />
              {connectionStatus === 'connected' ? 'Canlı' : 'Bağlanıyor...'}
            </div>
          </div>
          <p className="mt-1 text-lg text-muted-foreground">
            {currentOrg.name}
          </p>
        </div>

        {/* Stats */}
        <div className="flex gap-4">
          <div className="rounded-lg bg-yellow-100 px-4 py-2 dark:bg-yellow-900/30">
            <div className="text-2xl font-bold text-yellow-700 dark:text-yellow-400">
              {stats.pending}
            </div>
            <div className="text-sm text-yellow-600 dark:text-yellow-500">Bekleyen</div>
          </div>
          <div className="rounded-lg bg-orange-100 px-4 py-2 dark:bg-orange-900/30">
            <div className="text-2xl font-bold text-orange-700 dark:text-orange-400">
              {stats.preparing}
            </div>
            <div className="text-sm text-orange-600 dark:text-orange-500">Hazırlanıyor</div>
          </div>
          <div className="rounded-lg bg-slate-200 px-4 py-2 dark:bg-slate-800">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-sm text-muted-foreground">Toplam</div>
          </div>
        </div>
      </div>

      {/* Orders Grid */}
      {ordersLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-8 w-24 rounded bg-slate-200 dark:bg-slate-700" />
                <div className="h-4 w-32 rounded bg-slate-200 dark:bg-slate-700" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-12 rounded bg-slate-200 dark:bg-slate-700" />
                  <div className="h-12 rounded bg-slate-200 dark:bg-slate-700" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : ordersError ? (
        <Card className="p-8 text-center">
          <p className="text-lg text-destructive">Siparişler yüklenemedi</p>
          <Button onClick={() => refetchOrders()} className="mt-4">
            Tekrar Dene
          </Button>
        </Card>
      ) : orders.length === 0 ? (
        <Card className="p-12 text-center">
          <ChefIcon className="mx-auto h-16 w-16 text-muted-foreground/50" />
          <h3 className="mt-4 text-xl font-semibold">Bekleyen Sipariş Yok</h3>
          <p className="mt-2 text-muted-foreground">
            Yeni siparişler geldiğinde burada görünecek.
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {orders.map((order) => (
            <KDSOrderCard
              key={order.id}
              order={order}
              onStatusChange={handleStatusChange}
            />
          ))}
        </div>
      )}
    </div>
  )
}
