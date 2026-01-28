'use client'

/**
 * MenuView Component
 *
 * Mobile-optimized public menu display for customers scanning QR codes.
 * Designed following MOBILE-FIRST-TALIMATNAME-v3.md guidelines:
 *
 * - Touch targets: 44×44px minimum (48px comfortable)
 * - Thumb zone optimization: Primary actions in lower 1/3
 * - Skeleton loading for perceived performance
 * - Smooth scrolling with category sticky headers
 * - Accessibility: WCAG 2.1 AA compliant
 * - Cart integration with floating action button
 *
 * @example
 * ```tsx
 * <MenuView
 *   organization={organization}
 *   categories={categories}
 *   products={products}
 * />
 * ```
 */

import { useState, useRef, useCallback, useEffect } from 'react'
import type { Organization, Category, Product } from '@/types/database'
import {
  useCartStore,
  useCartForOrg,
  useIsCartOpen,
  formatCartPrice,
} from '@/lib/stores/cart-store'
import { CartDrawer, CartFAB } from './cart-drawer'
import { CheckoutForm } from './checkout-form'

// =============================================================================
// TYPES
// =============================================================================

interface MenuViewProps {
  /** Restaurant/organization data */
  organization: Organization
  /** Menu categories sorted by sort_order */
  categories: Category[]
  /** Products grouped by category */
  products: Product[]
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Format price for display in Turkish locale
 * Uses formatCartPrice from cart-store for consistency
 */
function formatPrice(price: number, currency: string = 'TRY'): string {
  return formatCartPrice(price, currency)
}

/**
 * Get first image URL from product image_urls
 */
function getImageUrl(imageUrls: unknown): string | null {
  if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
    return null
  }

  const firstImage = imageUrls[0]
  if (typeof firstImage === 'string') {
    return firstImage
  }
  if (typeof firstImage === 'object' && firstImage !== null) {
    return (firstImage as { thumbnail?: string; original?: string }).thumbnail ||
      (firstImage as { thumbnail?: string; original?: string }).original ||
      null
  }
  return null
}

/**
 * Get allergen display names in Turkish
 */
