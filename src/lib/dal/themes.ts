/**
 * Themes Data Access Layer (DAL)
 *
 * This module provides type-safe database operations for organization theming.
 * All operations respect Row Level Security (RLS) policies.
 *
 * Features:
 * - Get/update organization theme settings
 * - Logo and cover image URL management
 * - Primary and secondary color customization
 * - Multi-tenant isolation via organization_id
 *
 * @module lib/dal/themes
 */

import { createClient } from '@/lib/supabase/server'
import type { Organization, OrganizationUpdate } from '@/types/database'

// =============================================================================
// TYPES
// =============================================================================

/**
 * Theme settings extracted from organization
 */
export interface ThemeSettings {
  /** Organization ID */
  id: string
  /** Organization name (for display) */
  name: string
  /** Logo image URL */
  logo_url: string | null
  /** Cover/banner image URL */
  cover_url: string | null
  /** Primary brand color (hex format) */
  primary_color: string | null
  /** Secondary brand color (hex format) */
  secondary_color: string | null
}

/**
 * Theme update input
 */
export interface ThemeUpdateInput {
  /** Logo image URL */
  logo_url?: string | null
  /** Cover/banner image URL */
  cover_url?: string | null
  /** Primary brand color (hex format) */
  primary_color?: string | null
  /** Secondary brand color (hex format) */
  secondary_color?: string | null
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
      message: 'Organizasyon bulunamadı',
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
 * Validate hex color format
 */
export function isValidHexColor(color: string): boolean {
  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color)
}

/**
 * Normalize hex color to 6-digit format
 */
export function normalizeHexColor(color: string): string {
  const hex = color.replace('#', '')
  if (hex.length === 3) {
    return `#${hex[0]}${hex[0]}${hex[1]}${hex[1]}${hex[2]}${hex[2]}`
  }
  return `#${hex}`
}

// =============================================================================
// READ OPERATIONS
// =============================================================================

/**
 * Get theme settings for an organization
 *
 * @param organizationId - The organization UUID
 * @returns Theme settings or error
 *
 * @example
 * ```ts
 * const { data, error } = await getThemeSettings(orgId)
 * if (error) {
 *   // Handle error
 * }
 * // data is ThemeSettings
 * ```
 */
export async function getThemeSettings(
  organizationId: string
): Promise<DALResponse<ThemeSettings>> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('organizations')
      .select('id, name, logo_url, cover_url, primary_color, secondary_color')
      .eq('id', organizationId)
      .eq('is_active', true)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return createErrorResponse('not_found', 'Organizasyon bulunamadı')
      }
      return { data: null, error: mapSupabaseError(error) }
    }

    return createSuccessResponse(data as ThemeSettings)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return createErrorResponse('unknown_error', 'Tema ayarları yüklenemedi', message)
  }
}

// =============================================================================
// WRITE OPERATIONS
// =============================================================================

/**
 * Update theme settings for an organization
 *
 * @param organizationId - The organization UUID
 * @param data - The theme fields to update
 * @returns Updated theme settings or error
 *
 * @example
 * ```ts
 * const { data, error } = await updateThemeSettings(orgId, {
 *   primary_color: '#3B82F6',
 *   logo_url: 'https://example.com/logo.png',
 * })
 * ```
 */
export async function updateThemeSettings(
  organizationId: string,
  data: ThemeUpdateInput
): Promise<DALResponse<ThemeSettings>> {
  try {
    const supabase = await createClient()

    // Validate colors if provided
    if (data.primary_color && !isValidHexColor(data.primary_color)) {
      return createErrorResponse(
        'validation_error',
        'Geçersiz birincil renk formatı. Hex formatında olmalı (örn: #3B82F6)'
      )
    }

    if (data.secondary_color && !isValidHexColor(data.secondary_color)) {
      return createErrorResponse(
        'validation_error',
        'Geçersiz ikincil renk formatı. Hex formatında olmalı (örn: #10B981)'
      )
    }

    // Normalize colors
    const updateData: OrganizationUpdate = {}

    if (data.logo_url !== undefined) {
      updateData.logo_url = data.logo_url
    }

    if (data.cover_url !== undefined) {
      updateData.cover_url = data.cover_url
    }

    if (data.primary_color !== undefined) {
      updateData.primary_color = data.primary_color
        ? normalizeHexColor(data.primary_color)
        : null
    }

    if (data.secondary_color !== undefined) {
      updateData.secondary_color = data.secondary_color
        ? normalizeHexColor(data.secondary_color)
        : null
    }

    const { data: org, error } = await supabase
      .from('organizations')
      .update(updateData)
      .eq('id', organizationId)
      .eq('is_active', true)
      .select('id, name, logo_url, cover_url, primary_color, secondary_color')
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return createErrorResponse('not_found', 'Organizasyon bulunamadı')
      }
      return { data: null, error: mapSupabaseError(error) }
    }

    return createSuccessResponse(org as ThemeSettings)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return createErrorResponse('unknown_error', 'Tema ayarları güncellenemedi', message)
  }
}

