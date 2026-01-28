/**
 * Order Validation Schemas
 *
 * This module contains all Zod validation schemas for order-related
 * forms and API operations. All error messages are in Turkish as per the
 * project requirements.
 *
 * Schemas:
 * - createOrderSchema: Customer order submission validation
 * - orderItemSchema: Individual order item validation
 * - updateOrderStatusSchema: Staff order status update validation
 * - cancelOrderSchema: Order cancellation validation
 * - serviceRequestSchema: Waiter call / service request validation
 *
 * @see https://zod.dev
 * @see https://react-hook-form.com/get-started#SchemaValidation
 *
 * @example
 * ```tsx
 * import { createOrderSchema, type CreateOrderInput } from '@/lib/validations/orders'
 * import { useForm } from 'react-hook-form'
 * import { zodResolver } from '@hookform/resolvers/zod'
 *
 * function CheckoutForm() {
 *   const form = useForm<CreateOrderInput>({
 *     resolver: zodResolver(createOrderSchema),
 *     defaultValues: { customer_name: '', customer_phone: '' }
 *   })
 *   // ...
 * }
 * ```
 */

import { z } from 'zod'
import type {
  OrderStatus,
  OrderType,
  PaymentStatus,
  PaymentMethod,
  ServiceRequestType,
  ServiceRequestStatus,
} from '@/types/database'

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Validation constraints for orders
 */
export const ORDER_CONSTRAINTS = {
  // Customer info constraints
  customerNameMin: 2,
  customerNameMax: 100,
  customerPhoneMin: 10,
  customerPhoneMax: 20,
  customerEmailMax: 255,
  customerNotesMax: 500,

  // Order item constraints
  itemQuantityMin: 1,
  itemQuantityMax: 99,
  specialInstructionsMax: 300,

  // Order constraints
  internalNotesMax: 1000,
  cancellationReasonMax: 500,

  // Service request constraints
  serviceMessageMax: 300,
  serviceResponseMax: 500,

  // Price constraints
  priceMin: 0,
  priceMax: 1000000, // 1 million TRY max

  // Estimated time constraints (minutes)
  estimatedTimeMin: 1,
  estimatedTimeMax: 480, // 8 hours max
} as const

/**
 * Valid order status values (matches database enum)
 */
export const ORDER_STATUSES: readonly OrderStatus[] = [
  'pending',
  'confirmed',
  'preparing',
  'ready',
  'served',
  'completed',
  'cancelled',
] as const

/**
 * Valid order type values (matches database enum)
 */
export const ORDER_TYPES: readonly OrderType[] = [
  'dine_in',
  'takeaway',
  'delivery',
] as const

/**
 * Valid payment status values (matches database enum)
 */
export const PAYMENT_STATUSES: readonly PaymentStatus[] = [
  'pending',
  'partial',
  'paid',
  'refunded',
  'failed',
] as const

/**
 * Valid payment method values (matches database enum)
 */
export const PAYMENT_METHODS: readonly PaymentMethod[] = [
  'cash',
  'credit_card',
  'debit_card',
  'mobile',
  'other',
] as const

/**
 * Valid service request type values (matches database enum)
 */
export const SERVICE_REQUEST_TYPES: readonly ServiceRequestType[] = [
  'call_waiter',
  'request_bill',
  'need_help',
  'feedback',
  'complaint',
] as const

/**
 * Valid service request status values (matches database enum)
 */
export const SERVICE_REQUEST_STATUSES: readonly ServiceRequestStatus[] = [
  'pending',
  'acknowledged',
  'in_progress',
  'completed',
  'cancelled',
] as const

/**
 * Turkish order status labels for UI display
 */
export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Bekliyor',
  confirmed: 'Onaylandı',
  preparing: 'Hazırlanıyor',
  ready: 'Hazır',
  served: 'Servis Edildi',
  completed: 'Tamamlandı',
  cancelled: 'İptal Edildi',
} as const

/**
 * Turkish order type labels for UI display
 */
export const ORDER_TYPE_LABELS: Record<OrderType, string> = {
  dine_in: 'Masa Servisi',
  takeaway: 'Paket Servis',
  delivery: 'Gel Al',
} as const

/**
 * Turkish payment status labels for UI display
 */
export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: 'Ödeme Bekliyor',
  partial: 'Kısmi Ödeme',
  paid: 'Ödendi',
  refunded: 'İade Edildi',
  failed: 'Ödeme Başarısız',
} as const

/**
 * Turkish payment method labels for UI display
 */