const ALLERGEN_LABELS: Record<string, string> = {
  gluten: 'Gluten',
  dairy: 'Süt',
  eggs: 'Yumurta',
  nuts: 'Kuruyemiş',
  peanuts: 'Fıstık',
  soy: 'Soya',
  fish: 'Balık',
  shellfish: 'Kabuklu Deniz',
  sesame: 'Susam',
  mustard: 'Hardal',
  celery: 'Kereviz',
  lupin: 'Acı Bakla',
  molluscs: 'Yumuşakça',
  sulphites: 'Sülfit',
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

/**
 * Restaurant Header with cover image and branding
 */
function RestaurantHeader({ organization }: { organization: Organization }) {
  return (
    <header className="relative">
      {/* Cover Image */}
      <div className="relative h-40 overflow-hidden bg-gradient-to-br from-primary-600 to-primary-800 sm:h-48">
        {organization.cover_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={organization.cover_url}
            alt=""
            className="h-full w-full object-cover opacity-80"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
      </div>

      {/* Restaurant Info */}
      <div className="relative -mt-12 px-4 pb-4">
        <div className="flex items-end gap-4">
          {/* Logo */}
          <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border-4 border-background bg-card shadow-lg sm:h-24 sm:w-24">
            {organization.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={organization.logo_url}
                alt={organization.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-2xl font-bold text-primary-600 sm:text-3xl">
                {organization.name.charAt(0)}
              </span>
            )}
          </div>

          {/* Name and Description */}
          <div className="min-w-0 flex-1 pb-1">
            <h1 className="truncate text-xl font-bold text-foreground sm:text-2xl">
              {organization.name}
            </h1>
            {organization.description && (
              <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
                {organization.description}
              </p>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

/**
 * Horizontal scrollable category navigation
 */
function CategoryNav({
  categories,
  activeCategory,
  onCategoryClick,
}: {
  categories: Category[]
  activeCategory: string | null
  onCategoryClick: (categoryId: string) => void
}) {
  const scrollRef = useRef<HTMLDivElement>(null)

  // Scroll active category into view
  useEffect(() => {
    if (activeCategory && scrollRef.current) {
      const activeButton = scrollRef.current.querySelector(
        `[data-category-id="${activeCategory}"]`
      )
      if (activeButton) {
        activeButton.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'center',
        })
      }
    }
  }, [activeCategory])

  return (
    <nav
      className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80"
      aria-label="Menü kategorileri"
    >
      <div
        ref={scrollRef}
        className="scrollbar-hide flex gap-1 overflow-x-auto px-4 py-2"
      >
        {categories.map((category) => (
          <button
            key={category.id}
            data-category-id={category.id}
            onClick={() => onCategoryClick(category.id)}
            className={`touch-target-comfortable flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              activeCategory === category.id
                ? 'bg-primary-600 text-white'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
            aria-current={activeCategory === category.id ? 'true' : undefined}
          >
            {category.icon && <span aria-hidden="true">{category.icon}</span>}
            {category.name}
          </button>
        ))}
      </div>
    </nav>
  )
}

/**
 * Product card with mobile-optimized layout and add to cart button
 */
function ProductCard({
  product,
  onSelect,
  onAddToCart,
  quantityInCart = 0,
}: {
  product: Product
  onSelect?: (product: Product) => void
  onAddToCart?: (product: Product) => void
  quantityInCart?: number
}) {
  const imageUrl = getImageUrl(product.image_urls)
  const hasDiscount = product.compare_at_price && product.compare_at_price > product.price
  const isInCart = quantityInCart > 0

  // Handle add to cart click (prevent propagation to parent)
  const handleAddToCart = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      if (product.is_available && onAddToCart) {
        onAddToCart(product)
      }
    },
    [product, onAddToCart]
  )

  return (
    <div
      onClick={() => onSelect?.(product)}
      className={`touch-manipulation group relative flex w-full gap-3 rounded-xl border border-border bg-card p-3 text-left transition-colors hover:bg-accent/50 ${
        !product.is_available ? 'opacity-60' : 'cursor-pointer'
      }`}
      role="button"
      tabIndex={0}
      aria-label={`${product.name}, ${formatPrice(product.price, product.currency)}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect?.(product)
        }
      }}
    >
      {/* Product Image */}
      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-muted sm:h-24 sm:w-24">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <svg
              className="h-8 w-8 text-muted-foreground/40"
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

        {/* Unavailable overlay */}
        {!product.is_available && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80">
            <span className="rounded-full bg-destructive px-2 py-0.5 text-xs font-medium text-destructive-foreground">
              Tükendi
            </span>
          </div>
        )}

        {/* In cart indicator */}
        {isInCart && (
          <div className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary-600 text-xs font-bold text-white">
            {quantityInCart}
          </div>
        )}
      </div>

      {/* Product Info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-medium leading-tight text-foreground">
            {product.name}
          </h3>
          <div className="shrink-0 text-right">
            <span className="font-semibold text-foreground">
              {formatPrice(product.price, product.currency)}
            </span>
            {hasDiscount && (
              <span className="ml-1.5 text-sm text-muted-foreground line-through">
                {formatPrice(product.compare_at_price!, product.currency)}
              </span>
            )}
          </div>
        </div>

        {/* Description */}
        {product.short_description && (
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
            {product.short_description}
          </p>
        )}

        {/* Badges and Add Button Row */}
        <div className="mt-2 flex items-center justify-between gap-2">
          {/* Badges */}
          <div className="flex flex-wrap gap-1">
            {product.is_vegetarian && (
              <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-400">
                <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-4h2v2h-2zm0-10h2v8h-2z"/>
                </svg>
                Vejetaryen
              </span>
            )}
            {product.is_vegan && (
              <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-400">
                Vegan
              </span>
            )}
            {product.is_gluten_free && (
              <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                Glutensiz
              </span>
            )}
            {product.is_spicy && (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800 dark:bg-red-900/30 dark:text-red-400">
                {'🌶️'.repeat(Math.min(product.spicy_level || 1, 3))}
              </span>
            )}
          </div>

          {/* Add to Cart Button */}
          {product.is_available && onAddToCart && (
            <button
              onClick={handleAddToCart}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-600 text-white shadow-sm transition-all hover:bg-primary-700 active:scale-95"
              aria-label={`${product.name} sepete ekle`}
            >
              <svg
                className="h-4 w-4"
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
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * Category section with products
 */
function CategorySection({
  category,
  products,
  onProductSelect,
  onAddToCart,
  getProductQuantity,
}: {
  category: Category
  products: Product[]
  onProductSelect?: (product: Product) => void
  onAddToCart?: (product: Product) => void
  getProductQuantity?: (productId: string) => number
}) {
  if (products.length === 0) return null

  return (
    <section
      id={`category-${category.id}`}
      className="scroll-mt-[52px]"
      aria-labelledby={`category-title-${category.id}`}
    >
      {/* Category Header - sticks below the category nav */}
      <div className="sticky top-[44px] z-20 -mx-4 border-b border-border/50 bg-background/95 px-4 py-3 shadow-sm backdrop-blur transition-shadow supports-[backdrop-filter]:bg-background/80">
        <h2
          id={`category-title-${category.id}`}
          className="text-lg font-semibold text-foreground"
        >
          {category.icon && (
            <span className="mr-2" aria-hidden="true">{category.icon}</span>
          )}
          {category.name}
        </h2>
        {category.description && (
          <p className="mt-0.5 text-sm text-muted-foreground">
            {category.description}
          </p>
        )}
      </div>

      {/* Products List */}
      <div className="space-y-3 pb-6">
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            onSelect={onProductSelect}
            onAddToCart={onAddToCart}
            quantityInCart={getProductQuantity?.(product.id) ?? 0}
          />
        ))}
      </div>
    </section>
  )
}

/**
 * Empty state when no products available
 */
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
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
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
          />
        </svg>
      </div>
      <h2 className="mt-4 text-lg font-semibold text-foreground">
        Menü hazırlanıyor
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Bu restoran henüz menüsünü yayınlamamış.
        <br />
        Lütfen daha sonra tekrar deneyin.
      </p>
    </div>
  )
}

/**
 * Loading skeleton for menu
 */
function MenuSkeleton() {
  return (
    <div className="animate-pulse space-y-6 px-4 py-6">
      {/* Category nav skeleton */}
      <div className="flex gap-2 overflow-hidden">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-10 w-24 shrink-0 rounded-full bg-muted" />
        ))}
      </div>

      {/* Products skeleton */}
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex gap-3 rounded-xl border border-border p-3">
          <div className="h-20 w-20 shrink-0 rounded-lg bg-muted" />
          <div className="flex-1 space-y-2">
            <div className="h-5 w-3/4 rounded bg-muted" />
            <div className="h-4 w-1/2 rounded bg-muted" />
            <div className="h-3 w-1/4 rounded bg-muted" />
          </div>
        </div>
      ))}
    </div>
  )
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function MenuView({ organization, categories, products }: MenuViewProps) {
  const [activeCategory, setActiveCategory] = useState<string | null>(
    categories.length > 0 ? categories[0].id : null
  )
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)
  const observerRef = useRef<IntersectionObserver | null>(null)

  // Cart state and actions
  const setContext = useCartStore((state) => state.setContext)
  const addItem = useCartStore((state) => state.addItem)
  const toggleCart = useCartStore((state) => state.toggleCart)
  const setCartOpen = useCartStore((state) => state.setCartOpen)
  const isCartOpen = useIsCartOpen()
  const { hasItems, itemCount, total } = useCartForOrg(organization.id)

  // Get product quantity in cart
  const getProductQuantity = useCallback(
    (productId: string) => {
      const items = useCartStore.getState().items
      return items
        .filter((item) => item.product_id === productId)
        .reduce((sum, item) => sum + item.quantity, 0)
    },
    []
  )

  // Set cart context when organization loads
  useEffect(() => {
    setContext({
      organization_id: organization.id,
      organization_slug: organization.slug,
      organization_name: organization.name,
      table_id: null,
      table_name: null,
      currency: organization.currency || 'TRY',
    })
  }, [organization, setContext])

  // Group products by category
  const productsByCategory = categories.reduce((acc, category) => {
    acc[category.id] = products.filter(
      (p) => p.category_id === category.id && p.is_available !== false && p.deleted_at === null
    )
    return acc
  }, {} as Record<string, Product[]>)

  // Setup intersection observer for active category detection
  useEffect(() => {
    const sections = document.querySelectorAll('[id^="category-"]')

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const categoryId = entry.target.id.replace('category-', '')
            setActiveCategory(categoryId)
          }
        })
      },
      {
        rootMargin: '-20% 0px -70% 0px',
        threshold: 0,
      }
    )

    sections.forEach((section) => {
      observerRef.current?.observe(section)
    })

    return () => {
      observerRef.current?.disconnect()
    }
  }, [categories])

  // Handle category click - scroll to section
  const handleCategoryClick = useCallback((categoryId: string) => {
    const section = document.getElementById(`category-${categoryId}`)
    if (section) {
      section.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [])

  // Handle product selection - for future product detail modal
  const handleProductSelect = useCallback((product: Product) => {
    // TODO: Open product detail modal with modifiers
    // For now, products are added via the + button
  }, [])

  // Handle add to cart
  const handleAddToCart = useCallback(
    (product: Product) => {
      const imageUrl = getImageUrl(product.image_urls)

      addItem({
        product_id: product.id,
        product_name: product.name,
        product_description: product.short_description || null,
        image_url: typeof imageUrl === 'string' ? imageUrl : null,
        price: product.price,
        price_ledger_id: null, // TODO: Fetch from price_ledger when available
        currency: product.currency || organization.currency || 'TRY',
        quantity: 1,
        modifiers: [],
        special_instructions: null,
      })
    },
    [addItem, organization.currency]
  )

  // Handle close cart
  const handleCloseCart = useCallback(() => {
    setCartOpen(false)
  }, [setCartOpen])

  // Handle checkout - open checkout form
  const handleCheckout = useCallback(() => {
    setCartOpen(false) // Close the cart drawer
    setIsCheckoutOpen(true) // Open the checkout form
  }, [setCartOpen])

  // Handle checkout form close
  const handleCloseCheckout = useCallback(() => {
    setIsCheckoutOpen(false)
  }, [])

  // Check if menu is empty
  const hasProducts = products.some(
    (p) => p.is_available !== false && p.deleted_at === null
  )

  if (!hasProducts) {
    return (
      <>
        <RestaurantHeader organization={organization} />
        <EmptyState />
      </>
    )
  }

  return (
    <>
      {/* Restaurant Header */}
      <RestaurantHeader organization={organization} />

      {/* Category Navigation */}
      <CategoryNav
        categories={categories.filter((c) => productsByCategory[c.id]?.length > 0)}
        activeCategory={activeCategory}
        onCategoryClick={handleCategoryClick}
      />

      {/* Menu Content */}
      <div className="px-4 py-4 pb-24">
        {categories.map((category) => (
          <CategorySection
            key={category.id}
            category={category}
            products={productsByCategory[category.id] || []}
            onProductSelect={handleProductSelect}
            onAddToCart={handleAddToCart}
            getProductQuantity={getProductQuantity}
          />
        ))}
      </div>

      {/* Footer - add extra padding when cart FAB is visible */}
      <footer className={`border-t border-border px-4 py-6 text-center ${hasItems ? 'pb-24' : ''}`}>
        <p className="text-xs text-muted-foreground">
          Powered by{' '}
          <a
            href="https://e-menum.com"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-primary-600 hover:underline"
          >
            E-Menum
          </a>
        </p>
      </footer>

      {/* Cart FAB - Floating Action Button */}
      <CartFAB
        itemCount={itemCount}
        total={total}
        currency={organization.currency || 'TRY'}
        onClick={toggleCart}
        isCartOpen={isCartOpen}
      />

      {/* Cart Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={handleCloseCart}
        onCheckout={handleCheckout}
      />

      {/* Checkout Form */}
      <CheckoutForm
        isOpen={isCheckoutOpen}
        onClose={handleCloseCheckout}
        restaurantSlug={organization.slug}
      />
    </>
  )
}

// Export loading skeleton for Suspense
export { MenuSkeleton }
