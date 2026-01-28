'use client'

/**
 * QR Codes Management Page
 *
 * Dashboard page for generating and managing QR codes for restaurant tables.
 *
 * Features:
 * - View all tables with QR codes
 * - Generate QR codes with custom branding
 * - Download individual or batch QR codes
 * - Preview QR codes before download
 * - Mobile-responsive design
 *
 * @route /dashboard/qr-codes
 */

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useOrganization } from '@/lib/hooks/use-organization'
import { createClient } from '@/lib/supabase/client'
import {
  QRGenerator,
  QRBrandingSettings,
  QRCodePreviewCard,
  type QRBrandingOptions,
  type TableQRData,
} from '@/components/features/qr/qr-generator'
import type { RestaurantTable, Organization } from '@/types/database'

// =============================================================================
// QUERY KEYS
// =============================================================================

const qrQueryKeys = {
  all: ['qr-codes'] as const,
  tables: (orgId: string) => [...qrQueryKeys.all, 'tables', orgId] as const,
}

// =============================================================================
// ICONS
// =============================================================================

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

function PlusIcon({ className }: { className?: string }) {
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
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

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

function InfoIcon({ className }: { className?: string }) {
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
      <path d="M12 16v-4M12 8h.01" />
    </svg>
  )
}

function DownloadIcon({ className }: { className?: string }) {
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
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
    </svg>
  )
}

function SearchIcon({ className }: { className?: string }) {
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
      <circle cx="11" cy="11" r="8" />
      <path d="M21 21l-4.35-4.35" />
    </svg>
  )
}

function ExternalLinkIcon({ className }: { className?: string }) {
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
      <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" />
    </svg>
  )
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Generate the public menu URL for a table
 */
function generateTableUrl(slug: string, qrUuid: string): string {
  // Use window.location.origin to get the current domain
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
  return `${baseUrl}/r/${slug}/${qrUuid}`
}

/**
 * Generate the general menu URL (no table)
 */
function generateMenuUrl(slug: string): string {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
  return `${baseUrl}/r/${slug}`
}

/**
 * Convert RestaurantTable to TableQRData
 */
function tableToQRData(table: RestaurantTable, slug: string): TableQRData {
  return {
    id: table.id,
    name: table.name,
    tableNumber: table.table_number,
    section: table.section,
    qrUuid: table.qr_uuid,
    url: generateTableUrl(slug, table.qr_uuid),
  }
}

// =============================================================================
// DATA FETCHING
// =============================================================================

async function getTables(organizationId: string): Promise<RestaurantTable[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('restaurant_tables')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('is_visible', true)
    .is('deleted_at', null)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })

  if (error) {
    throw new Error('Masalar yüklenemedi')
  }

  return data || []
}

// =============================================================================
// EMPTY STATE COMPONENT
// =============================================================================

function EmptyState({ hasSearch }: { hasSearch: boolean }) {
  if (hasSearch) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <div className="rounded-full bg-muted p-4">
            <SearchIcon className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="mt-4 text-lg font-semibold">Masa bulunamadı</h3>
          <p className="mt-2 text-sm text-muted-foreground max-w-md">
            Arama kriterlerinize uygun masa bulunamadı.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <div className="rounded-full bg-muted p-4">
          <TableIcon className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="mt-4 text-lg font-semibold">Henüz masa yok</h3>
        <p className="mt-2 text-sm text-muted-foreground max-w-md">
          QR kod oluşturmak için önce masa tanımlamanız gerekiyor.
        </p>
        <Button asChild className="mt-4">
          <Link href="/dashboard/tables">
            <PlusIcon className="mr-2 h-4 w-4" />
            Masa Ekle
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}

// =============================================================================
// GENERAL MENU QR SECTION
// =============================================================================

interface GeneralMenuQRProps {
  organization: Organization
  brandingSettings: QRBrandingOptions
}

