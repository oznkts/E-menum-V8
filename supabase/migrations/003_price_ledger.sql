-- =====================================================
-- E-Menum Price Ledger Migration
-- Migration: 003_price_ledger
-- Description: Create immutable price_ledger table with protection triggers
-- Depends on: 001_core_tables.sql, 002_menu_tables.sql
-- =====================================================
-- CRITICAL: This table is IMMUTABLE for Turkish regulatory compliance.
-- Price changes create new entries - NO UPDATE or DELETE allowed.
-- Full audit trail with timestamps and user attribution.
-- =====================================================

-- =====================================================
-- ENUM TYPES
-- =====================================================

-- Price change reason types
CREATE TYPE price_change_reason AS ENUM (
  'initial',          -- Initial price when product is created
  'price_increase',   -- Regular price increase
  'price_decrease',   -- Regular price decrease
  'promotion',        -- Promotional price change
  'correction',       -- Correction of previous entry (with note)
  'seasonal',         -- Seasonal price adjustment
  'cost_adjustment',  -- Due to ingredient cost changes
  'tax_change',       -- Due to tax rate changes
  'other'             -- Other reason (specify in notes)
);

-- =====================================================
-- PRICE LEDGER TABLE
-- Immutable audit trail for all price changes
-- CRITICAL: INSERT-only. DB trigger prevents UPDATE/DELETE.
-- =====================================================

CREATE TABLE price_ledger (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Multi-tenant foreign key
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,

  -- Product relationship (RESTRICT delete to preserve history)
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,

  -- Price information
  price DECIMAL(10, 2) NOT NULL CHECK (price >= 0),
  currency TEXT NOT NULL DEFAULT 'TRY',

  -- Previous price (for quick reference, denormalized)
  previous_price DECIMAL(10, 2),

  -- Change reason and notes
  reason price_change_reason NOT NULL DEFAULT 'initial',
  notes TEXT,  -- Optional notes explaining the change

  -- Effective date/time
  effective_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Audit information
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Additional metadata for compliance
  ip_address INET,  -- IP address of user making the change
  user_agent TEXT,  -- Browser/client info

  -- Constraints
  CONSTRAINT price_positive CHECK (price >= 0),
  CONSTRAINT previous_price_positive CHECK (previous_price IS NULL OR previous_price >= 0)
);

-- =====================================================
-- INDEXES
-- =====================================================

-- Primary lookup indexes
CREATE INDEX idx_price_ledger_organization_id ON price_ledger(organization_id);
CREATE INDEX idx_price_ledger_product_id ON price_ledger(product_id);

-- For getting current price (latest entry for product)
CREATE INDEX idx_price_ledger_product_effective ON price_ledger(product_id, effective_from DESC);

-- For getting price at specific date
CREATE INDEX idx_price_ledger_effective_from ON price_ledger(organization_id, effective_from DESC);

-- For filtering by reason
CREATE INDEX idx_price_ledger_reason ON price_ledger(organization_id, reason);

-- For audit queries by user
CREATE INDEX idx_price_ledger_created_by ON price_ledger(created_by, created_at DESC);

-- For date range queries
CREATE INDEX idx_price_ledger_created_at ON price_ledger(organization_id, created_at DESC);

-- =====================================================
-- IMMUTABILITY PROTECTION - CRITICAL
-- These triggers prevent ANY modification to existing entries
-- =====================================================

-- Function to prevent UPDATE operations on price_ledger
CREATE OR REPLACE FUNCTION prevent_price_ledger_update()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Price ledger entries cannot be modified. Create a new entry instead. (Turkish regulatory compliance)'
    USING HINT = 'INSERT a new price_ledger entry with reason "correction" if you need to adjust a price.',
          ERRCODE = 'restrict_violation';
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to prevent DELETE operations on price_ledger
CREATE OR REPLACE FUNCTION prevent_price_ledger_delete()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Price ledger entries cannot be deleted. Price history must be preserved. (Turkish regulatory compliance)'
    USING HINT = 'Price history is immutable for regulatory compliance. Contact system administrator if data removal is legally required.',
          ERRCODE = 'restrict_violation';
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to block UPDATE operations
CREATE TRIGGER no_price_ledger_update
  BEFORE UPDATE ON price_ledger
  FOR EACH ROW
  EXECUTE FUNCTION prevent_price_ledger_update();

-- Trigger to block DELETE operations
CREATE TRIGGER no_price_ledger_delete
  BEFORE DELETE ON price_ledger
  FOR EACH ROW
  EXECUTE FUNCTION prevent_price_ledger_delete();

-- =====================================================
-- AUTOMATIC PRICE LEDGER ENTRY ON PRODUCT CREATION
-- =====================================================

