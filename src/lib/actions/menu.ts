'use server'

/**
 * Menu Server Actions
 *
 * This module contains all menu-related Server Actions for:
 * - Category CRUD (create, read, update, delete)
 * - Product CRUD (create, read, update, delete)
 * - Modifier CRUD (create, read, update, delete)
 * - Modifier Option CRUD
 * - Sort order updates (drag-and-drop reordering)
 * - Bulk operations (delete, visibility toggle, availability)
 *
 * All actions:
 * - Use Zod for input validation with Turkish error messages
 * - Return standardized MenuActionResponse
 * - Revalidate affected paths on success
 * - Log errors for debugging (not exposed to client)
 *
 * @see MASTER-PROMPT.md
 * @see https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions
 */

import { revalidatePath } from 'next/cache'
import {
  // Category DAL
  createCategory as dalCreateCategory,
  updateCategory as dalUpdateCategory,
  softDeleteCategory as dalSoftDeleteCategory,
  hardDeleteCategory as dalHardDeleteCategory,
  restoreCategory as dalRestoreCategory,
  updateCategorySortOrder as dalUpdateCategorySortOrder,
  setCategoryVisibility,
  duplicateCategory as dalDuplicateCategory,
  moveCategoryToParent as dalMoveCategoryToParent,
} from '@/lib/dal/categories'
import {
  // Product DAL
  createProduct as dalCreateProduct,
  updateProduct as dalUpdateProduct,
  softDeleteProduct as dalSoftDeleteProduct,
  hardDeleteProduct as dalHardDeleteProduct,
  restoreProduct as dalRestoreProduct,
  updateProductSortOrder as dalUpdateProductSortOrder,
  setProductAvailability,
  setProductFeatured,
  duplicateProduct as dalDuplicateProduct,
  moveProductToCategory as dalMoveProductToCategory,
  batchSoftDeleteProducts as dalBatchSoftDeleteProducts,
  batchUpdateProductStatus as dalBatchUpdateProductStatus,
  // Modifier DAL
  createProductModifier as dalCreateProductModifier,
  createModifierOption as dalCreateModifierOption,
} from '@/lib/dal/products'
import {
  // Validation schemas
  categorySchema,
  categoryUpdateSchema,
  categorySortOrderSchema,
  categoryMoveSchema,
  productSchema,
  productUpdateSchema,
  productSortOrderSchema,
  productMoveSchema,
  productAvailabilitySchema,
  bulkProductAvailabilitySchema,
  productModifierSchema,
  productModifierUpdateSchema,
  modifierSortOrderSchema,
  modifierOptionSchema,
  modifierOptionUpdateSchema,
  optionSortOrderSchema,
  bulkDeleteSchema,
  bulkVisibilitySchema,
  uuidSchema,
  type CategoryInput,
  type CategoryUpdateInput,
  type CategorySortOrderInput,
  type CategoryMoveInput,
  type ProductInput,
  type ProductUpdateInput,
  type ProductSortOrderInput,
  type ProductMoveInput,
  type ProductAvailabilityInput,
  type BulkProductAvailabilityInput,
  type ProductModifierInput,
  type ProductModifierUpdateInput,
  type ModifierSortOrderInput,
  type ModifierOptionInput,
  type ModifierOptionUpdateInput,
  type OptionSortOrderInput,
  type BulkDeleteInput,
  type BulkVisibilityInput,
  generateSlug,
} from '@/lib/validations/menu'
import type { ProductStatus } from '@/types/database'

// =============================================================================
// TYPES
// =============================================================================

/**
 * Standard action response for all menu operations
 */
export interface MenuActionResponse<T = unknown> {
  success: boolean
  message: string
  data?: T
  error?: string
  errorCode?: MenuErrorCode
}

/**
 * Menu error codes for programmatic handling
 */
export type MenuErrorCode =
  | 'not_found'
  | 'already_exists'
  | 'validation_error'
  | 'permission_denied'
  | 'database_error'
  | 'unknown_error'

/**
 * Turkish messages for menu actions
 */
const MENU_ACTION_MESSAGES = {
  // Category messages
  categoryCreated: 'Kategori başarıyla oluşturuldu',
  categoryUpdated: 'Kategori başarıyla güncellendi',
  categoryDeleted: 'Kategori başarıyla silindi',
  categoryRestored: 'Kategori başarıyla geri yüklendi',
  categoryDuplicated: 'Kategori başarıyla kopyalandı',
  categoryMoved: 'Kategori başarıyla taşındı',
  categoryNotFound: 'Kategori bulunamadı',
  categorySortUpdated: 'Kategori sıralaması güncellendi',
  categoryVisibilityUpdated: 'Kategori görünürlüğü güncellendi',

  // Product messages
  productCreated: 'Ürün başarıyla oluşturuldu',
  productUpdated: 'Ürün başarıyla güncellendi',
  productDeleted: 'Ürün başarıyla silindi',
  productRestored: 'Ürün başarıyla geri yüklendi',
  productDuplicated: 'Ürün başarıyla kopyalandı',
  productMoved: 'Ürün başarıyla taşındı',
  productNotFound: 'Ürün bulunamadı',
  productSortUpdated: 'Ürün sıralaması güncellendi',
  productAvailabilityUpdated: 'Ürün durumu güncellendi',
  productFeaturedUpdated: 'Ürün öne çıkarma durumu güncellendi',
  productsDeleted: 'Ürünler başarıyla silindi',
  productsStatusUpdated: 'Ürün durumları güncellendi',

  // Modifier messages
  modifierCreated: 'Seçenek grubu başarıyla oluşturuldu',
  modifierUpdated: 'Seçenek grubu başarıyla güncellendi',
  modifierDeleted: 'Seçenek grubu başarıyla silindi',
  modifierNotFound: 'Seçenek grubu bulunamadı',
  modifierSortUpdated: 'Seçenek grubu sıralaması güncellendi',

  // Modifier option messages
  optionCreated: 'Seçenek başarıyla oluşturuldu',
  optionUpdated: 'Seçenek başarıyla güncellendi',
  optionDeleted: 'Seçenek başarıyla silindi',
  optionNotFound: 'Seçenek bulunamadı',
  optionSortUpdated: 'Seçenek sıralaması güncellendi',

  // Bulk operation messages
  bulkDeleteSuccess: 'Seçili öğeler başarıyla silindi',
  bulkVisibilitySuccess: 'Görünürlük ayarları güncellendi',
  bulkAvailabilitySuccess: 'Ürün durumları güncellendi',

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
  errorCode: MenuErrorCode,
  details?: string
): MenuActionResponse<T> {
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
): MenuActionResponse<T> {
  return {
    success: true,
    message,
    data,
  }
}

