import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

/**
 * Selected modifier option for a cart item
 * Matches the structure expected in order_items.selected_modifiers JSONB
 */
export interface SelectedModifierOption {
  option_id: string
  option_name: string
  price_adjustment: number
}

/**
 * Selected modifier group with its options
 * Used to validate modifier requirements (min/max selections)
 */
export interface SelectedModifier {
  modifier_id: string
  modifier_name: string
  is_required: boolean
  min_selections: number
  max_selections: number
  selected_options: SelectedModifierOption[]
}

/**
 * Cart item representing a product with quantity and customizations
 *
 * IMPORTANT: price_at_add captures the price when item was added to cart.
 * This ensures price changes during browsing don't affect cart totals.
 * price_ledger_id tracks the exact price entry for audit compliance.
 */
export interface CartItem {
  id: string // Unique cart item ID (product_id + modifiers hash)
  product_id: string
  product_name: string
  product_description: string | null
  image_url: string | null
  price_at_add: number // Locked price at time of addition (base price)
  price_ledger_id: string | null // Reference to price_ledger entry for audit
  currency: string
  quantity: number
  modifiers: SelectedModifier[]
  special_instructions: string | null
  added_at: string // ISO timestamp when added to cart
}

/**
 * Cart context for identifying the restaurant and table
 */
export interface CartContext {
  organization_id: string
  organization_slug: string
  organization_name: string
  table_id: string | null
  table_name: string | null
  currency: string
}

/**
 * Input for adding an item to cart
 */
export interface AddItemInput {
  product_id: string
  product_name: string
  product_description?: string | null
  image_url?: string | null
  price: number
  price_ledger_id?: string | null
  currency?: string
  quantity?: number
  modifiers?: SelectedModifier[]
  special_instructions?: string | null
}

/**
 * Cart validation result for checking modifier requirements
 */
export interface CartValidation {
  isValid: boolean
  errors: CartValidationError[]
}

export interface CartValidationError {
  itemId: string
  productName: string
  modifierName: string
  message: string
}

/**
 * Prepared cart data for order submission
 */
export interface PreparedCartData {
  organization_id: string
  table_id: string | null
  table_name: string | null
  customer_name: string
  customer_phone: string
  customer_notes: string
  order_type: 'dine_in' | 'takeaway'
  subtotal: number
  total_amount: number
  currency: string
  items: PreparedCartItem[]
}

export interface PreparedCartItem {
  product_id: string
  product_name: string
  product_description: string | null
  product_image_url: string | null
  quantity: number
  unit_price: number
  modifier_total: number
  item_total: number
  currency: string
  price_ledger_id: string | null
  selected_modifiers: SelectedModifier[]
  special_instructions: string | null
}

/**
 * Cart Store State Interface
 */
interface CartState {
  // Cart items
  items: CartItem[]

  // Cart context (organization and table)
  context: CartContext | null

  // Customer info for the order
  customerName: string
  customerPhone: string
  customerNotes: string

  // UI state
  isCartOpen: boolean

  // Context management
  setContext: (context: CartContext) => void
  clearContext: () => void
  updateTableContext: (tableId: string | null, tableName: string | null) => void

  // Item management
  addItem: (input: AddItemInput) => void
  removeItem: (itemId: string) => void
  incrementQuantity: (itemId: string) => void
  decrementQuantity: (itemId: string) => void
  updateItemQuantity: (itemId: string, quantity: number) => void
  updateItemModifiers: (itemId: string, modifiers: SelectedModifier[]) => void
  updateItemSpecialInstructions: (itemId: string, instructions: string | null) => void

  // Customer info
  setCustomerName: (name: string) => void
  setCustomerPhone: (phone: string) => void
  setCustomerNotes: (notes: string) => void

  // UI state
  setCartOpen: (isOpen: boolean) => void
  toggleCart: () => void

  // Cart operations
  clearCart: () => void
  resetForNewOrder: () => void

  // Validation
  validateCart: () => CartValidation
  hasRequiredModifiersSelected: (item: CartItem) => boolean

  // Computed values (as functions for performance)
  getItemCount: () => number
  getUniqueItemCount: () => number
  getSubtotal: () => number
  getModifiersTotal: () => number
  getItemModifiersTotal: (item: CartItem) => number
  getItemTotal: (item: CartItem) => number
  getTotal: () => number
  isEmpty: () => boolean

  // Prepare data for order submission
  prepareForSubmission: () => PreparedCartData | null
}

/**
 * Generate unique cart item ID based on product ID and modifier selections
 * This allows the same product with different modifiers to be separate items
 */
