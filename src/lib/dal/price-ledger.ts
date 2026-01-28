/**
 * Price Ledger Data Access Layer (DAL)
 *
 * This module provides type-safe database operations for the IMMUTABLE price ledger.
 * The price ledger is an audit trail for all price changes, required for Turkish
 * regulatory compliance.
 *
 * IMPORTANT: This is an INSERT-ONLY table.
 * - No updates are allowed
 * - No deletes are allowed
 * - Price changes create new entries with full audit trail
 *
 * Features:
 * - Record price changes with audit information
 * - Get current price for products
 * - Get historical prices at any point in time
 * - Full price change history with reasons
 * - IP and user agent tracking for compliance
 *
 * @module lib/dal/price-ledger
 */

import { createClient } from '@/lib/supabase/server'
import type {
  PriceLedgerEntry,
  PriceLedgerInsert,
  PriceChangeReason,
} from '@/types/database'

// =============================================================================
// TYPES
// =============================================================================

/**
 * Current price information from the ledger
 */
export interface CurrentPrice {
  price: number
  currency: string
  effective_from: string
  previous_price: number | null
  reason: PriceChangeReason
}

/**
 * Price at a specific time
 */
export interface PriceAtTime {
  price: number
  currency: string
  effective_from: string
}

/**
 * Price history entry
 */
export interface PriceHistoryEntry {
  id: string
  price: number
  currency: string
  previous_price: number | null
  reason: PriceChangeReason
  notes: string | null
  effective_from: string
  created_by: string | null
  created_at: string
}

/**
 * Options for recording a price change
 */
export interface RecordPriceChangeOptions {
  /** The organization UUID */
  organizationId: string
  /** The product UUID */
  productId: string
  /** The new price */
  price: number
  /** Currency code (defaults to TRY) */
  currency?: string
  /** Previous price (for audit trail) */
  previousPrice?: number | null
  /** Reason for the price change */
  reason: PriceChangeReason
  /** Optional notes about the change */
  notes?: string | null
  /** When the price becomes effective (defaults to now) */
  effectiveFrom?: string
  /** User ID who made the change */
  createdBy?: string | null
  /** Client IP address for audit */
  ipAddress?: string | null
  /** Client user agent for audit */
  userAgent?: string | null
}

/**
 * Options for getting price history
 */
export interface GetPriceHistoryOptions {
  /** Maximum number of entries to return */
  limit?: number
  /** Offset for pagination */
  offset?: number
  /** Start date filter */
  fromDate?: string
  /** End date filter */
  toDate?: string
  /** Filter by reason */
  reason?: PriceChangeReason
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
  | 'immutable_violation'

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
      message: 'Fiyat kaydı bulunamadı',
      details: error.message,
    }
  }

  // Check for immutable violation (our custom trigger)
  if (error.message.includes('cannot be modified') || error.message.includes('immutable')) {
    return {
      code: 'immutable_violation',
      message: 'Fiyat kayıtları değiştirilemez veya silinemez',
      details: error.message,
    }
  }

  return {
    code: 'database_error',
    message: 'Veritabanı hatası oluştu',
    details: error.message,
  }
}

// =============================================================================
// READ OPERATIONS
// =============================================================================

/**
 * Get the current price for a product from the price ledger
 *
 * Uses the database function get_current_price for accurate results.
 *
 * @param productId - The product UUID
 * @returns The current price information
 *
 * @example
 * ```ts
 * const { data, error } = await getCurrentPrice(productId)
 * if (error) {
 *   // Handle error
 * }
 * // data.price is the current price
 * ```
 */
export async function getCurrentPrice(
  productId: string
): Promise<DALResponse<CurrentPrice | null>> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .rpc('get_current_price', { p_product_id: productId })

    if (error) {
      return createErrorResponse('database_error', 'Güncel fiyat alınamadı', error.message)
    }

    if (!data || data.length === 0) {
      return createSuccessResponse(null)
    }

    // The function returns an array, take the first result
    const currentPrice = data[0] as CurrentPrice

    return createSuccessResponse(currentPrice)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return createErrorResponse('unknown_error', 'Beklenmeyen bir hata oluştu', message)
  }
}

/**
 * Get the price for a product at a specific point in time
 *
 * Useful for historical reporting and order price verification.
 *
 * @param productId - The product UUID
 * @param atTime - The timestamp to get the price for
 * @returns The price at the specified time
 *
 * @example
 * ```ts
 * const { data, error } = await getPriceAtTime(productId, '2024-01-15T12:00:00Z')
 * ```
 */
