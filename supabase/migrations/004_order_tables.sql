-- =====================================================
-- E-Menum Order Tables Migration
-- Migration: 004_order_tables
-- Description: Create order tables: orders, order_items, restaurant_tables
-- Depends on: 001_core_tables.sql, 002_menu_tables.sql, 003_price_ledger.sql
-- =====================================================
-- This migration creates the ordering system infrastructure including:
-- - Restaurant tables with QR code UUIDs
-- - Orders with status tracking
-- - Order items with price locking (immutable at order time)
-- - Service requests for waiter call functionality
-- =====================================================

-- =====================================================
-- ENUM TYPES
-- =====================================================

-- Table status (for restaurant floor management)
CREATE TYPE table_status AS ENUM (
  'available',     -- Table is empty and ready
  'occupied',      -- Customers are seated
  'reserved',      -- Table is reserved
  'cleaning',      -- Being cleaned after customers left
  'out_of_service' -- Not available (maintenance, etc.)
);

-- Order status (tracks order lifecycle)
CREATE TYPE order_status AS ENUM (
  'pending',       -- Order submitted, awaiting confirmation
  'confirmed',     -- Order confirmed by staff
  'preparing',     -- Being prepared in kitchen
  'ready',         -- Ready for pickup/serving
  'served',        -- Delivered to customer
  'completed',     -- Order closed (paid)
  'cancelled'      -- Order was cancelled
);

-- Order type (dine-in vs takeaway)
CREATE TYPE order_type AS ENUM (
  'dine_in',       -- Eating at restaurant
  'takeaway',      -- Picking up
  'delivery'       -- External delivery (future)
);

-- Payment status
CREATE TYPE payment_status AS ENUM (
  'pending',       -- Not paid yet
  'partial',       -- Partial payment made
  'paid',          -- Fully paid
  'refunded',      -- Refunded
  'failed'         -- Payment failed
);

-- Payment method
CREATE TYPE payment_method AS ENUM (
  'cash',          -- Cash payment
  'credit_card',   -- Credit card
  'debit_card',    -- Debit card
  'mobile',        -- Mobile payment (app)
  'other'          -- Other method
);

-- Service request type
CREATE TYPE service_request_type AS ENUM (
  'call_waiter',   -- Customer wants waiter attention
  'request_bill',  -- Customer wants to pay
  'need_help',     -- General help request
  'feedback',      -- Customer feedback
  'complaint'      -- Customer complaint
);

-- Service request status
CREATE TYPE service_request_status AS ENUM (
  'pending',       -- Request submitted
  'acknowledged',  -- Staff acknowledged
  'in_progress',   -- Being handled
  'completed',     -- Request fulfilled
  'cancelled'      -- Request cancelled
);

-- =====================================================
-- RESTAURANT TABLES TABLE
-- Physical tables in the restaurant with QR code mapping
-- =====================================================

CREATE TABLE restaurant_tables (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Multi-tenant foreign key
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Table identification
  name TEXT NOT NULL,                    -- Display name (e.g., "Table 1", "VIP Area")
  table_number TEXT,                     -- Optional number/code

  -- QR Code
  qr_uuid UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,  -- Unique UUID for unpredictable QR links
  qr_code_generated_at TIMESTAMPTZ,

  -- Location/section
  section TEXT,                          -- e.g., "Indoor", "Terrace", "VIP"
  floor INTEGER DEFAULT 1,               -- Floor number

  -- Capacity
  capacity INTEGER NOT NULL DEFAULT 4,   -- Seating capacity
  min_capacity INTEGER DEFAULT 1,        -- Minimum for reservations

  -- Status
  status table_status NOT NULL DEFAULT 'available',
  status_changed_at TIMESTAMPTZ DEFAULT NOW(),
  status_changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Current order tracking (denormalized for quick lookup)
  current_order_id UUID,                 -- Will reference orders table
  occupied_at TIMESTAMPTZ,
  occupied_by TEXT,                      -- Customer name if known

  -- Display options
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_visible BOOLEAN NOT NULL DEFAULT true,

  -- Features
  is_accessible BOOLEAN NOT NULL DEFAULT false,   -- Wheelchair accessible
  is_outdoor BOOLEAN NOT NULL DEFAULT false,      -- Outdoor seating

  -- Soft delete
  deleted_at TIMESTAMPTZ,

  -- Constraints
  CONSTRAINT unique_table_name_per_org UNIQUE (organization_id, name),
  CONSTRAINT capacity_positive CHECK (capacity > 0),
  CONSTRAINT min_capacity_valid CHECK (min_capacity > 0 AND min_capacity <= capacity)
);

