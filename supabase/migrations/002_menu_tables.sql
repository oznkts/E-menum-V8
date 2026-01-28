-- =====================================================
-- E-Menum Menu Tables Migration
-- Migration: 002_menu_tables
-- Description: Create menu tables: categories, products with soft delete
-- Depends on: 001_core_tables.sql
-- =====================================================

-- =====================================================
-- ENUM TYPES
-- =====================================================

-- Product availability status
CREATE TYPE product_status AS ENUM (
  'active',        -- Available for ordering
  'out_of_stock',  -- Temporarily unavailable (stock)
  'hidden',        -- Hidden from menu (preparation)
  'seasonal'       -- Seasonal item (may be unavailable)
);

-- Allergen types (common food allergens)
CREATE TYPE allergen_type AS ENUM (
  'gluten',        -- Gluten (wheat, barley, rye)
  'dairy',         -- Milk and dairy products
  'eggs',          -- Eggs
  'nuts',          -- Tree nuts
  'peanuts',       -- Peanuts
  'soy',           -- Soy
  'fish',          -- Fish
  'shellfish',     -- Shellfish
  'sesame',        -- Sesame
  'mustard',       -- Mustard
  'celery',        -- Celery
  'lupin',         -- Lupin
  'molluscs',      -- Molluscs
  'sulphites'      -- Sulphites
);

-- =====================================================
-- CATEGORIES TABLE
-- Menu categories for organizing products
-- Supports nested categories via parent_id
-- =====================================================

CREATE TABLE categories (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Multi-tenant foreign key
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Basic info
  name TEXT NOT NULL,
  slug TEXT NOT NULL,  -- URL-friendly identifier within organization
  description TEXT,

  -- Visual
  icon TEXT,           -- Icon name (Phosphor Icons)
  image_url TEXT,      -- Category cover image

  -- Hierarchy (for nested categories)
  parent_id UUID REFERENCES categories(id) ON DELETE SET NULL,

  -- Ordering
  sort_order INTEGER NOT NULL DEFAULT 0,  -- For drag-and-drop reordering

  -- Visibility
  is_visible BOOLEAN NOT NULL DEFAULT true,  -- Show/hide category

  -- Time-based visibility (optional)
  available_from TIME,   -- e.g., breakfast starts at 06:00
  available_until TIME,  -- e.g., breakfast ends at 11:00

  -- Soft delete
  deleted_at TIMESTAMPTZ,

  -- Constraints
  CONSTRAINT category_slug_format CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  CONSTRAINT unique_category_slug_per_org UNIQUE (organization_id, slug),
  CONSTRAINT no_self_reference CHECK (id != parent_id)
);

-- Indexes for categories
CREATE INDEX idx_categories_organization_id ON categories(organization_id);
CREATE INDEX idx_categories_parent_id ON categories(parent_id);
CREATE INDEX idx_categories_slug ON categories(organization_id, slug);
CREATE INDEX idx_categories_sort_order ON categories(organization_id, sort_order);
CREATE INDEX idx_categories_is_visible ON categories(organization_id, is_visible) WHERE is_visible = true;
CREATE INDEX idx_categories_not_deleted ON categories(organization_id) WHERE deleted_at IS NULL;

-- =====================================================
-- PRODUCTS TABLE
-- Menu items/products within categories
-- =====================================================

