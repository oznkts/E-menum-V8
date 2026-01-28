/**
 * Order Validation Schema Tests
 *
 * Comprehensive tests for all order-related Zod validation schemas.
 * Tests cover order creation, status updates, service requests, and utilities.
 */

import { describe, it, expect } from 'vitest'
import {
  createOrderSchema,
  checkoutFormSchema,
  orderItemSchema,
  updateOrderStatusSchema,
  cancelOrderSchema,
  updatePaymentSchema,
  createServiceRequestSchema,
  updateServiceRequestSchema,
  orderFilterSchema,
  customerNameSchema,
  customerPhoneSchema,
  orderTypeSchema,
  orderStatusSchema,
  paymentStatusSchema,
  paymentMethodSchema,
  serviceRequestTypeSchema,
  quantitySchema,
  priceSchema,
  isValidStatusTransition,
  getValidNextStatuses,
  canCancelOrder,
  isTerminalStatus,
  getOrderStatusLabel,
  getOrderTypeLabel,
  getPaymentStatusLabel,
  getServiceRequestTypeLabel,
  getOrderStatusColor,
  formatOrderPrice,
  calculateOrderTotal,
  calculateItemTotal,
  formatEstimatedTime,
  getRelativeTimeString,
  ORDER_STATUS_TRANSITIONS,
  ORDER_ERROR_MESSAGES,
  ORDER_CONSTRAINTS,
  ORDER_STATUSES,
  ORDER_TYPES,
  PAYMENT_STATUSES,
  PAYMENT_METHODS,
  SERVICE_REQUEST_TYPES,
} from '../orders'

