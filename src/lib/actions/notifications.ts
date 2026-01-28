'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

// =============================================================================
// TYPES
// =============================================================================

export interface NotificationPreferences {
  // In-app notifications (always enabled, just controls types)
  inapp_orders: boolean
  inapp_service_requests: boolean
  inapp_system: boolean

  // Browser push notifications
  push_enabled: boolean
  push_orders: boolean
  push_service_requests: boolean

  // Sound notifications
  sound_enabled: boolean
  sound_orders: boolean
  sound_service_requests: boolean
  sound_volume: number // 0-100

  // Quiet hours
  quiet_hours_enabled: boolean
  quiet_hours_start: string | null // HH:mm format
  quiet_hours_end: string | null // HH:mm format
}

export interface NotificationActionState {
  error?: string
  success?: string
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  inapp_orders: true,
  inapp_service_requests: true,
  inapp_system: true,
  push_enabled: false,
  push_orders: true,
  push_service_requests: true,
  sound_enabled: true,
  sound_orders: true,
  sound_service_requests: true,
  sound_volume: 80,
  quiet_hours_enabled: false,
  quiet_hours_start: null,
  quiet_hours_end: null,
}

// =============================================================================
// ACTIONS
// =============================================================================

/**
 * Get notification preferences for current user
 */
export async function getNotificationPreferences(): Promise<{
  data: NotificationPreferences | null
  error: string | null
}> {
  const supabase = await createClient()
  const { data: authData } = await supabase.auth.getUser()

  if (!authData?.user) {
    redirect('/login')
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('preferences')
    .eq('id', authData.user.id)
    .single()

  if (error) {
    return { data: null, error: 'Bildirim tercihleri yüklenemedi' }
  }

  const prefs = profile?.preferences as any
  const notifications = prefs?.notifications || {}

  // Merge with defaults
  const preferences: NotificationPreferences = {
    ...DEFAULT_PREFERENCES,
    ...notifications,
  }

  return { data: preferences, error: null }
}

/**
 * Update notification preferences
 */
export async function updateNotificationPreferences(
  preferences: Partial<NotificationPreferences>
): Promise<NotificationActionState> {
  const supabase = await createClient()
  const { data: authData } = await supabase.auth.getUser()

  if (!authData?.user) {
    redirect('/login')
  }

  // Get current preferences
  const { data: profile } = await supabase
    .from('profiles')
    .select('preferences')
    .eq('id', authData.user.id)
    .single()

  const currentPrefs = (profile?.preferences as any) || {}
  const currentNotifications = currentPrefs.notifications || {}

  // Merge with new preferences
  const updatedNotifications = {
    ...DEFAULT_PREFERENCES,
    ...currentNotifications,
    ...preferences,
  }

  // Validate quiet hours if enabled
  if (updatedNotifications.quiet_hours_enabled) {
    if (!updatedNotifications.quiet_hours_start || !updatedNotifications.quiet_hours_end) {
      return { error: 'Sessiz saatler için başlangıç ve bitiş saati belirtmelisiniz' }
    }
  }

  // Validate sound volume
  if (
    updatedNotifications.sound_volume < 0 ||
    updatedNotifications.sound_volume > 100
  ) {
    return { error: 'Ses seviyesi 0-100 arasında olmalıdır' }
  }

  // Update preferences
  const { error } = await supabase
    .from('profiles')
    .update({
      preferences: {
        ...currentPrefs,
        notifications: updatedNotifications,
      },
    })
    .eq('id', authData.user.id)

  if (error) {
    return { error: 'Bildirim tercihleri güncellenemedi: ' + error.message }
  }

  revalidatePath('/dashboard/settings/notifications')
  return { success: 'Bildirim tercihleri başarıyla güncellendi' }
}

