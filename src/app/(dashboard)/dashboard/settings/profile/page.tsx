'use client'

/**
 * Profile Settings Page
 *
 * Dashboard page for managing restaurant profile information including:
 * - Restaurant name and description
 * - Contact information (phone, email, website)
 * - Address and location
 * - Business details (tax ID, trade registration)
 *
 * Features:
 * - Form validation with zod
 * - Real-time validation feedback
 * - Auto-save detection with unsaved changes warning
 * - Mobile-responsive design
 * - Turkish language UI
 *
 * @route /dashboard/settings/profile
 */

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/lib/hooks/use-toast'
import { useOrganization } from '@/lib/hooks/use-organization'
import { createClient } from '@/lib/supabase/client'

// =============================================================================
// ICONS
// =============================================================================

function ChevronLeftIcon({ className }: { className?: string }) {
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
      <path d="M15 18l-6-6 6-6" />
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

function BuildingIcon({ className }: { className?: string }) {
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
      <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" />
      <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" />
      <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" />
      <path d="M10 6h4" />
      <path d="M10 10h4" />
      <path d="M10 14h4" />
      <path d="M10 18h4" />
    </svg>
  )
}

function PhoneIcon({ className }: { className?: string }) {
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
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  )
}

function MapPinIcon({ className }: { className?: string }) {
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
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  )
}

function FileTextIcon({ className }: { className?: string }) {
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
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  )
}

// =============================================================================
// VALIDATION SCHEMA
// =============================================================================

const profileSchema = z.object({
  name: z.string().min(2, 'Restoran adı en az 2 karakter olmalıdır').max(100, 'Restoran adı en fazla 100 karakter olabilir'),
  description: z.string().max(500, 'Açıklama en fazla 500 karakter olabilir').nullable().optional(),
  phone: z.string().max(20, 'Telefon numarası en fazla 20 karakter olabilir').nullable().optional(),
  email: z.string().email('Geçerli bir e-posta adresi giriniz').nullable().optional().or(z.literal('')),
  website: z.string().url('Geçerli bir URL giriniz').nullable().optional().or(z.literal('')),
  address: z.string().max(200, 'Adres en fazla 200 karakter olabilir').nullable().optional(),
  city: z.string().max(50, 'Şehir en fazla 50 karakter olabilir').nullable().optional(),
  district: z.string().max(50, 'İlçe en fazla 50 karakter olabilir').nullable().optional(),
  postal_code: z.string().max(10, 'Posta kodu en fazla 10 karakter olabilir').nullable().optional(),
  tax_id: z.string().max(20, 'Vergi numarası en fazla 20 karakter olabilir').nullable().optional(),
  trade_registration: z.string().max(50, 'Ticaret sicil numarası en fazla 50 karakter olabilir').nullable().optional(),
})

type ProfileFormData = z.infer<typeof profileSchema>

// =============================================================================
// QUERY KEYS
// =============================================================================

const profileQueryKeys = {
  all: ['profile'] as const,
  organization: (orgId: string) => [...profileQueryKeys.all, 'organization', orgId] as const,
}

// =============================================================================
// DATA FETCHING
// =============================================================================

async function fetchOrganizationProfile(orgId: string): Promise<ProfileFormData> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('organizations')
    .select('name, description, phone, email, website, address, city, district, postal_code, tax_id, trade_registration')
    .eq('id', orgId)
    .single()

  if (error) throw new Error(error.message)

  return data
}

async function updateOrganizationProfile(orgId: string, data: ProfileFormData): Promise<void> {
  const supabase = createClient()

  // Clean up empty strings to null
  const cleanData = Object.fromEntries(
    Object.entries(data).map(([key, value]) => [key, value === '' ? null : value])
  )

  const { error } = await supabase
    .from('organizations')
    .update({
      ...cleanData,
      updated_at: new Date().toISOString(),
    })
    .eq('id', orgId)

  if (error) throw new Error(error.message)
}

// =============================================================================
// FORM SECTION COMPONENT
// =============================================================================

interface FormSectionProps {
  title: string
  description: string
  icon: React.ReactNode
  children: React.ReactNode
}

function FormSection({ title, description, icon, children }: FormSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          {icon}
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {children}
      </CardContent>
    </Card>
  )
}

// =============================================================================
// FORM FIELD COMPONENT
// =============================================================================

interface FormFieldProps {
  label: string
  htmlFor: string
  error?: string
  description?: string
  children: React.ReactNode
}

function FormField({ label, htmlFor, error, description, children }: FormFieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor} className={error ? 'text-destructive' : ''}>
        {label}
      </Label>
      {children}
      {description && !error && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}
    </div>
  )
}

// =============================================================================
// MAIN PAGE COMPONENT
// =============================================================================

