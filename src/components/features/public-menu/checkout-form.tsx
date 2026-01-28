'use client'

/**
 * CheckoutForm Component
 *
 * Mobile-optimized order submission form for customers.
 * Designed following MOBILE-FIRST-TALIMATNAME-v3.md guidelines:
 *
 * - Touch targets: 44×44px minimum (48px comfortable)
 * - Bottom sheet pattern: Steps through checkout flow
 * - Form validation with Turkish error messages
 * - Price locking: Shows prices locked at time of cart addition
 *
 * @example
 * ```tsx
 * <CheckoutForm
 *   isOpen={isCheckoutOpen}
 *   onClose={() => setCheckoutOpen(false)}
 *   onSuccess={(orderNumber) => router.push(`/r/${slug}/order-confirmation?orderNumber=${orderNumber}`)}
 * />
 * ```
 */

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  useCartStore,
  useCartItems,
  useCartTotal,
  useIsCartEmpty,
  formatCartPrice,
  type CartItem,
} from '@/lib/stores/cart-store'
import { createOrder, type OrderActionResponse } from '@/lib/actions/orders'
import {
  checkoutFormSchema,
  type CheckoutFormInput,
  ORDER_CONSTRAINTS,
} from '@/lib/validations/orders'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils/cn'
import type { Order } from '@/types/database'

// =============================================================================
// TYPES
// =============================================================================

interface CheckoutFormProps {
  /** Whether the checkout form is open */
  isOpen: boolean
  /** Callback when form should close */
  onClose: () => void
  /** Callback when order is successfully submitted */
  onSuccess?: (orderNumber: string, orderId: string) => void
  /** Restaurant slug for redirect */
  restaurantSlug: string
}

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

/**
 * Order Summary Item
 */
function OrderSummaryItem({ item, itemTotal }: { item: CartItem; itemTotal: number }) {
  const modifierDetails = item.modifiers
    .flatMap((m) => m.selected_options.map((o) => o.option_name))
    .join(', ')

  return (
    <div className="flex items-start justify-between gap-3 py-2">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-5 min-w-5 items-center justify-center rounded bg-primary-100 px-1.5 text-xs font-medium text-primary-700 dark:bg-primary-900/30 dark:text-primary-400">
            {item.quantity}x
          </span>
          <span className="font-medium text-foreground">{item.product_name}</span>
        </div>
        {modifierDetails && (
          <p className="mt-0.5 text-xs text-muted-foreground">{modifierDetails}</p>
        )}
        {item.special_instructions && (
          <p className="mt-0.5 text-xs italic text-muted-foreground">
            Not: {item.special_instructions}
          </p>
        )}
      </div>
      <span className="shrink-0 text-sm font-medium text-foreground">
        {formatCartPrice(itemTotal, item.currency)}
      </span>
    </div>
  )
}

/**
 * Order Summary
 */
function OrderSummary({
  items,
  getItemTotal,
  subtotal,
  total,
  currency,
}: {
  items: CartItem[]
  getItemTotal: (item: CartItem) => number
  subtotal: number
  total: number
  currency: string
}) {
  const modifiersTotal = total - subtotal

  return (
    <div className="rounded-xl border border-border bg-muted/30 p-4">
      <h3 className="font-semibold text-foreground">Sipariş Özeti</h3>

      {/* Items List */}
      <div className="mt-3 divide-y divide-border">
        {items.map((item) => (
          <OrderSummaryItem key={item.id} item={item} itemTotal={getItemTotal(item)} />
        ))}
      </div>

      {/* Totals */}
      <div className="mt-4 space-y-2 border-t border-border pt-3">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Ara Toplam</span>
          <span className="font-medium text-foreground">
            {formatCartPrice(subtotal, currency)}
          </span>
        </div>
        {modifiersTotal > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Ekstralar</span>
            <span className="font-medium text-foreground">
              {formatCartPrice(modifiersTotal, currency)}
            </span>
          </div>
        )}
        <div className="flex justify-between pt-2 text-base">
          <span className="font-semibold text-foreground">Toplam</span>
          <span className="font-bold text-primary-600">
            {formatCartPrice(total, currency)}
          </span>
        </div>
      </div>
    </div>
  )
}

/**
 * Form Input with Label
 */
