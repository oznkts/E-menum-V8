/**
 * Products Data Access Layer (DAL)
 *
 * This module provides type-safe database operations for menu products.
 * All operations respect Row Level Security (RLS) policies.
 *
 * Features:
 * - CRUD operations (Create, Read, Update, Delete)
 * - Soft delete support (deleted_at column)
 * - Batch reordering for drag-and-drop
 * - Price management with ledger integration
 * - Multi-tenant isolation via organization_id
 * - Modifier support for product customization
 *
 * @module lib/dal/products
 */

import { createClient } from '@/lib/supabase/server'
import type {
  Product,
  ProductInsert,
  ProductUpdate,
  ProductModifier,
  ProductModifierInsert,
  ModifierOption,
  ModifierOptionInsert,
  Category,
  AllergenType,
  ProductStatus,
} from '@/types/database'

// =============================================================================
// TYPES
// =============================================================================

/**
 * Product with category information
 */
export interface ProductWithCategory extends Product {
  category: Category | null
}

/**
 * Product with all related data (modifiers, options)
 */
export interface ProductWithRelations extends Product {
  category: Category | null
  product_modifiers: (ProductModifier & {
    modifier_options: ModifierOption[]
  })[]
}

/**
 * Options for listing products
 */
export interface ListProductsOptions {
  /** Filter by category ID */
  categoryId?: string | null
  /** Include deleted products */
  includeDeleted?: boolean
  /** Include unavailable products */
  includeUnavailable?: boolean
  /** Filter by status */
  status?: ProductStatus
  /** Filter by featured only */
  featuredOnly?: boolean
  /** Search by name or description */
  search?: string
  /** Filter by allergens (exclude products with these allergens) */
  excludeAllergens?: AllergenType[]
  /** Filter by dietary flags */
  isVegetarian?: boolean
  isVegan?: boolean
  isGlutenFree?: boolean
  /** Limit number of results */
  limit?: number
  /** Offset for pagination */
  offset?: number
}

/**
 * Options for product count
 */
export interface CountProductsOptions {
  /** Filter by category ID */
  categoryId?: string | null
  /** Include deleted products */
  includeDeleted?: boolean
  /** Include unavailable products */
  includeUnavailable?: boolean
  /** Filter by status */
  status?: ProductStatus
}

/**
 * Sort order update item
 */
export interface SortOrderItem {
  id: string
  sort_order: number
}

/**
 * Standard DAL response
 */
export interface DALResponse<T> {
  data: T | null
  error: DALError | null
}

/**
 * DAL error type
 */
export interface DALError {
  code: DALErrorCode
  message: string
  details?: string
}

/**
 * DAL error codes
 */
export type DALErrorCode =
  | 'not_found'
  | 'already_exists'
  | 'validation_error'
  | 'permission_denied'
  | 'database_error'
  | 'unknown_error'

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Create a standardized error response
 */
function createErrorResponse<T>(
  code: DALErrorCode,
  message: string,
  details?: string
): DALResponse<T> {
  return {
    data: null,
    error: { code, message, details },
  }
}

/**
 * Create a standardized success response
 */
function createSuccessResponse<T>(data: T): DALResponse<T> {
  return {
    data,
    error: null,
  }
}

/**
 * Map Supabase error to DAL error
 */
function mapSupabaseError(error: { code?: string; message: string }): DALError {
  // Check for common Supabase/PostgreSQL error codes
  if (error.code === '23505') {
    return {
      code: 'already_exists',
      message: 'Bu slug zaten kullanılıyor',
      details: error.message,
    }
  }

  if (error.code === '42501' || error.message.includes('permission')) {
    return {
      code: 'permission_denied',
      message: 'Bu işlem için yetkiniz yok',
      details: error.message,
    }
  }

  if (error.code === 'PGRST116') {
    return {
      code: 'not_found',
      message: 'Ürün bulunamadı',
      details: error.message,
    }
  }

  return {
    code: 'database_error',
    message: 'Veritabanı hatası oluştu',
    details: error.message,
  }
}

