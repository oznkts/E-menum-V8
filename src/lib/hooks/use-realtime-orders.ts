'use client'

/**
 * useRealtimeOrders Hook
 *
 * Client-side hook for subscribing to real-time order updates via Supabase Realtime.
 * Provides instant notifications when new orders are placed or existing orders are updated.
 *
 * Features:
 * - Subscribes to orders table INSERT/UPDATE events
 * - Filters by organization_id for multi-tenant isolation
 * - Invalidates TanStack Query cache for automatic UI updates
 * - Provides callbacks for new order notifications
 * - Handles connection status for reliability feedback
 * - Automatic cleanup on unmount
 *
 * @example
 * ```tsx
 * 'use client'
 * import { useRealtimeOrders } from '@/lib/hooks/use-realtime-orders'
 *
 * function OrdersPage() {
 *   const { isConnected } = useRealtimeOrders({
 *     organizationId: 'org-123',
 *     onNewOrder: (order) => {
 *       toast({ title: 'Yeni Siparis!', description: `#${order.order_number}` })
 *     },
 *   })
 *
 *   return <div>{isConnected ? 'Canli baglanti' : 'Baglaniyor...'}</div>
 * }
 * ```
 *
 * @see https://supabase.com/docs/guides/realtime
 */

import { useEffect, useState, useRef, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import type { Order } from '@/types/database'

// =============================================================================
// TYPES
// =============================================================================

/**
 * Payload for new order event from Supabase Realtime
 */
type OrderPayload = RealtimePostgresChangesPayload<{
  [key: string]: unknown
}>

/**
 * Configuration options for useRealtimeOrders hook
 */
export interface UseRealtimeOrdersOptions {
  /** Organization ID to filter orders for (required for multi-tenant isolation) */
  organizationId: string | null | undefined
  /** Callback fired when a new order is inserted */
  onNewOrder?: (order: Order) => void
  /** Callback fired when an existing order is updated */
  onOrderUpdate?: (order: Order, oldOrder: Partial<Order> | null) => void
  /** Callback fired when an order is deleted (soft delete) */
  onOrderDelete?: (order: Order) => void
  /** Whether realtime subscription is enabled (default: true) */
  enabled?: boolean
}

/**
 * Return type for useRealtimeOrders hook
 */
export interface UseRealtimeOrdersReturn {
  /** Whether the realtime connection is established */
  isConnected: boolean
  /** Current connection status */
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error'
  /** Error message if connection failed */
  error: string | null
  /** Manually reconnect to realtime */
  reconnect: () => void
}

// =============================================================================
// QUERY KEYS (shared with orders page for cache invalidation)
// =============================================================================

/**
 * Order query key factory
 * Must match the keys used in the orders page for proper cache invalidation
 */
const orderQueryKeys = {
  all: ['orders'] as const,
  list: (orgId: string) => [...orderQueryKeys.all, 'list', orgId] as const,
}

// =============================================================================
// HOOK IMPLEMENTATION
// =============================================================================

/**
 * useRealtimeOrders Hook
 *
 * Subscribes to Supabase Realtime for order changes and provides
 * callbacks for handling new orders and updates.
 *
 * @param options - Configuration options
 * @returns Connection status and control functions
 */
export function useRealtimeOrders(
  options: UseRealtimeOrdersOptions
): UseRealtimeOrdersReturn {
  const {
    organizationId,
    onNewOrder,
    onOrderUpdate,
    onOrderDelete,
    enabled = true,
  } = options

  const queryClient = useQueryClient()
  const channelRef = useRef<RealtimeChannel | null>(null)

  // Connection state
  const [isConnected, setIsConnected] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<
    'connecting' | 'connected' | 'disconnected' | 'error'
  >('disconnected')
  const [error, setError] = useState<string | null>(null)

  // ==========================================================================
  // HANDLERS
  // ==========================================================================

  /**
   * Handle INSERT events - new orders
   */
  const handleInsert = useCallback(
    (payload: OrderPayload) => {
      const newOrder = payload.new as Order

      // Safety check - ensure order belongs to correct organization
      if (newOrder.organization_id !== organizationId) {
        return
      }

      // Invalidate query cache to trigger refetch
      queryClient.invalidateQueries({
        queryKey: orderQueryKeys.list(organizationId!),
      })

      // Call user callback for notifications
      if (onNewOrder) {
        onNewOrder(newOrder)
      }
    },
    [organizationId, queryClient, onNewOrder]
  )

  /**
   * Handle UPDATE events - order status changes
   */
  const handleUpdate = useCallback(
    (payload: OrderPayload) => {
      const updatedOrder = payload.new as Order
      const oldOrder = payload.old as Partial<Order> | null

      // Safety check - ensure order belongs to correct organization
      if (updatedOrder.organization_id !== organizationId) {
        return
      }

      // Invalidate query cache to trigger refetch
      queryClient.invalidateQueries({
        queryKey: orderQueryKeys.list(organizationId!),
      })

      // Call user callback
      if (onOrderUpdate) {
        onOrderUpdate(updatedOrder, oldOrder)
      }
    },
    [organizationId, queryClient, onOrderUpdate]
  )

  /**
   * Handle DELETE events (soft delete)
   */
  const handleDelete = useCallback(
    (payload: OrderPayload) => {
      const deletedOrder = payload.old as Order

      // Safety check - ensure order belongs to correct organization
      if (deletedOrder.organization_id !== organizationId) {
        return
      }

      // Invalidate query cache
      queryClient.invalidateQueries({
        queryKey: orderQueryKeys.list(organizationId!),
      })

      // Call user callback
      if (onOrderDelete) {
        onOrderDelete(deletedOrder)
      }
    },
    [organizationId, queryClient, onOrderDelete]
  )

  // ==========================================================================
  // RECONNECT FUNCTION
  // ==========================================================================

  const reconnect = useCallback(() => {
    if (!organizationId || !enabled) return

    // Cleanup existing channel
    if (channelRef.current) {
      const supabase = createClient()
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }

    // Reset state
    setConnectionStatus('connecting')
    setError(null)
    setIsConnected(false)

    // Will trigger useEffect to recreate subscription
  }, [organizationId, enabled])

  // ==========================================================================
  // SUBSCRIPTION EFFECT
  // ==========================================================================

  useEffect(() => {
    // Don't subscribe if disabled or no org
    if (!enabled || !organizationId) {
      setConnectionStatus('disconnected')
      setIsConnected(false)
      return
    }

    const supabase = createClient()

    // Set connecting state
    setConnectionStatus('connecting')
    setError(null)

    // Create channel with unique name based on org
    const channelName = `orders-realtime-${organizationId}`
    const channel = supabase
      .channel(channelName, {
        config: {
          // Broadcast and presence are not needed for this use case
          broadcast: { self: false },
        },
      })
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders',
          filter: `organization_id=eq.${organizationId}`,
        },
        handleInsert
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `organization_id=eq.${organizationId}`,
        },
        handleUpdate
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'orders',
          filter: `organization_id=eq.${organizationId}`,
        },
        handleDelete
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          setConnectionStatus('connected')
          setIsConnected(true)
          setError(null)
        } else if (status === 'CHANNEL_ERROR') {
          setConnectionStatus('error')
          setIsConnected(false)
          setError(err?.message ?? 'Realtime baglantisi kurulamadi')
        } else if (status === 'TIMED_OUT') {
          setConnectionStatus('error')
          setIsConnected(false)
          setError('Realtime baglantisi zaman asimina ugradi')
        } else if (status === 'CLOSED') {
          setConnectionStatus('disconnected')
          setIsConnected(false)
        }
      })

    // Store channel reference
    channelRef.current = channel

    // Cleanup on unmount or dependency change
    return () => {
      if (channel) {
        supabase.removeChannel(channel)
      }
      channelRef.current = null
      setIsConnected(false)
      setConnectionStatus('disconnected')
    }
  }, [organizationId, enabled, handleInsert, handleUpdate, handleDelete])

  // ==========================================================================
  // RETURN
  // ==========================================================================

  return {
    isConnected,
    connectionStatus,
    error,
    reconnect,
  }
}

// =============================================================================
// UTILITY HOOKS
// =============================================================================

/**
 * useOrderRealtimeStatus Hook
 *
 * Simplified hook that only returns connection status for display purposes.
 *
 * @example
 * ```tsx
 * const { isConnected, status } = useOrderRealtimeStatus(orgId)
 * return <Badge variant={isConnected ? 'success' : 'warning'}>{status}</Badge>
 * ```
 */
export function useOrderRealtimeStatus(
  organizationId: string | null | undefined
): {
  isConnected: boolean
  status: 'connecting' | 'connected' | 'disconnected' | 'error'
} {
  const { isConnected, connectionStatus } = useRealtimeOrders({
    organizationId,
    enabled: !!organizationId,
  })

  return { isConnected, status: connectionStatus }
}
