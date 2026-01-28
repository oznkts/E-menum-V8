/**
 * Orders Data Access Layer (DAL)
 *
 * This module provides type-safe database operations for orders, order items,
 * and service requests. All operations respect Row Level Security (RLS) policies.
 *
 * Features:
 * - Order CRUD with status tracking
 * - Order items with price locking
 * - Service request management
 * - Real-time order filtering and pagination
 * - Status transitions with validation
 * - Multi-tenant isolation via organization_id
 *
 * @module lib/dal/orders
 */

import { createClient } from '@/lib/supabase/server'
import type {
  Order,
  OrderInsert,
  OrderUpdate,
  OrderItem,
  OrderItemInsert,
  OrderItemUpdate,
  ServiceRequest,
  ServiceRequestInsert,
  ServiceRequestUpdate,
  OrderStatus,
  PaymentStatus,
  PaymentMethod,
  ServiceRequestStatus,
} from '@/types/database'
import {
  isValidStatusTransition,
  ORDER_STATUS_TRANSITIONS,
} from '@/lib/validations/orders'

// =============================================================================
// TYPES
// =============================================================================

/**
 * Order with items for detailed views
 */
export interface OrderWithItems extends Order {
  items: OrderItem[]
  item_count: number
}

/**
 * Order summary for list views
 */
export interface OrderSummary {
  id: string
  order_number: string
  table_name: string | null
  customer_name: string | null
  customer_phone: string | null
  order_type: Order['order_type']
  status: Order['status']
  payment_status: Order['payment_status']
  total_amount: number
  item_count: number
  created_at: string
  estimated_ready_at: string | null
}

/**
 * Options for listing orders
 */
export interface ListOrdersOptions {
  /** Filter by status(es) */
  status?: OrderStatus[]
  /** Filter by payment status(es) */
  paymentStatus?: PaymentStatus[]
  /** Filter by table ID */
  tableId?: string | null
  /** Filter by date range (from) */
  dateFrom?: string
  /** Filter by date range (to) */
  dateTo?: string
  /** Search term for order number or customer name */
  search?: string
  /** Include only active orders (not completed/cancelled) */
  activeOnly?: boolean
  /** Page number (1-based) */
  page?: number
  /** Items per page */
  limit?: number
  /** Sort by field */
  sortBy?: 'created_at' | 'updated_at' | 'order_number' | 'total_amount'
  /** Sort direction */
  sortOrder?: 'asc' | 'desc'
}

/**
 * Options for listing service requests
 */
export interface ListServiceRequestsOptions {
  /** Filter by status(es) */
  status?: ServiceRequestStatus[]
  /** Filter by request type(s) */
  requestType?: ServiceRequest['request_type'][]
  /** Filter by table ID */
  tableId?: string
  /** Filter by date range (from) */
  dateFrom?: string
  /** Filter by date range (to) */
  dateTo?: string
  /** Page number (1-based) */
  page?: number
  /** Items per page */
  limit?: number
}

/**
 * Paginated response
 */
export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

/**
 * Standard DAL response
 */
export interface DALResponse<T> {
  data: T | null
  error: DALError | null
}

/**
 * DAL error type
 */
export interface DALError {
  code: DALErrorCode
  message: string
  details?: string
}

/**
 * DAL error codes
 */
export type DALErrorCode =
  | 'not_found'
  | 'already_exists'
  | 'validation_error'
  | 'permission_denied'
  | 'database_error'
  | 'invalid_status_transition'
  | 'rate_limited'
  | 'unknown_error'

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Create a standardized error response
 */
function createErrorResponse<T>(
  code: DALErrorCode,
  message: string,
  details?: string
): DALResponse<T> {
  return {
    data: null,
    error: { code, message, details },
  }
}

/**
 * Create a standardized success response
 */
function createSuccessResponse<T>(data: T): DALResponse<T> {
  return {
    data,
    error: null,
  }
}

/**
 * Map Supabase error to DAL error
 */