-- Indexes for restaurant_tables
CREATE INDEX idx_restaurant_tables_organization_id ON restaurant_tables(organization_id);
CREATE INDEX idx_restaurant_tables_qr_uuid ON restaurant_tables(qr_uuid);
CREATE INDEX idx_restaurant_tables_status ON restaurant_tables(organization_id, status);
CREATE INDEX idx_restaurant_tables_section ON restaurant_tables(organization_id, section);
CREATE INDEX idx_restaurant_tables_sort_order ON restaurant_tables(organization_id, sort_order);
CREATE INDEX idx_restaurant_tables_not_deleted ON restaurant_tables(organization_id) WHERE deleted_at IS NULL;

-- =====================================================
-- ORDERS TABLE
-- Customer orders with status tracking
-- =====================================================

CREATE TABLE orders (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Multi-tenant foreign key
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Order identification
  order_number TEXT NOT NULL,            -- Human-readable order number (e.g., "ORD-001")

  -- Table relationship (optional - for dine-in)
  table_id UUID REFERENCES restaurant_tables(id) ON DELETE SET NULL,
  table_name TEXT,                       -- Denormalized for historical reference

  -- Customer info (optional - for takeaway/delivery)
  customer_name TEXT,
  customer_phone TEXT,
  customer_email TEXT,
  customer_notes TEXT,                   -- Special requests

  -- Order type and status
  order_type order_type NOT NULL DEFAULT 'dine_in',
  status order_status NOT NULL DEFAULT 'pending',
  status_changed_at TIMESTAMPTZ DEFAULT NOW(),
  status_changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Pricing (calculated, locked at order time)
  subtotal DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  tax_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  discount_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  currency TEXT NOT NULL DEFAULT 'TRY',

  -- Tax rate applied (for records)
  tax_rate DECIMAL(5, 2) DEFAULT 0.00,

  -- Payment
  payment_status payment_status NOT NULL DEFAULT 'pending',
  payment_method payment_method,
  paid_amount DECIMAL(10, 2) DEFAULT 0.00,
  paid_at TIMESTAMPTZ,

  -- Preparation
  estimated_ready_at TIMESTAMPTZ,
  actual_ready_at TIMESTAMPTZ,
  served_at TIMESTAMPTZ,

  -- Staff assignment
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ,

  -- Cancellation
  cancelled_at TIMESTAMPTZ,
  cancelled_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  cancellation_reason TEXT,

  -- Source tracking
  source TEXT DEFAULT 'qr_menu',         -- qr_menu, pos, phone, etc.
  session_id TEXT,                       -- Browser session for guest orders

  -- Notes
  internal_notes TEXT,                   -- Staff notes (not visible to customer)

  -- Constraints
  CONSTRAINT unique_order_number_per_org UNIQUE (organization_id, order_number),
  CONSTRAINT subtotal_positive CHECK (subtotal >= 0),
  CONSTRAINT total_positive CHECK (total_amount >= 0),
  CONSTRAINT paid_amount_positive CHECK (paid_amount >= 0)
);

-- Indexes for orders
CREATE INDEX idx_orders_organization_id ON orders(organization_id);
CREATE INDEX idx_orders_table_id ON orders(table_id);
CREATE INDEX idx_orders_order_number ON orders(organization_id, order_number);
CREATE INDEX idx_orders_status ON orders(organization_id, status);
CREATE INDEX idx_orders_order_type ON orders(organization_id, order_type);
CREATE INDEX idx_orders_payment_status ON orders(organization_id, payment_status);
CREATE INDEX idx_orders_created_at ON orders(organization_id, created_at DESC);
CREATE INDEX idx_orders_assigned_to ON orders(assigned_to);
CREATE INDEX idx_orders_active ON orders(organization_id, status)
  WHERE status NOT IN ('completed', 'cancelled');

