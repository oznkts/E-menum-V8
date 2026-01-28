'use client'

/**
 * useRealtimeServiceRequests Hook
 *
 * Client-side hook for subscribing to real-time service request updates via Supabase Realtime.
 * Provides instant notifications when customers call waiters, request bills, or need help.
 *
 * Features:
 * - Subscribes to service_requests table INSERT/UPDATE events
 * - Filters by organization_id for multi-tenant isolation
 * - Provides callbacks for new request notifications (with audio support)
 * - Handles connection status for reliability feedback
 * - Automatic cleanup on unmount
 *
 * @example
 * ```tsx
 * 'use client'
 * import { useRealtimeServiceRequests } from '@/lib/hooks/use-realtime-service-requests'
 *
 * function ServiceRequestsPage() {
 *   const { pendingCount, isConnected } = useRealtimeServiceRequests({
 *     organizationId: 'org-123',
 *     onNewRequest: (request) => {
 *       playNotificationSound()
 *       toast({ title: 'Yeni Istek!', description: `Masa: ${request.table_name}` })
 *     },
 *   })
 *
 *   return <Badge>{pendingCount}</Badge>
 * }
 * ```
 *
 * @see https://supabase.com/docs/guides/realtime
 */

import { useEffect, useState, useRef, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import type { ServiceRequest, ServiceRequestType, ServiceRequestStatus } from '@/types/database'
import { SERVICE_REQUEST_TYPE_LABELS } from '@/lib/validations/orders'

// =============================================================================
// TYPES
// =============================================================================

/**
 * Payload for service request event from Supabase Realtime
 */
type ServiceRequestPayload = RealtimePostgresChangesPayload<{
  [key: string]: unknown
}>

/**
 * Configuration options for useRealtimeServiceRequests hook
 */
export interface UseRealtimeServiceRequestsOptions {
  /** Organization ID to filter requests for (required for multi-tenant isolation) */
  organizationId: string | null | undefined
  /** Callback fired when a new service request is created */
  onNewRequest?: (request: ServiceRequest) => void
  /** Callback fired when an existing request is updated */
  onRequestUpdate?: (request: ServiceRequest, oldRequest: Partial<ServiceRequest> | null) => void
  /** Whether realtime subscription is enabled (default: true) */
  enabled?: boolean
  /** Whether to play notification sound on new requests (default: true) */
  playSound?: boolean
  /** Filter by specific request types (default: all) */
  requestTypes?: ServiceRequestType[]
}

/**
 * Return type for useRealtimeServiceRequests hook
 */
export interface UseRealtimeServiceRequestsReturn {
  /** Count of pending service requests */
  pendingCount: number
  /** Whether the realtime connection is established */
  isConnected: boolean
  /** Current connection status */
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error'
  /** Error message if connection failed */
  error: string | null
  /** Manually reconnect to realtime */
  reconnect: () => void
  /** Latest new request (for notification display) */
  latestRequest: ServiceRequest | null
  /** Clear the latest request */
  clearLatestRequest: () => void
}

// =============================================================================
// QUERY KEYS
// =============================================================================

/**
 * Service request query key factory
 */
const serviceRequestQueryKeys = {
  all: ['service-requests'] as const,
  list: (orgId: string) => [...serviceRequestQueryKeys.all, 'list', orgId] as const,
  pending: (orgId: string) => [...serviceRequestQueryKeys.all, 'pending', orgId] as const,
}

// =============================================================================
// NOTIFICATION SOUND
// =============================================================================

/**
 * Play notification sound for new service requests
 * Uses Web Audio API for better control
 */
function playNotificationSound(): void {
  try {
    // Create a simple beep sound using Web Audio API
    const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)

    oscillator.frequency.value = 880 // A5 note
    oscillator.type = 'sine'
    gainNode.gain.value = 0.3

    oscillator.start()

    // Fade out
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3)

    oscillator.stop(audioContext.currentTime + 0.3)
  } catch {
    // Audio might not be available
  }
}

