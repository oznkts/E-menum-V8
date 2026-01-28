export type MenuDisplayMode = 'list' | 'grid' | 'compact'
export type MenuImageQuality = 'low' | 'medium' | 'high'

export interface MenuSettings {
  displayMode: MenuDisplayMode
  defaultLanguage: string
  currency: string
  showPricesWithTax: boolean
  showAllergens: boolean
  showNutrition: boolean
  imageQuality: MenuImageQuality
}

export interface LegalSettings {
  cookieConsentEnabled: boolean
  analyticsConsent: boolean
  marketingConsent: boolean
  orderRetentionDays: number
  analyticsRetentionDays: number
}

export interface BillingSettings {
  pendingPlanId?: string
  requestedAt?: string
}
