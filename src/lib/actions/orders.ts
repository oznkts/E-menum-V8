'use server'

/**
 * Order Server Actions
 *
 * This module contains all order-related Server Actions for:
 * - Order creation (customer-facing)
 * - Order status management (staff-facing)
 * - Order cancellation
 * - Payment status updates
 * - Order item status updates (KDS)
 * - Service request management
 *
 * All actions:
 * - Use Zod for input validation with Turkish error messages
 * - Return standardized OrderActionResponse
 * - Revalidate affected paths on success
 * - Log errors for debugging (not exposed to client)
 *
 * @see MASTER-PROMPT.md
 * @see https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions
 */

import { revalidatePath } from 'next/cache'
import {
  // Order DAL
  createOrder as dalCreateOrder,
  updateOrderStatus as dalUpdateOrderStatus,
  cancelOrder as dalCancelOrder,
  updateOrderPayment as dalUpdateOrderPayment,
  assignOrder as dalAssignOrder,
  updateOrderEstimatedTime as dalUpdateOrderEstimatedTime,
  updateOrderNotes as dalUpdateOrderNotes,
  // Order item DAL
  updateOrderItemStatus as dalUpdateOrderItemStatus,
  bulkUpdateOrderItemsStatus as dalBulkUpdateOrderItemsStatus,
  // Service request DAL
  createServiceRequest as dalCreateServiceRequest,
  updateServiceRequestStatus as dalUpdateServiceRequestStatus,
} from '@/lib/dal/orders'
import {
  // Validation schemas
  createOrderSchema,
  updateOrderStatusSchema,
  cancelOrderSchema,
  updatePaymentSchema,
  assignOrderSchema,
  updateOrderItemStatusSchema,
  bulkUpdateOrderItemsStatusSchema,
  createServiceRequestSchema,
  updateServiceRequestSchema,
  isValidStatusTransition,
  canCancelOrder,
  type CreateOrderInput,
  type UpdateOrderStatusInput,
  type CancelOrderInput,
  type UpdatePaymentInput,
  type AssignOrderInput,
  type UpdateOrderItemStatusInput,
  type BulkUpdateOrderItemsStatusInput,
  type CreateServiceRequestInput,
  type UpdateServiceRequestInput,
} from '@/lib/validations/orders'
import type { Order, OrderItem, ServiceRequest, OrderStatus } from '@/types/database'

// =============================================================================
// TYPES
// =============================================================================

/**
 * Standard action response for all order operations
 */
export interface OrderActionResponse<T = unknown> {
  success: boolean
  message: string
  data?: T
  error?: string
  errorCode?: OrderErrorCode
}

/**
 * Order error codes for programmatic handling
 */
export type OrderErrorCode =
  | 'not_found'
  | 'already_exists'
  | 'validation_error'
  | 'permission_denied'
  | 'database_error'
  | 'invalid_status_transition'
  | 'rate_limited'
  | 'unknown_error'

/**
 * Turkish messages for order actions
 */