export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: 'Nakit',
  credit_card: 'Kredi Kartı',
  debit_card: 'Banka Kartı',
  mobile: 'Mobil Ödeme',
  other: 'Diğer',
} as const

/**
 * Turkish service request type labels for UI display
 */
export const SERVICE_REQUEST_TYPE_LABELS: Record<ServiceRequestType, string> = {
  call_waiter: 'Garson Çağır',
  request_bill: 'Hesap İste',
  need_help: 'Yardım İste',
  feedback: 'Geri Bildirim',
  complaint: 'Şikayet',
} as const

/**
 * Turkish service request status labels for UI display
 */
export const SERVICE_REQUEST_STATUS_LABELS: Record<ServiceRequestStatus, string> = {
  pending: 'Bekliyor',
  acknowledged: 'Görüldü',
  in_progress: 'İşleniyor',
  completed: 'Tamamlandı',
  cancelled: 'İptal Edildi',
} as const

/**
 * Turkish error messages for order validation
 * Centralized for consistency and easy maintenance
 */
export const ORDER_ERROR_MESSAGES = {
  // Customer info errors
  customerNameRequired: 'Müşteri adı gereklidir',
  customerNameTooShort: `Müşteri adı en az ${ORDER_CONSTRAINTS.customerNameMin} karakter olmalıdır`,
  customerNameTooLong: `Müşteri adı en fazla ${ORDER_CONSTRAINTS.customerNameMax} karakter olabilir`,
  customerNameInvalid: 'Müşteri adı sadece harf ve boşluk içerebilir',
  customerPhoneRequired: 'Telefon numarası gereklidir',
  customerPhoneInvalid: 'Geçerli bir telefon numarası giriniz',
  customerPhoneTooShort: `Telefon numarası en az ${ORDER_CONSTRAINTS.customerPhoneMin} karakter olmalıdır`,
  customerPhoneTooLong: `Telefon numarası en fazla ${ORDER_CONSTRAINTS.customerPhoneMax} karakter olabilir`,
  customerEmailInvalid: 'Geçerli bir e-posta adresi giriniz',
  customerEmailTooLong: `E-posta adresi en fazla ${ORDER_CONSTRAINTS.customerEmailMax} karakter olabilir`,
  customerNotesTooLong: `Notlar en fazla ${ORDER_CONSTRAINTS.customerNotesMax} karakter olabilir`,

  // Order errors
  organizationIdRequired: 'Restoran bilgisi gereklidir',
  organizationIdInvalid: 'Geçersiz restoran kimliği',
  tableIdInvalid: 'Geçersiz masa kimliği',
  orderIdRequired: 'Sipariş kimliği gereklidir',
  orderIdInvalid: 'Geçersiz sipariş kimliği',
  orderTypeInvalid: 'Geçersiz sipariş türü',
  orderStatusInvalid: 'Geçersiz sipariş durumu',
  orderItemsRequired: 'Sepette en az bir ürün olmalıdır',
  orderItemsInvalid: 'Geçersiz sepet içeriği',
  internalNotesTooLong: `Dahili notlar en fazla ${ORDER_CONSTRAINTS.internalNotesMax} karakter olabilir`,

  // Order item errors
  productIdRequired: 'Ürün kimliği gereklidir',
  productIdInvalid: 'Geçersiz ürün kimliği',
  productNameRequired: 'Ürün adı gereklidir',
  productNameInvalid: 'Geçersiz ürün adı',
  quantityRequired: 'Miktar gereklidir',
  quantityMin: `Miktar en az ${ORDER_CONSTRAINTS.itemQuantityMin} olmalıdır`,
  quantityMax: `Miktar en fazla ${ORDER_CONSTRAINTS.itemQuantityMax} olabilir`,
  quantityInvalid: 'Geçersiz miktar',
  unitPriceRequired: 'Birim fiyatı gereklidir',
  unitPriceInvalid: 'Geçersiz birim fiyatı',
  itemTotalRequired: 'Ürün toplamı gereklidir',
  itemTotalInvalid: 'Geçersiz ürün toplamı',
  specialInstructionsTooLong: `Özel talimatlar en fazla ${ORDER_CONSTRAINTS.specialInstructionsMax} karakter olabilir`,
  modifiersInvalid: 'Geçersiz seçenek bilgisi',
  priceLedgerIdInvalid: 'Geçersiz fiyat kayıt kimliği',

  // Status update errors
  statusRequired: 'Yeni durum gereklidir',
  statusTransitionInvalid: 'Bu durum geçişi yapılamaz',
  estimatedTimeInvalid: `Tahmini süre ${ORDER_CONSTRAINTS.estimatedTimeMin}-${ORDER_CONSTRAINTS.estimatedTimeMax} dakika arasında olmalıdır`,

  // Cancellation errors
  cancellationReasonRequired: 'İptal nedeni gereklidir',
  cancellationReasonTooLong: `İptal nedeni en fazla ${ORDER_CONSTRAINTS.cancellationReasonMax} karakter olabilir`,
  orderAlreadyCancelled: 'Bu sipariş zaten iptal edilmiş',
  orderNotCancellable: 'Bu sipariş iptal edilemez',

  // Payment errors
  paymentStatusInvalid: 'Geçersiz ödeme durumu',
  paymentMethodInvalid: 'Geçersiz ödeme yöntemi',
  paidAmountInvalid: 'Geçersiz ödeme tutarı',

  // Service request errors
  serviceRequestTypeRequired: 'İstek türü gereklidir',
  serviceRequestTypeInvalid: 'Geçersiz istek türü',
  serviceRequestStatusInvalid: 'Geçersiz istek durumu',
  serviceMessageTooLong: `Mesaj en fazla ${ORDER_CONSTRAINTS.serviceMessageMax} karakter olabilir`,
  serviceResponseTooLong: `Yanıt en fazla ${ORDER_CONSTRAINTS.serviceResponseMax} karakter olabilir`,
  serviceRequestRateLimited: 'Lütfen birkaç dakika bekleyin ve tekrar deneyin',

  // Generic
  invalidInput: 'Geçersiz giriş',
  invalidUuid: 'Geçersiz kimlik (UUID)',
  currencyInvalid: 'Geçersiz para birimi',
} as const

