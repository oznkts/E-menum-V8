/**
 * Restaurant Tables Data Access Layer (DAL)
 *
 * This module provides type-safe database operations for restaurant tables.
 * All operations respect Row Level Security (RLS) policies.
 *
 * Features:
 * - CRUD operations (Create, Read, Update, Delete)
 * - Soft delete support (deleted_at column)
 * - Batch reordering for drag-and-drop
 * - QR code UUID management
 * - Table status tracking
 * - Multi-tenant isolation via organization_id
 *
 * @module lib/dal/tables
 */

import { createClient } from '@/lib/supabase/server'
import type {
  RestaurantTable,
  RestaurantTableInsert,
  RestaurantTableUpdate,
  TableStatus,
} from '@/types/database'

// =============================================================================
// TYPES
// =============================================================================

/**
 * Table with order count for list views
 */
export interface TableWithStats extends RestaurantTable {
  active_orders_count: number
}

/**
 * Options for listing tables
 */
export interface ListTablesOptions {
  /** Include deleted tables */
  includeDeleted?: boolean
  /** Include hidden tables */
  includeHidden?: boolean
  /** Filter by section */
  section?: string | null
  /** Filter by floor */
  floor?: number | null
  /** Filter by status */
  status?: TableStatus | null
  /** Filter by outdoor tables only */
  outdoorOnly?: boolean
  /** Filter by accessible tables only */
  accessibleOnly?: boolean
  /** Search by name or table number */
  search?: string
  /** Limit number of results */
  limit?: number
  /** Offset for pagination */
  offset?: number
}

/**
 * Options for table count
 */
export interface CountTablesOptions {
  /** Include deleted tables */
  includeDeleted?: boolean
  /** Include hidden tables */
  includeHidden?: boolean
  /** Filter by status */
  status?: TableStatus | null
  /** Filter by section */
  section?: string | null
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
      message: 'Bu masa numarası zaten kullanılıyor',
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
      message: 'Masa bulunamadı',
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
 * Generate a random UUID for QR codes
 */
function generateQRUuid(): string {
  return crypto.randomUUID()
}

// =============================================================================
// READ OPERATIONS
// =============================================================================

/**
 * Get all tables for an organization
 *
 * @param organizationId - The organization UUID
 * @param options - List options
 * @returns Tables sorted by sort_order
 *
 * @example
 * ```ts
 * const { data, error } = await getTables(orgId)
 * if (error) {
 *   // Handle error
 * }
 * // data is RestaurantTable[]
 * ```
 */
export async function getTables(
  organizationId: string,
  options: ListTablesOptions = {}
): Promise<DALResponse<RestaurantTable[]>> {
  try {
    const supabase = await createClient()

    let query = supabase
      .from('restaurant_tables')
      .select('*')
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

    if (options.section !== undefined) {
      if (options.section === null) {
        query = query.is('section', null)
      } else {
        query = query.eq('section', options.section)
      }
    }

    if (options.floor !== undefined) {
      if (options.floor === null) {
        query = query.is('floor', null)
      } else {
        query = query.eq('floor', options.floor)
      }
    }

    if (options.status) {
      query = query.eq('status', options.status)
    }

    if (options.outdoorOnly) {
      query = query.eq('is_outdoor', true)
    }

    if (options.accessibleOnly) {
      query = query.eq('is_accessible', true)
    }

    if (options.search) {
      query = query.or(`name.ilike.%${options.search}%,table_number.ilike.%${options.search}%`)
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
      return createErrorResponse('database_error', 'Masalar yüklenemedi', error.message)
    }

    return createSuccessResponse(data ?? [])
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return createErrorResponse('unknown_error', 'Beklenmeyen bir hata oluştu', message)
  }
}

/**
 * Get a single table by ID
 *
 * @param tableId - The table UUID
 * @param includeDeleted - Whether to include soft-deleted tables
 * @returns The table or null if not found
 */
export async function getTableById(
  tableId: string,
  includeDeleted = false
): Promise<DALResponse<RestaurantTable>> {
  try {
    const supabase = await createClient()

    let query = supabase
      .from('restaurant_tables')
      .select('*')
      .eq('id', tableId)

    if (!includeDeleted) {
      query = query.is('deleted_at', null)
    }

    const { data, error } = await query.single()

    if (error) {
      if (error.code === 'PGRST116') {
        return createErrorResponse('not_found', 'Masa bulunamadı')
      }
      return createErrorResponse('database_error', 'Masa yüklenemedi', error.message)
    }

    return createSuccessResponse(data)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return createErrorResponse('unknown_error', 'Beklenmeyen bir hata oluştu', message)
  }
}

/**
 * Get a table by QR UUID
 *
 * @param qrUuid - The QR code UUID
 * @returns The table or null if not found
 */
export async function getTableByQRUuid(
  qrUuid: string
): Promise<DALResponse<RestaurantTable>> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('restaurant_tables')
      .select('*')
      .eq('qr_uuid', qrUuid)
      .is('deleted_at', null)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return createErrorResponse('not_found', 'Masa bulunamadı')
      }
      return createErrorResponse('database_error', 'Masa yüklenemedi', error.message)
    }

    return createSuccessResponse(data)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return createErrorResponse('unknown_error', 'Beklenmeyen bir hata oluştu', message)
  }
}