function FormField({
  id,
  label,
  error,
  optional,
  children,
}: {
  id: string
  label: string
  error?: string
  optional?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="flex items-center gap-2 text-sm font-medium">
        {label}
        {optional && (
          <span className="text-xs font-normal text-muted-foreground">(İsteğe bağlı)</span>
        )}
      </Label>
      {children}
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function CheckoutForm({
  isOpen,
  onClose,
  onSuccess,
  restaurantSlug,
}: CheckoutFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // Cart state
  const items = useCartItems()
  const total = useCartTotal()
  const isEmpty = useIsCartEmpty()
  const context = useCartStore((state) => state.context)
  const customerName = useCartStore((state) => state.customerName)
  const customerPhone = useCartStore((state) => state.customerPhone)
  const customerNotes = useCartStore((state) => state.customerNotes)
  const setCustomerName = useCartStore((state) => state.setCustomerName)
  const setCustomerPhone = useCartStore((state) => state.setCustomerPhone)
  const setCustomerNotes = useCartStore((state) => state.setCustomerNotes)
  const getSubtotal = useCartStore((state) => state.getSubtotal)
  const getItemTotal = useCartStore((state) => state.getItemTotal)
  const prepareForSubmission = useCartStore((state) => state.prepareForSubmission)
  const resetForNewOrder = useCartStore((state) => state.resetForNewOrder)
  const validateCart = useCartStore((state) => state.validateCart)

  const subtotal = getSubtotal()
  const currency = context?.currency || 'TRY'

  // Form setup with react-hook-form
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<CheckoutFormInput>({
    resolver: zodResolver(checkoutFormSchema),
    defaultValues: {
      customer_name: customerName,
      customer_phone: customerPhone,
      customer_notes: customerNotes,
    },
  })

  // Sync form values with cart store
  const watchName = watch('customer_name')
  const watchPhone = watch('customer_phone')
  const watchNotes = watch('customer_notes')

  useEffect(() => {
    if (watchName !== undefined) setCustomerName(watchName || '')
  }, [watchName, setCustomerName])

  useEffect(() => {
    if (watchPhone !== undefined) setCustomerPhone(watchPhone || '')
  }, [watchPhone, setCustomerPhone])

  useEffect(() => {
    if (watchNotes !== undefined) setCustomerNotes(watchNotes || '')
  }, [watchNotes, setCustomerNotes])

  // Handle escape key to close
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isSubmitting) {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, isSubmitting, onClose])

  // Handle body scroll lock
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }

    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  // Submit order
  const onSubmit = useCallback(
    async (formData: CheckoutFormInput) => {
      setSubmitError(null)

      // Validate cart before submission
      const validation = validateCart()
      if (!validation.isValid) {
        setSubmitError(validation.errors[0]?.message || 'Sepetinizde eksik seçimler var')
        return
      }

      // Prepare cart data for submission
      const cartData = prepareForSubmission()
      if (!cartData) {
        setSubmitError('Sipariş verisi hazırlanamadı. Lütfen tekrar deneyin.')
        return
      }

      setIsSubmitting(true)

      try {
        // Prepare order input
        const orderInput = {
          organization_id: cartData.organization_id,
          table_id: cartData.table_id,
          table_name: cartData.table_name,
          customer_name: formData.customer_name || null,
          customer_phone: formData.customer_phone || null,
          customer_notes: formData.customer_notes || null,
          order_type: cartData.order_type,
          subtotal: cartData.subtotal,
          total_amount: cartData.total_amount,
          currency: cartData.currency,
          items: cartData.items.map((item) => ({
            product_id: item.product_id,
            product_name: item.product_name,
            product_description: item.product_description,
            product_image_url: item.product_image_url,
            quantity: item.quantity,
            unit_price: item.unit_price,
            modifier_total: item.modifier_total,
            item_total: item.item_total,
            currency: item.currency,
            price_ledger_id: item.price_ledger_id,
            selected_modifiers: item.selected_modifiers,
            special_instructions: item.special_instructions,
          })),
        }

        // Create the order
        const result: OrderActionResponse<Order> = await createOrder(orderInput)

        if (result.success && result.data) {
          const order = result.data
          const orderNumber = order.order_number || order.id.slice(0, 8).toUpperCase()

          // Clear the cart
          resetForNewOrder()

          // Close the checkout form
          onClose()

          // Navigate to confirmation page or call success callback
          if (onSuccess) {
            onSuccess(orderNumber, order.id)
          } else {
            router.push(
              `/r/${restaurantSlug}/order-confirmation?orderId=${order.id}&orderNumber=${orderNumber}`
            )
          }
        } else {
          setSubmitError(result.message || 'Sipariş oluşturulamadı. Lütfen tekrar deneyin.')
        }
      } catch (err) {
        setSubmitError('Bir hata oluştu. Lütfen tekrar deneyin.')
      } finally {
        setIsSubmitting(false)
      }
    },
    [
      validateCart,
      prepareForSubmission,
      resetForNewOrder,
      onClose,
      onSuccess,
      router,
      restaurantSlug,
    ]
  )

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/60 transition-opacity duration-300',
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={!isSubmitting ? onClose : undefined}
        aria-hidden="true"
      />

      {/* Form Sheet */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="checkout-form-title"
        className={cn(
          'fixed inset-x-0 bottom-0 z-50 flex max-h-[95dvh] flex-col rounded-t-2xl bg-background shadow-2xl',
          'transform transition-transform duration-300 ease-out',
          isOpen ? 'translate-y-0' : 'translate-y-full'
        )}
      >
        {/* Drag Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div
            className="h-1.5 w-10 rounded-full bg-muted-foreground/30"
            aria-hidden="true"
          />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 pb-3">
          <h2
            id="checkout-form-title"
            className="text-lg font-semibold text-foreground"
          >
            Siparişi Tamamla
          </h2>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
            aria-label="Kapat"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4">
            {/* Table Info Banner */}
            {context?.table_name && (
              <div className="mb-4 flex items-center gap-2 rounded-lg bg-primary-50 px-3 py-2 dark:bg-primary-900/20">
                <svg
                  className="h-5 w-5 text-primary-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                <span className="text-sm font-medium text-primary-700 dark:text-primary-400">
                  {context.table_name}
                </span>
              </div>
            )}

            {/* Order Summary */}
            <OrderSummary
              items={items}
              getItemTotal={getItemTotal}
              subtotal={subtotal}
              total={total}
              currency={currency}
            />

            {/* Customer Info Section */}
            <div className="mt-6 space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground">
                İletişim Bilgileri
              </h3>

              {/* Name Field */}
              <FormField
                id="customer_name"
                label="Adınız"
                error={errors.customer_name?.message}
                optional
              >
                <Input
                  id="customer_name"
                  type="text"
                  placeholder="Siparişinizi teslim alırken kullanılacak"
                  className="h-12"
                  maxLength={ORDER_CONSTRAINTS.customerNameMax}
                  disabled={isSubmitting}
                  {...register('customer_name')}
                />
              </FormField>

              {/* Phone Field */}
              <FormField
                id="customer_phone"
                label="Telefon"
                error={errors.customer_phone?.message}
                optional
              >
                <Input
                  id="customer_phone"
                  type="tel"
                  inputMode="tel"
                  placeholder="0 (5XX) XXX XX XX"
                  className="h-12"
                  maxLength={ORDER_CONSTRAINTS.customerPhoneMax}
                  disabled={isSubmitting}
                  {...register('customer_phone')}
                />
              </FormField>

              {/* Notes Field */}
              <FormField
                id="customer_notes"
                label="Sipariş Notu"
                error={errors.customer_notes?.message}
                optional
              >
                <textarea
                  id="customer_notes"
                  placeholder="Özel isteklerinizi yazabilirsiniz (alerji, servis, vb.)"
                  className="h-24 w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  maxLength={ORDER_CONSTRAINTS.customerNotesMax}
                  disabled={isSubmitting}
                  {...register('customer_notes')}
                />
                <p className="text-xs text-muted-foreground">
                  {(watchNotes || '').length}/{ORDER_CONSTRAINTS.customerNotesMax}
                </p>
              </FormField>
            </div>

            {/* Error Message */}
            {submitError && (
              <div className="mt-4 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {submitError}
              </div>
            )}

            {/* Payment Notice */}
            <div className="mt-6 flex items-start gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3">
              <svg
                className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="text-sm text-muted-foreground">
                Ödemenizi sipariş servis edildikten sonra masada yapabilirsiniz.
              </p>
            </div>
          </div>

          {/* Submit Footer */}
          <div className="border-t border-border bg-background px-4 py-4 pb-safe">
            <Button
              type="submit"
              disabled={isSubmitting || isEmpty}
              className="h-12 w-full text-base font-semibold"
              size="lg"
            >
              {isSubmitting ? (
                <>
                  <svg className="mr-2 h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Sipariş Gönderiliyor...
                </>
              ) : (
                <>
                  Sipariş Ver
                  <span className="ml-2 text-primary-200">
                    ({formatCartPrice(total, currency)})
                  </span>
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </>
  )
}

export default CheckoutForm