// =============================================================================
// REUSABLE SCHEMAS
// =============================================================================

/**
 * UUID validation schema
 * Validates proper UUID format
 */
export const uuidSchema = z
  .string({
    required_error: ORDER_ERROR_MESSAGES.invalidUuid,
    invalid_type_error: ORDER_ERROR_MESSAGES.invalidUuid,
  })
  .uuid(ORDER_ERROR_MESSAGES.invalidUuid)

/**
 * Customer name validation schema
 * Allows Turkish characters (ğ, ü, ş, ı, ö, ç)
 */
export const customerNameSchema = z
  .string({
    required_error: ORDER_ERROR_MESSAGES.customerNameRequired,
    invalid_type_error: ORDER_ERROR_MESSAGES.customerNameInvalid,
  })
  .min(ORDER_CONSTRAINTS.customerNameMin, ORDER_ERROR_MESSAGES.customerNameTooShort)
  .max(ORDER_CONSTRAINTS.customerNameMax, ORDER_ERROR_MESSAGES.customerNameTooLong)
  .regex(
    /^[\p{L}\s'-]+$/u,
    ORDER_ERROR_MESSAGES.customerNameInvalid
  )
  .trim()

/**
 * Customer phone validation schema
 * Supports Turkish phone formats and international numbers
 */
export const customerPhoneSchema = z
  .string({
    required_error: ORDER_ERROR_MESSAGES.customerPhoneRequired,
    invalid_type_error: ORDER_ERROR_MESSAGES.customerPhoneInvalid,
  })
  .min(ORDER_CONSTRAINTS.customerPhoneMin, ORDER_ERROR_MESSAGES.customerPhoneTooShort)
  .max(ORDER_CONSTRAINTS.customerPhoneMax, ORDER_ERROR_MESSAGES.customerPhoneTooLong)
  .regex(
    /^[+]?[\d\s()-]+$/,
    ORDER_ERROR_MESSAGES.customerPhoneInvalid
  )
  .trim()

/**
 * Optional customer phone schema (for non-required phone fields)
 */
export const optionalCustomerPhoneSchema = z
  .string()
  .min(ORDER_CONSTRAINTS.customerPhoneMin, ORDER_ERROR_MESSAGES.customerPhoneTooShort)
  .max(ORDER_CONSTRAINTS.customerPhoneMax, ORDER_ERROR_MESSAGES.customerPhoneTooLong)
  .regex(
    /^[+]?[\d\s()-]+$/,
    ORDER_ERROR_MESSAGES.customerPhoneInvalid
  )
  .optional()
  .nullable()
  .or(z.literal(''))
  .transform((val) => val || null)

/**
 * Customer email validation schema
 */
export const customerEmailSchema = z
  .string()
  .max(ORDER_CONSTRAINTS.customerEmailMax, ORDER_ERROR_MESSAGES.customerEmailTooLong)
  .email(ORDER_ERROR_MESSAGES.customerEmailInvalid)
  .toLowerCase()
  .trim()
  .optional()
  .nullable()
  .or(z.literal(''))
  .transform((val) => val || null)

/**
 * Customer notes validation schema
 */
export const customerNotesSchema = z
  .string()
  .max(ORDER_CONSTRAINTS.customerNotesMax, ORDER_ERROR_MESSAGES.customerNotesTooLong)
  .optional()
  .nullable()
  .or(z.literal(''))
  .transform((val) => val?.trim() || null)

/**
 * Order type validation schema
 */
export const orderTypeSchema = z.enum(ORDER_TYPES as unknown as [string, ...string[]], {
  errorMap: () => ({ message: ORDER_ERROR_MESSAGES.orderTypeInvalid }),
})

/**
 * Order status validation schema
 */
export const orderStatusSchema = z.enum(ORDER_STATUSES as unknown as [string, ...string[]], {
  errorMap: () => ({ message: ORDER_ERROR_MESSAGES.orderStatusInvalid }),
})

/**
 * Payment status validation schema
 */
export const paymentStatusSchema = z.enum(PAYMENT_STATUSES as unknown as [string, ...string[]], {
  errorMap: () => ({ message: ORDER_ERROR_MESSAGES.paymentStatusInvalid }),
})

/**
 * Payment method validation schema
 */
export const paymentMethodSchema = z.enum(PAYMENT_METHODS as unknown as [string, ...string[]], {
  errorMap: () => ({ message: ORDER_ERROR_MESSAGES.paymentMethodInvalid }),
})

/**
 * Service request type validation schema
 */
export const serviceRequestTypeSchema = z.enum(SERVICE_REQUEST_TYPES as unknown as [string, ...string[]], {
  errorMap: () => ({ message: ORDER_ERROR_MESSAGES.serviceRequestTypeInvalid }),
})

/**
 * Service request status validation schema
 */
export const serviceRequestStatusSchema = z.enum(SERVICE_REQUEST_STATUSES as unknown as [string, ...string[]], {
  errorMap: () => ({ message: ORDER_ERROR_MESSAGES.serviceRequestStatusInvalid }),
})

/**
 * Price validation schema
 * Non-negative number with max limit
 */
export const priceSchema = z
  .number({
    required_error: ORDER_ERROR_MESSAGES.unitPriceRequired,
    invalid_type_error: ORDER_ERROR_MESSAGES.unitPriceInvalid,
  })
  .min(ORDER_CONSTRAINTS.priceMin, ORDER_ERROR_MESSAGES.unitPriceInvalid)
  .max(ORDER_CONSTRAINTS.priceMax, ORDER_ERROR_MESSAGES.unitPriceInvalid)

/**
 * Quantity validation schema
 */
export const quantitySchema = z
  .number({
    required_error: ORDER_ERROR_MESSAGES.quantityRequired,
    invalid_type_error: ORDER_ERROR_MESSAGES.quantityInvalid,
  })
  .int(ORDER_ERROR_MESSAGES.quantityInvalid)
  .min(ORDER_CONSTRAINTS.itemQuantityMin, ORDER_ERROR_MESSAGES.quantityMin)
  .max(ORDER_CONSTRAINTS.itemQuantityMax, ORDER_ERROR_MESSAGES.quantityMax)

/**
 * Currency validation schema (3-letter ISO code)
 */
export const currencySchema = z
  .string()
  .length(3, ORDER_ERROR_MESSAGES.currencyInvalid)
  .default('TRY')

// =============================================================================
// SELECTED MODIFIER SCHEMAS
// =============================================================================

/**
 * Selected modifier option schema
 * Matches the structure in cart-store.ts and order_items.selected_modifiers JSONB
 */
export const selectedModifierOptionSchema = z.object({
  option_id: uuidSchema,
  option_name: z.string().min(1),
  price_adjustment: z.number(),
})

/**
 * Selected modifier schema
 * Represents a modifier group with its selected options
 */
export const selectedModifierSchema = z.object({
  modifier_id: uuidSchema,
  modifier_name: z.string().min(1),
  is_required: z.boolean(),
  min_selections: z.number().int().min(0),
  max_selections: z.number().int().min(0),
  selected_options: z.array(selectedModifierOptionSchema),
})

// =============================================================================
// ORDER ITEM SCHEMAS
// =============================================================================

/**
 * Order item creation schema
 *
 * Used when submitting an order with items from the cart.
 * Prices are locked at time of cart addition for regulatory compliance.
 */
export const orderItemSchema = z.object({
  product_id: uuidSchema,

  product_name: z
    .string({
      required_error: ORDER_ERROR_MESSAGES.productNameRequired,
      invalid_type_error: ORDER_ERROR_MESSAGES.productNameInvalid,
    })
    .min(1, ORDER_ERROR_MESSAGES.productNameRequired)
    .trim(),

  product_description: z.string().optional().nullable(),

  product_image_url: z.string().url().optional().nullable(),

  quantity: quantitySchema,

  unit_price: priceSchema,

  modifier_total: priceSchema.optional().nullable().default(0),

  item_total: z
    .number({
      required_error: ORDER_ERROR_MESSAGES.itemTotalRequired,
      invalid_type_error: ORDER_ERROR_MESSAGES.itemTotalInvalid,
    })
    .min(0, ORDER_ERROR_MESSAGES.itemTotalInvalid),

  currency: currencySchema,

  price_ledger_id: uuidSchema.optional().nullable(),

  selected_modifiers: z
    .array(selectedModifierSchema)
    .optional()
    .nullable()
    .default([]),

  special_instructions: z
    .string()
    .max(ORDER_CONSTRAINTS.specialInstructionsMax, ORDER_ERROR_MESSAGES.specialInstructionsTooLong)
    .optional()
    .nullable()
    .or(z.literal(''))
    .transform((val) => val?.trim() || null),
})

// =============================================================================
// ORDER SCHEMAS
// =============================================================================

/**
 * Create order schema (customer-facing)
 *
 * Used for submitting a new order from the public menu.
 * Includes customer info and cart items.
 */
export const createOrderSchema = z.object({
  organization_id: uuidSchema,

  table_id: uuidSchema.optional().nullable(),

  table_name: z.string().optional().nullable(),

  customer_name: customerNameSchema.optional().or(z.literal('')).transform((val) => val || null),

  customer_phone: optionalCustomerPhoneSchema,

  customer_email: customerEmailSchema,

  customer_notes: customerNotesSchema,

  order_type: orderTypeSchema.default('dine_in'),

  subtotal: priceSchema,

  total_amount: priceSchema,

  currency: currencySchema,

  items: z
    .array(orderItemSchema)
    .min(1, ORDER_ERROR_MESSAGES.orderItemsRequired),
})

/**
 * Customer checkout form schema
 *
 * Simplified schema for the checkout form on public menu.
 * Items are validated separately in the cart store.
 */
export const checkoutFormSchema = z.object({
  customer_name: z
    .string()
    .max(ORDER_CONSTRAINTS.customerNameMax, ORDER_ERROR_MESSAGES.customerNameTooLong)
    .optional()
    .or(z.literal(''))
    .transform((val) => val?.trim() || ''),

  customer_phone: z
    .string()
    .max(ORDER_CONSTRAINTS.customerPhoneMax, ORDER_ERROR_MESSAGES.customerPhoneTooLong)
    .optional()
    .or(z.literal(''))
    .transform((val) => val?.trim() || ''),

  customer_notes: customerNotesSchema,
})

/**
 * Update order status schema (staff-facing)
 *
 * Used for updating order status from the dashboard/KDS.
 */
export const updateOrderStatusSchema = z.object({
  order_id: uuidSchema,

  status: orderStatusSchema,

  estimated_ready_minutes: z
    .number()
    .int()
    .min(ORDER_CONSTRAINTS.estimatedTimeMin, ORDER_ERROR_MESSAGES.estimatedTimeInvalid)
    .max(ORDER_CONSTRAINTS.estimatedTimeMax, ORDER_ERROR_MESSAGES.estimatedTimeInvalid)
    .optional()
    .nullable(),

  internal_notes: z
    .string()
    .max(ORDER_CONSTRAINTS.internalNotesMax, ORDER_ERROR_MESSAGES.internalNotesTooLong)
    .optional()
    .nullable()
    .or(z.literal(''))
    .transform((val) => val?.trim() || null),
})

/**
 * Cancel order schema
 *
 * Used for cancelling an order with a reason.
 */
export const cancelOrderSchema = z.object({
  order_id: uuidSchema,

  cancellation_reason: z
    .string({
      required_error: ORDER_ERROR_MESSAGES.cancellationReasonRequired,
    })
    .min(1, ORDER_ERROR_MESSAGES.cancellationReasonRequired)
    .max(ORDER_CONSTRAINTS.cancellationReasonMax, ORDER_ERROR_MESSAGES.cancellationReasonTooLong)
    .trim(),
})

/**
 * Update payment status schema
 *
 * Used for updating payment information for an order.
 */
export const updatePaymentSchema = z.object({
  order_id: uuidSchema,

  payment_status: paymentStatusSchema,

  payment_method: paymentMethodSchema.optional().nullable(),

  paid_amount: priceSchema.optional().nullable(),
})

/**
 * Assign order schema
 *
 * Used for assigning an order to a staff member.
 */
export const assignOrderSchema = z.object({
  order_id: uuidSchema,

  assigned_to: uuidSchema.optional().nullable(),
})

/**
 * Update order item status schema (for KDS)
 *
 * Used for updating individual item status in kitchen display.
 */
export const updateOrderItemStatusSchema = z.object({
  item_id: uuidSchema,

  status: orderStatusSchema,
})

/**
 * Bulk update order items status schema
 *
 * Used for updating multiple items at once.
 */
export const bulkUpdateOrderItemsStatusSchema = z.object({
  item_ids: z.array(uuidSchema).min(1, ORDER_ERROR_MESSAGES.orderItemsRequired),

  status: orderStatusSchema,
})

// =============================================================================
// SERVICE REQUEST SCHEMAS
// =============================================================================

/**
 * Create service request schema
 *
 * Used for creating waiter call or service requests from the public menu.
 */
export const createServiceRequestSchema = z.object({
  organization_id: uuidSchema,

  table_id: uuidSchema,

  request_type: serviceRequestTypeSchema.default('call_waiter'),

  message: z
    .string()
    .max(ORDER_CONSTRAINTS.serviceMessageMax, ORDER_ERROR_MESSAGES.serviceMessageTooLong)
    .optional()
    .nullable()
    .or(z.literal(''))
    .transform((val) => val?.trim() || null),

  session_id: z.string().optional().nullable(),
})

/**
 * Update service request schema
 *
 * Used for staff to update service request status.
 */
export const updateServiceRequestSchema = z.object({
  request_id: uuidSchema,

  status: serviceRequestStatusSchema,

  response: z
    .string()
    .max(ORDER_CONSTRAINTS.serviceResponseMax, ORDER_ERROR_MESSAGES.serviceResponseTooLong)
    .optional()
    .nullable()
    .or(z.literal(''))
    .transform((val) => val?.trim() || null),
})

// =============================================================================
// ORDER FILTER SCHEMAS
// =============================================================================

/**
 * Order filter schema for dashboard list views
 */
export const orderFilterSchema = z.object({
  status: z.array(orderStatusSchema).optional(),

  order_type: z.array(orderTypeSchema).optional(),

  payment_status: z.array(paymentStatusSchema).optional(),

  date_from: z.string().datetime().optional().nullable(),

  date_to: z.string().datetime().optional().nullable(),

  table_id: uuidSchema.optional().nullable(),

  search: z.string().optional().nullable(),

  page: z.number().int().min(1).default(1),

  limit: z.number().int().min(1).max(100).default(20),

  sort_by: z.enum(['created_at', 'updated_at', 'order_number', 'total_amount']).default('created_at'),

  sort_order: z.enum(['asc', 'desc']).default('desc'),
})

/**
 * Service request filter schema
 */
export const serviceRequestFilterSchema = z.object({
  status: z.array(serviceRequestStatusSchema).optional(),

  request_type: z.array(serviceRequestTypeSchema).optional(),

  table_id: uuidSchema.optional().nullable(),

  date_from: z.string().datetime().optional().nullable(),

  date_to: z.string().datetime().optional().nullable(),

  page: z.number().int().min(1).default(1),

  limit: z.number().int().min(1).max(100).default(20),
})

// =============================================================================
// TYPE EXPORTS
// =============================================================================

/**
 * Inferred types from schemas for use with React Hook Form and TypeScript
 */
export type CreateOrderInput = z.infer<typeof createOrderSchema>
export type CheckoutFormInput = z.infer<typeof checkoutFormSchema>
export type OrderItemInput = z.infer<typeof orderItemSchema>
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>
export type CancelOrderInput = z.infer<typeof cancelOrderSchema>
export type UpdatePaymentInput = z.infer<typeof updatePaymentSchema>
export type AssignOrderInput = z.infer<typeof assignOrderSchema>
export type UpdateOrderItemStatusInput = z.infer<typeof updateOrderItemStatusSchema>
export type BulkUpdateOrderItemsStatusInput = z.infer<typeof bulkUpdateOrderItemsStatusSchema>

export type CreateServiceRequestInput = z.infer<typeof createServiceRequestSchema>
export type UpdateServiceRequestInput = z.infer<typeof updateServiceRequestSchema>

export type OrderFilterInput = z.infer<typeof orderFilterSchema>
export type ServiceRequestFilterInput = z.infer<typeof serviceRequestFilterSchema>

export type SelectedModifierOptionInput = z.infer<typeof selectedModifierOptionSchema>
export type SelectedModifierInput = z.infer<typeof selectedModifierSchema>

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Valid order status transitions
 * Maps current status to valid next statuses
 */
export const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['preparing', 'cancelled'],
  preparing: ['ready', 'cancelled'],
  ready: ['served', 'completed', 'cancelled'],
  served: ['completed'],
  completed: [], // Terminal state
  cancelled: [], // Terminal state
} as const