/**
 * Count tables for an organization
 *
 * @param organizationId - The organization UUID
 * @param options - Count options
 * @returns The number of tables
 */
export async function countTables(
  organizationId: string,
  options: CountTablesOptions = {}
): Promise<DALResponse<number>> {
  try {
    const supabase = await createClient()

    let query = supabase
      .from('restaurant_tables')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', organizationId)

    if (!options.includeDeleted) {
      query = query.is('deleted_at', null)
    }

    if (!options.includeHidden) {
      query = query.eq('is_visible', true)
    }

    if (options.status) {
      query = query.eq('status', options.status)
    }

    if (options.section !== undefined) {
      if (options.section === null) {
        query = query.is('section', null)
      } else {
        query = query.eq('section', options.section)
      }
    }

    const { count, error } = await query

    if (error) {
      return createErrorResponse('database_error', 'Masa sayısı alınamadı', error.message)
    }

    return createSuccessResponse(count ?? 0)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return createErrorResponse('unknown_error', 'Beklenmeyen bir hata oluştu', message)
  }
}

/**
 * Get unique sections for an organization
 *
 * @param organizationId - The organization UUID
 * @returns Array of unique section names
 */
export async function getTableSections(
  organizationId: string
): Promise<DALResponse<string[]>> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('restaurant_tables')
      .select('section')
      .eq('organization_id', organizationId)
      .is('deleted_at', null)
      .not('section', 'is', null)
      .order('section')

    if (error) {
      return createErrorResponse('database_error', 'Bölümler yüklenemedi', error.message)
    }

    // Extract unique sections
    const sections = [...new Set(data?.map((t) => t.section).filter(Boolean) as string[])]

    return createSuccessResponse(sections)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return createErrorResponse('unknown_error', 'Beklenmeyen bir hata oluştu', message)
  }
}

/**
 * Get table status counts for dashboard
 *
 * @param organizationId - The organization UUID
 * @returns Count of tables by status
 */
export async function getTableStatusCounts(
  organizationId: string
): Promise<DALResponse<Record<TableStatus, number>>> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('restaurant_tables')
      .select('status')
      .eq('organization_id', organizationId)
      .is('deleted_at', null)
      .eq('is_visible', true)

    if (error) {
      return createErrorResponse('database_error', 'Masa durumları yüklenemedi', error.message)
    }

    // Count by status
    const counts: Record<TableStatus, number> = {
      available: 0,
      occupied: 0,
      reserved: 0,
      cleaning: 0,
      out_of_service: 0,
    }

    data?.forEach((table) => {
      if (table.status && table.status in counts) {
        counts[table.status as TableStatus]++
      }
    })

    return createSuccessResponse(counts)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return createErrorResponse('unknown_error', 'Beklenmeyen bir hata oluştu', message)
  }
}

// =============================================================================
// WRITE OPERATIONS
// =============================================================================

/**
 * Create a new table
 *
 * @param data - The table data to insert
 * @returns The created table
 *
 * @example
 * ```ts
 * const { data, error } = await createTable({
 *   organization_id: orgId,
 *   name: 'Masa 1',
 *   table_number: '1',
 * })
 * ```
 */
export async function createTable(
  data: RestaurantTableInsert
): Promise<DALResponse<RestaurantTable>> {
  try {
    const supabase = await createClient()

    // Generate QR UUID if not provided
    const qrUuid = data.qr_uuid || generateQRUuid()

    // Get next sort_order if not provided
    let sortOrder = data.sort_order
    if (sortOrder === undefined) {
      const { data: maxOrder } = await supabase
        .from('restaurant_tables')
        .select('sort_order')
        .eq('organization_id', data.organization_id)
        .is('deleted_at', null)
        .order('sort_order', { ascending: false })
        .limit(1)
        .single()

      sortOrder = (maxOrder?.sort_order ?? -1) + 1
    }

    const { data: table, error } = await supabase
      .from('restaurant_tables')
      .insert({
        ...data,
        qr_uuid: qrUuid,
        qr_code_generated_at: new Date().toISOString(),
        sort_order: sortOrder,
      })
      .select()
      .single()

    if (error) {
      return { data: null, error: mapSupabaseError(error) }
    }

    return createSuccessResponse(table)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return createErrorResponse('unknown_error', 'Masa oluşturulamadı', message)
  }
}

