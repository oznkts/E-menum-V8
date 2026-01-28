'use client'

/**
 * CartDrawer Component
 *
 * Mobile-optimized bottom sheet drawer for displaying and managing the shopping cart.
 * Designed following MOBILE-FIRST-TALIMATNAME-v3.md guidelines:
 *
 * - Bottom sheet pattern: Slides up from bottom with drag handle
 * - Touch targets: 44×44px minimum for all interactive elements
 * - Thumb zone: Primary actions (checkout) in lower 1/3
 * - Safe areas: Respects device notches and home indicators
 * - Accessibility: Focus trap, ARIA labels, keyboard navigation
 *
 * @example
 * ```tsx
 * <CartDrawer
 *   isOpen={isCartOpen}
 *   onClose={() => setCartOpen(false)}
 * />
 * ```
 */

import { useCallback, useEffect, useRef } from 'react'
import {
  useCartStore,
  useCartItems,
  useCartTotal,
  useIsCartEmpty,
  formatCartPrice,
} from '@/lib/stores/cart-store'
import { CartItem } from './cart-item'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils/cn'

// =============================================================================
// TYPES
// =============================================================================

interface CartDrawerProps {
  /** Whether the drawer is open */
  isOpen: boolean
  /** Callback when drawer should close */
  onClose: () => void
  /** Callback when checkout button is clicked */
  onCheckout?: () => void
}

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

/**
 * Empty Cart State
 */
function EmptyCartState({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <div className="rounded-full bg-muted p-4">
        <svg
          className="h-12 w-12 text-muted-foreground"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
          />
        </svg>
      </div>
      <h3 className="mt-4 text-lg font-semibold text-foreground">
        Sepetiniz boş
      </h3>
      <p className="mt-2 text-sm text-muted-foreground">
        Menüden ürün ekleyerek siparişinize başlayın
      </p>
      <Button
        onClick={onClose}
        className="mt-6"
        variant="outline"
      >
        Menüye Dön
      </Button>
    </div>
  )
}

/**
 * Cart Summary Footer
 */
