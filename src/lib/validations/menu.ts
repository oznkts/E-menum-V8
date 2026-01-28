/**
 * Menu Validation Schemas
 *
 * This module contains all Zod validation schemas for menu-related
 * forms and API operations. All error messages are in Turkish as per the
 * project requirements.
 *
 * Schemas:
 * - categorySchema: Menu category creation/update validation
 * - productSchema: Menu product/item creation/update validation
 * - productModifierSchema: Product modifier group validation
 * - modifierOptionSchema: Individual modifier option validation
 *
 * @see https://zod.dev
 * @see https://react-hook-form.com/get-started#SchemaValidation
 *
 * @example
 * ```tsx
 * import { categorySchema, type CategoryInput } from '@/lib/validations/menu'
 * import { useForm } from 'react-hook-form'
 * import { zodResolver } from '@hookform/resolvers/zod'
 *
 * function CategoryForm() {
 *   const form = useForm<CategoryInput>({
 *     resolver: zodResolver(categorySchema),
 *     defaultValues: { name: '', description: '' }
 *   })
 *   // ...
 * }
 * ```
 */

import { z } from 'zod'
import type { AllergenType, ProductStatus } from '@/types/database'

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Validation constraints for menu items
 */
export const MENU_CONSTRAINTS = {
  // Category constraints
  categoryNameMin: 2,
  categoryNameMax: 100,
  categoryDescriptionMax: 500,
  categorySlugMin: 2,
  categorySlugMax: 100,

  // Product constraints
  productNameMin: 2,
  productNameMax: 200,
  productDescriptionMax: 2000,
  productShortDescriptionMax: 300,
  productSlugMin: 2,
  productSlugMax: 200,
  productPriceMin: 0,
  productPriceMax: 1000000, // 1 million TRY max
  productStockMin: 0,
  productStockMax: 999999,
  productPrepTimeMin: 0,
  productPrepTimeMax: 480, // 8 hours max
  productSpicyLevelMin: 1,
  productSpicyLevelMax: 5,
  productMaxImages: 10,
  productMaxTags: 20,
  productTagMaxLength: 50,

  // Modifier constraints
  modifierNameMin: 2,
  modifierNameMax: 100,
  modifierDescriptionMax: 300,
  modifierSelectionsMin: 0,
  modifierSelectionsMax: 20,

  // Modifier option constraints
  optionNameMin: 1,
  optionNameMax: 100,
  optionDescriptionMax: 200,
  optionPriceAdjustmentMin: -100000, // Can be negative for discounts
  optionPriceAdjustmentMax: 100000,
} as const

/**
 * Valid allergen types (matches database enum)
 */
export const ALLERGEN_TYPES: readonly AllergenType[] = [
  'gluten',
  'dairy',
  'eggs',
  'nuts',
  'peanuts',
  'soy',
  'fish',
  'shellfish',
  'sesame',
  'mustard',
  'celery',
  'lupin',
  'molluscs',
  'sulphites',
] as const

/**
 * Valid product status values (matches database enum)
 */
export const PRODUCT_STATUSES: readonly ProductStatus[] = [
  'active',
  'out_of_stock',
  'hidden',
  'seasonal',
] as const

/**
 * Turkish allergen labels for UI display
 */
export const ALLERGEN_LABELS: Record<AllergenType, string> = {
  gluten: 'Gluten',
  dairy: 'Süt Ürünleri',
  eggs: 'Yumurta',
  nuts: 'Kabuklu Yemişler',
  peanuts: 'Yer Fıstığı',
  soy: 'Soya',
  fish: 'Balık',
  shellfish: 'Kabuklu Deniz Ürünleri',
  sesame: 'Susam',
  mustard: 'Hardal',
  celery: 'Kereviz',
  lupin: 'Acı Bakla',
  molluscs: 'Yumuşakçalar',
  sulphites: 'Sülfitler',
} as const

/**
 * Turkish product status labels for UI display
 */
export const PRODUCT_STATUS_LABELS: Record<ProductStatus, string> = {
  active: 'Aktif',
  out_of_stock: 'Stok Dışı',
  hidden: 'Gizli',
  seasonal: 'Mevsimlik',
} as const

/**
 * Turkish error messages for menu validation
 * Centralized for consistency and easy maintenance
 */