function mapSupabaseError(error: { code?: string; message: string }): DALError {
  if (error.code === '23505') {
    return {
      code: 'already_exists',
      message: 'Bu kayıt zaten mevcut',
      details: error.message,
    }
  }

  if (error.code === '42501' || error.message.includes('permission')) {
    return {
      code: 'permission_denied',
      message: 'Bu işlem için yetkiniz yok',
      details: error.message,
    }
  }

  if (error.code === 'PGRST116') {
    return {
      code: 'not_found',
      message: 'Kayıt bulunamadı',
      details: error.message,
    }
  }

  return {
    code: 'database_error',
    message: 'Veritabanı hatası oluştu',
    details: error.message,
  }
}

// =============================================================================
// ORDER READ OPERATIONS
// =============================================================================

/**
 * Get orders for an organization with pagination and filtering
 *
 * @param organizationId - The organization UUID
 * @param options - List options for filtering, pagination, and sorting
 * @returns Paginated list of order summaries
 */
export async function getOrders(
  organizationId: string,
  options: ListOrdersOptions = {}
): Promise<DALResponse<PaginatedResponse<OrderSummary>>> {
  try {
    const supabase = await createClient()

    const {
      status,
      paymentStatus,
      tableId,
      dateFrom,
      dateTo,
      search,
      activeOnly = false,
      page = 1,
      limit = 20,
      sortBy = 'created_at',
      sortOrder = 'desc',
    } = options

    // Build count query
    let countQuery = supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', organizationId)

    // Build data query
    let dataQuery = supabase
      .from('orders')
      .select(`
        id,
        order_number,
        table_name,
        customer_name,
        customer_phone,
        order_type,
        status,
        payment_status,
        total_amount,
        created_at,
        estimated_ready_at,
        order_items(count)
      `)
      .eq('organization_id', organizationId)

    // Apply filters to both queries
    if (status && status.length > 0) {
      countQuery = countQuery.in('status', status)
      dataQuery = dataQuery.in('status', status)
    }

    if (paymentStatus && paymentStatus.length > 0) {
      countQuery = countQuery.in('payment_status', paymentStatus)
      dataQuery = dataQuery.in('payment_status', paymentStatus)
    }

    if (tableId) {
      countQuery = countQuery.eq('table_id', tableId)
      dataQuery = dataQuery.eq('table_id', tableId)
    }

    if (dateFrom) {
      countQuery = countQuery.gte('created_at', dateFrom)
      dataQuery = dataQuery.gte('created_at', dateFrom)
    }

    if (dateTo) {
      countQuery = countQuery.lte('created_at', dateTo)
      dataQuery = dataQuery.lte('created_at', dateTo)
    }

    if (search) {
      const searchPattern = `%${search}%`
      countQuery = countQuery.or(`order_number.ilike.${searchPattern},customer_name.ilike.${searchPattern}`)
      dataQuery = dataQuery.or(`order_number.ilike.${searchPattern},customer_name.ilike.${searchPattern}`)
    }

    if (activeOnly) {
      const activeStatuses: OrderStatus[] = ['pending', 'confirmed', 'preparing', 'ready', 'served']
      countQuery = countQuery.in('status', activeStatuses)
      dataQuery = dataQuery.in('status', activeStatuses)
    }

    // Apply sorting
    dataQuery = dataQuery.order(sortBy, { ascending: sortOrder === 'asc' })

    // Apply pagination
    const offset = (page - 1) * limit
    dataQuery = dataQuery.range(offset, offset + limit - 1)

    // Execute queries
    const [countResult, dataResult] = await Promise.all([countQuery, dataQuery])

    if (countResult.error) {
      return createErrorResponse('database_error', 'Sipariş sayısı alınamadı', countResult.error.message)
    }

    if (dataResult.error) {
      return createErrorResponse('database_error', 'Siparişler yüklenemedi', dataResult.error.message)
    }

    // Transform data
    const orders: OrderSummary[] = (dataResult.data ?? []).map((order) => {
      const itemCount = Array.isArray(order.order_items)
        ? (order.order_items[0] as { count: number } | undefined)?.count ?? 0
        : 0

      const { order_items: _, ...orderData } = order
      return {
        ...orderData,
        item_count: itemCount,
      } as OrderSummary
    })

    const total = countResult.count ?? 0
    const totalPages = Math.ceil(total / limit)

    return createSuccessResponse({
      data: orders,
      total,
      page,
      limit,
      totalPages,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return createErrorResponse('unknown_error', 'Beklenmeyen bir hata oluştu', message)
  }
}

/**
 * Get active orders for an organization (for KDS and dashboard)
 *
 * @param organizationId - The organization UUID
 * @returns Active orders sorted by creation time
 */
export async function getActiveOrders(
  organizationId: string
): Promise<DALResponse<OrderSummary[]>> {
  const result = await getOrders(organizationId, {
    activeOnly: true,
    limit: 100,
    sortBy: 'created_at',
    sortOrder: 'asc',
  })

  if (result.error) {
    return { data: null, error: result.error }
  }

  return createSuccessResponse(result.data?.data ?? [])
}

/**
 * Get a single order by ID with items
 *
 * @param orderId - The order UUID
 * @returns The order with all items
 */
export async function getOrderById(
  orderId: string
): Promise<DALResponse<OrderWithItems>> {
  try {
    const supabase = await createClient()

    const { data: order, error } = await supabase
      .from('orders')
      .select(`
        *,
        order_items(*)
      `)
      .eq('id', orderId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return createErrorResponse('not_found', 'Sipariş bulunamadı')
      }
      return createErrorResponse('database_error', 'Sipariş yüklenemedi', error.message)
    }

    const items = Array.isArray(order.order_items) ? order.order_items : []
    const { order_items: _, ...orderData } = order

    return createSuccessResponse({
      ...orderData,
      items: items as OrderItem[],
      item_count: items.length,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return createErrorResponse('unknown_error', 'Beklenmeyen bir hata oluştu', message)
  }
}

/**
 * Get order by order number
 *
 * @param organizationId - The organization UUID
 * @param orderNumber - The order number (e.g., ORD-20240123-0001)
 * @returns The order with items
 */
export async function getOrderByNumber(
  organizationId: string,
  orderNumber: string
): Promise<DALResponse<OrderWithItems>> {
  try {
    const supabase = await createClient()

    const { data: order, error } = await supabase
      .from('orders')
      .select(`
        *,
        order_items(*)
      `)
      .eq('organization_id', organizationId)
      .eq('order_number', orderNumber)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return createErrorResponse('not_found', 'Sipariş bulunamadı')
      }
      return createErrorResponse('database_error', 'Sipariş yüklenemedi', error.message)
    }

    const items = Array.isArray(order.order_items) ? order.order_items : []
    const { order_items: _, ...orderData } = order

    return createSuccessResponse({
      ...orderData,
      items: items as OrderItem[],
      item_count: items.length,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return createErrorResponse('unknown_error', 'Beklenmeyen bir hata oluştu', message)
  }
}

/**
 * Get orders for a specific table
 *
 * @param tableId - The table UUID
 * @param options - List options
 * @returns Orders for the table
 */
export async function getOrdersByTable(
  tableId: string,
  options: Omit<ListOrdersOptions, 'tableId'> = {}
): Promise<DALResponse<OrderSummary[]>> {
  try {
    const supabase = await createClient()

    // Get the table's organization first
    const { data: table, error: tableError } = await supabase
      .from('restaurant_tables')
      .select('organization_id')
      .eq('id', tableId)
      .single()

    if (tableError) {
      return createErrorResponse('not_found', 'Masa bulunamadı')
    }

    const result = await getOrders(table.organization_id, {
      ...options,
      tableId,
    })

    if (result.error) {
      return { data: null, error: result.error }
    }

    return createSuccessResponse(result.data?.data ?? [])
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return createErrorResponse('unknown_error', 'Beklenmeyen bir hata oluştu', message)
  }
}

/**
 * Count orders by status for dashboard widgets
 *
 * @param organizationId - The organization UUID
 * @returns Count of orders by status
 */
export async function getOrderCounts(
  organizationId: string
): Promise<DALResponse<Record<OrderStatus, number>>> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('orders')
      .select('status')
      .eq('organization_id', organizationId)
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours

    if (error) {
      return createErrorResponse('database_error', 'Sipariş sayıları alınamadı', error.message)
    }

    const counts: Record<OrderStatus, number> = {
      pending: 0,
      confirmed: 0,
      preparing: 0,
      ready: 0,
      served: 0,
      completed: 0,
      cancelled: 0,
    }

    for (const order of data ?? []) {
      counts[order.status as OrderStatus]++
    }

    return createSuccessResponse(counts)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return createErrorResponse('unknown_error', 'Beklenmeyen bir hata oluştu', message)
  }
}

// =============================================================================
// ORDER WRITE OPERATIONS
// =============================================================================

/**
 * Create a new order with items
 *
 * @param orderData - The order data
 * @param items - The order items
 * @returns The created order with items
 */
export async function createOrder(
  orderData: OrderInsert,
  items: OrderItemInsert[]
): Promise<DALResponse<OrderWithItems>> {
  try {
    const supabase = await createClient()

    // Create the order first
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert(orderData)
      .select()
      .single()

    if (orderError) {
      return { data: null, error: mapSupabaseError(orderError) }
    }

    // Create the order items with the order ID
    const itemsWithOrderId = items.map((item) => ({
      ...item,
      organization_id: orderData.organization_id,
      order_id: order.id,
    }))

    const { data: createdItems, error: itemsError } = await supabase
      .from('order_items')
      .insert(itemsWithOrderId)
      .select()

    if (itemsError) {
      // Attempt to clean up the order if items failed
      await supabase.from('orders').delete().eq('id', order.id)
      return { data: null, error: mapSupabaseError(itemsError) }
    }

    return createSuccessResponse({
      ...order,
      items: createdItems ?? [],
      item_count: createdItems?.length ?? 0,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return createErrorResponse('unknown_error', 'Sipariş oluşturulamadı', message)
  }
}

/**
 * Update order status with validation
 *
 * @param orderId - The order UUID
 * @param newStatus - The new status
 * @param changedBy - The user making the change (optional)
 * @returns The updated order
 */
export async function updateOrderStatus(
  orderId: string,
  newStatus: OrderStatus,
  changedBy?: string
): Promise<DALResponse<Order>> {
  try {
    const supabase = await createClient()

    // Get current order status
    const { data: currentOrder, error: fetchError } = await supabase
      .from('orders')
      .select('status')
      .eq('id', orderId)
      .single()

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return createErrorResponse('not_found', 'Sipariş bulunamadı')
      }
      return createErrorResponse('database_error', 'Sipariş durumu alınamadı', fetchError.message)
    }

    // Validate status transition
    if (!isValidStatusTransition(currentOrder.status as OrderStatus, newStatus)) {
      const validTransitions = ORDER_STATUS_TRANSITIONS[currentOrder.status as OrderStatus]
      return createErrorResponse(
        'invalid_status_transition',
        `"${currentOrder.status}" durumundan "${newStatus}" durumuna geçiş yapılamaz. Geçerli durumlar: ${validTransitions.join(', ')}`
      )
    }

    // Build update data
    const updateData: OrderUpdate = {
      status: newStatus,
      status_changed_at: new Date().toISOString(),
      status_changed_by: changedBy || null,
    }

    // Add timestamp fields based on status
    if (newStatus === 'ready') {
      updateData.actual_ready_at = new Date().toISOString()
    } else if (newStatus === 'served') {
      updateData.served_at = new Date().toISOString()
    } else if (newStatus === 'cancelled') {
      updateData.cancelled_at = new Date().toISOString()
      updateData.cancelled_by = changedBy || null
    }

    // Update the order
    const { data: order, error: updateError } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', orderId)
      .select()
      .single()

    if (updateError) {
      return { data: null, error: mapSupabaseError(updateError) }
    }

    return createSuccessResponse(order)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return createErrorResponse('unknown_error', 'Sipariş durumu güncellenemedi', message)
  }
}

/**
 * Cancel an order with reason
 *
 * @param orderId - The order UUID
 * @param reason - Cancellation reason
 * @param cancelledBy - The user cancelling (optional)
 * @returns The cancelled order
 */
export async function cancelOrder(
  orderId: string,
  reason: string,
  cancelledBy?: string
): Promise<DALResponse<Order>> {
  try {
    const supabase = await createClient()

    // Get current order status
    const { data: currentOrder, error: fetchError } = await supabase
      .from('orders')
      .select('status')
      .eq('id', orderId)
      .single()

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return createErrorResponse('not_found', 'Sipariş bulunamadı')
      }
      return createErrorResponse('database_error', 'Sipariş durumu alınamadı', fetchError.message)
    }

    // Check if can be cancelled
    if (!isValidStatusTransition(currentOrder.status as OrderStatus, 'cancelled')) {
      return createErrorResponse(
        'invalid_status_transition',
        'Bu sipariş iptal edilemez'
      )
    }

    // Update the order
    const { data: order, error: updateError } = await supabase
      .from('orders')
      .update({
        status: 'cancelled',
        status_changed_at: new Date().toISOString(),
        cancelled_at: new Date().toISOString(),
        cancelled_by: cancelledBy || null,
        cancellation_reason: reason,
      })
      .eq('id', orderId)
      .select()
      .single()

    if (updateError) {
      return { data: null, error: mapSupabaseError(updateError) }
    }

    return createSuccessResponse(order)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return createErrorResponse('unknown_error', 'Sipariş iptal edilemedi', message)
  }
}

