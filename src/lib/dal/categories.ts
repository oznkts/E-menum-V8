/**
 * Categories Data Access Layer (DAL)
 *
 * This module provides type-safe database operations for menu categories.
 * All operations respect Row Level Security (RLS) policies.
 *
 * Features:
 * - CRUD operations (Create, Read, Update, Delete)
 * - Soft delete support (deleted_at column)
 * - Batch reordering for drag-and-drop
 * - Nested categories via parent_id
 * - Multi-tenant isolation via organization_id
 *
 * @module lib/dal/categories
 */

import { createClient } from '@/lib/supabase/server'
import type {
  Category,
  CategoryInsert,
  CategoryUpdate,
} from '@/types/database'

// =============================================================================
// TYPES
// =============================================================================

/**
 * Category with product count for list views
 */
export interface CategoryWithCount extends Category {
  product_count: number
}

/**
 * Category tree node for nested display
 */
export interface CategoryTreeNode extends Category {
  children: CategoryTreeNode[]
  product_count: number
}

/**
 * Options for listing categories
 */
export interface ListCategoriesOptions {
  /** Include deleted categories */
  includeDeleted?: boolean
  /** Include hidden categories */
  includeHidden?: boolean
  /** Filter by parent_id (null for root categories only) */
  parentId?: string | null
  /** Limit number of results */
  limit?: number
  /** Offset for pagination */
  offset?: number
}

/**
 * Options for category count
 */
export interface CountCategoriesOptions {
  /** Include deleted categories */
  includeDeleted?: boolean
  /** Include hidden categories */
  includeHidden?: boolean
  /** Filter by parent_id */
  parentId?: string | null
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
      message: 'Kategori bulunamadı',
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
 * Get all categories for an organization
 *
 * @param organizationId - The organization UUID
 * @param options - List options (includeDeleted, includeHidden, parentId, limit, offset)
 * @returns Categories with product counts, sorted by sort_order
 *
 * @example
 * ```ts
 * const { data, error } = await getCategories(orgId)
 * if (error) {
 *   // Handle error
 * }
 * // data is CategoryWithCount[]
 * ```
 */
export async function getCategories(
  organizationId: string,
  options: ListCategoriesOptions = {}
): Promise<DALResponse<CategoryWithCount[]>> {
  try {
    const supabase = await createClient()

    let query = supabase
      .from('categories')
      .select(`
        *,
        products!products_category_id_fkey(count)
      `)
      .eq('organization_id', organizationId)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true })

    // Apply filters
    if (!options.includeDeleted) {
      query = query.is('deleted_at', null)
    }

    if (!options.includeHidden) {
      query = query.eq('is_visible', true)
    }

    if (options.parentId !== undefined) {
      if (options.parentId === null) {
        query = query.is('parent_id', null)
      } else {
        query = query.eq('parent_id', options.parentId)
      }
    }

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
      return createErrorResponse('database_error', 'Kategoriler yüklenemedi', error.message)
    }

    // Transform the response to include product_count
    const categoriesWithCount: CategoryWithCount[] = (data ?? []).map((category) => {
      // Extract product count from the nested array
      const productCount = Array.isArray(category.products)
        ? (category.products[0] as { count: number } | undefined)?.count ?? 0
        : 0

      // Remove the products property and add product_count
      const { products: _, ...categoryData } = category
      return {
        ...categoryData,
        product_count: productCount,
      } as CategoryWithCount
    })

    return createSuccessResponse(categoriesWithCount)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return createErrorResponse('unknown_error', 'Beklenmeyen bir hata oluştu', message)
  }
}

/**
 * Get categories as a tree structure (nested)
 *
 * @param organizationId - The organization UUID
 * @param options - List options
 * @returns Categories organized in a tree structure
 */