// =============================================================================
// HOOK IMPLEMENTATION
// =============================================================================

/**
 * useRealtimeServiceRequests Hook
 *
 * Subscribes to Supabase Realtime for service request changes and provides
 * callbacks for handling new requests and updates.
 *
 * @param options - Configuration options
 * @returns Connection status, pending count, and control functions
 */
export function useRealtimeServiceRequests(
  options: UseRealtimeServiceRequestsOptions
): UseRealtimeServiceRequestsReturn {
  const {
    organizationId,
    onNewRequest,
    onRequestUpdate,
    enabled = true,
    playSound = true,
    requestTypes,
  } = options

  const queryClient = useQueryClient()
  const channelRef = useRef<RealtimeChannel | null>(null)

  // Connection state
  const [isConnected, setIsConnected] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<
    'connecting' | 'connected' | 'disconnected' | 'error'
  >('disconnected')
  const [error, setError] = useState<string | null>(null)

  // Request state
  const [pendingCount, setPendingCount] = useState(0)
  const [latestRequest, setLatestRequest] = useState<ServiceRequest | null>(null)

  // Clear latest request
  const clearLatestRequest = useCallback(() => {
    setLatestRequest(null)
  }, [])

  // ==========================================================================
  // HANDLERS
  // ==========================================================================

  /**
   * Handle INSERT events - new service requests
   */
  const handleInsert = useCallback(
    (payload: ServiceRequestPayload) => {
      const newRequest = payload.new as ServiceRequest

      // Safety check - ensure request belongs to correct organization
      if (newRequest.organization_id !== organizationId) {
        return
      }

      // Filter by request type if specified
      if (requestTypes && requestTypes.length > 0) {
        if (!requestTypes.includes(newRequest.request_type as ServiceRequestType)) {
          return
        }
      }

      // Update pending count
      if (newRequest.status === 'pending') {
        setPendingCount((prev) => prev + 1)
      }

      // Set latest request for notification display
      setLatestRequest(newRequest)

      // Play notification sound
      if (playSound && newRequest.status === 'pending') {
        playNotificationSound()
      }

      // Invalidate query cache to trigger refetch
      queryClient.invalidateQueries({
        queryKey: serviceRequestQueryKeys.list(organizationId!),
      })
      queryClient.invalidateQueries({
        queryKey: serviceRequestQueryKeys.pending(organizationId!),
      })

      // Call user callback for custom handling
      if (onNewRequest) {
        onNewRequest(newRequest)
      }
    },
    [organizationId, queryClient, onNewRequest, playSound, requestTypes]
  )

  /**
   * Handle UPDATE events - service request status changes
   */
  const handleUpdate = useCallback(
    (payload: ServiceRequestPayload) => {
      const updatedRequest = payload.new as ServiceRequest
      const oldRequest = payload.old as Partial<ServiceRequest> | null

      // Safety check - ensure request belongs to correct organization
      if (updatedRequest.organization_id !== organizationId) {
        return
      }

      // Update pending count based on status change
      const wassPending = oldRequest?.status === 'pending'
      const isPending = updatedRequest.status === 'pending'

      if (wassPending && !isPending) {
        setPendingCount((prev) => Math.max(0, prev - 1))
      } else if (!wassPending && isPending) {
        setPendingCount((prev) => prev + 1)
      }

      // Invalidate query cache to trigger refetch
      queryClient.invalidateQueries({
        queryKey: serviceRequestQueryKeys.list(organizationId!),
      })
      queryClient.invalidateQueries({
        queryKey: serviceRequestQueryKeys.pending(organizationId!),
      })

      // Call user callback
      if (onRequestUpdate) {
        onRequestUpdate(updatedRequest, oldRequest)
      }
    },
    [organizationId, queryClient, onRequestUpdate]
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
  }, [organizationId, enabled])

  // ==========================================================================
  // INITIAL PENDING COUNT FETCH
  // ==========================================================================

  useEffect(() => {
    if (!organizationId || !enabled) {
      setPendingCount(0)
      return
    }

    const fetchPendingCount = async () => {
      const supabase = createClient()
      const { count, error } = await supabase
        .from('service_requests')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .eq('status', 'pending')

      if (!error && count !== null) {
        setPendingCount(count)
      }
    }

    fetchPendingCount()
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
    const channelName = `service-requests-realtime-${organizationId}`
    const channel = supabase
      .channel(channelName, {
        config: {
          broadcast: { self: false },
        },
      })
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'service_requests',
          filter: `organization_id=eq.${organizationId}`,
        },
        handleInsert
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'service_requests',
          filter: `organization_id=eq.${organizationId}`,
        },
        handleUpdate
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
  }, [organizationId, enabled, handleInsert, handleUpdate])

  // ==========================================================================
  // RETURN
  // ==========================================================================

  return {
    pendingCount,
    isConnected,
    connectionStatus,
    error,
    reconnect,
    latestRequest,
    clearLatestRequest,
  }
}