function generateCartItemId(productId: string, modifiers: SelectedModifier[]): string {
  if (!modifiers || modifiers.length === 0) {
    return productId
  }

  // Create a deterministic hash of modifier selections
  const modifierHash = modifiers
    .flatMap((m) =>
      m.selected_options.map((o) => o.option_id)
    )
    .sort()
    .join('-')

  return modifierHash ? `${productId}_${modifierHash}` : productId
}

/**
 * Calculate total price adjustment from modifiers for one unit
 */
function calculateModifierTotal(modifiers: SelectedModifier[]): number {
  if (!modifiers || modifiers.length === 0) return 0

  return modifiers.reduce((total, modifier) => {
    const optionsTotal = modifier.selected_options.reduce(
      (sum, option) => sum + option.price_adjustment,
      0
    )
    return total + optionsTotal
  }, 0)
}

/**
 * Cart Store
 *
 * Manages customer shopping cart state for the ordering system.
 *
 * Key Features:
 * - Price locking: Prices are captured at time of addition to cart
 * - Price ledger tracking: Links to price_ledger entries for regulatory compliance
 * - Modifier support: Items can have customization options with additional prices
 * - Modifier validation: Validates required modifiers and min/max selections
 * - Table context: Cart is associated with a specific restaurant and table
 * - Persistence: Cart persists in localStorage across page reloads
 *
 * @example
 * ```tsx
 * import { useCartStore } from '@/lib/stores/cart-store'
 *
 * function ProductCard({ product, currentPrice, priceLedgerId }) {
 *   const addItem = useCartStore((state) => state.addItem)
 *
 *   const handleAddToCart = () => {
 *     addItem({
 *       product_id: product.id,
 *       product_name: product.name,
 *       image_url: product.image_url,
 *       price: currentPrice, // Lock the price
 *       price_ledger_id: priceLedgerId, // Track for audit
 *       quantity: 1,
 *       modifiers: [],
 *       special_instructions: null,
 *     })
 *   }
 *
 *   return <button onClick={handleAddToCart}>Sepete Ekle</button>
 * }
 * ```
 */