CREATE TABLE products (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Multi-tenant foreign key
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Category relationship
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Basic info
  name TEXT NOT NULL,
  slug TEXT NOT NULL,  -- URL-friendly identifier within organization
  description TEXT,
  short_description TEXT,  -- Brief description for list views (max 100 chars)

  -- Images (array of URLs, first is primary)
  image_urls JSONB DEFAULT '[]'::jsonb,

  -- Pricing (current price, historical in price_ledger)
  -- Note: This is the display price, official price history is in price_ledger table
  price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  compare_at_price DECIMAL(10, 2),  -- Original price for discounts/promotions

  -- Currency (inherits from organization but can override)
  currency TEXT NOT NULL DEFAULT 'TRY',

  -- Stock & availability
  status product_status NOT NULL DEFAULT 'active',
  is_available BOOLEAN NOT NULL DEFAULT true,  -- Quick toggle for availability
  stock_quantity INTEGER,  -- NULL means unlimited, number for limited stock

  -- Ordering
  sort_order INTEGER NOT NULL DEFAULT 0,  -- For drag-and-drop reordering within category

  -- Preparation
  preparation_time_minutes INTEGER,  -- Estimated prep time

  -- Dietary & allergens
  allergens allergen_type[] DEFAULT '{}',  -- Array of allergens
  is_vegetarian BOOLEAN NOT NULL DEFAULT false,
  is_vegan BOOLEAN NOT NULL DEFAULT false,
  is_gluten_free BOOLEAN NOT NULL DEFAULT false,
  is_spicy BOOLEAN NOT NULL DEFAULT false,
  spicy_level INTEGER DEFAULT 0 CHECK (spicy_level >= 0 AND spicy_level <= 5),

  -- Nutritional info (optional, stored as JSONB for flexibility)
  -- Format: { "calories": 500, "protein": 25, "carbs": 50, "fat": 20, "fiber": 5 }
  nutritional_info JSONB,

  -- Tags for filtering (e.g., "popular", "new", "chef-special")
  tags TEXT[] DEFAULT '{}',

  -- Featured/promoted
  is_featured BOOLEAN NOT NULL DEFAULT false,
  featured_until TIMESTAMPTZ,  -- Auto-remove from featured after date

  -- Custom attributes (flexible JSONB for restaurant-specific fields)
  -- Format: { "portions": "small/medium/large", "sides": ["rice", "bread"] }
  attributes JSONB DEFAULT '{}'::jsonb,

  -- SEO
  meta_title TEXT,
  meta_description TEXT,

  -- Soft delete
  deleted_at TIMESTAMPTZ,

  -- Constraints
  CONSTRAINT product_slug_format CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  CONSTRAINT unique_product_slug_per_org UNIQUE (organization_id, slug),
  CONSTRAINT price_positive CHECK (price >= 0),
  CONSTRAINT compare_price_positive CHECK (compare_at_price IS NULL OR compare_at_price >= 0),
  CONSTRAINT short_desc_length CHECK (short_description IS NULL OR char_length(short_description) <= 100)
);