const ORDER_ACTION_MESSAGES = {
  // Order messages
  orderCreated: 'Sipariş başarıyla oluşturuldu',
  orderStatusUpdated: 'Sipariş durumu güncellendi',
  orderCancelled: 'Sipariş iptal edildi',
  orderNotFound: 'Sipariş bulunamadı',
  orderNotCancellable: 'Bu sipariş iptal edilemez',
  orderAssigned: 'Sipariş personele atandı',
  orderUnassigned: 'Sipariş ataması kaldırıldı',
  orderEstimatedTimeUpdated: 'Tahmini süre güncellendi',
  orderNotesUpdated: 'Sipariş notları güncellendi',

  // Payment messages
  paymentStatusUpdated: 'Ödeme durumu güncellendi',
  paymentStatusInvalid: 'Geçersiz ödeme durumu',

  // Order item messages
  orderItemStatusUpdated: 'Sipariş kalemi durumu güncellendi',
  orderItemNotFound: 'Sipariş kalemi bulunamadı',
  orderItemsStatusUpdated: 'Sipariş kalemleri güncellendi',

  // Service request messages
  serviceRequestCreated: 'İsteğiniz alındı, personelimiz yakında size yardımcı olacak',
  serviceRequestStatusUpdated: 'İstek durumu güncellendi',
  serviceRequestNotFound: 'İstek bulunamadı',
  serviceRequestRateLimited: 'Lütfen birkaç dakika bekleyin ve tekrar deneyin',

  // Status transition messages
  invalidStatusTransition: 'Bu durum geçişi yapılamaz',

  // Generic messages
  validationError: 'Girilen bilgiler geçersiz',
  serverError: 'Bir hata oluştu. Lütfen tekrar deneyin.',
  unknownError: 'Beklenmeyen bir hata oluştu',
  permissionDenied: 'Bu işlem için yetkiniz yok',
} as const

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Create a standardized error response
 */
function createErrorResponse<T>(
  message: string,
  errorCode: OrderErrorCode,
  details?: string
): OrderActionResponse<T> {
  return {
    success: false,
    message,
    errorCode,
    error: details,
  }
}

/**
 * Create a standardized success response
 */
function createSuccessResponse<T>(
  message: string,
  data?: T
): OrderActionResponse<T> {
  return {
    success: true,
    message,
    data,
  }
}

/**
 * Map DAL error to action error
 */
function mapDALError(error: { code: string; message: string }): OrderErrorCode {
  switch (error.code) {
    case 'not_found':
      return 'not_found'
    case 'already_exists':
      return 'already_exists'
    case 'validation_error':
      return 'validation_error'
    case 'permission_denied':
      return 'permission_denied'
    case 'database_error':
      return 'database_error'
    case 'invalid_status_transition':
      return 'invalid_status_transition'
    case 'rate_limited':
      return 'rate_limited'
    default:
      return 'unknown_error'
  }
}

// =============================================================================
// ORDER ACTIONS
// =============================================================================

/**
 * Create Order Server Action (Customer-facing)
 *
 * Creates a new order with items from the customer's cart.
 * Prices are locked at time of cart addition.
 *
 * @param input - Order creation input with items
 * @returns OrderActionResponse with created order
 */
export async function createOrder(
  input: CreateOrderInput
): Promise<OrderActionResponse<Order>> {
  try {
    // 1. Validate input
    const validationResult = createOrderSchema.safeParse(input)

    if (!validationResult.success) {
      const firstError = validationResult.error.errors[0]
      return createErrorResponse(
        firstError?.message ?? ORDER_ACTION_MESSAGES.validationError,
        'validation_error'
      )
    }

    const validatedInput = validationResult.data

    // 2. Prepare order data
    const orderData = {
      organization_id: validatedInput.organization_id,
      table_id: validatedInput.table_id ?? null,
      table_name: validatedInput.table_name ?? null,
      customer_name: validatedInput.customer_name ?? null,
      customer_phone: validatedInput.customer_phone ?? null,
      customer_email: validatedInput.customer_email ?? null,
      customer_notes: validatedInput.customer_notes ?? null,
      order_type: validatedInput.order_type,
      subtotal: validatedInput.subtotal,
      total_amount: validatedInput.total_amount,
      currency: validatedInput.currency,
      status: 'pending' as const,
      payment_status: 'pending' as const,
      source: 'qr_menu',
    }

    // 3. Prepare order items
    const orderItems = validatedInput.items.map((item) => ({
      product_id: item.product_id,
      product_name: item.product_name,
      product_description: item.product_description ?? null,
      product_image_url: item.product_image_url ?? null,
      quantity: item.quantity,
      unit_price: item.unit_price,
      modifier_total: item.modifier_total ?? 0,
      item_total: item.item_total,
      currency: item.currency,
      price_ledger_id: item.price_ledger_id ?? null,
      selected_modifiers: item.selected_modifiers ?? [],
      special_instructions: item.special_instructions ?? null,
      status: 'pending' as const,
    }))

    // 4. Create order via DAL
    const { data: order, error } = await dalCreateOrder(orderData, orderItems)

    if (error) {
      return createErrorResponse(
        error.message,
        mapDALError(error),
        error.details
      )
    }

    // 5. Revalidate paths
    revalidatePath('/dashboard/orders')
    revalidatePath('/dashboard')
    revalidatePath('/dashboard/kds')

    // 6. Return success
    return createSuccessResponse(ORDER_ACTION_MESSAGES.orderCreated, order)
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    return createErrorResponse(
      ORDER_ACTION_MESSAGES.serverError,
      'unknown_error',
      errorMessage
    )
  }
}

