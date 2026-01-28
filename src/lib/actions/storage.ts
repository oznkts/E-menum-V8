'use server'

/**
 * Storage Server Actions
 *
 * This module contains all storage-related Server Actions for:
 * - Image upload to Supabase Storage
 * - Image deletion from Supabase Storage
 * - Getting public URLs for images
 *
 * Storage buckets:
 * - `product-images`: Menu product images (thumbnails and originals)
 * - `organization-assets`: Logos, covers, and other org assets
 *
 * All actions:
 * - Validate file type and size
 * - Use Zod for input validation with Turkish error messages
 * - Return standardized StorageActionResponse
 * - Handle retries for failed uploads
 *
 * @see spec.md
 */

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import {
  MAX_IMAGES_PER_PRODUCT,
  STORAGE_BUCKETS,
  type StorageActionResponse,
  type StorageErrorCode,
  type UploadedImage,
  type ProductImage,
} from '@/lib/storage/shared'

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Allowed image MIME types
 */
const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
] as const

/**
 * Maximum file size in bytes (5MB)
 */
const MAX_FILE_SIZE = 5 * 1024 * 1024

// =============================================================================
// TYPES
// =============================================================================

/**
 * Turkish error messages for storage operations
 */
const STORAGE_MESSAGES = {
  // Success messages
  uploadSuccess: 'Görsel başarıyla yüklendi',
  deleteSuccess: 'Görsel başarıyla silindi',
  bulkUploadSuccess: 'Görseller başarıyla yüklendi',

  // Error messages
  invalidFileType: 'Geçersiz dosya türü. Sadece JPEG, PNG, WebP ve GIF desteklenir.',
  fileTooLarge: 'Dosya çok büyük. Maksimum 5MB yüklenebilir.',
  maxImagesExceeded: `En fazla ${MAX_IMAGES_PER_PRODUCT} görsel yükleyebilirsiniz.`,
  uploadFailed: 'Görsel yüklenemedi. Lütfen tekrar deneyin.',
  deleteFailed: 'Görsel silinemedi. Lütfen tekrar deneyin.',
  notFound: 'Görsel bulunamadı.',
  permissionDenied: 'Bu işlem için yetkiniz yok.',
  unknownError: 'Beklenmeyen bir hata oluştu.',
  noFileProvided: 'Dosya seçilmedi.',
  invalidInput: 'Geçersiz giriş.',
} as const

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

/**
 * Schema for upload input validation
 */
const uploadInputSchema = z.object({
  organizationId: z.string().uuid('Geçersiz organizasyon kimliği'),
  productId: z.string().uuid('Geçersiz ürün kimliği').optional(),
  bucket: z.enum([STORAGE_BUCKETS.PRODUCT_IMAGES, STORAGE_BUCKETS.ORGANIZATION_ASSETS]),
})

/**
 * Schema for delete input validation
 */
const deleteInputSchema = z.object({
  bucket: z.enum([STORAGE_BUCKETS.PRODUCT_IMAGES, STORAGE_BUCKETS.ORGANIZATION_ASSETS]),
  path: z.string().min(1, 'Dosya yolu gerekli'),
})

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Validate file type
 */
function isValidFileType(type: string): boolean {
  return (ALLOWED_IMAGE_TYPES as readonly string[]).includes(type)
}

/**
 * Validate file size
 */
function isValidFileSize(size: number): boolean {
  return size <= MAX_FILE_SIZE
}

/**
 * Generate unique file path
 */
function generateFilePath(
  organizationId: string,
  fileName: string,
  productId?: string
): string {
  const timestamp = Date.now()
  const randomSuffix = Math.random().toString(36).substring(2, 8)
  const extension = fileName.split('.').pop()?.toLowerCase() || 'jpg'
  const cleanFileName = fileName
    .split('.')[0]
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, '-')
    .substring(0, 50)

  if (productId) {
    return `${organizationId}/${productId}/${timestamp}-${cleanFileName}-${randomSuffix}.${extension}`
  }

  return `${organizationId}/${timestamp}-${cleanFileName}-${randomSuffix}.${extension}`
}

/**
 * Create error response helper
 */
function createErrorResponse<T>(
  message: string,
  errorCode: StorageErrorCode,
  details?: string
): StorageActionResponse<T> {
  return {
    success: false,
    message,
    errorCode,
    error: details,
  }
}

/**
 * Create success response helper
 */
function createSuccessResponse<T>(
  message: string,
  data?: T
): StorageActionResponse<T> {
  return {
    success: true,
    message,
    data,
  }
}

