'use client'

/**
 * Notifications Settings Page
 *
 * Dashboard page for managing notification preferences.
 * Features:
 * - In-app notification toggles
 * - Browser push notification settings
 * - Sound notification preferences
 * - Quiet hours configuration
 *
 * @route /dashboard/settings/notifications
 */

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useOrganization } from '@/lib/hooks/use-organization'
import {
  getNotificationPreferences,
  updateNotificationPreferences,
  type NotificationPreferences,
} from '@/lib/actions/notifications'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

// =============================================================================
// ICONS
// =============================================================================

function BellIcon({ className }: { className?: string }) {
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
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  )
}

function VolumeIcon({ className }: { className?: string }) {
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
      <path d="M11 5L6 9H2v6h4l5 4V5z" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
    </svg>
  )
}

function MoonIcon({ className }: { className?: string }) {
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
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
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

export default function NotificationsPage() {
  const { currentOrg, isLoading: orgLoading } = useOrganization()
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    loadPreferences()
  }, [])

  const loadPreferences = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await getNotificationPreferences()
      if (result.error) {
        setError(result.error)
      } else {
        setPreferences(result.data)
      }
    } catch (err) {
      setError('Bildirim tercihleri yüklenirken bir hata oluştu')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    if (!preferences) return

    setIsSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const result = await updateNotificationPreferences(preferences)
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

  const updatePreference = <K extends keyof NotificationPreferences>(
    key: K,
    value: NotificationPreferences[K]
  ) => {
    if (!preferences) return
    setPreferences({ ...preferences, [key]: value })
  }

  if (isLoading || orgLoading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Bildirimler</h1>
          <p className="mt-1 text-muted-foreground">Bildirim tercihlerinizi yönetin</p>
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

  if (!preferences) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Bildirimler</h1>
          <p className="mt-1 text-muted-foreground">Bildirim tercihlerinizi yönetin</p>
        </div>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-destructive">{error || 'Bildirim tercihleri yüklenemedi'}</p>
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
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Bildirimler</h1>
            <p className="mt-1 text-muted-foreground">
              Bildirim tercihlerinizi ve sessiz saatleri yönetin
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

      {/* In-App Notifications */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <BellIcon className="h-5 w-5" />
            <CardTitle>Uygulama İçi Bildirimler</CardTitle>
          </div>
          <CardDescription>
            Uygulama içinde gösterilecek bildirim türlerini seçin
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Toggle
            label="Sipariş Bildirimleri"
            description="Yeni siparişler ve sipariş durumu değişiklikleri için bildirim al"
            checked={preferences.inapp_orders}
            onChange={(checked) => updatePreference('inapp_orders', checked)}
          />
          <Toggle
            label="Servis İstekleri"
            description="Müşteri servis istekleri (garson çağırma, hesap isteme vb.) için bildirim al"
            checked={preferences.inapp_service_requests}
            onChange={(checked) => updatePreference('inapp_service_requests', checked)}
          />
          <Toggle
            label="Sistem Bildirimleri"
            description="Sistem güncellemeleri ve önemli duyurular için bildirim al"
            checked={preferences.inapp_system}
            onChange={(checked) => updatePreference('inapp_system', checked)}
          />
        </CardContent>
      </Card>

      {/* Browser Push Notifications */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <BellIcon className="h-5 w-5" />
            <CardTitle>Tarayıcı Bildirimleri</CardTitle>
          </div>
          <CardDescription>
            Tarayıcı push bildirimlerini etkinleştirin (tarayıcı izni gerekir)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Toggle
            label="Push Bildirimlerini Etkinleştir"
            description="Tarayıcı push bildirimlerini almak için etkinleştirin"
            checked={preferences.push_enabled}
            onChange={(checked) => updatePreference('push_enabled', checked)}
          />
          {preferences.push_enabled && (
            <>
              <div className="ml-4 space-y-4 border-l-2 border-muted pl-4">
                <Toggle
                  label="Sipariş Bildirimleri"
                  checked={preferences.push_orders}
                  onChange={(checked) => updatePreference('push_orders', checked)}
                />
                <Toggle
                  label="Servis İstekleri"
                  checked={preferences.push_service_requests}
                  onChange={(checked) => updatePreference('push_service_requests', checked)}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Sound Notifications */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <VolumeIcon className="h-5 w-5" />
            <CardTitle>Ses Bildirimleri</CardTitle>
          </div>
          <CardDescription>
            Bildirim seslerini ve ses seviyesini ayarlayın
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Toggle
            label="Ses Bildirimlerini Etkinleştir"
            description="Bildirimler için ses çal"
            checked={preferences.sound_enabled}
            onChange={(checked) => updatePreference('sound_enabled', checked)}
          />
          {preferences.sound_enabled && (
            <>
              <div className="ml-4 space-y-4 border-l-2 border-muted pl-4">
                <Toggle
                  label="Sipariş Bildirimleri"
                  checked={preferences.sound_orders}
                  onChange={(checked) => updatePreference('sound_orders', checked)}
                />
                <Toggle
                  label="Servis İstekleri"
                  checked={preferences.sound_service_requests}
                  onChange={(checked) => updatePreference('sound_service_requests', checked)}
                />
                <div className="space-y-2">
                  <Label htmlFor="sound_volume">Ses Seviyesi: {preferences.sound_volume}%</Label>
                  <Input
                    id="sound_volume"
                    type="range"
                    min="0"
                    max="100"
                    value={preferences.sound_volume}
                    onChange={(e) => updatePreference('sound_volume', parseInt(e.target.value))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>0%</span>
                    <span>100%</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Quiet Hours */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <MoonIcon className="h-5 w-5" />
            <CardTitle>Sessiz Saatler</CardTitle>
          </div>
          <CardDescription>
            Belirli saatler arasında ses bildirimlerini devre dışı bırakın
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Toggle
            label="Sessiz Saatleri Etkinleştir"
            description="Belirli saatler arasında ses bildirimlerini kapat"
            checked={preferences.quiet_hours_enabled}
            onChange={(checked) => updatePreference('quiet_hours_enabled', checked)}
          />
          {preferences.quiet_hours_enabled && (
            <div className="ml-4 space-y-4 border-l-2 border-muted pl-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="quiet_hours_start">Başlangıç Saati</Label>
                  <Input
                    id="quiet_hours_start"
                    type="time"
                    value={preferences.quiet_hours_start || ''}
                    onChange={(e) => updatePreference('quiet_hours_start', e.target.value || null)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="quiet_hours_end">Bitiş Saati</Label>
                  <Input
                    id="quiet_hours_end"
                    type="time"
                    value={preferences.quiet_hours_end || ''}
                    onChange={(e) => updatePreference('quiet_hours_end', e.target.value || null)}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Bu saatler arasında ses bildirimleri çalmayacaktır. Uygulama içi bildirimler
                normal şekilde çalışmaya devam eder.
              </p>
            </div>
          )}
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