/**
 * Generate a URL-friendly slug from a string
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    // Turkish character replacements
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    // Replace spaces and special chars with hyphens
    .replace(/[^a-z0-9]+/g, '-')
    // Remove leading/trailing hyphens
    .replace(/^-+|-+$/g, '')
}

// =============================================================================
// READ OPERATIONS
// =============================================================================

/**
 * Get all products for an organization
 *
 * @param organizationId - The organization UUID
 * @param options - List options (categoryId, includeDeleted, etc.)
 * @returns Products with category, sorted by sort_order
 *
 * @example
 * ```ts
 * const { data, error } = await getProducts(orgId, { categoryId: catId })
 * if (error) {
 *   // Handle error
 * }
 * // data is ProductWithCategory[]
 * ```
 */
export async function getProducts(
  organizationId: string,
  options: ListProductsOptions = {}
): Promise<DALResponse<ProductWithCategory[]>> {
  try {
    const supabase = await createClient()

    let query = supabase
      .from('products')
      .select(`
        *,
        category:categories(*)
      `)
      .eq('organization_id', organizationId)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true })

    // Apply filters
    if (!options.includeDeleted) {
      query = query.is('deleted_at', null)
    }

    if (!options.includeUnavailable) {
      query = query.eq('is_available', true)
    }

    if (options.categoryId !== undefined) {
      if (options.categoryId === null) {
        query = query.is('category_id', null)
      } else {
        query = query.eq('category_id', options.categoryId)
      }
    }

    if (options.status) {
      query = query.eq('status', options.status)
    }

    if (options.featuredOnly) {
      query = query.eq('is_featured', true)
    }

    if (options.search) {
      query = query.or(`name.ilike.%${options.search}%,description.ilike.%${options.search}%`)
    }

    if (options.isVegetarian !== undefined) {
      query = query.eq('is_vegetarian', options.isVegetarian)
    }

    if (options.isVegan !== undefined) {
      query = query.eq('is_vegan', options.isVegan)
    }

    if (options.isGlutenFree !== undefined) {
      query = query.eq('is_gluten_free', options.isGlutenFree)
    }

    // Note: excludeAllergens filter requires more complex handling
    // as allergens is an array column

    if (options.limit) {
      query = query.limit(options.limit)
    }

    if (options.offset) {
      query = query.range(
        options.offset,
        options.offset + (options.limit ?? 100) - 1
      )
    }

    const { data, error } = await query

    if (error) {
      return createErrorResponse('database_error', 'Ürünler yüklenemedi', error.message)
    }

    return createSuccessResponse(data as ProductWithCategory[])
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return createErrorResponse('unknown_error', 'Beklenmeyen bir hata oluştu', message)
  }
}

/**
 * Get a single product by ID with all relations
 *
 * @param productId - The product UUID
 * @param includeDeleted - Whether to include soft-deleted products
 * @returns The product with category and modifiers
 */
export async function getProductById(
  productId: string,
  includeDeleted = false
): Promise<DALResponse<ProductWithRelations>> {
  try {
    const supabase = await createClient()

    let query = supabase
      .from('products')
      .select(`
        *,
        category:categories(*),
        product_modifiers(
          *,
          modifier_options(*)
        )
      `)
      .eq('id', productId)

    if (!includeDeleted) {
      query = query.is('deleted_at', null)
    }

    const { data, error } = await query.single()

    if (error) {
      if (error.code === 'PGRST116') {
        return createErrorResponse('not_found', 'Ürün bulunamadı')
      }
      return createErrorResponse('database_error', 'Ürün yüklenemedi', error.message)
    }

    return createSuccessResponse(data as ProductWithRelations)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return createErrorResponse('unknown_error', 'Beklenmeyen bir hata oluştu', message)
  }
}

/**
 * Get a product by slug within an organization
 *
 * @param organizationId - The organization UUID
 * @param slug - The product slug
 * @param includeDeleted - Whether to include soft-deleted products
 * @returns The product or null if not found
 */
export async function getProductBySlug(
  organizationId: string,
  slug: string,
  includeDeleted = false
): Promise<DALResponse<ProductWithRelations>> {
  try {
    const supabase = await createClient()

    let query = supabase
      .from('products')
      .select(`
        *,
        category:categories(*),
        product_modifiers(
          *,
          modifier_options(*)
        )
      `)
      .eq('organization_id', organizationId)
      .eq('slug', slug)

    if (!includeDeleted) {
      query = query.is('deleted_at', null)
    }

    const { data, error } = await query.single()

    if (error) {
      if (error.code === 'PGRST116') {
        return createErrorResponse('not_found', 'Ürün bulunamadı')
      }
      return createErrorResponse('database_error', 'Ürün yüklenemedi', error.message)
    }

    return createSuccessResponse(data as ProductWithRelations)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return createErrorResponse('unknown_error', 'Beklenmeyen bir hata oluştu', message)
  }
}

