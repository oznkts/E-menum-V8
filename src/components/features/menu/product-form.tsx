'use client'

/**
 * ProductForm Component
 *
 * A form for creating and editing products in the menu management system.
 * Supports all product fields including dietary info, allergens, and images.
 *
 * Features:
 * - React Hook Form with Zod validation
 * - Turkish UI and error messages
 * - Support for create and edit modes
 * - Image URL management
 * - Dietary and allergen toggles
 * - Price input with currency formatting
 *
 * @example
 * ```tsx
 * // Create mode
 * <ProductForm
 *   organizationId={orgId}
 *   categories={categories}
 *   onSuccess={() => router.refresh()}
 * />
 *
 * // Edit mode
 * <ProductForm
 *   organizationId={orgId}
 *   categories={categories}
 *   product={existingProduct}
 *   onSuccess={() => router.refresh()}
 * />
 * ```
 */

import { useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { productSchema, type ProductInput } from '@/lib/validations/menu'
import { createProductDirect, updateProductDirect, type MenuActionResponse } from '@/lib/actions/menu'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/lib/hooks/use-toast'
import { ImageUpload, type ProductImage } from '@/components/features/menu/image-upload'
import type { Category, Product, AllergenType } from '@/types/database'

// =============================================================================
// TYPES
// =============================================================================

interface ProductFormProps {
  /** Organization ID for creating the product */
  organizationId: string
  /** Available categories for the product */
  categories: Category[]
  /** Existing product for edit mode */
  product?: Product | null
  /** Callback when form submission succeeds */
  onSuccess?: () => void
  /** Callback to cancel/close the form */
  onCancel?: () => void
}

/**
 * Available allergen types (matches database enum)
 */
const ALLERGEN_OPTIONS: { value: AllergenType; label: string }[] = [
  { value: 'gluten', label: 'Gluten' },
  { value: 'dairy', label: 'Süt Ürünleri' },
  { value: 'eggs', label: 'Yumurta' },
  { value: 'fish', label: 'Balık' },
  { value: 'shellfish', label: 'Kabuklu Deniz Ürünleri' },
  { value: 'nuts', label: 'Kabuklu Yemişler' },
  { value: 'peanuts', label: 'Yer Fıstığı' },
  { value: 'soy', label: 'Soya' },
  { value: 'sesame', label: 'Susam' },
  { value: 'sulphites', label: 'Sülfitler' },
  { value: 'mustard', label: 'Hardal' },
  { value: 'celery', label: 'Kereviz' },
  { value: 'lupin', label: 'Acı Bakla' },
  { value: 'molluscs', label: 'Yumuşakçalar' },
]

// =============================================================================
// COMPONENT
// =============================================================================

export function ProductForm({
  organizationId,
  categories,
  product,
  onSuccess,
  onCancel,
}: ProductFormProps) {
  const { toast } = useToast()
  const [isPending, startTransition] = useTransition()
  const [images, setImages] = useState<ProductImage[]>(
    (product?.image_urls as ProductImage[] | null)?.map((img) => ({
      original: typeof img === 'string' ? img : img.original || img.thumbnail || '',
      thumbnail: typeof img === 'string' ? img : img.thumbnail || img.original || '',
      path: typeof img === 'object' ? img.path : undefined,
      name: typeof img === 'object' ? img.name : undefined,
    })).filter((img) => img.original) || []
  )
  const [selectedAllergens, setSelectedAllergens] = useState<AllergenType[]>(
    (product?.allergens as AllergenType[]) || []
  )

  const isEditMode = !!product

  // ==========================================================================
  // FORM SETUP
  // ==========================================================================

  const form = useForm<ProductInput>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: product?.name || '',
      slug: product?.slug || '',
      description: product?.description || '',
      short_description: product?.short_description || '',
      price: product?.price || 0,
      compare_at_price: product?.compare_at_price || undefined,
      currency: product?.currency || 'TRY',
      status: product?.status || 'active',
      is_available: product?.is_available ?? true,
      category_id: product?.category_id || undefined,
      preparation_time_minutes: product?.preparation_time_minutes || undefined,
      is_vegetarian: product?.is_vegetarian ?? false,
      is_vegan: product?.is_vegan ?? false,
      is_gluten_free: product?.is_gluten_free ?? false,
      is_spicy: product?.is_spicy ?? false,
      spicy_level: product?.spicy_level || undefined,
      is_featured: product?.is_featured ?? false,
      sort_order: product?.sort_order || 0,
    },
  })

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    reset,
  } = form

  const watchIsSpicy = watch('is_spicy')

  // ==========================================================================
  // HANDLERS
  // ==========================================================================

  const onSubmit = (data: ProductInput) => {
    startTransition(async () => {
      try {
        // Add images and allergens to the data
        const submitData: ProductInput = {
          ...data,
          image_urls: images.length > 0 ? images : undefined,
          allergens: selectedAllergens.length > 0 ? selectedAllergens : undefined,
        }

        let response: MenuActionResponse

        if (isEditMode && product) {
          response = await updateProductDirect(product.id, submitData)
        } else {
          response = await createProductDirect(organizationId, submitData)
        }

        if (response.success) {
          toast({
            title: 'Başarılı',
            description: response.message,
          })
          if (!isEditMode) {
            reset()
            setImages([])
            setSelectedAllergens([])
          }
          onSuccess?.()
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
          description: 'Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.',
          variant: 'destructive',
        })
      }
    })
  }

  const handleImagesChange = (newImages: ProductImage[]) => {
    setImages(newImages)
  }

  const toggleAllergen = (allergen: AllergenType) => {
    if (selectedAllergens.includes(allergen)) {
      setSelectedAllergens(selectedAllergens.filter((a) => a !== allergen))
    } else {
      setSelectedAllergens([...selectedAllergens, allergen])
    }
  }

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Basic Information */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-foreground">Temel Bilgiler</h3>

        {/* Name */}
        <div className="space-y-2">
          <label htmlFor="name" className="text-sm font-medium">
            Ürün Adı <span className="text-destructive">*</span>
          </label>
          <Input
            id="name"
            {...register('name')}
            placeholder="Örn: Adana Kebap"
            aria-invalid={!!errors.name}
          />
          {errors.name && (
            <p className="text-sm text-destructive">{errors.name.message}</p>
          )}
        </div>

        {/* Slug */}
        <div className="space-y-2">
          <label htmlFor="slug" className="text-sm font-medium">
            URL Slug
          </label>
          <Input
            id="slug"
            {...register('slug')}
            placeholder="otomatik-olusturulur"
          />
          <p className="text-xs text-muted-foreground">
            Boş bırakılırsa ürün adından otomatik oluşturulur
          </p>
          {errors.slug && (
            <p className="text-sm text-destructive">{errors.slug.message}</p>
          )}
        </div>

        {/* Description */}
        <div className="space-y-2">
          <label htmlFor="description" className="text-sm font-medium">
            Açıklama
          </label>
          <textarea
            id="description"
            {...register('description')}
            placeholder="Ürün açıklaması..."
            className="flex min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          />
          {errors.description && (
            <p className="text-sm text-destructive">{errors.description.message}</p>
          )}
        </div>

        {/* Short Description */}
        <div className="space-y-2">
          <label htmlFor="short_description" className="text-sm font-medium">
            Kısa Açıklama
          </label>
          <Input
            id="short_description"
            {...register('short_description')}
            placeholder="Menüde görünecek kısa açıklama"
          />
          {errors.short_description && (
            <p className="text-sm text-destructive">{errors.short_description.message}</p>
          )}
        </div>

        {/* Category */}
        <div className="space-y-2">
          <label htmlFor="category_id" className="text-sm font-medium">
            Kategori
          </label>
          <select
            id="category_id"
            {...register('category_id')}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="">Kategorisiz</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          {errors.category_id && (
            <p className="text-sm text-destructive">{errors.category_id.message}</p>
          )}
        </div>
      </div>

      {/* Pricing */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-foreground">Fiyatlandırma</h3>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Price */}
          <div className="space-y-2">
            <label htmlFor="price" className="text-sm font-medium">
              Fiyat <span className="text-destructive">*</span>
            </label>
            <div className="relative">
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0"
                {...register('price', { valueAsNumber: true })}
                placeholder="0.00"
                className="pr-12"
                aria-invalid={!!errors.price}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                TRY
              </span>
            </div>
            {errors.price && (
              <p className="text-sm text-destructive">{errors.price.message}</p>
            )}
          </div>

          {/* Compare At Price */}
          <div className="space-y-2">
            <label htmlFor="compare_at_price" className="text-sm font-medium">
              Karşılaştırma Fiyatı
            </label>
            <div className="relative">
              <Input
                id="compare_at_price"
                type="number"
                step="0.01"
                min="0"
                {...register('compare_at_price', { valueAsNumber: true })}
                placeholder="0.00"
                className="pr-12"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                TRY
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              İndirimli fiyat göstermek için eski fiyat
            </p>
            {errors.compare_at_price && (
              <p className="text-sm text-destructive">{errors.compare_at_price.message}</p>
            )}
          </div>
        </div>

        {/* Preparation Time */}
        <div className="space-y-2">
          <label htmlFor="preparation_time_minutes" className="text-sm font-medium">
            Hazırlık Süresi (dakika)
          </label>
          <Input
            id="preparation_time_minutes"
            type="number"
            min="0"
            {...register('preparation_time_minutes', { valueAsNumber: true })}
            placeholder="15"
          />
          {errors.preparation_time_minutes && (
            <p className="text-sm text-destructive">{errors.preparation_time_minutes.message}</p>
          )}
        </div>
      </div>

      {/* Status & Availability */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-foreground">Durum ve Görünürlük</h3>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Status */}
          <div className="space-y-2">
            <label htmlFor="status" className="text-sm font-medium">
              Durum
            </label>
            <select
              id="status"
              {...register('status')}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="active">Aktif</option>
              <option value="out_of_stock">Stok Yok</option>
              <option value="hidden">Gizli</option>
              <option value="seasonal">Mevsimlik</option>
            </select>
          </div>

          {/* Sort Order */}
          <div className="space-y-2">
            <label htmlFor="sort_order" className="text-sm font-medium">
              Sıralama
            </label>
            <Input
              id="sort_order"
              type="number"
              min="0"
              {...register('sort_order', { valueAsNumber: true })}
              placeholder="0"
            />
          </div>
        </div>

        {/* Toggles */}
        <div className="flex flex-wrap gap-4">
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              {...register('is_available')}
              className="h-4 w-4 rounded border-input"
            />
            <span className="text-sm">Satışta</span>
          </label>
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              {...register('is_featured')}
              className="h-4 w-4 rounded border-input"
            />
            <span className="text-sm">Öne Çıkan</span>
          </label>
        </div>
      </div>

      {/* Dietary Information */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-foreground">Beslenme Bilgileri</h3>

        <div className="flex flex-wrap gap-4">
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              {...register('is_vegetarian')}
              className="h-4 w-4 rounded border-input"
            />
            <span className="text-sm">Vejetaryen</span>
          </label>
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              {...register('is_vegan')}
              className="h-4 w-4 rounded border-input"
            />
            <span className="text-sm">Vegan</span>
          </label>
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              {...register('is_gluten_free')}
              className="h-4 w-4 rounded border-input"
            />
            <span className="text-sm">Glutensiz</span>
          </label>
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              {...register('is_spicy')}
              className="h-4 w-4 rounded border-input"
            />
            <span className="text-sm">Acılı</span>
          </label>
        </div>

        {/* Spicy Level */}
        {watchIsSpicy && (
          <div className="space-y-2">
            <label htmlFor="spicy_level" className="text-sm font-medium">
              Acılık Seviyesi (1-5)
            </label>
            <Input
              id="spicy_level"
              type="number"
              min="1"
              max="5"
              {...register('spicy_level', { valueAsNumber: true })}
              placeholder="1-5 arası bir değer"
            />
          </div>
        )}
      </div>

      {/* Allergens */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-foreground">Alerjenler</h3>
        <div className="flex flex-wrap gap-2">
          {ALLERGEN_OPTIONS.map((allergen) => (
            <button
              key={allergen.value}
              type="button"
              onClick={() => toggleAllergen(allergen.value)}
              className={`rounded-full px-3 py-1 text-sm transition-colors ${
                selectedAllergens.includes(allergen.value)
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {allergen.label}
            </button>
          ))}
        </div>
        {selectedAllergens.length > 0 && (
          <p className="text-xs text-muted-foreground">
            Seçili alerjenler: {selectedAllergens.length}
          </p>
        )}
      </div>

      {/* Images */}
      <ImageUpload
        organizationId={organizationId}
        productId={product?.id}
        images={images}
        onChange={handleImagesChange}
        maxImages={5}
        disabled={isPending}
      />

      {/* Form Actions */}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isPending}
          >
            İptal
          </Button>
        )}
        <Button type="submit" disabled={isPending}>
          {isPending ? (
            <>
              <svg
                className="mr-2 h-4 w-4 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
              >
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
              Kaydediliyor...
            </>
          ) : isEditMode ? (
            'Güncelle'
          ) : (
            'Oluştur'
          )}
        </Button>
      </div>
    </form>
  )
}