export async function getPriceAtTime(
  productId: string,
  atTime: string
): Promise<DALResponse<PriceAtTime | null>> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .rpc('get_price_at_time', {
        p_product_id: productId,
        p_at_time: atTime,
      })

    if (error) {
      return createErrorResponse('database_error', 'Fiyat alınamadı', error.message)
    }

    if (!data || data.length === 0) {
      return createSuccessResponse(null)
    }

    return createSuccessResponse(data[0] as PriceAtTime)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return createErrorResponse('unknown_error', 'Beklenmeyen bir hata oluştu', message)
  }
}

/**
 * Get the full price history for a product
 *
 * Returns all price changes in reverse chronological order.
 *
 * @param productId - The product UUID
 * @param options - History options (limit, offset, date filters)
 * @returns Array of price history entries
 *
 * @example
 * ```ts
 * const { data, error } = await getPriceHistory(productId, { limit: 10 })
 * if (error) {
 *   // Handle error
 * }
 * // data is PriceHistoryEntry[]
 * ```
 */
export async function getPriceHistory(
  productId: string,
  options: GetPriceHistoryOptions = {}
): Promise<DALResponse<PriceHistoryEntry[]>> {
  try {
    const supabase = await createClient()

    // Use the database function if no complex filters needed
    if (!options.fromDate && !options.toDate && !options.reason && !options.offset) {
      const { data, error } = await supabase
        .rpc('get_price_history', {
          p_product_id: productId,
          p_limit: options.limit ?? 50,
        })

      if (error) {
        return createErrorResponse('database_error', 'Fiyat geçmişi alınamadı', error.message)
      }

      return createSuccessResponse((data ?? []) as PriceHistoryEntry[])
    }

    // Use direct query for complex filters
    let query = supabase
      .from('price_ledger')
      .select('*')
      .eq('product_id', productId)
      .order('effective_from', { ascending: false })

    if (options.fromDate) {
      query = query.gte('effective_from', options.fromDate)
    }

    if (options.toDate) {
      query = query.lte('effective_from', options.toDate)
    }

    if (options.reason) {
      query = query.eq('reason', options.reason)
    }

    if (options.limit) {
      query = query.limit(options.limit)
    }

    if (options.offset) {
      query = query.range(
        options.offset,
        options.offset + (options.limit ?? 50) - 1
      )
    }

    const { data, error } = await query

    if (error) {
      return createErrorResponse('database_error', 'Fiyat geçmişi alınamadı', error.message)
    }

    return createSuccessResponse((data ?? []) as PriceHistoryEntry[])
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return createErrorResponse('unknown_error', 'Beklenmeyen bir hata oluştu', message)
  }
}

/**
 * Get a specific price ledger entry by ID
 *
 * @param entryId - The price ledger entry UUID
 * @returns The price ledger entry
 */
export async function getPriceLedgerEntry(
  entryId: string
): Promise<DALResponse<PriceLedgerEntry>> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('price_ledger')
      .select('*')
      .eq('id', entryId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return createErrorResponse('not_found', 'Fiyat kaydı bulunamadı')
      }
      return createErrorResponse('database_error', 'Fiyat kaydı alınamadı', error.message)
    }

    return createSuccessResponse(data)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return createErrorResponse('unknown_error', 'Beklenmeyen bir hata oluştu', message)
  }
}

/**
 * Count price changes for a product
 *
 * @param productId - The product UUID
 * @returns The number of price changes
 */
export async function countPriceChanges(
  productId: string
): Promise<DALResponse<number>> {
  try {
    const supabase = await createClient()

    const { count, error } = await supabase
      .from('price_ledger')
      .select('id', { count: 'exact', head: true })
      .eq('product_id', productId)

    if (error) {
      return createErrorResponse('database_error', 'Fiyat değişikliği sayısı alınamadı', error.message)
    }

    return createSuccessResponse(count ?? 0)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return createErrorResponse('unknown_error', 'Beklenmeyen bir hata oluştu', message)
  }
}

/**
 * Get price changes for an organization within a date range
 *
 * Useful for financial reporting and audits.
 *
 * @param organizationId - The organization UUID
 * @param fromDate - Start date (inclusive)
 * @param toDate - End date (inclusive)
 * @param limit - Maximum number of entries
 * @returns Price changes within the date range
 */
export async function getPriceChangesInRange(
  organizationId: string,
  fromDate: string,
  toDate: string,
  limit = 100
): Promise<DALResponse<PriceLedgerEntry[]>> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('price_ledger')
      .select('*')
      .eq('organization_id', organizationId)
      .gte('effective_from', fromDate)
      .lte('effective_from', toDate)
      .order('effective_from', { ascending: false })
      .limit(limit)

    if (error) {
      return createErrorResponse('database_error', 'Fiyat değişiklikleri alınamadı', error.message)
    }

    return createSuccessResponse(data ?? [])
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return createErrorResponse('unknown_error', 'Beklenmeyen bir hata oluştu', message)
  }
}

// =============================================================================
// WRITE OPERATIONS (INSERT ONLY - NO UPDATE OR DELETE)
// =============================================================================

