'use client'

/**
 * Appearance Settings Page
 *
 * Dashboard page for managing restaurant theming including:
 * - Logo upload
 * - Cover image upload
 * - Brand color customization (primary/secondary)
 * - Live preview
 *
 * Features:
 * - Real-time preview of theme changes
 * - Color picker with preset options
 * - Image upload via Supabase Storage
 * - Mobile-responsive design
 * - Turkish language UI
 *
 * @route /dashboard/settings/appearance
 */

import { useState, useCallback, useEffect } from 'react'
import Link from 'next/link'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/lib/hooks/use-toast'
import { useOrganization } from '@/lib/hooks/use-organization'
import {
  getThemeSettings as getThemeSettingsAction,
  updateThemeSettings as updateThemeSettingsAction,
} from '@/lib/actions/theme'
import {
  PRESET_COLORS,
  isValidHexColor,
  type ThemeSettings,
  type ThemeUpdateInput,
} from '@/lib/dal/themes-client'
import { uploadImage, deleteImage } from '@/lib/actions/storage'
import { STORAGE_BUCKETS, extractPathFromUrl } from '@/lib/storage/shared'
import { MenuView } from '@/components/features/public-menu/menu-view'
import type { Category, Product } from '@/types/database'

// =============================================================================
// QUERY KEYS
// =============================================================================

const themeQueryKeys = {
  all: ['theme'] as const,
  settings: (orgId: string) => [...themeQueryKeys.all, 'settings', orgId] as const,
}

// =============================================================================
// ICONS
// =============================================================================

function PaletteIcon({ className }: { className?: string }) {
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
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2a7.5 7.5 0 0 0 0 15 2.5 2.5 0 0 0 2.5-2.5c0-.624-.462-1.178-.858-1.611C13.27 12.487 13 12.042 13 11.5a1.5 1.5 0 0 1 1.5-1.5h.5A5.5 5.5 0 0 0 12 2z" />
      <circle cx="7" cy="12" r="1" fill="currentColor" />
      <circle cx="12" cy="7" r="1" fill="currentColor" />
      <circle cx="17" cy="12" r="1" fill="currentColor" />
    </svg>
  )
}

function ImageIcon({ className }: { className?: string }) {
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
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  )
}

function UploadIcon({ className }: { className?: string }) {
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
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  )
}

function TrashIcon({ className }: { className?: string }) {
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
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  )
}

function SpinnerIcon({ className }: { className?: string }) {
  return (
    <svg
      className={`${className} animate-spin`}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  )
}

