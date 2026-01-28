'use client'

/**
 * ProductCard Component
 *
 * A card component for displaying product information in the dashboard.
 * Supports edit, delete, toggle availability, and duplicate actions.
 *
 * Features:
 * - Product image display with fallback
 * - Price display with compare_at_price support
 * - Dietary badges (vegetarian, vegan, gluten-free, spicy)
 * - Availability toggle
 * - Action dropdown menu
 * - Mobile-first responsive design
 *
 * @example
 * ```tsx
 * <ProductCard
 *   product={product}
 *   onEdit={() => openEditModal(product)}
 *   onDelete={() => handleDelete(product.id)}
 *   onToggleAvailability={(available) => toggleAvailability(product.id, available)}
 * />
 * ```
 */

import { useState, useTransition } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useToast } from '@/lib/hooks/use-toast'
import { deleteProduct, toggleProductAvailability, duplicateProduct } from '@/lib/actions/menu'
import type { Product, Category } from '@/types/database'

// =============================================================================
// TYPES
// =============================================================================

interface ProductCardProps {
  /** Product data to display */
  product: Product & { category?: Category | null }
  /** Callback when edit is clicked */
  onEdit?: () => void
  /** Callback after successful delete */
  onDelete?: () => void
  /** Callback after successful duplicate */
  onDuplicate?: () => void
  /** Callback after availability toggle */
  onAvailabilityChange?: () => void
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Format price for display in Turkish locale
 */
function formatPrice(price: number, currency: string = 'TRY'): string {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(price)
}

/**
 * Get image URL from product image_urls
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

// =============================================================================
// COMPONENT
// =============================================================================

export function ProductCard({
  product,
  onEdit,
  onDelete,
  onDuplicate,
  onAvailabilityChange,
}: ProductCardProps) {
  const { toast } = useToast()
  const [isPending, startTransition] = useTransition()
  const [showDropdown, setShowDropdown] = useState(false)

  const imageUrl = getImageUrl(product.image_urls)
  const hasDiscount = product.compare_at_price && product.compare_at_price > product.price

  // ==========================================================================
  // HANDLERS
  // ==========================================================================

  const handleDelete = () => {
    if (!confirm('Bu ürünü silmek istediğinizden emin misiniz?')) {
      return
    }

    startTransition(async () => {
      try {
        const response = await deleteProduct(product.id)
        if (response.success) {
          toast({
            title: 'Başarılı',
            description: response.message,
          })
          onDelete?.()
        } else {
          toast({
            title: 'Hata',
            description: response.message,
            variant: 'destructive',
          })
        }
      } catch {
        toast({
          title: 'Hata',
          description: 'Ürün silinirken bir hata oluştu.',
          variant: 'destructive',
        })
      }
    })
    setShowDropdown(false)
  }

  const handleToggleAvailability = () => {
    startTransition(async () => {
      try {
        const response = await toggleProductAvailability({
          id: product.id,
          is_available: !product.is_available,
        })
        if (response.success) {
          toast({
            title: 'Başarılı',
            description: response.message,
          })
          onAvailabilityChange?.()
        } else {
          toast({
            title: 'Hata',
            description: response.message,
            variant: 'destructive',
          })
        }
      } catch {
        toast({
          title: 'Hata',
          description: 'Durum güncellenirken bir hata oluştu.',
          variant: 'destructive',
        })
      }
    })
  }

  const handleDuplicate = () => {
    startTransition(async () => {
      try {
        const response = await duplicateProduct(product.id)
        if (response.success) {
          toast({
            title: 'Başarılı',
            description: response.message,
          })
          onDuplicate?.()
        } else {
          toast({
            title: 'Hata',
            description: response.message,
            variant: 'destructive',
          })
        }
      } catch {
        toast({
          title: 'Hata',
          description: 'Ürün kopyalanırken bir hata oluştu.',
          variant: 'destructive',
        })
      }
    })
    setShowDropdown(false)
  }

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <Card className={`relative overflow-hidden transition-opacity ${!product.is_available ? 'opacity-60' : ''}`}>
      {/* Product Image */}
      <div className="relative aspect-video overflow-hidden bg-muted">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={product.name}
            className="h-full w-full object-cover"
            onError={(e) => {
              ;(e.target as HTMLImageElement).style.display = 'none'
            }}
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <svg
              className="h-12 w-12 text-muted-foreground/50"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
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

        {/* Status Badges */}
        <div className="absolute left-2 top-2 flex flex-wrap gap-1">
          {product.is_featured && (
            <span className="rounded-full bg-yellow-500 px-2 py-0.5 text-xs font-medium text-white">
              Öne Çıkan
            </span>
          )}
          {product.status === 'draft' && (
            <span className="rounded-full bg-gray-500 px-2 py-0.5 text-xs font-medium text-white">
              Taslak
            </span>
          )}
          {product.status === 'out_of_stock' && (
            <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs font-medium text-white">
              Stok Yok
            </span>
          )}
        </div>

        {/* Actions Dropdown */}
        <div className="absolute right-2 top-2">
          <div className="relative">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="rounded-full bg-background/80 p-1.5 hover:bg-background"
              aria-label="Ürün işlemleri"
              disabled={isPending}
            >
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
                />
              </svg>
            </button>

            {showDropdown && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowDropdown(false)}
                />
                <div className="absolute right-0 z-20 mt-1 min-w-[160px] rounded-md border bg-popover py-1 shadow-md">
                  {onEdit && (
                    <button
                      onClick={() => {
                        onEdit()
                        setShowDropdown(false)
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Düzenle
                    </button>
                  )}
                  <button
                    onClick={handleDuplicate}
                    disabled={isPending}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent disabled:opacity-50"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Kopyala
                  </button>
                  <hr className="my-1" />
                  <button
                    onClick={handleDelete}
                    disabled={isPending}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-accent disabled:opacity-50"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Sil
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <CardHeader className="space-y-1 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <CardTitle className="truncate text-base">{product.name}</CardTitle>
            {product.category && (
              <CardDescription className="mt-0.5 truncate text-xs">
                {product.category.name}
              </CardDescription>
            )}
          </div>
          <div className="text-right">
            <div className="font-semibold">{formatPrice(product.price, product.currency)}</div>
            {hasDiscount && (
              <div className="text-xs text-muted-foreground line-through">
                {formatPrice(product.compare_at_price!, product.currency)}
              </div>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 pt-0">
        {/* Dietary Badges */}
        <div className="mb-3 flex flex-wrap gap-1">
          {product.is_vegetarian && (
            <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-800 dark:bg-green-900/30 dark:text-green-400">
              Vejetaryen
            </span>
          )}
          {product.is_vegan && (
            <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-800 dark:bg-green-900/30 dark:text-green-400">
              Vegan
            </span>
          )}
          {product.is_gluten_free && (
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
              Glutensiz
            </span>
          )}
          {product.is_spicy && (
            <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-800 dark:bg-red-900/30 dark:text-red-400">
              Acılı {product.spicy_level ? `(${product.spicy_level}/5)` : ''}
            </span>
          )}
        </div>

        {/* Short Description */}
        {product.short_description && (
          <p className="mb-3 line-clamp-2 text-sm text-muted-foreground">
            {product.short_description}
          </p>
        )}

        {/* Availability Toggle */}
        <Button
          variant={product.is_available ? 'outline' : 'default'}
          size="sm"
          className="w-full"
          onClick={handleToggleAvailability}
          disabled={isPending}
        >
          {isPending ? (
            <>
              <svg className="mr-2 h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              İşleniyor...
            </>
          ) : product.is_available ? (
            <>
              <svg className="mr-2 h-4 w-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Satışta
            </>
          ) : (
            <>
              <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
              Satışa Al
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