export const MENU_ERROR_MESSAGES = {
  // Category errors
  categoryNameRequired: 'Kategori adı gereklidir',
  categoryNameTooShort: `Kategori adı en az ${MENU_CONSTRAINTS.categoryNameMin} karakter olmalıdır`,
  categoryNameTooLong: `Kategori adı en fazla ${MENU_CONSTRAINTS.categoryNameMax} karakter olabilir`,
  categoryDescriptionTooLong: `Açıklama en fazla ${MENU_CONSTRAINTS.categoryDescriptionMax} karakter olabilir`,
  categorySlugRequired: 'URL adresi (slug) gereklidir',
  categorySlugTooShort: `URL adresi en az ${MENU_CONSTRAINTS.categorySlugMin} karakter olmalıdır`,
  categorySlugTooLong: `URL adresi en fazla ${MENU_CONSTRAINTS.categorySlugMax} karakter olabilir`,
  categorySlugInvalid: 'URL adresi sadece küçük harf, rakam ve tire içerebilir',
  categorySortOrderInvalid: 'Sıralama numarası geçersiz',
  categoryImageUrlInvalid: 'Geçersiz görsel URL\'i',
  categoryParentIdInvalid: 'Geçersiz üst kategori',
  categoryTimeInvalid: 'Geçersiz zaman formatı',

  // Product errors
  productNameRequired: 'Ürün adı gereklidir',
  productNameTooShort: `Ürün adı en az ${MENU_CONSTRAINTS.productNameMin} karakter olmalıdır`,
  productNameTooLong: `Ürün adı en fazla ${MENU_CONSTRAINTS.productNameMax} karakter olabilir`,
  productDescriptionTooLong: `Açıklama en fazla ${MENU_CONSTRAINTS.productDescriptionMax} karakter olabilir`,
  productShortDescriptionTooLong: `Kısa açıklama en fazla ${MENU_CONSTRAINTS.productShortDescriptionMax} karakter olabilir`,
  productSlugRequired: 'URL adresi (slug) gereklidir',
  productSlugTooShort: `URL adresi en az ${MENU_CONSTRAINTS.productSlugMin} karakter olmalıdır`,
  productSlugTooLong: `URL adresi en fazla ${MENU_CONSTRAINTS.productSlugMax} karakter olabilir`,
  productSlugInvalid: 'URL adresi sadece küçük harf, rakam ve tire içerebilir',
  productPriceRequired: 'Fiyat gereklidir',
  productPriceInvalid: 'Geçersiz fiyat değeri',
  productPriceMin: 'Fiyat 0 veya daha büyük olmalıdır',
  productPriceMax: `Fiyat en fazla ${MENU_CONSTRAINTS.productPriceMax.toLocaleString('tr-TR')} olabilir`,
  productComparePriceInvalid: 'Karşılaştırma fiyatı mevcut fiyattan büyük olmalıdır',
  productCurrencyInvalid: 'Geçersiz para birimi',
  productStatusInvalid: 'Geçersiz ürün durumu',
  productStockInvalid: 'Stok miktarı 0 veya daha büyük olmalıdır',
  productPrepTimeInvalid: `Hazırlık süresi 0-${MENU_CONSTRAINTS.productPrepTimeMax} dakika arasında olmalıdır`,
  productSpicyLevelInvalid: `Acı seviyesi ${MENU_CONSTRAINTS.productSpicyLevelMin}-${MENU_CONSTRAINTS.productSpicyLevelMax} arasında olmalıdır`,
  productAllergensInvalid: 'Geçersiz alerjen türü',
  productTagsTooMany: `En fazla ${MENU_CONSTRAINTS.productMaxTags} etiket eklenebilir`,
  productTagTooLong: `Etiket en fazla ${MENU_CONSTRAINTS.productTagMaxLength} karakter olabilir`,
  productImagesTooMany: `En fazla ${MENU_CONSTRAINTS.productMaxImages} görsel eklenebilir`,
  productImageUrlInvalid: 'Geçersiz görsel URL\'i',
  productCategoryIdInvalid: 'Geçersiz kategori',
  productSortOrderInvalid: 'Sıralama numarası geçersiz',
  productMetaTitleTooLong: 'Meta başlık en fazla 70 karakter olabilir',
  productMetaDescriptionTooLong: 'Meta açıklama en fazla 160 karakter olabilir',
  productFeaturedUntilInvalid: 'Geçersiz öne çıkarma bitiş tarihi',

  // Modifier errors
  modifierNameRequired: 'Seçenek grubu adı gereklidir',
  modifierNameTooShort: `Seçenek grubu adı en az ${MENU_CONSTRAINTS.modifierNameMin} karakter olmalıdır`,
  modifierNameTooLong: `Seçenek grubu adı en fazla ${MENU_CONSTRAINTS.modifierNameMax} karakter olabilir`,
  modifierDescriptionTooLong: `Açıklama en fazla ${MENU_CONSTRAINTS.modifierDescriptionMax} karakter olabilir`,
  modifierMinSelectionsInvalid: 'Minimum seçim sayısı geçersiz',
  modifierMaxSelectionsInvalid: 'Maksimum seçim sayısı geçersiz',
  modifierSelectionsRange: 'Minimum seçim, maksimum seçimden büyük olamaz',
  modifierProductIdInvalid: 'Geçersiz ürün',
  modifierSortOrderInvalid: 'Sıralama numarası geçersiz',

  // Modifier option errors
  optionNameRequired: 'Seçenek adı gereklidir',
  optionNameTooShort: `Seçenek adı en az ${MENU_CONSTRAINTS.optionNameMin} karakter olmalıdır`,
  optionNameTooLong: `Seçenek adı en fazla ${MENU_CONSTRAINTS.optionNameMax} karakter olabilir`,
  optionDescriptionTooLong: `Açıklama en fazla ${MENU_CONSTRAINTS.optionDescriptionMax} karakter olabilir`,
  optionPriceAdjustmentInvalid: 'Geçersiz fiyat farkı',
  optionPriceAdjustmentRange: `Fiyat farkı ${MENU_CONSTRAINTS.optionPriceAdjustmentMin.toLocaleString('tr-TR')} ile ${MENU_CONSTRAINTS.optionPriceAdjustmentMax.toLocaleString('tr-TR')} arasında olmalıdır`,
  optionModifierIdInvalid: 'Geçersiz seçenek grubu',
  optionSortOrderInvalid: 'Sıralama numarası geçersiz',

  // Batch operation errors
  batchItemsRequired: 'En az bir öğe gereklidir',
  batchItemsInvalid: 'Geçersiz öğe listesi',
  batchSortOrdersRequired: 'Sıralama numaraları gereklidir',
  batchSortOrdersInvalid: 'Geçersiz sıralama numarası listesi',

  // Generic
  invalidInput: 'Geçersiz giriş',
  invalidUuid: 'Geçersiz kimlik (UUID)',
} as const