-- Indexes for products
CREATE INDEX idx_products_organization_id ON products(organization_id);
CREATE INDEX idx_products_category_id ON products(category_id);
CREATE INDEX idx_products_slug ON products(organization_id, slug);
CREATE INDEX idx_products_sort_order ON products(organization_id, category_id, sort_order);
CREATE INDEX idx_products_status ON products(organization_id, status);
CREATE INDEX idx_products_is_available ON products(organization_id, is_available) WHERE is_available = true;
CREATE INDEX idx_products_is_featured ON products(organization_id, is_featured) WHERE is_featured = true;
CREATE INDEX idx_products_not_deleted ON products(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_products_price ON products(organization_id, price);
CREATE INDEX idx_products_tags ON products USING GIN (tags);
CREATE INDEX idx_products_allergens ON products USING GIN (allergens);

-- =====================================================
-- PRODUCT MODIFIERS (Options like size, extras)
-- =====================================================

CREATE TABLE product_modifiers (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Multi-tenant foreign key
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Product relationship
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Modifier group info
  name TEXT NOT NULL,  -- e.g., "Size", "Extras", "Sauce"
  description TEXT,

  -- Selection rules
  is_required BOOLEAN NOT NULL DEFAULT false,  -- Must select at least one
  min_selections INTEGER NOT NULL DEFAULT 0,
  max_selections INTEGER NOT NULL DEFAULT 1,  -- 1 = radio, >1 = checkboxes

  -- Ordering
  sort_order INTEGER NOT NULL DEFAULT 0,

  -- Visibility
  is_visible BOOLEAN NOT NULL DEFAULT true,

  -- Soft delete
  deleted_at TIMESTAMPTZ
);

-- Indexes for product_modifiers
CREATE INDEX idx_product_modifiers_organization_id ON product_modifiers(organization_id);
CREATE INDEX idx_product_modifiers_product_id ON product_modifiers(product_id);
CREATE INDEX idx_product_modifiers_sort_order ON product_modifiers(product_id, sort_order);
CREATE INDEX idx_product_modifiers_not_deleted ON product_modifiers(product_id) WHERE deleted_at IS NULL;

-- =====================================================
-- MODIFIER OPTIONS (Individual options within modifiers)
-- =====================================================

CREATE TABLE modifier_options (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Multi-tenant foreign key
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Modifier relationship
  modifier_id UUID NOT NULL REFERENCES product_modifiers(id) ON DELETE CASCADE,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Option info
  name TEXT NOT NULL,  -- e.g., "Small", "Medium", "Large"
  description TEXT,

  -- Pricing
  price_adjustment DECIMAL(10, 2) NOT NULL DEFAULT 0.00,  -- Additional cost

  -- Ordering
  sort_order INTEGER NOT NULL DEFAULT 0,

  -- Selection
  is_default BOOLEAN NOT NULL DEFAULT false,  -- Pre-selected option

  -- Visibility
  is_visible BOOLEAN NOT NULL DEFAULT true,
  is_available BOOLEAN NOT NULL DEFAULT true,

  -- Soft delete
  deleted_at TIMESTAMPTZ
);

-- Indexes for modifier_options
CREATE INDEX idx_modifier_options_organization_id ON modifier_options(organization_id);
CREATE INDEX idx_modifier_options_modifier_id ON modifier_options(modifier_id);
CREATE INDEX idx_modifier_options_sort_order ON modifier_options(modifier_id, sort_order);
CREATE INDEX idx_modifier_options_not_deleted ON modifier_options(modifier_id) WHERE deleted_at IS NULL;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Updated_at triggers for all menu tables
CREATE TRIGGER set_categories_updated_at
  BEFORE UPDATE ON categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_product_modifiers_updated_at
  BEFORE UPDATE ON product_modifiers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_modifier_options_updated_at
  BEFORE UPDATE ON modifier_options
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to get active (non-deleted) categories for an organization
CREATE OR REPLACE FUNCTION get_organization_categories(p_org_id UUID)
RETURNS TABLE (
  id UUID,
  name TEXT,
  slug TEXT,
  description TEXT,
  icon TEXT,
  image_url TEXT,
  parent_id UUID,
  sort_order INTEGER,
  is_visible BOOLEAN,
  product_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.name,
    c.slug,
    c.description,
    c.icon,
    c.image_url,
    c.parent_id,
    c.sort_order,
    c.is_visible,
    COUNT(p.id) FILTER (WHERE p.deleted_at IS NULL AND p.is_available = true)
  FROM categories c
  LEFT JOIN products p ON p.category_id = c.id
  WHERE c.organization_id = p_org_id
  AND c.deleted_at IS NULL
  GROUP BY c.id
  ORDER BY c.sort_order ASC, c.name ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get active products for a category
CREATE OR REPLACE FUNCTION get_category_products(p_category_id UUID)
RETURNS TABLE (
  id UUID,
  name TEXT,
  slug TEXT,
  description TEXT,
  short_description TEXT,
  image_urls JSONB,
  price DECIMAL,
  compare_at_price DECIMAL,
  status product_status,
  is_available BOOLEAN,
  sort_order INTEGER,
  is_featured BOOLEAN,
  allergens allergen_type[],
  is_vegetarian BOOLEAN,
  is_vegan BOOLEAN,
  is_gluten_free BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.name,
    p.slug,
    p.description,
    p.short_description,
    p.image_urls,
    p.price,
    p.compare_at_price,
    p.status,
    p.is_available,
    p.sort_order,
    p.is_featured,
    p.allergens,
    p.is_vegetarian,
    p.is_vegan,
    p.is_gluten_free
  FROM products p
  WHERE p.category_id = p_category_id
  AND p.deleted_at IS NULL
  ORDER BY p.sort_order ASC, p.name ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to soft delete a category (also hides products)
CREATE OR REPLACE FUNCTION soft_delete_category(p_category_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Soft delete the category
  UPDATE categories
  SET deleted_at = NOW()
  WHERE id = p_category_id;

  -- Optionally: Move products to uncategorized (null category)
  -- UPDATE products SET category_id = NULL WHERE category_id = p_category_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to soft delete a product
CREATE OR REPLACE FUNCTION soft_delete_product(p_product_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE products
  SET deleted_at = NOW()
  WHERE id = p_product_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to restore a soft-deleted category
CREATE OR REPLACE FUNCTION restore_category(p_category_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE categories
  SET deleted_at = NULL
  WHERE id = p_category_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to restore a soft-deleted product
CREATE OR REPLACE FUNCTION restore_product(p_product_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE products
  SET deleted_at = NULL
  WHERE id = p_product_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update category sort order (batch update)
CREATE OR REPLACE FUNCTION update_category_sort_order(
  p_org_id UUID,
  p_category_orders JSONB  -- Format: [{"id": "uuid", "sort_order": 0}, ...]
)
RETURNS VOID AS $$
DECLARE
  item JSONB;
BEGIN
  FOR item IN SELECT * FROM jsonb_array_elements(p_category_orders)
  LOOP
    UPDATE categories
    SET sort_order = (item->>'sort_order')::INTEGER
    WHERE id = (item->>'id')::UUID
    AND organization_id = p_org_id;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update product sort order (batch update)
CREATE OR REPLACE FUNCTION update_product_sort_order(
  p_org_id UUID,
  p_product_orders JSONB  -- Format: [{"id": "uuid", "sort_order": 0}, ...]
)
RETURNS VOID AS $$
DECLARE
  item JSONB;
BEGIN
  FOR item IN SELECT * FROM jsonb_array_elements(p_product_orders)
  LOOP
    UPDATE products
    SET sort_order = (item->>'sort_order')::INTEGER
    WHERE id = (item->>'id')::UUID
    AND organization_id = p_org_id;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- CRITICAL: Enable RLS on ALL tables
-- =====================================================

-- Enable RLS
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_modifiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE modifier_options ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES - Categories
-- =====================================================

-- Categories: Public can view visible categories for active organizations (QR menu)
CREATE POLICY "Public can view visible categories"
  ON categories
  FOR SELECT
  USING (
    is_visible = true
    AND deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM organizations o
      WHERE o.id = organization_id
      AND o.is_active = true
      AND o.deleted_at IS NULL
    )
  );

-- Categories: Organization members can view all categories (including hidden)
CREATE POLICY "Members can view all organization categories"
  ON categories
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM memberships
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Categories: Staff and above can create categories
CREATE POLICY "Staff can create categories"
  ON categories
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM memberships
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin', 'manager', 'staff')
      AND is_active = true
    )
  );

-- Categories: Staff and above can update categories
CREATE POLICY "Staff can update categories"
  ON categories
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM memberships
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin', 'manager', 'staff')
      AND is_active = true
    )
  );

-- Categories: Managers and above can delete categories
CREATE POLICY "Managers can delete categories"
  ON categories
  FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM memberships
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin', 'manager')
      AND is_active = true
    )
  );

