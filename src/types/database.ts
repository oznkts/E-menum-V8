/**
 * Supabase Database Type Definitions
 *
 * Generated from Supabase schema migrations.
 * To regenerate, run:
 *   supabase gen types typescript --local > src/types/database.ts
 *
 * @see https://supabase.com/docs/guides/api/generating-types
 */

/**
 * JSON type alias for flexible JSON column typing
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

/**
 * Database schema type definitions
 */
export interface Database {
  public: {
    Tables: {
      /**
       * Multi-tenant organizations representing restaurants/businesses
       */
      organizations: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          name: string
          slug: string
          description: string | null
          owner_id: string
          subscription_tier: Database['public']['Enums']['subscription_tier']
          subscription_status: Database['public']['Enums']['subscription_status']
          trial_ends_at: string | null
          logo_url: string | null
          cover_url: string | null
          primary_color: string | null
          secondary_color: string | null
          phone: string | null
          email: string | null
          website: string | null
          address: string | null
          city: string | null
          district: string | null
          postal_code: string | null
          country: string
          latitude: number | null
          longitude: number | null
          timezone: string
          currency: string
          language: string
          business_hours: Json | null
          settings: Json | null
          tax_id: string | null
          trade_registration: string | null
          is_active: boolean
          deleted_at: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          name: string
          slug: string
          description?: string | null
          owner_id: string
          subscription_tier?: Database['public']['Enums']['subscription_tier']
          subscription_status?: Database['public']['Enums']['subscription_status']
          trial_ends_at?: string | null
          logo_url?: string | null
          cover_url?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          phone?: string | null
          email?: string | null
          website?: string | null
          address?: string | null
          city?: string | null
          district?: string | null
          postal_code?: string | null
          country?: string
          latitude?: number | null
          longitude?: number | null
          timezone?: string
          currency?: string
          language?: string
          business_hours?: Json | null
          settings?: Json | null
          tax_id?: string | null
          trade_registration?: string | null
          is_active?: boolean
          deleted_at?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          name?: string
          slug?: string
          description?: string | null
          owner_id?: string
          subscription_tier?: Database['public']['Enums']['subscription_tier']
          subscription_status?: Database['public']['Enums']['subscription_status']
          trial_ends_at?: string | null
          logo_url?: string | null
          cover_url?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          phone?: string | null
          email?: string | null
          website?: string | null
          address?: string | null
          city?: string | null
          district?: string | null
          postal_code?: string | null
          country?: string
          latitude?: number | null
          longitude?: number | null
          timezone?: string
          currency?: string
          language?: string
          business_hours?: Json | null
          settings?: Json | null
          tax_id?: string | null
          trade_registration?: string | null
          is_active?: boolean
          deleted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'organizations_owner_id_fkey'
            columns: ['owner_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }

      /**
       * User profiles extending auth.users with additional information
       */
      profiles: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          email: string
          full_name: string | null
          avatar_url: string | null
          phone: string | null
          system_role: Database['public']['Enums']['system_role']
          preferences: Json | null
          email_verified: boolean
          email_verified_at: string | null
          is_active: boolean
          last_login_at: string | null
          deleted_at: string | null
        }
        Insert: {
          id: string
          created_at?: string
          updated_at?: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          phone?: string | null
          system_role?: Database['public']['Enums']['system_role']
          preferences?: Json | null
          email_verified?: boolean
          email_verified_at?: string | null
          is_active?: boolean
          last_login_at?: string | null
          deleted_at?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          phone?: string | null
          system_role?: Database['public']['Enums']['system_role']
          preferences?: Json | null
          email_verified?: boolean
          email_verified_at?: string | null
          is_active?: boolean
          last_login_at?: string | null
          deleted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'profiles_id_fkey'
            columns: ['id']
            isOneToOne: true
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }

      /**
       * Links users to organizations with specific roles
       */
      memberships: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          organization_id: string
          user_id: string
          role: Database['public']['Enums']['organization_role']
          invited_by: string | null
          invited_at: string
          joined_at: string | null
          invitation_token: string | null
          invitation_expires_at: string | null
          is_active: boolean
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          organization_id: string
          user_id: string
          role?: Database['public']['Enums']['organization_role']
          invited_by?: string | null
          invited_at?: string
          joined_at?: string | null
          invitation_token?: string | null
          invitation_expires_at?: string | null
          is_active?: boolean
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          organization_id?: string
          user_id?: string
          role?: Database['public']['Enums']['organization_role']
          invited_by?: string | null
          invited_at?: string
          joined_at?: string | null
          invitation_token?: string | null
          invitation_expires_at?: string | null
          is_active?: boolean
        }
        Relationships: [
          {
            foreignKeyName: 'memberships_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'memberships_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'memberships_invited_by_fkey'
            columns: ['invited_by']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }

      /**
       * Menu categories for organizing products, supports nesting via parent_id
       */
      categories: {
        Row: {
          id: string
          organization_id: string
          created_at: string
          updated_at: string
          name: string
          slug: string
          description: string | null
          icon: string | null
          image_url: string | null
          parent_id: string | null
          sort_order: number
          is_visible: boolean
          available_from: string | null
          available_until: string | null
          deleted_at: string | null
        }
        Insert: {
          id?: string
          organization_id: string
          created_at?: string
          updated_at?: string
          name: string
          slug: string
          description?: string | null
          icon?: string | null
          image_url?: string | null
          parent_id?: string | null
          sort_order?: number
          is_visible?: boolean
          available_from?: string | null
          available_until?: string | null
          deleted_at?: string | null
        }
        Update: {
          id?: string
          organization_id?: string
          created_at?: string
          updated_at?: string
          name?: string
          slug?: string
          description?: string | null
          icon?: string | null
          image_url?: string | null
          parent_id?: string | null
          sort_order?: number
          is_visible?: boolean
          available_from?: string | null
          available_until?: string | null
          deleted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'categories_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'categories_parent_id_fkey'
            columns: ['parent_id']
            isOneToOne: false
            referencedRelation: 'categories'
            referencedColumns: ['id']
          }
        ]
      }

      /**
       * Menu items/products with pricing, availability, and dietary information
       */
      products: {
        Row: {
          id: string
          organization_id: string
          category_id: string | null
          created_at: string
          updated_at: string
          name: string
          slug: string
          description: string | null
          short_description: string | null
          image_urls: Json | null
          price: number
          compare_at_price: number | null
          currency: string
          status: Database['public']['Enums']['product_status']
          is_available: boolean
          stock_quantity: number | null
          sort_order: number
          preparation_time_minutes: number | null
          allergens: Database['public']['Enums']['allergen_type'][] | null
          is_vegetarian: boolean
          is_vegan: boolean
          is_gluten_free: boolean
          is_spicy: boolean
          spicy_level: number | null
          nutritional_info: Json | null
          tags: string[] | null
          is_featured: boolean
          featured_until: string | null
          attributes: Json | null
          meta_title: string | null
          meta_description: string | null
          deleted_at: string | null
        }
        Insert: {
          id?: string
          organization_id: string
          category_id?: string | null
          created_at?: string
          updated_at?: string
          name: string
          slug: string
          description?: string | null
          short_description?: string | null
          image_urls?: Json | null
          price?: number
          compare_at_price?: number | null
          currency?: string
          status?: Database['public']['Enums']['product_status']
          is_available?: boolean
          stock_quantity?: number | null
          sort_order?: number
          preparation_time_minutes?: number | null
          allergens?: Database['public']['Enums']['allergen_type'][] | null
          is_vegetarian?: boolean
          is_vegan?: boolean
          is_gluten_free?: boolean
          is_spicy?: boolean
          spicy_level?: number | null
          nutritional_info?: Json | null
          tags?: string[] | null
          is_featured?: boolean
          featured_until?: string | null
          attributes?: Json | null
          meta_title?: string | null
          meta_description?: string | null
          deleted_at?: string | null
        }
        Update: {
          id?: string
          organization_id?: string
          category_id?: string | null
          created_at?: string
          updated_at?: string
          name?: string
          slug?: string
          description?: string | null
          short_description?: string | null
          image_urls?: Json | null
          price?: number
          compare_at_price?: number | null
          currency?: string
          status?: Database['public']['Enums']['product_status']
          is_available?: boolean
          stock_quantity?: number | null
          sort_order?: number
          preparation_time_minutes?: number | null
          allergens?: Database['public']['Enums']['allergen_type'][] | null
          is_vegetarian?: boolean
          is_vegan?: boolean
          is_gluten_free?: boolean
          is_spicy?: boolean
          spicy_level?: number | null
          nutritional_info?: Json | null
          tags?: string[] | null
          is_featured?: boolean
          featured_until?: string | null
          attributes?: Json | null
          meta_title?: string | null
          meta_description?: string | null
          deleted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'products_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'products_category_id_fkey'
            columns: ['category_id']
            isOneToOne: false
            referencedRelation: 'categories'
            referencedColumns: ['id']
          }
        ]
      }