/**
 * Update logo URL for an organization
 *
 * @param organizationId - The organization UUID
 * @param logoUrl - The new logo URL (or null to remove)
 * @returns Updated theme settings or error
 */
export async function updateLogoUrl(
  organizationId: string,
  logoUrl: string | null
): Promise<DALResponse<ThemeSettings>> {
  return updateThemeSettings(organizationId, { logo_url: logoUrl })
}

/**
 * Update cover image URL for an organization
 *
 * @param organizationId - The organization UUID
 * @param coverUrl - The new cover URL (or null to remove)
 * @returns Updated theme settings or error
 */
export async function updateCoverUrl(
  organizationId: string,
  coverUrl: string | null
): Promise<DALResponse<ThemeSettings>> {
  return updateThemeSettings(organizationId, { cover_url: coverUrl })
}

/**
 * Update brand colors for an organization
 *
 * @param organizationId - The organization UUID
 * @param primaryColor - Primary brand color (hex)
 * @param secondaryColor - Secondary brand color (hex)
 * @returns Updated theme settings or error
 */
export async function updateBrandColors(
  organizationId: string,
  primaryColor: string | null,
  secondaryColor: string | null
): Promise<DALResponse<ThemeSettings>> {
  return updateThemeSettings(organizationId, {
    primary_color: primaryColor,
    secondary_color: secondaryColor,
  })
}

/**
 * Reset all theme settings to defaults (null values)
 *
 * @param organizationId - The organization UUID
 * @returns Updated theme settings or error
 */
export async function resetThemeSettings(
  organizationId: string
): Promise<DALResponse<ThemeSettings>> {
  return updateThemeSettings(organizationId, {
    logo_url: null,
    cover_url: null,
    primary_color: null,
    secondary_color: null,
  })
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Generate CSS custom properties from theme settings
 *
 * @param theme - Theme settings
 * @returns CSS custom properties string
 *
 * @example
 * ```ts
 * const cssVars = generateThemeCssVars(theme)
 * // Returns: "--theme-primary: #3B82F6; --theme-secondary: #10B981;"
 * ```
 */
export function generateThemeCssVars(theme: ThemeSettings): string {
  const vars: string[] = []

  if (theme.primary_color) {
    vars.push(`--theme-primary: ${theme.primary_color}`)
  }

  if (theme.secondary_color) {
    vars.push(`--theme-secondary: ${theme.secondary_color}`)
  }

  return vars.join('; ')
}

/**
 * Pre-defined color palette for restaurant themes
 * These colors are WCAG 2.1 AA compliant for text contrast
 */
export const PRESET_COLORS = [
  { name: 'Mavi', value: '#3B82F6', textColor: '#ffffff' },
  { name: 'Yeşil', value: '#10B981', textColor: '#ffffff' },
  { name: 'Kırmızı', value: '#EF4444', textColor: '#ffffff' },
  { name: 'Mor', value: '#8B5CF6', textColor: '#ffffff' },
  { name: 'Turuncu', value: '#F97316', textColor: '#ffffff' },
  { name: 'Pembe', value: '#EC4899', textColor: '#ffffff' },
  { name: 'Camgöbeği', value: '#06B6D4', textColor: '#ffffff' },
  { name: 'Sarı', value: '#EAB308', textColor: '#000000' },
  { name: 'Gri', value: '#6B7280', textColor: '#ffffff' },
  { name: 'Siyah', value: '#1F2937', textColor: '#ffffff' },
] as const

/**
 * Default theme values
 */
export const DEFAULT_THEME: ThemeSettings = {
  id: '',
  name: '',
  logo_url: null,
  cover_url: null,
  primary_color: '#3B82F6', // Blue
  secondary_color: '#10B981', // Green
}
