'use server'

/**
 * Theme Server Actions
 *
 * This module contains all theme-related Server Actions for:
 * - Getting theme settings
 * - Updating theme settings (colors, logo, cover)
 *
 * All actions:
 * - Use Zod for input validation with Turkish error messages
 * - Return standardized ThemeActionResponse
 * - Revalidate affected paths on success
 * - Log errors for debugging (not exposed to client)
 *
 * @see spec.md
 */

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import {
  getThemeSettings as dalGetThemeSettings,
  updateThemeSettings as dalUpdateThemeSettings,
  isValidHexColor,
  type ThemeSettings,
  type ThemeUpdateInput,
} from '@/lib/dal/themes'

// =============================================================================
// TYPES
// =============================================================================

/**
 * Standard action response for all theme operations
 */
export interface ThemeActionResponse<T = unknown> {
  success: boolean
  message: string
  data?: T
  error?: string
  errorCode?: ThemeErrorCode
}

/**
 * Theme error codes for programmatic handling
 */
export type ThemeErrorCode =
  | 'not_found'
  | 'validation_error'
  | 'permission_denied'
  | 'database_error'
  | 'unknown_error'

/**
 * Turkish messages for theme actions
 */
const THEME_ACTION_MESSAGES = {
  // Success messages
  themeUpdated: 'Tema ayarları başarıyla güncellendi',
  logoUpdated: 'Logo başarıyla güncellendi',
  coverUpdated: 'Kapak görseli başarıyla güncellendi',
  colorsUpdated: 'Marka renkleri başarıyla güncellendi',
  themeReset: 'Tema ayarları sıfırlandı',

  // Error messages
  notFound: 'Organizasyon bulunamadı',
  validationError: 'Girilen bilgiler geçersiz',
  invalidPrimaryColor: 'Geçersiz birincil renk formatı. Hex formatında olmalı (örn: #3B82F6)',
  invalidSecondaryColor: 'Geçersiz ikincil renk formatı. Hex formatında olmalı (örn: #10B981)',
  serverError: 'Bir hata oluştu. Lütfen tekrar deneyin.',
  unknownError: 'Beklenmeyen bir hata oluştu',
  permissionDenied: 'Bu işlem için yetkiniz yok',
} as const

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

/**
 * UUID validation schema
 */
const uuidSchema = z.string().uuid('Geçersiz organizasyon kimliği')

/**
 * Hex color validation schema
 */
const hexColorSchema = z
  .string()
  .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Geçersiz renk formatı')
  .optional()
  .nullable()

/**
 * Theme update validation schema
 */
const themeUpdateSchema = z.object({
  logo_url: z.string().url('Geçersiz logo URL').optional().nullable(),
  cover_url: z.string().url('Geçersiz kapak görseli URL').optional().nullable(),
  primary_color: hexColorSchema,
  secondary_color: hexColorSchema,
})

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Create a standardized error response
 */
function createErrorResponse<T>(
  message: string,
  errorCode: ThemeErrorCode,
  details?: string
): ThemeActionResponse<T> {
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
): ThemeActionResponse<T> {
  return {
    success: true,
    message,
    data,
  }
}

/**
 * Map DAL error to action error
 */