/**
 * Check if a status transition is valid
 *
 * @param fromStatus - Current order status
 * @param toStatus - Target order status
 * @returns Whether the transition is allowed
 *
 * @example
 * ```ts
 * isValidStatusTransition('pending', 'confirmed') // true
 * isValidStatusTransition('completed', 'pending') // false
 * ```
 */
export function isValidStatusTransition(
  fromStatus: OrderStatus,
  toStatus: OrderStatus
): boolean {
  const validTransitions = ORDER_STATUS_TRANSITIONS[fromStatus]
  return validTransitions.includes(toStatus)
}

/**
 * Get valid next statuses for an order
 *
 * @param currentStatus - Current order status
 * @returns Array of valid next statuses
 */
export function getValidNextStatuses(currentStatus: OrderStatus): OrderStatus[] {
  return ORDER_STATUS_TRANSITIONS[currentStatus]
}

/**
 * Check if an order can be cancelled
 *
 * @param status - Current order status
 * @returns Whether the order can be cancelled
 */
export function canCancelOrder(status: OrderStatus): boolean {
  return ORDER_STATUS_TRANSITIONS[status].includes('cancelled')
}

/**
 * Check if an order is in a terminal state
 *
 * @param status - Current order status
 * @returns Whether the order is in a terminal state
 */