/**
 * Record a price change in the ledger
 *
 * This is the ONLY write operation allowed on the price ledger.
 * Creates an immutable record of the price change with full audit trail.
 *
 * IMPORTANT:
 * - This does NOT update the product's price field
 * - The product price should be updated separately
 * - Consider wrapping both operations in a transaction
 *
 * @param options - Price change options
 * @returns The created price ledger entry
 *
 * @example
 * ```ts
 * const { data, error } = await recordPriceChange({
 *   organizationId: orgId,
 *   productId: productId,
 *   price: 299.99,
 *   previousPrice: 249.99,
 *   reason: 'price_increase',
 *   notes: 'Seasonal price adjustment',
 *   createdBy: userId,
 * })
 * ```
 */
export async function recordPriceChange(
  options: RecordPriceChangeOptions
): Promise<DALResponse<PriceLedgerEntry>> {
  try {
    const supabase = await createClient()

    const insertData: PriceLedgerInsert = {
      organization_id: options.organizationId,
      product_id: options.productId,
      price: options.price,
      currency: options.currency ?? 'TRY',
      previous_price: options.previousPrice,
      reason: options.reason,
      notes: options.notes,
      effective_from: options.effectiveFrom ?? new Date().toISOString(),
      created_by: options.createdBy,
      ip_address: options.ipAddress,
      user_agent: options.userAgent,
    }

    const { data, error } = await supabase
      .from('price_ledger')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      return { data: null, error: mapSupabaseError(error) }
    }

    return createSuccessResponse(data)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return createErrorResponse('unknown_error', 'Fiyat kaydı oluşturulamadı', message)
  }
}

/**
 * Record the initial price for a new product
 *
 * Convenience method that creates a price ledger entry with 'initial' reason.
 *
 * @param organizationId - The organization UUID
 * @param productId - The product UUID
 * @param price - The initial price
 * @param currency - Currency code (defaults to TRY)
 * @param createdBy - User ID who created the product
 * @returns The created price ledger entry
 */
export async function recordInitialPrice(
  organizationId: string,
  productId: string,
  price: number,
  currency = 'TRY',
  createdBy?: string | null
): Promise<DALResponse<PriceLedgerEntry>> {
  return recordPriceChange({
    organizationId,
    productId,
    price,
    currency,
    previousPrice: null,
    reason: 'initial',
    notes: 'İlk fiyat kaydı',
    createdBy,
  })
}

/**
 * Record a price increase
 *
 * Convenience method for price increases with proper audit trail.
 *
 * @param organizationId - The organization UUID
 * @param productId - The product UUID
 * @param newPrice - The new (higher) price
 * @param previousPrice - The previous price
 * @param notes - Optional notes about the increase
 * @param createdBy - User ID who made the change
 * @returns The created price ledger entry
 */
export async function recordPriceIncrease(
  organizationId: string,
  productId: string,
  newPrice: number,
  previousPrice: number,
  notes?: string,
  createdBy?: string | null
): Promise<DALResponse<PriceLedgerEntry>> {
  if (newPrice <= previousPrice) {
    return createErrorResponse(
      'validation_error',
      'Yeni fiyat önceki fiyattan yüksek olmalıdır'
    )
  }

  return recordPriceChange({
    organizationId,
    productId,
    price: newPrice,
    previousPrice,
    reason: 'price_increase',
    notes,
    createdBy,
  })
}

/**
 * Record a price decrease
 *
 * Convenience method for price decreases with proper audit trail.
 *
 * @param organizationId - The organization UUID
 * @param productId - The product UUID
 * @param newPrice - The new (lower) price
 * @param previousPrice - The previous price
 * @param notes - Optional notes about the decrease
 * @param createdBy - User ID who made the change
 * @returns The created price ledger entry
 */
export async function recordPriceDecrease(
  organizationId: string,
  productId: string,
  newPrice: number,
  previousPrice: number,
  notes?: string,
  createdBy?: string | null
): Promise<DALResponse<PriceLedgerEntry>> {
  if (newPrice >= previousPrice) {
    return createErrorResponse(
      'validation_error',
      'Yeni fiyat önceki fiyattan düşük olmalıdır'
    )
  }

  return recordPriceChange({
    organizationId,
    productId,
    price: newPrice,
    previousPrice,
    reason: 'price_decrease',
    notes,
    createdBy,
  })
}

/**
 * Record a promotional price
 *
 * Convenience method for recording promotional/sale prices.
 *
 * @param organizationId - The organization UUID
 * @param productId - The product UUID
 * @param promoPrice - The promotional price
 * @param regularPrice - The regular price
 * @param notes - Notes about the promotion (e.g., campaign name)
 * @param createdBy - User ID who made the change
 * @returns The created price ledger entry
 */