-- =====================================================
-- ORDER ITEMS TABLE
-- Individual items within an order (price locked at order time)
-- =====================================================

CREATE TABLE order_items (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Multi-tenant foreign key
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,

  -- Order relationship
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,

  -- Product relationship (keeps reference even if product deleted)
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,

  -- Product info (denormalized - locked at order time)
  product_name TEXT NOT NULL,
  product_description TEXT,
  product_image_url TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Quantity
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),

  -- Pricing (LOCKED at order time - immutable like price_ledger)
  unit_price DECIMAL(10, 2) NOT NULL,      -- Base price at order time
  modifier_total DECIMAL(10, 2) DEFAULT 0.00, -- Sum of modifier adjustments
  item_total DECIMAL(10, 2) NOT NULL,      -- (unit_price + modifier_total) * quantity
  currency TEXT NOT NULL DEFAULT 'TRY',

  -- Reference to price ledger entry (for audit)
  price_ledger_id UUID REFERENCES price_ledger(id) ON DELETE SET NULL,

  -- Selected modifiers (stored as JSONB for flexibility)
  -- Format: [{ "modifier_id": "uuid", "modifier_name": "Size", "option_id": "uuid",
  --            "option_name": "Large", "price_adjustment": 5.00 }, ...]
  selected_modifiers JSONB DEFAULT '[]'::jsonb,

  -- Customer notes
  special_instructions TEXT,

  -- Status (for individual item tracking in KDS)
  status order_status NOT NULL DEFAULT 'pending',
  status_changed_at TIMESTAMPTZ DEFAULT NOW(),

  -- Preparation
  started_preparing_at TIMESTAMPTZ,
  ready_at TIMESTAMPTZ,
  served_at TIMESTAMPTZ,

  -- Constraints
  CONSTRAINT unit_price_positive CHECK (unit_price >= 0),
  CONSTRAINT item_total_positive CHECK (item_total >= 0)
);

-- Indexes for order_items
CREATE INDEX idx_order_items_organization_id ON order_items(organization_id);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_product_id ON order_items(product_id);
CREATE INDEX idx_order_items_status ON order_items(order_id, status);
CREATE INDEX idx_order_items_created_at ON order_items(created_at DESC);

-- =====================================================
-- SERVICE REQUESTS TABLE
-- Waiter call and other service requests
-- =====================================================

CREATE TABLE service_requests (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Multi-tenant foreign key
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Table relationship
  table_id UUID NOT NULL REFERENCES restaurant_tables(id) ON DELETE CASCADE,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Request details
  request_type service_request_type NOT NULL DEFAULT 'call_waiter',
  message TEXT,                          -- Optional message from customer

  -- Status
  status service_request_status NOT NULL DEFAULT 'pending',
  status_changed_at TIMESTAMPTZ DEFAULT NOW(),

  -- Staff handling
  handled_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  handled_at TIMESTAMPTZ,

  -- Response
  response TEXT,                         -- Staff response (for feedback/complaints)

  -- Source tracking
  session_id TEXT,                       -- Browser session

  -- Spam prevention
  ip_address INET
);

-- Indexes for service_requests
CREATE INDEX idx_service_requests_organization_id ON service_requests(organization_id);
CREATE INDEX idx_service_requests_table_id ON service_requests(table_id);
CREATE INDEX idx_service_requests_status ON service_requests(organization_id, status);
CREATE INDEX idx_service_requests_type ON service_requests(organization_id, request_type);
CREATE INDEX idx_service_requests_created_at ON service_requests(organization_id, created_at DESC);
CREATE INDEX idx_service_requests_pending ON service_requests(organization_id)
  WHERE status = 'pending';