// =============================================================================
// REUSABLE SCHEMAS
// =============================================================================

/**
 * UUID validation schema
 * Validates proper UUID format
 */
export const uuidSchema = z
  .string({
    required_error: MENU_ERROR_MESSAGES.invalidUuid,
    invalid_type_error: MENU_ERROR_MESSAGES.invalidUuid,
  })
  .uuid(MENU_ERROR_MESSAGES.invalidUuid)

/**
 * Slug validation schema
 * Enforces lowercase alphanumeric with hyphens
 */
export const slugSchema = z
  .string()
  .min(MENU_CONSTRAINTS.categorySlugMin, MENU_ERROR_MESSAGES.categorySlugTooShort)
  .max(MENU_CONSTRAINTS.categorySlugMax, MENU_ERROR_MESSAGES.categorySlugTooLong)
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    MENU_ERROR_MESSAGES.categorySlugInvalid
  )

/**
 * Optional URL validation schema
 * Validates URL format when provided
 */
export const optionalUrlSchema = z
  .string()
  .url(MENU_ERROR_MESSAGES.categoryImageUrlInvalid)
  .optional()
  .nullable()
  .or(z.literal(''))
  .transform((val) => val || null)

/**
 * Sort order validation schema
 * Non-negative integer for ordering
 */
export const sortOrderSchema = z
  .number({
    invalid_type_error: MENU_ERROR_MESSAGES.categorySortOrderInvalid,
  })
  .int(MENU_ERROR_MESSAGES.categorySortOrderInvalid)
  .nonnegative(MENU_ERROR_MESSAGES.categorySortOrderInvalid)
  .default(0)

/**
 * Time string validation schema (HH:MM format)
 */
export const timeSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, MENU_ERROR_MESSAGES.categoryTimeInvalid)
  .optional()
  .nullable()
  .or(z.literal(''))
  .transform((val) => val || null)

/**
 * Price validation schema
 * Non-negative number with max limit
 */
export const priceSchema = z
  .number({
    required_error: MENU_ERROR_MESSAGES.productPriceRequired,
    invalid_type_error: MENU_ERROR_MESSAGES.productPriceInvalid,
  })
  .min(MENU_CONSTRAINTS.productPriceMin, MENU_ERROR_MESSAGES.productPriceMin)
  .max(MENU_CONSTRAINTS.productPriceMax, MENU_ERROR_MESSAGES.productPriceMax)

/**
 * Allergen array validation schema
 */
export const allergensSchema = z
  .array(z.enum(ALLERGEN_TYPES as unknown as [string, ...string[]]))
  .optional()
  .nullable()
  .default([])

/**
 * Tags array validation schema
 */