-- =====================================================
-- RLS POLICIES - Products
-- =====================================================

-- Products: Public can view available products (QR menu)
CREATE POLICY "Public can view available products"
  ON products
  FOR SELECT
  USING (
    is_available = true
    AND status = 'active'
    AND deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM organizations o
      WHERE o.id = organization_id
      AND o.is_active = true
      AND o.deleted_at IS NULL
    )
  );

-- Products: Organization members can view all products
CREATE POLICY "Members can view all organization products"
  ON products
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM memberships
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Products: Staff and above can create products
CREATE POLICY "Staff can create products"
  ON products
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM memberships
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin', 'manager', 'staff')
      AND is_active = true
    )
  );

-- Products: Staff and above can update products
CREATE POLICY "Staff can update products"
  ON products
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM memberships
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin', 'manager', 'staff')
      AND is_active = true
    )
  );

-- Products: Managers and above can delete products
CREATE POLICY "Managers can delete products"
  ON products
  FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM memberships
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin', 'manager')
      AND is_active = true
    )
  );

-- =====================================================
-- RLS POLICIES - Product Modifiers
-- =====================================================

-- Modifiers: Public can view visible modifiers for available products
CREATE POLICY "Public can view product modifiers"
  ON product_modifiers
  FOR SELECT
  USING (
    is_visible = true
    AND deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM products p
      WHERE p.id = product_id
      AND p.is_available = true
      AND p.status = 'active'
      AND p.deleted_at IS NULL
    )
  );