export const useCartStore = create<CartState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        items: [],
        context: null,
        customerName: '',
        customerPhone: '',
        customerNotes: '',
        isCartOpen: false,

        // Context management
        setContext: (context) =>
          set({ context }, false, 'setContext'),

        clearContext: () =>
          set({ context: null, items: [] }, false, 'clearContext'),

        updateTableContext: (tableId, tableName) =>
          set(
            (state) => ({
              context: state.context
                ? { ...state.context, table_id: tableId, table_name: tableName }
                : null,
            }),
            false,
            'updateTableContext'
          ),

        // Item management
        addItem: (input) =>
          set(
            (state) => {
              const modifiers = input.modifiers ?? []
              const itemId = generateCartItemId(input.product_id, modifiers)
              const existingIndex = state.items.findIndex((i) => i.id === itemId)

              const newItem: CartItem = {
                id: itemId,
                product_id: input.product_id,
                product_name: input.product_name,
                product_description: input.product_description ?? null,
                image_url: input.image_url ?? null,
                price_at_add: input.price,
                price_ledger_id: input.price_ledger_id ?? null,
                currency: input.currency ?? state.context?.currency ?? 'TRY',
                quantity: input.quantity ?? 1,
                modifiers,
                special_instructions: input.special_instructions ?? null,
                added_at: new Date().toISOString(),
              }

              if (existingIndex >= 0) {
                // Item with same product + modifiers exists, increase quantity
                const updatedItems = [...state.items]
                updatedItems[existingIndex] = {
                  ...updatedItems[existingIndex],
                  quantity:
                    updatedItems[existingIndex].quantity + (input.quantity ?? 1),
                }
                return { items: updatedItems }
              }

              // Add new item
              return { items: [...state.items, newItem] }
            },
            false,
            'addItem'
          ),

        removeItem: (itemId) =>
          set(
            (state) => ({
              items: state.items.filter((item) => item.id !== itemId),
            }),
            false,
            'removeItem'
          ),

        incrementQuantity: (itemId) =>
          set(
            (state) => ({
              items: state.items.map((item) =>
                item.id === itemId
                  ? { ...item, quantity: item.quantity + 1 }
                  : item
              ),
            }),
            false,
            'incrementQuantity'
          ),

        decrementQuantity: (itemId) =>
          set(
            (state) => {
              const item = state.items.find((i) => i.id === itemId)
              if (!item) return state

              if (item.quantity <= 1) {
                // Remove item if quantity would be 0
                return {
                  items: state.items.filter((i) => i.id !== itemId),
                }
              }

              return {
                items: state.items.map((i) =>
                  i.id === itemId ? { ...i, quantity: i.quantity - 1 } : i
                ),
              }
            },
            false,
            'decrementQuantity'
          ),

        updateItemQuantity: (itemId, quantity) =>
          set(
            (state) => {
              if (quantity <= 0) {
                // Remove item if quantity is 0 or less
                return {
                  items: state.items.filter((item) => item.id !== itemId),
                }
              }
              return {
                items: state.items.map((item) =>
                  item.id === itemId ? { ...item, quantity } : item
                ),
              }
            },
            false,
            'updateItemQuantity'
          ),

        updateItemModifiers: (itemId, modifiers) =>
          set(
            (state) => {
              const item = state.items.find((i) => i.id === itemId)
              if (!item) return state

              // Generate new ID based on new modifiers
              const newId = generateCartItemId(item.product_id, modifiers)

              // Check if item with new ID already exists
              const existingWithNewId = state.items.find(
                (i) => i.id === newId && i.id !== itemId
              )

              if (existingWithNewId) {
                // Merge quantities and remove old item
                return {
                  items: state.items
                    .filter((i) => i.id !== itemId)
                    .map((i) =>
                      i.id === newId
                        ? { ...i, quantity: i.quantity + item.quantity }
                        : i
                    ),
                }
              }

              // Update item with new modifiers and ID
              return {
                items: state.items.map((i) =>
                  i.id === itemId ? { ...i, id: newId, modifiers } : i
                ),
              }
            },
            false,
            'updateItemModifiers'
          ),

        updateItemSpecialInstructions: (itemId, instructions) =>
          set(
            (state) => ({
              items: state.items.map((item) =>
                item.id === itemId
                  ? { ...item, special_instructions: instructions }
                  : item
              ),
            }),
            false,
            'updateItemSpecialInstructions'
          ),

        // Customer info
        setCustomerName: (name) =>
          set({ customerName: name }, false, 'setCustomerName'),

        setCustomerPhone: (phone) =>
          set({ customerPhone: phone }, false, 'setCustomerPhone'),

        setCustomerNotes: (notes) =>
          set({ customerNotes: notes }, false, 'setCustomerNotes'),

        // UI state
        setCartOpen: (isOpen) =>
          set({ isCartOpen: isOpen }, false, 'setCartOpen'),

        toggleCart: () =>
          set((state) => ({ isCartOpen: !state.isCartOpen }), false, 'toggleCart'),

        // Cart operations
        clearCart: () =>
          set(
            {
              items: [],
              customerName: '',
              customerPhone: '',
              customerNotes: '',
            },
            false,
            'clearCart'
          ),

        resetForNewOrder: () =>
          set(
            (state) => ({
              items: [],
              customerName: '',
              customerPhone: '',
              customerNotes: '',
              // Keep context (table) for next order
              context: state.context,
            }),
            false,
            'resetForNewOrder'
          ),

        // Validation
        validateCart: () => {
          const state = get()
          const errors: CartValidationError[] = []

          state.items.forEach((item) => {
            item.modifiers.forEach((modifier) => {
              const selectedCount = modifier.selected_options.length

              // Check required modifier has selections
              if (modifier.is_required && selectedCount === 0) {
                errors.push({
                  itemId: item.id,
                  productName: item.product_name,
                  modifierName: modifier.modifier_name,
                  message: `${modifier.modifier_name} seçimi zorunludur`,
                })
              }

              // Check minimum selections
              if (selectedCount < modifier.min_selections) {
                errors.push({
                  itemId: item.id,
                  productName: item.product_name,
                  modifierName: modifier.modifier_name,
                  message: `${modifier.modifier_name} için en az ${modifier.min_selections} seçim yapmalısınız`,
                })
              }

              // Check maximum selections
              if (modifier.max_selections > 0 && selectedCount > modifier.max_selections) {
                errors.push({
                  itemId: item.id,
                  productName: item.product_name,
                  modifierName: modifier.modifier_name,
                  message: `${modifier.modifier_name} için en fazla ${modifier.max_selections} seçim yapabilirsiniz`,
                })
              }
            })
          })

          return {
            isValid: errors.length === 0,
            errors,
          }
        },

        hasRequiredModifiersSelected: (item) => {
          return item.modifiers.every((modifier) => {
            if (!modifier.is_required) return true
            return modifier.selected_options.length >= modifier.min_selections
          })
        },

        // Computed values as functions
        getItemCount: () => {
          const state = get()
          return state.items.reduce((sum, item) => sum + item.quantity, 0)
        },

        getUniqueItemCount: () => {
          const state = get()
          return state.items.length
        },

        getSubtotal: () => {
          const state = get()
          return state.items.reduce(
            (sum, item) => sum + item.price_at_add * item.quantity,
            0
          )
        },

        getModifiersTotal: () => {
          const state = get()
          return state.items.reduce((sum, item) => {
            const modifierTotal = calculateModifierTotal(item.modifiers)
            return sum + modifierTotal * item.quantity
          }, 0)
        },

        getItemModifiersTotal: (item) => {
          return calculateModifierTotal(item.modifiers)
        },

        getItemTotal: (item) => {
          const modifierTotal = calculateModifierTotal(item.modifiers)
          return (item.price_at_add + modifierTotal) * item.quantity
        },

        getTotal: () => {
          const state = get()
          return state.getSubtotal() + state.getModifiersTotal()
        },

        isEmpty: () => {
          const state = get()
          return state.items.length === 0
        },

        // Prepare data for order submission
        prepareForSubmission: () => {
          const state = get()

          if (!state.context || state.items.length === 0) {
            return null
          }

          const items: PreparedCartItem[] = state.items.map((item) => {
            const modifierTotal = calculateModifierTotal(item.modifiers)
            const itemTotal = (item.price_at_add + modifierTotal) * item.quantity

            return {
              product_id: item.product_id,
              product_name: item.product_name,
              product_description: item.product_description,
              product_image_url: item.image_url,
              quantity: item.quantity,
              unit_price: item.price_at_add,
              modifier_total: modifierTotal,
              item_total: itemTotal,
              currency: item.currency,
              price_ledger_id: item.price_ledger_id,
              selected_modifiers: item.modifiers,
              special_instructions: item.special_instructions,
            }
          })

          const subtotal = state.getSubtotal()
          const totalAmount = state.getTotal()

          return {
            organization_id: state.context.organization_id,
            table_id: state.context.table_id,
            table_name: state.context.table_name,
            customer_name: state.customerName,
            customer_phone: state.customerPhone,
            customer_notes: state.customerNotes,
            order_type: state.context.table_id ? 'dine_in' : 'takeaway',
            subtotal,
            total_amount: totalAmount,
            currency: state.context.currency,
            items,
          }
        },
      }),
      {
        name: 'e-menum-cart-store',
        // Persist cart data including items and context
        partialize: (state) => ({
          items: state.items,
          context: state.context,
          customerName: state.customerName,
          customerPhone: state.customerPhone,
          customerNotes: state.customerNotes,
        }),
      }
    ),
    { name: 'CartStore' }
  )
)

