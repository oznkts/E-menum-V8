'use client'

/**
 * Products Management Page
 *
 * Dashboard page for managing restaurant menu products.
 * Provides CRUD operations, filtering by category, and search functionality.
 *
 * Features:
 * - Product list with card view
 * - Create/Edit product modal
 * - Category filter dropdown
 * - Search functionality
 * - Availability toggle
 * - Mobile-first responsive design
 * - Turkish UI
 *
 * @see spec.md
 * @see MOBILE-FIRST-TALIMATNAME-v3.md
 */

import { useState, useEffect, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { ProductCard } from '@/components/features/menu/product-card'
import { ProductForm } from '@/components/features/menu/product-form'
import { useOrganization } from '@/lib/hooks/use-organization'
import { createClient } from '@/lib/supabase/client'
import type { Product, Category } from '@/types/database'

// =============================================================================
// TYPES
// =============================================================================

type ProductWithCategory = Product & { category: Category | null }

// =============================================================================
// QUERY KEYS
// =============================================================================

const productQueryKeys = {
  all: ['products'] as const,
  list: (orgId: string, categoryId?: string | null, search?: string) =>
    [...productQueryKeys.all, 'list', orgId, categoryId || 'all', search || ''] as const,
}

const categoryQueryKeys = {
  all: ['categories'] as const,
  list: (orgId: string) => [...categoryQueryKeys.all, 'list', orgId] as const,
}

// =============================================================================
// DATA FETCHING
// =============================================================================

async function fetchProducts(
  organizationId: string,
  categoryId?: string | null,
  search?: string
): Promise<ProductWithCategory[]> {
  const supabase = createClient()

  let query = supabase
    .from('products')
    .select(`
      *,
      category:categories(*)
    `)
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })

  if (categoryId) {
    query = query.eq('category_id', categoryId)
  }

  if (search) {
    query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(error.message)
  }

  return (data as ProductWithCategory[]) || []
}