/**
 * Update an existing table
 *
 * @param tableId - The table UUID
 * @param data - The fields to update
 * @returns The updated table
 */
export async function updateTable(
  tableId: string,
  data: RestaurantTableUpdate
): Promise<DALResponse<RestaurantTable>> {
  try {
    const supabase = await createClient()

    const { data: table, error } = await supabase
      .from('restaurant_tables')
      .update(data)
      .eq('id', tableId)
      .is('deleted_at', null)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return createErrorResponse('not_found', 'Masa bulunamadı')
      }
      return { data: null, error: mapSupabaseError(error) }
    }

    return createSuccessResponse(table)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return createErrorResponse('unknown_error', 'Masa güncellenemedi', message)
  }
}

/**
 * Update the sort order of multiple tables (batch update for drag-and-drop)
 *
 * @param organizationId - The organization UUID
 * @param items - Array of { id, sort_order } items
 * @returns Success indicator
 */
export async function updateTableSortOrder(
  organizationId: string,
  items: SortOrderItem[]
): Promise<DALResponse<boolean>> {
  try {
    const supabase = await createClient()

    // Use a transaction-like approach by updating all at once
    const updates = items.map(async (item) => {
      return supabase
        .from('restaurant_tables')
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
 * Update table status
 *
 * @param tableId - The table UUID
 * @param status - The new status
 * @param userId - Optional user ID who changed the status
 * @returns The updated table
 */
export async function updateTableStatus(
  tableId: string,
  status: TableStatus,
  userId?: string
): Promise<DALResponse<RestaurantTable>> {
  const updateData: RestaurantTableUpdate = {
    status,
    status_changed_at: new Date().toISOString(),
    status_changed_by: userId || null,
  }

  // Clear occupancy data when table becomes available
  if (status === 'available') {
    updateData.current_order_id = null
    updateData.occupied_at = null
    updateData.occupied_by = null
  }

  return updateTable(tableId, updateData)
}

/**
 * Regenerate QR UUID for a table
 *
 * @param tableId - The table UUID
 * @returns The updated table with new QR UUID
 */
export async function regenerateQRCode(
  tableId: string
): Promise<DALResponse<RestaurantTable>> {
  return updateTable(tableId, {
    qr_uuid: generateQRUuid(),
    qr_code_generated_at: new Date().toISOString(),
  })
}

// =============================================================================
// DELETE OPERATIONS
// =============================================================================

/**
 * Soft delete a table (sets deleted_at timestamp)
 *
 * @param tableId - The table UUID
 * @returns Success indicator
 */
export async function softDeleteTable(
  tableId: string
): Promise<DALResponse<boolean>> {
  try {
    const supabase = await createClient()

    const { error } = await supabase
      .from('restaurant_tables')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', tableId)
      .is('deleted_at', null)

    if (error) {
      return { data: null, error: mapSupabaseError(error) }
    }

    return createSuccessResponse(true)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return createErrorResponse('unknown_error', 'Masa silinemedi', message)
  }
}

/**
 * Restore a soft-deleted table
 *
 * @param tableId - The table UUID
 * @returns The restored table
 */
export async function restoreTable(
  tableId: string
): Promise<DALResponse<RestaurantTable>> {
  try {
    const supabase = await createClient()

    const { data: table, error } = await supabase
      .from('restaurant_tables')
      .update({ deleted_at: null })
      .eq('id', tableId)
      .not('deleted_at', 'is', null)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return createErrorResponse('not_found', 'Silinmiş masa bulunamadı')
      }
      return { data: null, error: mapSupabaseError(error) }
    }

    return createSuccessResponse(table)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return createErrorResponse('unknown_error', 'Masa geri yüklenemedi', message)
  }
}

/**
 * Hard delete a table (permanent deletion)
 *
 * CAUTION: This permanently removes the table.
 *
 * @param tableId - The table UUID
 * @returns Success indicator
 */
export async function hardDeleteTable(
  tableId: string
): Promise<DALResponse<boolean>> {
  try {
    const supabase = await createClient()

    const { error } = await supabase
      .from('restaurant_tables')
      .delete()
      .eq('id', tableId)

    if (error) {
      return { data: null, error: mapSupabaseError(error) }
    }

    return createSuccessResponse(true)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return createErrorResponse('unknown_error', 'Masa kalıcı olarak silinemedi', message)
  }
}

// =============================================================================
// VISIBILITY OPERATIONS
// =============================================================================

/**
 * Toggle table visibility
 *
 * @param tableId - The table UUID
 * @param isVisible - The new visibility state
 * @returns The updated table
 */
export async function setTableVisibility(
  tableId: string,
  isVisible: boolean
): Promise<DALResponse<RestaurantTable>> {
  return updateTable(tableId, { is_visible: isVisible })
}

/**
 * Hide a table
 */
export async function hideTable(tableId: string): Promise<DALResponse<RestaurantTable>> {
  return setTableVisibility(tableId, false)
}

/**
 * Show a table
 */
export async function showTable(tableId: string): Promise<DALResponse<RestaurantTable>> {
  return setTableVisibility(tableId, true)
}

// =============================================================================
// BATCH OPERATIONS
// =============================================================================

/**
 * Create multiple tables at once
 *
 * @param organizationId - The organization UUID
 * @param count - Number of tables to create
 * @param startNumber - Starting table number
 * @param section - Optional section for all tables
 * @returns The created tables
 */
export async function batchCreateTables(
  organizationId: string,
  count: number,
  startNumber: number = 1,
  section?: string
): Promise<DALResponse<RestaurantTable[]>> {
  try {
    const supabase = await createClient()

    // Get current max sort_order
    const { data: maxOrder } = await supabase
      .from('restaurant_tables')
      .select('sort_order')
      .eq('organization_id', organizationId)
      .is('deleted_at', null)
      .order('sort_order', { ascending: false })
      .limit(1)
      .single()

    const baseSortOrder = (maxOrder?.sort_order ?? -1) + 1

    // Create tables data
    const tablesToCreate: RestaurantTableInsert[] = []
    for (let i = 0; i < count; i++) {
      const tableNumber = String(startNumber + i)
      tablesToCreate.push({
        organization_id: organizationId,
        name: `Masa ${tableNumber}`,
        table_number: tableNumber,
        qr_uuid: generateQRUuid(),
        qr_code_generated_at: new Date().toISOString(),
        section: section || null,
        sort_order: baseSortOrder + i,
        capacity: 4,
        status: 'available',
        is_visible: true,
        is_accessible: false,
        is_outdoor: false,
      })
    }

    const { data: tables, error } = await supabase
      .from('restaurant_tables')
      .insert(tablesToCreate)
      .select()

    if (error) {
      return { data: null, error: mapSupabaseError(error) }
    }

    return createSuccessResponse(tables)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return createErrorResponse('unknown_error', 'Masalar toplu olarak oluşturulamadı', message)
  }
}

/**
 * Batch update table status
 *
 * @param organizationId - The organization UUID
 * @param tableIds - Array of table UUIDs
 * @param status - The new status
 * @returns Success indicator
 */
export async function batchUpdateTableStatus(
  organizationId: string,
  tableIds: string[],
  status: TableStatus
): Promise<DALResponse<boolean>> {
  try {
    const supabase = await createClient()

    const { error } = await supabase
      .from('restaurant_tables')
      .update({
        status,
        status_changed_at: new Date().toISOString(),
      })
      .eq('organization_id', organizationId)
      .in('id', tableIds)

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
 * Batch soft delete tables
 *
 * @param organizationId - The organization UUID
 * @param tableIds - Array of table UUIDs
 * @returns Success indicator
 */
export async function batchSoftDeleteTables(
  organizationId: string,
  tableIds: string[]
): Promise<DALResponse<boolean>> {
  try {
    const supabase = await createClient()

    const { error } = await supabase
      .from('restaurant_tables')
      .update({ deleted_at: new Date().toISOString() })
      .eq('organization_id', organizationId)
      .in('id', tableIds)
      .is('deleted_at', null)

    if (error) {
      return createErrorResponse('database_error', 'Masalar silinemedi', error.message)
    }

    return createSuccessResponse(true)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return createErrorResponse('unknown_error', 'Beklenmeyen bir hata oluştu', message)
  }
}

// =============================================================================
// PUBLIC OPERATIONS (for customer-facing pages)
// =============================================================================

/**
 * Get visible tables for public display
 *
 * @param organizationId - The organization UUID
 * @param section - Optional section filter
 * @returns Visible, non-deleted tables ordered by sort_order
 */
export async function getPublicTables(
  organizationId: string,
  section?: string
): Promise<DALResponse<RestaurantTable[]>> {
  return getTables(organizationId, {
    includeDeleted: false,
    includeHidden: false,
    section,
  })
}

/**
 * Get a table by QR UUID for public menu access
 *
 * @param qrUuid - The QR code UUID
 * @returns The table if visible and not deleted
 */
export async function getPublicTableByQRUuid(
  qrUuid: string
): Promise<DALResponse<RestaurantTable>> {
  const result = await getTableByQRUuid(qrUuid)

  if (result.data && !result.data.is_visible) {
    return createErrorResponse('not_found', 'Masa şu anda kullanılamıyor')
  }

  return result
}