/**
 * Selector hooks for optimized re-renders
 */
export const useCartItems = () => useCartStore((state) => state.items)
export const useCartContext = () => useCartStore((state) => state.context)
export const useCartItemCount = () => useCartStore((state) => state.getItemCount())
export const useCartTotal = () => useCartStore((state) => state.getTotal())
export const useIsCartEmpty = () => useCartStore((state) => state.isEmpty())
export const useIsCartOpen = () => useCartStore((state) => state.isCartOpen)

/**
 * Hook to check if cart has items for a specific organization
 * Useful for showing cart badge only when user is in the same restaurant
 */
export function useCartForOrg(orgId: string | null): {
  hasItems: boolean
  itemCount: number
  total: number
} {
  const context = useCartStore((state) => state.context)
  const items = useCartStore((state) => state.items)
  const getTotal = useCartStore((state) => state.getTotal)

  if (!orgId || !context || context.organization_id !== orgId) {
    return { hasItems: false, itemCount: 0, total: 0 }
  }

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0)
  return { hasItems: itemCount > 0, itemCount, total: getTotal() }
}

/**
 * Hook to get item by ID
 */
export function useCartItem(itemId: string): CartItem | undefined {
  return useCartStore((state) => state.items.find((item) => item.id === itemId))
}

/**
 * Hook to check if a product is in the cart
 */
export function useIsProductInCart(productId: string): boolean {
  return useCartStore((state) =>
    state.items.some((item) => item.product_id === productId)
  )
}

/**
 * Hook to get total quantity of a product in cart (across all modifier combinations)
 */
export function useProductQuantityInCart(productId: string): number {
  return useCartStore((state) =>
    state.items
      .filter((item) => item.product_id === productId)
      .reduce((sum, item) => sum + item.quantity, 0)
  )
}

/**
 * Format price for display in Turkish Lira
 */
export function formatCartPrice(amount: number, currency = 'TRY'): string {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}
