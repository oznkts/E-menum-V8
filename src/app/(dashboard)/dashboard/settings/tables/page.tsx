'use client'

/**
 * Table Settings Page
 *
 * Dashboard page for managing table configuration and QR code settings.
 * Features:
 * - QR code style and template settings
 * - Default table configuration
 * - Display preferences
 *
 * @route /dashboard/settings/tables
 */

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useOrganization } from '@/lib/hooks/use-organization'
import {
  getTableSettings,
  updateTableSettings,
  type TableSettings,
} from '@/lib/actions/table-settings'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

// =============================================================================
// ICONS
// =============================================================================

function TableIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="4" width="18" height="14" rx="2" />
      <path d="M3 10h18M7 20v-2M17 20v-2" />
    </svg>
  )
}

function QRIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <path d="M14 14h3v3h-3zM17 17h3v3h-3zM14 17h3v3h-3z" />
    </svg>
  )
}

function SettingsIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
    </svg>
  )
}

function ArrowLeftIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
  )
}

// =============================================================================
// TOGGLE COMPONENT
// =============================================================================

interface ToggleProps {
  label: string
  description?: string
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
}

function Toggle({ label, description, checked, onChange, disabled }: ToggleProps) {
  return (
    <div className="flex items-start justify-between">
      <div className="flex-1">
        <Label htmlFor={label} className="text-sm font-medium">
          {label}
        </Label>
        {description && (
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`
          relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent
          transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2
          ${checked ? 'bg-primary-600' : 'bg-muted'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <span
          className={`
            pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0
            transition duration-200 ease-in-out
            ${checked ? 'translate-x-5' : 'translate-x-0'}
          `}
        />
      </button>
    </div>
  )
}

// =============================================================================
// MAIN PAGE COMPONENT
// =============================================================================

export default function TableSettingsPage() {
  const { currentOrg, isLoading: orgLoading } = useOrganization()
  const [settings, setSettings] = useState<TableSettings | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    if (currentOrg) {
      loadSettings()
    }
  }, [currentOrg?.id])

  const loadSettings = async () => {
    if (!currentOrg) return

    setIsLoading(true)
    setError(null)

    try {
      const result = await getTableSettings(currentOrg.id)
      if (result.error) {
        setError(result.error)
      } else {
        setSettings(result.data)
      }
    } catch (err) {
      setError('Masa ayarları yüklenirken bir hata oluştu')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    if (!currentOrg || !settings) return

    setIsSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const result = await updateTableSettings(currentOrg.id, settings)
      if (result.error) {
        setError(result.error)
      } else {
        setSuccess(result.success || 'Ayarlar kaydedildi')
        setTimeout(() => setSuccess(null), 3000)
      }
    } catch (err) {
      setError('Ayarlar kaydedilirken bir hata oluştu')
    } finally {
      setIsSaving(false)
    }
  }

  const updateSetting = <K extends keyof TableSettings>(
    section: K,
    key: keyof TableSettings[K],
    value: any
  ) => {
    if (!settings) return
    setSettings({
      ...settings,
      [section]: {
        ...settings[section],
        [key]: value,
      },
    })
  }

  if (isLoading || orgLoading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Masa Ayarları</h1>
          <p className="mt-1 text-muted-foreground">Masa yapılandırması ve QR kod ayarları</p>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 animate-pulse rounded bg-muted" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!currentOrg) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Masa Ayarları</h1>
          <p className="mt-1 text-muted-foreground">Masa yapılandırması ve QR kod ayarları</p>
        </div>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">
              Ayarları görüntülemek için bir organizasyon seçmeniz gerekmektedir.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!settings) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Masa Ayarları</h1>
          <p className="mt-1 text-muted-foreground">Masa yapılandırması ve QR kod ayarları</p>
        </div>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-destructive">{error || 'Masa ayarları yüklenemedi'}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/settings">
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <ArrowLeftIcon className="h-4 w-4" />
              <span className="sr-only">Geri</span>
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Masa Ayarları</h1>
            <p className="mt-1 text-muted-foreground">
              Masa yapılandırması, QR kod stili ve görüntüleme tercihleri
            </p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
        </Button>
      </div>

      {/* Success Message */}
      {success && (
        <Card className="border-green-500 bg-green-50 dark:bg-green-900/20">
          <CardContent className="p-4">
            <p className="text-sm text-green-800 dark:text-green-400">{success}</p>
          </CardContent>
        </Card>
      )}

      {/* Error Message */}
      {error && (
        <Card className="border-destructive">
          <CardContent className="p-4">
            <p className="text-sm text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* QR Code Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <QRIcon className="h-5 w-5" />
            <CardTitle>QR Kod Ayarları</CardTitle>
          </div>
          <CardDescription>
            QR kod görünümü ve stil tercihlerini yapılandırın
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="qr_template">QR Kod Şablonu</Label>
            <select
              id="qr_template"
              value={settings.qr.template}
              onChange={(e) =>
                updateSetting('qr', 'template', e.target.value as TableSettings['qr']['template'])
              }
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="default">Varsayılan</option>
              <option value="minimal">Minimal</option>
              <option value="branded">Markalı</option>
              <option value="custom">Özel</option>
            </select>
            <p className="text-xs text-muted-foreground">
              QR kodun görsel stilini seçin
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="qr_color_scheme">Renk Şeması</Label>
            <select
              id="qr_color_scheme"
              value={settings.qr.color_scheme}
              onChange={(e) =>
                updateSetting(
                  'qr',
                  'color_scheme',
                  e.target.value as TableSettings['qr']['color_scheme']
                )
              }
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="dark">Koyu</option>
              <option value="light">Açık</option>
              <option value="brand">Marka Rengi</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="qr_size">QR Kod Boyutu</Label>
            <select
              id="qr_size"
              value={settings.qr.size}
              onChange={(e) =>
                updateSetting('qr', 'size', e.target.value as TableSettings['qr']['size'])
              }
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="small">Küçük</option>
              <option value="medium">Orta</option>
              <option value="large">Büyük</option>
            </select>
          </div>

          <Toggle
            label="Logoyu QR Koda Ekle"
            description="QR kod üzerinde restoran logosunu göster"
            checked={settings.qr.include_logo}
            onChange={(checked) => updateSetting('qr', 'include_logo', checked)}
          />

          <Toggle
            label="Masa Numarasını Göster"
            description="QR kod üzerinde masa numarasını göster"
            checked={settings.qr.show_table_number}
            onChange={(checked) => updateSetting('qr', 'show_table_number', checked)}
          />

          <Toggle
            label="Restoran Adını Göster"
            description="QR kod üzerinde restoran adını göster"
            checked={settings.qr.show_restaurant_name}
            onChange={(checked) => updateSetting('qr', 'show_restaurant_name', checked)}
          />
        </CardContent>
      </Card>

      {/* Default Table Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <SettingsIcon className="h-5 w-5" />
            <CardTitle>Varsayılan Masa Ayarları</CardTitle>
          </div>
          <CardDescription>
            Yeni masalar oluşturulurken kullanılacak varsayılan değerler
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="default_capacity">Varsayılan Kapasite</Label>
              <Input
                id="default_capacity"
                type="number"
                min="1"
                max="50"
                value={settings.defaults.default_capacity}
                onChange={(e) =>
                  updateSetting('defaults', 'default_capacity', parseInt(e.target.value) || 4)
                }
              />
              <p className="text-xs text-muted-foreground">Yeni masalar için varsayılan kişi sayısı</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="default_min_capacity">Minimum Kapasite</Label>
              <Input
                id="default_min_capacity"
                type="number"
                min="1"
                max={settings.defaults.default_capacity}
                value={settings.defaults.default_min_capacity}
                onChange={(e) =>
                  updateSetting('defaults', 'default_min_capacity', parseInt(e.target.value) || 1)
                }
              />
              <p className="text-xs text-muted-foreground">Rezervasyon için minimum kişi sayısı</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="default_floor">Varsayılan Kat</Label>
              <Input
                id="default_floor"
                type="number"
                min="1"
                value={settings.defaults.default_floor}
                onChange={(e) =>
                  updateSetting('defaults', 'default_floor', parseInt(e.target.value) || 1)
                }
              />
              <p className="text-xs text-muted-foreground">Yeni masalar için varsayılan kat numarası</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="default_section">Varsayılan Bölge</Label>
              <Input
                id="default_section"
                type="text"
                placeholder="Örn: Salon, Bahçe, Teras"
                value={settings.defaults.default_section || ''}
                onChange={(e) =>
                  updateSetting('defaults', 'default_section', e.target.value || null)
                }
              />
              <p className="text-xs text-muted-foreground">Yeni masalar için varsayılan bölge adı</p>
            </div>
          </div>

          <Toggle
            label="Otomatik QR Kod Oluştur"
            description="Yeni masa oluşturulduğunda otomatik olarak QR kod oluştur"
            checked={settings.defaults.auto_generate_qr}
            onChange={(checked) => updateSetting('defaults', 'auto_generate_qr', checked)}
          />
        </CardContent>
      </Card>

      {/* Display Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <TableIcon className="h-5 w-5" />
            <CardTitle>Görüntüleme Tercihleri</CardTitle>
          </div>
          <CardDescription>
            Masa listesinde gösterilecek bilgileri seçin
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Toggle
            label="Bölgeyi Göster"
            description="Masa listesinde bölge bilgisini göster"
            checked={settings.display.show_section_in_list}
            onChange={(checked) => updateSetting('display', 'show_section_in_list', checked)}
          />

          <Toggle
            label="Kapasiteyi Göster"
            description="Masa listesinde kapasite bilgisini göster"
            checked={settings.display.show_capacity_in_list}
            onChange={(checked) => updateSetting('display', 'show_capacity_in_list', checked)}
          />

          <Toggle
            label="Durum Rozetlerini Göster"
            description="Masa listesinde durum rozetlerini göster (Müsait, Dolu, Rezerve vb.)"
            checked={settings.display.show_status_badges}
            onChange={(checked) => updateSetting('display', 'show_status_badges', checked)}
          />

          <Toggle
            label="Bölgeye Göre Grupla"
            description="Masaları bölgelerine göre gruplandır"
            checked={settings.display.group_by_section}
            onChange={(checked) => updateSetting('display', 'group_by_section', checked)}
          />
        </CardContent>
      </Card>

      {/* Save Button (Bottom) */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving} size="lg">
          {isSaving ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
        </Button>
      </div>
    </div>
  )
}