/**
 * Map DAL error to action error
 */
function mapDALError(error: { code: string; message: string }): MenuErrorCode {
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
    default:
      return 'unknown_error'
  }
}

// =============================================================================
// CATEGORY ACTIONS
// =============================================================================

/**
 * Create Category Server Action
 *
 * @param _prevState - Previous form state (for useFormState)
 * @param formData - Form data containing category fields
 * @returns MenuActionResponse with created category
 */
export async function createCategory(
  _prevState: MenuActionResponse | null,
  formData: FormData
): Promise<MenuActionResponse> {
  try {
    // 1. Extract and validate input
    const rawInput = {
      name: formData.get('name'),
      slug: formData.get('slug') || undefined,
      description: formData.get('description') || undefined,
      icon: formData.get('icon') || undefined,
      image_url: formData.get('image_url') || undefined,
      parent_id: formData.get('parent_id') || undefined,
      sort_order: formData.get('sort_order') ? Number(formData.get('sort_order')) : undefined,
      is_visible: formData.get('is_visible') === 'true' || formData.get('is_visible') === 'on',
      available_from: formData.get('available_from') || undefined,
      available_until: formData.get('available_until') || undefined,
    }

    const validationResult = categorySchema.safeParse(rawInput)

    if (!validationResult.success) {
      const firstError = validationResult.error.errors[0]
      return createErrorResponse(
        firstError?.message ?? MENU_ACTION_MESSAGES.validationError,
        'validation_error'
      )
    }

    // 2. Get organization ID from form
    const organizationId = formData.get('organization_id')
    if (!organizationId || typeof organizationId !== 'string') {
      return createErrorResponse(
        'Organizasyon kimliği gerekli',
        'validation_error'
      )
    }

    // 3. Create category via DAL
    const { data: category, error } = await dalCreateCategory({
      organization_id: organizationId,
      ...validationResult.data,
      slug: validationResult.data.slug || generateSlug(validationResult.data.name),
    })

    if (error) {
      return createErrorResponse(
        error.message,
        mapDALError(error),
        error.details
      )
    }

    // 4. Revalidate paths
    revalidatePath('/dashboard/categories')
    revalidatePath('/dashboard')
    revalidatePath(`/r/[slug]`, 'page')

    return createSuccessResponse(MENU_ACTION_MESSAGES.categoryCreated, category)
  } catch (err) {
    console.error('[Menu] Create category error:', err)
    const errorMessage = err instanceof Error ? err.message : String(err)
    const errorStack = err instanceof Error ? err.stack : undefined
    console.error('[Menu] Error details:', { errorMessage, errorStack })
    return createErrorResponse(
      errorMessage.includes('permission') || errorMessage.includes('policy') || errorMessage.includes('RLS')
        ? 'Bu işlem için yetkiniz yok. Lütfen organizasyon yöneticinizle iletişime geçin.'
        : MENU_ACTION_MESSAGES.serverError,
      'unknown_error'
    )
  }
}

/**
 * Create category with direct input (programmatic use)
 */
export async function createCategoryDirect(
  organizationId: string,
  input: CategoryInput
): Promise<MenuActionResponse> {
  try {
    const validationResult = categorySchema.safeParse(input)

    if (!validationResult.success) {
      const firstError = validationResult.error.errors[0]
      return createErrorResponse(
        firstError?.message ?? MENU_ACTION_MESSAGES.validationError,
        'validation_error'
      )
    }

    const { data: category, error } = await dalCreateCategory({
      organization_id: organizationId,
      ...validationResult.data,
      slug: validationResult.data.slug || generateSlug(validationResult.data.name),
    })

    if (error) {
      return createErrorResponse(error.message, mapDALError(error), error.details)
    }

    revalidatePath('/dashboard/categories')
    revalidatePath('/dashboard')

    return createSuccessResponse(MENU_ACTION_MESSAGES.categoryCreated, category)
  } catch (err) {
    console.error('[Menu] Create category error:', err)
    return createErrorResponse(MENU_ACTION_MESSAGES.serverError, 'unknown_error')
  }
}

/**
 * Update Category Server Action
 */
