'use client'

/**
 * Category Form Component
 *
 * A form component for creating and editing menu categories.
 * Uses React Hook Form + Zod for validation with Turkish error messages.
 *
 * Features:
 * - Create and edit modes
 * - Name, description, icon, visibility fields
 * - Parent category selection (for nested categories)
 * - Zod validation with Turkish error messages
 * - Mobile-responsive design
 *
 * @example
 * ```tsx
 * <CategoryForm
 *   organizationId={orgId}
 *   category={existingCategory}
 *   onSuccess={() => closeModal()}
 *   onCancel={() => closeModal()}
 * />
 * ```
 */

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  categorySchema,
  type CategoryInput,
  generateSlug,
  MENU_ERROR_MESSAGES,
} from '@/lib/validations/menu'
import {
  createCategoryDirect,
  updateCategoryDirect,
} from '@/lib/actions/menu'
import { useToast } from '@/lib/hooks/use-toast'
import type { Category } from '@/types/database'

// =============================================================================
// TYPES
// =============================================================================

interface CategoryFormProps {
  /** Organization ID for creating new categories */
  organizationId: string
  /** Existing category for edit mode (null for create mode) */
  category?: Category | null
  /** Parent categories for selection dropdown */
  parentCategories?: Category[]
  /** Called when form is successfully submitted */
  onSuccess?: () => void
  /** Called when form is cancelled */
  onCancel?: () => void
}

// =============================================================================
// COMPONENT
// =============================================================================

export function CategoryForm({
  organizationId,
  category,
  parentCategories = [],
  onSuccess,
  onCancel,
}: CategoryFormProps) {
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isEditing = !!category

  // Form setup with Zod validation
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
    reset,
  } = useForm<CategoryInput>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: category?.name ?? '',
      slug: category?.slug ?? '',
      description: category?.description ?? '',
      icon: category?.icon ?? '',
      image_url: category?.image_url ?? '',
      parent_id: category?.parent_id ?? null,
      is_visible: category?.is_visible ?? true,
      sort_order: category?.sort_order ?? 0,
      available_from: category?.available_from ?? '',
      available_until: category?.available_until ?? '',
    },
  })

  // Watch name field to auto-generate slug
  const watchName = watch('name')

  // Auto-generate slug when name changes (only in create mode)
  useEffect(() => {
    if (!isEditing && watchName) {
      const newSlug = generateSlug(watchName)
      setValue('slug', newSlug)
    }
  }, [watchName, isEditing, setValue])

  // Form submission handler
  const onSubmit = async (data: CategoryInput) => {
    setIsSubmitting(true)

    try {
      let result

      if (isEditing && category) {
        // Update existing category
        result = await updateCategoryDirect(category.id, data)
      } else {
        // Create new category
        result = await createCategoryDirect(organizationId, data)
      }

      if (result.success) {
        toast({
          title: 'Başarılı',
          description: result.message,
          variant: 'success',
        })
        onSuccess?.()
      } else {
        toast({
          title: 'Hata',
          description: result.message || 'Bir hata oluştu',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Hata',
        description: 'Beklenmeyen bir hata oluştu',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Filter out current category from parent options (prevent self-reference)
  const availableParentCategories = parentCategories.filter(
    (c) => c.id !== category?.id
  )

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Category Name */}
      <div className="space-y-2">
        <Label htmlFor="name" className="text-sm font-medium">
          Kategori Adı <span className="text-destructive">*</span>
        </Label>
        <Input
          id="name"
          placeholder="Örn: Ana Yemekler"
          className="h-12"
          {...register('name')}
          aria-invalid={!!errors.name}
          aria-describedby={errors.name ? 'name-error' : undefined}
        />
        {errors.name && (
          <p id="name-error" className="text-sm text-destructive">
            {errors.name.message}
          </p>
        )}
      </div>

      {/* Slug */}
      <div className="space-y-2">
        <Label htmlFor="slug" className="text-sm font-medium">
          URL Adresi (Slug)
        </Label>
        <Input
          id="slug"
          placeholder="ana-yemekler"
          className="h-12"
          {...register('slug')}
          aria-invalid={!!errors.slug}
          aria-describedby={errors.slug ? 'slug-error' : undefined}
        />
        <p className="text-xs text-muted-foreground">
          Otomatik oluşturulur. İsterseniz değiştirebilirsiniz.
        </p>
        {errors.slug && (
          <p id="slug-error" className="text-sm text-destructive">
            {errors.slug.message}
          </p>
        )}
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description" className="text-sm font-medium">
          Açıklama
        </Label>
        <textarea
          id="description"
          placeholder="Kategori hakkında kısa bir açıklama..."
          className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          {...register('description')}
          aria-invalid={!!errors.description}
          aria-describedby={errors.description ? 'description-error' : undefined}
        />
        {errors.description && (
          <p id="description-error" className="text-sm text-destructive">
            {errors.description.message}
          </p>
        )}
      </div>

      {/* Icon */}
      <div className="space-y-2">
        <Label htmlFor="icon" className="text-sm font-medium">
          İkon
        </Label>
        <Input
          id="icon"
          placeholder="Örn: 🍔 veya ikon ismi"
          className="h-12"
          {...register('icon')}
        />
        <p className="text-xs text-muted-foreground">
          Emoji veya ikon ismi girebilirsiniz.
        </p>
      </div>

      {/* Parent Category */}
      {availableParentCategories.length > 0 && (
        <div className="space-y-2">
          <Label htmlFor="parent_id" className="text-sm font-medium">
            Üst Kategori
          </Label>
          <select
            id="parent_id"
            className="flex h-12 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            {...register('parent_id')}
          >
            <option value="">Üst kategori yok (Ana kategori)</option>
            {availableParentCategories.map((parentCat) => (
              <option key={parentCat.id} value={parentCat.id}>
                {parentCat.name}
              </option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground">
            Bu kategoriyi başka bir kategorinin altına yerleştirin.
          </p>
        </div>
      )}

      {/* Visibility Toggle */}
      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          id="is_visible"
          className="h-5 w-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          {...register('is_visible')}
        />
        <Label htmlFor="is_visible" className="text-sm font-medium cursor-pointer">
          Menüde görünür
        </Label>
      </div>

      {/* Time Availability (collapsible) */}
      <details className="group">
        <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
          <span className="ml-1">Zaman Kısıtlaması (İsteğe bağlı)</span>
        </summary>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 pt-4 border-t">
          <div className="space-y-2">
            <Label htmlFor="available_from" className="text-sm font-medium">
              Başlangıç Saati
            </Label>
            <Input
              id="available_from"
              type="time"
              className="h-12"
              {...register('available_from')}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="available_until" className="text-sm font-medium">
              Bitiş Saati
            </Label>
            <Input
              id="available_until"
              type="time"
              className="h-12"
              {...register('available_until')}
            />
          </div>
          <p className="text-xs text-muted-foreground sm:col-span-2">
            Sadece belirli saatlerde görünmesini istediğiniz kategoriler için.
          </p>
        </div>
      </details>

      {/* Form Actions */}
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
            className="h-12 sm:h-10"
          >
            İptal
          </Button>
        )}
        <Button
          type="submit"
          disabled={isSubmitting}
          className="h-12 sm:h-10"
        >
          {isSubmitting ? (
            <>
              <svg
                className="mr-2 h-4 w-4 animate-spin"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                <path d="M9 12l2 2 4-4" />
              </svg>
              Kaydediliyor...
            </>
          ) : isEditing ? (
            'Güncelle'
          ) : (
            'Oluştur'
          )}
        </Button>
      </div>
    </form>
  )
}
