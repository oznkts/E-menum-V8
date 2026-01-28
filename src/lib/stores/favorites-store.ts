import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

/**
 * Favorite item representing a saved product
 */
export interface FavoriteItem {
  product_id: string
  product_name: string
  product_description: string | null
  image_url: string | null
  organization_id: string
  organization_slug: string
  organization_name: string
  price_at_save: number
  currency: string
  saved_at: string // ISO timestamp
}

/**
 * Favorites Store State Interface
 */
interface FavoritesState {
  // Favorites list
  favorites: FavoriteItem[]

  // Actions
  addFavorite: (item: Omit<FavoriteItem, 'saved_at'>) => void
  removeFavorite: (productId: string) => void
  toggleFavorite: (item: Omit<FavoriteItem, 'saved_at'>) => void
  clearFavorites: () => void
  clearOrganizationFavorites: (organizationId: string) => void

  // Computed
  isFavorite: (productId: string) => boolean
  getFavoritesCount: () => number
  getFavoritesForOrg: (organizationId: string) => FavoriteItem[]
  getFavoriteProductIds: (organizationId?: string) => Set<string>
}

/**
 * Favorites Store
 *
 * Manages customer favorites (saved products) for the public menu.
 * Favorites are persisted in localStorage for anonymous users.
 * When user logs in, favorites can be synced to their profile (future feature).
 *
 * Features:
 * - Add/remove favorites
 * - Persist across sessions (localStorage)
 * - Organization-scoped queries
 * - Price tracking (show price changes since save)
 *
 * @example
 * ```tsx
 * import { useFavoritesStore } from '@/lib/stores/favorites-store'
 *
 * function ProductCard({ product, organization }) {
 *   const toggleFavorite = useFavoritesStore((state) => state.toggleFavorite)
 *   const isFavorite = useFavoritesStore((state) => state.isFavorite(product.id))
 *
 *   const handleToggle = () => {
 *     toggleFavorite({
 *       product_id: product.id,
 *       product_name: product.name,
 *       product_description: product.description,
 *       image_url: product.image_url,
 *       organization_id: organization.id,
 *       organization_slug: organization.slug,
 *       organization_name: organization.name,
 *       price_at_save: product.price,
 *       currency: 'TRY',
 *     })
 *   }
 *
 *   return (
 *     <button onClick={handleToggle} aria-label={isFavorite ? 'Favorilerden kaldır' : 'Favorilere ekle'}>
 *       <HeartIcon filled={isFavorite} />
 *     </button>
 *   )
 * }
 * ```
 */
export const useFavoritesStore = create<FavoritesState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        favorites: [],

        // Actions
        addFavorite: (item) =>
          set(
            (state) => {
              // Check if already favorited
              const exists = state.favorites.some(
                (f) => f.product_id === item.product_id
              )
              if (exists) return state

              const newFavorite: FavoriteItem = {
                ...item,
                saved_at: new Date().toISOString(),
              }

              return {
                favorites: [...state.favorites, newFavorite],
              }
            },
            false,
            'addFavorite'
          ),

        removeFavorite: (productId) =>
          set(
            (state) => ({
              favorites: state.favorites.filter(
                (f) => f.product_id !== productId
              ),
            }),
            false,
            'removeFavorite'
          ),

        toggleFavorite: (item) =>
          set(
            (state) => {
              const exists = state.favorites.some(
                (f) => f.product_id === item.product_id
              )

              if (exists) {
                return {
                  favorites: state.favorites.filter(
                    (f) => f.product_id !== item.product_id
                  ),
                }
              }

              const newFavorite: FavoriteItem = {
                ...item,
                saved_at: new Date().toISOString(),
              }

              return {
                favorites: [...state.favorites, newFavorite],
              }
            },
            false,
            'toggleFavorite'
          ),

        clearFavorites: () =>
          set({ favorites: [] }, false, 'clearFavorites'),

        clearOrganizationFavorites: (organizationId) =>
          set(
            (state) => ({
              favorites: state.favorites.filter(
                (f) => f.organization_id !== organizationId
              ),
            }),
            false,
            'clearOrganizationFavorites'
          ),

        // Computed
        isFavorite: (productId) => {
          const state = get()
          return state.favorites.some((f) => f.product_id === productId)
        },

        getFavoritesCount: () => {
          const state = get()
          return state.favorites.length
        },

        getFavoritesForOrg: (organizationId) => {
          const state = get()
          return state.favorites.filter(
            (f) => f.organization_id === organizationId
          )
        },

        getFavoriteProductIds: (organizationId) => {
          const state = get()
          const filtered = organizationId
            ? state.favorites.filter((f) => f.organization_id === organizationId)
            : state.favorites
          return new Set(filtered.map((f) => f.product_id))
        },
      }),
      {
        name: 'e-menum-favorites-store',
      }
    ),
    { name: 'FavoritesStore' }
  )
)

/**
 * Selector hooks for optimized re-renders
 */
export const useFavorites = () =>
  useFavoritesStore((state) => state.favorites)

export const useFavoritesCount = () =>
  useFavoritesStore((state) => state.favorites.length)

/**
 * Hook to check if a product is favorited (for optimized re-renders)
 */
export function useIsFavorite(productId: string): boolean {
  return useFavoritesStore((state) =>
    state.favorites.some((f) => f.product_id === productId)
  )
}

/**
 * Hook to get favorites for a specific organization
 */
export function useOrgFavorites(organizationId: string): FavoriteItem[] {
  return useFavoritesStore((state) =>
    state.favorites.filter((f) => f.organization_id === organizationId)
  )
}

/**
 * Hook to get favorite product IDs for quick lookup
 */
export function useFavoriteProductIds(organizationId?: string): Set<string> {
  return useFavoritesStore((state) => {
    const filtered = organizationId
      ? state.favorites.filter((f) => f.organization_id === organizationId)
      : state.favorites
    return new Set(filtered.map((f) => f.product_id))
  })
}

/**
 * Hook to check if price has changed since save
 */
export function usePriceChangedSincesSave(
  productId: string,
  currentPrice: number
): { hasChanged: boolean; savedPrice: number | null; difference: number } {
  const favorite = useFavoritesStore((state) =>
    state.favorites.find((f) => f.product_id === productId)
  )

  if (!favorite) {
    return { hasChanged: false, savedPrice: null, difference: 0 }
  }

  const difference = currentPrice - favorite.price_at_save
  return {
    hasChanged: difference !== 0,
    savedPrice: favorite.price_at_save,
    difference,
  }
}