export async function updateCategory(
  categoryId: string,
  _prevState: MenuActionResponse | null,
  formData: FormData
): Promise<MenuActionResponse> {
  try {
    // 1. Validate category ID
    const idValidation = uuidSchema.safeParse(categoryId)
    if (!idValidation.success) {
      return createErrorResponse(MENU_ACTION_MESSAGES.categoryNotFound, 'not_found')
    }

    // 2. Extract and validate input
    const rawInput: Record<string, unknown> = {}

    // Only include fields that are present in the form
    if (formData.has('name')) rawInput.name = formData.get('name')
    if (formData.has('slug')) rawInput.slug = formData.get('slug') || undefined
    if (formData.has('description')) rawInput.description = formData.get('description') || undefined
    if (formData.has('icon')) rawInput.icon = formData.get('icon') || undefined
    if (formData.has('image_url')) rawInput.image_url = formData.get('image_url') || undefined
    if (formData.has('parent_id')) rawInput.parent_id = formData.get('parent_id') || null
    if (formData.has('sort_order')) rawInput.sort_order = Number(formData.get('sort_order'))
    if (formData.has('is_visible')) rawInput.is_visible = formData.get('is_visible') === 'true'
    if (formData.has('available_from')) rawInput.available_from = formData.get('available_from') || undefined
    if (formData.has('available_until')) rawInput.available_until = formData.get('available_until') || undefined

    const validationResult = categoryUpdateSchema.safeParse(rawInput)

    if (!validationResult.success) {
      const firstError = validationResult.error.errors[0]
      return createErrorResponse(
        firstError?.message ?? MENU_ACTION_MESSAGES.validationError,
        'validation_error'
      )
    }

    // 3. Update category via DAL
    const { data: category, error } = await dalUpdateCategory(categoryId, validationResult.data)

    if (error) {
      return createErrorResponse(error.message, mapDALError(error), error.details)
    }

    // 4. Revalidate paths
    revalidatePath('/dashboard/categories')
    revalidatePath('/dashboard')
    revalidatePath(`/r/[slug]`, 'page')

    return createSuccessResponse(MENU_ACTION_MESSAGES.categoryUpdated, category)
  } catch (err) {
    console.error('[Menu] Update category error:', err)
    return createErrorResponse(MENU_ACTION_MESSAGES.serverError, 'unknown_error')
  }
}

/**
 * Update category with direct input
 */
export async function updateCategoryDirect(
  categoryId: string,
  input: CategoryUpdateInput
): Promise<MenuActionResponse> {
  try {
    const idValidation = uuidSchema.safeParse(categoryId)
    if (!idValidation.success) {
      return createErrorResponse(MENU_ACTION_MESSAGES.categoryNotFound, 'not_found')
    }

    const validationResult = categoryUpdateSchema.safeParse(input)
    if (!validationResult.success) {
      const firstError = validationResult.error.errors[0]
      return createErrorResponse(
        firstError?.message ?? MENU_ACTION_MESSAGES.validationError,
        'validation_error'
      )
    }

    const { data: category, error } = await dalUpdateCategory(categoryId, validationResult.data)

    if (error) {
      return createErrorResponse(error.message, mapDALError(error), error.details)
    }

    revalidatePath('/dashboard/categories')
    revalidatePath('/dashboard')

    return createSuccessResponse(MENU_ACTION_MESSAGES.categoryUpdated, category)
  } catch (err) {
    console.error('[Menu] Update category error:', err)
    return createErrorResponse(MENU_ACTION_MESSAGES.serverError, 'unknown_error')
  }
}

/**
 * Delete Category Server Action (soft delete)
 */
export async function deleteCategory(categoryId: string): Promise<MenuActionResponse> {
  try {
    const idValidation = uuidSchema.safeParse(categoryId)
    if (!idValidation.success) {
      return createErrorResponse(MENU_ACTION_MESSAGES.categoryNotFound, 'not_found')
    }

    const { error } = await dalSoftDeleteCategory(categoryId)

    if (error) {
      return createErrorResponse(error.message, mapDALError(error), error.details)
    }

    revalidatePath('/dashboard/categories')
    revalidatePath('/dashboard')

    return createSuccessResponse(MENU_ACTION_MESSAGES.categoryDeleted)
  } catch (err) {
    console.error('[Menu] Delete category error:', err)
    return createErrorResponse(MENU_ACTION_MESSAGES.serverError, 'unknown_error')
  }
}

/**
 * Hard delete category (permanent)
 */
export async function hardDeleteCategory(categoryId: string): Promise<MenuActionResponse> {
  try {
    const idValidation = uuidSchema.safeParse(categoryId)
    if (!idValidation.success) {
      return createErrorResponse(MENU_ACTION_MESSAGES.categoryNotFound, 'not_found')
    }

    const { error } = await dalHardDeleteCategory(categoryId)

    if (error) {
      return createErrorResponse(error.message, mapDALError(error), error.details)
    }

    revalidatePath('/dashboard/categories')
    revalidatePath('/dashboard')

    return createSuccessResponse(MENU_ACTION_MESSAGES.categoryDeleted)
  } catch (err) {
    console.error('[Menu] Hard delete category error:', err)
    return createErrorResponse(MENU_ACTION_MESSAGES.serverError, 'unknown_error')
  }
}

/**
 * Restore Category Server Action
 */
export async function restoreCategory(categoryId: string): Promise<MenuActionResponse> {
  try {
    const idValidation = uuidSchema.safeParse(categoryId)
    if (!idValidation.success) {
      return createErrorResponse(MENU_ACTION_MESSAGES.categoryNotFound, 'not_found')
    }

    const { data: category, error } = await dalRestoreCategory(categoryId)

    if (error) {
      return createErrorResponse(error.message, mapDALError(error), error.details)
    }

    revalidatePath('/dashboard/categories')
    revalidatePath('/dashboard')

    return createSuccessResponse(MENU_ACTION_MESSAGES.categoryRestored, category)
  } catch (err) {
    console.error('[Menu] Restore category error:', err)
    return createErrorResponse(MENU_ACTION_MESSAGES.serverError, 'unknown_error')
  }
}