function CartSummary({
  subtotal,
  total,
  currency,
  itemCount,
  onCheckout,
  isLoading,
}: {
  subtotal: number
  total: number
  currency: string
  itemCount: number
  onCheckout?: () => void
  isLoading?: boolean
}) {
  return (
    <div className="border-t border-border bg-background px-4 py-4 pb-safe">
      {/* Summary Details */}
      <div className="mb-4 space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Ara Toplam ({itemCount} ürün)
          </span>
          <span className="font-medium text-foreground">
            {formatCartPrice(subtotal, currency)}
          </span>
        </div>

        {/* Show modifiers total if different from subtotal */}
        {total !== subtotal && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Ekstralar</span>
            <span className="font-medium text-foreground">
              {formatCartPrice(total - subtotal, currency)}
            </span>
          </div>
        )}

        <div className="flex items-center justify-between border-t border-border pt-2">
          <span className="text-base font-semibold text-foreground">Toplam</span>
          <span className="text-lg font-bold text-primary-600">
            {formatCartPrice(total, currency)}
          </span>
        </div>
      </div>

      {/* Checkout Button */}
      <Button
        onClick={onCheckout}
        disabled={isLoading}
        className="w-full h-12 text-base font-semibold"
        size="lg"
      >
        {isLoading ? (
          <>
            <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
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
            <span>İşleniyor...</span>
          </>
        ) : (
          <>
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
                d="M9 5l7 7-7 7"
              />
            </svg>
            <span>Siparişi Tamamla</span>
          </>
        )}
      </Button>

      {/* Note about payment */}
      <p className="mt-3 text-center text-xs text-muted-foreground">
        Ödeme masada yapılacaktır
      </p>
    </div>
  )
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function CartDrawer({ isOpen, onClose, onCheckout }: CartDrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  // Cart state
  const items = useCartItems()
  const total = useCartTotal()
  const isEmpty = useIsCartEmpty()
  const context = useCartStore((state) => state.context)
  const incrementQuantity = useCartStore((state) => state.incrementQuantity)
  const decrementQuantity = useCartStore((state) => state.decrementQuantity)
  const removeItem = useCartStore((state) => state.removeItem)
  const clearCart = useCartStore((state) => state.clearCart)
  const getSubtotal = useCartStore((state) => state.getSubtotal)
  const getItemTotal = useCartStore((state) => state.getItemTotal)
  const getItemCount = useCartStore((state) => state.getItemCount)

  const subtotal = getSubtotal()
  const itemCount = getItemCount()
  const currency = context?.currency || 'TRY'

  // Handle escape key to close drawer
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  // Handle body scroll lock when drawer is open
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

  // Focus trap in drawer
  useEffect(() => {
    if (!isOpen || !drawerRef.current) return

    const focusableElements = drawerRef.current.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    const firstElement = focusableElements[0] as HTMLElement
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault()
          lastElement?.focus()
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault()
          firstElement?.focus()
        }
      }
    }

    document.addEventListener('keydown', handleTab)
    firstElement?.focus()

    return () => document.removeEventListener('keydown', handleTab)
  }, [isOpen])

  // Handle clear cart with confirmation
  const handleClearCart = useCallback(() => {
    if (window.confirm('Sepetinizdeki tüm ürünleri silmek istediğinizden emin misiniz?')) {
      clearCart()
    }
  }, [clearCart])

  // Handle checkout
  const handleCheckout = useCallback(() => {
    if (onCheckout) {
      onCheckout()
    } else {
      // Default behavior: Show alert (will be replaced with checkout flow)
      alert('Sipariş verme özelliği yakında aktif olacak!')
    }
  }, [onCheckout])

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/60 transition-opacity duration-300',
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cart-drawer-title"
        className={cn(
          'fixed inset-x-0 bottom-0 z-50 flex max-h-[90dvh] flex-col rounded-t-2xl bg-background shadow-2xl',
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
            id="cart-drawer-title"
            className="text-lg font-semibold text-foreground"
          >
            Sepetim
            {itemCount > 0 && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({itemCount} ürün)
              </span>
            )}
          </h2>

          <div className="flex items-center gap-2">
            {/* Clear Cart Button */}
            {!isEmpty && (
              <button
                onClick={handleClearCart}
                className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                aria-label="Sepeti temizle"
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
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
            )}

            {/* Close Button */}
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Sepeti kapat"
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
        </div>

        {/* Cart Content */}
        {isEmpty ? (
          <EmptyCartState onClose={onClose} />
        ) : (
          <>
            {/* Scrollable Items List */}
            <div
              ref={contentRef}
              className="flex-1 overflow-y-auto overscroll-contain px-4 py-4"
            >
              <div className="space-y-3">
                {items.map((item) => (
                  <CartItem
                    key={item.id}
                    item={item}
                    itemTotal={getItemTotal(item)}
                    onIncrement={() => incrementQuantity(item.id)}
                    onDecrement={() => decrementQuantity(item.id)}
                    onRemove={() => removeItem(item.id)}
                  />
                ))}
              </div>
            </div>

            {/* Summary Footer */}
            <CartSummary
              subtotal={subtotal}
              total={total}
              currency={currency}
              itemCount={itemCount}
              onCheckout={handleCheckout}
            />
          </>
        )}
      </div>
    </>
  )
}

// =============================================================================
// FLOATING CART BUTTON (FAB)
// =============================================================================

interface CartFABProps {
  /** Number of items in cart */
  itemCount: number
  /** Total price */
  total: number
  /** Currency code */
  currency?: string
  /** Callback when button is clicked */
  onClick: () => void
  /** Whether the cart drawer is currently open */
  isCartOpen?: boolean
}

/**
 * Floating Action Button for Cart
 *
 * Shows in the bottom-right corner of the screen when items are in cart.
 * Displays item count badge and total price.
 */
export function CartFAB({
  itemCount,
  total,
  currency = 'TRY',
  onClick,
  isCartOpen = false,
}: CartFABProps) {
  // Don't show FAB if cart is empty or drawer is open
  if (itemCount === 0 || isCartOpen) return null

  return (
    <button
      onClick={onClick}
      className={cn(
        'fixed bottom-6 left-1/2 z-30 -translate-x-1/2',
        'flex items-center gap-3 rounded-full bg-primary-600 px-5 py-3',
        'text-white shadow-lg shadow-primary-600/30',
        'transition-all active:scale-95',
        'hover:bg-primary-700 hover:shadow-xl',
        'pb-safe'
      )}
      aria-label={`Sepeti görüntüle, ${itemCount} ürün, ${formatCartPrice(total, currency)}`}
    >
      {/* Cart Icon with Badge */}
      <div className="relative">
        <svg
          className="h-6 w-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
          />
        </svg>

        {/* Badge */}
        <span
          className={cn(
            'absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center',
            'rounded-full bg-white text-xs font-bold text-primary-600'
          )}
        >
          {itemCount > 99 ? '99+' : itemCount}
        </span>
      </div>

      {/* Separator */}
      <div className="h-6 w-px bg-white/30" aria-hidden="true" />

      {/* Total Price */}
      <span className="text-base font-semibold">
        {formatCartPrice(total, currency)}
      </span>
    </button>
  )
}

export default CartDrawer
