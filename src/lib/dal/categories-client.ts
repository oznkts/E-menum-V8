'use client'

/**
 * Categories DAL (Client)
 *
 * Client-safe read operations for categories.
 * Uses browser Supabase client (no next/headers).
 */

import { createClient } from '@/lib/supabase/client'
import type { Category } from '@/types/database'

// =============================================================================
// TYPES
// =============================================================================

export interface CategoryWithCount extends Category {
  product_count: number
}

export interface ListCategoriesOptions {
  includeDeleted?: boolean
  includeHidden?: boolean
  parentId?: string | null
  limit?: number
  offset?: number
}

export interface DALError {
  code: 'database_error' | 'permission_denied' | 'not_found' | 'unknown_error'
  message: string
  details?: string
}

export interface DALResponse<T> {
  data: T | null
  error: DALError | null
}

// =============================================================================
// HELPERS
// =============================================================================

function createErrorResponse<T>(
  code: DALError['code'],
  message: string,
  details?: string
): DALResponse<T> {
  return {
    data: null,
    error: { code, message, details },
  }
}

function createSuccessResponse<T>(data: T): DALResponse<T> {
  return {
    data,
    error: null,
  }
}

function mapSupabaseError(error: { code?: string; message: string }): DALError {
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
    message: 'Kategoriler yüklenemedi',
    details: error.message,
  }
}

// =============================================================================
// READ OPERATIONS
// =============================================================================

export async function getCategories(
  organizationId: string,
  options: ListCategoriesOptions = {}
): Promise<DALResponse<CategoryWithCount[]>> {
  try {
    const supabase = createClient()

    let query = supabase
      .from('categories')
      .select(
        `
        *,
        products!products_category_id_fkey(count)
      `
      )
      .eq('organization_id', organizationId)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true })

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
      return { data: null, error: mapSupabaseError(error) }
    }

    const categoriesWithCount: CategoryWithCount[] = (data ?? []).map(
      (category) => {
        const productCount = Array.isArray(category.products)
          ? (category.products[0] as { count: number } | undefined)?.count ?? 0
          : 0

        const { products: _, ...categoryData } = category
        return {
          ...categoryData,
          product_count: productCount,
        } as CategoryWithCount
      }
    )

    return createSuccessResponse(categoriesWithCount)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return createErrorResponse('unknown_error', 'Beklenmeyen bir hata oluştu', message)
  }
}