/**
 * Update order payment status
 *
 * @param orderId - The order UUID
 * @param paymentStatus - The new payment status
 * @param paymentMethod - The payment method (optional)
 * @param paidAmount - The amount paid (optional)
 * @returns The updated order
 */
export async function updateOrderPayment(
  orderId: string,
  paymentStatus: PaymentStatus,
  paymentMethod?: PaymentMethod | null,
  paidAmount?: number | null
): Promise<DALResponse<Order>> {
  try {
    const supabase = await createClient()

    const updateData: OrderUpdate = {
      payment_status: paymentStatus,
    }

    if (paymentMethod !== undefined) {
      updateData.payment_method = paymentMethod
    }

    if (paidAmount !== undefined) {
      updateData.paid_amount = paidAmount
    }

    if (paymentStatus === 'paid') {
      updateData.paid_at = new Date().toISOString()
    }

    const { data: order, error } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', orderId)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return createErrorResponse('not_found', 'Sipariş bulunamadı')
      }
      return { data: null, error: mapSupabaseError(error) }
    }

    return createSuccessResponse(order)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return createErrorResponse('unknown_error', 'Ödeme durumu güncellenemedi', message)
  }
}

/**
 * Assign an order to a staff member
 *
 * @param orderId - The order UUID
 * @param assignedTo - The user ID to assign to
 * @returns The updated order
 */
