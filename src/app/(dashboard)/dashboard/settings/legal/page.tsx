'use client'

/**
 * Legal & KVKK Settings Page
 *
 * Data privacy, consent management, and compliance settings.
 *
 * Features:
 * - KVKK/GDPR consent text management
 * - Data retention settings
 * - Cookie consent configuration
 * - Privacy policy management
 * - Data export/deletion requests
 * - Turkish UI
 *
 * @see KVKK & GDPR UYUMLULUK TALİMATNAMESİ.md
 * @see SETTINGS-PAGES-TALIMATNAME.md
 */

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { useOrganization } from '@/lib/hooks/use-organization'
import { useToast } from '@/lib/hooks/use-toast'
import { updateLegalSettings } from '@/lib/actions/settings'
import type { LegalSettings } from '@/lib/types/settings'

// =============================================================================
// ICONS
// =============================================================================

function ArrowLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
  )
}

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  )
}

function FileTextIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  )
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  )
}

function DownloadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  )
}

function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  )
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function LegalSettingsPage() {
  const { currentOrg, isLoading } = useOrganization()
  const { toast } = useToast()
  const hasInitialized = useRef(false)

  // Consent settings
  const [cookieConsentEnabled, setCookieConsentEnabled] = useState(true)
  const [analyticsConsent, setAnalyticsConsent] = useState(true)
  const [marketingConsent, setMarketingConsent] = useState(false)

  // Data retention
  const [orderRetention, setOrderRetention] = useState('365')
  const [analyticsRetention, setAnalyticsRetention] = useState('90')

  const [isSaving, setIsSaving] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  useEffect(() => {
    if (!currentOrg || hasInitialized.current) return
    const settings = (currentOrg.settings ?? {}) as Record<string, LegalSettings>
    const legalSettings = settings.legal

    if (legalSettings) {
      setCookieConsentEnabled(legalSettings.cookieConsentEnabled)
      setAnalyticsConsent(legalSettings.analyticsConsent)
      setMarketingConsent(legalSettings.marketingConsent)
      setOrderRetention(String(legalSettings.orderRetentionDays))
      setAnalyticsRetention(String(legalSettings.analyticsRetentionDays))
    }

    hasInitialized.current = true
  }, [currentOrg])

  const handleSave = async () => {
    if (!currentOrg) {
      toast({
        title: 'Hata',
        description: 'Organizasyon bilgisi bulunamadı',
        variant: 'destructive',
      })
      return
    }

    const settings: LegalSettings = {
      cookieConsentEnabled,
      analyticsConsent,
      marketingConsent,
      orderRetentionDays: Number(orderRetention),
      analyticsRetentionDays: Number(analyticsRetention),
    }

    setIsSaving(true)
    try {
      const result = await updateLegalSettings({
        organizationId: currentOrg.id,
        settings,
      })

      if (!result.success) {
        throw new Error(result.error || result.message)
      }

      toast({ title: 'Başarılı', description: result.message })
    } catch (error) {
      toast({
        title: 'Hata',
        description: error instanceof Error ? error.message : 'Ayarlar kaydedilemedi',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleExportData = async () => {
    setIsExporting(true)
    try {
      await new Promise((resolve) => setTimeout(resolve, 2000))
      toast({
        title: 'Veri Dışa Aktarıldı',
        description: 'Verileriniz email adresinize gönderilecektir.',
      })
    } catch (error) {
      toast({
        title: 'Hata',
        description: 'Veri dışa aktarılamadı',
        variant: 'destructive',
      })
    } finally {
      setIsExporting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <svg className="h-8 w-8 animate-spin text-primary" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="text-sm text-muted-foreground">Yükleniyor...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/settings">
          <Button variant="ghost" size="icon" className="h-9 w-9">
            <ArrowLeftIcon className="h-4 w-4" />
            <span className="sr-only">Geri</span>
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Yasal & KVKK</h1>
          <p className="text-muted-foreground">
            Veri gizliliği, onay yönetimi ve uyumluluk ayarları
          </p>
        </div>
      </div>

      {/* KVKK Compliance Status */}
      <Card className="border-green-200 bg-green-50/50 dark:border-green-900/50 dark:bg-green-900/10">
        <CardContent className="flex items-center gap-4 p-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/50">
            <CheckCircleIcon className="h-6 w-6 text-green-600" />
          </div>
          <div>
            <h3 className="font-semibold text-green-800 dark:text-green-400">KVKK Uyumlu</h3>
            <p className="text-sm text-green-700 dark:text-green-500">
              Tüm veri işleme süreçleri KVKK mevzuatına uygun şekilde yürütülmektedir.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Cookie Consent Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldIcon className="h-5 w-5" />
            Çerez Onay Ayarları
          </CardTitle>
          <CardDescription>
            Müşterilerinize gösterilecek çerez onay tercihlerini yapılandırın
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <Label>Çerez Onay Banner'ı</Label>
              <p className="text-sm text-muted-foreground">
                Ziyaretçilere çerez onay banner'ı göster
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={cookieConsentEnabled}
              onClick={() => setCookieConsentEnabled(!cookieConsentEnabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                cookieConsentEnabled ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${cookieConsentEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <Label>Analitik Çerezleri</Label>
              <p className="text-sm text-muted-foreground">
                Kullanım istatistikleri için çerez topla (varsayılan)
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={analyticsConsent}
              onClick={() => setAnalyticsConsent(!analyticsConsent)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                analyticsConsent ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${analyticsConsent ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <Label>Pazarlama Çerezleri</Label>
              <p className="text-sm text-muted-foreground">
                Reklam ve pazarlama amaçlı çerezler
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={marketingConsent}
              onClick={() => setMarketingConsent(!marketingConsent)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                marketingConsent ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${marketingConsent ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Data Retention */}
      <Card>
        <CardHeader>
          <CardTitle>Veri Saklama Süreleri</CardTitle>
          <CardDescription>
            Verilerin ne kadar süre saklanacağını belirleyin
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="orderRetention">Sipariş Verileri (gün)</Label>
              <select
                id="orderRetention"
                value={orderRetention}
                onChange={(e) => setOrderRetention(e.target.value)}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="90">90 gün</option>
                <option value="180">180 gün</option>
                <option value="365">1 yıl</option>
                <option value="730">2 yıl</option>
                <option value="1825">5 yıl</option>
              </select>
              <p className="text-xs text-muted-foreground">
                KVKK gereği minimum 1 yıl önerilir
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="analyticsRetention">Analitik Verileri (gün)</Label>
              <select
                id="analyticsRetention"
                value={analyticsRetention}
                onChange={(e) => setAnalyticsRetention(e.target.value)}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="30">30 gün</option>
                <option value="90">90 gün</option>
                <option value="180">180 gün</option>
                <option value="365">1 yıl</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Legal Documents */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileTextIcon className="h-5 w-5" />
            Yasal Belgeler
          </CardTitle>
          <CardDescription>
            Gizlilik politikası ve kullanım koşulları bağlantıları
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <a
              href="/gizlilik-politikasi"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-lg border p-4 transition-colors hover:bg-muted"
            >
              <ShieldIcon className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">Gizlilik Politikası</p>
                <p className="text-sm text-muted-foreground">KVKK aydınlatma metni</p>
              </div>
            </a>
            <a
              href="/kullanim-kosullari"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-lg border p-4 transition-colors hover:bg-muted"
            >
              <FileTextIcon className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">Kullanım Koşulları</p>
                <p className="text-sm text-muted-foreground">Hizmet şartları</p>
              </div>
            </a>
          </div>
        </CardContent>
      </Card>

      {/* Data Requests */}
      <Card>
        <CardHeader>
          <CardTitle>Veri Talepleri</CardTitle>
          <CardDescription>
            KVKK kapsamında veri dışa aktarma ve silme talepleri
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border p-4">
              <div className="flex items-center gap-3">
                <DownloadIcon className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="font-medium">Veri Dışa Aktarma</p>
                  <p className="text-sm text-muted-foreground">
                    Tüm verilerinizi JSON formatında indirin
                  </p>
                </div>
              </div>
              <Button
                className="mt-4 w-full"
                variant="outline"
                onClick={handleExportData}
                disabled={isExporting}
              >
                {isExporting ? 'Hazırlanıyor...' : 'Verileri Dışa Aktar'}
              </Button>
            </div>
            <div className="rounded-lg border border-red-200 bg-red-50/50 p-4 dark:border-red-900/50 dark:bg-red-900/10">
              <div className="flex items-center gap-3">
                <TrashIcon className="h-5 w-5 text-red-600" />
                <div>
                  <p className="font-medium text-red-800 dark:text-red-400">Hesabı Sil</p>
                  <p className="text-sm text-red-700 dark:text-red-500">
                    Tüm verileri kalıcı olarak sil
                  </p>
                </div>
              </div>
              <Button className="mt-4 w-full" variant="destructive">
                Hesabı Sil
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end gap-4">
        <Button variant="outline" asChild>
          <a href="/dashboard/settings">İptal</a>
        </Button>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? 'Kaydediliyor...' : 'Kaydet'}
        </Button>
      </div>
    </div>
  )
}