export const tagsSchema = z
  .array(
    z.string().max(MENU_CONSTRAINTS.productTagMaxLength, MENU_ERROR_MESSAGES.productTagTooLong)
  )
  .max(MENU_CONSTRAINTS.productMaxTags, MENU_ERROR_MESSAGES.productTagsTooMany)
  .optional()
  .nullable()
  .default([])

/**
 * Image URLs array validation schema
 */
export const imageUrlsSchema = z
  .array(z.string().url(MENU_ERROR_MESSAGES.productImageUrlInvalid))
  .max(MENU_CONSTRAINTS.productMaxImages, MENU_ERROR_MESSAGES.productImagesTooMany)
  .optional()
  .nullable()
  .default([])

// =============================================================================
// CATEGORY SCHEMAS
// =============================================================================

/**
 * Category creation/update schema
 *
 * Used for creating or updating menu categories.
 * Supports nested categories via parent_id and time-based availability.
 */
export const categorySchema = z.object({
  name: z
    .string({
      required_error: MENU_ERROR_MESSAGES.categoryNameRequired,
      invalid_type_error: MENU_ERROR_MESSAGES.categoryNameRequired,
    })
    .min(MENU_CONSTRAINTS.categoryNameMin, MENU_ERROR_MESSAGES.categoryNameTooShort)
    .max(MENU_CONSTRAINTS.categoryNameMax, MENU_ERROR_MESSAGES.categoryNameTooLong)
    .trim(),

  slug: slugSchema.optional(),

  description: z
    .string()
    .max(MENU_CONSTRAINTS.categoryDescriptionMax, MENU_ERROR_MESSAGES.categoryDescriptionTooLong)
    .optional()
    .nullable()
    .or(z.literal(''))
    .transform((val) => val || null),

  icon: z.string().optional().nullable(),

  image_url: optionalUrlSchema,

  parent_id: uuidSchema.optional().nullable(),

  sort_order: sortOrderSchema,

  is_visible: z.boolean().default(true),

  available_from: timeSchema,

  available_until: timeSchema,
})

/**
 * Category update schema (partial)
 * All fields are optional for PATCH-style updates
 */
export const categoryUpdateSchema = categorySchema.partial()

/**
 * Category sort order batch update schema
 * For drag-and-drop reordering
 */
export const categorySortOrderSchema = z.object({
  items: z
    .array(
      z.object({
        id: uuidSchema,
        sort_order: sortOrderSchema,
      })
    )
    .min(1, MENU_ERROR_MESSAGES.batchItemsRequired),
})

// =============================================================================
// PRODUCT SCHEMAS
// =============================================================================

/**
 * Product status validation schema
 */
export const productStatusSchema = z.enum(PRODUCT_STATUSES as unknown as [string, ...string[]], {
  errorMap: () => ({ message: MENU_ERROR_MESSAGES.productStatusInvalid }),
})

/**
 * Nutritional info validation schema
 * Optional structured data for nutritional information
 */
export const nutritionalInfoSchema = z
  .object({
    calories: z.number().nonnegative().optional(),
    protein: z.number().nonnegative().optional(),
    carbohydrates: z.number().nonnegative().optional(),
    fat: z.number().nonnegative().optional(),
    fiber: z.number().nonnegative().optional(),
    sodium: z.number().nonnegative().optional(),
    sugar: z.number().nonnegative().optional(),
    serving_size: z.string().optional(),
    serving_unit: z.string().optional(),
  })
  .optional()
  .nullable()

/**
 * Product creation/update schema
 *
 * Used for creating or updating menu products/items.
 * Includes pricing, dietary information, availability, and SEO metadata.
 */