/**
 * Duplicate Category Server Action
 */
export async function duplicateCategory(categoryId: string): Promise<MenuActionResponse> {
  try {
    const idValidation = uuidSchema.safeParse(categoryId)
    if (!idValidation.success) {
      return createErrorResponse(MENU_ACTION_MESSAGES.categoryNotFound, 'not_found')
    }

    const { data: category, error } = await dalDuplicateCategory(categoryId)

    if (error) {
      return createErrorResponse(error.message, mapDALError(error), error.details)
    }

    revalidatePath('/dashboard/categories')
    revalidatePath('/dashboard')

    return createSuccessResponse(MENU_ACTION_MESSAGES.categoryDuplicated, category)
  } catch (err) {
    console.error('[Menu] Duplicate category error:', err)
    return createErrorResponse(MENU_ACTION_MESSAGES.serverError, 'unknown_error')
  }
}

/**
 * Update Category Sort Order (for drag-and-drop)
 */
export async function updateCategorySortOrder(
  organizationId: string,
  input: CategorySortOrderInput
): Promise<MenuActionResponse> {
  try {
    const validationResult = categorySortOrderSchema.safeParse(input)
    if (!validationResult.success) {
      const firstError = validationResult.error.errors[0]
      return createErrorResponse(
        firstError?.message ?? MENU_ACTION_MESSAGES.validationError,
        'validation_error'
      )
    }

    const { error } = await dalUpdateCategorySortOrder(
      organizationId,
      validationResult.data.items
    )

    if (error) {
      return createErrorResponse(error.message, mapDALError(error), error.details)
    }

    revalidatePath('/dashboard/categories')

    return createSuccessResponse(MENU_ACTION_MESSAGES.categorySortUpdated)
  } catch (err) {
    console.error('[Menu] Update category sort order error:', err)
    return createErrorResponse(MENU_ACTION_MESSAGES.serverError, 'unknown_error')
  }
}

/**
 * Toggle Category Visibility
 */
export async function toggleCategoryVisibility(
  categoryId: string,
  isVisible: boolean
): Promise<MenuActionResponse> {
  try {
    const idValidation = uuidSchema.safeParse(categoryId)
    if (!idValidation.success) {
      return createErrorResponse(MENU_ACTION_MESSAGES.categoryNotFound, 'not_found')
    }

    const { data: category, error } = await setCategoryVisibility(categoryId, isVisible)

    if (error) {
      return createErrorResponse(error.message, mapDALError(error), error.details)
    }

    revalidatePath('/dashboard/categories')
    revalidatePath(`/r/[slug]`, 'page')

    return createSuccessResponse(MENU_ACTION_MESSAGES.categoryVisibilityUpdated, category)
  } catch (err) {
    console.error('[Menu] Toggle category visibility error:', err)
    return createErrorResponse(MENU_ACTION_MESSAGES.serverError, 'unknown_error')
  }
}

/**
 * Move Category to Parent
 */
export async function moveCategory(input: CategoryMoveInput): Promise<MenuActionResponse> {
  try {
    const validationResult = categoryMoveSchema.safeParse(input)
    if (!validationResult.success) {
      const firstError = validationResult.error.errors[0]
      return createErrorResponse(
        firstError?.message ?? MENU_ACTION_MESSAGES.validationError,
        'validation_error'
      )
    }

    const { data: category, error } = await dalMoveCategoryToParent(
      validationResult.data.id,
      validationResult.data.parent_id
    )

    if (error) {
      return createErrorResponse(error.message, mapDALError(error), error.details)
    }

    revalidatePath('/dashboard/categories')

    return createSuccessResponse(MENU_ACTION_MESSAGES.categoryMoved, category)
  } catch (err) {
    console.error('[Menu] Move category error:', err)
    return createErrorResponse(MENU_ACTION_MESSAGES.serverError, 'unknown_error')
  }
}

// =============================================================================
// PRODUCT ACTIONS
// =============================================================================

/**
 * Create Product Server Action
 */
export async function createProduct(
  _prevState: MenuActionResponse | null,
  formData: FormData
): Promise<MenuActionResponse> {
  try {
    // 1. Extract and validate input
    const rawInput = {
      name: formData.get('name'),
      slug: formData.get('slug') || undefined,
      description: formData.get('description') || undefined,
      short_description: formData.get('short_description') || undefined,
      price: formData.get('price') ? Number(formData.get('price')) : undefined,
      compare_at_price: formData.get('compare_at_price') ? Number(formData.get('compare_at_price')) : undefined,
      currency: formData.get('currency') || 'TRY',
      status: formData.get('status') || 'active',
      is_available: formData.get('is_available') !== 'false',
      stock_quantity: formData.get('stock_quantity') ? Number(formData.get('stock_quantity')) : undefined,
      category_id: formData.get('category_id') || undefined,
      preparation_time_minutes: formData.get('preparation_time_minutes')
        ? Number(formData.get('preparation_time_minutes'))
        : undefined,
      is_vegetarian: formData.get('is_vegetarian') === 'true',
      is_vegan: formData.get('is_vegan') === 'true',
      is_gluten_free: formData.get('is_gluten_free') === 'true',
      is_spicy: formData.get('is_spicy') === 'true',
      spicy_level: formData.get('spicy_level') ? Number(formData.get('spicy_level')) : undefined,
      is_featured: formData.get('is_featured') === 'true',
      sort_order: formData.get('sort_order') ? Number(formData.get('sort_order')) : undefined,
      // Parse JSON arrays
      image_urls: parseJSONField(formData.get('image_urls')),
      allergens: parseJSONField(formData.get('allergens')),
      tags: parseJSONField(formData.get('tags')),
      nutritional_info: parseJSONField(formData.get('nutritional_info')),
      attributes: parseJSONField(formData.get('attributes')),
      // SEO
      meta_title: formData.get('meta_title') || undefined,
      meta_description: formData.get('meta_description') || undefined,
    }

    const validationResult = productSchema.safeParse(rawInput)

    if (!validationResult.success) {
      const firstError = validationResult.error.errors[0]
      return createErrorResponse(
        firstError?.message ?? MENU_ACTION_MESSAGES.validationError,
        'validation_error'
      )
    }

    // 2. Get organization ID from form
    const organizationId = formData.get('organization_id')
    if (!organizationId || typeof organizationId !== 'string') {
      return createErrorResponse('Organizasyon kimliği gerekli', 'validation_error')
    }

    // 3. Create product via DAL
    const { data: product, error } = await dalCreateProduct({
      organization_id: organizationId,
      ...validationResult.data,
      slug: validationResult.data.slug || generateSlug(validationResult.data.name),
    })

    if (error) {
      return createErrorResponse(error.message, mapDALError(error), error.details)
    }

    // 4. Revalidate paths
    revalidatePath('/dashboard/products')
    revalidatePath('/dashboard/categories')
    revalidatePath('/dashboard')
    revalidatePath(`/r/[slug]`, 'page')

    return createSuccessResponse(MENU_ACTION_MESSAGES.productCreated, product)
  } catch (err) {
    console.error('[Menu] Create product error:', err)
    return createErrorResponse(MENU_ACTION_MESSAGES.serverError, 'unknown_error')
  }
}

