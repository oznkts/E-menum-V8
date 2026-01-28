'use client'

/**
 * Tables Management Page
 *
 * Dashboard page for managing restaurant tables with QR code assignment.
 *
 * Features:
 * - View all tables with status indicators
 * - Create new tables via modal
 * - Edit existing tables
 * - Batch create tables
 * - QR code regeneration
 * - Status tracking (available, occupied, reserved, etc.)
 * - Mobile-responsive design
 * - Turkish UI
 *
 * @route /dashboard/tables
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
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
import { useToast } from '@/lib/hooks/use-toast'
import { createClient } from '@/lib/supabase/client'
import type { RestaurantTable, TableStatus } from '@/types/database'

// =============================================================================
// QUERY KEYS
// =============================================================================

const tableQueryKeys = {
  all: ['tables'] as const,
  list: (orgId: string) => [...tableQueryKeys.all, 'list', orgId] as const,
  stats: (orgId: string) => [...tableQueryKeys.all, 'stats', orgId] as const,
}

// =============================================================================
// ICONS
// =============================================================================

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
      <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2" />
    </svg>
  )
}

function EditIcon({ className }: { className?: string }) {
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
      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  )
}

function RefreshIcon({ className }: { className?: string }) {
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
      <path d="M21 2v6h-6M3 12a9 9 0 0115.3-6.4L21 8M3 22v-6h6M21 12a9 9 0 01-15.3 6.4L3 16" />
    </svg>
  )
}

function UsersIcon({ className }: { className?: string }) {
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
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
    </svg>
  )
}

// =============================================================================
// STATUS CONFIG
// =============================================================================

const statusConfig: Record<TableStatus, { label: string; color: string; bgColor: string }> = {
  available: { label: 'Müsait', color: 'text-green-600', bgColor: 'bg-green-100 dark:bg-green-900/30' },
  occupied: { label: 'Dolu', color: 'text-red-600', bgColor: 'bg-red-100 dark:bg-red-900/30' },
  reserved: { label: 'Rezerve', color: 'text-blue-600', bgColor: 'bg-blue-100 dark:bg-blue-900/30' },
  cleaning: { label: 'Temizleniyor', color: 'text-yellow-600', bgColor: 'bg-yellow-100 dark:bg-yellow-900/30' },
  out_of_service: { label: 'Servis Dışı', color: 'text-gray-600', bgColor: 'bg-gray-100 dark:bg-gray-800' },
}

// =============================================================================
// DATA FETCHING
// =============================================================================

async function fetchTables(organizationId: string): Promise<RestaurantTable[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('restaurant_tables')
    .select('*')
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })

  if (error) {
    throw new Error('Masalar yüklenemedi')
  }

  return data || []
}

async function createTable(
  organizationId: string,
  data: {
    name: string
    table_number: string
    section?: string
    capacity: number
    is_outdoor?: boolean
    is_accessible?: boolean
  }
): Promise<RestaurantTable> {
  const supabase = createClient()

  // Get max sort_order
  const { data: maxOrder } = await supabase
    .from('restaurant_tables')
    .select('sort_order')
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .order('sort_order', { ascending: false })
    .limit(1)
    .single()

  const sortOrder = (maxOrder?.sort_order ?? -1) + 1

  const { data: table, error } = await supabase
    .from('restaurant_tables')
    .insert({
      organization_id: organizationId,
      name: data.name,
      table_number: data.table_number,
      section: data.section || null,
      capacity: data.capacity,
      is_outdoor: data.is_outdoor || false,
      is_accessible: data.is_accessible || false,
      qr_uuid: crypto.randomUUID(),
      qr_code_generated_at: new Date().toISOString(),
      sort_order: sortOrder,
      status: 'available',
      is_visible: true,
    })
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return table
}

async function updateTableData(
  tableId: string,
  data: {
    name?: string
    table_number?: string
    section?: string | null
    capacity?: number
    status?: TableStatus
    is_outdoor?: boolean
    is_accessible?: boolean
    is_visible?: boolean
  }
): Promise<RestaurantTable> {
  const supabase = createClient()

  const { data: table, error } = await supabase
    .from('restaurant_tables')
    .update(data)
    .eq('id', tableId)
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return table
}

async function deleteTable(tableId: string): Promise<void> {
  const supabase = createClient()

  const { error } = await supabase
    .from('restaurant_tables')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', tableId)

  if (error) {
    throw new Error(error.message)
  }
}

async function regenerateQRCode(tableId: string): Promise<RestaurantTable> {
  const supabase = createClient()

  const { data: table, error } = await supabase
    .from('restaurant_tables')
    .update({
      qr_uuid: crypto.randomUUID(),
      qr_code_generated_at: new Date().toISOString(),
    })
    .eq('id', tableId)
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return table
}

async function batchCreateTables(
  organizationId: string,
  count: number,
  startNumber: number,
  section?: string
): Promise<RestaurantTable[]> {
  const supabase = createClient()

  // Get max sort_order
  const { data: maxOrder } = await supabase
    .from('restaurant_tables')
    .select('sort_order')
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .order('sort_order', { ascending: false })
    .limit(1)
    .single()

  const baseSortOrder = (maxOrder?.sort_order ?? -1) + 1

  const tablesToCreate = Array.from({ length: count }, (_, i) => {
    const tableNumber = String(startNumber + i)
    return {
      organization_id: organizationId,
      name: `Masa ${tableNumber}`,
      table_number: tableNumber,
      section: section || null,
      capacity: 4,
      qr_uuid: crypto.randomUUID(),
      qr_code_generated_at: new Date().toISOString(),
      sort_order: baseSortOrder + i,
      status: 'available' as TableStatus,
      is_visible: true,
      is_outdoor: false,
      is_accessible: false,
    }
  })

  const { data: tables, error } = await supabase
    .from('restaurant_tables')
    .insert(tablesToCreate)
    .select()

  if (error) {
    throw new Error(error.message)
  }

  return tables
}

// =============================================================================
// TABLE FORM COMPONENT
// =============================================================================

interface TableFormProps {
  organizationId: string
  table?: RestaurantTable | null
  onSuccess: () => void
  onCancel: () => void
}

function TableForm({ organizationId, table, onSuccess, onCancel }: TableFormProps) {
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [formData, setFormData] = useState({
    name: table?.name || '',
    table_number: table?.table_number || '',
    section: table?.section || '',
    capacity: table?.capacity || 4,
    is_outdoor: table?.is_outdoor || false,
    is_accessible: table?.is_accessible || false,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      if (table) {
        await updateTableData(table.id, {
          name: formData.name,
          table_number: formData.table_number,
          section: formData.section || null,
          capacity: formData.capacity,
          is_outdoor: formData.is_outdoor,
          is_accessible: formData.is_accessible,
        })
        toast({
          title: 'Masa güncellendi',
          description: `${formData.name} başarıyla güncellendi.`,
        })
      } else {
        await createTable(organizationId, {
          name: formData.name,
          table_number: formData.table_number,
          section: formData.section,
          capacity: formData.capacity,
          is_outdoor: formData.is_outdoor,
          is_accessible: formData.is_accessible,
        })
        toast({
          title: 'Masa oluşturuldu',
          description: `${formData.name} başarıyla oluşturuldu.`,
        })
      }
      onSuccess()
    } catch (err) {
      toast({
        title: 'Hata',
        description: err instanceof Error ? err.message : 'Bir hata oluştu',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="name" className="text-sm font-medium">
            Masa Adı <span className="text-destructive">*</span>
          </label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="örn: Masa 1"
            required
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="table_number" className="text-sm font-medium">
            Masa Numarası <span className="text-destructive">*</span>
          </label>
          <Input
            id="table_number"
            value={formData.table_number}
            onChange={(e) => setFormData({ ...formData, table_number: e.target.value })}
            placeholder="örn: 1"
            required
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="section" className="text-sm font-medium">
            Bölüm
          </label>
          <Input
            id="section"
            value={formData.section}
            onChange={(e) => setFormData({ ...formData, section: e.target.value })}
            placeholder="örn: Bahçe, Teras"
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="capacity" className="text-sm font-medium">
            Kapasite <span className="text-destructive">*</span>
          </label>
          <Input
            id="capacity"
            type="number"
            min={1}
            max={50}
            value={formData.capacity}
            onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 1 })}
            required
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.is_outdoor}
            onChange={(e) => setFormData({ ...formData, is_outdoor: e.target.checked })}
            className="h-4 w-4 rounded border-gray-300"
          />
          <span className="text-sm">Açık alan</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.is_accessible}
            onChange={(e) => setFormData({ ...formData, is_accessible: e.target.checked })}
            className="h-4 w-4 rounded border-gray-300"
          />
          <span className="text-sm">Engelli erişimine uygun</span>
        </label>
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          İptal
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Kaydediliyor...' : table ? 'Güncelle' : 'Oluştur'}
        </Button>
      </div>
    </form>
  )
}

// =============================================================================
// BATCH CREATE FORM COMPONENT
// =============================================================================

interface BatchCreateFormProps {
  organizationId: string
  existingCount: number
  onSuccess: () => void
  onCancel: () => void
}

function BatchCreateForm({ organizationId, existingCount, onSuccess, onCancel }: BatchCreateFormProps) {
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [count, setCount] = useState(5)
  const [startNumber, setStartNumber] = useState(existingCount + 1)
  const [section, setSection] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      await batchCreateTables(organizationId, count, startNumber, section)
      toast({
        title: 'Masalar oluşturuldu',
        description: `${count} masa başarıyla oluşturuldu.`,
      })
      onSuccess()
    } catch (err) {
      toast({
        title: 'Hata',
        description: err instanceof Error ? err.message : 'Bir hata oluştu',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="count" className="text-sm font-medium">
            Masa Sayısı <span className="text-destructive">*</span>
          </label>
          <Input
            id="count"
            type="number"
            min={1}
            max={50}
            value={count}
            onChange={(e) => setCount(parseInt(e.target.value) || 1)}
            required
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="startNumber" className="text-sm font-medium">
            Başlangıç Numarası <span className="text-destructive">*</span>
          </label>
          <Input
            id="startNumber"
            type="number"
            min={1}
            value={startNumber}
            onChange={(e) => setStartNumber(parseInt(e.target.value) || 1)}
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="batchSection" className="text-sm font-medium">
          Bölüm (Opsiyonel)
        </label>
        <Input
          id="batchSection"
          value={section}
          onChange={(e) => setSection(e.target.value)}
          placeholder="örn: Bahçe, Teras"
        />
      </div>

      <div className="rounded-md bg-muted p-3 text-sm">
        <p>
          <strong>{count}</strong> masa oluşturulacak:{' '}
          {Array.from({ length: Math.min(count, 3) }, (_, i) => `Masa ${startNumber + i}`).join(', ')}
          {count > 3 && `, ... Masa ${startNumber + count - 1}`}
        </p>
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          İptal
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Oluşturuluyor...' : `${count} Masa Oluştur`}
        </Button>
      </div>
    </form>
  )
}

// =============================================================================
// TABLE CARD COMPONENT
// =============================================================================

interface TableCardProps {
  table: RestaurantTable
  organizationSlug: string
  onEdit: (table: RestaurantTable) => void
  onDelete: (tableId: string) => void
  onStatusChange: (tableId: string, status: TableStatus) => void
  onRegenerateQR: (tableId: string) => void
}

function TableCard({
  table,
  organizationSlug,
  onEdit,
  onDelete,
  onStatusChange,
  onRegenerateQR,
}: TableCardProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [isRegenerating, setIsRegenerating] = useState(false)
  const status = statusConfig[table.status]
  const menuUrl = `/r/${organizationSlug}/${table.qr_uuid}`

  const handleDelete = async () => {
    if (!confirm('Bu masayı silmek istediğinizden emin misiniz?')) return
    setIsDeleting(true)
    await onDelete(table.id)
    setIsDeleting(false)
  }

  const handleRegenerateQR = async () => {
    if (!confirm('QR kodu yenilemek istediğinizden emin misiniz? Eski QR kodlar çalışmayacaktır.')) return
    setIsRegenerating(true)
    await onRegenerateQR(table.id)
    setIsRegenerating(false)
  }

  return (
    <Card className="relative overflow-hidden hover:shadow-md transition-shadow">
      {/* Status indicator bar */}
      <div className={`absolute top-0 left-0 right-0 h-1 ${status.bgColor}`} />

      <CardContent className="p-4 pt-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <TableIcon className="h-5 w-5 text-muted-foreground flex-shrink-0" />
              <h3 className="font-semibold truncate">{table.name}</h3>
            </div>

            <div className="mt-2 space-y-1 text-sm text-muted-foreground">
              {table.table_number && (
                <p>No: {table.table_number}</p>
              )}
              {table.section && (
                <p>Bölüm: {table.section}</p>
              )}
              <p className="flex items-center gap-1">
                <UsersIcon className="h-3.5 w-3.5" />
                <span>{table.capacity} kişilik</span>
              </p>
            </div>

            {/* Status badge */}
            <div className="mt-3">
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${status.bgColor} ${status.color}`}>
                {status.label}
              </span>
              {table.is_outdoor && (
                <span className="ml-1 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                  Açık Alan
                </span>
              )}
              {table.is_accessible && (
                <span className="ml-1 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                  Erişilebilir
                </span>
              )}
            </div>
          </div>

          {/* QR indicator */}
          <div className="flex flex-col items-center">
            <a
              href={menuUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border bg-white p-2 hover:ring-2 hover:ring-primary transition-all dark:bg-gray-950"
              title="Menüyü görüntüle"
            >
              <QRIcon className="h-10 w-10 text-gray-800 dark:text-gray-200" />
            </a>
            <p className="mt-1 text-[10px] text-muted-foreground">QR Kodu</p>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-4 flex flex-wrap gap-2">
          {/* Status selector */}
          <select
            value={table.status}
            onChange={(e) => onStatusChange(table.id, e.target.value as TableStatus)}
            className="h-8 rounded-md border border-input bg-background px-2 text-xs ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {Object.entries(statusConfig).map(([value, config]) => (
              <option key={value} value={value}>
                {config.label}
              </option>
            ))}
          </select>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(table)}
            className="h-8"
          >
            <EditIcon className="h-3.5 w-3.5 mr-1" />
            Düzenle
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleRegenerateQR}
            disabled={isRegenerating}
            className="h-8"
          >
            <RefreshIcon className={`h-3.5 w-3.5 mr-1 ${isRegenerating ? 'animate-spin' : ''}`} />
            {isRegenerating ? '...' : 'QR'}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            disabled={isDeleting}
            className="h-8 text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <TrashIcon className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// =============================================================================
// MAIN PAGE COMPONENT
// =============================================================================

export default function TablesPage() {
  const queryClient = useQueryClient()
  const { currentOrg, isLoading: isOrgLoading } = useOrganization()
  const { toast } = useToast()

  // Modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isBatchCreateModalOpen, setIsBatchCreateModalOpen] = useState(false)
  const [editingTable, setEditingTable] = useState<RestaurantTable | null>(null)

  // Search/filter state
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedSection, setSelectedSection] = useState<string | null>(null)
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null)

  // Fetch tables
  const {
    data: tables = [],
    isLoading: isTablesLoading,
    error: tablesError,
    refetch,
  } = useQuery({
    queryKey: tableQueryKeys.list(currentOrg?.id ?? ''),
    queryFn: () => fetchTables(currentOrg!.id),
    enabled: !!currentOrg?.id,
    staleTime: 30 * 1000,
  })

  // Get unique sections
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

      // Status filter
      if (selectedStatus && table.status !== selectedStatus) {
        return false
      }

      return true
    })
  }, [tables, searchTerm, selectedSection, selectedStatus])

  // Stats
  const stats = useMemo(() => {
    const counts = {
      total: tables.length,
      available: 0,
      occupied: 0,
      reserved: 0,
      cleaning: 0,
      out_of_service: 0,
    }

    tables.forEach((table) => {
      if (table.status in counts) {
        counts[table.status as keyof typeof counts]++
      }
    })

    return counts
  }, [tables])

  // Handlers
  const handleFormSuccess = useCallback(() => {
    setIsCreateModalOpen(false)
    setIsBatchCreateModalOpen(false)
    setEditingTable(null)
    refetch()
  }, [refetch])

  const handleEdit = useCallback((table: RestaurantTable) => {
    setEditingTable(table)
  }, [])

  const handleDelete = useCallback(async (tableId: string) => {
    try {
      await deleteTable(tableId)
      toast({
        title: 'Masa silindi',
        description: 'Masa başarıyla silindi.',
      })
      refetch()
    } catch (err) {
      toast({
        title: 'Hata',
        description: err instanceof Error ? err.message : 'Masa silinemedi',
        variant: 'destructive',
      })
    }
  }, [toast, refetch])

  const handleStatusChange = useCallback(async (tableId: string, status: TableStatus) => {
    try {
      await updateTableData(tableId, { status })
      toast({
        title: 'Durum güncellendi',
        description: `Masa durumu "${statusConfig[status].label}" olarak değiştirildi.`,
      })
      refetch()
    } catch (err) {
      toast({
        title: 'Hata',
        description: err instanceof Error ? err.message : 'Durum güncellenemedi',
        variant: 'destructive',
      })
    }
  }, [toast, refetch])

  const handleRegenerateQR = useCallback(async (tableId: string) => {
    try {
      await regenerateQRCode(tableId)
      toast({
        title: 'QR kodu yenilendi',
        description: 'Yeni QR kodu oluşturuldu.',
      })
      refetch()
    } catch (err) {
      toast({
        title: 'Hata',
        description: err instanceof Error ? err.message : 'QR kodu yenilenemedi',
        variant: 'destructive',
      })
    }
  }, [toast, refetch])

  const isLoading = isOrgLoading || isTablesLoading

  return (
    <>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
              Masalar
            </h1>
            <p className="mt-1 text-muted-foreground">
              Restoran masalarınızı yönetin ve QR kodlarını oluşturun.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => setIsBatchCreateModalOpen(true)}
              disabled={isLoading || !currentOrg}
            >
              <PlusIcon className="mr-2 h-4 w-4" />
              Toplu Ekle
            </Button>
            <Button
              onClick={() => setIsCreateModalOpen(true)}
              disabled={isLoading || !currentOrg}
            >
              <PlusIcon className="mr-2 h-4 w-4" />
              Yeni Masa
            </Button>
          </div>
        </div>

        {/* Info Card */}
        <Card className="border-primary-200 bg-primary-50/50 dark:border-primary-900/50 dark:bg-primary-900/10">
          <CardContent className="flex items-start gap-3 p-4">
            <InfoIcon className="h-5 w-5 flex-shrink-0 text-primary-600 dark:text-primary-400 mt-0.5" />
            <div className="text-sm">
              <p className="text-primary-800 dark:text-primary-200">
                <strong>İpucu:</strong> Her masa için otomatik olarak benzersiz bir QR kodu oluşturulur.{' '}
                <Link href="/dashboard/qr-codes" className="underline hover:no-underline">
                  QR Kodları sayfasından
                </Link>{' '}
                indirip yazdırabilirsiniz.
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
                <TableIcon className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">Organizasyon seçilmedi</h3>
              <p className="mt-2 text-sm text-muted-foreground max-w-md">
                Masa yönetimi için bir organizasyon seçmeniz gerekmektedir.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Main Content */}
        {currentOrg && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
              <Card>
                <CardContent className="p-3 text-center">
                  <div className="text-2xl font-bold">{stats.total}</div>
                  <p className="text-xs text-muted-foreground">Toplam</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 text-center">
                  <div className="text-2xl font-bold text-green-600">{stats.available}</div>
                  <p className="text-xs text-muted-foreground">Müsait</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 text-center">
                  <div className="text-2xl font-bold text-red-600">{stats.occupied}</div>
                  <p className="text-xs text-muted-foreground">Dolu</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 text-center">
                  <div className="text-2xl font-bold text-blue-600">{stats.reserved}</div>
                  <p className="text-xs text-muted-foreground">Rezerve</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 text-center">
                  <div className="text-2xl font-bold text-yellow-600">{stats.cleaning}</div>
                  <p className="text-xs text-muted-foreground">Temizleniyor</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 text-center">
                  <div className="text-2xl font-bold text-gray-600">{stats.out_of_service}</div>
                  <p className="text-xs text-muted-foreground">Servis Dışı</p>
                </CardContent>
              </Card>
            </div>

            {/* Filters */}
            <Card>
              <CardContent className="p-4">
                <div className="flex flex-col gap-3 sm:flex-row">
                  {/* Search */}
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

                  {/* Section Filter */}
                  {sections.length > 0 && (
                    <select
                      value={selectedSection || ''}
                      onChange={(e) => setSelectedSection(e.target.value || null)}
                      className="h-10 rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-[160px]"
                    >
                      <option value="">Tüm Bölümler</option>
                      {sections.map((section) => (
                        <option key={section} value={section}>
                          {section}
                        </option>
                      ))}
                    </select>
                  )}

                  {/* Status Filter */}
                  <select
                    value={selectedStatus || ''}
                    onChange={(e) => setSelectedStatus(e.target.value || null)}
                    className="h-10 rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-[160px]"
                  >
                    <option value="">Tüm Durumlar</option>
                    {Object.entries(statusConfig).map(([value, config]) => (
                      <option key={value} value={value}>
                        {config.label}
                      </option>
                    ))}
                  </select>
                </div>
              </CardContent>
            </Card>

            {/* Tables Grid */}
            {isLoading ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {[...Array(4)].map((_, i) => (
                  <Card key={i}>
                    <CardContent className="p-4">
                      <div className="animate-pulse space-y-3">
                        <div className="h-5 w-24 rounded bg-muted" />
                        <div className="h-4 w-16 rounded bg-muted" />
                        <div className="h-4 w-20 rounded bg-muted" />
                        <div className="h-6 w-14 rounded bg-muted" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredTables.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="rounded-full bg-muted p-4">
                    <TableIcon className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold">
                    {searchTerm || selectedSection || selectedStatus
                      ? 'Masa bulunamadı'
                      : 'Henüz masa yok'}
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground max-w-md">
                    {searchTerm || selectedSection || selectedStatus
                      ? 'Arama kriterlerinizi değiştirin veya filtreleri temizleyin.'
                      : 'İlk masanızı ekleyerek başlayın.'}
                  </p>
                  {!searchTerm && !selectedSection && !selectedStatus && (
                    <Button onClick={() => setIsCreateModalOpen(true)} className="mt-4">
                      <PlusIcon className="mr-2 h-4 w-4" />
                      İlk Masayı Ekle
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filteredTables.map((table) => (
                  <TableCard
                    key={table.id}
                    table={table}
                    organizationSlug={currentOrg.slug}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onStatusChange={handleStatusChange}
                    onRegenerateQR={handleRegenerateQR}
                  />
                ))}
              </div>
            )}

            {/* Stats footer */}
            {!isLoading && tables.length > 0 && (
              <p className="text-sm text-muted-foreground text-center">
                {filteredTables.length === tables.length
                  ? `Toplam ${tables.length} masa`
                  : `${filteredTables.length} / ${tables.length} masa gösteriliyor`}
              </p>
            )}
          </>
        )}
      </div>

      {/* Create Table Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Yeni Masa Oluştur</DialogTitle>
            <DialogDescription>
              Restoranınıza yeni bir masa ekleyin. QR kodu otomatik oluşturulacaktır.
            </DialogDescription>
          </DialogHeader>
          {currentOrg && (
            <TableForm
              organizationId={currentOrg.id}
              onSuccess={handleFormSuccess}
              onCancel={() => setIsCreateModalOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Table Modal */}
      <Dialog
        open={!!editingTable}
        onOpenChange={(open) => !open && setEditingTable(null)}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Masa Düzenle</DialogTitle>
            <DialogDescription>
              Masa bilgilerini güncelleyin.
            </DialogDescription>
          </DialogHeader>
          {currentOrg && editingTable && (
            <TableForm
              organizationId={currentOrg.id}
              table={editingTable}
              onSuccess={handleFormSuccess}
              onCancel={() => setEditingTable(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Batch Create Modal */}
      <Dialog open={isBatchCreateModalOpen} onOpenChange={setIsBatchCreateModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Toplu Masa Oluştur</DialogTitle>
            <DialogDescription>
              Birden fazla masayı aynı anda oluşturun. Her masa için otomatik QR kodu oluşturulacaktır.
            </DialogDescription>
          </DialogHeader>
          {currentOrg && (
            <BatchCreateForm
              organizationId={currentOrg.id}
              existingCount={tables.length}
              onSuccess={handleFormSuccess}
              onCancel={() => setIsBatchCreateModalOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
