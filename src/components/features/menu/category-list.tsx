'use client'

/**
 * Category List Component
 *
 * A draggable list component for displaying and reordering menu categories.
 * Uses Sortable.js for drag-and-drop functionality.
 *
 * Features:
 * - Drag-and-drop reordering
 * - Optimistic updates
 * - Edit and delete actions
 * - Visibility toggle
 * - Product count display
 * - Mobile-responsive design
 * - Empty state handling
 *
 * @example
 * ```tsx
 * <CategoryList
 *   categories={categories}
 *   organizationId={orgId}
 *   onEdit={(category) => openEditModal(category)}
 *   onRefetch={() => refetch()}
 * />
 * ```
 */

import { useRef, useEffect, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  updateCategorySortOrder,
  deleteCategory,
  toggleCategoryVisibility,
  duplicateCategory,
} from '@/lib/actions/menu'
import { useToast } from '@/lib/hooks/use-toast'
import type { CategoryWithCount } from '@/lib/dal/categories-client'

// =============================================================================
// TYPES
// =============================================================================

interface CategoryListProps {
  /** Array of categories to display */
  categories: CategoryWithCount[]
  /** Organization ID for actions */
  organizationId: string
  /** Called when edit button is clicked */
  onEdit?: (category: CategoryWithCount) => void
  /** Called after successful mutation to refresh data */
  onRefetch?: () => void
  /** Is data loading */
  isLoading?: boolean
}

// Sortable.js type declaration
declare global {
  interface Window {
    Sortable?: {
      create: (
        el: HTMLElement,
        options: {
          animation?: number
          handle?: string
          ghostClass?: string
          chosenClass?: string
          dragClass?: string
          onEnd?: (evt: { oldIndex?: number; newIndex?: number }) => void
        }
      ) => { destroy: () => void }
    }
  }
}

// =============================================================================
// ICONS
// =============================================================================

function DragIcon({ className }: { className?: string }) {
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
      <circle cx="9" cy="5" r="1" />
      <circle cx="9" cy="12" r="1" />
      <circle cx="9" cy="19" r="1" />
      <circle cx="15" cy="5" r="1" />
      <circle cx="15" cy="12" r="1" />
      <circle cx="15" cy="19" r="1" />
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
      <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
    </svg>
  )
}

function CopyIcon({ className }: { className?: string }) {
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
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
    </svg>
  )
}