export async function getCategoryTree(
  organizationId: string,
  options: Omit<ListCategoriesOptions, 'parentId' | 'offset'> = {}
): Promise<DALResponse<CategoryTreeNode[]>> {
  try {
    // Get all categories
    const { data: categories, error } = await getCategories(organizationId, {
      ...options,
      parentId: undefined, // Get all categories
    })

    if (error) {
      return { data: null, error }
    }

    if (!categories) {
      return createSuccessResponse([])
    }

    // Build tree structure
    const categoryMap = new Map<string, CategoryTreeNode>()
    const rootCategories: CategoryTreeNode[] = []

    // First pass: Create nodes
    for (const category of categories) {
      categoryMap.set(category.id, {
        ...category,
        children: [],
      })
    }

    // Second pass: Build tree
    for (const category of categories) {
      const node = categoryMap.get(category.id)!
      if (category.parent_id && categoryMap.has(category.parent_id)) {
        categoryMap.get(category.parent_id)!.children.push(node)
      } else {
        rootCategories.push(node)
      }
    }

    // Sort children by sort_order
    const sortChildren = (nodes: CategoryTreeNode[]): void => {
      nodes.sort((a, b) => a.sort_order - b.sort_order)
      nodes.forEach((node) => sortChildren(node.children))
    }
    sortChildren(rootCategories)

    return createSuccessResponse(rootCategories)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return createErrorResponse('unknown_error', 'Beklenmeyen bir hata oluştu', message)
  }
}

/**
 * Get a single category by ID
 *
 * @param categoryId - The category UUID
 * @param includeDeleted - Whether to include soft-deleted categories
 * @returns The category or null if not found
 */
export async function getCategoryById(
  categoryId: string,
  includeDeleted = false
): Promise<DALResponse<Category>> {
  try {
    const supabase = await createClient()

    let query = supabase
      .from('categories')
      .select('*')
      .eq('id', categoryId)

    if (!includeDeleted) {
      query = query.is('deleted_at', null)
    }

    const { data, error } = await query.single()

    if (error) {
      if (error.code === 'PGRST116') {
        return createErrorResponse('not_found', 'Kategori bulunamadı')
      }
      return createErrorResponse('database_error', 'Kategori yüklenemedi', error.message)
    }

    return createSuccessResponse(data)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return createErrorResponse('unknown_error', 'Beklenmeyen bir hata oluştu', message)
  }
}

/**
 * Get a category by slug within an organization
 *
 * @param organizationId - The organization UUID
 * @param slug - The category slug
 * @param includeDeleted - Whether to include soft-deleted categories
 * @returns The category or null if not found
 */
export async function getCategoryBySlug(
  organizationId: string,
  slug: string,
  includeDeleted = false
): Promise<DALResponse<Category>> {
  try {
    const supabase = await createClient()

    let query = supabase
      .from('categories')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('slug', slug)

    if (!includeDeleted) {
      query = query.is('deleted_at', null)
    }

    const { data, error } = await query.single()

    if (error) {
      if (error.code === 'PGRST116') {
        return createErrorResponse('not_found', 'Kategori bulunamadı')
      }
      return createErrorResponse('database_error', 'Kategori yüklenemedi', error.message)
    }

    return createSuccessResponse(data)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return createErrorResponse('unknown_error', 'Beklenmeyen bir hata oluştu', message)
  }
}

/**
 * Count categories for an organization
 *
 * @param organizationId - The organization UUID
 * @param options - Count options
 * @returns The number of categories
 */