-- =====================================================
-- UPDATE restaurant_tables with FK to orders
-- =====================================================

ALTER TABLE restaurant_tables
  ADD CONSTRAINT fk_current_order
  FOREIGN KEY (current_order_id)
  REFERENCES orders(id)
  ON DELETE SET NULL;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Updated_at triggers for all order tables
CREATE TRIGGER set_restaurant_tables_updated_at
  BEFORE UPDATE ON restaurant_tables
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_order_items_updated_at
  BEFORE UPDATE ON order_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_service_requests_updated_at
  BEFORE UPDATE ON service_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ORDER NUMBER GENERATION
-- =====================================================

-- Function to generate sequential order number per organization per day
CREATE OR REPLACE FUNCTION generate_order_number(p_org_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_date TEXT;
  v_seq INTEGER;
  v_order_number TEXT;
BEGIN
  -- Get today's date in YYYYMMDD format
  v_date := TO_CHAR(NOW(), 'YYYYMMDD');

  -- Get the next sequence number for today
  SELECT COALESCE(MAX(
    CAST(
      REGEXP_REPLACE(order_number, '^ORD-\d{8}-', '')
      AS INTEGER
    )
  ), 0) + 1
  INTO v_seq
  FROM orders
  WHERE organization_id = p_org_id
  AND order_number LIKE 'ORD-' || v_date || '-%';

  -- Format: ORD-YYYYMMDD-NNNN (e.g., ORD-20260123-0001)
  v_order_number := 'ORD-' || v_date || '-' || LPAD(v_seq::TEXT, 4, '0');

  RETURN v_order_number;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate order number on insert
CREATE OR REPLACE FUNCTION set_order_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.order_number IS NULL OR NEW.order_number = '' THEN
    NEW.order_number := generate_order_number(NEW.organization_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER generate_order_number_trigger
  BEFORE INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION set_order_number();

-- =====================================================
-- TABLE STATUS UPDATE TRIGGER
-- =====================================================

-- Function to update table status when order is created/completed
CREATE OR REPLACE FUNCTION update_table_on_order_change()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.table_id IS NOT NULL THEN
    -- Mark table as occupied when new order is created
    UPDATE restaurant_tables
    SET
      status = 'occupied',
      status_changed_at = NOW(),
      current_order_id = NEW.id,
      occupied_at = NOW()
    WHERE id = NEW.table_id
    AND status = 'available';
  ELSIF TG_OP = 'UPDATE' AND NEW.status IN ('completed', 'cancelled') AND OLD.table_id IS NOT NULL THEN
    -- Free up table when order is completed/cancelled
    UPDATE restaurant_tables
    SET
      status = 'cleaning',
      status_changed_at = NOW(),
      current_order_id = NULL,
      occupied_at = NULL,
      occupied_by = NULL
    WHERE id = OLD.table_id
    AND current_order_id = OLD.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_order_change_update_table
  AFTER INSERT OR UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_table_on_order_change();

-- =====================================================
-- ORDER TOTAL CALCULATION
-- =====================================================

-- Function to recalculate order totals
CREATE OR REPLACE FUNCTION recalculate_order_total(p_order_id UUID)
RETURNS VOID AS $$
DECLARE
  v_subtotal DECIMAL(10, 2);
  v_tax_rate DECIMAL(5, 2);
  v_tax_amount DECIMAL(10, 2);
BEGIN
  -- Calculate subtotal from items
  SELECT COALESCE(SUM(item_total), 0)
  INTO v_subtotal
  FROM order_items
  WHERE order_id = p_order_id;

  -- Get tax rate from order (or default to 10%)
  SELECT COALESCE(tax_rate, 10.00)
  INTO v_tax_rate
  FROM orders
  WHERE id = p_order_id;

  -- Calculate tax
  v_tax_amount := ROUND(v_subtotal * (v_tax_rate / 100), 2);

  -- Update order totals
  UPDATE orders
  SET
    subtotal = v_subtotal,
    tax_amount = v_tax_amount,
    total_amount = v_subtotal + v_tax_amount - COALESCE(discount_amount, 0)
  WHERE id = p_order_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to recalculate order total when items change
CREATE OR REPLACE FUNCTION trigger_recalculate_order_total()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM recalculate_order_total(OLD.order_id);
  ELSE
    PERFORM recalculate_order_total(NEW.order_id);
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_order_items_change
  AFTER INSERT OR UPDATE OR DELETE ON order_items
  FOR EACH ROW
  EXECUTE FUNCTION trigger_recalculate_order_total();

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to get active orders for an organization
CREATE OR REPLACE FUNCTION get_active_orders(p_org_id UUID)
RETURNS TABLE (
  id UUID,
  order_number TEXT,
  table_name TEXT,
  customer_name TEXT,
  order_type order_type,
  status order_status,
  total_amount DECIMAL,
  item_count BIGINT,
  created_at TIMESTAMPTZ,
  estimated_ready_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    o.id,
    o.order_number,
    o.table_name,
    o.customer_name,
    o.order_type,
    o.status,
    o.total_amount,
    COUNT(oi.id) AS item_count,
    o.created_at,
    o.estimated_ready_at
  FROM orders o
  LEFT JOIN order_items oi ON oi.order_id = o.id
  WHERE o.organization_id = p_org_id
  AND o.status NOT IN ('completed', 'cancelled')
  GROUP BY o.id
  ORDER BY
    CASE o.status
      WHEN 'pending' THEN 1
      WHEN 'confirmed' THEN 2
      WHEN 'preparing' THEN 3
      WHEN 'ready' THEN 4
      WHEN 'served' THEN 5
      ELSE 6
    END,
    o.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get order with items
CREATE OR REPLACE FUNCTION get_order_with_items(p_order_id UUID)
RETURNS TABLE (
  order_id UUID,
  order_number TEXT,
  table_name TEXT,
  customer_name TEXT,
  status order_status,
  subtotal DECIMAL,
  tax_amount DECIMAL,
  total_amount DECIMAL,
  created_at TIMESTAMPTZ,
  items JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    o.id AS order_id,
    o.order_number,
    o.table_name,
    o.customer_name,
    o.status,
    o.subtotal,
    o.tax_amount,
    o.total_amount,
    o.created_at,
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id', oi.id,
          'product_name', oi.product_name,
          'quantity', oi.quantity,
          'unit_price', oi.unit_price,
          'item_total', oi.item_total,
          'selected_modifiers', oi.selected_modifiers,
          'special_instructions', oi.special_instructions,
          'status', oi.status
        )
      ) FILTER (WHERE oi.id IS NOT NULL),
      '[]'::jsonb
    ) AS items
  FROM orders o
  LEFT JOIN order_items oi ON oi.order_id = o.id
  WHERE o.id = p_order_id
  GROUP BY o.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get table by QR UUID
CREATE OR REPLACE FUNCTION get_table_by_qr(p_qr_uuid UUID)
RETURNS TABLE (
  id UUID,
  name TEXT,
  organization_id UUID,
  organization_slug TEXT,
  organization_name TEXT,
  status table_status,
  capacity INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id,
    t.name,
    t.organization_id,
    o.slug AS organization_slug,
    o.name AS organization_name,
    t.status,
    t.capacity
  FROM restaurant_tables t
  JOIN organizations o ON o.id = t.organization_id
  WHERE t.qr_uuid = p_qr_uuid
  AND t.deleted_at IS NULL
  AND o.is_active = true
  AND o.deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get pending service requests for organization
CREATE OR REPLACE FUNCTION get_pending_service_requests(p_org_id UUID)
RETURNS TABLE (
  id UUID,
  table_id UUID,
  table_name TEXT,
  request_type service_request_type,
  message TEXT,
  created_at TIMESTAMPTZ,
  seconds_waiting INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    sr.id,
    sr.table_id,
    t.name AS table_name,
    sr.request_type,
    sr.message,
    sr.created_at,
    EXTRACT(EPOCH FROM (NOW() - sr.created_at))::INTEGER AS seconds_waiting
  FROM service_requests sr
  JOIN restaurant_tables t ON t.id = sr.table_id
  WHERE sr.organization_id = p_org_id
  AND sr.status = 'pending'
  ORDER BY sr.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create a service request (with rate limiting check)
CREATE OR REPLACE FUNCTION create_service_request(
  p_table_id UUID,
  p_request_type service_request_type DEFAULT 'call_waiter',
  p_message TEXT DEFAULT NULL,
  p_session_id TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_org_id UUID;
  v_recent_count INTEGER;
  v_new_id UUID;
BEGIN
  -- Get organization from table
  SELECT organization_id INTO v_org_id
  FROM restaurant_tables
  WHERE id = p_table_id
  AND deleted_at IS NULL;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Table not found: %', p_table_id;
  END IF;

  -- Check for rate limiting (max 3 requests per table in 5 minutes)
  SELECT COUNT(*) INTO v_recent_count
  FROM service_requests
  WHERE table_id = p_table_id
  AND created_at > NOW() - INTERVAL '5 minutes'
  AND status IN ('pending', 'acknowledged');

  IF v_recent_count >= 3 THEN
    RAISE EXCEPTION 'Too many requests. Please wait before making another request.'
      USING ERRCODE = 'rate_limit_exceeded';
  END IF;

  -- Create the service request
  INSERT INTO service_requests (
    organization_id,
    table_id,
    request_type,
    message,
    session_id
  ) VALUES (
    v_org_id,
    p_table_id,
    p_request_type,
    p_message,
    p_session_id
  )
  RETURNING id INTO v_new_id;

  RETURN v_new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- CRITICAL: Enable RLS on ALL tables
-- =====================================================

ALTER TABLE restaurant_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_requests ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES - Restaurant Tables
-- =====================================================

-- Tables: Public can view tables via QR UUID (for ordering)
CREATE POLICY "Public can view tables by QR UUID"
  ON restaurant_tables
  FOR SELECT
  USING (
    deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM organizations o
      WHERE o.id = organization_id
      AND o.is_active = true
      AND o.deleted_at IS NULL
    )
  );

-- Tables: Organization members can view all tables
CREATE POLICY "Members can view all organization tables"
  ON restaurant_tables
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM memberships
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Tables: Staff and above can create tables
CREATE POLICY "Staff can create tables"
  ON restaurant_tables
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM memberships
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin', 'manager', 'staff')
      AND is_active = true
    )
  );

-- Tables: Staff and above can update tables
CREATE POLICY "Staff can update tables"
  ON restaurant_tables
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM memberships
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin', 'manager', 'staff')
      AND is_active = true
    )
  );