const productBaseSchema = z.object({
    name: z
      .string({
        required_error: MENU_ERROR_MESSAGES.productNameRequired,
        invalid_type_error: MENU_ERROR_MESSAGES.productNameRequired,
      })
      .min(MENU_CONSTRAINTS.productNameMin, MENU_ERROR_MESSAGES.productNameTooShort)
      .max(MENU_CONSTRAINTS.productNameMax, MENU_ERROR_MESSAGES.productNameTooLong)
      .trim(),

    slug: z
      .string()
      .min(MENU_CONSTRAINTS.productSlugMin, MENU_ERROR_MESSAGES.productSlugTooShort)
      .max(MENU_CONSTRAINTS.productSlugMax, MENU_ERROR_MESSAGES.productSlugTooLong)
      .regex(
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
        MENU_ERROR_MESSAGES.productSlugInvalid
      )
      .optional(),

    description: z
      .string()
      .max(MENU_CONSTRAINTS.productDescriptionMax, MENU_ERROR_MESSAGES.productDescriptionTooLong)
      .optional()
      .nullable()
      .or(z.literal(''))
      .transform((val) => val || null),

    short_description: z
      .string()
      .max(MENU_CONSTRAINTS.productShortDescriptionMax, MENU_ERROR_MESSAGES.productShortDescriptionTooLong)
      .optional()
      .nullable()
      .or(z.literal(''))
      .transform((val) => val || null),

    image_urls: imageUrlsSchema,

    price: priceSchema,

    compare_at_price: z
      .number()
      .min(MENU_CONSTRAINTS.productPriceMin, MENU_ERROR_MESSAGES.productPriceMin)
      .max(MENU_CONSTRAINTS.productPriceMax, MENU_ERROR_MESSAGES.productPriceMax)
      .optional()
      .nullable(),

    currency: z.string().length(3, MENU_ERROR_MESSAGES.productCurrencyInvalid).default('TRY'),

    status: productStatusSchema.default('active'),

    is_available: z.boolean().default(true),

    stock_quantity: z
      .number()
      .int()
      .min(MENU_CONSTRAINTS.productStockMin, MENU_ERROR_MESSAGES.productStockInvalid)
      .max(MENU_CONSTRAINTS.productStockMax, MENU_ERROR_MESSAGES.productStockInvalid)
      .optional()
      .nullable(),

    sort_order: sortOrderSchema,

    category_id: uuidSchema.optional().nullable(),

    preparation_time_minutes: z
      .number()
      .int()
      .min(MENU_CONSTRAINTS.productPrepTimeMin, MENU_ERROR_MESSAGES.productPrepTimeInvalid)
      .max(MENU_CONSTRAINTS.productPrepTimeMax, MENU_ERROR_MESSAGES.productPrepTimeInvalid)
      .optional()
      .nullable(),

    allergens: allergensSchema,

    is_vegetarian: z.boolean().default(false),

    is_vegan: z.boolean().default(false),

    is_gluten_free: z.boolean().default(false),

    is_spicy: z.boolean().default(false),

    spicy_level: z
      .number()
      .int()
      .min(MENU_CONSTRAINTS.productSpicyLevelMin, MENU_ERROR_MESSAGES.productSpicyLevelInvalid)
      .max(MENU_CONSTRAINTS.productSpicyLevelMax, MENU_ERROR_MESSAGES.productSpicyLevelInvalid)
      .optional()
      .nullable(),

    nutritional_info: nutritionalInfoSchema,

    tags: tagsSchema,

    is_featured: z.boolean().default(false),

    featured_until: z.string().datetime().optional().nullable(),

    attributes: z.record(z.unknown()).optional().nullable(),

    meta_title: z
      .string()
      .max(70, MENU_ERROR_MESSAGES.productMetaTitleTooLong)
      .optional()
      .nullable()
      .or(z.literal(''))
      .transform((val) => val || null),

    meta_description: z
      .string()
      .max(160, MENU_ERROR_MESSAGES.productMetaDescriptionTooLong)
      .optional()
      .nullable()
      .or(z.literal(''))
      .transform((val) => val || null),
})

export const productSchema = productBaseSchema
  .refine(
    (data) => {
      if (data.compare_at_price !== null && data.compare_at_price !== undefined) {
        return data.compare_at_price > data.price
      }
      return true
    },
    {
      message: MENU_ERROR_MESSAGES.productComparePriceInvalid,
      path: ['compare_at_price'],
    }
  )
  .refine(
    (data) => {
      if (data.is_spicy && (data.spicy_level === null || data.spicy_level === undefined)) {
        return false
      }
      return true
    },
    {
      message: MENU_ERROR_MESSAGES.productSpicyLevelInvalid,
      path: ['spicy_level'],
    }
  )

/**
 * Product update schema (partial)
 * All fields are optional for PATCH-style updates
 */
export const productUpdateSchema = productBaseSchema.partial().superRefine((data, ctx) => {
  if (data.compare_at_price !== null && data.compare_at_price !== undefined) {
    if (data.price !== null && data.price !== undefined) {
      if (data.compare_at_price <= data.price) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: MENU_ERROR_MESSAGES.productComparePriceInvalid,
          path: ['compare_at_price'],
        })
      }
    }
  }

  if (data.is_spicy) {
    if (data.spicy_level === null || data.spicy_level === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: MENU_ERROR_MESSAGES.productSpicyLevelInvalid,
        path: ['spicy_level'],
      })
    }
  }
})

/**
 * Product sort order batch update schema
 * For drag-and-drop reordering
 */
export const productSortOrderSchema = z.object({
  items: z
    .array(
      z.object({
        id: uuidSchema,
        sort_order: sortOrderSchema,
      })
    )
    .min(1, MENU_ERROR_MESSAGES.batchItemsRequired),
})

/**
 * Product availability toggle schema
 * Quick update for toggling product availability
 */
