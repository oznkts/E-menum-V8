'use client'

/**
 * ImageUpload Component
 *
 * A drag-and-drop image upload component with Supabase Storage integration.
 *
 * Features:
 * - Drag-and-drop file upload
 * - Click to select files
 * - Multiple file upload support
 * - Image preview with lightbox
 * - Delete functionality
 * - Upload progress indicator
 * - Max images limit (5 per product)
 * - Error handling with retry mechanism
 * - Mobile-first responsive design
 * - Accessibility support
 *
 * @example
 * ```tsx
 * <ImageUpload
 *   organizationId={orgId}
 *   productId={productId}
 *   images={existingImages}
 *   onChange={handleImagesChange}
 *   maxImages={5}
 * />
 * ```
 */

import { useState, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/lib/hooks/use-toast'
import { uploadImage, deleteImage } from '@/lib/actions/storage'
import {
  STORAGE_BUCKETS,
  MAX_IMAGES_PER_PRODUCT,
  extractPathFromUrl,
  formatFileSize,
  type UploadedImage,
  type ProductImage,
} from '@/lib/storage/shared'

// =============================================================================
// TYPES
// =============================================================================

export interface ImageUploadProps {
  /** Organization ID for storage path */
  organizationId: string
  /** Product ID for storage path (optional) */
  productId?: string
  /** Current images array */
  images: ProductImage[]
  /** Callback when images change */
  onChange: (images: ProductImage[]) => void
  /** Maximum number of images allowed */
  maxImages?: number
  /** Storage bucket to use */
  bucket?: string
  /** Whether the component is disabled */
  disabled?: boolean
  /** Custom class name */
  className?: string
  /** Label for accessibility */
  label?: string
}

interface UploadingFile {
  id: string
  file: File
  progress: number
  error?: string
}

// =============================================================================
// CONSTANTS
// =============================================================================

const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

// =============================================================================
// COMPONENT
// =============================================================================

export function ImageUpload({
  organizationId,
  productId,
  images,
  onChange,
  maxImages = MAX_IMAGES_PER_PRODUCT,
  bucket = STORAGE_BUCKETS.PRODUCT_IMAGES,
  disabled = false,
  className = '',
  label = 'Ürün Görselleri',
}: ImageUploadProps) {
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [uploading, setUploading] = useState<UploadingFile[]>([])
  const [deletingPaths, setDeletingPaths] = useState<string[]>([])
  const [previewImage, setPreviewImage] = useState<string | null>(null)

  // ==========================================================================
  // COMPUTED VALUES
  // ==========================================================================

  const remainingSlots = maxImages - images.length - uploading.length
  const canUpload = remainingSlots > 0 && !disabled

  // ==========================================================================
  // FILE VALIDATION
  // ==========================================================================

  const validateFile = useCallback((file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return 'Geçersiz dosya türü. Sadece JPEG, PNG, WebP ve GIF desteklenir.'
    }
    if (file.size > MAX_FILE_SIZE) {
      return 'Dosya çok büyük. Maksimum 5MB yüklenebilir.'
    }
    return null
  }, [])

  // ==========================================================================
  // UPLOAD HANDLER
  // ==========================================================================

  const handleUpload = useCallback(
    async (files: FileList | File[]) => {
      const fileArray = Array.from(files)

      // Check remaining slots
      if (fileArray.length > remainingSlots) {
        toast({
          title: 'Hata',
          description: `En fazla ${maxImages} görsel yükleyebilirsiniz. ${remainingSlots} alan kaldı.`,
          variant: 'destructive',
        })
        return
      }

      // Validate all files
      const validFiles: File[] = []
      for (const file of fileArray) {
        const error = validateFile(file)
        if (error) {
          toast({
            title: 'Hata',
            description: `${file.name}: ${error}`,
            variant: 'destructive',
          })
        } else {
          validFiles.push(file)
        }
      }

      if (validFiles.length === 0) return

      // Add to uploading state
      const uploadingItems: UploadingFile[] = validFiles.map((file) => ({
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
        file,
        progress: 0,
      }))

      setUploading((prev) => [...prev, ...uploadingItems])

      // Upload each file
      const newImages: ProductImage[] = []

      for (const item of uploadingItems) {
        try {
          // Update progress to indicate upload started
          setUploading((prev) =>
            prev.map((u) => (u.id === item.id ? { ...u, progress: 30 } : u))
          )

          const formData = new FormData()
          formData.append('file', item.file)
          formData.append('organizationId', organizationId)
          formData.append('bucket', bucket)
          if (productId) {
            formData.append('productId', productId)
          }

          const result = await uploadImage(formData)

          if (result.success && result.data) {
            // Update progress to complete
            setUploading((prev) =>
              prev.map((u) => (u.id === item.id ? { ...u, progress: 100 } : u))
            )

            newImages.push({
              original: result.data.url,
              thumbnail: result.data.url, // Same URL for now, could add image optimization later
              path: result.data.path,
              name: result.data.name,
            })
          } else {
            // Mark as failed
            setUploading((prev) =>
              prev.map((u) =>
                u.id === item.id
                  ? { ...u, progress: 0, error: result.message }
                  : u
              )
            )
          }
        } catch {
          setUploading((prev) =>
            prev.map((u) =>
              u.id === item.id
                ? { ...u, progress: 0, error: 'Yükleme başarısız oldu' }
                : u
            )
          )
        }
      }

      // Remove successful uploads from uploading state
      setTimeout(() => {
        setUploading((prev) =>
          prev.filter((u) => u.error !== undefined || u.progress < 100)
        )
      }, 500)

      // Update images
      if (newImages.length > 0) {
        onChange([...images, ...newImages])
        toast({
          title: 'Başarılı',
          description: `${newImages.length} görsel yüklendi`,
        })
      }
    },
    [
      remainingSlots,
      maxImages,
      organizationId,
      productId,
      bucket,
      images,
      onChange,
      toast,
      validateFile,
    ]
  )

  // ==========================================================================
  // DELETE HANDLER
  // ==========================================================================

  const handleDelete = useCallback(
    async (index: number) => {
      const image = images[index]
      if (!image) return

      // Get path from image
      const path = image.path || extractPathFromUrl(image.original, bucket)

      if (!path) {
        // If no path, just remove from UI
        const newImages = images.filter((_, i) => i !== index)
        onChange(newImages)
        return
      }

      setDeletingPaths((prev) => [...prev, path])

      try {
        const result = await deleteImage(bucket, path)

        if (result.success) {
          const newImages = images.filter((_, i) => i !== index)
          onChange(newImages)
          toast({
            title: 'Başarılı',
            description: 'Görsel silindi',
          })
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
          description: 'Görsel silinemedi',
          variant: 'destructive',
        })
      } finally {
        setDeletingPaths((prev) => prev.filter((p) => p !== path))
      }
    },
    [images, bucket, onChange, toast]
  )

  // ==========================================================================
  // RETRY HANDLER
  // ==========================================================================

  const handleRetry = useCallback(
    async (uploadId: string) => {
      const item = uploading.find((u) => u.id === uploadId)
      if (!item) return

      // Remove from uploading
      setUploading((prev) => prev.filter((u) => u.id !== uploadId))

      // Re-upload
      await handleUpload([item.file])
    },
    [uploading, handleUpload]
  )

  // ==========================================================================
  // CANCEL UPLOAD HANDLER
  // ==========================================================================

  const handleCancelUpload = useCallback((uploadId: string) => {
    setUploading((prev) => prev.filter((u) => u.id !== uploadId))
  }, [])

  // ==========================================================================
  // DRAG AND DROP HANDLERS
  // ==========================================================================

  const handleDragEnter = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      if (canUpload) {
        setIsDragging(true)
      }
    },
    [canUpload]
  )

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)

      if (!canUpload) return

      const files = e.dataTransfer.files
      if (files.length > 0) {
        handleUpload(files)
      }
    },
    [canUpload, handleUpload]
  )

  // ==========================================================================
  // FILE INPUT HANDLER
  // ==========================================================================

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files
      if (files && files.length > 0) {
        handleUpload(files)
      }
      // Reset input value to allow selecting the same file again
      e.target.value = ''
    },
    [handleUpload]
  )

  const handleClickUpload = useCallback(() => {
    if (canUpload && fileInputRef.current) {
      fileInputRef.current.click()
    }
  }, [canUpload])

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-foreground">
          {label}
        </label>
        <span className="text-xs text-muted-foreground">
          {images.length}/{maxImages} görsel
        </span>
      </div>

      {/* Image Grid */}
      {(images.length > 0 || uploading.length > 0) && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {/* Existing Images */}
          {images.map((image, index) => {
            const path = image.path || extractPathFromUrl(image.original, bucket)
            const isDeleting = path ? deletingPaths.includes(path) : false

            return (
              <div
                key={`image-${index}`}
                className="group relative aspect-square overflow-hidden rounded-lg border bg-muted"
              >
                {/* Image */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={image.thumbnail || image.original}
                  alt={image.name || `Görsel ${index + 1}`}
                  className="h-full w-full object-cover transition-transform group-hover:scale-105"
                  onClick={() => setPreviewImage(image.original)}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxyZWN0IHg9IjMiIHk9IjMiIHdpZHRoPSIxOCIgaGVpZ2h0PSIxOCIgcng9IjIiIHJ5PSIyIi8+PGNpcmNsZSBjeD0iOC41IiBjeT0iOC41IiByPSIxLjUiLz48cG9seWxpbmUgcG9pbnRzPSIyMSAxNSAxNiAxMCA1IDIxIi8+PC9zdmc+'
                  }}
                />

                {/* Delete Button */}
                <button
                  type="button"
                  onClick={() => handleDelete(index)}
                  disabled={isDeleting || disabled}
                  className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-destructive/90 text-destructive-foreground opacity-0 transition-opacity hover:bg-destructive focus:opacity-100 group-hover:opacity-100 disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label="Görseli sil"
                >
                  {isDeleting ? (
                    <svg
                      className="h-3 w-3 animate-spin"
                      fill="none"
                      viewBox="0 0 24 24"
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
                  ) : (
                    <svg
                      className="h-3 w-3"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  )}
                </button>

                {/* Image Index Badge */}
                <div className="absolute bottom-1 left-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/50 text-xs text-white">
                  {index + 1}
                </div>
              </div>
            )
          })}

          {/* Uploading Items */}
          {uploading.map((item) => (
            <div
              key={item.id}
              className="relative aspect-square overflow-hidden rounded-lg border bg-muted"
            >
              {/* Preview */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={URL.createObjectURL(item.file)}
                alt={item.file.name}
                className={`h-full w-full object-cover ${
                  item.error ? 'opacity-50' : 'opacity-70'
                }`}
              />

              {/* Progress or Error Overlay */}
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/30">
                {item.error ? (
                  // Error State
                  <>
                    <svg
                      className="h-6 w-6 text-destructive"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <p className="mt-1 text-xs text-white">Hata</p>
                    <div className="mt-2 flex gap-1">
                      <button
                        type="button"
                        onClick={() => handleRetry(item.id)}
                        className="rounded bg-white/20 px-2 py-1 text-xs text-white hover:bg-white/30"
                      >
                        Tekrar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCancelUpload(item.id)}
                        className="rounded bg-white/20 px-2 py-1 text-xs text-white hover:bg-white/30"
                      >
                        İptal
                      </button>
                    </div>
                  </>
                ) : (
                  // Uploading State
                  <>
                    <svg
                      className="h-6 w-6 animate-spin text-white"
                      fill="none"
                      viewBox="0 0 24 24"
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
                    <p className="mt-1 text-xs text-white">
                      {item.progress < 100 ? 'Yükleniyor...' : 'Tamamlandı'}
                    </p>
                    <div className="mt-2 h-1 w-16 overflow-hidden rounded-full bg-white/30">
                      <div
                        className="h-full bg-white transition-all"
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Drop Zone */}
      {canUpload && (
        <div
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={handleClickUpload}
          className={`relative flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-4 transition-colors ${
            isDragging
              ? 'border-primary bg-primary/5'
              : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50'
          } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              handleClickUpload()
            }
          }}
          aria-label={`Görsel yükle. ${remainingSlots} alan kaldı.`}
        >
          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept={ALLOWED_TYPES.join(',')}
            multiple
            onChange={handleFileInputChange}
            className="hidden"
            disabled={disabled}
            aria-hidden="true"
          />

          {/* Upload Icon */}
          <svg
            className={`mb-2 h-8 w-8 ${
              isDragging ? 'text-primary' : 'text-muted-foreground'
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>

          {/* Instructions */}
          <p className="text-sm text-muted-foreground">
            {isDragging ? (
              <span className="font-medium text-primary">Bırakarak yükle</span>
            ) : (
              <>
                <span className="font-medium text-foreground">
                  Sürükleyip bırakın
                </span>{' '}
                veya tıklayarak seçin
              </>
            )}
          </p>

          {/* File Info */}
          <p className="mt-1 text-xs text-muted-foreground">
            JPEG, PNG, WebP, GIF - Maks. 5MB
          </p>

          {/* Remaining Slots */}
          {remainingSlots < maxImages && (
            <p className="mt-1 text-xs text-muted-foreground">
              {remainingSlots} görsel daha ekleyebilirsiniz
            </p>
          )}
        </div>
      )}

      {/* Max Images Message */}
      {!canUpload && !disabled && (
        <p className="text-center text-sm text-muted-foreground">
          Maksimum {maxImages} görsel yükleyebilirsiniz. Yeni görsel eklemek için
          mevcut bir görseli silin.
        </p>
      )}

      {/* Preview Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setPreviewImage(null)}
          role="dialog"
          aria-label="Görsel önizleme"
        >
          <button
            type="button"
            onClick={() => setPreviewImage(null)}
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
            aria-label="Kapat"
          >
            <svg
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewImage}
            alt="Görsel önizleme"
            className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  )
}

// =============================================================================
// EXPORTS
// =============================================================================

export type { ProductImage } from '@/lib/storage/shared'
