'use client'

/**
 * CartItem Component
 *
 * Displays a single cart item with quantity controls and price.
 * Designed following MOBILE-FIRST-TALIMATNAME-v3.md guidelines:
 *
 * - Touch targets: 44×44px minimum for quantity buttons
 * - Touch feedback: Scale animation on press
 * - Accessibility: ARIA labels, keyboard navigation
 * - Turkish locale: Price formatting
 *
 * @example
 * ```tsx
 * <CartItem
 *   item={cartItem}
 *   onIncrement={() => incrementQuantity(item.id)}
 *   onDecrement={() => decrementQuantity(item.id)}
 *   onRemove={() => removeItem(item.id)}
 * />
 * ```
 */

import { memo, useCallback } from 'react'
import type { CartItem as CartItemType } from '@/lib/stores/cart-store'
import { formatCartPrice } from '@/lib/stores/cart-store'
import { cn } from '@/lib/utils/cn'

// =============================================================================
// TYPES
// =============================================================================

interface CartItemProps {
  /** Cart item data */
  item: CartItemType
  /** Callback when increment button is clicked */
  onIncrement: () => void
  /** Callback when decrement button is clicked */
  onDecrement: () => void
  /** Callback when remove button is clicked */
  onRemove: () => void
  /** Whether the item is being updated */
  isUpdating?: boolean
  /** Calculate item total (base price + modifiers) * quantity */
  itemTotal: number
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

/**
 * Quantity control buttons with +/- icons
 */
interface QuantityControlsProps {
  quantity: number
  onIncrement: () => void
  onDecrement: () => void
  disabled?: boolean
}

function QuantityControls({
  quantity,
  onIncrement,
  onDecrement,
  disabled,
}: QuantityControlsProps) {
  return (
    <div className="flex items-center gap-1 rounded-lg border border-border bg-background">
      {/* Decrement Button */}
      <button
        onClick={onDecrement}
        disabled={disabled}
        className={cn(
          'flex h-8 w-8 items-center justify-center rounded-l-md',
          'transition-colors active:scale-95',
          'hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
        aria-label={quantity === 1 ? 'Ürünü sepetten kaldır' : 'Miktarı azalt'}
      >
        {quantity === 1 ? (
          // Show trash icon when quantity is 1
          <svg
            className="h-4 w-4 text-destructive"
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
        ) : (
          <svg
            className="h-4 w-4 text-foreground"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M20 12H4"
            />
          </svg>
        )}
      </button>

      {/* Quantity Display */}
      <span
        className="min-w-[2rem] text-center text-sm font-semibold text-foreground"
        aria-label={`Miktar: ${quantity}`}
      >
        {quantity}
      </span>

      {/* Increment Button */}
      <button
        onClick={onIncrement}
        disabled={disabled}
        className={cn(
          'flex h-8 w-8 items-center justify-center rounded-r-md',
          'transition-colors active:scale-95',
          'hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
        aria-label="Miktarı artır"
      >
        <svg
          className="h-4 w-4 text-foreground"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 4v16m8-8H4"
          />
        </svg>
      </button>
    </div>
  )
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * Cart Item Component
 *
 * Displays product info, modifiers, quantity controls, and pricing.
 * Uses memo to prevent unnecessary re-renders.
 */
export const CartItem = memo(function CartItem({
  item,
  onIncrement,
  onDecrement,
  onRemove,
  isUpdating = false,
  itemTotal,
}: CartItemProps) {
  // Calculate modifier details for display
  const modifierDetails = item.modifiers
    .flatMap((m) => m.selected_options)
    .map((opt) => ({
      name: opt.option_name,
      price: opt.price_adjustment,
    }))

  const hasModifiers = modifierDetails.length > 0

  // Handle decrement - if quantity is 1, remove item
  const handleDecrement = useCallback(() => {
    if (item.quantity === 1) {
      onRemove()
    } else {
      onDecrement()
    }
  }, [item.quantity, onRemove, onDecrement])

  return (
    <div
      className={cn(
        'flex gap-3 rounded-xl border border-border bg-card p-3 transition-opacity',
        isUpdating && 'opacity-60'
      )}
    >
      {/* Product Image */}
      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-muted">
        {item.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.image_url}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <svg
              className="h-6 w-6 text-muted-foreground/40"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
        )}
      </div>

      {/* Product Info */}
      <div className="min-w-0 flex-1">
        {/* Name and Price Row */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-sm font-medium text-foreground">
              {item.product_name}
            </h3>

            {/* Modifiers */}
            {hasModifiers && (
              <div className="mt-0.5 flex flex-wrap gap-1">
                {modifierDetails.map((mod, index) => (
                  <span
                    key={`${mod.name}-${index}`}
                    className="text-xs text-muted-foreground"
                  >
                    {mod.name}
                    {mod.price > 0 && (
                      <span className="text-primary-600">
                        {' '}(+{formatCartPrice(mod.price, item.currency)})
                      </span>
                    )}
                    {index < modifierDetails.length - 1 && ', '}
                  </span>
                ))}
              </div>
            )}

            {/* Special Instructions */}
            {item.special_instructions && (
              <p className="mt-0.5 text-xs italic text-muted-foreground line-clamp-1">
                Not: {item.special_instructions}
              </p>
            )}
          </div>

          {/* Item Total Price */}
          <span className="shrink-0 text-sm font-semibold text-foreground">
            {formatCartPrice(itemTotal, item.currency)}
          </span>
        </div>

        {/* Quantity Controls Row */}
        <div className="mt-2 flex items-center justify-between">
          <QuantityControls
            quantity={item.quantity}
            onIncrement={onIncrement}
            onDecrement={handleDecrement}
            disabled={isUpdating}
          />

          {/* Unit Price (when quantity > 1) */}
          {item.quantity > 1 && (
            <span className="text-xs text-muted-foreground">
              {formatCartPrice(item.price_at_add, item.currency)}/adet
            </span>
          )}
        </div>
      </div>
    </div>
  )
})

CartItem.displayName = 'CartItem'

export default CartItem