/**
 * Update Order Status Server Action (Staff-facing)
 *
 * Updates order status with validation of allowed transitions.
 *
 * @param _prevState - Previous form state (for useFormState)
 * @param formData - Form data containing order_id and status
 * @returns OrderActionResponse with updated order
 */
export async function updateOrderStatus(
  _prevState: OrderActionResponse | null,
  formData: FormData
): Promise<OrderActionResponse<Order>> {
  try {
    // 1. Extract and validate input
    const rawInput = {
      order_id: formData.get('order_id'),
      status: formData.get('status'),
      estimated_ready_minutes: formData.get('estimated_ready_minutes')
        ? Number(formData.get('estimated_ready_minutes'))
        : undefined,
      internal_notes: formData.get('internal_notes') || undefined,
    }

    const validationResult = updateOrderStatusSchema.safeParse(rawInput)

    if (!validationResult.success) {
      const firstError = validationResult.error.errors[0]
      return createErrorResponse(
        firstError?.message ?? ORDER_ACTION_MESSAGES.validationError,
        'validation_error'
      )
    }

    const { order_id, status, estimated_ready_minutes, internal_notes } = validationResult.data

    // 2. Update order status via DAL
    const { data: order, error } = await dalUpdateOrderStatus(
      order_id,
      status as OrderStatus
    )

    if (error) {
      return createErrorResponse(
        error.message,
        mapDALError(error),
        error.details
      )
    }

    // 3. Update estimated time if provided
    if (estimated_ready_minutes && order) {
      await dalUpdateOrderEstimatedTime(order_id, estimated_ready_minutes)
    }

    // 4. Update notes if provided
    if (internal_notes !== undefined && order) {
      await dalUpdateOrderNotes(order_id, internal_notes)
    }

    // 5. Revalidate paths
    revalidatePath('/dashboard/orders')
    revalidatePath('/dashboard')
    revalidatePath('/dashboard/kds')
    revalidatePath(`/dashboard/orders/${order_id}`)

    // 6. Return success
    return createSuccessResponse(ORDER_ACTION_MESSAGES.orderStatusUpdated, order)
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    return createErrorResponse(
      ORDER_ACTION_MESSAGES.serverError,
      'unknown_error',
      errorMessage
    )
  }
}

/**
 * Quick Update Order Status (for button clicks)
 *
 * A simpler version for quick status updates without form data.
 *
 * @param orderId - The order UUID
 * @param newStatus - The new status
 * @returns OrderActionResponse with updated order
 */
export async function quickUpdateOrderStatus(
  orderId: string,
  newStatus: OrderStatus
): Promise<OrderActionResponse<Order>> {
  try {
    // 1. Validate inputs
    if (!orderId || !newStatus) {
      return createErrorResponse(
        ORDER_ACTION_MESSAGES.validationError,
        'validation_error'
      )
    }

    // 2. Update order status via DAL
    const { data: order, error } = await dalUpdateOrderStatus(orderId, newStatus)

    if (error) {
      return createErrorResponse(
        error.message,
        mapDALError(error),
        error.details
      )
    }

    // 3. Revalidate paths
    revalidatePath('/dashboard/orders')
    revalidatePath('/dashboard')
    revalidatePath('/dashboard/kds')
    revalidatePath(`/dashboard/orders/${orderId}`)

    // 4. Return success
    return createSuccessResponse(ORDER_ACTION_MESSAGES.orderStatusUpdated, order)
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    return createErrorResponse(
      ORDER_ACTION_MESSAGES.serverError,
      'unknown_error',
      errorMessage
    )
  }
}

