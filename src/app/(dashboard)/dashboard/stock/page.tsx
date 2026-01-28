'use client'

/**
 * Stock Management Page
 *
 * Quick stock management with toggle switches for item availability.
 * Designed for fast operations during service.
 *
 * Features:
 * - Quick stock toggle for all products
 * - Category filtering
 * - Search functionality
 * - Bulk operations
 * - Low stock alerts
 * - Real-time updates
 * - Turkish UI
 *
 * @see eksik-ozellikler-talimatname.md
 * @see spec.md
 */

import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useOrganization } from '@/lib/hooks/use-organization'
import { useToast } from '@/lib/hooks/use-toast'
import { createClient } from '@/lib/supabase/client'
import type { Product, Category } from '@/types/database'

// =============================================================================
// TYPES
// =============================================================================

interface ProductWithCategory extends Product {
  category_name: string | null
}

// =============================================================================
// QUERY KEYS
// =============================================================================

const stockQueryKeys = {
  all: ['stock'] as const,
  products: (orgId: string) => [...stockQueryKeys.all, 'products', orgId] as const,
  categories: (orgId: string) => [...stockQueryKeys.all, 'categories', orgId] as const,
}

// =============================================================================
// DATA FETCHING
// =============================================================================

async function fetchProducts(organizationId: string): Promise<ProductWithCategory[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      categories:category_id (name)
    `)
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .order('name', { ascending: true })

  if (error) throw new Error(error.message)

  return (data || []).map((product) => ({
    ...product,
    category_name: (product.categories as { name: string } | null)?.name || null,
  }))
}

async function fetchCategories(organizationId: string): Promise<Category[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .order('sort_order', { ascending: true })

  if (error) throw new Error(error.message)
  return data || []
}

async function toggleProductAvailability(productId: string, isAvailable: boolean): Promise<void> {
  const supabase = createClient()

  const { error } = await supabase
    .from('products')
    .update({ is_available: isAvailable })
    .eq('id', productId)

  if (error) throw new Error(error.message)
}

async function bulkUpdateAvailability(productIds: string[], isAvailable: boolean): Promise<void> {
  const supabase = createClient()

  const { error } = await supabase
    .from('products')
    .update({ is_available: isAvailable })
    .in('id', productIds)

  if (error) throw new Error(error.message)
}

// =============================================================================
// ICONS
// =============================================================================

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  )
}

function PackageIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M16.5 9.4 7.55 4.24" />
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.29 7 12 12 20.71 7" />
      <line x1="12" y1="22" x2="12" y2="12" />
    </svg>
  )
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

// =============================================================================
// TOGGLE SWITCH COMPONENT
// =============================================================================

interface ToggleSwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
  label?: string
}

function ToggleSwitch({ checked, onChange, disabled, label }: ToggleSwitchProps) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`
        relative inline-flex h-8 w-14 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent
        transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2
        ${checked ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}
        ${disabled ? 'cursor-not-allowed opacity-50' : ''}
      `}
    >
      <span
        className={`
          pointer-events-none inline-block h-7 w-7 transform rounded-full bg-white shadow ring-0
          transition duration-200 ease-in-out
          ${checked ? 'translate-x-6' : 'translate-x-0'}
        `}
      >
        {checked ? (
          <CheckIcon className="h-5 w-5 text-green-500 p-1" />
        ) : (
          <XIcon className="h-5 w-5 text-gray-400 p-1" />
        )}
      </span>
    </button>
  )
}

// =============================================================================
// PRODUCT STOCK ROW COMPONENT
// =============================================================================

interface ProductStockRowProps {
  product: ProductWithCategory
  onToggle: (productId: string, isAvailable: boolean) => void
  isUpdating: boolean
}

function ProductStockRow({ product, onToggle, isUpdating }: ProductStockRowProps) {
  return (
    <div
      className={`flex items-center justify-between gap-4 rounded-lg border p-4 transition-all ${
        product.is_available
          ? 'border-green-200 bg-green-50/50 dark:border-green-900/50 dark:bg-green-900/10'
          : 'border-red-200 bg-red-50/50 dark:border-red-900/50 dark:bg-red-900/10'
      }`}
    >
      <div className="flex items-center gap-4">
        {/* Product Image */}
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="h-14 w-14 rounded-lg object-cover"
          />
        ) : (
          <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-slate-200 dark:bg-slate-700">
            <PackageIcon className="h-6 w-6 text-muted-foreground" />
          </div>
        )}

        {/* Product Info */}
        <div>
          <h3 className="font-medium">{product.name}</h3>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {product.category_name && (
              <span className="rounded bg-slate-200 px-2 py-0.5 text-xs dark:bg-slate-700">
                {product.category_name}
              </span>
            )}
            <span>
              {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(product.price)}
            </span>
          </div>
        </div>
      </div>

      {/* Toggle */}
      <div className="flex items-center gap-3">
        <span className={`text-sm font-medium ${product.is_available ? 'text-green-600' : 'text-red-600'}`}>
          {product.is_available ? 'Stokta' : 'Tükendi'}
        </span>
        <ToggleSwitch
          checked={product.is_available}
          onChange={(checked) => onToggle(product.id, checked)}
          disabled={isUpdating}
          label={`${product.name} stok durumu`}
        />
      </div>
    </div>
  )
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function StockManagementPage() {
  const queryClient = useQueryClient()
  const { currentOrg, isLoading: orgLoading } = useOrganization()
  const { toast } = useToast()

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [showOutOfStock, setShowOutOfStock] = useState(false)

  // ==========================================================================
  // QUERIES
  // ==========================================================================

  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: stockQueryKeys.products(currentOrg?.id || ''),
    queryFn: () => fetchProducts(currentOrg!.id),
    enabled: !!currentOrg?.id,
    staleTime: 30 * 1000,
  })

  const { data: categories = [] } = useQuery({
    queryKey: stockQueryKeys.categories(currentOrg?.id || ''),
    queryFn: () => fetchCategories(currentOrg!.id),
    enabled: !!currentOrg?.id,
    staleTime: 60 * 1000,
  })

  // ==========================================================================
  // MUTATIONS
  // ==========================================================================

  const toggleMutation = useMutation({
    mutationFn: ({ productId, isAvailable }: { productId: string; isAvailable: boolean }) =>
      toggleProductAvailability(productId, isAvailable),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: stockQueryKeys.products(currentOrg!.id) })
    },
    onError: (error) => {
      toast({
        title: 'Hata',
        description: error instanceof Error ? error.message : 'Stok durumu güncellenemedi',
        variant: 'destructive',
      })
    },
  })

  const bulkMutation = useMutation({
    mutationFn: ({ productIds, isAvailable }: { productIds: string[]; isAvailable: boolean }) =>
      bulkUpdateAvailability(productIds, isAvailable),
    onSuccess: (_, { isAvailable }) => {
      queryClient.invalidateQueries({ queryKey: stockQueryKeys.products(currentOrg!.id) })
      toast({
        title: 'Başarılı',
        description: `Seçili ürünler ${isAvailable ? 'stokta' : 'tükendi'} olarak işaretlendi`,
      })
    },
    onError: (error) => {
      toast({
        title: 'Hata',
        description: error instanceof Error ? error.message : 'Toplu güncelleme başarısız',
        variant: 'destructive',
      })
    },
  })

  // ==========================================================================
  // HANDLERS
  // ==========================================================================

  const handleToggle = useCallback(
    (productId: string, isAvailable: boolean) => {
      toggleMutation.mutate({ productId, isAvailable })
    },
    [toggleMutation]
  )

  const handleBulkMarkOutOfStock = () => {
    const outOfStockIds = filteredProducts.filter((p) => p.is_available).map((p) => p.id)
    if (outOfStockIds.length === 0) return
    bulkMutation.mutate({ productIds: outOfStockIds, isAvailable: false })
  }

  const handleBulkMarkInStock = () => {
    const inStockIds = filteredProducts.filter((p) => !p.is_available).map((p) => p.id)
    if (inStockIds.length === 0) return
    bulkMutation.mutate({ productIds: inStockIds, isAvailable: true })
  }

  // ==========================================================================
  // FILTERING
  // ==========================================================================

  const filteredProducts = products.filter((product) => {
    // Search filter
    if (searchQuery && !product.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false
    }
    // Category filter
    if (selectedCategory && product.category_id !== selectedCategory) {
      return false
    }
    // Out of stock filter
    if (showOutOfStock && product.is_available) {
      return false
    }
    return true
  })

  // Stats
  const stats = {
    total: products.length,
    inStock: products.filter((p) => p.is_available).length,
    outOfStock: products.filter((p) => !p.is_available).length,
  }

  // ==========================================================================
  // LOADING
  // ==========================================================================

  if (orgLoading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <svg className="h-10 w-10 animate-spin text-primary" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="text-lg text-muted-foreground">Yükleniyor...</p>
        </div>
      </div>
    )
  }

  if (!currentOrg) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Organizasyon Seçilmedi</CardTitle>
            <CardDescription>
              Stok yönetimini kullanmak için önce bir organizasyon seçmeniz gerekiyor.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <div className="space-y-6 p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <PackageIcon className="h-7 w-7 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">Stok Yönetimi</h1>
          </div>
          <p className="text-muted-foreground">
            Ürünlerin stok durumlarını hızlıca yönetin
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Toplam Ürün</p>
          </CardContent>
        </Card>
        <Card className="border-green-200 bg-green-50/50 dark:border-green-900/50 dark:bg-green-900/10">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">{stats.inStock}</div>
            <p className="text-xs text-green-600">Stokta</p>
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50/50 dark:border-red-900/50 dark:bg-red-900/10">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-red-600">{stats.outOfStock}</div>
            <p className="text-xs text-red-600">Tükendi</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            {/* Search */}
            <div className="relative flex-1">
              <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Ürün ara..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Category Filter */}
            <select
              value={selectedCategory || ''}
              onChange={(e) => setSelectedCategory(e.target.value || null)}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Tüm Kategoriler</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>

            {/* Out of Stock Toggle */}
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={showOutOfStock}
                onChange={(e) => setShowOutOfStock(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              Sadece Tükenenler
            </label>
          </div>

          {/* Bulk Actions */}
          <div className="mt-4 flex gap-2 border-t pt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={handleBulkMarkOutOfStock}
              disabled={bulkMutation.isPending}
            >
              <XIcon className="mr-1 h-4 w-4" />
              Tümünü Tükendi İşaretle
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleBulkMarkInStock}
              disabled={bulkMutation.isPending}
            >
              <CheckIcon className="mr-1 h-4 w-4" />
              Tümünü Stokta İşaretle
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Products List */}
      <div className="space-y-3">
        {productsLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
          ))
        ) : filteredProducts.length === 0 ? (
          <Card className="p-12 text-center">
            <PackageIcon className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <p className="mt-2 text-muted-foreground">
              {searchQuery || selectedCategory
                ? 'Arama kriterlerine uygun ürün bulunamadı'
                : 'Henüz ürün eklenmemiş'}
            </p>
          </Card>
        ) : (
          filteredProducts.map((product) => (
            <ProductStockRow
              key={product.id}
              product={product}
              onToggle={handleToggle}
              isUpdating={toggleMutation.isPending}
            />
          ))
        )}
      </div>
    </div>
  )
}