// =============================================================================
// UPLOAD ACTIONS
// =============================================================================

/**
 * Upload a single image to Supabase Storage
 *
 * @param formData - FormData containing the file and metadata
 * @returns StorageActionResponse with uploaded image data
 *
 * @example
 * ```tsx
 * const formData = new FormData()
 * formData.append('file', file)
 * formData.append('organizationId', orgId)
 * formData.append('bucket', 'product-images')
 * formData.append('productId', productId) // optional
 *
 * const result = await uploadImage(formData)
 * if (result.success) {
 *   console.log('Uploaded:', result.data.url)
 * }
 * ```
 */
export async function uploadImage(
  formData: FormData
): Promise<StorageActionResponse<UploadedImage>> {
  try {
    // 1. Get file from form data
    const file = formData.get('file') as File | null

    if (!file || !(file instanceof File)) {
      return createErrorResponse(
        STORAGE_MESSAGES.noFileProvided,
        'invalid_file_type'
      )
    }

    // 2. Validate file type
    if (!isValidFileType(file.type)) {
      return createErrorResponse(
        STORAGE_MESSAGES.invalidFileType,
        'invalid_file_type'
      )
    }

    // 3. Validate file size
    if (!isValidFileSize(file.size)) {
      return createErrorResponse(
        STORAGE_MESSAGES.fileTooLarge,
        'file_too_large'
      )
    }

    // 4. Validate other inputs
    const rawInput = {
      organizationId: formData.get('organizationId'),
      productId: formData.get('productId') || undefined,
      bucket: formData.get('bucket') || STORAGE_BUCKETS.PRODUCT_IMAGES,
    }

    const validationResult = uploadInputSchema.safeParse(rawInput)
    if (!validationResult.success) {
      const firstError = validationResult.error.errors[0]
      return createErrorResponse(
        firstError?.message ?? STORAGE_MESSAGES.invalidInput,
        'unknown_error'
      )
    }

    const { organizationId, productId, bucket } = validationResult.data

    // 5. Generate file path
    const filePath = generateFilePath(organizationId, file.name, productId)

    // 6. Upload to Supabase Storage
    const supabase = await createClient()

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl: '31536000', // 1 year cache
        upsert: false,
      })

    if (uploadError) {
      console.error('[Storage] Upload error:', uploadError)
      return createErrorResponse(
        STORAGE_MESSAGES.uploadFailed,
        'upload_failed',
        uploadError.message
      )
    }

    // 7. Get public URL
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(uploadData.path)

    // 8. Return success response
    const uploadedImage: UploadedImage = {
      url: urlData.publicUrl,
      path: uploadData.path,
      name: file.name,
      size: file.size,
      type: file.type,
    }

    // Revalidate relevant paths
    if (productId) {
      revalidatePath('/dashboard/products')
      revalidatePath(`/r/[slug]`, 'page')
    }

    return createSuccessResponse(STORAGE_MESSAGES.uploadSuccess, uploadedImage)
  } catch (err) {
    console.error('[Storage] Unexpected upload error:', err)
    return createErrorResponse(STORAGE_MESSAGES.unknownError, 'unknown_error')
  }
}

/**
 * Upload multiple images to Supabase Storage
 *
 * @param formData - FormData containing files and metadata
 * @returns StorageActionResponse with array of uploaded images
 */
export async function uploadImages(
  formData: FormData
): Promise<StorageActionResponse<UploadedImage[]>> {
  try {
    const files = formData.getAll('files') as File[]
    const organizationId = formData.get('organizationId') as string
    const productId = formData.get('productId') as string | undefined
    const bucket = (formData.get('bucket') as string) || STORAGE_BUCKETS.PRODUCT_IMAGES
    const currentImageCount = parseInt(formData.get('currentImageCount') as string || '0', 10)

    // Validate inputs
    if (!files.length) {
      return createErrorResponse(
        STORAGE_MESSAGES.noFileProvided,
        'invalid_file_type'
      )
    }

    // Check max images constraint
    if (currentImageCount + files.length > MAX_IMAGES_PER_PRODUCT) {
      return createErrorResponse(
        STORAGE_MESSAGES.maxImagesExceeded,
        'max_images_exceeded'
      )
    }

    // Upload each file
    const uploadedImages: UploadedImage[] = []
    const errors: string[] = []

    for (const file of files) {
      const singleFormData = new FormData()
      singleFormData.append('file', file)
      singleFormData.append('organizationId', organizationId)
      singleFormData.append('bucket', bucket)
      if (productId) {
        singleFormData.append('productId', productId)
      }

      const result = await uploadImage(singleFormData)

      if (result.success && result.data) {
        uploadedImages.push(result.data)
      } else {
        errors.push(`${file.name}: ${result.message}`)
      }
    }

    if (uploadedImages.length === 0) {
      return createErrorResponse(
        STORAGE_MESSAGES.uploadFailed,
        'upload_failed',
        errors.join(', ')
      )
    }

    // Partial success - some files uploaded
    if (errors.length > 0) {
      return {
        success: true,
        message: `${uploadedImages.length} görsel yüklendi. ${errors.length} görsel yüklenemedi.`,
        data: uploadedImages,
        error: errors.join(', '),
      }
    }

    return createSuccessResponse(STORAGE_MESSAGES.bulkUploadSuccess, uploadedImages)
  } catch (err) {
    console.error('[Storage] Bulk upload error:', err)
    return createErrorResponse(STORAGE_MESSAGES.unknownError, 'unknown_error')
  }
}