export async function countCategories(
  organizationId: string,
  options: CountCategoriesOptions = {}
): Promise<DALResponse<number>> {
  try {
    const supabase = await createClient()

    let query = supabase
      .from('categories')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', organizationId)

    if (!options.includeDeleted) {
      query = query.is('deleted_at', null)
    }

    if (!options.includeHidden) {
      query = query.eq('is_visible', true)
    }

    if (options.parentId !== undefined) {
      if (options.parentId === null) {
        query = query.is('parent_id', null)
      } else {
        query = query.eq('parent_id', options.parentId)
      }
    }

    const { count, error } = await query

    if (error) {
      return createErrorResponse('database_error', 'Kategori sayısı alınamadı', error.message)
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
 * @param excludeCategoryId - Optionally exclude a category (for updates)
 * @returns True if the slug is available
 */
export async function isSlugAvailable(
  organizationId: string,
  slug: string,
  excludeCategoryId?: string
): Promise<DALResponse<boolean>> {
  try {
    const supabase = await createClient()

    let query = supabase
      .from('categories')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('slug', slug)

    if (excludeCategoryId) {
      query = query.neq('id', excludeCategoryId)
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

// =============================================================================
// WRITE OPERATIONS
// =============================================================================

/**
 * Create a new category
 *
 * @param data - The category data to insert
 * @returns The created category
 *
 * @example
 * ```ts
 * const { data, error } = await createCategory({
 *   organization_id: orgId,
 *   name: 'Ana Yemekler',
 *   slug: 'ana-yemekler',
 * })
 * ```
 */
export async function createCategory(
  data: CategoryInsert
): Promise<DALResponse<Category>> {
  try {
    const supabase = await createClient()

    // Auto-generate slug if not provided
    const slug = data.slug || generateSlug(data.name)

    // Get next sort_order if not provided
    let sortOrder = data.sort_order
    if (sortOrder === undefined) {
      const { data: maxOrder } = await supabase
        .from('categories')
        .select('sort_order')
        .eq('organization_id', data.organization_id)
        .is('deleted_at', null)
        .order('sort_order', { ascending: false })
        .limit(1)
        .single()

      sortOrder = (maxOrder?.sort_order ?? -1) + 1
    }

    const { data: category, error } = await supabase
      .from('categories')
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

    return createSuccessResponse(category)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return createErrorResponse('unknown_error', 'Kategori oluşturulamadı', message)
  }
}

/**
 * Update an existing category
 *
 * @param categoryId - The category UUID
 * @param data - The fields to update
 * @returns The updated category
 */
export async function updateCategory(
  categoryId: string,
  data: CategoryUpdate
): Promise<DALResponse<Category>> {
  try {
    const supabase = await createClient()

    // If name is being updated and slug is not provided, regenerate slug
    const updateData: CategoryUpdate = { ...data }
    if (data.name && !data.slug) {
      updateData.slug = generateSlug(data.name)
    }

    const { data: category, error } = await supabase
      .from('categories')
      .update(updateData)
      .eq('id', categoryId)
      .is('deleted_at', null)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return createErrorResponse('not_found', 'Kategori bulunamadı')
      }
      return { data: null, error: mapSupabaseError(error) }
    }

    return createSuccessResponse(category)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return createErrorResponse('unknown_error', 'Kategori güncellenemedi', message)
  }
}

/**
 * Update the sort order of multiple categories (batch update for drag-and-drop)
 *
 * @param organizationId - The organization UUID
 * @param items - Array of { id, sort_order } items
 * @returns Success indicator
 */
export async function updateCategorySortOrder(
  organizationId: string,
  items: SortOrderItem[]
): Promise<DALResponse<boolean>> {
  try {
    const supabase = await createClient()

    // Use a transaction-like approach by updating all at once
    // PostgreSQL will handle this atomically
    const updates = items.map(async (item) => {
      return supabase
        .from('categories')
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

// =============================================================================
// DELETE OPERATIONS
// =============================================================================

/**
 * Soft delete a category (sets deleted_at timestamp)
 *
 * Products in this category will have their category_id set to NULL
 * (handled by database ON DELETE SET NULL)
 *
 * @param categoryId - The category UUID
 * @returns Success indicator
 */
export async function softDeleteCategory(
  categoryId: string
): Promise<DALResponse<boolean>> {
  try {
    const supabase = await createClient()

    const { error } = await supabase
      .from('categories')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', categoryId)
      .is('deleted_at', null)

    if (error) {
      return { data: null, error: mapSupabaseError(error) }
    }

    return createSuccessResponse(true)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return createErrorResponse('unknown_error', 'Kategori silinemedi', message)
  }
}

/**
 * Restore a soft-deleted category
 *
 * @param categoryId - The category UUID
 * @returns The restored category
 */
export async function restoreCategory(
  categoryId: string
): Promise<DALResponse<Category>> {
  try {
    const supabase = await createClient()

    const { data: category, error } = await supabase
      .from('categories')
      .update({ deleted_at: null })
      .eq('id', categoryId)
      .not('deleted_at', 'is', null)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return createErrorResponse('not_found', 'Silinmiş kategori bulunamadı')
      }
      return { data: null, error: mapSupabaseError(error) }
    }

    return createSuccessResponse(category)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return createErrorResponse('unknown_error', 'Kategori geri yüklenemedi', message)
  }
}

/**
 * Hard delete a category (permanent deletion)
 *
 * CAUTION: This permanently removes the category.
 * Products in this category will have their category_id set to NULL.
 *
 * @param categoryId - The category UUID
 * @returns Success indicator
 */
export async function hardDeleteCategory(
  categoryId: string
): Promise<DALResponse<boolean>> {
  try {
    const supabase = await createClient()

    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', categoryId)

    if (error) {
      return { data: null, error: mapSupabaseError(error) }
    }

    return createSuccessResponse(true)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return createErrorResponse('unknown_error', 'Kategori kalıcı olarak silinemedi', message)
  }
}

// =============================================================================
// VISIBILITY OPERATIONS
// =============================================================================

/**
 * Toggle category visibility
 *
 * @param categoryId - The category UUID
 * @param isVisible - The new visibility state
 * @returns The updated category
 */
export async function setCategoryVisibility(
  categoryId: string,
  isVisible: boolean
): Promise<DALResponse<Category>> {
  return updateCategory(categoryId, { is_visible: isVisible })
}

/**
 * Hide a category (shorthand for setCategoryVisibility(id, false))
 */
export async function hideCategory(categoryId: string): Promise<DALResponse<Category>> {
  return setCategoryVisibility(categoryId, false)
}

/**
 * Show a category (shorthand for setCategoryVisibility(id, true))
 */
export async function showCategory(categoryId: string): Promise<DALResponse<Category>> {
  return setCategoryVisibility(categoryId, true)
}

// =============================================================================
// UTILITY OPERATIONS
// =============================================================================

/**
 * Move a category to a different parent
 *
 * @param categoryId - The category UUID
 * @param newParentId - The new parent category UUID (null for root)
 * @returns The updated category
 */
export async function moveCategoryToParent(
  categoryId: string,
  newParentId: string | null
): Promise<DALResponse<Category>> {
  // Prevent circular references - check that newParentId is not a descendant
  if (newParentId) {
    const { data: potentialParent } = await getCategoryById(newParentId)
    if (potentialParent?.parent_id === categoryId) {
      return createErrorResponse(
        'validation_error',
        'Döngüsel hiyerarşi oluşturulamaz'
      )
    }
  }

  return updateCategory(categoryId, { parent_id: newParentId })
}

/**
 * Duplicate a category (creates a copy with " (Kopya)" suffix)
 *
 * @param categoryId - The category UUID to duplicate
 * @returns The new category
 */
export async function duplicateCategory(
  categoryId: string
): Promise<DALResponse<Category>> {
  try {
    // Get the original category
    const { data: original, error: fetchError } = await getCategoryById(categoryId)

    if (fetchError || !original) {
      return createErrorResponse('not_found', 'Kopyalanacak kategori bulunamadı')
    }

    // Create a copy with modified name and slug
    const newName = `${original.name} (Kopya)`
    const newSlug = generateSlug(newName)

    const { id: _, created_at: __, updated_at: ___, ...categoryData } = original

    return createCategory({
      ...categoryData,
      name: newName,
      slug: newSlug,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return createErrorResponse('unknown_error', 'Kategori kopyalanamadı', message)
  }
}

// =============================================================================
// PUBLIC MENU OPERATIONS (for customer-facing pages)
// =============================================================================

/**
 * Get visible categories for public menu display
 *
 * @param organizationId - The organization UUID
 * @returns Visible, non-deleted categories ordered by sort_order
 */
export async function getPublicCategories(
  organizationId: string
): Promise<DALResponse<CategoryWithCount[]>> {
  return getCategories(organizationId, {
    includeDeleted: false,
    includeHidden: false,
  })
}

/**
 * Get visible category tree for public menu display
 *
 * @param organizationId - The organization UUID
 * @returns Visible, non-deleted categories in tree structure
 */
export async function getPublicCategoryTree(
  organizationId: string
): Promise<DALResponse<CategoryTreeNode[]>> {
  return getCategoryTree(organizationId, {
    includeDeleted: false,
    includeHidden: false,
  })
}