export const productAvailabilitySchema = z.object({
  id: uuidSchema,
  is_available: z.boolean(),
})

/**
 * Bulk product availability toggle schema
 */
export const bulkProductAvailabilitySchema = z.object({
  product_ids: z.array(uuidSchema).min(1, MENU_ERROR_MESSAGES.batchItemsRequired),
  is_available: z.boolean(),
})

// =============================================================================
// MODIFIER SCHEMAS
// =============================================================================

/**
 * Product modifier group schema
 *
 * Used for creating modifier groups (e.g., "Size", "Extras", "Toppings").
 * Supports required/optional selections with min/max constraints.
 */
const productModifierBaseSchema = z.object({
    product_id: uuidSchema,

    name: z
      .string({
        required_error: MENU_ERROR_MESSAGES.modifierNameRequired,
        invalid_type_error: MENU_ERROR_MESSAGES.modifierNameRequired,
      })
      .min(MENU_CONSTRAINTS.modifierNameMin, MENU_ERROR_MESSAGES.modifierNameTooShort)
      .max(MENU_CONSTRAINTS.modifierNameMax, MENU_ERROR_MESSAGES.modifierNameTooLong)
      .trim(),

    description: z
      .string()
      .max(MENU_CONSTRAINTS.modifierDescriptionMax, MENU_ERROR_MESSAGES.modifierDescriptionTooLong)
      .optional()
      .nullable()
      .or(z.literal(''))
      .transform((val) => val || null),

    is_required: z.boolean().default(false),

    min_selections: z
      .number()
      .int()
      .min(MENU_CONSTRAINTS.modifierSelectionsMin, MENU_ERROR_MESSAGES.modifierMinSelectionsInvalid)
      .max(MENU_CONSTRAINTS.modifierSelectionsMax, MENU_ERROR_MESSAGES.modifierMinSelectionsInvalid)
      .default(0),

    max_selections: z
      .number()
      .int()
      .min(MENU_CONSTRAINTS.modifierSelectionsMin, MENU_ERROR_MESSAGES.modifierMaxSelectionsInvalid)
      .max(MENU_CONSTRAINTS.modifierSelectionsMax, MENU_ERROR_MESSAGES.modifierMaxSelectionsInvalid)
      .default(1),

    sort_order: sortOrderSchema,

    is_visible: z.boolean().default(true),
})

export const productModifierSchema = productModifierBaseSchema
  .refine(
    (data) => data.min_selections <= data.max_selections,
    {
      message: MENU_ERROR_MESSAGES.modifierSelectionsRange,
      path: ['min_selections'],
    }
  )
  .refine(
    (data) => {
      if (data.is_required && data.min_selections < 1) {
        return false
      }
      return true
    },
    {
      message: 'Zorunlu seçenek gruplarında minimum seçim en az 1 olmalıdır',
      path: ['min_selections'],
    }
  )

/**
 * Product modifier update schema (partial)
 * All fields are optional for PATCH-style updates
 */
export const productModifierUpdateSchema = productModifierBaseSchema
  .omit({ product_id: true })
  .partial()
  .superRefine((data, ctx) => {
    if (
      data.min_selections !== undefined &&
      data.max_selections !== undefined &&
      data.min_selections > data.max_selections
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: MENU_ERROR_MESSAGES.modifierSelectionsRange,
        path: ['min_selections'],
      })
    }

    if (data.is_required && data.min_selections !== undefined) {
      if (data.min_selections < 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Zorunlu seçenek gruplarında minimum seçim en az 1 olmalıdır',
          path: ['min_selections'],
        })
      }
    }
  })

/**
 * Modifier sort order batch update schema
 * For drag-and-drop reordering
 */
export const modifierSortOrderSchema = z.object({
  items: z
    .array(
      z.object({
        id: uuidSchema,
        sort_order: sortOrderSchema,
      })
    )
    .min(1, MENU_ERROR_MESSAGES.batchItemsRequired),
})

// =============================================================================
// MODIFIER OPTION SCHEMAS
// =============================================================================

/**
 * Modifier option schema
 *
 * Used for creating individual options within a modifier group.
 * Supports price adjustments (positive or negative).
 */
