'use client'

/**
 * Menu Settings Page
 *
 * Configure menu display, language, currency, and label settings.
 *
 * Features:
 * - Menu display mode selection (list, grid, cards)
 * - Default language selection
 * - Currency settings
 * - Price display options
 * - Label management (vegan, vegetarian, spicy, etc.)
 * - Image quality settings
 * - Turkish UI
 *
 * @see SETTINGS-PAGES-TALIMATNAME.md
 */

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { useOrganization } from '@/lib/hooks/use-organization'
import { useToast } from '@/lib/hooks/use-toast'
import { updateMenuSettings } from '@/lib/actions/settings'
import type { MenuSettings } from '@/lib/types/settings'

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

function MenuIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 6h18M3 12h18M3 18h18" />
    </svg>
  )
}

function GridIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
    </svg>
  )
}

function ListIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" />
      <line x1="3" y1="12" x2="3.01" y2="12" />
      <line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  )
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function MenuSettingsPage() {
  const { currentOrg, isLoading } = useOrganization()
  const { toast } = useToast()
  const hasInitialized = useRef(false)

  const [menuDisplayMode, setMenuDisplayMode] = useState<'list' | 'grid' | 'compact'>('grid')
  const [defaultLanguage, setDefaultLanguage] = useState('tr')
  const [currency, setCurrency] = useState('TRY')
  const [showPricesWithTax, setShowPricesWithTax] = useState(true)
  const [showAllergens, setShowAllergens] = useState(true)
  const [showNutrition, setShowNutrition] = useState(false)
  const [imageQuality, setImageQuality] = useState<'low' | 'medium' | 'high'>('medium')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!currentOrg || hasInitialized.current) return
    const settings = (currentOrg.settings ?? {}) as Record<string, MenuSettings>
    const menuSettings = settings.menu

    if (menuSettings) {
      setMenuDisplayMode(menuSettings.displayMode)
      setDefaultLanguage(menuSettings.defaultLanguage)
      setCurrency(menuSettings.currency)
      setShowPricesWithTax(menuSettings.showPricesWithTax)
      setShowAllergens(menuSettings.showAllergens)
      setShowNutrition(menuSettings.showNutrition)
      setImageQuality(menuSettings.imageQuality)
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

    const settings: MenuSettings = {
      displayMode: menuDisplayMode,
      defaultLanguage,
      currency,
      showPricesWithTax,
      showAllergens,
      showNutrition,
      imageQuality,
    }

    setIsSaving(true)
    try {
      const result = await updateMenuSettings({
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
          <h1 className="text-2xl font-bold tracking-tight">Menü Ayarları</h1>
          <p className="text-muted-foreground">
            Dijital menünüzün görünüm ve davranış ayarlarını yapılandırın
          </p>
        </div>
      </div>

      {/* Display Mode */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MenuIcon className="h-5 w-5" />
            Görüntüleme Modu
          </CardTitle>
          <CardDescription>
            Menünüzün müşterilere nasıl görüneceğini seçin
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <button
              type="button"
              onClick={() => setMenuDisplayMode('list')}
              className={`flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-all ${
                menuDisplayMode === 'list'
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <ListIcon className="h-8 w-8" />
              <span className="text-sm font-medium">Liste</span>
            </button>
            <button
              type="button"
              onClick={() => setMenuDisplayMode('grid')}
              className={`flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-all ${
                menuDisplayMode === 'grid'
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <GridIcon className="h-8 w-8" />
              <span className="text-sm font-medium">Izgara</span>
            </button>
            <button
              type="button"
              onClick={() => setMenuDisplayMode('compact')}
              className={`flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-all ${
                menuDisplayMode === 'compact'
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <MenuIcon className="h-8 w-8" />
              <span className="text-sm font-medium">Kompakt</span>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Language & Currency */}
      <Card>
        <CardHeader>
          <CardTitle>Dil ve Para Birimi</CardTitle>
          <CardDescription>
            Menü dili ve fiyat gösterim ayarları
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="language">Varsayılan Dil</Label>
              <select
                id="language"
                value={defaultLanguage}
                onChange={(e) => setDefaultLanguage(e.target.value)}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="tr">Türkçe</option>
                <option value="en">English</option>
                <option value="ar">العربية</option>
                <option value="ru">Русский</option>
                <option value="de">Deutsch</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="currency">Para Birimi</Label>
              <select
                id="currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="TRY">TRY (₺)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <Label>KDV Dahil Fiyat Göster</Label>
              <p className="text-sm text-muted-foreground">
                Fiyatları KDV dahil olarak göster
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={showPricesWithTax}
              onClick={() => setShowPricesWithTax(!showPricesWithTax)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                showPricesWithTax ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${showPricesWithTax ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Display Options */}
      <Card>
        <CardHeader>
          <CardTitle>Görüntüleme Seçenekleri</CardTitle>
          <CardDescription>
            Menüde görünecek ek bilgileri ayarlayın
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <Label>Alerjen Bilgilerini Göster</Label>
              <p className="text-sm text-muted-foreground">
                Ürünlerin alerjen uyarılarını göster
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={showAllergens}
              onClick={() => setShowAllergens(!showAllergens)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                showAllergens ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${showAllergens ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <Label>Besin Değerlerini Göster</Label>
              <p className="text-sm text-muted-foreground">
                Kalori ve besin değerlerini göster
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={showNutrition}
              onClick={() => setShowNutrition(!showNutrition)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                showNutrition ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${showNutrition ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Image Quality */}
      <Card>
        <CardHeader>
          <CardTitle>Görsel Kalitesi</CardTitle>
          <CardDescription>
            Ürün görsellerinin kalitesini ayarlayın (düşük kalite daha hızlı yüklenir)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            {(['low', 'medium', 'high'] as const).map((quality) => (
              <button
                key={quality}
                type="button"
                onClick={() => setImageQuality(quality)}
                className={`rounded-lg border-2 p-4 text-center transition-all ${
                  imageQuality === quality
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <span className="font-medium">
                  {quality === 'low' ? 'Düşük' : quality === 'medium' ? 'Orta' : 'Yüksek'}
                </span>
                <p className="mt-1 text-xs text-muted-foreground">
                  {quality === 'low' ? '~50KB' : quality === 'medium' ? '~150KB' : '~500KB'}
                </p>
              </button>
            ))}
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