/**
 * Cancel Order Server Action
 *
 * Cancels an order with a reason.
 *
 * @param _prevState - Previous form state (for useFormState)
 * @param formData - Form data containing order_id and cancellation_reason
 * @returns OrderActionResponse with cancelled order
 */
export async function cancelOrder(
  _prevState: OrderActionResponse | null,
  formData: FormData
): Promise<OrderActionResponse<Order>> {
  try {
    // 1. Extract and validate input
    const rawInput = {
      order_id: formData.get('order_id'),
      cancellation_reason: formData.get('cancellation_reason'),
    }

    const validationResult = cancelOrderSchema.safeParse(rawInput)

    if (!validationResult.success) {
      const firstError = validationResult.error.errors[0]
      return createErrorResponse(
        firstError?.message ?? ORDER_ACTION_MESSAGES.validationError,
        'validation_error'
      )
    }

    const { order_id, cancellation_reason } = validationResult.data

    // 2. Cancel order via DAL
    const { data: order, error } = await dalCancelOrder(order_id, cancellation_reason)

    if (error) {
      return createErrorResponse(
        error.message,
        mapDALError(error),
        error.details
      )
    }

    // 3. Revalidate paths
    revalidatePath('/dashboard/orders')
    revalidatePath('/dashboard')
    revalidatePath('/dashboard/kds')
    revalidatePath(`/dashboard/orders/${order_id}`)

    // 4. Return success
    return createSuccessResponse(ORDER_ACTION_MESSAGES.orderCancelled, order)
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    return createErrorResponse(
      ORDER_ACTION_MESSAGES.serverError,
      'unknown_error',
      errorMessage
    )
  }
}

/**
 * Update Payment Status Server Action
 *
 * Updates payment status for an order.
 *
 * @param _prevState - Previous form state (for useFormState)
 * @param formData - Form data containing payment fields
 * @returns OrderActionResponse with updated order
 */
export async function updatePaymentStatus(
  _prevState: OrderActionResponse | null,
  formData: FormData
): Promise<OrderActionResponse<Order>> {
  try {
    // 1. Extract and validate input
    const rawInput = {
      order_id: formData.get('order_id'),
      payment_status: formData.get('payment_status'),
      payment_method: formData.get('payment_method') || undefined,
      paid_amount: formData.get('paid_amount')
        ? Number(formData.get('paid_amount'))
        : undefined,
    }

    const validationResult = updatePaymentSchema.safeParse(rawInput)

    if (!validationResult.success) {
      const firstError = validationResult.error.errors[0]
      return createErrorResponse(
        firstError?.message ?? ORDER_ACTION_MESSAGES.validationError,
        'validation_error'
      )
    }

    const { order_id, payment_status, payment_method, paid_amount } = validationResult.data

    // 2. Update payment via DAL
    const { data: order, error } = await dalUpdateOrderPayment(
      order_id,
      payment_status,
      payment_method,
      paid_amount
    )

    if (error) {
      return createErrorResponse(
        error.message,
        mapDALError(error),
        error.details
      )
    }

    // 3. Revalidate paths
    revalidatePath('/dashboard/orders')
    revalidatePath(`/dashboard/orders/${order_id}`)

    // 4. Return success
    return createSuccessResponse(ORDER_ACTION_MESSAGES.paymentStatusUpdated, order)
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    return createErrorResponse(
      ORDER_ACTION_MESSAGES.serverError,
      'unknown_error',
      errorMessage
    )
  }
}

