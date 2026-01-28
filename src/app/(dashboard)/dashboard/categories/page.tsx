'use client'

/**
 * Categories Management Page
 *
 * Dashboard page for managing menu categories with full CRUD operations.
 *
 * Features:
 * - View all categories with product counts
 * - Create new categories via modal
 * - Edit existing categories
 * - Drag-and-drop reordering
 * - Toggle visibility
 * - Delete with confirmation
 * - Mobile-responsive design
 *
 * @route /dashboard/categories
 */

import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import Script from 'next/script'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CategoryForm } from '@/components/features/menu/category-form'
import { CategoryList } from '@/components/features/menu/category-list'
import { useOrganization } from '@/lib/hooks/use-organization'
import { getCategories, type CategoryWithCount } from '@/lib/dal/categories-client'
import type { Category } from '@/types/database'

// =============================================================================
// QUERY KEYS
// =============================================================================

const categoryQueryKeys = {
  all: ['categories'] as const,
  list: (orgId: string) => [...categoryQueryKeys.all, 'list', orgId] as const,
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

function FolderIcon({ className }: { className?: string }) {
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
      <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
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

// =============================================================================
// PAGE COMPONENT
// =============================================================================

export default function CategoriesPage() {
  const queryClient = useQueryClient()
  const { currentOrg, isLoading: isOrgLoading } = useOrganization()

  // Modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<CategoryWithCount | null>(null)

  // Sortable.js loaded state
  const [sortableLoaded, setSortableLoaded] = useState(false)

  // Categories query
  const {
    data: categories = [],
    isLoading: isCategoriesLoading,
    error: categoriesError,
    refetch,
  } = useQuery({
    queryKey: categoryQueryKeys.list(currentOrg?.id ?? ''),
    queryFn: async () => {
      if (!currentOrg?.id) return []
      const { data, error } = await getCategories(currentOrg.id, {
        includeHidden: true,
      })
      if (error) throw new Error(error.message)
      return data ?? []
    },
    enabled: !!currentOrg?.id,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  })

  // Handle modal close and refetch
  const handleFormSuccess = () => {
    setIsCreateModalOpen(false)
    setEditingCategory(null)
    refetch()
  }

  // Handle edit
  const handleEdit = (category: CategoryWithCount) => {
    setEditingCategory(category)
  }

  // Handle refetch
  const handleRefetch = () => {
    refetch()
  }

  // Loading state
  const isLoading = isOrgLoading || isCategoriesLoading

  return (
    <>
      {/* Sortable.js CDN Script */}
      <Script
        src="https://cdn.jsdelivr.net/npm/sortablejs@1.15.2/Sortable.min.js"
        strategy="lazyOnload"
        onLoad={() => setSortableLoaded(true)}
      />

      <div className="space-y-6">
        {/* Page header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
              Kategoriler
            </h1>
            <p className="mt-1 text-muted-foreground">
              Menünüzü düzenlemek için kategoriler oluşturun ve yönetin.
            </p>
          </div>
          <Button
            onClick={() => setIsCreateModalOpen(true)}
            disabled={isLoading || !currentOrg}
            className="w-full sm:w-auto"
          >
            <PlusIcon className="mr-2 h-4 w-4" />
            Yeni Kategori
          </Button>
        </div>

        {/* Info card */}
        <Card className="border-primary-200 bg-primary-50/50 dark:border-primary-900/50 dark:bg-primary-900/10">
          <CardContent className="flex items-start gap-3 p-4">
            <InfoIcon className="h-5 w-5 flex-shrink-0 text-primary-600 dark:text-primary-400 mt-0.5" />
            <div className="text-sm">
              <p className="text-primary-800 dark:text-primary-200">
                <strong>İpucu:</strong> Kategorileri sürükleyerek sıralayabilirsiniz.
                Sıralama müşterilerinize gösterilen menüde de aynı şekilde görünecektir.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Error state */}
        {categoriesError && (
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
                  Kategoriler yüklenirken bir hata oluştu
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {categoriesError instanceof Error
                    ? categoriesError.message
                    : 'Bilinmeyen bir hata oluştu'}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refetch()}
                  className="mt-3"
                >
                  Tekrar Dene
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* No organization state */}
        {!isOrgLoading && !currentOrg && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <div className="rounded-full bg-muted p-4">
                <FolderIcon className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">Organizasyon seçilmedi</h3>
              <p className="mt-2 text-sm text-muted-foreground max-w-md">
                Kategori yönetimi için bir organizasyon seçmeniz gerekmektedir.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Category List */}
        {currentOrg && (
          <CategoryList
            categories={categories}
            organizationId={currentOrg.id}
            onEdit={handleEdit}
            onRefetch={handleRefetch}
            isLoading={isLoading}
          />
        )}

        {/* Stats */}
        {!isLoading && categories.length > 0 && (
          <div className="text-sm text-muted-foreground text-center">
            Toplam {categories.length} kategori
            {categories.filter((c) => c.is_visible).length !== categories.length && (
              <span>
                {' '}
                ({categories.filter((c) => c.is_visible).length} görünür,{' '}
                {categories.filter((c) => !c.is_visible).length} gizli)
              </span>
            )}
          </div>
        )}
      </div>

      {/* Create Category Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Yeni Kategori Oluştur</DialogTitle>
            <DialogDescription>
              Menünüze yeni bir kategori ekleyin. Ürünlerinizi bu kategoriler altında gruplandırabilirsiniz.
            </DialogDescription>
          </DialogHeader>
          {currentOrg && (
            <CategoryForm
              organizationId={currentOrg.id}
              parentCategories={categories}
              onSuccess={handleFormSuccess}
              onCancel={() => setIsCreateModalOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Category Modal */}
      <Dialog
        open={!!editingCategory}
        onOpenChange={(open) => !open && setEditingCategory(null)}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Kategori Düzenle</DialogTitle>
            <DialogDescription>
              Kategori bilgilerini güncelleyin.
            </DialogDescription>
          </DialogHeader>
          {currentOrg && editingCategory && (
            <CategoryForm
              organizationId={currentOrg.id}
              category={editingCategory}
              parentCategories={categories.filter((c) => c.id !== editingCategory.id)}
              onSuccess={handleFormSuccess}
              onCancel={() => setEditingCategory(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