export default function ProfileSettingsPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { currentOrg, isLoading: isOrgLoading } = useOrganization()
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  // Profile query
  const {
    data: profile,
    isLoading: isProfileLoading,
    error: profileError,
  } = useQuery({
    queryKey: profileQueryKeys.organization(currentOrg?.id ?? ''),
    queryFn: () => fetchOrganizationProfile(currentOrg!.id),
    enabled: !!currentOrg?.id,
    staleTime: 60 * 1000,
  })

  // Form setup
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
    watch,
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: '',
      description: '',
      phone: '',
      email: '',
      website: '',
      address: '',
      city: '',
      district: '',
      postal_code: '',
      tax_id: '',
      trade_registration: '',
    },
  })

  // Watch for form changes
  useEffect(() => {
    setHasUnsavedChanges(isDirty)
  }, [isDirty])

  // Reset form when profile data loads
  useEffect(() => {
    if (profile) {
      reset({
        name: profile.name ?? '',
        description: profile.description ?? '',
        phone: profile.phone ?? '',
        email: profile.email ?? '',
        website: profile.website ?? '',
        address: profile.address ?? '',
        city: profile.city ?? '',
        district: profile.district ?? '',
        postal_code: profile.postal_code ?? '',
        tax_id: profile.tax_id ?? '',
        trade_registration: profile.trade_registration ?? '',
      })
    }
  }, [profile, reset])

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (data: ProfileFormData) => updateOrganizationProfile(currentOrg!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: profileQueryKeys.organization(currentOrg!.id),
      })
      // Also invalidate organization data so other components get updated
      queryClient.invalidateQueries({
        queryKey: ['organization', 'current', currentOrg!.id],
      })
      setHasUnsavedChanges(false)
      toast({
        title: 'Kaydedildi',
        description: 'Restoran profili başarıyla güncellendi',
      })
    },
    onError: (error) => {
      toast({
        title: 'Hata',
        description: error instanceof Error ? error.message : 'Profil güncellenirken bir hata oluştu',
        variant: 'destructive',
      })
    },
  })

  // Handlers
  const onSubmit = handleSubmit((data) => {
    updateMutation.mutate(data)
  })

  const handleCancel = useCallback(() => {
    if (profile) {
      reset({
        name: profile.name ?? '',
        description: profile.description ?? '',
        phone: profile.phone ?? '',
        email: profile.email ?? '',
        website: profile.website ?? '',
        address: profile.address ?? '',
        city: profile.city ?? '',
        district: profile.district ?? '',
        postal_code: profile.postal_code ?? '',
        tax_id: profile.tax_id ?? '',
        trade_registration: profile.trade_registration ?? '',
      })
    }
    setHasUnsavedChanges(false)
  }, [profile, reset])

  // Loading state
  const isLoading = isOrgLoading || isProfileLoading

  // Warn before leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault()
        e.returnValue = ''
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasUnsavedChanges])

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/settings">
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <ChevronLeftIcon className="h-4 w-4" />
              <span className="sr-only">Geri</span>
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
              Restoran Profili
            </h1>
            <p className="mt-1 text-muted-foreground">
              Restoranınızın temel bilgilerini düzenleyin
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={!hasUnsavedChanges || isLoading || updateMutation.isPending}
          >
            İptal
          </Button>
          <Button
            onClick={onSubmit}
            disabled={!hasUnsavedChanges || isLoading || updateMutation.isPending}
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

      {/* Unsaved Changes Banner */}
      {hasUnsavedChanges && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/50 dark:bg-amber-900/10">
          <p className="text-sm text-amber-800 dark:text-amber-200">
            Kaydedilmemiş değişiklikleriniz var. Sayfadan ayrılmadan önce kaydetmeyi unutmayın.
          </p>
        </div>
      )}

      {/* Error State */}
      {profileError && (
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
                Profil yüklenirken bir hata oluştu
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {profileError instanceof Error
                  ? profileError.message
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
              <BuildingIcon className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="mt-4 text-lg font-semibold">Organizasyon seçilmedi</h3>
            <p className="mt-2 text-sm text-muted-foreground max-w-md">
              Profil ayarları için bir organizasyon seçmeniz gerekmektedir.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {isLoading && currentOrg && (
        <div className="space-y-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 w-48 rounded bg-muted" />
                <div className="h-4 w-64 rounded bg-muted" />
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="h-4 w-24 rounded bg-muted" />
                  <div className="h-10 w-full rounded bg-muted" />
                </div>
                <div className="space-y-2">
                  <div className="h-4 w-24 rounded bg-muted" />
                  <div className="h-10 w-full rounded bg-muted" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Form */}
      {!isLoading && currentOrg && profile && (
        <form onSubmit={onSubmit} className="space-y-6">
          {/* Basic Info Section */}
          <FormSection
            title="Temel Bilgiler"
            description="Restoranınızın adı ve açıklaması"
            icon={<BuildingIcon className="h-5 w-5" />}
          >
            <FormField
              label="Restoran Adı"
              htmlFor="name"
              error={errors.name?.message}
            >
              <Input
                id="name"
                {...register('name')}
                placeholder="Örn: Lezzet Durağı"
                className={errors.name ? 'border-destructive' : ''}
              />
            </FormField>

            <FormField
              label="Açıklama"
              htmlFor="description"
              error={errors.description?.message}
              description="Müşterilerinizin göreceği kısa bir tanıtım yazısı"
            >
              <textarea
                id="description"
                {...register('description')}
                placeholder="Restoranınızı birkaç cümleyle tanıtın..."
                rows={3}
                className={`flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
                  errors.description ? 'border-destructive' : ''
                }`}
              />
            </FormField>
          </FormSection>

          {/* Contact Info Section */}
          <FormSection
            title="İletişim Bilgileri"
            description="Müşterilerinizin size ulaşabileceği iletişim bilgileri"
            icon={<PhoneIcon className="h-5 w-5" />}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                label="Telefon"
                htmlFor="phone"
                error={errors.phone?.message}
              >
                <Input
                  id="phone"
                  type="tel"
                  {...register('phone')}
                  placeholder="0212 555 00 00"
                  className={errors.phone ? 'border-destructive' : ''}
                />
              </FormField>

              <FormField
                label="E-posta"
                htmlFor="email"
                error={errors.email?.message}
              >
                <Input
                  id="email"
                  type="email"
                  {...register('email')}
                  placeholder="info@restoran.com"
                  className={errors.email ? 'border-destructive' : ''}
                />
              </FormField>
            </div>

            <FormField
              label="Web Sitesi"
              htmlFor="website"
              error={errors.website?.message}
            >
              <Input
                id="website"
                type="url"
                {...register('website')}
                placeholder="https://www.restoran.com"
                className={errors.website ? 'border-destructive' : ''}
              />
            </FormField>
          </FormSection>

          {/* Address Section */}
          <FormSection
            title="Adres Bilgileri"
            description="Restoranınızın fiziksel konumu"
            icon={<MapPinIcon className="h-5 w-5" />}
          >
            <FormField
              label="Adres"
              htmlFor="address"
              error={errors.address?.message}
            >
              <textarea
                id="address"
                {...register('address')}
                placeholder="Sokak adı, bina no, kat/daire"
                rows={2}
                className={`flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
                  errors.address ? 'border-destructive' : ''
                }`}
              />
            </FormField>

            <div className="grid gap-4 sm:grid-cols-3">
              <FormField
                label="Şehir"
                htmlFor="city"
                error={errors.city?.message}
              >
                <Input
                  id="city"
                  {...register('city')}
                  placeholder="İstanbul"
                  className={errors.city ? 'border-destructive' : ''}
                />
              </FormField>

              <FormField
                label="İlçe"
                htmlFor="district"
                error={errors.district?.message}
              >
                <Input
                  id="district"
                  {...register('district')}
                  placeholder="Kadıköy"
                  className={errors.district ? 'border-destructive' : ''}
                />
              </FormField>

              <FormField
                label="Posta Kodu"
                htmlFor="postal_code"
                error={errors.postal_code?.message}
              >
                <Input
                  id="postal_code"
                  {...register('postal_code')}
                  placeholder="34000"
                  className={errors.postal_code ? 'border-destructive' : ''}
                />
              </FormField>
            </div>
          </FormSection>

          {/* Legal/Business Section */}
          <FormSection
            title="İşletme Bilgileri"
            description="Vergi ve ticaret sicil bilgileri (isteğe bağlı)"
            icon={<FileTextIcon className="h-5 w-5" />}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                label="Vergi Numarası"
                htmlFor="tax_id"
                error={errors.tax_id?.message}
              >
                <Input
                  id="tax_id"
                  {...register('tax_id')}
                  placeholder="1234567890"
                  className={errors.tax_id ? 'border-destructive' : ''}
                />
              </FormField>

              <FormField
                label="Ticaret Sicil No"
                htmlFor="trade_registration"
                error={errors.trade_registration?.message}
              >
                <Input
                  id="trade_registration"
                  {...register('trade_registration')}
                  placeholder="İstanbul Ticaret Sicili - 123456"
                  className={errors.trade_registration ? 'border-destructive' : ''}
                />
              </FormField>
            </div>
          </FormSection>

          {/* Mobile Save Button */}
          <div className="sticky bottom-4 flex gap-2 sm:hidden">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={!hasUnsavedChanges || updateMutation.isPending}
              className="flex-1"
            >
              İptal
            </Button>
            <Button
              type="submit"
              disabled={!hasUnsavedChanges || updateMutation.isPending}
              className="flex-1"
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
        </form>
      )}
    </div>
  )
}