/**
 * Count products for an organization
 *
 * @param organizationId - The organization UUID
 * @param options - Count options
 * @returns The number of products
 */
export async function countProducts(
  organizationId: string,
  options: CountProductsOptions = {}
): Promise<DALResponse<number>> {
  try {
    const supabase = await createClient()

    let query = supabase
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', organizationId)

    if (!options.includeDeleted) {
      query = query.is('deleted_at', null)
    }

    if (!options.includeUnavailable) {
      query = query.eq('is_available', true)
    }

    if (options.categoryId !== undefined) {
      if (options.categoryId === null) {
        query = query.is('category_id', null)
      } else {
        query = query.eq('category_id', options.categoryId)
      }
    }

    if (options.status) {
      query = query.eq('status', options.status)
    }

    const { count, error } = await query

    if (error) {
      return createErrorResponse('database_error', 'Ürün sayısı alınamadı', error.message)
    }

    return createSuccessResponse(count ?? 0)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return createErrorResponse('unknown_error', 'Beklenmeyen bir hata oluştu', message)
  }
}

/**
 * Check if a slug is available within an organization
 *
 * @param organizationId - The organization UUID
 * @param slug - The slug to check
 * @param excludeProductId - Optionally exclude a product (for updates)
 * @returns True if the slug is available
 */
export async function isSlugAvailable(
  organizationId: string,
  slug: string,
  excludeProductId?: string
): Promise<DALResponse<boolean>> {
  try {
    const supabase = await createClient()

    let query = supabase
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('slug', slug)

    if (excludeProductId) {
      query = query.neq('id', excludeProductId)
    }

    const { count, error } = await query

    if (error) {
      return createErrorResponse('database_error', 'Slug kontrolü yapılamadı', error.message)
    }

    return createSuccessResponse(count === 0)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return createErrorResponse('unknown_error', 'Beklenmeyen bir hata oluştu', message)
  }
}

/**
 * Get featured products for an organization
 *
 * @param organizationId - The organization UUID
 * @param limit - Maximum number of featured products to return
 * @returns Featured products
 */
export async function getFeaturedProducts(
  organizationId: string,
  limit = 10
): Promise<DALResponse<ProductWithCategory[]>> {
  return getProducts(organizationId, {
    featuredOnly: true,
    includeDeleted: false,
    includeUnavailable: false,
    limit,
  })
}

/**
 * Search products by name or description
 *
 * @param organizationId - The organization UUID
 * @param searchTerm - The search term
 * @param limit - Maximum number of results
 * @returns Matching products
 */
export async function searchProducts(
  organizationId: string,
  searchTerm: string,
  limit = 20
): Promise<DALResponse<ProductWithCategory[]>> {
  return getProducts(organizationId, {
    search: searchTerm,
    includeDeleted: false,
    includeUnavailable: false,
    limit,
  })
}

// =============================================================================
// WRITE OPERATIONS
// =============================================================================

/**
 * Create a new product
 *
 * @param data - The product data to insert
 * @returns The created product
 *
 * @example
 * ```ts
 * const { data, error } = await createProduct({
 *   organization_id: orgId,
 *   name: 'Adana Kebap',
 *   slug: 'adana-kebap',
 *   price: 250.00,
 * })
 * ```
 */
export async function createProduct(
  data: ProductInsert
): Promise<DALResponse<Product>> {
  try {
    const supabase = await createClient()

    // Auto-generate slug if not provided
    const slug = data.slug || generateSlug(data.name)

    // Get next sort_order if not provided
    let sortOrder = data.sort_order
    if (sortOrder === undefined) {
      const { data: maxOrder } = await supabase
        .from('products')
        .select('sort_order')
        .eq('organization_id', data.organization_id)
        .is('deleted_at', null)
        .order('sort_order', { ascending: false })
        .limit(1)
        .single()

      sortOrder = (maxOrder?.sort_order ?? -1) + 1
    }

    const { data: product, error } = await supabase
      .from('products')
      .insert({
        ...data,
        slug,
        sort_order: sortOrder,
      })
      .select()
      .single()

    if (error) {
      return { data: null, error: mapSupabaseError(error) }
    }

    return createSuccessResponse(product)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return createErrorResponse('unknown_error', 'Ürün oluşturulamadı', message)
  }
}