export async function assignOrder(
  orderId: string,
  assignedTo: string | null
): Promise<DALResponse<Order>> {
  try {
    const supabase = await createClient()

    const { data: order, error } = await supabase
      .from('orders')
      .update({
        assigned_to: assignedTo,
        assigned_at: assignedTo ? new Date().toISOString() : null,
      })
      .eq('id', orderId)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return createErrorResponse('not_found', 'Sipariş bulunamadı')
      }
      return { data: null, error: mapSupabaseError(error) }
    }

    return createSuccessResponse(order)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return createErrorResponse('unknown_error', 'Sipariş atanamadı', message)
  }
}

/**
 * Update order estimated ready time
 *
 * @param orderId - The order UUID
 * @param estimatedMinutes - Minutes until ready
 * @returns The updated order
 */
export async function updateOrderEstimatedTime(
  orderId: string,
  estimatedMinutes: number
): Promise<DALResponse<Order>> {
  try {
    const supabase = await createClient()

    const estimatedReadyAt = new Date(Date.now() + estimatedMinutes * 60 * 1000).toISOString()

    const { data: order, error } = await supabase
      .from('orders')
      .update({
        estimated_ready_at: estimatedReadyAt,
      })
      .eq('id', orderId)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return createErrorResponse('not_found', 'Sipariş bulunamadı')
      }
      return { data: null, error: mapSupabaseError(error) }
    }

    return createSuccessResponse(order)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return createErrorResponse('unknown_error', 'Tahmini süre güncellenemedi', message)
  }
}