-- Modifiers: Organization members can view all modifiers
CREATE POLICY "Members can view all organization modifiers"
  ON product_modifiers
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM memberships
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Modifiers: Staff and above can create modifiers
CREATE POLICY "Staff can create modifiers"
  ON product_modifiers
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM memberships
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin', 'manager', 'staff')
      AND is_active = true
    )
  );

-- Modifiers: Staff and above can update modifiers
CREATE POLICY "Staff can update modifiers"
  ON product_modifiers
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM memberships
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin', 'manager', 'staff')
      AND is_active = true
    )
  );

-- Modifiers: Managers and above can delete modifiers
CREATE POLICY "Managers can delete modifiers"
  ON product_modifiers
  FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM memberships
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin', 'manager')
      AND is_active = true
    )
  );

-- =====================================================
-- RLS POLICIES - Modifier Options
-- =====================================================

-- Options: Public can view visible options for visible modifiers
CREATE POLICY "Public can view modifier options"
  ON modifier_options
  FOR SELECT
  USING (
    is_visible = true
    AND deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM product_modifiers pm
      WHERE pm.id = modifier_id
      AND pm.is_visible = true
      AND pm.deleted_at IS NULL
    )
  );

-- Options: Organization members can view all options
CREATE POLICY "Members can view all organization options"
  ON modifier_options
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM memberships
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Options: Staff and above can create options
CREATE POLICY "Staff can create options"
  ON modifier_options
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM memberships
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin', 'manager', 'staff')
      AND is_active = true
    )
  );

-- Options: Staff and above can update options
CREATE POLICY "Staff can update options"
  ON modifier_options
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM memberships
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin', 'manager', 'staff')
      AND is_active = true
    )
  );

-- Options: Managers and above can delete options
CREATE POLICY "Managers can delete options"
  ON modifier_options
  FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM memberships
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin', 'manager')
      AND is_active = true
    )
  );

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE categories IS 'Menu categories for organizing products, supports nesting via parent_id';
COMMENT ON TABLE products IS 'Menu items/products with pricing, availability, and dietary information';
COMMENT ON TABLE product_modifiers IS 'Modifier groups for products (e.g., Size, Extras)';
COMMENT ON TABLE modifier_options IS 'Individual options within modifier groups';

COMMENT ON COLUMN categories.slug IS 'URL-friendly identifier unique within organization';
COMMENT ON COLUMN categories.sort_order IS 'Display order for drag-and-drop reordering';
COMMENT ON COLUMN categories.deleted_at IS 'Soft delete timestamp, NULL means not deleted';

COMMENT ON COLUMN products.slug IS 'URL-friendly identifier unique within organization';
COMMENT ON COLUMN products.sort_order IS 'Display order within category for drag-and-drop';
COMMENT ON COLUMN products.is_available IS 'Quick toggle for availability without changing status';
COMMENT ON COLUMN products.deleted_at IS 'Soft delete timestamp, NULL means not deleted';
COMMENT ON COLUMN products.price IS 'Current display price, official price history in price_ledger';
COMMENT ON COLUMN products.allergens IS 'Array of allergen types for dietary filtering';

COMMENT ON COLUMN product_modifiers.min_selections IS 'Minimum options customer must select';
COMMENT ON COLUMN product_modifiers.max_selections IS 'Maximum options customer can select (1=radio, >1=checkboxes)';

COMMENT ON COLUMN modifier_options.price_adjustment IS 'Additional cost when this option is selected';
COMMENT ON COLUMN modifier_options.is_default IS 'Pre-selected option when modifier is shown';