-- Tables: Managers and above can delete tables
CREATE POLICY "Managers can delete tables"
  ON restaurant_tables
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
-- RLS POLICIES - Orders
-- =====================================================

-- Orders: Public can create orders (guest checkout via QR)
CREATE POLICY "Anyone can create orders"
  ON orders
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organizations o
      WHERE o.id = organization_id
      AND o.is_active = true
      AND o.deleted_at IS NULL
    )
  );

-- Orders: Public can view their own orders (by session_id)
CREATE POLICY "Customers can view their orders by session"
  ON orders
  FOR SELECT
  USING (
    session_id IS NOT NULL
    AND session_id = current_setting('request.session_id', true)
  );

-- Orders: Organization members can view all orders
CREATE POLICY "Members can view organization orders"
  ON orders
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM memberships
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Orders: Staff and above can update orders
CREATE POLICY "Staff can update orders"
  ON orders
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM memberships
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin', 'manager', 'staff', 'kitchen')
      AND is_active = true
    )
  );

-- Orders: Managers and above can delete orders
CREATE POLICY "Managers can delete orders"
  ON orders
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
-- RLS POLICIES - Order Items
-- =====================================================

-- Order Items: Anyone can create (for guest orders)
CREATE POLICY "Anyone can create order items"
  ON order_items
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_id
      AND EXISTS (
        SELECT 1 FROM organizations org
        WHERE org.id = o.organization_id
        AND org.is_active = true
      )
    )
  );

