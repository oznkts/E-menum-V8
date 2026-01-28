'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

// =============================================================================
// TYPES
// =============================================================================

export interface TableSettings {
  // QR Code Settings
  qr: {
    template: 'default' | 'minimal' | 'branded' | 'custom'
    include_logo: boolean
    color_scheme: 'dark' | 'light' | 'brand'
    size: 'small' | 'medium' | 'large'
    show_table_number: boolean
    show_restaurant_name: boolean
  }
  // Default Table Settings
  defaults: {
    default_capacity: number
    default_min_capacity: number
    default_section: string | null
    default_floor: number
    auto_generate_qr: boolean
  }
  // Display Settings
  display: {
    show_section_in_list: boolean
    show_capacity_in_list: boolean
    show_status_badges: boolean
    group_by_section: boolean
  }
}

export interface TableSettingsActionState {
  error?: string
  success?: string
}

const DEFAULT_SETTINGS: TableSettings = {
  qr: {
    template: 'default',
    include_logo: true,
    color_scheme: 'brand',
    size: 'medium',
    show_table_number: true,
    show_restaurant_name: true,
  },
  defaults: {
    default_capacity: 4,
    default_min_capacity: 1,
    default_section: null,
    default_floor: 1,
    auto_generate_qr: true,
  },
  display: {
    show_section_in_list: true,
    show_capacity_in_list: true,
    show_status_badges: true,
    group_by_section: false,
  },
}

// =============================================================================
// ACTIONS
// =============================================================================

/**
 * Get table settings for organization
 */
export async function getTableSettings(
  organizationId: string
): Promise<{ data: TableSettings | null; error: string | null }> {
  const supabase = await createClient()
  const { data: authData } = await supabase.auth.getUser()

  if (!authData?.user) {
    redirect('/login')
  }

  const { data: org, error } = await supabase
    .from('organizations')
    .select('settings')
    .eq('id', organizationId)
    .single()

  if (error) {
    return { data: null, error: 'Masa ayarları yüklenemedi' }
  }

  const settings = (org?.settings as any) || {}
  const tableSettings = settings.table_settings || {}

  // Merge with defaults
  const mergedSettings: TableSettings = {
    qr: {
      ...DEFAULT_SETTINGS.qr,
      ...tableSettings.qr,
    },
    defaults: {
      ...DEFAULT_SETTINGS.defaults,
      ...tableSettings.defaults,
    },
    display: {
      ...DEFAULT_SETTINGS.display,
      ...tableSettings.display,
    },
  }

  return { data: mergedSettings, error: null }
}

/**
 * Update table settings
 */
export async function updateTableSettings(
  organizationId: string,
  settings: Partial<TableSettings>
): Promise<TableSettingsActionState> {
  const supabase = await createClient()
  const { data: authData } = await supabase.auth.getUser()

  if (!authData?.user) {
    redirect('/login')
  }

  // Get current settings
  const { data: org } = await supabase
    .from('organizations')
    .select('settings')
    .eq('id', organizationId)
    .single()

  const currentSettings = (org?.settings as any) || {}
  const currentTableSettings = currentSettings.table_settings || {}

  // Merge with new settings
  const updatedTableSettings: TableSettings = {
    qr: {
      ...DEFAULT_SETTINGS.qr,
      ...currentTableSettings.qr,
      ...settings.qr,
    },
    defaults: {
      ...DEFAULT_SETTINGS.defaults,
      ...currentTableSettings.defaults,
      ...settings.defaults,
    },
    display: {
      ...DEFAULT_SETTINGS.display,
      ...currentTableSettings.display,
      ...settings.display,
    },
  }

  // Validate
  if (
    updatedTableSettings.defaults.default_capacity < 1 ||
    updatedTableSettings.defaults.default_capacity > 50
  ) {
    return { error: 'Varsayılan kapasite 1-50 arasında olmalıdır' }
  }

  if (
    updatedTableSettings.defaults.default_min_capacity < 1 ||
    updatedTableSettings.defaults.default_min_capacity >
      updatedTableSettings.defaults.default_capacity
  ) {
    return { error: 'Minimum kapasite 1 ile varsayılan kapasite arasında olmalıdır' }
  }

  // Update settings
  const { error } = await supabase
    .from('organizations')
    .update({
      settings: {
        ...currentSettings,
        table_settings: updatedTableSettings,
      },
    })
    .eq('id', organizationId)

  if (error) {
    return { error: 'Masa ayarları güncellenemedi: ' + error.message }
  }

  revalidatePath('/dashboard/settings/tables')
  return { success: 'Masa ayarları başarıyla güncellendi' }
}