export function isTerminalStatus(status: OrderStatus): boolean {
  return ORDER_STATUS_TRANSITIONS[status].length === 0
}

/**
 * Get order status label in Turkish
 *
 * @param status - Order status code
 * @returns Turkish label for the status
 */
export function getOrderStatusLabel(status: OrderStatus): string {
  return ORDER_STATUS_LABELS[status]
}

/**
 * Get order type label in Turkish
 *
 * @param type - Order type code
 * @returns Turkish label for the type
 */
export function getOrderTypeLabel(type: OrderType): string {
  return ORDER_TYPE_LABELS[type]
}

/**
 * Get payment status label in Turkish
 *
 * @param status - Payment status code
 * @returns Turkish label for the status
 */
export function getPaymentStatusLabel(status: PaymentStatus): string {
  return PAYMENT_STATUS_LABELS[status]
}

/**
 * Get payment method label in Turkish
 *
 * @param method - Payment method code
 * @returns Turkish label for the method
 */
export function getPaymentMethodLabel(method: PaymentMethod): string {
  return PAYMENT_METHOD_LABELS[method]
}

/**
 * Get service request type label in Turkish
 *
 * @param type - Service request type code
 * @returns Turkish label for the type
 */
export function getServiceRequestTypeLabel(type: ServiceRequestType): string {
  return SERVICE_REQUEST_TYPE_LABELS[type]
}

