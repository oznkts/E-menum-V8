'use client'

/**
 * Waiter Panel Page
 *
 * Mobile-optimized interface for waitstaff to manage tables and orders.
 * Designed for quick access to key functions during service.
 *
 * Features:
 * - Table overview with status indicators
 * - Quick order taking
 * - Service request notifications
 * - Order status updates
 * - Bill/check viewing
 * - Real-time updates
 * - Touch-friendly interface
 * - Turkish UI
 *
 * @see E-MENUM EKSİK SAYFALAR TALİMATNAMESİ.md
 * @see spec.md
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
import { useOrganization } from '@/lib/hooks/use-organization'
import { useToast } from '@/lib/hooks/use-toast'
import { useRealtimeOrders } from '@/lib/hooks/use-realtime-orders'
import { createClient } from '@/lib/supabase/client'
import type { Order, OrderStatus } from '@/types/database'

// =============================================================================
// TYPES
// =============================================================================

interface Table {
  id: string
  name: string
  capacity: number
  section: string | null
  floor: number | null
  status: 'available' | 'occupied' | 'reserved' | 'dirty'
  qr_uuid: string
  current_order_id: string | null
}

interface ServiceRequest {
  id: string
  table_id: string
  type: 'waiter_call' | 'bill_request' | 'assistance' | 'other'
  status: 'pending' | 'acknowledged' | 'completed' | 'cancelled'
  notes: string | null
  created_at: string
  table_name?: string
}

interface OrderSummary extends Order {
  item_count: number
}

// =============================================================================
// QUERY KEYS
// =============================================================================

const waiterQueryKeys = {
  all: ['waiter'] as const,
  tables: (orgId: string) => [...waiterQueryKeys.all, 'tables', orgId] as const,
  serviceRequests: (orgId: string) => [...waiterQueryKeys.all, 'requests', orgId] as const,
  activeOrders: (orgId: string) => [...waiterQueryKeys.all, 'orders', orgId] as const,
}

// =============================================================================
// DATA FETCHING
// =============================================================================

async function fetchTables(organizationId: string): Promise<Table[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('restaurant_tables')
    .select('*')
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .order('name', { ascending: true })

  if (error) throw new Error(error.message)
  return data || []
}

async function fetchServiceRequests(organizationId: string): Promise<ServiceRequest[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('service_requests')
    .select(`
      *,
      restaurant_tables:table_id (name)
    `)
    .eq('organization_id', organizationId)
    .in('status', ['pending', 'acknowledged'])
    .order('created_at', { ascending: true })
    .limit(50)

  if (error) throw new Error(error.message)

  return (data || []).map((req) => ({
    ...req,
    table_name: (req.restaurant_tables as { name: string } | null)?.name || 'Bilinmeyen Masa',
  }))
}

async function fetchActiveOrders(organizationId: string): Promise<OrderSummary[]> {
  const supabase = createClient()

  const { data: orders, error: ordersError } = await supabase
    .from('orders')
    .select('*')
    .eq('organization_id', organizationId)
    .not('status', 'in', '("completed","cancelled")')
    .order('created_at', { ascending: false })
    .limit(50)

  if (ordersError) throw new Error(ordersError.message)

  if (!orders || orders.length === 0) return []

  // Get item counts
  const orderIds = orders.map((o) => o.id)
  const { data: itemCounts } = await supabase
    .from('order_items')
    .select('order_id')
    .in('order_id', orderIds)

  const countMap = new Map<string, number>()
  itemCounts?.forEach((item) => {
    countMap.set(item.order_id, (countMap.get(item.order_id) || 0) + 1)
  })

  return orders.map((order) => ({
    ...order,
    item_count: countMap.get(order.id) || 0,
  }))
}

async function updateServiceRequestStatus(
  requestId: string,
  status: 'acknowledged' | 'completed'
): Promise<void> {
  const supabase = createClient()

  const { error } = await supabase
    .from('service_requests')
    .update({
      status,
      acknowledged_at: status === 'acknowledged' ? new Date().toISOString() : undefined,
      completed_at: status === 'completed' ? new Date().toISOString() : undefined,
    })
    .eq('id', requestId)

  if (error) throw new Error(error.message)
}

async function updateOrderStatus(orderId: string, newStatus: OrderStatus): Promise<void> {
  const supabase = createClient()

  const { error } = await supabase
    .from('orders')
    .update({
      status: newStatus,
      status_changed_at: new Date().toISOString(),
      served_at: newStatus === 'served' ? new Date().toISOString() : undefined,
    })
    .eq('id', orderId)

  if (error) throw new Error(error.message)
}

// =============================================================================
// ICONS
// =============================================================================

function TableIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4" width="18" height="14" rx="2" />
      <path d="M3 10h18M7 20v-2M17 20v-2" />
    </svg>
  )
}

function BellIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  )
}

function ReceiptIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1-2-1z" />
      <path d="M8 7h8M8 11h8M8 15h4" />
    </svg>
  )
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function UserIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}

// =============================================================================
// TABLE CARD COMPONENT
// =============================================================================

interface TableCardProps {
  table: Table
  order?: OrderSummary
  onClick: () => void
}

function TableCard({ table, order, onClick }: TableCardProps) {
  const statusColors = {
    available: 'bg-green-100 border-green-500 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    occupied: 'bg-blue-100 border-blue-500 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    reserved: 'bg-purple-100 border-purple-500 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    dirty: 'bg-gray-100 border-gray-500 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
  }

  const statusLabels = {
    available: 'Boş',
    occupied: 'Dolu',
    reserved: 'Rezerve',
    dirty: 'Temizlik',
  }

  return (
    <button
      onClick={onClick}
      className={`w-full rounded-lg border-2 p-4 text-left transition-all hover:shadow-md active:scale-98 ${statusColors[table.status]}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-bold">{table.name}</h3>
          <p className="text-sm opacity-75">
            {table.capacity} kişilik
            {table.section && ` • ${table.section}`}
          </p>
        </div>
        <span className="rounded-full bg-white/50 px-2 py-0.5 text-xs font-medium">
          {statusLabels[table.status]}
        </span>
      </div>
      {order && (
        <div className="mt-2 rounded bg-white/50 p-2 text-sm dark:bg-black/20">
          <p className="font-medium">#{order.order_number}</p>
          <p>{order.item_count} ürün • {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(order.total_amount)}</p>
        </div>
      )}
    </button>
  )
}

// =============================================================================
// SERVICE REQUEST CARD COMPONENT
// =============================================================================

interface ServiceRequestCardProps {
  request: ServiceRequest
  onAcknowledge: () => void
  onComplete: () => void
}

function ServiceRequestCard({ request, onAcknowledge, onComplete }: ServiceRequestCardProps) {
  const typeLabels = {
    waiter_call: '🔔 Garson Çağrısı',
    bill_request: '🧾 Hesap İstendi',
    assistance: '❓ Yardım İstendi',
    other: '📢 Diğer',
  }

  const timeSince = () => {
    const seconds = Math.floor((Date.now() - new Date(request.created_at).getTime()) / 1000)
    if (seconds < 60) return `${seconds}sn`
    if (seconds < 3600) return `${Math.floor(seconds / 60)}dk`
    return `${Math.floor(seconds / 3600)}sa`
  }

  return (
    <Card className={`border-l-4 ${request.status === 'pending' ? 'border-red-500 bg-red-50 dark:bg-red-900/20' : 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20'}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-bold">{typeLabels[request.type]}</p>
            <p className="text-sm text-muted-foreground">
              {request.table_name} • {timeSince()} önce
            </p>
            {request.notes && (
              <p className="mt-1 text-sm italic">{request.notes}</p>
            )}
          </div>
          <div className="flex gap-2">
            {request.status === 'pending' && (
              <Button size="sm" variant="outline" onClick={onAcknowledge}>
                Aldım
              </Button>
            )}
            <Button size="sm" onClick={onComplete}>
              <CheckIcon className="mr-1 h-4 w-4" />
              Tamamla
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function WaiterPanelPage() {
  const queryClient = useQueryClient()
  const { currentOrg, isLoading: orgLoading } = useOrganization()
  const { toast } = useToast()

  const [selectedTable, setSelectedTable] = useState<Table | null>(null)
  const [activeTab, setActiveTab] = useState<'tables' | 'requests' | 'orders'>('tables')

  // ==========================================================================
  // QUERIES
  // ==========================================================================

  const { data: tables = [], isLoading: tablesLoading } = useQuery({
    queryKey: waiterQueryKeys.tables(currentOrg?.id || ''),
    queryFn: () => fetchTables(currentOrg!.id),
    enabled: !!currentOrg?.id,
    staleTime: 30 * 1000,
  })

  const { data: serviceRequests = [], isLoading: requestsLoading } = useQuery({
    queryKey: waiterQueryKeys.serviceRequests(currentOrg?.id || ''),
    queryFn: () => fetchServiceRequests(currentOrg!.id),
    enabled: !!currentOrg?.id,
    staleTime: 10 * 1000,
    refetchInterval: 15 * 1000,
  })

  const { data: activeOrders = [], isLoading: ordersLoading } = useQuery({
    queryKey: waiterQueryKeys.activeOrders(currentOrg?.id || ''),
    queryFn: () => fetchActiveOrders(currentOrg!.id),
    enabled: !!currentOrg?.id,
    staleTime: 15 * 1000,
  })

  // ==========================================================================
  // REALTIME
  // ==========================================================================

  const handleNewOrder = useCallback(
    (order: Order) => {
      toast({
        title: 'Yeni Sipariş!',
        description: `${order.table_name || 'Masa'} - #${order.order_number}`,
      })
      queryClient.invalidateQueries({ queryKey: waiterQueryKeys.all })
    },
    [toast, queryClient]
  )

  const { connectionStatus } = useRealtimeOrders({
    organizationId: currentOrg?.id,
    onNewOrder: handleNewOrder,
    onOrderUpdate: () => queryClient.invalidateQueries({ queryKey: waiterQueryKeys.all }),
    enabled: !!currentOrg?.id,
  })

  // ==========================================================================
  // HANDLERS
  // ==========================================================================

  const handleAcknowledgeRequest = async (requestId: string) => {
    try {
      await updateServiceRequestStatus(requestId, 'acknowledged')
      toast({ title: 'İstek alındı' })
      queryClient.invalidateQueries({ queryKey: waiterQueryKeys.serviceRequests(currentOrg!.id) })
    } catch (error) {
      toast({ title: 'Hata', description: 'İstek güncellenemedi', variant: 'destructive' })
    }
  }

  const handleCompleteRequest = async (requestId: string) => {
    try {
      await updateServiceRequestStatus(requestId, 'completed')
      toast({ title: 'İstek tamamlandı' })
      queryClient.invalidateQueries({ queryKey: waiterQueryKeys.serviceRequests(currentOrg!.id) })
    } catch (error) {
      toast({ title: 'Hata', description: 'İstek güncellenemedi', variant: 'destructive' })
    }
  }

  const handleServeOrder = async (orderId: string) => {
    try {
      await updateOrderStatus(orderId, 'served')
      toast({ title: 'Sipariş servis edildi' })
      queryClient.invalidateQueries({ queryKey: waiterQueryKeys.activeOrders(currentOrg!.id) })
    } catch (error) {
      toast({ title: 'Hata', description: 'Sipariş güncellenemedi', variant: 'destructive' })
    }
  }

  // Order map by table
  const ordersByTable = new Map<string, OrderSummary>()
  activeOrders.forEach((order) => {
    if (order.table_id) {
      ordersByTable.set(order.table_id, order)
    }
  })

  // ==========================================================================
  // LOADING
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
              Garson panelini kullanmak için önce bir organizasyon seçmeniz gerekiyor.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  const pendingRequestsCount = serviceRequests.filter((r) => r.status === 'pending').length
  const readyOrdersCount = activeOrders.filter((o) => o.status === 'ready').length

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b bg-white/95 backdrop-blur dark:bg-slate-900/95">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-2">
            <UserIcon className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold">Garson Paneli</h1>
            <span className={`ml-2 h-2 w-2 rounded-full ${connectionStatus === 'connected' ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`} />
          </div>
          <p className="text-sm text-muted-foreground">{currentOrg.name}</p>
        </div>

        {/* Tabs */}
        <div className="flex border-t">
          <button
            onClick={() => setActiveTab('tables')}
            className={`flex-1 py-3 text-center font-medium transition-colors ${activeTab === 'tables' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground'}`}
          >
            <TableIcon className="mx-auto h-5 w-5" />
            <span className="text-xs">Masalar</span>
          </button>
          <button
            onClick={() => setActiveTab('requests')}
            className={`relative flex-1 py-3 text-center font-medium transition-colors ${activeTab === 'requests' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground'}`}
          >
            <BellIcon className="mx-auto h-5 w-5" />
            <span className="text-xs">İstekler</span>
            {pendingRequestsCount > 0 && (
              <span className="absolute right-4 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white">
                {pendingRequestsCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`relative flex-1 py-3 text-center font-medium transition-colors ${activeTab === 'orders' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground'}`}
          >
            <ReceiptIcon className="mx-auto h-5 w-5" />
            <span className="text-xs">Siparişler</span>
            {readyOrdersCount > 0 && (
              <span className="absolute right-4 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-green-500 text-xs text-white">
                {readyOrdersCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Tables Tab */}
        {activeTab === 'tables' && (
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
            {tablesLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-28 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
              ))
            ) : tables.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <TableIcon className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <p className="mt-2 text-muted-foreground">Henüz masa tanımlı değil</p>
              </div>
            ) : (
              tables.map((table) => (
                <TableCard
                  key={table.id}
                  table={table}
                  order={ordersByTable.get(table.id)}
                  onClick={() => setSelectedTable(table)}
                />
              ))
            )}
          </div>
        )}

        {/* Service Requests Tab */}
        {activeTab === 'requests' && (
          <div className="space-y-3">
            {requestsLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-24 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
              ))
            ) : serviceRequests.length === 0 ? (
              <Card className="p-12 text-center">
                <BellIcon className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <p className="mt-2 text-muted-foreground">Bekleyen istek yok</p>
              </Card>
            ) : (
              serviceRequests.map((request) => (
                <ServiceRequestCard
                  key={request.id}
                  request={request}
                  onAcknowledge={() => handleAcknowledgeRequest(request.id)}
                  onComplete={() => handleCompleteRequest(request.id)}
                />
              ))
            )}
          </div>
        )}

        {/* Orders Tab */}
        {activeTab === 'orders' && (
          <div className="space-y-3">
            {ordersLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-20 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
              ))
            ) : activeOrders.length === 0 ? (
              <Card className="p-12 text-center">
                <ReceiptIcon className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <p className="mt-2 text-muted-foreground">Aktif sipariş yok</p>
              </Card>
            ) : (
              activeOrders.map((order) => {
                const statusColors: Record<string, string> = {
                  pending: 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20',
                  confirmed: 'border-blue-500 bg-blue-50 dark:bg-blue-900/20',
                  preparing: 'border-orange-500 bg-orange-50 dark:bg-orange-900/20',
                  ready: 'border-green-500 bg-green-50 dark:bg-green-900/20',
                  served: 'border-gray-500 bg-gray-50 dark:bg-gray-900/20',
                }
                const statusLabels: Record<string, string> = {
                  pending: 'Beklemede',
                  confirmed: 'Onaylandı',
                  preparing: 'Hazırlanıyor',
                  ready: '✓ Hazır',
                  served: 'Servis Edildi',
                }

                return (
                  <Card key={order.id} className={`border-l-4 ${statusColors[order.status] || ''}`}>
                    <CardContent className="flex items-center justify-between p-4">
                      <div>
                        <p className="font-bold">#{order.order_number}</p>
                        <p className="text-sm text-muted-foreground">
                          {order.table_name || 'Masa belirtilmedi'} • {order.item_count} ürün
                        </p>
                        <p className="text-sm font-medium">
                          {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(order.total_amount)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`rounded-full px-3 py-1 text-sm font-medium ${
                          order.status === 'ready' ? 'bg-green-200 text-green-800' : 'bg-slate-200 text-slate-800'
                        }`}>
                          {statusLabels[order.status] || order.status}
                        </span>
                        {order.status === 'ready' && (
                          <Button size="sm" onClick={() => handleServeOrder(order.id)}>
                            Servis Et
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )
              })
            )}
          </div>
        )}
      </div>

      {/* Table Detail Dialog */}
      <Dialog open={!!selectedTable} onOpenChange={() => setSelectedTable(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedTable?.name}</DialogTitle>
            <DialogDescription>
              {selectedTable?.capacity} kişilik • {selectedTable?.section || 'Bölüm belirtilmedi'}
            </DialogDescription>
          </DialogHeader>
          {selectedTable && (
            <div className="space-y-4">
              {ordersByTable.get(selectedTable.id) ? (
                <div className="rounded-lg bg-slate-100 p-4 dark:bg-slate-800">
                  <p className="font-medium">Aktif Sipariş</p>
                  <p className="text-lg font-bold">
                    #{ordersByTable.get(selectedTable.id)?.order_number}
                  </p>
                  <p className="text-muted-foreground">
                    {ordersByTable.get(selectedTable.id)?.item_count} ürün •{' '}
                    {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(
                      ordersByTable.get(selectedTable.id)?.total_amount || 0
                    )}
                  </p>
                </div>
              ) : (
                <p className="text-center text-muted-foreground">Bu masada aktif sipariş yok</p>
              )}
              <Button className="w-full" variant="outline" onClick={() => setSelectedTable(null)}>
                Kapat
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