/**
 * Update an existing product
 *
 * @param productId - The product UUID
 * @param data - The fields to update
 * @returns The updated product
 */
export async function updateProduct(
  productId: string,
  data: ProductUpdate
): Promise<DALResponse<Product>> {
  try {
    const supabase = await createClient()

    // If name is being updated and slug is not provided, regenerate slug
    const updateData: ProductUpdate = { ...data }
    if (data.name && !data.slug) {
      updateData.slug = generateSlug(data.name)
    }

    const { data: product, error } = await supabase
      .from('products')
      .update(updateData)
      .eq('id', productId)
      .is('deleted_at', null)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return createErrorResponse('not_found', 'Ürün bulunamadı')
      }
      return { data: null, error: mapSupabaseError(error) }
    }

    return createSuccessResponse(product)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return createErrorResponse('unknown_error', 'Ürün güncellenemedi', message)
  }
}

/**
 * Update the sort order of multiple products (batch update for drag-and-drop)
 *
 * @param organizationId - The organization UUID
 * @param items - Array of { id, sort_order } items
 * @returns Success indicator
 */
export async function updateProductSortOrder(
  organizationId: string,
  items: SortOrderItem[]
): Promise<DALResponse<boolean>> {
  try {
    const supabase = await createClient()

    // Use a transaction-like approach by updating all at once
    const updates = items.map(async (item) => {
      return supabase
        .from('products')
        .update({ sort_order: item.sort_order })
        .eq('id', item.id)
        .eq('organization_id', organizationId)
    })

    const results = await Promise.all(updates)

    // Check for any errors
    const failedUpdate = results.find((result) => result.error)
    if (failedUpdate?.error) {
      return createErrorResponse(
        'database_error',
        'Sıralama güncellenemedi',
        failedUpdate.error.message
      )
    }

    return createSuccessResponse(true)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return createErrorResponse('unknown_error', 'Sıralama güncellenemedi', message)
  }
}

/**
 * Move product to a different category
 *
 * @param productId - The product UUID
 * @param categoryId - The new category UUID (null for uncategorized)
 * @returns The updated product
 */
export async function moveProductToCategory(
  productId: string,
  categoryId: string | null
): Promise<DALResponse<Product>> {
  return updateProduct(productId, { category_id: categoryId })
}

// =============================================================================
// DELETE OPERATIONS
// =============================================================================

/**
 * Soft delete a product (sets deleted_at timestamp)
 *
 * @param productId - The product UUID
 * @returns Success indicator
 */
export async function softDeleteProduct(
  productId: string
): Promise<DALResponse<boolean>> {
  try {
    const supabase = await createClient()

    const { error } = await supabase
      .from('products')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', productId)
      .is('deleted_at', null)

    if (error) {
      return { data: null, error: mapSupabaseError(error) }
    }

    return createSuccessResponse(true)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return createErrorResponse('unknown_error', 'Ürün silinemedi', message)
  }
}

/**
 * Restore a soft-deleted product
 *
 * @param productId - The product UUID
 * @returns The restored product
 */
export async function restoreProduct(
  productId: string
): Promise<DALResponse<Product>> {
  try {
    const supabase = await createClient()

    const { data: product, error } = await supabase
      .from('products')
      .update({ deleted_at: null })
      .eq('id', productId)
      .not('deleted_at', 'is', null)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return createErrorResponse('not_found', 'Silinmiş ürün bulunamadı')
      }
      return { data: null, error: mapSupabaseError(error) }
    }

    return createSuccessResponse(product)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return createErrorResponse('unknown_error', 'Ürün geri yüklenemedi', message)
  }
}

/**
 * Hard delete a product (permanent deletion)
 *
 * CAUTION: This permanently removes the product and all related data.
 *
 * @param productId - The product UUID
 * @returns Success indicator
 */