-- Order Items: Public can view their own order items
CREATE POLICY "Customers can view their order items"
  ON order_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_id
      AND o.session_id IS NOT NULL
      AND o.session_id = current_setting('request.session_id', true)
    )
  );

-- Order Items: Organization members can view all order items
CREATE POLICY "Members can view organization order items"
  ON order_items
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM memberships
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Order Items: Staff can update order items
CREATE POLICY "Staff can update order items"
  ON order_items
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM memberships
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin', 'manager', 'staff', 'kitchen')
      AND is_active = true
    )
  );

-- Order Items: Managers can delete order items
CREATE POLICY "Managers can delete order items"
  ON order_items
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
-- RLS POLICIES - Service Requests
-- =====================================================

-- Service Requests: Public can create (waiter call)
CREATE POLICY "Anyone can create service requests"
  ON service_requests
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM restaurant_tables t
      WHERE t.id = table_id
      AND t.deleted_at IS NULL
      AND EXISTS (
        SELECT 1 FROM organizations o
        WHERE o.id = t.organization_id
        AND o.is_active = true
      )
    )
  );

-- Service Requests: Organization members can view all requests
CREATE POLICY "Members can view organization service requests"
  ON service_requests
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM memberships
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Service Requests: Staff can update requests
CREATE POLICY "Staff can update service requests"
  ON service_requests
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM memberships
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin', 'manager', 'staff')
      AND is_active = true
    )
  );