function GeneralMenuQR({ organization, brandingSettings }: GeneralMenuQRProps) {
  const menuUrl = generateMenuUrl(organization.slug)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <QRIcon className="h-5 w-5" />
          Genel Menü QR Kodu
        </CardTitle>
        <CardDescription>
          Masasız erişim için genel menü bağlantısı. Müşteriler bu QR kod ile doğrudan menünüzü görüntüleyebilir.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <QRGenerator
          url={menuUrl}
          title={brandingSettings.includeRestaurantName ? organization.name : undefined}
          subtitle="Menüyü görüntüle"
          foregroundColor={brandingSettings.foregroundColor}
          backgroundColor={brandingSettings.backgroundColor}
          logoUrl={brandingSettings.logoUrl}
          size={200}
        />

        <div className="mt-4 flex justify-center">
          <Button variant="outline" size="sm" asChild>
            <a href={menuUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLinkIcon className="mr-2 h-4 w-4" />
              Menüyü Önizle
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// =============================================================================
// TABLE QR CARD COMPONENT
// =============================================================================

interface TableQRCardProps {
  table: RestaurantTable
  organization: Organization
  brandingSettings: QRBrandingOptions
  onView: () => void
}

function TableQRCard({ table, organization, brandingSettings, onView }: TableQRCardProps) {
  const tableData = tableToQRData(table, organization.slug)

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {/* Mini QR Preview */}
          <button
            onClick={onView}
            className="flex-shrink-0 rounded-lg border bg-white p-2 hover:ring-2 hover:ring-primary-500 transition-all"
          >
            <div className="relative">
              <QRGenerator
                url={tableData.url}
                foregroundColor={brandingSettings.foregroundColor}
                backgroundColor={brandingSettings.backgroundColor}
                logoUrl={brandingSettings.logoUrl}
                size={80}
                includeMargin={false}
                className="pointer-events-none"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/10 transition-colors rounded">
                <span className="sr-only">QR kodu görüntüle</span>
              </div>
            </div>
          </button>

          {/* Table Info */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold truncate">{table.name}</h3>
            {table.table_number && (
              <p className="text-sm text-muted-foreground">No: {table.table_number}</p>
            )}
            {table.section && (
              <p className="text-xs text-muted-foreground truncate">{table.section}</p>
            )}
            <div className="mt-2 flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={onView}>
                <QRIcon className="mr-1.5 h-3.5 w-3.5" />
                Görüntüle
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <a href={tableData.url} target="_blank" rel="noopener noreferrer">
                  <ExternalLinkIcon className="mr-1.5 h-3.5 w-3.5" />
                  Önizle
                </a>
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// =============================================================================
// QR VIEW MODAL
// =============================================================================

interface QRViewModalProps {
  isOpen: boolean
  onClose: () => void
  table: RestaurantTable | null
  organization: Organization | null
  brandingSettings: QRBrandingOptions
}

function QRViewModal({
  isOpen,
  onClose,
  table,
  organization,
  brandingSettings,
}: QRViewModalProps) {
  if (!table || !organization) return null

  const tableData = tableToQRData(table, organization.slug)

  const title = brandingSettings.includeTitle
    ? `${table.section ? `${table.section} - ` : ''}${table.name}`
    : undefined

  const subtitle = brandingSettings.includeRestaurantName ? organization.name : undefined

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{table.name} - QR Kod</DialogTitle>
          <DialogDescription>
            Bu QR kodu indirin veya yazdırın.
          </DialogDescription>
        </DialogHeader>
        <QRGenerator
          url={tableData.url}
          title={title}
          subtitle={subtitle}
          foregroundColor={brandingSettings.foregroundColor}
          backgroundColor={brandingSettings.backgroundColor}
          logoUrl={brandingSettings.logoUrl}
          size={280}
        />
      </DialogContent>
    </Dialog>
  )
}

// =============================================================================
// MAIN PAGE COMPONENT
// =============================================================================

export default function QRCodesPage() {
  const { currentOrg, isLoading: isOrgLoading } = useOrganization()

  // Search/filter state
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedSection, setSelectedSection] = useState<string | null>(null)

  // Selected table for modal
  const [viewingTable, setViewingTable] = useState<RestaurantTable | null>(null)

  // Branding settings with organization defaults
  const [brandingSettings, setBrandingSettings] = useState<QRBrandingOptions>({
    foregroundColor: '#000000',
    backgroundColor: '#ffffff',
    logoUrl: null,
    includeTitle: true,
    includeRestaurantName: true,
  })

  // Update branding when organization changes
  useEffect(() => {
    if (currentOrg) {
      setBrandingSettings((prev) => ({
        ...prev,
        foregroundColor: currentOrg.primary_color || '#000000',
        logoUrl: currentOrg.logo_url || null,
      }))
    }
  }, [currentOrg])

  // Fetch tables
  const {
    data: tables = [],
    isLoading: isTablesLoading,
    error: tablesError,
    refetch,
  } = useQuery({
    queryKey: qrQueryKeys.tables(currentOrg?.id ?? ''),
    queryFn: () => getTables(currentOrg!.id),
    enabled: !!currentOrg?.id,
    staleTime: 30 * 1000, // 30 seconds
  })

  // Get unique sections for filter
  const sections = useMemo(() => {
    const sectionSet = new Set<string>()
    tables.forEach((table) => {
      if (table.section) {
        sectionSet.add(table.section)
      }
    })
    return Array.from(sectionSet).sort()
  }, [tables])

  // Filter tables
  const filteredTables = useMemo(() => {
    return tables.filter((table) => {
      // Search filter
      if (searchTerm) {
        const search = searchTerm.toLowerCase()
        const matchesName = table.name.toLowerCase().includes(search)
        const matchesNumber = table.table_number?.toLowerCase().includes(search)
        const matchesSection = table.section?.toLowerCase().includes(search)
        if (!matchesName && !matchesNumber && !matchesSection) {
          return false
        }
      }

      // Section filter
      if (selectedSection && table.section !== selectedSection) {
        return false
      }

      return true
    })
  }, [tables, searchTerm, selectedSection])

  // Loading state
  const isLoading = isOrgLoading || isTablesLoading

  // Handle closing the view modal
  const handleCloseViewModal = useCallback(() => {
    setViewingTable(null)
  }, [])

  return (
    <>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
              QR Kodları
            </h1>
            <p className="mt-1 text-muted-foreground">
              Restoranınızın masa QR kodlarını oluşturun ve yönetin.
            </p>
          </div>
          <Button asChild>
            <Link href="/dashboard/tables">
              <PlusIcon className="mr-2 h-4 w-4" />
              Masa Ekle
            </Link>
          </Button>
        </div>

        {/* Info Card */}
        <Card className="border-primary-200 bg-primary-50/50 dark:border-primary-900/50 dark:bg-primary-900/10">
          <CardContent className="flex items-start gap-3 p-4">
            <InfoIcon className="h-5 w-5 flex-shrink-0 text-primary-600 dark:text-primary-400 mt-0.5" />
            <div className="text-sm">
              <p className="text-primary-800 dark:text-primary-200">
                <strong>İpucu:</strong> QR kodlarınızı özelleştirmek için sağ taraftaki ayarları
                kullanın. Renkleri markanıza uygun hale getirin ve logonuzu ekleyin.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Error State */}
        {tablesError && (
          <Card className="border-destructive">
            <CardContent className="flex items-start gap-3 p-4">
              <svg
                className="h-5 w-5 flex-shrink-0 text-destructive mt-0.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M12 8v4M12 16h.01" />
              </svg>
              <div>
                <p className="font-medium text-destructive">Masalar yüklenirken bir hata oluştu</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {tablesError instanceof Error ? tablesError.message : 'Bilinmeyen hata'}
                </p>
                <Button variant="outline" size="sm" onClick={() => refetch()} className="mt-3">
                  Tekrar Dene
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* No Organization State */}
        {!isOrgLoading && !currentOrg && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <div className="rounded-full bg-muted p-4">
                <QRIcon className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">Organizasyon seçilmedi</h3>
              <p className="mt-2 text-sm text-muted-foreground max-w-md">
                QR kod oluşturmak için bir organizasyon seçmeniz gerekmektedir.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Main Content */}
        {currentOrg && (
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Left Column - Tables */}
            <div className="space-y-4 lg:col-span-2">
              {/* Search and Filters */}
              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="relative flex-1">
                  <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Masa ara..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 h-10"
                  />
                </div>
                {sections.length > 0 && (
                  <select
                    value={selectedSection || ''}
                    onChange={(e) => setSelectedSection(e.target.value || null)}
                    className="h-10 rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="">Tüm Bölümler</option>
                    {sections.map((section) => (
                      <option key={section} value={section}>
                        {section}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* General Menu QR */}
              <GeneralMenuQR organization={currentOrg} brandingSettings={brandingSettings} />

              {/* Tables List */}
              <div>
                <h2 className="mb-3 text-lg font-semibold">Masa QR Kodları</h2>

                {isLoading ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {[...Array(4)].map((_, i) => (
                      <Card key={i}>
                        <CardContent className="p-4">
                          <div className="flex items-start gap-4 animate-pulse">
                            <div className="h-24 w-24 rounded-lg bg-muted" />
                            <div className="flex-1 space-y-2">
                              <div className="h-5 w-32 rounded bg-muted" />
                              <div className="h-4 w-20 rounded bg-muted" />
                              <div className="h-4 w-24 rounded bg-muted" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : filteredTables.length === 0 ? (
                  <EmptyState hasSearch={!!searchTerm || !!selectedSection} />
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {filteredTables.map((table) => (
                      <TableQRCard
                        key={table.id}
                        table={table}
                        organization={currentOrg}
                        brandingSettings={brandingSettings}
                        onView={() => setViewingTable(table)}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Stats */}
              {!isLoading && tables.length > 0 && (
                <p className="text-sm text-muted-foreground text-center">
                  {filteredTables.length === tables.length
                    ? `Toplam ${tables.length} masa`
                    : `${filteredTables.length} / ${tables.length} masa gösteriliyor`}
                </p>
              )}
            </div>

            {/* Right Column - Branding Settings */}
            <div className="space-y-4">
              <QRBrandingSettings
                settings={brandingSettings}
                onChange={setBrandingSettings}
                organizationLogo={currentOrg.logo_url}
              />

              {/* Batch Download */}
              {filteredTables.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Toplu İndirme</CardTitle>
                    <CardDescription>
                      Tüm QR kodları tek seferde indirin.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button variant="outline" className="w-full" disabled>
                      <DownloadIcon className="mr-2 h-4 w-4" />
                      Tümünü PNG olarak indir
                    </Button>
                    <p className="text-xs text-muted-foreground text-center">
                      Toplu indirme özelliği yakında eklenecek.
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Quick Links */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Hızlı Bağlantılar</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button variant="ghost" className="w-full justify-start" asChild>
                    <Link href="/dashboard/tables">
                      <TableIcon className="mr-2 h-4 w-4" />
                      Masa Yönetimi
                    </Link>
                  </Button>
                  <Button variant="ghost" className="w-full justify-start" asChild>
                    <Link href="/dashboard/settings/appearance">
                      <svg
                        className="mr-2 h-4 w-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        aria-hidden="true"
                      >
                        <circle cx="12" cy="12" r="3" />
                        <path d="M12 1v6m0 10v6m11-11h-6m-10 0H1m18.5-7.5l-4.2 4.2m-6.6 6.6l-4.2 4.2M20.5 18.5l-4.2-4.2m-6.6-6.6L5.5 3.5" />
                      </svg>
                      Görünüm Ayarları
                    </Link>
                  </Button>
                  <Button variant="ghost" className="w-full justify-start" asChild>
                    <a
                      href={generateMenuUrl(currentOrg.slug)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLinkIcon className="mr-2 h-4 w-4" />
                      Menüyü Görüntüle
                    </a>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>

      {/* QR View Modal */}
      <QRViewModal
        isOpen={!!viewingTable}
        onClose={handleCloseViewModal}
        table={viewingTable}
        organization={currentOrg}
        brandingSettings={brandingSettings}
      />
    </>
  )
}