      /**
       * Modifier groups for products (e.g., Size, Extras)
       */
      product_modifiers: {
        Row: {
          id: string
          organization_id: string
          product_id: string
          created_at: string
          updated_at: string
          name: string
          description: string | null
          is_required: boolean
          min_selections: number
          max_selections: number
          sort_order: number
          is_visible: boolean
          deleted_at: string | null
        }
        Insert: {
          id?: string
          organization_id: string
          product_id: string
          created_at?: string
          updated_at?: string
          name: string
          description?: string | null
          is_required?: boolean
          min_selections?: number
          max_selections?: number
          sort_order?: number
          is_visible?: boolean
          deleted_at?: string | null
        }
        Update: {
          id?: string
          organization_id?: string
          product_id?: string
          created_at?: string
          updated_at?: string
          name?: string
          description?: string | null
          is_required?: boolean
          min_selections?: number
          max_selections?: number
          sort_order?: number
          is_visible?: boolean
          deleted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'product_modifiers_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'product_modifiers_product_id_fkey'
            columns: ['product_id']
            isOneToOne: false
            referencedRelation: 'products'
            referencedColumns: ['id']
          }
        ]
      }

      /**
       * Individual options within modifier groups
       */
      modifier_options: {
        Row: {
          id: string
          organization_id: string
          modifier_id: string
          created_at: string
          updated_at: string
          name: string
          description: string | null
          price_adjustment: number
          sort_order: number
          is_default: boolean
          is_visible: boolean
          is_available: boolean
          deleted_at: string | null
        }
        Insert: {
          id?: string
          organization_id: string
          modifier_id: string
          created_at?: string
          updated_at?: string
          name: string
          description?: string | null
          price_adjustment?: number
          sort_order?: number
          is_default?: boolean
          is_visible?: boolean
          is_available?: boolean
          deleted_at?: string | null
        }
        Update: {
          id?: string
          organization_id?: string
          modifier_id?: string
          created_at?: string
          updated_at?: string
          name?: string
          description?: string | null
          price_adjustment?: number
          sort_order?: number
          is_default?: boolean
          is_visible?: boolean
          is_available?: boolean
          deleted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'modifier_options_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'modifier_options_modifier_id_fkey'
            columns: ['modifier_id']
            isOneToOne: false
            referencedRelation: 'product_modifiers'
            referencedColumns: ['id']
          }
        ]
      }

      /**
       * IMMUTABLE price change audit trail for Turkish regulatory compliance.
       * INSERT-only table - no updates or deletes allowed.
       */
      price_ledger: {
        Row: {
          id: string
          organization_id: string
          product_id: string
          price: number
          currency: string
          previous_price: number | null
          reason: Database['public']['Enums']['price_change_reason']
          notes: string | null
          effective_from: string
          created_by: string | null
          created_at: string
          ip_address: string | null
          user_agent: string | null
        }
        Insert: {
          id?: string
          organization_id: string
          product_id: string
          price: number
          currency?: string
          previous_price?: number | null
          reason?: Database['public']['Enums']['price_change_reason']
          notes?: string | null
          effective_from?: string
          created_by?: string | null
          created_at?: string
          ip_address?: string | null
          user_agent?: string | null
        }
        Update: never // Immutable - no updates allowed
        Relationships: [
          {
            foreignKeyName: 'price_ledger_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'price_ledger_product_id_fkey'
            columns: ['product_id']
            isOneToOne: false
            referencedRelation: 'products'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'price_ledger_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }

      /**
       * Physical tables in the restaurant with QR code mapping for ordering
       */
      restaurant_tables: {
        Row: {
          id: string
          organization_id: string
          created_at: string
          updated_at: string
          name: string
          table_number: string | null
          qr_uuid: string
          qr_code_generated_at: string | null
          section: string | null
          floor: number | null
          capacity: number
          min_capacity: number | null
          status: Database['public']['Enums']['table_status']
          status_changed_at: string | null
          status_changed_by: string | null
          current_order_id: string | null
          occupied_at: string | null
          occupied_by: string | null
          sort_order: number
          is_visible: boolean
          is_accessible: boolean
          is_outdoor: boolean
          deleted_at: string | null
        }
        Insert: {
          id?: string
          organization_id: string
          created_at?: string
          updated_at?: string
          name: string
          table_number?: string | null
          qr_uuid?: string
          qr_code_generated_at?: string | null
          section?: string | null
          floor?: number | null
          capacity?: number
          min_capacity?: number | null
          status?: Database['public']['Enums']['table_status']
          status_changed_at?: string | null
          status_changed_by?: string | null
          current_order_id?: string | null
          occupied_at?: string | null
          occupied_by?: string | null
          sort_order?: number
          is_visible?: boolean
          is_accessible?: boolean
          is_outdoor?: boolean
          deleted_at?: string | null
        }
        Update: {
          id?: string
          organization_id?: string
          created_at?: string
          updated_at?: string
          name?: string
          table_number?: string | null
          qr_uuid?: string
          qr_code_generated_at?: string | null
          section?: string | null
          floor?: number | null
          capacity?: number
          min_capacity?: number | null
          status?: Database['public']['Enums']['table_status']
          status_changed_at?: string | null
          status_changed_by?: string | null
          current_order_id?: string | null
          occupied_at?: string | null
          occupied_by?: string | null
          sort_order?: number
          is_visible?: boolean
          is_accessible?: boolean
          is_outdoor?: boolean
          deleted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'restaurant_tables_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'restaurant_tables_status_changed_by_fkey'
            columns: ['status_changed_by']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'fk_current_order'
            columns: ['current_order_id']
            isOneToOne: false
            referencedRelation: 'orders'
            referencedColumns: ['id']
          }
        ]
      }

      /**
       * Customer orders with status tracking and pricing locked at order time
       */
      orders: {
        Row: {
          id: string
          organization_id: string
          created_at: string
          updated_at: string
          order_number: string
          table_id: string | null
          table_name: string | null
          customer_name: string | null
          customer_phone: string | null
          customer_email: string | null
          customer_notes: string | null
          order_type: Database['public']['Enums']['order_type']
          status: Database['public']['Enums']['order_status']
          status_changed_at: string | null
          status_changed_by: string | null
          subtotal: number
          tax_amount: number
          discount_amount: number
          total_amount: number
          currency: string
          tax_rate: number | null
          payment_status: Database['public']['Enums']['payment_status']
          payment_method: Database['public']['Enums']['payment_method'] | null
          paid_amount: number | null
          paid_at: string | null
          estimated_ready_at: string | null
          actual_ready_at: string | null
          served_at: string | null
          assigned_to: string | null
          assigned_at: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          cancellation_reason: string | null
          source: string | null
          session_id: string | null
          internal_notes: string | null
        }
        Insert: {
          id?: string
          organization_id: string
          created_at?: string
          updated_at?: string
          order_number?: string
          table_id?: string | null
          table_name?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          customer_email?: string | null
          customer_notes?: string | null
          order_type?: Database['public']['Enums']['order_type']
          status?: Database['public']['Enums']['order_status']
          status_changed_at?: string | null
          status_changed_by?: string | null
          subtotal?: number
          tax_amount?: number
          discount_amount?: number
          total_amount?: number
          currency?: string
          tax_rate?: number | null
          payment_status?: Database['public']['Enums']['payment_status']
          payment_method?: Database['public']['Enums']['payment_method'] | null
          paid_amount?: number | null
          paid_at?: string | null
          estimated_ready_at?: string | null
          actual_ready_at?: string | null
          served_at?: string | null
          assigned_to?: string | null
          assigned_at?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          cancellation_reason?: string | null
          source?: string | null
          session_id?: string | null
          internal_notes?: string | null
        }
        Update: {
          id?: string
          organization_id?: string
          created_at?: string
          updated_at?: string
          order_number?: string
          table_id?: string | null
          table_name?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          customer_email?: string | null
          customer_notes?: string | null
          order_type?: Database['public']['Enums']['order_type']
          status?: Database['public']['Enums']['order_status']
          status_changed_at?: string | null
          status_changed_by?: string | null
          subtotal?: number
          tax_amount?: number
          discount_amount?: number
          total_amount?: number
          currency?: string
          tax_rate?: number | null
          payment_status?: Database['public']['Enums']['payment_status']
          payment_method?: Database['public']['Enums']['payment_method'] | null
          paid_amount?: number | null
          paid_at?: string | null
          estimated_ready_at?: string | null
          actual_ready_at?: string | null
          served_at?: string | null
          assigned_to?: string | null
          assigned_at?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          cancellation_reason?: string | null
          source?: string | null
          session_id?: string | null
          internal_notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'orders_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'orders_table_id_fkey'
            columns: ['table_id']
            isOneToOne: false
            referencedRelation: 'restaurant_tables'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'orders_status_changed_by_fkey'
            columns: ['status_changed_by']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'orders_assigned_to_fkey'
            columns: ['assigned_to']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'orders_cancelled_by_fkey'
            columns: ['cancelled_by']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }

      /**
       * Individual items within an order with prices locked at order time
       */
      order_items: {
        Row: {
          id: string
          organization_id: string
          order_id: string
          product_id: string | null
          product_name: string
          product_description: string | null
          product_image_url: string | null
          created_at: string
          updated_at: string
          quantity: number
          unit_price: number
          modifier_total: number | null
          item_total: number
          currency: string
          price_ledger_id: string | null
          selected_modifiers: Json | null
          special_instructions: string | null
          status: Database['public']['Enums']['order_status']
          status_changed_at: string | null
          started_preparing_at: string | null
          ready_at: string | null
          served_at: string | null
        }
        Insert: {
          id?: string
          organization_id: string
          order_id: string
          product_id?: string | null
          product_name: string
          product_description?: string | null
          product_image_url?: string | null
          created_at?: string
          updated_at?: string
          quantity?: number
          unit_price: number
          modifier_total?: number | null
          item_total: number
          currency?: string
          price_ledger_id?: string | null
          selected_modifiers?: Json | null
          special_instructions?: string | null
          status?: Database['public']['Enums']['order_status']
          status_changed_at?: string | null
          started_preparing_at?: string | null
          ready_at?: string | null
          served_at?: string | null
        }
        Update: {
          id?: string
          organization_id?: string
          order_id?: string
          product_id?: string | null
          product_name?: string
          product_description?: string | null
          product_image_url?: string | null
          created_at?: string
          updated_at?: string
          quantity?: number
          unit_price?: number
          modifier_total?: number | null
          item_total?: number
          currency?: string
          price_ledger_id?: string | null
          selected_modifiers?: Json | null
          special_instructions?: string | null
          status?: Database['public']['Enums']['order_status']
          status_changed_at?: string | null
          started_preparing_at?: string | null
          ready_at?: string | null
          served_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'order_items_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'order_items_order_id_fkey'
            columns: ['order_id']
            isOneToOne: false
            referencedRelation: 'orders'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'order_items_product_id_fkey'
            columns: ['product_id']
            isOneToOne: false
            referencedRelation: 'products'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'order_items_price_ledger_id_fkey'
            columns: ['price_ledger_id']
            isOneToOne: false
            referencedRelation: 'price_ledger'
            referencedColumns: ['id']
          }
        ]
      }

      /**
       * Waiter call and service requests from customers
       */
      service_requests: {
        Row: {
          id: string
          organization_id: string
          table_id: string
          created_at: string
          updated_at: string
          request_type: Database['public']['Enums']['service_request_type']
          message: string | null
          status: Database['public']['Enums']['service_request_status']
          status_changed_at: string | null
          handled_by: string | null
          handled_at: string | null
          response: string | null
          session_id: string | null
          ip_address: string | null
        }
        Insert: {
          id?: string
          organization_id: string
          table_id: string
          created_at?: string
          updated_at?: string
          request_type?: Database['public']['Enums']['service_request_type']
          message?: string | null
          status?: Database['public']['Enums']['service_request_status']
          status_changed_at?: string | null
          handled_by?: string | null
          handled_at?: string | null
          response?: string | null
          session_id?: string | null
          ip_address?: string | null
        }
        Update: {
          id?: string
          organization_id?: string
          table_id?: string
          created_at?: string
          updated_at?: string
          request_type?: Database['public']['Enums']['service_request_type']
          message?: string | null
          status?: Database['public']['Enums']['service_request_status']
          status_changed_at?: string | null
          handled_by?: string | null
          handled_at?: string | null
          response?: string | null
          session_id?: string | null
          ip_address?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'service_requests_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'service_requests_table_id_fkey'
            columns: ['table_id']
            isOneToOne: false
            referencedRelation: 'restaurant_tables'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'service_requests_handled_by_fkey'
            columns: ['handled_by']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }

      /**
       * Platform features that can be enabled/limited per subscription plan
       */
      features: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          code: string
          name: string
          name_tr: string
          description: string | null
          description_tr: string | null
          category: Database['public']['Enums']['feature_category']
          value_type: Database['public']['Enums']['feature_value_type']
          default_value: string | null
          sort_order: number
          icon: string | null
          is_highlighted: boolean | null
          is_active: boolean
          is_visible: boolean
          metadata: Json | null
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          code: string
          name: string
          name_tr: string
          description?: string | null
          description_tr?: string | null
          category: Database['public']['Enums']['feature_category']
          value_type?: Database['public']['Enums']['feature_value_type']
          default_value?: string | null
          sort_order?: number
          icon?: string | null
          is_highlighted?: boolean | null
          is_active?: boolean
          is_visible?: boolean
          metadata?: Json | null
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          code?: string
          name?: string
          name_tr?: string
          description?: string | null
          description_tr?: string | null
          category?: Database['public']['Enums']['feature_category']
          value_type?: Database['public']['Enums']['feature_value_type']
          default_value?: string | null
          sort_order?: number
          icon?: string | null
          is_highlighted?: boolean | null
          is_active?: boolean
          is_visible?: boolean
          metadata?: Json | null
        }
        Relationships: []
      }

      /**
       * Available subscription plans (Lite, Gold, Platinum, Enterprise)
       */
      subscription_plans: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          tier: Database['public']['Enums']['subscription_tier']
          name: string
          name_tr: string
          description: string | null
          description_tr: string | null
          monthly_price: number
          quarterly_price: number | null
          yearly_price: number | null
          currency: string
          trial_days: number | null
          sort_order: number
          is_popular: boolean | null
          badge_text: string | null
          badge_text_tr: string | null
          is_active: boolean
          is_public: boolean
          requires_contact: boolean | null
          max_products: number | null
          max_categories: number | null
          max_tables: number | null
          max_orders_per_month: number | null
          max_users: number | null
          max_locations: number | null
          metadata: Json | null
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          tier: Database['public']['Enums']['subscription_tier']
          name: string
          name_tr: string
          description?: string | null
          description_tr?: string | null
          monthly_price?: number
          quarterly_price?: number | null
          yearly_price?: number | null
          currency?: string
          trial_days?: number | null
          sort_order?: number
          is_popular?: boolean | null
          badge_text?: string | null
          badge_text_tr?: string | null
          is_active?: boolean
          is_public?: boolean
          requires_contact?: boolean | null
          max_products?: number | null
          max_categories?: number | null
          max_tables?: number | null
          max_orders_per_month?: number | null
          max_users?: number | null
          max_locations?: number | null
          metadata?: Json | null
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          tier?: Database['public']['Enums']['subscription_tier']
          name?: string
          name_tr?: string
          description?: string | null
          description_tr?: string | null
          monthly_price?: number
          quarterly_price?: number | null
          yearly_price?: number | null
          currency?: string
          trial_days?: number | null
          sort_order?: number
          is_popular?: boolean | null
          badge_text?: string | null
          badge_text_tr?: string | null
          is_active?: boolean
          is_public?: boolean
          requires_contact?: boolean | null
          max_products?: number | null
          max_categories?: number | null
          max_tables?: number | null
          max_orders_per_month?: number | null
          max_users?: number | null
          max_locations?: number | null
          metadata?: Json | null
        }
        Relationships: []
      }

      /**
       * Junction table linking plans to features with specific limits
       */
      plan_features: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          plan_id: string
          feature_id: string
          is_enabled: boolean
          value: string | null
          is_unlimited: boolean | null
          display_value: string | null
          display_value_tr: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          plan_id: string
          feature_id: string
          is_enabled?: boolean
          value?: string | null
          is_unlimited?: boolean | null
          display_value?: string | null
          display_value_tr?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          plan_id?: string
          feature_id?: string
          is_enabled?: boolean
          value?: string | null
          is_unlimited?: boolean | null
          display_value?: string | null
          display_value_tr?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'plan_features_plan_id_fkey'
            columns: ['plan_id']
            isOneToOne: false
            referencedRelation: 'subscription_plans'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'plan_features_feature_id_fkey'
            columns: ['feature_id']
            isOneToOne: false
            referencedRelation: 'features'
            referencedColumns: ['id']
          }
        ]
      }

      /**
       * Active subscriptions for organizations
       */
      organization_subscriptions: {
        Row: {
          id: string
          organization_id: string
          plan_id: string
          created_at: string
          updated_at: string
          started_at: string
          current_period_start: string
          current_period_end: string
          canceled_at: string | null
          ended_at: string | null
          trial_start: string | null
          trial_end: string | null
          is_trial: boolean
          billing_cycle: Database['public']['Enums']['billing_cycle']
          price_at_subscription: number
          currency: string
          external_subscription_id: string | null
          external_customer_id: string | null
          status: Database['public']['Enums']['subscription_status']
          status_changed_at: string | null
          auto_renew: boolean
          renewal_reminder_sent_at: string | null
          cancel_at_period_end: boolean | null
          cancellation_reason: string | null
          metadata: Json | null
        }
        Insert: {
          id?: string
          organization_id: string
          plan_id: string
          created_at?: string
          updated_at?: string
          started_at?: string
          current_period_start?: string
          current_period_end: string
          canceled_at?: string | null
          ended_at?: string | null
          trial_start?: string | null
          trial_end?: string | null
          is_trial?: boolean
          billing_cycle?: Database['public']['Enums']['billing_cycle']
          price_at_subscription: number
          currency?: string
          external_subscription_id?: string | null
          external_customer_id?: string | null
          status?: Database['public']['Enums']['subscription_status']
          status_changed_at?: string | null
          auto_renew?: boolean
          renewal_reminder_sent_at?: string | null
          cancel_at_period_end?: boolean | null
          cancellation_reason?: string | null
          metadata?: Json | null
        }
        Update: {
          id?: string
          organization_id?: string
          plan_id?: string
          created_at?: string
          updated_at?: string
          started_at?: string
          current_period_start?: string
          current_period_end?: string
          canceled_at?: string | null
          ended_at?: string | null
          trial_start?: string | null
          trial_end?: string | null
          is_trial?: boolean
          billing_cycle?: Database['public']['Enums']['billing_cycle']
          price_at_subscription?: number
          currency?: string
          external_subscription_id?: string | null
          external_customer_id?: string | null
          status?: Database['public']['Enums']['subscription_status']
          status_changed_at?: string | null
          auto_renew?: boolean
          renewal_reminder_sent_at?: string | null
          cancel_at_period_end?: boolean | null
          cancellation_reason?: string | null
          metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: 'organization_subscriptions_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'organization_subscriptions_plan_id_fkey'
            columns: ['plan_id']
            isOneToOne: false
            referencedRelation: 'subscription_plans'
            referencedColumns: ['id']
          }
        ]
      }

      /**
       * Organization-specific feature overrides (e.g., for promotions or custom deals)
       */
      feature_overrides: {
        Row: {
          id: string
          organization_id: string
          feature_id: string
          created_at: string
          updated_at: string
          is_enabled: boolean | null
          value: string | null
          is_unlimited: boolean | null
          reason: string | null
          granted_by: string | null
          expires_at: string | null
          is_active: boolean
          metadata: Json | null
        }
        Insert: {
          id?: string
          organization_id: string
          feature_id: string
          created_at?: string
          updated_at?: string
          is_enabled?: boolean | null
          value?: string | null
          is_unlimited?: boolean | null
          reason?: string | null
          granted_by?: string | null
          expires_at?: string | null
          is_active?: boolean
          metadata?: Json | null
        }
        Update: {
          id?: string
          organization_id?: string
          feature_id?: string
          created_at?: string
          updated_at?: string
          is_enabled?: boolean | null
          value?: string | null
          is_unlimited?: boolean | null
          reason?: string | null
          granted_by?: string | null
          expires_at?: string | null
          is_active?: boolean
          metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: 'feature_overrides_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'feature_overrides_feature_id_fkey'
            columns: ['feature_id']
            isOneToOne: false
            referencedRelation: 'features'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'feature_overrides_granted_by_fkey'
            columns: ['granted_by']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }

      /**
       * Tracks feature usage for limit enforcement
       */
      feature_usage: {
        Row: {
          id: string
          organization_id: string
          feature_id: string
          period_start: string
          period_end: string
          usage_count: number
          usage_limit: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          feature_id: string
          period_start: string
          period_end: string
          usage_count?: number
          usage_limit?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          feature_id?: string
          period_start?: string
          period_end?: string
          usage_count?: number
          usage_limit?: number | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'feature_usage_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'feature_usage_feature_id_fkey'
            columns: ['feature_id']
            isOneToOne: false
            referencedRelation: 'features'
            referencedColumns: ['id']
          }
        ]
      }

      /**
       * Security audit trail for sensitive operations
       */
      audit_logs: {
        Row: {
          id: string
          created_at: string
          user_id: string | null
          user_email: string | null
          user_ip: string | null
          user_agent: string | null
          organization_id: string | null
          action: string
          resource_type: string | null
          resource_id: string | null
          old_data: Json | null
          new_data: Json | null
          metadata: Json | null
          severity: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          user_id?: string | null
          user_email?: string | null
          user_ip?: string | null
          user_agent?: string | null
          organization_id?: string | null
          action: string
          resource_type?: string | null
          resource_id?: string | null
          old_data?: Json | null
          new_data?: Json | null
          metadata?: Json | null
          severity?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          user_id?: string | null
          user_email?: string | null
          user_ip?: string | null
          user_agent?: string | null
          organization_id?: string | null
          action?: string
          resource_type?: string | null
          resource_id?: string | null
          old_data?: Json | null
          new_data?: Json | null
          metadata?: Json | null
          severity?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'audit_logs_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'audit_logs_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          }
        ]
      }
    }
    Views: {
      rls_status_summary: {
        Row: {
          table_name: string | null
          rls_enabled: boolean | null
          policy_count: number | null
          policy_names: string[] | null
        }
        Relationships: []
      }
    }
    Functions: {
      /**
       * Get the current price for a product from the price ledger
       */
      get_current_price: {
        Args: {
          p_product_id: string
        }
        Returns: {
          price: number
          currency: string
          effective_from: string
          previous_price: number | null
          reason: Database['public']['Enums']['price_change_reason']
        }[]
      }
      /**
       * Get the price for a product at a specific point in time
       */
      get_price_at_time: {
        Args: {
          p_product_id: string
          p_at_time: string
        }
        Returns: {
          price: number
          currency: string
          effective_from: string
        }[]
      }
      /**
       * Get price change history for a product
       */
      get_price_history: {
        Args: {
          p_product_id: string
          p_limit?: number
        }
        Returns: {
          id: string
          price: number
          currency: string
          previous_price: number | null
          reason: Database['public']['Enums']['price_change_reason']
          notes: string | null
          effective_from: string
          created_by: string | null
          created_at: string
        }[]
      }
      /**
       * Check if organization has access to a feature
       */
      org_has_feature: {
        Args: {
          p_org_id: string
          p_feature_code: string
        }
        Returns: boolean
      }
      /**
       * Get feature limit for an organization (-1 = unlimited)
       */
      get_org_feature_limit: {
        Args: {
          p_org_id: string
          p_feature_code: string
        }
        Returns: number
      }
      /**
       * Increment feature usage and check if within limit
       */
      increment_feature_usage: {
        Args: {
          p_org_id: string
          p_feature_code: string
          p_amount?: number
        }
        Returns: {
          current_usage: number
          usage_limit: number | null
          is_within_limit: boolean
        }[]
      }
      /**
       * Check if current user is a superadmin
       */
      is_superadmin: {
        Args: Record<string, never>
        Returns: boolean
      }
      /**
       * Check if current user is platform support
       */
      is_platform_support: {
        Args: Record<string, never>
        Returns: boolean
      }
      /**
       * Check if current user is member of an organization
       */
      user_is_org_member: {
        Args: {
          p_org_id: string
        }
        Returns: boolean
      }
      /**
       * Get all organization IDs the current user has access to
       */
      get_user_accessible_orgs: {
        Args: Record<string, never>
        Returns: string[]
      }
      /**
       * Get active orders for an organization
       */
      get_active_orders: {
        Args: {
          p_org_id: string
        }
        Returns: {
          id: string
          order_number: string
          table_name: string | null
          customer_name: string | null
          order_type: Database['public']['Enums']['order_type']
          status: Database['public']['Enums']['order_status']
          total_amount: number
          item_count: number
          created_at: string
          estimated_ready_at: string | null
        }[]
      }
      /**
       * Get table by QR UUID
       */
      get_table_by_qr: {
        Args: {
          p_qr_uuid: string
        }
        Returns: {
          id: string
          name: string
          organization_id: string
          organization_slug: string
          organization_name: string
          status: Database['public']['Enums']['table_status']
          capacity: number
        }[]
      }
      /**
       * Create an audit log entry
       */
      create_audit_log: {
        Args: {
          p_action: string
          p_resource_type?: string | null
          p_resource_id?: string | null
          p_organization_id?: string | null
          p_old_data?: Json | null
          p_new_data?: Json | null
          p_severity?: string
          p_metadata?: Json
        }
        Returns: string
      }
      /**
       * Verify RLS is enabled on all tables
       */
      verify_rls_enabled: {
        Args: Record<string, never>
        Returns: {
          table_name: string
          rls_enabled: boolean
          has_policies: boolean
          policy_count: number
        }[]
      }
    }
    Enums: {
      /** Subscription tier levels */
      subscription_tier: 'lite' | 'gold' | 'platinum' | 'enterprise'
      /** Subscription status */
      subscription_status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'paused'
      /** User role within organization */
      organization_role: 'owner' | 'admin' | 'manager' | 'staff' | 'kitchen' | 'viewer'
      /** Platform-level system role */
      system_role: 'user' | 'support' | 'sales' | 'superadmin'
      /** Product availability status */
      product_status: 'active' | 'out_of_stock' | 'hidden' | 'seasonal'
      /** Common food allergen types */
      allergen_type:
        | 'gluten'
        | 'dairy'
        | 'eggs'
        | 'nuts'
        | 'peanuts'
        | 'soy'
        | 'fish'
        | 'shellfish'
        | 'sesame'
        | 'mustard'
        | 'celery'
        | 'lupin'
        | 'molluscs'
        | 'sulphites'
      /** Price change reason types */
      price_change_reason:
        | 'initial'
        | 'price_increase'
        | 'price_decrease'
        | 'promotion'
        | 'correction'
        | 'seasonal'
        | 'cost_adjustment'
        | 'tax_change'
        | 'other'
      /** Table status for restaurant floor management */
      table_status: 'available' | 'occupied' | 'reserved' | 'cleaning' | 'out_of_service'
      /** Order status tracking */
      order_status:
        | 'pending'
        | 'confirmed'
        | 'preparing'
        | 'ready'
        | 'served'
        | 'completed'
        | 'cancelled'
      /** Order type */
      order_type: 'dine_in' | 'takeaway' | 'delivery'
      /** Payment status */
      payment_status: 'pending' | 'partial' | 'paid' | 'refunded' | 'failed'
      /** Payment method */
      payment_method: 'cash' | 'credit_card' | 'debit_card' | 'mobile' | 'other'
      /** Service request type */
      service_request_type:
        | 'call_waiter'
        | 'request_bill'
        | 'need_help'
        | 'feedback'
        | 'complaint'
      /** Service request status */
      service_request_status:
        | 'pending'
        | 'acknowledged'
        | 'in_progress'
        | 'completed'
        | 'cancelled'
      /** Feature category */
      feature_category:
        | 'menu'
        | 'ordering'
        | 'analytics'
        | 'marketing'
        | 'integrations'
        | 'ai'
        | 'support'
        | 'branding'
        | 'management'
      /** Feature value type */
      feature_value_type: 'boolean' | 'number' | 'unlimited'
      /** Billing cycle */
      billing_cycle: 'monthly' | 'quarterly' | 'yearly' | 'lifetime'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// =============================================================================
// Helper Types
// =============================================================================

/**
 * Helper type for table row types
 */
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']

/**
 * Helper type for table insert types
 */
export type TablesInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']

/**
 * Helper type for table update types
 */
export type TablesUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update']

/**
 * Helper type for enum types
 */
export type Enums<T extends keyof Database['public']['Enums']> =
  Database['public']['Enums'][T]

// =============================================================================
// Convenience Type Aliases - Tables
// =============================================================================

// Core Tables
export type Organization = Tables<'organizations'>
export type Profile = Tables<'profiles'>
export type Membership = Tables<'memberships'>

// Menu Tables
export type Category = Tables<'categories'>
export type Product = Tables<'products'>
export type ProductModifier = Tables<'product_modifiers'>
export type ModifierOption = Tables<'modifier_options'>

// Price Ledger (Immutable)
export type PriceLedgerEntry = Tables<'price_ledger'>

// Order Tables
export type RestaurantTable = Tables<'restaurant_tables'>
export type Order = Tables<'orders'>
export type OrderItem = Tables<'order_items'>
export type ServiceRequest = Tables<'service_requests'>

// Subscription Tables
export type Feature = Tables<'features'>
export type SubscriptionPlan = Tables<'subscription_plans'>
export type PlanFeature = Tables<'plan_features'>
export type OrganizationSubscription = Tables<'organization_subscriptions'>
export type FeatureOverride = Tables<'feature_overrides'>
export type FeatureUsage = Tables<'feature_usage'>

// Audit
export type AuditLog = Tables<'audit_logs'>

// =============================================================================
// Convenience Type Aliases - Insert Types
// =============================================================================

export type OrganizationInsert = TablesInsert<'organizations'>
export type ProfileInsert = TablesInsert<'profiles'>
export type MembershipInsert = TablesInsert<'memberships'>
export type CategoryInsert = TablesInsert<'categories'>
export type ProductInsert = TablesInsert<'products'>
export type ProductModifierInsert = TablesInsert<'product_modifiers'>
export type ModifierOptionInsert = TablesInsert<'modifier_options'>
export type PriceLedgerInsert = TablesInsert<'price_ledger'>
export type RestaurantTableInsert = TablesInsert<'restaurant_tables'>
export type OrderInsert = TablesInsert<'orders'>
export type OrderItemInsert = TablesInsert<'order_items'>
export type ServiceRequestInsert = TablesInsert<'service_requests'>
export type FeatureInsert = TablesInsert<'features'>
export type SubscriptionPlanInsert = TablesInsert<'subscription_plans'>
export type PlanFeatureInsert = TablesInsert<'plan_features'>
export type OrganizationSubscriptionInsert = TablesInsert<'organization_subscriptions'>
export type FeatureOverrideInsert = TablesInsert<'feature_overrides'>
export type FeatureUsageInsert = TablesInsert<'feature_usage'>
export type AuditLogInsert = TablesInsert<'audit_logs'>

// =============================================================================
// Convenience Type Aliases - Update Types
// =============================================================================

export type OrganizationUpdate = TablesUpdate<'organizations'>
export type ProfileUpdate = TablesUpdate<'profiles'>
export type MembershipUpdate = TablesUpdate<'memberships'>
export type CategoryUpdate = TablesUpdate<'categories'>
export type ProductUpdate = TablesUpdate<'products'>
export type ProductModifierUpdate = TablesUpdate<'product_modifiers'>
export type ModifierOptionUpdate = TablesUpdate<'modifier_options'>
// Note: PriceLedger has no Update type - it's immutable
export type RestaurantTableUpdate = TablesUpdate<'restaurant_tables'>
export type OrderUpdate = TablesUpdate<'orders'>
export type OrderItemUpdate = TablesUpdate<'order_items'>
export type ServiceRequestUpdate = TablesUpdate<'service_requests'>
export type FeatureUpdate = TablesUpdate<'features'>
export type SubscriptionPlanUpdate = TablesUpdate<'subscription_plans'>
export type PlanFeatureUpdate = TablesUpdate<'plan_features'>
export type OrganizationSubscriptionUpdate = TablesUpdate<'organization_subscriptions'>
export type FeatureOverrideUpdate = TablesUpdate<'feature_overrides'>
export type FeatureUsageUpdate = TablesUpdate<'feature_usage'>
export type AuditLogUpdate = TablesUpdate<'audit_logs'>

// =============================================================================
// Convenience Type Aliases - Enums
// =============================================================================

export type SubscriptionTier = Enums<'subscription_tier'>
export type SubscriptionStatus = Enums<'subscription_status'>
export type OrganizationRole = Enums<'organization_role'>
export type SystemRole = Enums<'system_role'>
export type ProductStatus = Enums<'product_status'>
export type AllergenType = Enums<'allergen_type'>
export type PriceChangeReason = Enums<'price_change_reason'>
export type TableStatus = Enums<'table_status'>
export type OrderStatus = Enums<'order_status'>
export type OrderType = Enums<'order_type'>
export type PaymentStatus = Enums<'payment_status'>
export type PaymentMethod = Enums<'payment_method'>
export type ServiceRequestType = Enums<'service_request_type'>
export type ServiceRequestStatus = Enums<'service_request_status'>
export type FeatureCategory = Enums<'feature_category'>
export type FeatureValueType = Enums<'feature_value_type'>
export type BillingCycle = Enums<'billing_cycle'>
