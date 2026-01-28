/**
 * Shared storage utilities and types.
 *
 * Safe to import in client and server code.
 */

// =============================================================================
// CONSTANTS
// =============================================================================

export const MAX_IMAGES_PER_PRODUCT = 5

export const STORAGE_BUCKETS = {
  PRODUCT_IMAGES: 'product-images',
  ORGANIZATION_ASSETS: 'organization-assets',
} as const

// =============================================================================
// TYPES
// =============================================================================

export type StorageErrorCode =
  | 'invalid_file_type'
  | 'file_too_large'
  | 'max_images_exceeded'
  | 'upload_failed'
  | 'delete_failed'
  | 'not_found'
  | 'permission_denied'
  | 'unknown_error'

export interface StorageActionResponse<T = unknown> {
  success: boolean
  message: string
  data?: T
  error?: string
  errorCode?: StorageErrorCode
}

export interface UploadedImage {
  url: string
  thumbnailUrl?: string
  path: string
  name: string
  size: number
  type: string
}

export interface ProductImage {
  original: string
  thumbnail?: string
  path?: string
  name?: string
}

// =============================================================================
// UTILITIES
// =============================================================================

export function extractPathFromUrl(url: string, bucket: string): string | null {
  try {
    const parsedUrl = new URL(url)
    const pathParts = parsedUrl.pathname.split('/')

    const bucketIndex = pathParts.findIndex((part) => part === bucket)
    if (bucketIndex === -1) return null

    return pathParts.slice(bucketIndex + 1).join('/')
  } catch {
    return null
  }
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}

export function isValidImageUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url)
    return ['http:', 'https:'].includes(parsedUrl.protocol)
  } catch {
    return false
  }
}