function EyeIcon({ className }: { className?: string }) {
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
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function EyeOffIcon({ className }: { className?: string }) {
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
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
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

// =============================================================================
// COMPONENT
// =============================================================================

export function CategoryList({
  categories,
  organizationId,
  onEdit,
  onRefetch,
  isLoading = false,
}: CategoryListProps) {
  const { toast } = useToast()
  const listRef = useRef<HTMLDivElement>(null)
  const sortableRef = useRef<{ destroy: () => void } | null>(null)

  // Local state for optimistic updates
  const [localCategories, setLocalCategories] = useState(categories)
  const [actionInProgress, setActionInProgress] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<CategoryWithCount | null>(null)

  // Sync local categories when prop changes
  useEffect(() => {
    setLocalCategories(categories)
  }, [categories])

  // Initialize Sortable.js
  useEffect(() => {
    if (!listRef.current) return

    // Load Sortable.js from CDN if not already loaded
    const loadSortable = async () => {
      if (!window.Sortable) {
        // Wait for CDN script to load
        await new Promise<void>((resolve) => {
          const checkInterval = setInterval(() => {
            if (window.Sortable) {
              clearInterval(checkInterval)
              resolve()
            }
          }, 100)
          // Timeout after 5 seconds
          setTimeout(() => {
            clearInterval(checkInterval)
            resolve()
          }, 5000)
        })
      }

      if (!window.Sortable || !listRef.current) return

      // Destroy existing instance
      if (sortableRef.current) {
        sortableRef.current.destroy()
      }

      // Create new instance
      sortableRef.current = window.Sortable.create(listRef.current, {
        animation: 150,
        handle: '.drag-handle',
        ghostClass: 'opacity-50',
        chosenClass: 'ring-2 ring-primary-500',
        dragClass: 'shadow-lg',
        onEnd: (evt) => {
          if (
            evt.oldIndex !== undefined &&
            evt.newIndex !== undefined &&
            evt.oldIndex !== evt.newIndex
          ) {
            handleReorder(evt.oldIndex, evt.newIndex)
          }
        },
      })
    }

    loadSortable()

    return () => {
      if (sortableRef.current) {
        sortableRef.current.destroy()
      }
    }
  }, [localCategories.length])

  // Handle reorder
  const handleReorder = useCallback(
    async (oldIndex: number, newIndex: number) => {
      // Optimistic update
      const newCategories = [...localCategories]
      const [movedItem] = newCategories.splice(oldIndex, 1)
      newCategories.splice(newIndex, 0, movedItem)

      // Update sort_order values
      const updatedCategories = newCategories.map((cat, index) => ({
        ...cat,
        sort_order: index,
      }))

      setLocalCategories(updatedCategories)

      // Persist to server
      try {
        const result = await updateCategorySortOrder(organizationId, {
          items: updatedCategories.map((cat) => ({
            id: cat.id,
            sort_order: cat.sort_order,
          })),
        })

        if (result.success) {
          toast({
            title: 'Başarılı',
            description: 'Sıralama güncellendi',
            variant: 'success',
          })
          onRefetch?.()
        } else {
          // Revert on error
          setLocalCategories(categories)
          toast({
            title: 'Hata',
            description: result.message,
            variant: 'destructive',
          })
        }
      } catch {
        // Revert on error
        setLocalCategories(categories)
        toast({
          title: 'Hata',
          description: 'Sıralama güncellenemedi',
          variant: 'destructive',
        })
      }
    },
    [localCategories, categories, organizationId, toast, onRefetch]
  )

  // Handle visibility toggle
  const handleToggleVisibility = async (category: CategoryWithCount) => {
    setActionInProgress(category.id)

    // Optimistic update
    setLocalCategories((prev) =>
      prev.map((cat) =>
        cat.id === category.id ? { ...cat, is_visible: !cat.is_visible } : cat
      )
    )

    try {
      const result = await toggleCategoryVisibility(category.id, !category.is_visible)

      if (result.success) {
        toast({
          title: 'Başarılı',
          description: category.is_visible ? 'Kategori gizlendi' : 'Kategori görünür yapıldı',
          variant: 'success',
        })
        onRefetch?.()
      } else {
        // Revert on error
        setLocalCategories(categories)
        toast({
          title: 'Hata',
          description: result.message,
          variant: 'destructive',
        })
      }
    } catch {
      // Revert on error
      setLocalCategories(categories)
      toast({
        title: 'Hata',
        description: 'Görünürlük değiştirilemedi',
        variant: 'destructive',
      })
    } finally {
      setActionInProgress(null)
    }
  }

  // Handle delete
  const handleDelete = async (category: CategoryWithCount) => {
    setActionInProgress(category.id)
    setDeleteConfirm(null)

    try {
      const result = await deleteCategory(category.id)

      if (result.success) {
        toast({
          title: 'Başarılı',
          description: 'Kategori silindi',
          variant: 'success',
        })
        // Remove from local state
        setLocalCategories((prev) => prev.filter((cat) => cat.id !== category.id))
        onRefetch?.()
      } else {
        toast({
          title: 'Hata',
          description: result.message,
          variant: 'destructive',
        })
      }
    } catch {
      toast({
        title: 'Hata',
        description: 'Kategori silinemedi',
        variant: 'destructive',
      })
    } finally {
      setActionInProgress(null)
    }
  }

  // Handle duplicate
  const handleDuplicate = async (category: CategoryWithCount) => {
    setActionInProgress(category.id)

    try {
      const result = await duplicateCategory(category.id)

      if (result.success) {
        toast({
          title: 'Başarılı',
          description: 'Kategori kopyalandı',
          variant: 'success',
        })
        onRefetch?.()
      } else {
        toast({
          title: 'Hata',
          description: result.message,
          variant: 'destructive',
        })
      }
    } catch {
      toast({
        title: 'Hata',
        description: 'Kategori kopyalanamadı',
        variant: 'destructive',
      })
    } finally {
      setActionInProgress(null)
    }
  }

  // Empty state
  if (!isLoading && localCategories.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <div className="rounded-full bg-muted p-4">
            <FolderIcon className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="mt-4 text-lg font-semibold">Henüz kategori yok</h3>
          <p className="mt-2 text-sm text-muted-foreground max-w-md">
            Menünüze kategori ekleyerek ürünlerinizi organize edin.
            İlk kategorinizi oluşturmak için yukarıdaki butonu kullanın.
          </p>
        </CardContent>
      </Card>
    )
  }

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-20 animate-pulse rounded-lg border bg-muted/40"
          />
        ))}
      </div>
    )
  }

  return (
    <>
      {/* Category List */}
      <div ref={listRef} className="space-y-3">
        {localCategories.map((category) => (
          <Card
            key={category.id}
            data-id={category.id}
            className={`transition-all ${
              !category.is_visible ? 'opacity-60' : ''
            } ${actionInProgress === category.id ? 'pointer-events-none opacity-70' : ''}`}
          >
            <CardContent className="flex items-center gap-4 p-4">
              {/* Drag Handle */}
              <button
                type="button"
                className="drag-handle cursor-grab touch-none p-2 text-muted-foreground hover:text-foreground active:cursor-grabbing"
                aria-label="Sıralamayı değiştirmek için sürükle"
              >
                <DragIcon className="h-5 w-5" />
              </button>

              {/* Icon */}
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary-100 text-xl dark:bg-primary-900/30">
                {category.icon || <FolderIcon className="h-5 w-5 text-primary-600 dark:text-primary-400" />}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium truncate">{category.name}</h3>
                  {!category.is_visible && (
                    <span className="flex-shrink-0 text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                      Gizli
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground truncate">
                  {category.product_count} ürün
                  {category.description && ` • ${category.description}`}
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1">
                {/* Visibility Toggle */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleToggleVisibility(category)}
                  disabled={actionInProgress === category.id}
                  title={category.is_visible ? 'Gizle' : 'Görünür yap'}
                  aria-label={category.is_visible ? 'Kategoriyi gizle' : 'Kategoriyi görünür yap'}
                >
                  {category.is_visible ? (
                    <EyeIcon className="h-4 w-4" />
                  ) : (
                    <EyeOffIcon className="h-4 w-4" />
                  )}
                </Button>

                {/* Edit */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onEdit?.(category)}
                  disabled={actionInProgress === category.id}
                  title="Düzenle"
                  aria-label="Kategoriyi düzenle"
                >
                  <EditIcon className="h-4 w-4" />
                </Button>

                {/* Duplicate */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDuplicate(category)}
                  disabled={actionInProgress === category.id}
                  title="Kopyala"
                  aria-label="Kategoriyi kopyala"
                >
                  <CopyIcon className="h-4 w-4" />
                </Button>

                {/* Delete */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setDeleteConfirm(category)}
                  disabled={actionInProgress === category.id}
                  title="Sil"
                  aria-label="Kategoriyi sil"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <TrashIcon className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Kategoriyi Sil</DialogTitle>
            <DialogDescription>
              <strong>{deleteConfirm?.name}</strong> kategorisini silmek istediğinizden emin misiniz?
              {deleteConfirm?.product_count && deleteConfirm.product_count > 0 && (
                <span className="block mt-2 text-destructive">
                  Bu kategoride {deleteConfirm.product_count} ürün bulunmaktadır.
                  Ürünler kategorisiz kalacaktır.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              İptal
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
              disabled={actionInProgress === deleteConfirm?.id}
            >
              {actionInProgress === deleteConfirm?.id ? 'Siliniyor...' : 'Sil'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