export async function hardDeleteProduct(
  productId: string
): Promise<DALResponse<boolean>> {
  try {
    const supabase = await createClient()

    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', productId)

    if (error) {
      return { data: null, error: mapSupabaseError(error) }
    }

    return createSuccessResponse(true)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return createErrorResponse('unknown_error', 'Ürün kalıcı olarak silinemedi', message)
  }
}

// =============================================================================
// AVAILABILITY OPERATIONS
// =============================================================================

/**
 * Set product availability
 *
 * @param productId - The product UUID
 * @param isAvailable - The new availability state
 * @returns The updated product
 */
export async function setProductAvailability(
  productId: string,
  isAvailable: boolean
): Promise<DALResponse<Product>> {
  return updateProduct(productId, { is_available: isAvailable })
}

/**
 * Mark product as out of stock
 */
export async function markOutOfStock(productId: string): Promise<DALResponse<Product>> {
  return updateProduct(productId, {
    is_available: false,
    status: 'out_of_stock',
  })
}

/**
 * Mark product as available
 */
export async function markAvailable(productId: string): Promise<DALResponse<Product>> {
  return updateProduct(productId, {
    is_available: true,
    status: 'active',
  })
}

/**
 * Set product featured status
 *
 * @param productId - The product UUID
 * @param isFeatured - The new featured state
 * @param featuredUntil - Optional end date for featured status
 * @returns The updated product
 */
export async function setProductFeatured(
  productId: string,
  isFeatured: boolean,
  featuredUntil?: string | null
): Promise<DALResponse<Product>> {
  return updateProduct(productId, {
    is_featured: isFeatured,
    featured_until: isFeatured ? featuredUntil : null,
  })
}

// =============================================================================
// UTILITY OPERATIONS
// =============================================================================

/**
 * Duplicate a product (creates a copy with " (Kopya)" suffix)
 *
 * @param productId - The product UUID to duplicate
 * @returns The new product
 */