/**
 * Update order internal notes
 *
 * @param orderId - The order UUID
 * @param notes - The internal notes
 * @returns The updated order
 */
export async function updateOrderNotes(
  orderId: string,
  notes: string | null
): Promise<DALResponse<Order>> {
  try {
    const supabase = await createClient()

    const { data: order, error } = await supabase
      .from('orders')
      .update({ internal_notes: notes })
      .eq('id', orderId)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return createErrorResponse('not_found', 'Sipariş bulunamadı')
      }
      return { data: null, error: mapSupabaseError(error) }
    }

    return createSuccessResponse(order)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return createErrorResponse('unknown_error', 'Notlar güncellenemedi', message)
  }
}

// =============================================================================
// ORDER ITEM OPERATIONS
// =============================================================================

/**
 * Get items for an order
 *
 * @param orderId - The order UUID
 * @returns The order items
 */
export async function getOrderItems(
  orderId: string
): Promise<DALResponse<OrderItem[]>> {
  try {
    const supabase = await createClient()

    const { data: items, error } = await supabase
      .from('order_items')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: true })

    if (error) {
      return createErrorResponse('database_error', 'Sipariş kalemleri yüklenemedi', error.message)
    }

    return createSuccessResponse(items ?? [])
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return createErrorResponse('unknown_error', 'Beklenmeyen bir hata oluştu', message)
  }
}