/**
 * Create product with direct input
 */
export async function createProductDirect(
  organizationId: string,
  input: ProductInput
): Promise<MenuActionResponse> {
  try {
    const validationResult = productSchema.safeParse(input)

    if (!validationResult.success) {
      const firstError = validationResult.error.errors[0]
      return createErrorResponse(
        firstError?.message ?? MENU_ACTION_MESSAGES.validationError,
        'validation_error'
      )
    }

    const { data: product, error } = await dalCreateProduct({
      organization_id: organizationId,
      ...validationResult.data,
      slug: validationResult.data.slug || generateSlug(validationResult.data.name),
    })

    if (error) {
      return createErrorResponse(error.message, mapDALError(error), error.details)
    }

    revalidatePath('/dashboard/products')
    revalidatePath('/dashboard/categories')
    revalidatePath('/dashboard')

    return createSuccessResponse(MENU_ACTION_MESSAGES.productCreated, product)
  } catch (err) {
    console.error('[Menu] Create product error:', err)
    return createErrorResponse(MENU_ACTION_MESSAGES.serverError, 'unknown_error')
  }
}

/**
 * Update Product Server Action
 */
export async function updateProduct(
  productId: string,
  _prevState: MenuActionResponse | null,
  formData: FormData
): Promise<MenuActionResponse> {
  try {
    const idValidation = uuidSchema.safeParse(productId)
    if (!idValidation.success) {
      return createErrorResponse(MENU_ACTION_MESSAGES.productNotFound, 'not_found')
    }

    // Extract form data - only include fields that are present
    const rawInput: Record<string, unknown> = {}

    if (formData.has('name')) rawInput.name = formData.get('name')
    if (formData.has('slug')) rawInput.slug = formData.get('slug') || undefined
    if (formData.has('description')) rawInput.description = formData.get('description') || undefined
    if (formData.has('short_description')) rawInput.short_description = formData.get('short_description') || undefined
    if (formData.has('price')) rawInput.price = Number(formData.get('price'))
    if (formData.has('compare_at_price')) {
      const comparePrice = formData.get('compare_at_price')
      rawInput.compare_at_price = comparePrice ? Number(comparePrice) : null
    }
    if (formData.has('currency')) rawInput.currency = formData.get('currency')
    if (formData.has('status')) rawInput.status = formData.get('status')
    if (formData.has('is_available')) rawInput.is_available = formData.get('is_available') === 'true'
    if (formData.has('stock_quantity')) {
      const stock = formData.get('stock_quantity')
      rawInput.stock_quantity = stock ? Number(stock) : null
    }
    if (formData.has('category_id')) rawInput.category_id = formData.get('category_id') || null
    if (formData.has('preparation_time_minutes')) {
      const prepTime = formData.get('preparation_time_minutes')
      rawInput.preparation_time_minutes = prepTime ? Number(prepTime) : null
    }
    if (formData.has('is_vegetarian')) rawInput.is_vegetarian = formData.get('is_vegetarian') === 'true'
    if (formData.has('is_vegan')) rawInput.is_vegan = formData.get('is_vegan') === 'true'
    if (formData.has('is_gluten_free')) rawInput.is_gluten_free = formData.get('is_gluten_free') === 'true'
    if (formData.has('is_spicy')) rawInput.is_spicy = formData.get('is_spicy') === 'true'
    if (formData.has('spicy_level')) {
      const spicy = formData.get('spicy_level')
      rawInput.spicy_level = spicy ? Number(spicy) : null
    }
    if (formData.has('is_featured')) rawInput.is_featured = formData.get('is_featured') === 'true'
    if (formData.has('sort_order')) rawInput.sort_order = Number(formData.get('sort_order'))
    if (formData.has('image_urls')) rawInput.image_urls = parseJSONField(formData.get('image_urls'))
    if (formData.has('allergens')) rawInput.allergens = parseJSONField(formData.get('allergens'))
    if (formData.has('tags')) rawInput.tags = parseJSONField(formData.get('tags'))
    if (formData.has('nutritional_info')) rawInput.nutritional_info = parseJSONField(formData.get('nutritional_info'))
    if (formData.has('attributes')) rawInput.attributes = parseJSONField(formData.get('attributes'))
    if (formData.has('meta_title')) rawInput.meta_title = formData.get('meta_title') || undefined
    if (formData.has('meta_description')) rawInput.meta_description = formData.get('meta_description') || undefined

    const validationResult = productUpdateSchema.safeParse(rawInput)

    if (!validationResult.success) {
      const firstError = validationResult.error.errors[0]
      return createErrorResponse(
        firstError?.message ?? MENU_ACTION_MESSAGES.validationError,
        'validation_error'
      )
    }

    const { data: product, error } = await dalUpdateProduct(productId, validationResult.data)

    if (error) {
      return createErrorResponse(error.message, mapDALError(error), error.details)
    }

    revalidatePath('/dashboard/products')
    revalidatePath('/dashboard/categories')
    revalidatePath('/dashboard')
    revalidatePath(`/r/[slug]`, 'page')

    return createSuccessResponse(MENU_ACTION_MESSAGES.productUpdated, product)
  } catch (err) {
    console.error('[Menu] Update product error:', err)
    return createErrorResponse(MENU_ACTION_MESSAGES.serverError, 'unknown_error')
  }
}