-- Function to create initial price ledger entry when product is created
CREATE OR REPLACE FUNCTION create_initial_price_entry()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create entry if price is set (not 0)
  IF NEW.price IS NOT NULL AND NEW.price > 0 THEN
    INSERT INTO price_ledger (
      organization_id,
      product_id,
      price,
      currency,
      previous_price,
      reason,
      notes,
      effective_from,
      created_by,
      created_at
    ) VALUES (
      NEW.organization_id,
      NEW.id,
      NEW.price,
      NEW.currency,
      NULL,  -- No previous price for initial entry
      'initial',
      'Initial price set at product creation',
      NOW(),
      auth.uid(),
      NOW()
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create initial price entry on product insert
CREATE TRIGGER on_product_created_price_ledger
  AFTER INSERT ON products
  FOR EACH ROW
  EXECUTE FUNCTION create_initial_price_entry();

-- =====================================================
-- AUTOMATIC PRICE LEDGER ENTRY ON PRICE UPDATE
-- =====================================================

-- Function to log price changes when product price is updated
CREATE OR REPLACE FUNCTION log_price_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log if price actually changed
  IF OLD.price IS DISTINCT FROM NEW.price THEN
    INSERT INTO price_ledger (
      organization_id,
      product_id,
      price,
      currency,
      previous_price,
      reason,
      notes,
      effective_from,
      created_by,
      created_at
    ) VALUES (
      NEW.organization_id,
      NEW.id,
      NEW.price,
      NEW.currency,
      OLD.price,
      CASE
        WHEN NEW.price > OLD.price THEN 'price_increase'
        WHEN NEW.price < OLD.price THEN 'price_decrease'
        ELSE 'correction'
      END,
      'Price updated from ' || OLD.price || ' to ' || NEW.price,
      NOW(),
      auth.uid(),
      NOW()
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to log price changes on product update
CREATE TRIGGER on_product_price_change
  AFTER UPDATE OF price ON products
  FOR EACH ROW
  EXECUTE FUNCTION log_price_change();

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to get current price for a product (latest entry)
CREATE OR REPLACE FUNCTION get_current_price(p_product_id UUID)
RETURNS TABLE (
  price DECIMAL(10, 2),
  currency TEXT,
  effective_from TIMESTAMPTZ,
  previous_price DECIMAL(10, 2),
  reason price_change_reason
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    pl.price,
    pl.currency,
    pl.effective_from,
    pl.previous_price,
    pl.reason
  FROM price_ledger pl
  WHERE pl.product_id = p_product_id
  ORDER BY pl.effective_from DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get price at a specific point in time
CREATE OR REPLACE FUNCTION get_price_at_time(
  p_product_id UUID,
  p_at_time TIMESTAMPTZ
)
RETURNS TABLE (
  price DECIMAL(10, 2),
  currency TEXT,
  effective_from TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    pl.price,
    pl.currency,
    pl.effective_from
  FROM price_ledger pl
  WHERE pl.product_id = p_product_id
  AND pl.effective_from <= p_at_time
  ORDER BY pl.effective_from DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get price history for a product
CREATE OR REPLACE FUNCTION get_price_history(
  p_product_id UUID,
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  price DECIMAL(10, 2),
  currency TEXT,
  previous_price DECIMAL(10, 2),
  reason price_change_reason,
  notes TEXT,
  effective_from TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    pl.id,
    pl.price,
    pl.currency,
    pl.previous_price,
    pl.reason,
    pl.notes,
    pl.effective_from,
    pl.created_by,
    pl.created_at
  FROM price_ledger pl
  WHERE pl.product_id = p_product_id
  ORDER BY pl.effective_from DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get price changes for an organization within date range
CREATE OR REPLACE FUNCTION get_organization_price_changes(
  p_org_id UUID,
  p_from_date TIMESTAMPTZ DEFAULT (NOW() - INTERVAL '30 days'),
  p_to_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (
  id UUID,
  product_id UUID,
  product_name TEXT,
  price DECIMAL(10, 2),
  previous_price DECIMAL(10, 2),
  price_change DECIMAL(10, 2),
  change_percentage DECIMAL(5, 2),
  reason price_change_reason,
  effective_from TIMESTAMPTZ,
  created_by UUID
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    pl.id,
    pl.product_id,
    p.name AS product_name,
    pl.price,
    pl.previous_price,
    (pl.price - COALESCE(pl.previous_price, 0)) AS price_change,
    CASE
      WHEN pl.previous_price IS NULL OR pl.previous_price = 0 THEN NULL
      ELSE ROUND(((pl.price - pl.previous_price) / pl.previous_price * 100)::DECIMAL, 2)
    END AS change_percentage,
    pl.reason,
    pl.effective_from,
    pl.created_by
  FROM price_ledger pl
  JOIN products p ON p.id = pl.product_id
  WHERE pl.organization_id = p_org_id
  AND pl.effective_from >= p_from_date
  AND pl.effective_from <= p_to_date
  ORDER BY pl.effective_from DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to manually create a price ledger entry (with audit info)
CREATE OR REPLACE FUNCTION create_price_entry(
  p_product_id UUID,
  p_price DECIMAL(10, 2),
  p_reason price_change_reason DEFAULT 'other',
  p_notes TEXT DEFAULT NULL,
  p_effective_from TIMESTAMPTZ DEFAULT NOW()
)
RETURNS UUID AS $$
DECLARE
  v_org_id UUID;
  v_currency TEXT;
  v_prev_price DECIMAL(10, 2);
  v_new_id UUID;
BEGIN
  -- Get organization_id and currency from product
  SELECT organization_id, currency, price
  INTO v_org_id, v_currency, v_prev_price
  FROM products
  WHERE id = p_product_id;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Product not found: %', p_product_id;
  END IF;

  -- Insert the price ledger entry
  INSERT INTO price_ledger (
    organization_id,
    product_id,
    price,
    currency,
    previous_price,
    reason,
    notes,
    effective_from,
    created_by,
    created_at
  ) VALUES (
    v_org_id,
    p_product_id,
    p_price,
    v_currency,
    v_prev_price,
    p_reason,
    p_notes,
    p_effective_from,
    auth.uid(),
    NOW()
  )
  RETURNING id INTO v_new_id;

  -- Update the product's display price
  UPDATE products
  SET price = p_price
  WHERE id = p_product_id;

  RETURN v_new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- CRITICAL: Enable RLS on price_ledger
-- =====================================================

ALTER TABLE price_ledger ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES - Price Ledger
-- Note: Only SELECT and INSERT policies - no UPDATE/DELETE (blocked by trigger)
-- =====================================================

-- Price Ledger: Public can view price history for public products (transparency)
CREATE POLICY "Public can view product price history"
  ON price_ledger
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM products p
      WHERE p.id = product_id
      AND p.is_available = true
      AND p.status = 'active'
      AND p.deleted_at IS NULL
      AND EXISTS (
        SELECT 1 FROM organizations o
        WHERE o.id = p.organization_id
        AND o.is_active = true
        AND o.deleted_at IS NULL
      )
    )
  );

-- Price Ledger: Organization members can view all price history
CREATE POLICY "Members can view organization price history"
  ON price_ledger
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM memberships
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Price Ledger: Staff and above can create price entries
-- (Normally done automatically via triggers, but manual entries allowed)
CREATE POLICY "Staff can create price entries"
  ON price_ledger
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM memberships
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin', 'manager', 'staff')
      AND is_active = true
    )
  );

-- NOTE: No UPDATE or DELETE policies needed - triggers block these operations

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE price_ledger IS 'IMMUTABLE price change audit trail for Turkish regulatory compliance. INSERT-only table.';

COMMENT ON COLUMN price_ledger.id IS 'Unique identifier for the price entry';
COMMENT ON COLUMN price_ledger.organization_id IS 'Multi-tenant organization reference';
COMMENT ON COLUMN price_ledger.product_id IS 'Reference to the product (RESTRICT delete to preserve history)';
COMMENT ON COLUMN price_ledger.price IS 'New price at effective_from time';
COMMENT ON COLUMN price_ledger.currency IS 'Currency code (default TRY)';
COMMENT ON COLUMN price_ledger.previous_price IS 'Previous price before this change (denormalized for quick reference)';
COMMENT ON COLUMN price_ledger.reason IS 'Reason for the price change';
COMMENT ON COLUMN price_ledger.notes IS 'Optional notes explaining the price change';
COMMENT ON COLUMN price_ledger.effective_from IS 'When this price becomes/became effective';
COMMENT ON COLUMN price_ledger.created_by IS 'User who created this entry (audit)';
COMMENT ON COLUMN price_ledger.created_at IS 'When this entry was created (audit)';
COMMENT ON COLUMN price_ledger.ip_address IS 'IP address for audit trail';
COMMENT ON COLUMN price_ledger.user_agent IS 'Client info for audit trail';

COMMENT ON FUNCTION prevent_price_ledger_update() IS 'CRITICAL: Blocks UPDATE operations on price_ledger for immutability';
COMMENT ON FUNCTION prevent_price_ledger_delete() IS 'CRITICAL: Blocks DELETE operations on price_ledger for immutability';
COMMENT ON FUNCTION get_current_price(UUID) IS 'Returns the current (latest) price for a product';
COMMENT ON FUNCTION get_price_at_time(UUID, TIMESTAMPTZ) IS 'Returns the price that was effective at a specific point in time';
COMMENT ON FUNCTION get_price_history(UUID, INTEGER) IS 'Returns the price change history for a product';
COMMENT ON FUNCTION get_organization_price_changes(UUID, TIMESTAMPTZ, TIMESTAMPTZ) IS 'Returns all price changes for an organization within a date range';
COMMENT ON FUNCTION create_price_entry(UUID, DECIMAL, price_change_reason, TEXT, TIMESTAMPTZ) IS 'Manually creates a price ledger entry with proper audit info';