/**
 * Assign Order Server Action
 *
 * Assigns an order to a staff member.
 *
 * @param orderId - The order UUID
 * @param assignedTo - The user ID to assign (null to unassign)
 * @returns OrderActionResponse with updated order
 */
export async function assignOrderToStaff(
  orderId: string,
  assignedTo: string | null
): Promise<OrderActionResponse<Order>> {
  try {
    // 1. Validate inputs
    if (!orderId) {
      return createErrorResponse(
        ORDER_ACTION_MESSAGES.validationError,
        'validation_error'
      )
    }

    // 2. Assign order via DAL
    const { data: order, error } = await dalAssignOrder(orderId, assignedTo)

    if (error) {
      return createErrorResponse(
        error.message,
        mapDALError(error),
        error.details
      )
    }

    // 3. Revalidate paths
    revalidatePath('/dashboard/orders')
    revalidatePath(`/dashboard/orders/${orderId}`)

    // 4. Return success
    const message = assignedTo
      ? ORDER_ACTION_MESSAGES.orderAssigned
      : ORDER_ACTION_MESSAGES.orderUnassigned
    return createSuccessResponse(message, order)
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    return createErrorResponse(
      ORDER_ACTION_MESSAGES.serverError,
      'unknown_error',
      errorMessage
    )
  }
}

/**
 * Update Order Estimated Time Server Action
 *
 * Updates the estimated ready time for an order.
 *
 * @param orderId - The order UUID
 * @param estimatedMinutes - Minutes until ready
 * @returns OrderActionResponse with updated order
 */
export async function updateEstimatedTime(
  orderId: string,
  estimatedMinutes: number
): Promise<OrderActionResponse<Order>> {
  try {
    // 1. Validate inputs
    if (!orderId || estimatedMinutes < 1 || estimatedMinutes > 480) {
      return createErrorResponse(
        ORDER_ACTION_MESSAGES.validationError,
        'validation_error'
      )
    }

    // 2. Update estimated time via DAL
    const { data: order, error } = await dalUpdateOrderEstimatedTime(
      orderId,
      estimatedMinutes
    )

    if (error) {
      return createErrorResponse(
        error.message,
        mapDALError(error),
        error.details
      )
    }

    // 3. Revalidate paths
    revalidatePath('/dashboard/orders')
    revalidatePath('/dashboard/kds')
    revalidatePath(`/dashboard/orders/${orderId}`)

    // 4. Return success
    return createSuccessResponse(ORDER_ACTION_MESSAGES.orderEstimatedTimeUpdated, order)
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    return createErrorResponse(
      ORDER_ACTION_MESSAGES.serverError,
      'unknown_error',
      errorMessage
    )
  }
}

// =============================================================================
// ORDER ITEM ACTIONS
// =============================================================================

/**
 * Update Order Item Status Server Action (for KDS)
 *
 * Updates status of a single order item.
 *
 * @param itemId - The order item UUID
 * @param status - The new status
 * @returns OrderActionResponse with updated item
 */
export async function updateOrderItemStatus(
  itemId: string,
  status: OrderStatus
): Promise<OrderActionResponse<OrderItem>> {
  try {
    // 1. Validate inputs
    if (!itemId || !status) {
      return createErrorResponse(
        ORDER_ACTION_MESSAGES.validationError,
        'validation_error'
      )
    }

    // 2. Update item status via DAL
    const { data: item, error } = await dalUpdateOrderItemStatus(itemId, status)

    if (error) {
      return createErrorResponse(
        error.message,
        mapDALError(error),
        error.details
      )
    }

    // 3. Revalidate paths
    revalidatePath('/dashboard/kds')
    revalidatePath('/dashboard/orders')

    // 4. Return success
    return createSuccessResponse(ORDER_ACTION_MESSAGES.orderItemStatusUpdated, item)
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    return createErrorResponse(
      ORDER_ACTION_MESSAGES.serverError,
      'unknown_error',
      errorMessage
    )
  }
}