/**
 * Update product with direct input
 */
export async function updateProductDirect(
  productId: string,
  input: ProductUpdateInput
): Promise<MenuActionResponse> {
  try {
    const idValidation = uuidSchema.safeParse(productId)
    if (!idValidation.success) {
      return createErrorResponse(MENU_ACTION_MESSAGES.productNotFound, 'not_found')
    }

    const validationResult = productUpdateSchema.safeParse(input)
    if (!validationResult.success) {
      const firstError = validationResult.error.errors[0]
      return createErrorResponse(
        firstError?.message ?? MENU_ACTION_MESSAGES.validationError,
        'validation_error'
      )
    }

    const { data: product, error } = await dalUpdateProduct(productId, validationResult.data)

    if (error) {
      return createErrorResponse(error.message, mapDALError(error), error.details)
    }

    revalidatePath('/dashboard/products')
    revalidatePath('/dashboard/categories')
    revalidatePath('/dashboard')

    return createSuccessResponse(MENU_ACTION_MESSAGES.productUpdated, product)
  } catch (err) {
    console.error('[Menu] Update product error:', err)
    return createErrorResponse(MENU_ACTION_MESSAGES.serverError, 'unknown_error')
  }
}

/**
 * Delete Product Server Action (soft delete)
 */
export async function deleteProduct(productId: string): Promise<MenuActionResponse> {
  try {
    const idValidation = uuidSchema.safeParse(productId)
    if (!idValidation.success) {
      return createErrorResponse(MENU_ACTION_MESSAGES.productNotFound, 'not_found')
    }

    const { error } = await dalSoftDeleteProduct(productId)

    if (error) {
      return createErrorResponse(error.message, mapDALError(error), error.details)
    }

    revalidatePath('/dashboard/products')
    revalidatePath('/dashboard/categories')
    revalidatePath('/dashboard')

    return createSuccessResponse(MENU_ACTION_MESSAGES.productDeleted)
  } catch (err) {
    console.error('[Menu] Delete product error:', err)
    return createErrorResponse(MENU_ACTION_MESSAGES.serverError, 'unknown_error')
  }
}

/**
 * Hard delete product (permanent)
 */
export async function hardDeleteProduct(productId: string): Promise<MenuActionResponse> {
  try {
    const idValidation = uuidSchema.safeParse(productId)
    if (!idValidation.success) {
      return createErrorResponse(MENU_ACTION_MESSAGES.productNotFound, 'not_found')
    }

    const { error } = await dalHardDeleteProduct(productId)

    if (error) {
      return createErrorResponse(error.message, mapDALError(error), error.details)
    }

    revalidatePath('/dashboard/products')
    revalidatePath('/dashboard/categories')
    revalidatePath('/dashboard')

    return createSuccessResponse(MENU_ACTION_MESSAGES.productDeleted)
  } catch (err) {
    console.error('[Menu] Hard delete product error:', err)
    return createErrorResponse(MENU_ACTION_MESSAGES.serverError, 'unknown_error')
  }
}

/**
 * Restore Product Server Action
 */
export async function restoreProduct(productId: string): Promise<MenuActionResponse> {
  try {
    const idValidation = uuidSchema.safeParse(productId)
    if (!idValidation.success) {
      return createErrorResponse(MENU_ACTION_MESSAGES.productNotFound, 'not_found')
    }

    const { data: product, error } = await dalRestoreProduct(productId)

    if (error) {
      return createErrorResponse(error.message, mapDALError(error), error.details)
    }

    revalidatePath('/dashboard/products')
    revalidatePath('/dashboard/categories')
    revalidatePath('/dashboard')

    return createSuccessResponse(MENU_ACTION_MESSAGES.productRestored, product)
  } catch (err) {
    console.error('[Menu] Restore product error:', err)
    return createErrorResponse(MENU_ACTION_MESSAGES.serverError, 'unknown_error')
  }
}

/**
 * Duplicate Product Server Action
 */
export async function duplicateProduct(productId: string): Promise<MenuActionResponse> {
  try {
    const idValidation = uuidSchema.safeParse(productId)
    if (!idValidation.success) {
      return createErrorResponse(MENU_ACTION_MESSAGES.productNotFound, 'not_found')
    }

    const { data: product, error } = await dalDuplicateProduct(productId)

    if (error) {
      return createErrorResponse(error.message, mapDALError(error), error.details)
    }

    revalidatePath('/dashboard/products')
    revalidatePath('/dashboard/categories')
    revalidatePath('/dashboard')

    return createSuccessResponse(MENU_ACTION_MESSAGES.productDuplicated, product)
  } catch (err) {
    console.error('[Menu] Duplicate product error:', err)
    return createErrorResponse(MENU_ACTION_MESSAGES.serverError, 'unknown_error')
  }
}