export const modifierOptionSchema = z.object({
  modifier_id: uuidSchema,

  name: z
    .string({
      required_error: MENU_ERROR_MESSAGES.optionNameRequired,
      invalid_type_error: MENU_ERROR_MESSAGES.optionNameRequired,
    })
    .min(MENU_CONSTRAINTS.optionNameMin, MENU_ERROR_MESSAGES.optionNameTooShort)
    .max(MENU_CONSTRAINTS.optionNameMax, MENU_ERROR_MESSAGES.optionNameTooLong)
    .trim(),

  description: z
    .string()
    .max(MENU_CONSTRAINTS.optionDescriptionMax, MENU_ERROR_MESSAGES.optionDescriptionTooLong)
    .optional()
    .nullable()
    .or(z.literal(''))
    .transform((val) => val || null),

  price_adjustment: z
    .number({
      invalid_type_error: MENU_ERROR_MESSAGES.optionPriceAdjustmentInvalid,
    })
    .min(MENU_CONSTRAINTS.optionPriceAdjustmentMin, MENU_ERROR_MESSAGES.optionPriceAdjustmentRange)
    .max(MENU_CONSTRAINTS.optionPriceAdjustmentMax, MENU_ERROR_MESSAGES.optionPriceAdjustmentRange)
    .default(0),

  sort_order: sortOrderSchema,

  is_default: z.boolean().default(false),

  is_visible: z.boolean().default(true),

  is_available: z.boolean().default(true),
})

/**
 * Modifier option update schema (partial)
 * All fields are optional for PATCH-style updates
 */
export const modifierOptionUpdateSchema = modifierOptionSchema
  .omit({ modifier_id: true })
  .partial()

/**
 * Modifier option sort order batch update schema
 * For drag-and-drop reordering
 */
export const optionSortOrderSchema = z.object({
  items: z
    .array(
      z.object({
        id: uuidSchema,
        sort_order: sortOrderSchema,
      })
    )
    .min(1, MENU_ERROR_MESSAGES.batchItemsRequired),
})

// =============================================================================
// BULK OPERATION SCHEMAS
// =============================================================================

/**
 * Bulk delete schema
 * For deleting multiple items at once
 */
export const bulkDeleteSchema = z.object({
  ids: z.array(uuidSchema).min(1, MENU_ERROR_MESSAGES.batchItemsRequired),
  soft_delete: z.boolean().default(true),
})

/**
 * Bulk visibility update schema
 * For showing/hiding multiple items at once
 */
export const bulkVisibilitySchema = z.object({
  ids: z.array(uuidSchema).min(1, MENU_ERROR_MESSAGES.batchItemsRequired),
  is_visible: z.boolean(),
})

/**
 * Category move schema
 * For moving a category to a different parent
 */
export const categoryMoveSchema = z.object({
  id: uuidSchema,
  parent_id: uuidSchema.nullable(),
  sort_order: sortOrderSchema.optional(),
})

/**
 * Product move schema
 * For moving a product to a different category
 */
export const productMoveSchema = z.object({
  id: uuidSchema,
  category_id: uuidSchema.nullable(),
  sort_order: sortOrderSchema.optional(),
})

// =============================================================================
// TYPE EXPORTS
// =============================================================================

/**
 * Inferred types from schemas for use with React Hook Form and TypeScript
 */
export type CategoryInput = z.infer<typeof categorySchema>
export type CategoryUpdateInput = z.infer<typeof categoryUpdateSchema>
export type CategorySortOrderInput = z.infer<typeof categorySortOrderSchema>

export type ProductInput = z.infer<typeof productSchema>
export type ProductUpdateInput = z.infer<typeof productUpdateSchema>
export type ProductSortOrderInput = z.infer<typeof productSortOrderSchema>
export type ProductAvailabilityInput = z.infer<typeof productAvailabilitySchema>
export type BulkProductAvailabilityInput = z.infer<typeof bulkProductAvailabilitySchema>

export type ProductModifierInput = z.infer<typeof productModifierSchema>
export type ProductModifierUpdateInput = z.infer<typeof productModifierUpdateSchema>
export type ModifierSortOrderInput = z.infer<typeof modifierSortOrderSchema>

export type ModifierOptionInput = z.infer<typeof modifierOptionSchema>
export type ModifierOptionUpdateInput = z.infer<typeof modifierOptionUpdateSchema>
export type OptionSortOrderInput = z.infer<typeof optionSortOrderSchema>

export type BulkDeleteInput = z.infer<typeof bulkDeleteSchema>
export type BulkVisibilityInput = z.infer<typeof bulkVisibilitySchema>
export type CategoryMoveInput = z.infer<typeof categoryMoveSchema>
export type ProductMoveInput = z.infer<typeof productMoveSchema>

export type NutritionalInfo = z.infer<typeof nutritionalInfoSchema>

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Generate a URL-safe slug from a string
 *
 * Converts a string to lowercase, replaces Turkish characters,
 * removes special characters, and converts spaces to hyphens.
 *
 * @param text - The text to convert to a slug
 * @returns A URL-safe slug string
 *
 * @example
 * ```ts
 * generateSlug('Türk Kahvesi') // 'turk-kahvesi'
 * generateSlug('Izgara Köfte') // 'izgara-kofte'
 * ```
 */
