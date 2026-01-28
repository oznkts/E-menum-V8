/**
 * Menu Validation Schema Tests
 *
 * Comprehensive tests for all menu-related Zod validation schemas.
 * Tests cover categories, products, modifiers, and utility functions.
 */

import { describe, it, expect } from 'vitest'
import {
  categorySchema,
  categoryUpdateSchema,
  categorySortOrderSchema,
  productSchema,
  productUpdateSchema,
  productSortOrderSchema,
  productModifierSchema,
  modifierOptionSchema,
  bulkDeleteSchema,
  bulkVisibilitySchema,
  uuidSchema,
  slugSchema,
  priceSchema,
  generateSlug,
  validateMenuField,
  formatMenuErrors,
  formatPrice,
  hasDietaryInfo,
  getAllergenLabels,
  getProductStatusLabel,
  calculateTotalPrice,
  MENU_ERROR_MESSAGES,
  MENU_CONSTRAINTS,
  ALLERGEN_TYPES,
  PRODUCT_STATUSES,
} from '../menu'

describe('Menu Validation Schemas', () => {
  // =============================================================================
  // UUID SCHEMA TESTS
  // =============================================================================
  describe('uuidSchema', () => {
    it('should accept valid UUIDs', () => {
      const validUuids = [
        '123e4567-e89b-12d3-a456-426614174000',
        'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      ]

      validUuids.forEach((uuid) => {
        const result = uuidSchema.safeParse(uuid)
        expect(result.success).toBe(true)
      })
    })

    it('should reject invalid UUIDs', () => {
      const invalidUuids = ['not-a-uuid', '123', '', 'invalid-uuid-format']

      invalidUuids.forEach((uuid) => {
        const result = uuidSchema.safeParse(uuid)
        expect(result.success).toBe(false)
      })
    })
  })

  // =============================================================================
  // SLUG SCHEMA TESTS
  // =============================================================================
  describe('slugSchema', () => {
    it('should accept valid slugs', () => {
      const validSlugs = [
        'kahvalti',
        'ana-yemekler',
        'sicak-icecekler',
        'menu-item-1',
      ]

      validSlugs.forEach((slug) => {
        const result = slugSchema.safeParse(slug)
        expect(result.success).toBe(true)
      })
    })

    it('should reject slugs with uppercase letters', () => {
      const result = slugSchema.safeParse('Kahvalti')
      expect(result.success).toBe(false)
    })

    it('should reject slugs with spaces', () => {
      const result = slugSchema.safeParse('ana yemekler')
      expect(result.success).toBe(false)
    })

    it('should reject slugs with special characters', () => {
      const result = slugSchema.safeParse('ana_yemekler')
      expect(result.success).toBe(false)
    })

    it('should reject slugs starting or ending with hyphen', () => {
      expect(slugSchema.safeParse('-kahvalti').success).toBe(false)
      expect(slugSchema.safeParse('kahvalti-').success).toBe(false)
    })
  })

  // =============================================================================
  // PRICE SCHEMA TESTS
  // =============================================================================
  describe('priceSchema', () => {
    it('should accept valid prices', () => {
      const validPrices = [0, 10, 49.9, 100, 999.99]

      validPrices.forEach((price) => {
        const result = priceSchema.safeParse(price)
        expect(result.success).toBe(true)
      })
    })

    it('should reject negative prices', () => {
      const result = priceSchema.safeParse(-10)
      expect(result.success).toBe(false)
    })

    it('should reject prices above maximum', () => {
      const result = priceSchema.safeParse(MENU_CONSTRAINTS.productPriceMax + 1)
      expect(result.success).toBe(false)
    })
  })

  // =============================================================================
  // CATEGORY SCHEMA TESTS
  // =============================================================================
  describe('categorySchema', () => {
    it('should accept valid category data', () => {
      const result = categorySchema.safeParse({
        name: 'Kahvaltı',
        description: 'Sabah kahvaltı seçenekleri',
        is_visible: true,
        sort_order: 1,
      })
      expect(result.success).toBe(true)
    })

    it('should accept minimal category data', () => {
      const result = categorySchema.safeParse({
        name: 'Kahvaltı',
      })
      expect(result.success).toBe(true)
    })

    it('should reject category with name too short', () => {
      const result = categorySchema.safeParse({
        name: 'A',
      })
      expect(result.success).toBe(false)
    })

    it('should reject category with name too long', () => {
      const result = categorySchema.safeParse({
        name: 'A'.repeat(MENU_CONSTRAINTS.categoryNameMax + 1),
      })
      expect(result.success).toBe(false)
    })

    it('should accept category with time availability', () => {
      const result = categorySchema.safeParse({
        name: 'Kahvaltı',
        available_from: '07:00',
        available_until: '11:00',
      })
      expect(result.success).toBe(true)
    })

    it('should reject invalid time format', () => {
      const result = categorySchema.safeParse({
        name: 'Kahvaltı',
        available_from: '7:00', // Invalid format
      })
      expect(result.success).toBe(false)
    })

    it('should accept valid parent_id', () => {
      const result = categorySchema.safeParse({
        name: 'Alt Kategori',
        parent_id: '123e4567-e89b-12d3-a456-426614174000',
      })
      expect(result.success).toBe(true)
    })
  })

  // =============================================================================
  // CATEGORY UPDATE SCHEMA TESTS
  // =============================================================================
  describe('categoryUpdateSchema', () => {
    it('should accept partial updates', () => {
      const result = categoryUpdateSchema.safeParse({
        name: 'Yeni İsim',
      })
      expect(result.success).toBe(true)
    })

    it('should accept empty update object', () => {
      const result = categoryUpdateSchema.safeParse({})
      expect(result.success).toBe(true)
    })
  })

  // =============================================================================
  // CATEGORY SORT ORDER SCHEMA TESTS
  // =============================================================================
  describe('categorySortOrderSchema', () => {
    it('should accept valid sort order data', () => {
      const result = categorySortOrderSchema.safeParse({
        items: [
          { id: '123e4567-e89b-12d3-a456-426614174000', sort_order: 0 },
          { id: '223e4567-e89b-12d3-a456-426614174001', sort_order: 1 },
        ],
      })
      expect(result.success).toBe(true)
    })

    it('should reject empty items array', () => {
      const result = categorySortOrderSchema.safeParse({
        items: [],
      })
      expect(result.success).toBe(false)
    })
  })

  // =============================================================================
  // PRODUCT SCHEMA TESTS
  // =============================================================================
  describe('productSchema', () => {
    it('should accept valid product data', () => {
      const result = productSchema.safeParse({
        name: 'Türk Kahvesi',
        price: 25.0,
        description: 'Geleneksel Türk kahvesi',
        status: 'active',
        is_available: true,
      })
      expect(result.success).toBe(true)
    })

    it('should accept product with dietary information', () => {
      const result = productSchema.safeParse({
        name: 'Vegan Salata',
        price: 45.0,
        is_vegetarian: true,
        is_vegan: true,
        is_gluten_free: true,
        allergens: ['nuts', 'sesame'],
      })
      expect(result.success).toBe(true)
    })

    it('should accept product with spicy info', () => {
      const result = productSchema.safeParse({
        name: 'Acılı Köfte',
        price: 55.0,
        is_spicy: true,
        spicy_level: 3,
      })
      expect(result.success).toBe(true)
    })

    it('should reject spicy product without spicy_level', () => {
      const result = productSchema.safeParse({
        name: 'Acılı Köfte',
        price: 55.0,
        is_spicy: true,
        // Missing spicy_level
      })
      expect(result.success).toBe(false)
    })

    it('should reject compare_at_price lower than price', () => {
      const result = productSchema.safeParse({
        name: 'Ürün',
        price: 100.0,
        compare_at_price: 80.0, // Lower than price
      })
      expect(result.success).toBe(false)
    })

    it('should accept compare_at_price higher than price', () => {
      const result = productSchema.safeParse({
        name: 'Ürün',
        price: 80.0,
        compare_at_price: 100.0,
      })
      expect(result.success).toBe(true)
    })

    it('should reject product with name too short', () => {
      const result = productSchema.safeParse({
        name: 'A',
        price: 10,
      })
      expect(result.success).toBe(false)
    })

    it('should reject invalid product status', () => {
      const result = productSchema.safeParse({
        name: 'Ürün',
        price: 10,
        status: 'invalid_status',
      })
      expect(result.success).toBe(false)
    })

    it('should accept all valid product statuses', () => {
      PRODUCT_STATUSES.forEach((status) => {
        const result = productSchema.safeParse({
          name: 'Ürün',
          price: 10,
          status,
        })
        expect(result.success).toBe(true)
      })
    })

    it('should accept all valid allergen types', () => {
      const result = productSchema.safeParse({
        name: 'Ürün',
        price: 10,
        allergens: [...ALLERGEN_TYPES],
      })
      expect(result.success).toBe(true)
    })

    it('should reject invalid allergen type', () => {
      const result = productSchema.safeParse({
        name: 'Ürün',
        price: 10,
        allergens: ['invalid_allergen'],
      })
      expect(result.success).toBe(false)
    })

    it('should accept product with nutritional info', () => {
      const result = productSchema.safeParse({
        name: 'Ürün',
        price: 10,
        nutritional_info: {
          calories: 250,
          protein: 10,
          carbohydrates: 30,
          fat: 12,
          serving_size: '100',
          serving_unit: 'g',
        },
      })
      expect(result.success).toBe(true)
    })

    it('should accept product with tags', () => {
      const result = productSchema.safeParse({
        name: 'Ürün',
        price: 10,
        tags: ['popüler', 'önerilen', 'yeni'],
      })
      expect(result.success).toBe(true)
    })

    it('should reject too many tags', () => {
      const result = productSchema.safeParse({
        name: 'Ürün',
        price: 10,
        tags: Array(MENU_CONSTRAINTS.productMaxTags + 1).fill('tag'),
      })
      expect(result.success).toBe(false)
    })
  })

  // =============================================================================
  // PRODUCT MODIFIER SCHEMA TESTS
  // =============================================================================
  describe('productModifierSchema', () => {
    it('should accept valid modifier data', () => {
      const result = productModifierSchema.safeParse({
        product_id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Boyut',
        is_required: false,
        min_selections: 0,
        max_selections: 1,
      })
      expect(result.success).toBe(true)
    })

    it('should reject when min_selections > max_selections', () => {
      const result = productModifierSchema.safeParse({
        product_id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Boyut',
        min_selections: 3,
        max_selections: 1,
      })
      expect(result.success).toBe(false)
    })

    it('should reject required modifier with min_selections < 1', () => {
      const result = productModifierSchema.safeParse({
        product_id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Boyut',
        is_required: true,
        min_selections: 0,
        max_selections: 1,
      })
      expect(result.success).toBe(false)
    })

    it('should accept required modifier with min_selections >= 1', () => {
      const result = productModifierSchema.safeParse({
        product_id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Boyut',
        is_required: true,
        min_selections: 1,
        max_selections: 3,
      })
      expect(result.success).toBe(true)
    })
  })

  // =============================================================================
  // MODIFIER OPTION SCHEMA TESTS
  // =============================================================================
  describe('modifierOptionSchema', () => {
    it('should accept valid option data', () => {
      const result = modifierOptionSchema.safeParse({
        modifier_id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Büyük',
        price_adjustment: 5.0,
        is_default: false,
      })
      expect(result.success).toBe(true)
    })

    it('should accept negative price adjustment (discount)', () => {
      const result = modifierOptionSchema.safeParse({
        modifier_id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'İndirimli',
        price_adjustment: -10.0,
      })
      expect(result.success).toBe(true)
    })

    it('should reject price adjustment out of range', () => {
      const result = modifierOptionSchema.safeParse({
        modifier_id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Seçenek',
        price_adjustment: MENU_CONSTRAINTS.optionPriceAdjustmentMax + 1,
      })
      expect(result.success).toBe(false)
    })
  })

  // =============================================================================
  // BULK OPERATION SCHEMA TESTS
  // =============================================================================
  describe('bulkDeleteSchema', () => {
    it('should accept valid bulk delete data', () => {
      const result = bulkDeleteSchema.safeParse({
        ids: [
          '123e4567-e89b-12d3-a456-426614174000',
          '223e4567-e89b-12d3-a456-426614174001',
        ],
        soft_delete: true,
      })
      expect(result.success).toBe(true)
    })

    it('should reject empty ids array', () => {
      const result = bulkDeleteSchema.safeParse({
        ids: [],
      })
      expect(result.success).toBe(false)
    })
  })

  describe('bulkVisibilitySchema', () => {
    it('should accept valid bulk visibility data', () => {
      const result = bulkVisibilitySchema.safeParse({
        ids: ['123e4567-e89b-12d3-a456-426614174000'],
        is_visible: false,
      })
      expect(result.success).toBe(true)
    })
  })

  // =============================================================================
  // UTILITY FUNCTION TESTS
  // =============================================================================
  describe('generateSlug', () => {
    it('should convert Turkish characters correctly', () => {
      expect(generateSlug('Türk Kahvesi')).toBe('turk-kahvesi')
      expect(generateSlug('Izgara Köfte')).toBe('izgara-kofte')
      expect(generateSlug('Şiş Kebap')).toBe('sis-kebap')
      expect(generateSlug('Çay')).toBe('cay')
      expect(generateSlug('Güveç')).toBe('guvec')
    })

    it('should convert to lowercase', () => {
      expect(generateSlug('BÜYÜK HARF')).toBe('buyuk-harf')
    })

    it('should replace spaces with hyphens', () => {
      expect(generateSlug('Ana Yemekler')).toBe('ana-yemekler')
    })

    it('should remove special characters', () => {
      expect(generateSlug('Menü & Fiyatlar!')).toBe('menu-fiyatlar')
    })

    it('should handle multiple hyphens', () => {
      expect(generateSlug('Ana   Yemekler')).toBe('ana-yemekler')
    })
  })

  describe('formatPrice', () => {
    it('should format Turkish Lira correctly', () => {
      const formatted = formatPrice(49.9)
      expect(formatted).toContain('49')
      expect(formatted).toContain('₺')
    })

    it('should use thousand separators', () => {
      const formatted = formatPrice(1500)
      expect(formatted).toContain('1.500')
    })
  })

  describe('hasDietaryInfo', () => {
    it('should return true when product is vegetarian', () => {
      expect(hasDietaryInfo({ is_vegetarian: true })).toBe(true)
    })

    it('should return true when product has allergens', () => {
      expect(hasDietaryInfo({ allergens: ['gluten'] })).toBe(true)
    })

    it('should return false when no dietary info', () => {
      expect(hasDietaryInfo({})).toBe(false)
    })
  })

  describe('getAllergenLabels', () => {
    it('should return Turkish labels for allergens', () => {
      const labels = getAllergenLabels(['gluten', 'dairy', 'eggs'])
      expect(labels).toContain('Gluten')
      expect(labels).toContain('Süt Ürünleri')
      expect(labels).toContain('Yumurta')
    })
  })

  describe('getProductStatusLabel', () => {
    it('should return Turkish labels for statuses', () => {
      expect(getProductStatusLabel('active')).toBe('Aktif')
      expect(getProductStatusLabel('out_of_stock')).toBe('Stok Dışı')
      expect(getProductStatusLabel('hidden')).toBe('Gizli')
      expect(getProductStatusLabel('seasonal')).toBe('Mevsimlik')
    })
  })

  describe('calculateTotalPrice', () => {
    it('should calculate total with modifiers', () => {
      expect(calculateTotalPrice(50, [10, 5], 1)).toBe(65)
    })

    it('should multiply by quantity', () => {
      expect(calculateTotalPrice(50, [10], 2)).toBe(120)
    })

    it('should handle empty modifiers', () => {
      expect(calculateTotalPrice(50, [], 1)).toBe(50)
    })

    it('should handle negative modifiers (discounts)', () => {
      expect(calculateTotalPrice(50, [-10], 1)).toBe(40)
    })
  })

  describe('validateMenuField', () => {
    it('should return success for valid input', () => {
      const result = validateMenuField(priceSchema, 49.9)
      expect(result.success).toBe(true)
    })

    it('should return error for invalid input', () => {
      const result = validateMenuField(priceSchema, -10)
      expect(result.success).toBe(false)
    })
  })

  describe('formatMenuErrors', () => {
    it('should format Zod errors into a map', () => {
      const result = productSchema.safeParse({ name: 'A', price: -10 })
      expect(result.success).toBe(false)
      if (!result.success) {
        const errors = formatMenuErrors(result.error)
        expect(typeof errors).toBe('object')
      }
    })
  })
})