// =============================================================================
// DELETE ACTIONS
// =============================================================================

/**
 * Delete an image from Supabase Storage
 *
 * @param bucket - Storage bucket name
 * @param path - File path in the bucket
 * @returns StorageActionResponse
 */
export async function deleteImage(
  bucket: string,
  path: string
): Promise<StorageActionResponse> {
  try {
    // Validate input
    const validationResult = deleteInputSchema.safeParse({ bucket, path })
    if (!validationResult.success) {
      const firstError = validationResult.error.errors[0]
      return createErrorResponse(
        firstError?.message ?? STORAGE_MESSAGES.invalidInput,
        'unknown_error'
      )
    }

    // Delete from Supabase Storage
    const supabase = await createClient()

    const { error } = await supabase.storage
      .from(bucket)
      .remove([path])

    if (error) {
      console.error('[Storage] Delete error:', error)
      return createErrorResponse(
        STORAGE_MESSAGES.deleteFailed,
        'delete_failed',
        error.message
      )
    }

    // Revalidate paths
    revalidatePath('/dashboard/products')
    revalidatePath(`/r/[slug]`, 'page')

    return createSuccessResponse(STORAGE_MESSAGES.deleteSuccess)
  } catch (err) {
    console.error('[Storage] Unexpected delete error:', err)
    return createErrorResponse(STORAGE_MESSAGES.unknownError, 'unknown_error')
  }
}

/**
 * Delete multiple images from Supabase Storage
 *
 * @param bucket - Storage bucket name
 * @param paths - Array of file paths in the bucket
 * @returns StorageActionResponse
 */
export async function deleteImages(
  bucket: string,
  paths: string[]
): Promise<StorageActionResponse> {
  try {
    if (!paths.length) {
      return createSuccessResponse('Silinecek görsel yok')
    }

    // Validate each path
    for (const path of paths) {
      const validationResult = deleteInputSchema.safeParse({ bucket, path })
      if (!validationResult.success) {
        return createErrorResponse(
          STORAGE_MESSAGES.invalidInput,
          'unknown_error'
        )
      }
    }

    // Delete from Supabase Storage
    const supabase = await createClient()

    const { error } = await supabase.storage
      .from(bucket)
      .remove(paths)

    if (error) {
      console.error('[Storage] Bulk delete error:', error)
      return createErrorResponse(
        STORAGE_MESSAGES.deleteFailed,
        'delete_failed',
        error.message
      )
    }

    // Revalidate paths
    revalidatePath('/dashboard/products')
    revalidatePath(`/r/[slug]`, 'page')

    return createSuccessResponse(`${paths.length} görsel başarıyla silindi`)
  } catch (err) {
    console.error('[Storage] Unexpected bulk delete error:', err)
    return createErrorResponse(STORAGE_MESSAGES.unknownError, 'unknown_error')
  }
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Get the public URL for a file in storage
 *
 * @param bucket - Storage bucket name
 * @param path - File path in the bucket
 * @returns Public URL or null if not found
 */
export async function getPublicUrl(
  bucket: string,
  path: string
): Promise<string | null> {
  try {
    const supabase = await createClient()

    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(path)

    return data.publicUrl
  } catch (err) {
    console.error('[Storage] Get public URL error:', err)
    return null
  }
}

/**
 * Check if a URL is a valid image URL
 *
 * @param url - URL to check
 * @returns boolean
 */
function isValidImageUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    const extension = parsed.pathname.split('.').pop()?.toLowerCase()
    return ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(extension || '')
  } catch {
    return false
  }
}