export async function duplicateProduct(
  productId: string
): Promise<DALResponse<Product>> {
  try {
    // Get the original product
    const { data: original, error: fetchError } = await getProductById(productId)

    if (fetchError || !original) {
      return createErrorResponse('not_found', 'Kopyalanacak ürün bulunamadı')
    }

    // Create a copy with modified name and slug
    const newName = `${original.name} (Kopya)`
    const newSlug = generateSlug(newName)

    const {
      id: _,
      created_at: __,
      updated_at: ___,
      category: ____,
      product_modifiers: _____,
      ...productData
    } = original

    return createProduct({
      ...productData,
      name: newName,
      slug: newSlug,
      is_featured: false, // Don't copy featured status
      featured_until: null,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return createErrorResponse('unknown_error', 'Ürün kopyalanamadı', message)
  }
}

/**
 * Batch update product status
 *
 * @param organizationId - The organization UUID
 * @param productIds - Array of product UUIDs
 * @param status - The new status
 * @returns Success indicator
 */
export async function batchUpdateProductStatus(
  organizationId: string,
  productIds: string[],
  status: ProductStatus
): Promise<DALResponse<boolean>> {
  try {
    const supabase = await createClient()

    const { error } = await supabase
      .from('products')
      .update({ status })
      .eq('organization_id', organizationId)
      .in('id', productIds)

    if (error) {
      return createErrorResponse('database_error', 'Durum güncellenemedi', error.message)
    }

    return createSuccessResponse(true)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return createErrorResponse('unknown_error', 'Beklenmeyen bir hata oluştu', message)
  }
}

/**
 * Batch soft delete products
 *
 * @param organizationId - The organization UUID
 * @param productIds - Array of product UUIDs
 * @returns Success indicator
 */
export async function batchSoftDeleteProducts(
  organizationId: string,
  productIds: string[]
): Promise<DALResponse<boolean>> {
  try {
    const supabase = await createClient()

    const { error } = await supabase
      .from('products')
      .update({ deleted_at: new Date().toISOString() })
      .eq('organization_id', organizationId)
      .in('id', productIds)
      .is('deleted_at', null)

    if (error) {
      return createErrorResponse('database_error', 'Ürünler silinemedi', error.message)
    }

    return createSuccessResponse(true)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return createErrorResponse('unknown_error', 'Beklenmeyen bir hata oluştu', message)
  }
}

// =============================================================================
// PUBLIC MENU OPERATIONS (for customer-facing pages)
// =============================================================================

/**
 * Get available products for public menu display
 *
 * @param organizationId - The organization UUID
 * @param categoryId - Optional category filter
 * @returns Available, non-deleted products ordered by sort_order
 */
export async function getPublicProducts(
  organizationId: string,
  categoryId?: string
): Promise<DALResponse<ProductWithCategory[]>> {
  return getProducts(organizationId, {
    categoryId,
    includeDeleted: false,
    includeUnavailable: false,
    status: 'active',
  })
}

/**
 * Get a public product by slug (for product detail pages)
 *
 * @param organizationId - The organization UUID
 * @param slug - The product slug
 * @returns The product if available
 */
export async function getPublicProductBySlug(
  organizationId: string,
  slug: string
): Promise<DALResponse<ProductWithRelations>> {
  const result = await getProductBySlug(organizationId, slug, false)

  if (result.data && (!result.data.is_available || result.data.status !== 'active')) {
    return createErrorResponse('not_found', 'Ürün şu anda mevcut değil')
  }

  return result
}

// =============================================================================
// MODIFIER OPERATIONS
// =============================================================================

/**
 * Create a product modifier group
 *
 * @param data - The modifier data
 * @returns The created modifier
 */
export async function createProductModifier(
  data: ProductModifierInsert
): Promise<DALResponse<ProductModifier>> {
  try {
    const supabase = await createClient()

    // Get next sort_order if not provided
    let sortOrder = data.sort_order
    if (sortOrder === undefined) {
      const { data: maxOrder } = await supabase
        .from('product_modifiers')
        .select('sort_order')
        .eq('product_id', data.product_id)
        .is('deleted_at', null)
        .order('sort_order', { ascending: false })
        .limit(1)
        .single()

      sortOrder = (maxOrder?.sort_order ?? -1) + 1
    }

    const { data: modifier, error } = await supabase
      .from('product_modifiers')
      .insert({
        ...data,
        sort_order: sortOrder,
      })
      .select()
      .single()

    if (error) {
      return { data: null, error: mapSupabaseError(error) }
    }

    return createSuccessResponse(modifier)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return createErrorResponse('unknown_error', 'Seçenek grubu oluşturulamadı', message)
  }
}

/**
 * Create a modifier option
 *
 * @param data - The option data
 * @returns The created option
 */
export async function createModifierOption(
  data: ModifierOptionInsert
): Promise<DALResponse<ModifierOption>> {
  try {
    const supabase = await createClient()

    // Get next sort_order if not provided
    let sortOrder = data.sort_order
    if (sortOrder === undefined) {
      const { data: maxOrder } = await supabase
        .from('modifier_options')
        .select('sort_order')
        .eq('modifier_id', data.modifier_id)
        .is('deleted_at', null)
        .order('sort_order', { ascending: false })
        .limit(1)
        .single()

      sortOrder = (maxOrder?.sort_order ?? -1) + 1
    }

    const { data: option, error } = await supabase
      .from('modifier_options')
      .insert({
        ...data,
        sort_order: sortOrder,
      })
      .select()
      .single()

    if (error) {
      return { data: null, error: mapSupabaseError(error) }
    }

    return createSuccessResponse(option)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return createErrorResponse('unknown_error', 'Seçenek oluşturulamadı', message)
  }
}

/**
 * Get modifiers for a product
 *
 * @param productId - The product UUID
 * @returns The product modifiers with options
 */
export async function getProductModifiers(
  productId: string
): Promise<DALResponse<(ProductModifier & { modifier_options: ModifierOption[] })[]>> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('product_modifiers')
      .select(`
        *,
        modifier_options(*)
      `)
      .eq('product_id', productId)
      .is('deleted_at', null)
      .eq('is_visible', true)
      .order('sort_order', { ascending: true })

    if (error) {
      return createErrorResponse('database_error', 'Seçenekler yüklenemedi', error.message)
    }

    return createSuccessResponse(data as (ProductModifier & { modifier_options: ModifierOption[] })[])
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return createErrorResponse('unknown_error', 'Beklenmeyen bir hata oluştu', message)
  }
}