/**
 * Update order item status (for KDS)
 *
 * @param itemId - The order item UUID
 * @param status - The new status
 * @returns The updated order item
 */
export async function updateOrderItemStatus(
  itemId: string,
  status: OrderStatus
): Promise<DALResponse<OrderItem>> {
  try {
    const supabase = await createClient()

    const updateData: OrderItemUpdate = {
      status,
      status_changed_at: new Date().toISOString(),
    }

    // Add timestamp fields based on status
    if (status === 'preparing') {
      updateData.started_preparing_at = new Date().toISOString()
    } else if (status === 'ready') {
      updateData.ready_at = new Date().toISOString()
    } else if (status === 'served') {
      updateData.served_at = new Date().toISOString()
    }

    const { data: item, error } = await supabase
      .from('order_items')
      .update(updateData)
      .eq('id', itemId)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return createErrorResponse('not_found', 'Sipariş kalemi bulunamadı')
      }
      return { data: null, error: mapSupabaseError(error) }
    }

    return createSuccessResponse(item)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return createErrorResponse('unknown_error', 'Sipariş kalemi durumu güncellenemedi', message)
  }
}

/**
 * Bulk update order items status
 *
 * @param itemIds - The order item UUIDs
 * @param status - The new status
 * @returns Success indicator
 */
export async function bulkUpdateOrderItemsStatus(
  itemIds: string[],
  status: OrderStatus
): Promise<DALResponse<boolean>> {
  try {
    const supabase = await createClient()

    const updateData: OrderItemUpdate = {
      status,
      status_changed_at: new Date().toISOString(),
    }

    if (status === 'preparing') {
      updateData.started_preparing_at = new Date().toISOString()
    } else if (status === 'ready') {
      updateData.ready_at = new Date().toISOString()
    } else if (status === 'served') {
      updateData.served_at = new Date().toISOString()
    }

    const { error } = await supabase
      .from('order_items')
      .update(updateData)
      .in('id', itemIds)

    if (error) {
      return { data: null, error: mapSupabaseError(error) }
    }

    return createSuccessResponse(true)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return createErrorResponse('unknown_error', 'Sipariş kalemleri güncellenemedi', message)
  }
}