function CheckIcon({ className }: { className?: string }) {
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
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

// =============================================================================
// COMPONENTS
// =============================================================================

interface ColorPickerProps {
  label: string
  value: string | null
  onChange: (color: string | null) => void
  disabled?: boolean
}

function ColorPicker({ label, value, onChange, disabled }: ColorPickerProps) {
  const [customColor, setCustomColor] = useState(value || '')
  const [showCustomInput, setShowCustomInput] = useState(false)

  const handleCustomColorChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newColor = e.target.value
      setCustomColor(newColor)
      if (isValidHexColor(newColor)) {
        onChange(newColor)
      }
    },
    [onChange]
  )

  const handlePresetClick = useCallback(
    (presetValue: string) => {
      setCustomColor(presetValue)
      setShowCustomInput(false)
      onChange(presetValue)
    },
    [onChange]
  )

  const handleClear = useCallback(() => {
    setCustomColor('')
    onChange(null)
  }, [onChange])

  return (
    <div className="space-y-3">
      <Label>{label}</Label>

      {/* Preset Colors */}
      <div className="flex flex-wrap gap-2">
        {PRESET_COLORS.map((preset) => (
          <button
            key={preset.value}
            type="button"
            onClick={() => handlePresetClick(preset.value)}
            disabled={disabled}
            className={`relative h-8 w-8 rounded-full border-2 transition-all ${
              value === preset.value
                ? 'border-foreground ring-2 ring-foreground ring-offset-2'
                : 'border-transparent hover:scale-110'
            } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
            style={{ backgroundColor: preset.value }}
            title={preset.name}
            aria-label={`${preset.name} rengi seç`}
          >
            {value === preset.value && (
              <CheckIcon
                className="absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2"
                style={{ color: preset.textColor }}
              />
            )}
          </button>
        ))}

        {/* Custom Color Button */}
        <button
          type="button"
          onClick={() => setShowCustomInput(!showCustomInput)}
          disabled={disabled}
          className={`flex h-8 w-8 items-center justify-center rounded-full border-2 border-dashed transition-all ${
            showCustomInput
              ? 'border-primary bg-primary/10'
              : 'border-muted-foreground/25 hover:border-primary/50'
          } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
          title="Özel renk"
          aria-label="Özel renk seç"
        >
          <span className="text-xs font-medium text-muted-foreground">#</span>
        </button>
      </div>

      {/* Custom Color Input */}
      {showCustomInput && (
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Input
              type="text"
              value={customColor}
              onChange={handleCustomColorChange}
              placeholder="#3B82F6"
              disabled={disabled}
              className="pl-10"
              maxLength={7}
            />
            <div
              className="absolute left-2 top-1/2 h-6 w-6 -translate-y-1/2 rounded border"
              style={{
                backgroundColor: isValidHexColor(customColor) ? customColor : '#ffffff',
              }}
            />
          </div>
          <Input
            type="color"
            value={customColor || '#3B82F6'}
            onChange={(e) => {
              setCustomColor(e.target.value)
              onChange(e.target.value)
            }}
            disabled={disabled}
            className="h-10 w-14 cursor-pointer p-1"
          />
        </div>
      )}

      {/* Clear Button */}
      {value && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleClear}
          disabled={disabled}
          className="text-muted-foreground"
        >
          Rengi kaldır
        </Button>
      )}
    </div>
  )
}

interface ImageUploaderProps {
  label: string
  description?: string
  currentUrl: string | null
  onUpload: (url: string) => void
  onRemove: () => void
  organizationId: string
  aspectRatio?: 'square' | 'banner'
  disabled?: boolean
}

function ImageUploader({
  label,
  description,
  currentUrl,
  onUpload,
  onRemove,
  organizationId,
  aspectRatio = 'square',
  disabled,
}: ImageUploaderProps) {
  const { toast } = useToast()
  const [isUploading, setIsUploading] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

  const handleUpload = useCallback(
    async (file: File) => {
      if (isUploading || disabled) return

      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: 'Hata',
          description: 'Sadece JPEG, PNG ve WebP dosyaları desteklenir.',
          variant: 'destructive',
        })
        return
      }

      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: 'Hata',
          description: 'Dosya boyutu 5MB\'dan küçük olmalıdır.',
          variant: 'destructive',
        })
        return
      }

      setIsUploading(true)

      try {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('organizationId', organizationId)
        formData.append('bucket', STORAGE_BUCKETS.ORGANIZATION_ASSETS)

        const result = await uploadImage(formData)

        if (result.success && result.data) {
          onUpload(result.data.url)
          toast({
            title: 'Başarılı',
            description: 'Görsel yüklendi',
          })
        } else {
          toast({
            title: 'Hata',
            description: result.message || 'Görsel yüklenemedi',
            variant: 'destructive',
          })
        }
      } catch {
        toast({
          title: 'Hata',
          description: 'Görsel yüklenirken bir hata oluştu',
          variant: 'destructive',
        })
      } finally {
        setIsUploading(false)
      }
    },
    [organizationId, onUpload, toast, isUploading, disabled]
  )

  const handleRemove = useCallback(async () => {
    if (!currentUrl || isDeleting || disabled) return

    setIsDeleting(true)

    try {
      // Extract path from URL
      const path = extractPathFromUrl(currentUrl, STORAGE_BUCKETS.ORGANIZATION_ASSETS)

      if (path) {
        await deleteImage(STORAGE_BUCKETS.ORGANIZATION_ASSETS, path)
      }

      onRemove()
      toast({
        title: 'Başarılı',
        description: 'Görsel silindi',
      })
    } catch {
      toast({
        title: 'Hata',
        description: 'Görsel silinemedi',
        variant: 'destructive',
      })
    } finally {
      setIsDeleting(false)
    }
  }, [currentUrl, onRemove, toast, isDeleting, disabled])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)

      const files = e.dataTransfer.files
      if (files.length > 0) {
        handleUpload(files[0])
      }
    },
    [handleUpload]
  )

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files
      if (files && files.length > 0) {
        handleUpload(files[0])
      }
      e.target.value = ''
    },
    [handleUpload]
  )

  return (
    <div className="space-y-3">
      <div>
        <Label>{label}</Label>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>

      {currentUrl ? (
        // Current Image Preview
        <div
          className={`relative overflow-hidden rounded-lg border ${
            aspectRatio === 'banner' ? 'aspect-[3/1]' : 'aspect-square'
          } ${aspectRatio === 'square' ? 'max-w-[200px]' : ''}`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={currentUrl}
            alt={label}
            className="h-full w-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src =
                'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxyZWN0IHg9IjMiIHk9IjMiIHdpZHRoPSIxOCIgaGVpZ2h0PSIxOCIgcng9IjIiIHJ5PSIyIi8+PGNpcmNsZSBjeD0iOC41IiBjeT0iOC41IiByPSIxLjUiLz48cG9seWxpbmUgcG9pbnRzPSIyMSAxNSAxNiAxMCA1IDIxIi8+PC9zdmc+'
            }}
          />

          {/* Remove Button */}
          <button
            type="button"
            onClick={handleRemove}
            disabled={isDeleting || disabled}
            className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-destructive/90 text-destructive-foreground transition-opacity hover:bg-destructive disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Görseli kaldır"
          >
            {isDeleting ? (
              <SpinnerIcon className="h-4 w-4" />
            ) : (
              <TrashIcon className="h-4 w-4" />
            )}
          </button>
        </div>
      ) : (
        // Upload Area
        <div
          onDragEnter={(e) => {
            e.preventDefault()
            if (!disabled) setIsDragging(true)
          }}
          onDragLeave={(e) => {
            e.preventDefault()
            setIsDragging(false)
          }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          className={`relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors ${
            aspectRatio === 'banner' ? 'aspect-[3/1]' : 'aspect-square max-w-[200px]'
          } ${
            isDragging
              ? 'border-primary bg-primary/5'
              : 'border-muted-foreground/25 hover:border-primary/50'
          } ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
          onClick={() => {
            if (!disabled && !isUploading) {
              document.getElementById(`file-${label}`)?.click()
            }
          }}
        >
          <input
            id={`file-${label}`}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            onChange={handleFileSelect}
            className="hidden"
            disabled={disabled || isUploading}
          />

          {isUploading ? (
            <>
              <SpinnerIcon className="h-8 w-8 text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">Yükleniyor...</p>
            </>
          ) : (
            <>
              <UploadIcon className="h-8 w-8 text-muted-foreground" />
              <p className="mt-2 text-center text-sm text-muted-foreground">
                {isDragging ? (
                  <span className="font-medium text-primary">Bırakarak yükle</span>
                ) : (
                  <>
                    <span className="font-medium text-foreground">Tıklayın</span> veya
                    sürükleyip bırakın
                  </>
                )}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                JPEG, PNG, WebP - Maks. 5MB
              </p>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// =============================================================================
// PREVIEW COMPONENT
// =============================================================================

interface ThemePreviewProps {
  theme: ThemeSettings | null
  logoUrl: string | null
  coverUrl: string | null
  primaryColor: string | null
  secondaryColor: string | null
  organizationId?: string
}

function ThemePreview({
  theme,
  logoUrl,
  coverUrl,
  primaryColor,
  secondaryColor,
  organizationId,
}: ThemePreviewProps) {
  // Create a mock organization with current theme settings for preview
  const previewOrganization = {
    id: organizationId || 'preview',
    name: theme?.name || 'Restoran Adı',
    slug: 'preview',
    description: 'Dijital Menü',
    logo_url: logoUrl,
    cover_url: coverUrl,
    primary_color: primaryColor,
    secondary_color: secondaryColor,
    currency: 'TRY',
    is_active: true,
    deleted_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    owner_id: '',
    subscription_tier: 'lite' as const,
    subscription_status: 'active' as const,
    email: null,
    phone: null,
    website: null,
    address: null,
    city: null,
    district: null,
    postal_code: null,
    country: null,
    latitude: null,
    longitude: null,
    timezone: null,
    language: null,
    business_hours: null,
    settings: null,
    tax_id: null,
    trade_registration: null,
    trial_ends_at: null,
  }

  // Create sample categories for preview
  const sampleCategories: Category[] = [
    {
      id: 'preview-cat-1',
      organization_id: organizationId || 'preview',
      name: 'Ana Yemekler',
      slug: 'ana-yemekler',
      description: null,
      icon: '🍽️',
      image_url: null,
      parent_id: null,
      sort_order: 0,
      is_visible: true,
      available_from: null,
      available_until: null,
      deleted_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'preview-cat-2',
      organization_id: organizationId || 'preview',
      name: 'İçecekler',
      slug: 'icecekler',
      description: null,
      icon: '🥤',
      image_url: null,
      parent_id: null,
      sort_order: 1,
      is_visible: true,
      available_from: null,
      available_until: null,
      deleted_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'preview-cat-3',
      organization_id: organizationId || 'preview',
      name: 'Tatlılar',
      slug: 'tatlilar',
      description: null,
      icon: '🍰',
      image_url: null,
      parent_id: null,
      sort_order: 2,
      is_visible: true,
      available_from: null,
      available_until: null,
      deleted_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ]

  // Create sample products for preview
  const sampleProducts: Product[] = [
    {
      id: 'preview-prod-1',
      organization_id: organizationId || 'preview',
      category_id: 'preview-cat-1',
      name: 'Örnek Ürün',
      slug: 'ornek-urun',
      description: 'Lezzetli bir ürün açıklaması',
      short_description: null,
      image_urls: null,
      price: 150,
      compare_at_price: null,
      currency: 'TRY',
      status: 'active',
      is_available: true,
      stock_quantity: null,
      sort_order: 0,
      preparation_time_minutes: null,
      allergens: null,
      is_vegetarian: false,
      is_vegan: false,
      is_gluten_free: false,
      is_spicy: false,
      spicy_level: null,
      nutritional_info: null,
      tags: null,
      is_featured: false,
      featured_until: null,
      attributes: null,
      meta_title: null,
      meta_description: null,
      deleted_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ]

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Önizleme</CardTitle>
        <CardDescription>
          Menünüzün müşterilerinize nasıl görüneceği
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {/* Real Menu Preview with dynamic colors */}
        <div className="relative h-[600px] overflow-hidden border-t">
          <div className="h-full overflow-y-auto">
            <MenuView
              organization={previewOrganization as any}
              categories={sampleCategories}
              products={sampleProducts}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// =============================================================================
// PAGE COMPONENT
// =============================================================================

export default function AppearancePage() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { currentOrg, isLoading: isOrgLoading } = useOrganization()

  // Local state for preview
  const [localLogoUrl, setLocalLogoUrl] = useState<string | null>(null)
  const [localCoverUrl, setLocalCoverUrl] = useState<string | null>(null)
  const [localPrimaryColor, setLocalPrimaryColor] = useState<string | null>(null)
  const [localSecondaryColor, setLocalSecondaryColor] = useState<string | null>(null)
  const [hasChanges, setHasChanges] = useState(false)

  // Theme query
  const {
    data: theme,
    isLoading: isThemeLoading,
    error: themeError,
  } = useQuery({
    queryKey: themeQueryKeys.settings(currentOrg?.id ?? ''),
    queryFn: async () => {
      if (!currentOrg?.id) return null
      const result = await getThemeSettingsAction(currentOrg.id)
      if (!result.success || !result.data) throw new Error(result.message)
      return result.data
    },
    enabled: !!currentOrg?.id,
    staleTime: 60 * 1000, // 1 minute
  })

  // Initialize local state from theme
  useEffect(() => {
    if (theme) {
      setLocalLogoUrl(theme.logo_url)
      setLocalCoverUrl(theme.cover_url)
      setLocalPrimaryColor(theme.primary_color)
      setLocalSecondaryColor(theme.secondary_color)
      setHasChanges(false)
    }
  }, [theme])

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: ThemeUpdateInput) => {
      if (!currentOrg?.id) throw new Error('Organizasyon seçilmedi')
      const result = await updateThemeSettingsAction(currentOrg.id, data)
      if (!result.success || !result.data) throw new Error(result.message)
      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: themeQueryKeys.settings(currentOrg?.id ?? ''),
      })
      // Also invalidate organization query to refresh slug
      queryClient.invalidateQueries({
        queryKey: ['organization', 'current', currentOrg?.id ?? ''],
      })
      setHasChanges(false)
      toast({
        title: 'Başarılı',
        description: 'Görünüm ayarları kaydedildi',
      })
    },
    onError: (error) => {
      toast({
        title: 'Hata',
        description: error instanceof Error ? error.message : 'Bir hata oluştu',
        variant: 'destructive',
      })
    },
  })

  // Handlers
  const handleLogoChange = useCallback((url: string) => {
    setLocalLogoUrl(url)
    setHasChanges(true)
  }, [])

  const handleLogoRemove = useCallback(() => {
    setLocalLogoUrl(null)
    setHasChanges(true)
  }, [])

  const handleCoverChange = useCallback((url: string) => {
    setLocalCoverUrl(url)
    setHasChanges(true)
  }, [])

  const handleCoverRemove = useCallback(() => {
    setLocalCoverUrl(null)
    setHasChanges(true)
  }, [])

  const handlePrimaryColorChange = useCallback((color: string | null) => {
    setLocalPrimaryColor(color)
    setHasChanges(true)
  }, [])

  const handleSecondaryColorChange = useCallback((color: string | null) => {
    setLocalSecondaryColor(color)
    setHasChanges(true)
  }, [])

  const handleSave = useCallback(() => {
    updateMutation.mutate({
      logo_url: localLogoUrl,
      cover_url: localCoverUrl,
      primary_color: localPrimaryColor,
      secondary_color: localSecondaryColor,
    })
  }, [
    updateMutation,
    localLogoUrl,
    localCoverUrl,
    localPrimaryColor,
    localSecondaryColor,
  ])

  const handleReset = useCallback(() => {
    if (theme) {
      setLocalLogoUrl(theme.logo_url)
      setLocalCoverUrl(theme.cover_url)
      setLocalPrimaryColor(theme.primary_color)
      setLocalSecondaryColor(theme.secondary_color)
      setHasChanges(false)
    }
  }, [theme])

  // Loading state
  const isLoading = isOrgLoading || isThemeLoading

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/settings">
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <svg
                className="h-4 w-4"
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
              <span className="sr-only">Geri</span>
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
              Görünüm
            </h1>
            <p className="mt-1 text-muted-foreground">
              Restoranınızın markasını ve temalarını özelleştirin.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={!hasChanges || isLoading || updateMutation.isPending}
          >
            İptal
          </Button>
          <Button
            onClick={handleSave}
            disabled={!hasChanges || isLoading || updateMutation.isPending}
          >
            {updateMutation.isPending ? (
              <>
                <SpinnerIcon className="mr-2 h-4 w-4" />
                Kaydediliyor...
              </>
            ) : (
              'Kaydet'
            )}
          </Button>
        </div>
      </div>

      {/* Error State */}
      {themeError && (
        <Card className="border-destructive">
          <CardContent className="flex items-start gap-3 p-4">
            <svg
              className="h-5 w-5 flex-shrink-0 text-destructive mt-0.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v4M12 16h.01" />
            </svg>
            <div>
              <p className="font-medium text-destructive">
                Tema ayarları yüklenirken bir hata oluştu
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {themeError instanceof Error
                  ? themeError.message
                  : 'Bilinmeyen bir hata oluştu'}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Organization State */}
      {!isOrgLoading && !currentOrg && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-muted p-4">
              <PaletteIcon className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="mt-4 text-lg font-semibold">Organizasyon seçilmedi</h3>
            <p className="mt-2 text-sm text-muted-foreground max-w-md">
              Görünüm ayarları için bir organizasyon seçmeniz gerekmektedir.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Main Content */}
      {currentOrg && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Settings Column */}
          <div className="space-y-6">
            {/* Logo & Cover Images */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ImageIcon className="h-5 w-5" />
                  Görseller
                </CardTitle>
                <CardDescription>
                  Logo ve kapak görseli yükleyin
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Logo Upload */}
                <ImageUploader
                  label="Logo"
                  description="Kare formatta, minimum 200x200px önerilir"
                  currentUrl={localLogoUrl}
                  onUpload={handleLogoChange}
                  onRemove={handleLogoRemove}
                  organizationId={currentOrg.id}
                  aspectRatio="square"
                  disabled={isLoading || updateMutation.isPending}
                />

                {/* Cover Upload */}
                <ImageUploader
                  label="Kapak Görseli"
                  description="Banner formatta, minimum 1200x400px önerilir"
                  currentUrl={localCoverUrl}
                  onUpload={handleCoverChange}
                  onRemove={handleCoverRemove}
                  organizationId={currentOrg.id}
                  aspectRatio="banner"
                  disabled={isLoading || updateMutation.isPending}
                />
              </CardContent>
            </Card>

            {/* Brand Colors */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PaletteIcon className="h-5 w-5" />
                  Marka Renkleri
                </CardTitle>
                <CardDescription>
                  Menünüzün ana renklerini belirleyin
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Primary Color */}
                <ColorPicker
                  label="Birincil Renk"
                  value={localPrimaryColor}
                  onChange={handlePrimaryColorChange}
                  disabled={isLoading || updateMutation.isPending}
                />

                {/* Secondary Color */}
                <ColorPicker
                  label="İkincil Renk"
                  value={localSecondaryColor}
                  onChange={handleSecondaryColorChange}
                  disabled={isLoading || updateMutation.isPending}
                />
              </CardContent>
            </Card>
          </div>

          {/* Preview Column */}
          <div className="lg:sticky lg:top-6">
            <ThemePreview
              theme={theme}
              logoUrl={localLogoUrl}
              coverUrl={localCoverUrl}
              primaryColor={localPrimaryColor}
              secondaryColor={localSecondaryColor}
              organizationId={currentOrg.id}
            />
          </div>
        </div>
      )}
    </div>
  )
}