describe('Order Validation Schemas', () => {
  // =============================================================================
  // CUSTOMER NAME SCHEMA TESTS
  // =============================================================================
  describe('customerNameSchema', () => {
    it('should accept valid Turkish names', () => {
      const validNames = ['Ahmet', 'Mehmet Yılmaz', 'Ayşe Öztürk', 'İsmail Çelik']

      validNames.forEach((name) => {
        const result = customerNameSchema.safeParse(name)
        expect(result.success).toBe(true)
      })
    })

    it('should reject names with numbers', () => {
      const result = customerNameSchema.safeParse('Ahmet123')
      expect(result.success).toBe(false)
    })

    it('should reject names too short', () => {
      const result = customerNameSchema.safeParse('A')
      expect(result.success).toBe(false)
    })

    it('should trim whitespace', () => {
      const result = customerNameSchema.safeParse('  Ahmet  ')
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBe('Ahmet')
      }
    })
  })

  // =============================================================================
  // CUSTOMER PHONE SCHEMA TESTS
  // =============================================================================
  describe('customerPhoneSchema', () => {
    it('should accept valid Turkish phone numbers', () => {
      const validPhones = [
        '5301234567',
        '+905301234567',
        '0530 123 45 67',
        '+90 (530) 123-4567',
      ]

      validPhones.forEach((phone) => {
        const result = customerPhoneSchema.safeParse(phone)
        expect(result.success).toBe(true)
      })
    })

    it('should reject phones with letters', () => {
      const result = customerPhoneSchema.safeParse('phone123456')
      expect(result.success).toBe(false)
    })
  })

  // =============================================================================
  // ORDER TYPE SCHEMA TESTS
  // =============================================================================
  describe('orderTypeSchema', () => {
    it('should accept all valid order types', () => {
      ORDER_TYPES.forEach((type) => {
        const result = orderTypeSchema.safeParse(type)
        expect(result.success).toBe(true)
      })
    })

    it('should reject invalid order type', () => {
      const result = orderTypeSchema.safeParse('invalid_type')
      expect(result.success).toBe(false)
    })
  })

  // =============================================================================
  // ORDER STATUS SCHEMA TESTS
  // =============================================================================
  describe('orderStatusSchema', () => {
    it('should accept all valid order statuses', () => {
      ORDER_STATUSES.forEach((status) => {
        const result = orderStatusSchema.safeParse(status)
        expect(result.success).toBe(true)
      })
    })

    it('should reject invalid order status', () => {
      const result = orderStatusSchema.safeParse('invalid_status')
      expect(result.success).toBe(false)
    })
  })

  // =============================================================================
  // PAYMENT STATUS SCHEMA TESTS
  // =============================================================================
  describe('paymentStatusSchema', () => {
    it('should accept all valid payment statuses', () => {
      PAYMENT_STATUSES.forEach((status) => {
        const result = paymentStatusSchema.safeParse(status)
        expect(result.success).toBe(true)
      })
    })
  })

  // =============================================================================
  // PAYMENT METHOD SCHEMA TESTS
  // =============================================================================
  describe('paymentMethodSchema', () => {
    it('should accept all valid payment methods', () => {
      PAYMENT_METHODS.forEach((method) => {
        const result = paymentMethodSchema.safeParse(method)
        expect(result.success).toBe(true)
      })
    })
  })

  // =============================================================================
  // SERVICE REQUEST TYPE SCHEMA TESTS
  // =============================================================================
  describe('serviceRequestTypeSchema', () => {
    it('should accept all valid service request types', () => {
      SERVICE_REQUEST_TYPES.forEach((type) => {
        const result = serviceRequestTypeSchema.safeParse(type)
        expect(result.success).toBe(true)
      })
    })
  })

  // =============================================================================
  // QUANTITY SCHEMA TESTS
  // =============================================================================
  describe('quantitySchema', () => {
    it('should accept valid quantities', () => {
      const validQuantities = [1, 5, 10, 99]
      validQuantities.forEach((qty) => {
        const result = quantitySchema.safeParse(qty)
        expect(result.success).toBe(true)
      })
    })

    it('should reject quantity less than minimum', () => {
      const result = quantitySchema.safeParse(0)
      expect(result.success).toBe(false)
    })

    it('should reject quantity above maximum', () => {
      const result = quantitySchema.safeParse(ORDER_CONSTRAINTS.itemQuantityMax + 1)
      expect(result.success).toBe(false)
    })

    it('should reject non-integer quantities', () => {
      const result = quantitySchema.safeParse(1.5)
      expect(result.success).toBe(false)
    })
  })

  // =============================================================================
  // ORDER ITEM SCHEMA TESTS
  // =============================================================================
  describe('orderItemSchema', () => {
    it('should accept valid order item', () => {
      const result = orderItemSchema.safeParse({
        product_id: '123e4567-e89b-12d3-a456-426614174000',
        product_name: 'Türk Kahvesi',
        quantity: 2,
        unit_price: 25.0,
        item_total: 50.0,
        currency: 'TRY',
      })
      expect(result.success).toBe(true)
    })

    it('should accept order item with modifiers', () => {
      const result = orderItemSchema.safeParse({
        product_id: '123e4567-e89b-12d3-a456-426614174000',
        product_name: 'Latte',
        quantity: 1,
        unit_price: 35.0,
        modifier_total: 5.0,
        item_total: 40.0,
        currency: 'TRY',
        selected_modifiers: [
          {
            modifier_id: '223e4567-e89b-12d3-a456-426614174001',
            modifier_name: 'Boyut',
            is_required: true,
            min_selections: 1,
            max_selections: 1,
            selected_options: [
              {
                option_id: '323e4567-e89b-12d3-a456-426614174002',
                option_name: 'Büyük',
                price_adjustment: 5.0,
              },
            ],
          },
        ],
      })
      expect(result.success).toBe(true)
    })

    it('should accept order item with special instructions', () => {
      const result = orderItemSchema.safeParse({
        product_id: '123e4567-e89b-12d3-a456-426614174000',
        product_name: 'Izgara Köfte',
        quantity: 1,
        unit_price: 65.0,
        item_total: 65.0,
        currency: 'TRY',
        special_instructions: 'Az pişmiş olsun',
      })
      expect(result.success).toBe(true)
    })

    it('should reject order item without required fields', () => {
      const result = orderItemSchema.safeParse({
        product_name: 'Test',
        // Missing product_id, quantity, unit_price, item_total
      })
      expect(result.success).toBe(false)
    })
  })

  // =============================================================================
  // CREATE ORDER SCHEMA TESTS
  // =============================================================================
  describe('createOrderSchema', () => {
    const validOrderItem = {
      product_id: '123e4567-e89b-12d3-a456-426614174000',
      product_name: 'Türk Kahvesi',
      quantity: 2,
      unit_price: 25.0,
      item_total: 50.0,
      currency: 'TRY',
    }

    it('should accept valid order', () => {
      const result = createOrderSchema.safeParse({
        organization_id: '123e4567-e89b-12d3-a456-426614174000',
        subtotal: 50.0,
        total_amount: 50.0,
        currency: 'TRY',
        items: [validOrderItem],
      })
      expect(result.success).toBe(true)
    })

    it('should accept order with customer info', () => {
      const result = createOrderSchema.safeParse({
        organization_id: '123e4567-e89b-12d3-a456-426614174000',
        table_id: '223e4567-e89b-12d3-a456-426614174001',
        customer_name: 'Ahmet Yılmaz',
        customer_phone: '5301234567',
        customer_notes: 'Kapıda teslim',
        order_type: 'dine_in',
        subtotal: 50.0,
        total_amount: 50.0,
        currency: 'TRY',
        items: [validOrderItem],
      })
      expect(result.success).toBe(true)
    })

    it('should reject order without items', () => {
      const result = createOrderSchema.safeParse({
        organization_id: '123e4567-e89b-12d3-a456-426614174000',
        subtotal: 0,
        total_amount: 0,
        currency: 'TRY',
        items: [],
      })
      expect(result.success).toBe(false)
    })

    it('should reject order without organization_id', () => {
      const result = createOrderSchema.safeParse({
        subtotal: 50.0,
        total_amount: 50.0,
        currency: 'TRY',
        items: [validOrderItem],
      })
      expect(result.success).toBe(false)
    })
  })

  // =============================================================================
  // CHECKOUT FORM SCHEMA TESTS
  // =============================================================================
  describe('checkoutFormSchema', () => {
    it('should accept valid checkout form data', () => {
      const result = checkoutFormSchema.safeParse({
        customer_name: 'Ahmet',
        customer_phone: '5301234567',
        customer_notes: 'Acil değil',
      })
      expect(result.success).toBe(true)
    })

    it('should accept empty checkout form', () => {
      const result = checkoutFormSchema.safeParse({})
      expect(result.success).toBe(true)
    })
  })

  // =============================================================================
  // UPDATE ORDER STATUS SCHEMA TESTS
  // =============================================================================
  describe('updateOrderStatusSchema', () => {
    it('should accept valid status update', () => {
      const result = updateOrderStatusSchema.safeParse({
        order_id: '123e4567-e89b-12d3-a456-426614174000',
        status: 'confirmed',
      })
      expect(result.success).toBe(true)
    })

    it('should accept status update with estimated time', () => {
      const result = updateOrderStatusSchema.safeParse({
        order_id: '123e4567-e89b-12d3-a456-426614174000',
        status: 'preparing',
        estimated_ready_minutes: 15,
      })
      expect(result.success).toBe(true)
    })

    it('should reject invalid estimated time', () => {
      const result = updateOrderStatusSchema.safeParse({
        order_id: '123e4567-e89b-12d3-a456-426614174000',
        status: 'preparing',
        estimated_ready_minutes: ORDER_CONSTRAINTS.estimatedTimeMax + 1,
      })
      expect(result.success).toBe(false)
    })
  })

  // =============================================================================
  // CANCEL ORDER SCHEMA TESTS
  // =============================================================================
  describe('cancelOrderSchema', () => {
    it('should accept valid cancellation', () => {
      const result = cancelOrderSchema.safeParse({
        order_id: '123e4567-e89b-12d3-a456-426614174000',
        cancellation_reason: 'Müşteri iptal etti',
      })
      expect(result.success).toBe(true)
    })

    it('should reject cancellation without reason', () => {
      const result = cancelOrderSchema.safeParse({
        order_id: '123e4567-e89b-12d3-a456-426614174000',
        cancellation_reason: '',
      })
      expect(result.success).toBe(false)
    })
  })

  // =============================================================================
  // UPDATE PAYMENT SCHEMA TESTS
  // =============================================================================
  describe('updatePaymentSchema', () => {
    it('should accept valid payment update', () => {
      const result = updatePaymentSchema.safeParse({
        order_id: '123e4567-e89b-12d3-a456-426614174000',
        payment_status: 'paid',
        payment_method: 'credit_card',
        paid_amount: 100.0,
      })
      expect(result.success).toBe(true)
    })
  })

  // =============================================================================
  // SERVICE REQUEST SCHEMA TESTS
  // =============================================================================
  describe('createServiceRequestSchema', () => {
    it('should accept valid service request', () => {
      const result = createServiceRequestSchema.safeParse({
        organization_id: '123e4567-e89b-12d3-a456-426614174000',
        table_id: '223e4567-e89b-12d3-a456-426614174001',
        request_type: 'call_waiter',
      })
      expect(result.success).toBe(true)
    })

    it('should accept service request with message', () => {
      const result = createServiceRequestSchema.safeParse({
        organization_id: '123e4567-e89b-12d3-a456-426614174000',
        table_id: '223e4567-e89b-12d3-a456-426614174001',
        request_type: 'need_help',
        message: 'Menü hakkında sorum var',
      })
      expect(result.success).toBe(true)
    })
  })

  describe('updateServiceRequestSchema', () => {
    it('should accept valid status update', () => {
      const result = updateServiceRequestSchema.safeParse({
        request_id: '123e4567-e89b-12d3-a456-426614174000',
        status: 'completed',
        response: 'İstek tamamlandı',
      })
      expect(result.success).toBe(true)
    })
  })

  // =============================================================================
  // ORDER FILTER SCHEMA TESTS
  // =============================================================================
  describe('orderFilterSchema', () => {
    it('should accept valid filter options', () => {
      const result = orderFilterSchema.safeParse({
        status: ['pending', 'confirmed'],
        order_type: ['dine_in'],
        page: 1,
        limit: 20,
        sort_by: 'created_at',
        sort_order: 'desc',
      })
      expect(result.success).toBe(true)
    })

    it('should use defaults when not provided', () => {
      const result = orderFilterSchema.safeParse({})
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.page).toBe(1)
        expect(result.data.limit).toBe(20)
        expect(result.data.sort_by).toBe('created_at')
        expect(result.data.sort_order).toBe('desc')
      }
    })
  })

  // =============================================================================
  // ORDER STATUS TRANSITION TESTS
  // =============================================================================
  describe('isValidStatusTransition', () => {
    it('should allow valid transitions', () => {
      expect(isValidStatusTransition('pending', 'confirmed')).toBe(true)
      expect(isValidStatusTransition('confirmed', 'preparing')).toBe(true)
      expect(isValidStatusTransition('preparing', 'ready')).toBe(true)
      expect(isValidStatusTransition('ready', 'served')).toBe(true)
      expect(isValidStatusTransition('served', 'completed')).toBe(true)
    })

    it('should disallow invalid transitions', () => {
      expect(isValidStatusTransition('completed', 'pending')).toBe(false)
      expect(isValidStatusTransition('cancelled', 'confirmed')).toBe(false)
      expect(isValidStatusTransition('pending', 'ready')).toBe(false)
    })

    it('should allow cancellation from non-terminal states', () => {
      expect(isValidStatusTransition('pending', 'cancelled')).toBe(true)
      expect(isValidStatusTransition('confirmed', 'cancelled')).toBe(true)
      expect(isValidStatusTransition('preparing', 'cancelled')).toBe(true)
    })
  })

  describe('getValidNextStatuses', () => {
    it('should return valid next statuses', () => {
      expect(getValidNextStatuses('pending')).toContain('confirmed')
      expect(getValidNextStatuses('pending')).toContain('cancelled')
      expect(getValidNextStatuses('confirmed')).toContain('preparing')
    })

    it('should return empty array for terminal states', () => {
      expect(getValidNextStatuses('completed')).toHaveLength(0)
      expect(getValidNextStatuses('cancelled')).toHaveLength(0)
    })
  })

  describe('canCancelOrder', () => {
    it('should return true for cancellable statuses', () => {
      expect(canCancelOrder('pending')).toBe(true)
      expect(canCancelOrder('confirmed')).toBe(true)
      expect(canCancelOrder('preparing')).toBe(true)
    })

    it('should return false for non-cancellable statuses', () => {
      expect(canCancelOrder('completed')).toBe(false)
      expect(canCancelOrder('cancelled')).toBe(false)
      expect(canCancelOrder('served')).toBe(false)
    })
  })

  describe('isTerminalStatus', () => {
    it('should identify terminal statuses', () => {
      expect(isTerminalStatus('completed')).toBe(true)
      expect(isTerminalStatus('cancelled')).toBe(true)
    })

    it('should identify non-terminal statuses', () => {
      expect(isTerminalStatus('pending')).toBe(false)
      expect(isTerminalStatus('preparing')).toBe(false)
    })
  })

  // =============================================================================
  // LABEL FUNCTION TESTS
  // =============================================================================
  describe('Label Functions', () => {
    describe('getOrderStatusLabel', () => {
      it('should return Turkish labels', () => {
        expect(getOrderStatusLabel('pending')).toBe('Bekliyor')
        expect(getOrderStatusLabel('confirmed')).toBe('Onaylandı')
        expect(getOrderStatusLabel('preparing')).toBe('Hazırlanıyor')
        expect(getOrderStatusLabel('ready')).toBe('Hazır')
        expect(getOrderStatusLabel('served')).toBe('Servis Edildi')
        expect(getOrderStatusLabel('completed')).toBe('Tamamlandı')
        expect(getOrderStatusLabel('cancelled')).toBe('İptal Edildi')
      })
    })

    describe('getOrderTypeLabel', () => {
      it('should return Turkish labels', () => {
        expect(getOrderTypeLabel('dine_in')).toBe('Masa Servisi')
        expect(getOrderTypeLabel('takeaway')).toBe('Paket Servis')
        expect(getOrderTypeLabel('delivery')).toBe('Gel Al')
      })
    })

    describe('getPaymentStatusLabel', () => {
      it('should return Turkish labels', () => {
        expect(getPaymentStatusLabel('pending')).toBe('Ödeme Bekliyor')
        expect(getPaymentStatusLabel('paid')).toBe('Ödendi')
        expect(getPaymentStatusLabel('refunded')).toBe('İade Edildi')
      })
    })

    describe('getServiceRequestTypeLabel', () => {
      it('should return Turkish labels', () => {
        expect(getServiceRequestTypeLabel('call_waiter')).toBe('Garson Çağır')
        expect(getServiceRequestTypeLabel('request_bill')).toBe('Hesap İste')
        expect(getServiceRequestTypeLabel('need_help')).toBe('Yardım İste')
      })
    })
  })

  // =============================================================================
  // COLOR FUNCTION TESTS
  // =============================================================================
  describe('getOrderStatusColor', () => {
    it('should return appropriate colors for each status', () => {
      const pendingColors = getOrderStatusColor('pending')
      expect(pendingColors.bg).toContain('yellow')

      const readyColors = getOrderStatusColor('ready')
      expect(readyColors.bg).toContain('green')

      const cancelledColors = getOrderStatusColor('cancelled')
      expect(cancelledColors.bg).toContain('red')
    })
  })

  // =============================================================================
  // UTILITY FUNCTION TESTS
  // =============================================================================
  describe('formatOrderPrice', () => {
    it('should format Turkish Lira correctly', () => {
      const formatted = formatOrderPrice(49.9)
      expect(formatted).toContain('₺')
      expect(formatted).toContain('49')
    })

    it('should use thousand separators', () => {
      const formatted = formatOrderPrice(1500)
      expect(formatted).toContain('1.500')
    })
  })

  describe('calculateOrderTotal', () => {
    it('should calculate total from items', () => {
      const items = [{ item_total: 50 }, { item_total: 30 }, { item_total: 20 }]
      expect(calculateOrderTotal(items)).toBe(100)
    })

    it('should return 0 for empty items', () => {
      expect(calculateOrderTotal([])).toBe(0)
    })
  })

  describe('calculateItemTotal', () => {
    it('should calculate with modifiers and quantity', () => {
      expect(calculateItemTotal(50, 10, 2)).toBe(120)
    })

    it('should handle zero modifiers', () => {
      expect(calculateItemTotal(50, 0, 1)).toBe(50)
    })

    it('should handle default quantity', () => {
      expect(calculateItemTotal(50, 10)).toBe(60)
    })
  })

  describe('formatEstimatedTime', () => {
    it('should format short times', () => {
      expect(formatEstimatedTime(10)).toBe('10-15 dk')
      expect(formatEstimatedTime(15)).toBe('10-15 dk')
    })

    it('should format medium times', () => {
      expect(formatEstimatedTime(25)).toBe('20-30 dk')
      expect(formatEstimatedTime(40)).toBe('30-45 dk')
    })

    it('should format longer times with hours', () => {
      expect(formatEstimatedTime(60)).toBe('45-60 dk')
      expect(formatEstimatedTime(90)).toContain('saat')
    })
  })

  describe('getRelativeTimeString', () => {
    it('should return "Az önce" for very recent times', () => {
      const now = new Date()
      expect(getRelativeTimeString(now)).toBe('Az önce')
    })

    it('should return minutes for recent times', () => {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
      expect(getRelativeTimeString(fiveMinutesAgo)).toContain('dakika önce')
    })

    it('should return hours for older times', () => {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000)
      expect(getRelativeTimeString(twoHoursAgo)).toContain('saat önce')
    })

    it('should return days for much older times', () => {
      const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
      expect(getRelativeTimeString(twoDaysAgo)).toContain('gün önce')
    })
  })
})