// =============================================================================
// SERVICE REQUEST OPERATIONS
// =============================================================================

/**
 * Get service requests for an organization
 *
 * @param organizationId - The organization UUID
 * @param options - List options
 * @returns Service requests
 */
export async function getServiceRequests(
  organizationId: string,
  options: ListServiceRequestsOptions = {}
): Promise<DALResponse<PaginatedResponse<ServiceRequest>>> {
  try {
    const supabase = await createClient()

    const {
      status,
      requestType,
      tableId,
      dateFrom,
      dateTo,
      page = 1,
      limit = 20,
    } = options

    // Build count query
    let countQuery = supabase
      .from('service_requests')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', organizationId)

    // Build data query
    let dataQuery = supabase
      .from('service_requests')
      .select(`
        *,
        restaurant_tables!inner(name, table_number, section)
      `)
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })

    // Apply filters
    if (status && status.length > 0) {
      countQuery = countQuery.in('status', status)
      dataQuery = dataQuery.in('status', status)
    }

    if (requestType && requestType.length > 0) {
      countQuery = countQuery.in('request_type', requestType)
      dataQuery = dataQuery.in('request_type', requestType)
    }

    if (tableId) {
      countQuery = countQuery.eq('table_id', tableId)
      dataQuery = dataQuery.eq('table_id', tableId)
    }

    if (dateFrom) {
      countQuery = countQuery.gte('created_at', dateFrom)
      dataQuery = dataQuery.gte('created_at', dateFrom)
    }

    if (dateTo) {
      countQuery = countQuery.lte('created_at', dateTo)
      dataQuery = dataQuery.lte('created_at', dateTo)
    }

    // Apply pagination
    const offset = (page - 1) * limit
    dataQuery = dataQuery.range(offset, offset + limit - 1)

    // Execute queries
    const [countResult, dataResult] = await Promise.all([countQuery, dataQuery])

    if (countResult.error) {
      return createErrorResponse('database_error', 'İstek sayısı alınamadı', countResult.error.message)
    }

    if (dataResult.error) {
      return createErrorResponse('database_error', 'İstekler yüklenemedi', dataResult.error.message)
    }

    const total = countResult.count ?? 0
    const totalPages = Math.ceil(total / limit)

    return createSuccessResponse({
      data: dataResult.data ?? [],
      total,
      page,
      limit,
      totalPages,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return createErrorResponse('unknown_error', 'Beklenmeyen bir hata oluştu', message)
  }
}

/**
 * Get pending service requests (for staff notifications)
 *
 * @param organizationId - The organization UUID
 * @returns Pending service requests
 */
export async function getPendingServiceRequests(
  organizationId: string
): Promise<DALResponse<ServiceRequest[]>> {
  const result = await getServiceRequests(organizationId, {
    status: ['pending'],
    limit: 50,
  })

  if (result.error) {
    return { data: null, error: result.error }
  }

  return createSuccessResponse(result.data?.data ?? [])
}

/**
 * Create a service request (waiter call)
 *
 * @param data - The service request data
 * @returns The created service request
 */
export async function createServiceRequest(
  data: ServiceRequestInsert
): Promise<DALResponse<ServiceRequest>> {
  try {
    const supabase = await createClient()

    // Check rate limiting - max 3 requests per table in 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
    const { count, error: countError } = await supabase
      .from('service_requests')
      .select('id', { count: 'exact', head: true })
      .eq('table_id', data.table_id)
      .gte('created_at', fiveMinutesAgo)

    if (countError) {
      return createErrorResponse('database_error', 'Hız sınırı kontrol edilemedi', countError.message)
    }

    if ((count ?? 0) >= 3) {
      return createErrorResponse(
        'rate_limited',
        'Lütfen birkaç dakika bekleyin ve tekrar deneyin'
      )
    }

    // Create the service request
    const { data: request, error } = await supabase
      .from('service_requests')
      .insert(data)
      .select()
      .single()

    if (error) {
      return { data: null, error: mapSupabaseError(error) }
    }

    return createSuccessResponse(request)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return createErrorResponse('unknown_error', 'İstek oluşturulamadı', message)
  }
}