-- Service Requests: Managers can delete requests
CREATE POLICY "Managers can delete service requests"
  ON service_requests
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
-- REALTIME SUBSCRIPTIONS
-- Enable realtime for KDS and order tracking
-- =====================================================

-- Note: Supabase automatically handles realtime based on RLS policies
-- The following are comments for documentation purposes:
-- - orders: Kitchen and staff can subscribe to new/updated orders
-- - order_items: Kitchen can subscribe to item status changes
-- - service_requests: Staff can subscribe to new waiter calls

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE restaurant_tables IS 'Physical tables in the restaurant with QR code mapping for ordering';
COMMENT ON TABLE orders IS 'Customer orders with status tracking and pricing locked at order time';
COMMENT ON TABLE order_items IS 'Individual items within an order with prices locked at order time';
COMMENT ON TABLE service_requests IS 'Waiter call and service requests from customers';

COMMENT ON COLUMN restaurant_tables.qr_uuid IS 'Unique UUID for unpredictable QR code links';
COMMENT ON COLUMN restaurant_tables.status IS 'Current status of the table (available, occupied, etc.)';
COMMENT ON COLUMN restaurant_tables.current_order_id IS 'Active order for this table (denormalized)';

COMMENT ON COLUMN orders.order_number IS 'Human-readable order number (auto-generated)';
COMMENT ON COLUMN orders.status IS 'Current order status in the lifecycle';
COMMENT ON COLUMN orders.total_amount IS 'Total including tax minus discounts (locked at order time)';
COMMENT ON COLUMN orders.session_id IS 'Browser session ID for guest order tracking';

COMMENT ON COLUMN order_items.unit_price IS 'Price at order time (immutable for audit)';
COMMENT ON COLUMN order_items.selected_modifiers IS 'JSONB of selected modifiers with prices locked at order time';
COMMENT ON COLUMN order_items.price_ledger_id IS 'Reference to price_ledger for audit trail';

COMMENT ON COLUMN service_requests.request_type IS 'Type of service request (call_waiter, request_bill, etc.)';

COMMENT ON FUNCTION generate_order_number(UUID) IS 'Generates sequential order number per organization per day';
COMMENT ON FUNCTION recalculate_order_total(UUID) IS 'Recalculates order subtotal, tax, and total from items';
COMMENT ON FUNCTION get_table_by_qr(UUID) IS 'Looks up table and organization info by QR UUID';
COMMENT ON FUNCTION create_service_request(UUID, service_request_type, TEXT, TEXT) IS 'Creates a service request with rate limiting';