export function generateSlug(text: string): string {
  const turkishChars: Record<string, string> = {
    ç: 'c',
    Ç: 'c',
    ğ: 'g',
    Ğ: 'g',
    ı: 'i',
    İ: 'i',
    ö: 'o',
    Ö: 'o',
    ş: 's',
    Ş: 's',
    ü: 'u',
    Ü: 'u',
  }

  return text
    .toLowerCase()
    .replace(/[çÇğĞıİöÖşŞüÜ]/g, (char) => turkishChars[char] || char)
    .replace(/[^\w\s-]/g, '') // Remove special chars
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
}

/**
 * Validate a single field against its schema
 *
 * Useful for real-time field validation without validating the entire form.
 *
 * @param schema - Zod schema to validate against
 * @param value - Value to validate
 * @returns Validation result with success flag and optional error
 *
 * @example
 * ```tsx
 * const result = validateMenuField(categorySchema.shape.name, 'Kahvaltı')
 * if (!result.success) {
 *   console.log(result.error) // Turkish error message
 * }
 * ```
 */
export function validateMenuField<T>(
  schema: z.ZodSchema<T>,
  value: unknown
): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(value)

  if (result.success) {
    return { success: true, data: result.data }
  }

  const firstError = result.error.errors[0]
  return {
    success: false,
    error: firstError?.message ?? MENU_ERROR_MESSAGES.invalidInput,
  }
}

/**
 * Format Zod errors into a simple error map
 *
 * Converts Zod's error format into a flat object mapping field names to error messages.
 *
 * @param error - Zod error object
 * @returns Object mapping field paths to error messages
 *
 * @example
 * ```tsx
 * const result = productSchema.safeParse({ name: '' })
 * if (!result.success) {
 *   const errors = formatMenuErrors(result.error)
 *   // { name: 'Ürün adı gereklidir' }
 * }
 * ```
 */
export function formatMenuErrors(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {}

  for (const issue of error.errors) {
    const path = issue.path.join('.')
    // Only take the first error for each field
    if (!errors[path]) {
      errors[path] = issue.message
    }
  }

  return errors
}

/**
 * Format price for display in Turkish format
 *
 * @param price - The price number to format
 * @param currency - The currency code (default: 'TRY')
 * @returns Formatted price string
 *
 * @example
 * ```ts
 * formatPrice(49.90) // '₺49,90'
 * formatPrice(1500) // '₺1.500,00'
 * ```
 */
export function formatPrice(price: number, currency: string = 'TRY'): string {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency,
  }).format(price)
}

/**
 * Check if a product has any dietary restrictions set
 *
 * @param product - Product data with dietary flags
 * @returns True if any dietary restriction is set
 */
export function hasDietaryInfo(product: {
  is_vegetarian?: boolean
  is_vegan?: boolean
  is_gluten_free?: boolean
  is_spicy?: boolean
  allergens?: AllergenType[] | null
}): boolean {
  return (
    product.is_vegetarian === true ||
    product.is_vegan === true ||
    product.is_gluten_free === true ||
    product.is_spicy === true ||
    (Array.isArray(product.allergens) && product.allergens.length > 0)
  )
}

/**
 * Get allergen labels in Turkish for a list of allergen types
 *
 * @param allergens - Array of allergen type codes
 * @returns Array of Turkish allergen labels
 *
 * @example
 * ```ts
 * getAllergenLabels(['gluten', 'dairy']) // ['Gluten', 'Süt Ürünleri']
 * ```
 */
export function getAllergenLabels(allergens: AllergenType[]): string[] {
  return allergens.map((allergen) => ALLERGEN_LABELS[allergen])
}

/**
 * Get product status label in Turkish
 *
 * @param status - Product status code
 * @returns Turkish label for the status
 */
export function getProductStatusLabel(status: ProductStatus): string {
  return PRODUCT_STATUS_LABELS[status]
}

/**
 * Calculate total price with modifiers
 *
 * @param basePrice - Base product price
 * @param modifierAdjustments - Array of modifier price adjustments
 * @param quantity - Product quantity (default: 1)
 * @returns Total calculated price
 *
 * @example
 * ```ts
 * calculateTotalPrice(50, [10, 5], 2) // (50 + 10 + 5) * 2 = 130
 * ```
 */
export function calculateTotalPrice(
  basePrice: number,
  modifierAdjustments: number[] = [],
  quantity: number = 1
): number {
  const modifierTotal = modifierAdjustments.reduce((sum, adj) => sum + adj, 0)
  return (basePrice + modifierTotal) * quantity
}