/**
 * Bulk Update Order Items Status Server Action
 *
 * Updates status of multiple order items at once.
 *
 * @param itemIds - The order item UUIDs
 * @param status - The new status
 * @returns OrderActionResponse with success indicator
 */
export async function bulkUpdateOrderItemsStatus(
  itemIds: string[],
  status: OrderStatus
): Promise<OrderActionResponse<boolean>> {
  try {
    // 1. Validate inputs
    if (!itemIds || itemIds.length === 0 || !status) {
      return createErrorResponse(
        ORDER_ACTION_MESSAGES.validationError,
        'validation_error'
      )
    }

    // 2. Validate with schema
    const validationResult = bulkUpdateOrderItemsStatusSchema.safeParse({
      item_ids: itemIds,
      status,
    })

    if (!validationResult.success) {
      const firstError = validationResult.error.errors[0]
      return createErrorResponse(
        firstError?.message ?? ORDER_ACTION_MESSAGES.validationError,
        'validation_error'
      )
    }

    // 3. Update items via DAL
    const { data, error } = await dalBulkUpdateOrderItemsStatus(itemIds, status)

    if (error) {
      return createErrorResponse(
        error.message,
        mapDALError(error),
        error.details
      )
    }

    // 4. Revalidate paths
    revalidatePath('/dashboard/kds')
    revalidatePath('/dashboard/orders')

    // 5. Return success
    return createSuccessResponse(ORDER_ACTION_MESSAGES.orderItemsStatusUpdated, data)
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    return createErrorResponse(
      ORDER_ACTION_MESSAGES.serverError,
      'unknown_error',
      errorMessage
    )
  }
}

// =============================================================================
// SERVICE REQUEST ACTIONS
// =============================================================================

/**
 * Create Service Request Server Action (Customer-facing)
 *
 * Creates a waiter call or service request from the public menu.
 * Rate limited to prevent abuse.
 *
 * @param input - Service request creation input
 * @returns OrderActionResponse with created request
 */
export async function createServiceRequest(
  input: CreateServiceRequestInput
): Promise<OrderActionResponse<ServiceRequest>> {
  try {
    // 1. Validate input
    const validationResult = createServiceRequestSchema.safeParse(input)

    if (!validationResult.success) {
      const firstError = validationResult.error.errors[0]
      return createErrorResponse(
        firstError?.message ?? ORDER_ACTION_MESSAGES.validationError,
        'validation_error'
      )
    }

    const validatedInput = validationResult.data

    // 2. Prepare request data
    const requestData = {
      organization_id: validatedInput.organization_id,
      table_id: validatedInput.table_id,
      request_type: validatedInput.request_type,
      message: validatedInput.message ?? null,
      session_id: validatedInput.session_id ?? null,
      status: 'pending' as const,
    }

    // 3. Create service request via DAL
    const { data: request, error } = await dalCreateServiceRequest(requestData)

    if (error) {
      // Handle rate limiting specifically
      if (error.code === 'rate_limited') {
        return createErrorResponse(
          ORDER_ACTION_MESSAGES.serviceRequestRateLimited,
          'rate_limited'
        )
      }

      return createErrorResponse(
        error.message,
        mapDALError(error),
        error.details
      )
    }

    // 4. Revalidate paths
    revalidatePath('/dashboard/service-requests')
    revalidatePath('/dashboard')

    // 5. Return success
    return createSuccessResponse(ORDER_ACTION_MESSAGES.serviceRequestCreated, request)
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    return createErrorResponse(
      ORDER_ACTION_MESSAGES.serverError,
      'unknown_error',
      errorMessage
    )
  }
}

/**
 * Update Service Request Status Server Action (Staff-facing)
 *
 * Updates service request status.
 *
 * @param _prevState - Previous form state (for useFormState)
 * @param formData - Form data containing request fields
 * @returns OrderActionResponse with updated request
 */