// =============================================================================
// UTILITY HOOKS
// =============================================================================

/**
 * useServiceRequestNotifications Hook
 *
 * Simplified hook for showing notifications on new service requests.
 * Pairs well with toast notifications.
 *
 * @example
 * ```tsx
 * const { latestRequest, dismiss } = useServiceRequestNotifications(orgId)
 *
 * useEffect(() => {
 *   if (latestRequest) {
 *     toast({
 *       title: getRequestLabel(latestRequest.request_type),
 *       description: `Masa: ${latestRequest.table_name}`,
 *       action: <Button onClick={dismiss}>Kapat</Button>
 *     })
 *   }
 * }, [latestRequest])
 * ```
 */
export function useServiceRequestNotifications(
  organizationId: string | null | undefined
): {
  latestRequest: ServiceRequest | null
  dismiss: () => void
  pendingCount: number
} {
  const { latestRequest, clearLatestRequest, pendingCount } = useRealtimeServiceRequests({
    organizationId,
    enabled: !!organizationId,
  })

  return {
    latestRequest,
    dismiss: clearLatestRequest,
    pendingCount,
  }
}

/**
 * useServiceRequestCount Hook
 *
 * Simple hook that just returns the pending count for badge display.
 *
 * @example
 * ```tsx
 * const count = useServiceRequestCount(orgId)
 * return <Badge variant="destructive">{count}</Badge>
 * ```
 */
export function useServiceRequestCount(
  organizationId: string | null | undefined
): number {
  const { pendingCount } = useRealtimeServiceRequests({
    organizationId,
    enabled: !!organizationId,
    playSound: false, // No sound for just the count
  })

  return pendingCount
}

/**
 * Get display label for request type
 */
export function getRequestTypeLabel(type: ServiceRequestType): string {
  return SERVICE_REQUEST_TYPE_LABELS[type] || type
}

/**
 * Get icon for request type
 */
export function getRequestTypeIcon(type: ServiceRequestType): string {
  switch (type) {
    case 'call_waiter':
      return '🔔'
    case 'request_bill':
      return '📄'
    case 'need_help':
      return '❓'
    case 'feedback':
      return '💬'
    case 'complaint':
      return '⚠️'
    default:
      return '🔔'
  }
}

/**
 * Get color for request status
 */
export function getRequestStatusColor(status: ServiceRequestStatus): {
  bg: string
  text: string
} {
  switch (status) {
    case 'pending':
      return { bg: 'bg-yellow-100', text: 'text-yellow-800' }
    case 'acknowledged':
      return { bg: 'bg-blue-100', text: 'text-blue-800' }
    case 'in_progress':
      return { bg: 'bg-orange-100', text: 'text-orange-800' }
    case 'completed':
      return { bg: 'bg-green-100', text: 'text-green-800' }
    case 'cancelled':
      return { bg: 'bg-gray-100', text: 'text-gray-800' }
    default:
      return { bg: 'bg-gray-100', text: 'text-gray-800' }
  }
}