/**
 * Get service request status label in Turkish
 *
 * @param status - Service request status code
 * @returns Turkish label for the status
 */
export function getServiceRequestStatusLabel(status: ServiceRequestStatus): string {
  return SERVICE_REQUEST_STATUS_LABELS[status]
}

/**
 * Get status color for UI styling
 *
 * @param status - Order status
 * @returns Tailwind CSS color classes
 */
export function getOrderStatusColor(status: OrderStatus): {
  bg: string
  text: string
  border: string
} {
  switch (status) {
    case 'pending':
      return { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-300' }
    case 'confirmed':
      return { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-300' }
    case 'preparing':
      return { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-300' }
    case 'ready':
      return { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-300' }
    case 'served':
      return { bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-300' }
    case 'completed':
      return { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-300' }
    case 'cancelled':
      return { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-300' }
    default:
      return { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-300' }
  }
}

/**
 * Get payment status color for UI styling
 *
 * @param status - Payment status
 * @returns Tailwind CSS color classes
 */
export function getPaymentStatusColor(status: PaymentStatus): {
  bg: string
  text: string
} {
  switch (status) {
    case 'pending':
      return { bg: 'bg-yellow-100', text: 'text-yellow-800' }
    case 'partial':
      return { bg: 'bg-orange-100', text: 'text-orange-800' }
    case 'paid':
      return { bg: 'bg-green-100', text: 'text-green-800' }
    case 'refunded':
      return { bg: 'bg-purple-100', text: 'text-purple-800' }
    case 'failed':
      return { bg: 'bg-red-100', text: 'text-red-800' }
    default:
      return { bg: 'bg-gray-100', text: 'text-gray-800' }
  }
}

/**
 * Validate a single field against its schema
 *
 * Useful for real-time field validation without validating the entire form.
 *
 * @param schema - Zod schema to validate against
 * @param value - Value to validate
 * @returns Validation result with success flag and optional error
 *
 * @example
 * ```tsx
 * const result = validateOrderField(customerNameSchema, 'Ahmet')
 * if (!result.success) {
 *   console.log(result.error) // Turkish error message
 * }
 * ```
 */
export function validateOrderField<T>(
  schema: z.ZodSchema<T>,
  value: unknown
): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(value)

  if (result.success) {
    return { success: true, data: result.data }
  }

  const firstError = result.error.errors[0]
  return {
    success: false,
    error: firstError?.message ?? ORDER_ERROR_MESSAGES.invalidInput,
  }
}

/**
 * Format Zod errors into a simple error map
 *
 * Converts Zod's error format into a flat object mapping field names to error messages.
 *
 * @param error - Zod error object
 * @returns Object mapping field paths to error messages
 *
 * @example
 * ```tsx
 * const result = createOrderSchema.safeParse({ items: [] })
 * if (!result.success) {
 *   const errors = formatOrderErrors(result.error)
 *   // { items: 'Sepette en az bir ürün olmalıdır' }
 * }
 * ```
 */
export function formatOrderErrors(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {}

  for (const issue of error.errors) {
    const path = issue.path.join('.')
    // Only take the first error for each field
    if (!errors[path]) {
      errors[path] = issue.message
    }
  }

  return errors
}

/**
 * Format price for display in Turkish Lira
 *
 * @param price - The price number to format
 * @param currency - The currency code (default: 'TRY')
 * @returns Formatted price string
 *
 * @example
 * ```ts
 * formatOrderPrice(49.90) // '₺49,90'
 * formatOrderPrice(1500) // '₺1.500,00'
 * ```
 */
export function formatOrderPrice(price: number, currency: string = 'TRY'): string {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(price)
}

/**
 * Calculate order total from items
 *
 * @param items - Array of order items
 * @returns Total order amount
 */
export function calculateOrderTotal(
  items: Array<{ item_total: number; quantity?: number }>
): number {
  return items.reduce((sum, item) => sum + item.item_total, 0)
}

/**
 * Calculate item total from unit price, modifiers, and quantity
 *
 * @param unitPrice - Base product price
 * @param modifierTotal - Total price adjustment from modifiers
 * @param quantity - Item quantity
 * @returns Total for this item
 */
export function calculateItemTotal(
  unitPrice: number,
  modifierTotal: number = 0,
  quantity: number = 1
): number {
  return (unitPrice + modifierTotal) * quantity
}

/**
 * Format estimated ready time for display
 *
 * @param minutes - Estimated minutes until ready
 * @returns Formatted string (e.g., "15-20 dk")
 */
export function formatEstimatedTime(minutes: number): string {
  if (minutes <= 15) {
    return '10-15 dk'
  } else if (minutes <= 30) {
    return '20-30 dk'
  } else if (minutes <= 45) {
    return '30-45 dk'
  } else if (minutes <= 60) {
    return '45-60 dk'
  } else {
    const hours = Math.floor(minutes / 60)
    const remainingMins = minutes % 60
    if (remainingMins === 0) {
      return `${hours} saat`
    }
    return `${hours} saat ${remainingMins} dk`
  }
}

/**
 * Get relative time string in Turkish
 *
 * @param date - Date to format
 * @returns Relative time string (e.g., "5 dakika önce")
 */
export function getRelativeTimeString(date: Date | string): string {
  const now = new Date()
  const targetDate = typeof date === 'string' ? new Date(date) : date
  const diffMs = now.getTime() - targetDate.getTime()
  const diffMins = Math.floor(diffMs / 60000)

  if (diffMins < 1) {
    return 'Az önce'
  } else if (diffMins < 60) {
    return `${diffMins} dakika önce`
  } else if (diffMins < 1440) {
    const hours = Math.floor(diffMins / 60)
    return `${hours} saat önce`
  } else {
    const days = Math.floor(diffMins / 1440)
    return `${days} gün önce`
  }
}