/**
 * Update Product Sort Order (for drag-and-drop)
 */
export async function updateProductSortOrder(
  organizationId: string,
  input: ProductSortOrderInput
): Promise<MenuActionResponse> {
  try {
    const validationResult = productSortOrderSchema.safeParse(input)
    if (!validationResult.success) {
      const firstError = validationResult.error.errors[0]
      return createErrorResponse(
        firstError?.message ?? MENU_ACTION_MESSAGES.validationError,
        'validation_error'
      )
    }

    const { error } = await dalUpdateProductSortOrder(organizationId, validationResult.data.items)

    if (error) {
      return createErrorResponse(error.message, mapDALError(error), error.details)
    }

    revalidatePath('/dashboard/products')

    return createSuccessResponse(MENU_ACTION_MESSAGES.productSortUpdated)
  } catch (err) {
    console.error('[Menu] Update product sort order error:', err)
    return createErrorResponse(MENU_ACTION_MESSAGES.serverError, 'unknown_error')
  }
}

/**
 * Toggle Product Availability
 */
export async function toggleProductAvailability(
  input: ProductAvailabilityInput
): Promise<MenuActionResponse> {
  try {
    const validationResult = productAvailabilitySchema.safeParse(input)
    if (!validationResult.success) {
      const firstError = validationResult.error.errors[0]
      return createErrorResponse(
        firstError?.message ?? MENU_ACTION_MESSAGES.validationError,
        'validation_error'
      )
    }

    const { data: product, error } = await setProductAvailability(
      validationResult.data.id,
      validationResult.data.is_available
    )

    if (error) {
      return createErrorResponse(error.message, mapDALError(error), error.details)
    }

    revalidatePath('/dashboard/products')
    revalidatePath(`/r/[slug]`, 'page')

    return createSuccessResponse(MENU_ACTION_MESSAGES.productAvailabilityUpdated, product)
  } catch (err) {
    console.error('[Menu] Toggle product availability error:', err)
    return createErrorResponse(MENU_ACTION_MESSAGES.serverError, 'unknown_error')
  }
}

/**
 * Bulk Toggle Product Availability
 */
export async function bulkToggleProductAvailability(
  organizationId: string,
  input: BulkProductAvailabilityInput
): Promise<MenuActionResponse> {
  try {
    const validationResult = bulkProductAvailabilitySchema.safeParse(input)
    if (!validationResult.success) {
      const firstError = validationResult.error.errors[0]
      return createErrorResponse(
        firstError?.message ?? MENU_ACTION_MESSAGES.validationError,
        'validation_error'
      )
    }

    // Update each product's availability
    const status = validationResult.data.is_available ? 'active' : 'out_of_stock'
    const { error } = await dalBatchUpdateProductStatus(
      organizationId,
      validationResult.data.product_ids,
      status as ProductStatus
    )

    if (error) {
      return createErrorResponse(error.message, mapDALError(error), error.details)
    }

    revalidatePath('/dashboard/products')
    revalidatePath(`/r/[slug]`, 'page')

    return createSuccessResponse(MENU_ACTION_MESSAGES.bulkAvailabilitySuccess)
  } catch (err) {
    console.error('[Menu] Bulk toggle product availability error:', err)
    return createErrorResponse(MENU_ACTION_MESSAGES.serverError, 'unknown_error')
  }
}

/**
 * Toggle Product Featured Status
 */
export async function toggleProductFeatured(
  productId: string,
  isFeatured: boolean,
  featuredUntil?: string | null
): Promise<MenuActionResponse> {
  try {
    const idValidation = uuidSchema.safeParse(productId)
    if (!idValidation.success) {
      return createErrorResponse(MENU_ACTION_MESSAGES.productNotFound, 'not_found')
    }

    const { data: product, error } = await setProductFeatured(
      productId,
      isFeatured,
      featuredUntil
    )

    if (error) {
      return createErrorResponse(error.message, mapDALError(error), error.details)
    }

    revalidatePath('/dashboard/products')
    revalidatePath(`/r/[slug]`, 'page')

    return createSuccessResponse(MENU_ACTION_MESSAGES.productFeaturedUpdated, product)
  } catch (err) {
    console.error('[Menu] Toggle product featured error:', err)
    return createErrorResponse(MENU_ACTION_MESSAGES.serverError, 'unknown_error')
  }
}

/**
 * Move Product to Category
 */
export async function moveProduct(input: ProductMoveInput): Promise<MenuActionResponse> {
  try {
    const validationResult = productMoveSchema.safeParse(input)
    if (!validationResult.success) {
      const firstError = validationResult.error.errors[0]
      return createErrorResponse(
        firstError?.message ?? MENU_ACTION_MESSAGES.validationError,
        'validation_error'
      )
    }

    const { data: product, error } = await dalMoveProductToCategory(
      validationResult.data.id,
      validationResult.data.category_id
    )

    if (error) {
      return createErrorResponse(error.message, mapDALError(error), error.details)
    }

    revalidatePath('/dashboard/products')
    revalidatePath('/dashboard/categories')

    return createSuccessResponse(MENU_ACTION_MESSAGES.productMoved, product)
  } catch (err) {
    console.error('[Menu] Move product error:', err)
    return createErrorResponse(MENU_ACTION_MESSAGES.serverError, 'unknown_error')
  }
}