async function fetchCategories(organizationId: string): Promise<Category[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .order('sort_order', { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  return data || []
}

async function fetchSingleProduct(productId: string): Promise<Product | null> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('id', productId)
    .single()

  if (error) {
    return null
  }

  return data
}

// =============================================================================
// COMPONENT
// =============================================================================

export default function ProductsPage() {
  const queryClient = useQueryClient()
  const { currentOrg, isLoading: orgLoading } = useOrganization()

  // Local state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery)
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery])

  // ==========================================================================
  // QUERIES
  // ==========================================================================

  const {
    data: products = [],
    isLoading: productsLoading,
    error: productsError,
    refetch: refetchProducts,
  } = useQuery({
    queryKey: productQueryKeys.list(currentOrg?.id || '', selectedCategoryId, debouncedSearch),
    queryFn: () => fetchProducts(currentOrg!.id, selectedCategoryId, debouncedSearch),
    enabled: !!currentOrg?.id,
    staleTime: 30 * 1000, // 30 seconds
  })

  const {
    data: categories = [],
    isLoading: categoriesLoading,
  } = useQuery({
    queryKey: categoryQueryKeys.list(currentOrg?.id || ''),
    queryFn: () => fetchCategories(currentOrg!.id),
    enabled: !!currentOrg?.id,
    staleTime: 60 * 1000, // 1 minute
  })

  // ==========================================================================
  // HANDLERS
  // ==========================================================================

  const handleCreateProduct = () => {
    setEditingProduct(null)
    setIsModalOpen(true)
  }

  const handleEditProduct = async (productId: string) => {
    const product = await fetchSingleProduct(productId)
    if (product) {
      setEditingProduct(product)
      setIsModalOpen(true)
    }
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingProduct(null)
  }

  const handleFormSuccess = useCallback(() => {
    handleCloseModal()
    // Invalidate products queries to refetch
    queryClient.invalidateQueries({ queryKey: productQueryKeys.all })
    queryClient.invalidateQueries({ queryKey: categoryQueryKeys.all })
  }, [queryClient])

  const handleProductChange = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: productQueryKeys.all })
    queryClient.invalidateQueries({ queryKey: categoryQueryKeys.all })
  }, [queryClient])

  const handleCategoryChange = (categoryId: string) => {
    setSelectedCategoryId(categoryId === 'all' ? null : categoryId)
  }

  // ==========================================================================
  // LOADING STATE
  // ==========================================================================

  if (orgLoading) {
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

  if (!currentOrg) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Organizasyon Seçilmedi</CardTitle>
            <CardDescription>
              Ürünleri yönetmek için önce bir organizasyon seçmeniz gerekiyor.
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
          <h1 className="text-2xl font-bold tracking-tight">Ürünler</h1>
          <p className="text-muted-foreground">
            Menünüzdeki ürünleri yönetin
          </p>
        </div>
        <Button onClick={handleCreateProduct}>
          <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Yeni Ürün
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 sm:flex-row">
            {/* Search */}
            <div className="relative flex-1">
              <svg
                className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
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
              value={selectedCategoryId || 'all'}
              onChange={(e) => handleCategoryChange(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:w-[200px]"
              disabled={categoriesLoading}
            >
              <option value="all">Tüm Kategoriler</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Product Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{products.length}</div>
            <p className="text-xs text-muted-foreground">Toplam Ürün</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">
              {products.filter((p) => p.is_available && p.status === 'active').length}
            </div>
            <p className="text-xs text-muted-foreground">Aktif</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-yellow-600">
              {products.filter((p) => p.is_featured).length}
            </div>
            <p className="text-xs text-muted-foreground">Öne Çıkan</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-red-600">
              {products.filter((p) => !p.is_available || p.status === 'out_of_stock').length}
            </div>
            <p className="text-xs text-muted-foreground">Deaktif/Stok Yok</p>
          </CardContent>
        </Card>
      </div>

      {/* Products Grid */}
      {productsLoading ? (
        <div className="flex h-[30vh] items-center justify-center">
          <svg className="h-8 w-8 animate-spin text-primary" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        </div>
      ) : productsError ? (
        <Card>
          <CardContent className="p-8 text-center">
            <svg
              className="mx-auto h-12 w-12 text-destructive"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <h3 className="mt-4 text-lg font-semibold">Ürünler yüklenemedi</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Lütfen sayfayı yenileyip tekrar deneyin.
            </p>
            <Button onClick={() => refetchProducts()} className="mt-4">
              Tekrar Dene
            </Button>
          </CardContent>
        </Card>
      ) : products.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <svg
              className="mx-auto h-12 w-12 text-muted-foreground"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
              />
            </svg>
            <h3 className="mt-4 text-lg font-semibold">
              {debouncedSearch || selectedCategoryId
                ? 'Ürün bulunamadı'
                : 'Henüz ürün yok'}
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {debouncedSearch || selectedCategoryId
                ? 'Arama kriterlerinizi değiştirin veya filtreleri temizleyin.'
                : 'Menünüze ilk ürünü ekleyerek başlayın.'}
            </p>
            {!debouncedSearch && !selectedCategoryId && (
              <Button onClick={handleCreateProduct} className="mt-4">
                <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                İlk Ürünü Ekle
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onEdit={() => handleEditProduct(product.id)}
              onDelete={handleProductChange}
              onDuplicate={handleProductChange}
              onAvailabilityChange={handleProductChange}
            />
          ))}
        </div>
      )}

      {/* Create/Edit Product Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingProduct ? 'Ürün Düzenle' : 'Yeni Ürün'}
            </DialogTitle>
            <DialogDescription>
              {editingProduct
                ? 'Ürün bilgilerini güncelleyin.'
                : 'Menünüze yeni bir ürün ekleyin.'}
            </DialogDescription>
          </DialogHeader>
          <ProductForm
            organizationId={currentOrg.id}
            categories={categories}
            product={editingProduct}
            onSuccess={handleFormSuccess}
            onCancel={handleCloseModal}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
