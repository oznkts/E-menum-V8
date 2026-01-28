'use client'

/**
 * Themes DAL (Client)
 *
 * Client-safe theme operations for dashboard UI.
 */

import { createClient } from '@/lib/supabase/client'
import type { Organization, OrganizationUpdate } from '@/types/database'

// =============================================================================
// TYPES
// =============================================================================

export interface ThemeSettings {
  id: string
  name: string
  logo_url: string | null
  cover_url: string | null
  primary_color: string | null
  secondary_color: string | null
}

export interface ThemeUpdateInput {
  logo_url?: string | null
  cover_url?: string | null
  primary_color?: string | null
  secondary_color?: string | null
}

export interface DALError {
  code: 'not_found' | 'validation_error' | 'permission_denied' | 'database_error' | 'unknown_error'
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

  return {
    code: 'database_error',
    message: 'Veritabanı hatası oluştu',
    details: error.message,
  }
}

export function isValidHexColor(color: string): boolean {
  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color)
}

function normalizeHexColor(color: string): string {
  const hex = color.replace('#', '').toLowerCase()
  if (hex.length === 3) {
    return `#${hex[0]}${hex[0]}${hex[1]}${hex[1]}${hex[2]}${hex[2]}`
  }
  return `#${hex}`
}

// =============================================================================
// READ OPERATIONS
// =============================================================================

export async function getThemeSettings(
  organizationId: string
): Promise<DALResponse<ThemeSettings>> {
  try {
    const supabase = createClient()

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

export async function updateThemeSettings(
  organizationId: string,
  data: ThemeUpdateInput
): Promise<DALResponse<ThemeSettings>> {
  try {
    const supabase = createClient()

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

// =============================================================================
// CONSTANTS
// =============================================================================

export const PRESET_COLORS = [
  { name: 'Mavi', value: '#3B82F6', textColor: '#ffffff' },
  { name: 'Yeşil', value: '#10B981', textColor: '#ffffff' },
  { name: 'Kırmızı', value: '#EF4444', textColor: '#ffffff' },
  { name: 'Mor', value: '#8B5CF6', textColor: '#ffffff' },
  { name: 'Turuncu', value: '#F97316', textColor: '#ffffff' },
  { name: 'Sarı', value: '#F59E0B', textColor: '#111827' },
  { name: 'Pembe', value: '#EC4899', textColor: '#ffffff' },
  { name: 'Gri', value: '#6B7280', textColor: '#ffffff' },
] as const