export async function updateServiceRequestStatus(
  _prevState: OrderActionResponse | null,
  formData: FormData
): Promise<OrderActionResponse<ServiceRequest>> {
  try {
    // 1. Extract and validate input
    const rawInput = {
      request_id: formData.get('request_id'),
      status: formData.get('status'),
      response: formData.get('response') || undefined,
    }

    const validationResult = updateServiceRequestSchema.safeParse(rawInput)

    if (!validationResult.success) {
      const firstError = validationResult.error.errors[0]
      return createErrorResponse(
        firstError?.message ?? ORDER_ACTION_MESSAGES.validationError,
        'validation_error'
      )
    }

    const { request_id, status, response } = validationResult.data

    // 2. Update service request via DAL
    const { data: request, error } = await dalUpdateServiceRequestStatus(
      request_id,
      status,
      undefined, // handledBy - could be passed from auth context
      response
    )

    if (error) {
      return createErrorResponse(
        error.message,
        mapDALError(error),
        error.details
      )
    }

    // 3. Revalidate paths
    revalidatePath('/dashboard/service-requests')
    revalidatePath('/dashboard')

    // 4. Return success
    return createSuccessResponse(ORDER_ACTION_MESSAGES.serviceRequestStatusUpdated, request)
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    return createErrorResponse(
      ORDER_ACTION_MESSAGES.serverError,
      'unknown_error',
      errorMessage
    )
  }
}

/**
 * Quick Acknowledge Service Request
 *
 * Quickly acknowledges a service request.
 *
 * @param requestId - The service request UUID
 * @returns OrderActionResponse with updated request
 */
export async function acknowledgeServiceRequest(
  requestId: string
): Promise<OrderActionResponse<ServiceRequest>> {
  try {
    // 1. Validate input
    if (!requestId) {
      return createErrorResponse(
        ORDER_ACTION_MESSAGES.validationError,
        'validation_error'
      )
    }

    // 2. Update to acknowledged status via DAL
    const { data: request, error } = await dalUpdateServiceRequestStatus(
      requestId,
      'acknowledged'
    )

    if (error) {
      return createErrorResponse(
        error.message,
        mapDALError(error),
        error.details
      )
    }

    // 3. Revalidate paths
    revalidatePath('/dashboard/service-requests')
    revalidatePath('/dashboard')

    // 4. Return success
    return createSuccessResponse(ORDER_ACTION_MESSAGES.serviceRequestStatusUpdated, request)
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    return createErrorResponse(
      ORDER_ACTION_MESSAGES.serverError,
      'unknown_error',
      errorMessage
    )
  }
}

/**
 * Complete Service Request
 *
 * Marks a service request as completed.
 *
 * @param requestId - The service request UUID
 * @param response - Optional response message
 * @returns OrderActionResponse with updated request
 */
export async function completeServiceRequest(
  requestId: string,
  response?: string
): Promise<OrderActionResponse<ServiceRequest>> {
  try {
    // 1. Validate input
    if (!requestId) {
      return createErrorResponse(
        ORDER_ACTION_MESSAGES.validationError,
        'validation_error'
      )
    }

    // 2. Update to completed status via DAL
    const { data: request, error } = await dalUpdateServiceRequestStatus(
      requestId,
      'completed',
      undefined,
      response
    )

    if (error) {
      return createErrorResponse(
        error.message,
        mapDALError(error),
        error.details
      )
    }

    // 3. Revalidate paths
    revalidatePath('/dashboard/service-requests')
    revalidatePath('/dashboard')

    // 4. Return success
    return createSuccessResponse(ORDER_ACTION_MESSAGES.serviceRequestStatusUpdated, request)
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    return createErrorResponse(
      ORDER_ACTION_MESSAGES.serverError,
      'unknown_error',
      errorMessage
    )
  }
}
