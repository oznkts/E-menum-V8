'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { MenuSettings, LegalSettings, BillingSettings } from '@/lib/types/settings'
import type { Json } from '@/types/database'

export interface SettingsActionResponse<T = unknown> {
  success: boolean
  message: string
  data?: T
  error?: string
}

const menuSettingsSchema = z.object({
  displayMode: z.enum(['list', 'grid', 'compact']),
  defaultLanguage: z.string().min(2).max(5),
  currency: z.string().min(3).max(5),
  showPricesWithTax: z.boolean(),
  showAllergens: z.boolean(),
  showNutrition: z.boolean(),
  imageQuality: z.enum(['low', 'medium', 'high']),
})

const legalSettingsSchema = z.object({
  cookieConsentEnabled: z.boolean(),
  analyticsConsent: z.boolean(),
  marketingConsent: z.boolean(),
  orderRetentionDays: z.number().int().min(30).max(1825),
  analyticsRetentionDays: z.number().int().min(30).max(365),
})

const billingPlanRequestSchema = z.object({
  planId: z.string().min(2).max(32),
})

async function updateOrganizationSettingsSection(
  organizationId: string,
  section: 'menu' | 'legal' | 'billing',
  payload: Json
) {
  const supabase = await createClient()
  const { data: authData } = await supabase.auth.getUser()

  if (!authData?.user) {
    return {
      success: false,
      message: 'Oturum süresi doldu. Lütfen tekrar giriş yapın.',
    }
  }

  const { data, error } = await supabase
    .from('organizations')
    .select('settings')
    .eq('id', organizationId)
    .single()

  if (error) {
    return { success: false, message: 'Ayarlar yüklenemedi', error: error.message }
  }

  const current = (data?.settings || {}) as Record<string, Json>
  const updatedSettings: Record<string, Json> = {
    ...current,
    [section]: payload,
  }

  const { error: updateError } = await supabase
    .from('organizations')
    .update({ settings: updatedSettings })
    .eq('id', organizationId)

  if (updateError) {
    return { success: false, message: 'Ayarlar kaydedilemedi', error: updateError.message }
  }

  return { success: true, message: 'Ayarlar kaydedildi', data: updatedSettings }
}

export async function updateMenuSettings(input: {
  organizationId: string
  settings: MenuSettings
}): Promise<SettingsActionResponse<MenuSettings>> {
  const parsed = menuSettingsSchema.safeParse(input.settings)
  if (!parsed.success) {
    return { success: false, message: 'Menü ayarları geçersiz', error: parsed.error.message }
  }

  const result = await updateOrganizationSettingsSection(
    input.organizationId,
    'menu',
    parsed.data
  )

  if (!result.success) return result

  const supabase = await createClient()
  await supabase
    .from('organizations')
    .update({
      language: parsed.data.defaultLanguage,
      currency: parsed.data.currency,
    })
    .eq('id', input.organizationId)

  revalidatePath('/dashboard/settings/menu')
  revalidatePath('/dashboard/settings')

  return { success: true, message: 'Menü ayarları kaydedildi', data: parsed.data }
}

export async function updateLegalSettings(input: {
  organizationId: string
  settings: LegalSettings
}): Promise<SettingsActionResponse<LegalSettings>> {
  const parsed = legalSettingsSchema.safeParse(input.settings)
  if (!parsed.success) {
    return { success: false, message: 'KVKK ayarları geçersiz', error: parsed.error.message }
  }

  const result = await updateOrganizationSettingsSection(
    input.organizationId,
    'legal',
    parsed.data
  )

  if (!result.success) return result

  revalidatePath('/dashboard/settings/legal')
  revalidatePath('/dashboard/settings')

  return { success: true, message: 'KVKK ayarları kaydedildi', data: parsed.data }
}

export async function requestPlanChange(input: {
  organizationId: string
  planId: string
}): Promise<SettingsActionResponse<BillingSettings>> {
  const parsed = billingPlanRequestSchema.safeParse({ planId: input.planId })
  if (!parsed.success) {
    return { success: false, message: 'Plan isteği geçersiz', error: parsed.error.message }
  }

  const payload: BillingSettings = {
    pendingPlanId: parsed.data.planId,
    requestedAt: new Date().toISOString(),
  }

  const result = await updateOrganizationSettingsSection(
    input.organizationId,
    'billing',
    payload
  )

  if (!result.success) return result

  revalidatePath('/dashboard/settings/billing')
  revalidatePath('/dashboard/settings')

  return {
    success: true,
    message: 'Plan değişikliği talebi alındı',
    data: payload,
  }
}