function mapDALError(error: { code: string; message: string }): ThemeErrorCode {
  switch (error.code) {
    case 'not_found':
      return 'not_found'
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
// SERVER ACTIONS
// =============================================================================

/**
 * Get Theme Settings
 *
 * @param organizationId - The organization UUID
 * @returns ThemeActionResponse with theme settings
 */
export async function getThemeSettings(
  organizationId: string
): Promise<ThemeActionResponse<ThemeSettings>> {
  try {
    // Validate organization ID
    const idValidation = uuidSchema.safeParse(organizationId)
    if (!idValidation.success) {
      return createErrorResponse(THEME_ACTION_MESSAGES.notFound, 'not_found')
    }

    const { data, error } = await dalGetThemeSettings(organizationId)

    if (error) {
      return createErrorResponse(error.message, mapDALError(error), error.details)
    }

    if (!data) {
      return createErrorResponse(THEME_ACTION_MESSAGES.notFound, 'not_found')
    }

    return createSuccessResponse('Tema ayarları yüklendi', data)
  } catch (err) {
    console.error('[Theme] Get theme settings error:', err)
    return createErrorResponse(THEME_ACTION_MESSAGES.serverError, 'unknown_error')
  }
}

/**
 * Update Theme Settings
 *
 * @param organizationId - The organization UUID
 * @param input - Theme update data
 * @returns ThemeActionResponse with updated theme settings
 */
export async function updateThemeSettings(
  organizationId: string,
  input: ThemeUpdateInput
): Promise<ThemeActionResponse<ThemeSettings>> {
  try {
    // Validate organization ID
    const idValidation = uuidSchema.safeParse(organizationId)
    if (!idValidation.success) {
      return createErrorResponse(THEME_ACTION_MESSAGES.notFound, 'not_found')
    }

    // Validate input
    const validationResult = themeUpdateSchema.safeParse(input)
    if (!validationResult.success) {
      const firstError = validationResult.error.errors[0]
      return createErrorResponse(
        firstError?.message ?? THEME_ACTION_MESSAGES.validationError,
        'validation_error'
      )
    }

    // Additional color validation
    if (input.primary_color && !isValidHexColor(input.primary_color)) {
      return createErrorResponse(
        THEME_ACTION_MESSAGES.invalidPrimaryColor,
        'validation_error'
      )
    }

    if (input.secondary_color && !isValidHexColor(input.secondary_color)) {
      return createErrorResponse(
        THEME_ACTION_MESSAGES.invalidSecondaryColor,
        'validation_error'
      )
    }

    // Update theme settings
    const { data, error } = await dalUpdateThemeSettings(organizationId, input)

    if (error) {
      return createErrorResponse(error.message, mapDALError(error), error.details)
    }

    if (!data) {
      return createErrorResponse(THEME_ACTION_MESSAGES.notFound, 'not_found')
    }

    // Revalidate paths
    revalidatePath('/dashboard/settings/appearance')
    revalidatePath(`/r/[slug]`, 'page')

    return createSuccessResponse(THEME_ACTION_MESSAGES.themeUpdated, data)
  } catch (err) {
    console.error('[Theme] Update theme settings error:', err)
    return createErrorResponse(THEME_ACTION_MESSAGES.serverError, 'unknown_error')
  }
}

/**
 * Update Logo URL
 *
 * @param organizationId - The organization UUID
 * @param logoUrl - The new logo URL (or null to remove)
 * @returns ThemeActionResponse with updated theme settings
 */
export async function updateLogoUrl(
  organizationId: string,
  logoUrl: string | null
): Promise<ThemeActionResponse<ThemeSettings>> {
  return updateThemeSettings(organizationId, { logo_url: logoUrl })
}

/**
 * Update Cover URL
 *
 * @param organizationId - The organization UUID
 * @param coverUrl - The new cover URL (or null to remove)
 * @returns ThemeActionResponse with updated theme settings
 */
export async function updateCoverUrl(
  organizationId: string,
  coverUrl: string | null
): Promise<ThemeActionResponse<ThemeSettings>> {
  return updateThemeSettings(organizationId, { cover_url: coverUrl })
}

/**
 * Update Brand Colors
 *
 * @param organizationId - The organization UUID
 * @param primaryColor - Primary brand color (hex)
 * @param secondaryColor - Secondary brand color (hex)
 * @returns ThemeActionResponse with updated theme settings
 */
export async function updateBrandColors(
  organizationId: string,
  primaryColor: string | null,
  secondaryColor: string | null
): Promise<ThemeActionResponse<ThemeSettings>> {
  return updateThemeSettings(organizationId, {
    primary_color: primaryColor,
    secondary_color: secondaryColor,
  })
}

/**
 * Reset Theme Settings to Defaults
 *
 * @param organizationId - The organization UUID
 * @returns ThemeActionResponse with reset theme settings
 */
export async function resetThemeSettings(
  organizationId: string
): Promise<ThemeActionResponse<ThemeSettings>> {
  try {
    const { data, error } = await dalUpdateThemeSettings(organizationId, {
      logo_url: null,
      cover_url: null,
      primary_color: null,
      secondary_color: null,
    })

    if (error) {
      return createErrorResponse(error.message, mapDALError(error), error.details)
    }

    if (!data) {
      return createErrorResponse(THEME_ACTION_MESSAGES.notFound, 'not_found')
    }

    // Revalidate paths
    revalidatePath('/dashboard/settings/appearance')
    revalidatePath(`/r/[slug]`, 'page')

    return createSuccessResponse(THEME_ACTION_MESSAGES.themeReset, data)
  } catch (err) {
    console.error('[Theme] Reset theme settings error:', err)
    return createErrorResponse(THEME_ACTION_MESSAGES.serverError, 'unknown_error')
  }
}