// =============================================================================
// BULK OPERATIONS
// =============================================================================

/**
 * Bulk Delete Items (categories or products)
 */
export async function bulkDelete(
  type: 'categories' | 'products',
  organizationId: string,
  input: BulkDeleteInput
): Promise<MenuActionResponse> {
  try {
    const validationResult = bulkDeleteSchema.safeParse(input)
    if (!validationResult.success) {
      const firstError = validationResult.error.errors[0]
      return createErrorResponse(
        firstError?.message ?? MENU_ACTION_MESSAGES.validationError,
        'validation_error'
      )
    }

    const { ids, soft_delete } = validationResult.data

    if (type === 'products') {
      if (soft_delete) {
        const { error } = await dalBatchSoftDeleteProducts(organizationId, ids)
        if (error) {
          return createErrorResponse(error.message, mapDALError(error), error.details)
        }
      } else {
        // Hard delete each product
        for (const id of ids) {
          const { error } = await dalHardDeleteProduct(id)
          if (error) {
            return createErrorResponse(error.message, mapDALError(error), error.details)
          }
        }
      }
      revalidatePath('/dashboard/products')
    } else {
      // Categories - delete each one
      for (const id of ids) {
        if (soft_delete) {
          const { error } = await dalSoftDeleteCategory(id)
          if (error) {
            return createErrorResponse(error.message, mapDALError(error), error.details)
          }
        } else {
          const { error } = await dalHardDeleteCategory(id)
          if (error) {
            return createErrorResponse(error.message, mapDALError(error), error.details)
          }
        }
      }
      revalidatePath('/dashboard/categories')
    }

    revalidatePath('/dashboard')

    return createSuccessResponse(MENU_ACTION_MESSAGES.bulkDeleteSuccess)
  } catch (err) {
    console.error('[Menu] Bulk delete error:', err)
    return createErrorResponse(MENU_ACTION_MESSAGES.serverError, 'unknown_error')
  }
}

/**
 * Bulk Toggle Visibility (categories)
 */
export async function bulkToggleCategoryVisibility(
  input: BulkVisibilityInput
): Promise<MenuActionResponse> {
  try {
    const validationResult = bulkVisibilitySchema.safeParse(input)
    if (!validationResult.success) {
      const firstError = validationResult.error.errors[0]
      return createErrorResponse(
        firstError?.message ?? MENU_ACTION_MESSAGES.validationError,
        'validation_error'
      )
    }

    const { ids, is_visible } = validationResult.data

    // Update each category
    for (const id of ids) {
      const { error } = await setCategoryVisibility(id, is_visible)
      if (error) {
        return createErrorResponse(error.message, mapDALError(error), error.details)
      }
    }

    revalidatePath('/dashboard/categories')
    revalidatePath(`/r/[slug]`, 'page')

    return createSuccessResponse(MENU_ACTION_MESSAGES.bulkVisibilitySuccess)
  } catch (err) {
    console.error('[Menu] Bulk toggle visibility error:', err)
    return createErrorResponse(MENU_ACTION_MESSAGES.serverError, 'unknown_error')
  }
}

// =============================================================================
// MODIFIER ACTIONS
// =============================================================================

/**
 * Create Product Modifier
 */
export async function createProductModifier(
  input: ProductModifierInput
): Promise<MenuActionResponse> {
  try {
    const validationResult = productModifierSchema.safeParse(input)
    if (!validationResult.success) {
      const firstError = validationResult.error.errors[0]
      return createErrorResponse(
        firstError?.message ?? MENU_ACTION_MESSAGES.validationError,
        'validation_error'
      )
    }

    const { data: modifier, error } = await dalCreateProductModifier(validationResult.data)

    if (error) {
      return createErrorResponse(error.message, mapDALError(error), error.details)
    }

    revalidatePath('/dashboard/products')

    return createSuccessResponse(MENU_ACTION_MESSAGES.modifierCreated, modifier)
  } catch (err) {
    console.error('[Menu] Create modifier error:', err)
    return createErrorResponse(MENU_ACTION_MESSAGES.serverError, 'unknown_error')
  }
}

/**
 * Create Modifier Option
 */
export async function createModifierOption(
  input: ModifierOptionInput
): Promise<MenuActionResponse> {
  try {
    const validationResult = modifierOptionSchema.safeParse(input)
    if (!validationResult.success) {
      const firstError = validationResult.error.errors[0]
      return createErrorResponse(
        firstError?.message ?? MENU_ACTION_MESSAGES.validationError,
        'validation_error'
      )
    }

    const { data: option, error } = await dalCreateModifierOption(validationResult.data)

    if (error) {
      return createErrorResponse(error.message, mapDALError(error), error.details)
    }

    revalidatePath('/dashboard/products')

    return createSuccessResponse(MENU_ACTION_MESSAGES.optionCreated, option)
  } catch (err) {
    console.error('[Menu] Create modifier option error:', err)
    return createErrorResponse(MENU_ACTION_MESSAGES.serverError, 'unknown_error')
  }
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Parse JSON field from FormData
 * Returns undefined if parsing fails or value is empty
 */
function parseJSONField(value: FormDataEntryValue | null): unknown {
  if (!value || typeof value !== 'string') return undefined

  try {
    const parsed = JSON.parse(value)
    // Return undefined for empty arrays/objects
    if (Array.isArray(parsed) && parsed.length === 0) return undefined
    if (typeof parsed === 'object' && parsed !== null && Object.keys(parsed).length === 0) {
      return undefined
    }
    return parsed
  } catch {
    return undefined
  }
}

// =============================================================================
// RE-EXPORTS FOR CONVENIENCE
// =============================================================================