/**
 * Update service request status
 *
 * @param requestId - The service request UUID
 * @param status - The new status
 * @param handledBy - The user handling the request (optional)
 * @param response - Response message (optional)
 * @returns The updated service request
 */
export async function updateServiceRequestStatus(
  requestId: string,
  status: ServiceRequestStatus,
  handledBy?: string,
  response?: string
): Promise<DALResponse<ServiceRequest>> {
  try {
    const supabase = await createClient()

    const updateData: ServiceRequestUpdate = {
      status,
      status_changed_at: new Date().toISOString(),
    }

    if (handledBy) {
      updateData.handled_by = handledBy
      updateData.handled_at = new Date().toISOString()
    }

    if (response) {
      updateData.response = response
    }

    const { data: request, error } = await supabase
      .from('service_requests')
      .update(updateData)
      .eq('id', requestId)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return createErrorResponse('not_found', 'İstek bulunamadı')
      }
      return { data: null, error: mapSupabaseError(error) }
    }

    return createSuccessResponse(request)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return createErrorResponse('unknown_error', 'İstek durumu güncellenemedi', message)
  }
}

// =============================================================================
// ANALYTICS OPERATIONS
// =============================================================================

/**
 * Get order statistics for a date range
 *
 * @param organizationId - The organization UUID
 * @param dateFrom - Start date
 * @param dateTo - End date
 * @returns Order statistics
 */
export async function getOrderStatistics(
  organizationId: string,
  dateFrom: string,
  dateTo: string
): Promise<DALResponse<{
  totalOrders: number
  totalRevenue: number
  averageOrderValue: number
  completedOrders: number
  cancelledOrders: number
  ordersByType: Record<string, number>
  ordersByStatus: Record<string, number>
}>> {
  try {
    const supabase = await createClient()

    console.log('[getOrderStatistics] Query params:', {
      organizationId,
      dateFrom,
      dateTo,
    })

    const { data: orders, error } = await supabase
      .from('orders')
      .select('order_type, status, total_amount')
      .eq('organization_id', organizationId)
      .gte('created_at', dateFrom)
      .lte('created_at', dateTo)

    console.log('[getOrderStatistics] Query result:', {
      ordersCount: orders?.length ?? 0,
      orders: orders,
      error: error?.message,
    })

    if (error) {
      return createErrorResponse('database_error', 'İstatistikler alınamadı', error.message)
    }

    const stats = {
      totalOrders: orders?.length ?? 0,
      totalRevenue: 0,
      averageOrderValue: 0,
      completedOrders: 0,
      cancelledOrders: 0,
      ordersByType: {} as Record<string, number>,
      ordersByStatus: {} as Record<string, number>,
    }

    for (const order of orders ?? []) {
      stats.totalRevenue += Number(order.total_amount) || 0

      if (order.status === 'completed') {
        stats.completedOrders++
      } else if (order.status === 'cancelled') {
        stats.cancelledOrders++
      }

      stats.ordersByType[order.order_type] = (stats.ordersByType[order.order_type] ?? 0) + 1
      stats.ordersByStatus[order.status] = (stats.ordersByStatus[order.status] ?? 0) + 1
    }

    if (stats.totalOrders > 0) {
      stats.averageOrderValue = stats.totalRevenue / stats.totalOrders
    }

    console.log('[getOrderStatistics] Calculated stats:', stats)

    return createSuccessResponse(stats)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return createErrorResponse('unknown_error', 'İstatistikler alınamadı', message)
  }
}