export async function recordPromotionalPrice(
  organizationId: string,
  productId: string,
  promoPrice: number,
  regularPrice: number,
  notes: string,
  createdBy?: string | null
): Promise<DALResponse<PriceLedgerEntry>> {
  return recordPriceChange({
    organizationId,
    productId,
    price: promoPrice,
    previousPrice: regularPrice,
    reason: 'promotion',
    notes,
    createdBy,
  })
}

/**
 * Record a price correction
 *
 * Use this when fixing an incorrectly entered price.
 *
 * @param organizationId - The organization UUID
 * @param productId - The product UUID
 * @param correctedPrice - The corrected price
 * @param incorrectPrice - The incorrect price being corrected
 * @param notes - Explanation of the correction
 * @param createdBy - User ID who made the correction
 * @returns The created price ledger entry
 */
export async function recordPriceCorrection(
  organizationId: string,
  productId: string,
  correctedPrice: number,
  incorrectPrice: number,
  notes: string,
  createdBy?: string | null
): Promise<DALResponse<PriceLedgerEntry>> {
  return recordPriceChange({
    organizationId,
    productId,
    price: correctedPrice,
    previousPrice: incorrectPrice,
    reason: 'correction',
    notes,
    createdBy,
  })
}

// =============================================================================
// ANALYTICS & REPORTING
// =============================================================================

/**
 * Get price change statistics for an organization
 *
 * @param organizationId - The organization UUID
 * @param fromDate - Start date for the period
 * @param toDate - End date for the period
 * @returns Statistics about price changes
 */
export async function getPriceChangeStats(
  organizationId: string,
  fromDate: string,
  toDate: string
): Promise<DALResponse<{
  totalChanges: number
  increases: number
  decreases: number
  promotions: number
  corrections: number
  averageChangePercentage: number | null
}>> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('price_ledger')
      .select('price, previous_price, reason')
      .eq('organization_id', organizationId)
      .gte('effective_from', fromDate)
      .lte('effective_from', toDate)

    if (error) {
      return createErrorResponse('database_error', 'İstatistikler alınamadı', error.message)
    }

    const entries = data ?? []
    const totalChanges = entries.length
    const increases = entries.filter((e) => e.reason === 'price_increase').length
    const decreases = entries.filter((e) => e.reason === 'price_decrease').length
    const promotions = entries.filter((e) => e.reason === 'promotion').length
    const corrections = entries.filter((e) => e.reason === 'correction').length

    // Calculate average change percentage
    let averageChangePercentage: number | null = null
    const validChanges = entries.filter((e) => e.previous_price != null && e.previous_price > 0)
    if (validChanges.length > 0) {
      const totalPercentage = validChanges.reduce((sum, e) => {
        const change = ((e.price - (e.previous_price ?? 0)) / (e.previous_price ?? 1)) * 100
        return sum + change
      }, 0)
      averageChangePercentage = totalPercentage / validChanges.length
    }

    return createSuccessResponse({
      totalChanges,
      increases,
      decreases,
      promotions,
      corrections,
      averageChangePercentage,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return createErrorResponse('unknown_error', 'Beklenmeyen bir hata oluştu', message)
  }
}

/**
 * Get products with recent price changes
 *
 * Useful for monitoring price volatility.
 *
 * @param organizationId - The organization UUID
 * @param days - Number of days to look back (default: 7)
 * @param limit - Maximum number of products
 * @returns Products with their recent price changes
 */
export async function getProductsWithRecentPriceChanges(
  organizationId: string,
  days = 7,
  limit = 20
): Promise<DALResponse<{ product_id: string; change_count: number; latest_price: number }[]>> {
  try {
    const supabase = await createClient()

    const fromDate = new Date()
    fromDate.setDate(fromDate.getDate() - days)

    const { data, error } = await supabase
      .from('price_ledger')
      .select('product_id, price')
      .eq('organization_id', organizationId)
      .gte('effective_from', fromDate.toISOString())
      .order('effective_from', { ascending: false })

    if (error) {
      return createErrorResponse('database_error', 'Veriler alınamadı', error.message)
    }

    // Group by product_id
    const productMap = new Map<string, { count: number; latestPrice: number }>()
    for (const entry of data ?? []) {
      const existing = productMap.get(entry.product_id)
      if (existing) {
        existing.count++
      } else {
        productMap.set(entry.product_id, {
          count: 1,
          latestPrice: entry.price,
        })
      }
    }

    // Convert to array and sort by change count
    const result = Array.from(productMap.entries())
      .map(([product_id, { count, latestPrice }]) => ({
        product_id,
        change_count: count,
        latest_price: latestPrice,
      }))
      .sort((a, b) => b.change_count - a.change_count)
      .slice(0, limit)

    return createSuccessResponse(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return createErrorResponse('unknown_error', 'Beklenmeyen bir hata oluştu', message)
  }
}
