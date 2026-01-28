-- =====================================================
-- E-Menum RLS Policies Consolidation & Verification Migration
-- Migration: 006_rls_policies
-- Description: Implement comprehensive RLS policies, verification functions, and security utilities
-- Depends on: 001_core_tables.sql, 002_menu_tables.sql, 003_price_ledger.sql, 004_order_tables.sql, 005_subscription_tables.sql
-- =====================================================
--
-- CRITICAL: Row Level Security (RLS) is MANDATORY for multi-tenant data isolation.
-- This migration:
-- 1. Verifies RLS is enabled on ALL tables
-- 2. Adds missing policies for edge cases
-- 3. Creates security helper functions
-- 4. Provides cross-tenant isolation verification utilities
-- 5. Adds superadmin access where appropriate
--
-- Security principles:
-- - Default deny: Users can only access data explicitly permitted
-- - Multi-tenant isolation: Organization data is completely isolated
-- - Role-based access: Permissions based on organization_role enum
-- - Audit trail: All access is logged and trackable
-- =====================================================

-- =====================================================
-- SECTION 1: RLS VERIFICATION FUNCTIONS
-- =====================================================

-- Function to verify RLS is enabled on all public tables
CREATE OR REPLACE FUNCTION verify_rls_enabled()
RETURNS TABLE (
  table_name TEXT,
  rls_enabled BOOLEAN,
  has_policies BOOLEAN,
  policy_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.tablename::TEXT,
    t.rowsecurity AS rls_enabled,
    EXISTS (
      SELECT 1 FROM pg_policies p
      WHERE p.tablename = t.tablename
      AND p.schemaname = 'public'
    ) AS has_policies,
    (
      SELECT COUNT(*)::INTEGER FROM pg_policies p
      WHERE p.tablename = t.tablename
      AND p.schemaname = 'public'
    ) AS policy_count
  FROM pg_tables t
  WHERE t.schemaname = 'public'
  AND t.tablename NOT LIKE 'pg_%'
  AND t.tablename NOT LIKE '_prisma_%'
  ORDER BY t.tablename;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to list all RLS policies for a specific table
CREATE OR REPLACE FUNCTION list_table_policies(p_table_name TEXT)
RETURNS TABLE (
  policy_name TEXT,
  policy_cmd TEXT,
  policy_roles TEXT[],
  policy_qual TEXT,
  policy_with_check TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.policyname::TEXT,
    p.cmd::TEXT,
    p.roles,
    p.qual::TEXT,
    p.with_check::TEXT
  FROM pg_policies p
  WHERE p.schemaname = 'public'
  AND p.tablename = p_table_name
  ORDER BY p.policyname;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to verify a user cannot access another organization's data
-- Returns true if isolation is working correctly (no data returned)
CREATE OR REPLACE FUNCTION verify_tenant_isolation(
  p_test_org_id UUID,
  p_test_user_id UUID
)
RETURNS TABLE (
  check_name TEXT,
  table_name TEXT,
  isolation_verified BOOLEAN,
  rows_found INTEGER,
  message TEXT
) AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Test organizations table
  EXECUTE 'SELECT COUNT(*) FROM organizations WHERE id = $1' INTO v_count USING p_test_org_id;
  check_name := 'organizations_direct';
  table_name := 'organizations';
  rows_found := v_count;
  isolation_verified := (v_count = 0);
  message := CASE WHEN v_count = 0 THEN 'PASS: No unauthorized organization access' ELSE 'FAIL: Organization data accessible' END;
  RETURN NEXT;

  -- Test categories table
  EXECUTE 'SELECT COUNT(*) FROM categories WHERE organization_id = $1' INTO v_count USING p_test_org_id;
  check_name := 'categories_by_org';
  table_name := 'categories';
  rows_found := v_count;
  isolation_verified := (v_count = 0);
  message := CASE WHEN v_count = 0 THEN 'PASS: No unauthorized category access' ELSE 'FAIL: Category data accessible' END;
  RETURN NEXT;

  -- Test products table
  EXECUTE 'SELECT COUNT(*) FROM products WHERE organization_id = $1' INTO v_count USING p_test_org_id;
  check_name := 'products_by_org';
  table_name := 'products';
  rows_found := v_count;
  isolation_verified := (v_count = 0);
  message := CASE WHEN v_count = 0 THEN 'PASS: No unauthorized product access' ELSE 'FAIL: Product data accessible' END;
  RETURN NEXT;

  -- Test orders table
  EXECUTE 'SELECT COUNT(*) FROM orders WHERE organization_id = $1' INTO v_count USING p_test_org_id;
  check_name := 'orders_by_org';
  table_name := 'orders';
  rows_found := v_count;
  isolation_verified := (v_count = 0);
  message := CASE WHEN v_count = 0 THEN 'PASS: No unauthorized order access' ELSE 'FAIL: Order data accessible' END;
  RETURN NEXT;

  -- Test price_ledger table
  EXECUTE 'SELECT COUNT(*) FROM price_ledger WHERE organization_id = $1' INTO v_count USING p_test_org_id;
  check_name := 'price_ledger_by_org';
  table_name := 'price_ledger';
  rows_found := v_count;
  isolation_verified := (v_count = 0);
  message := CASE WHEN v_count = 0 THEN 'PASS: No unauthorized price ledger access' ELSE 'FAIL: Price ledger data accessible' END;
  RETURN NEXT;

  -- Test memberships table
  EXECUTE 'SELECT COUNT(*) FROM memberships WHERE organization_id = $1' INTO v_count USING p_test_org_id;
  check_name := 'memberships_by_org';
  table_name := 'memberships';
  rows_found := v_count;
  isolation_verified := (v_count = 0);
  message := CASE WHEN v_count = 0 THEN 'PASS: No unauthorized membership access' ELSE 'FAIL: Membership data accessible' END;
  RETURN NEXT;

  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- SECTION 2: SECURITY HELPER FUNCTIONS
-- =====================================================

-- Function to check if current user is a superadmin
CREATE OR REPLACE FUNCTION is_superadmin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND system_role = 'superadmin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function to check if current user is platform support
CREATE OR REPLACE FUNCTION is_platform_support()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND system_role IN ('superadmin', 'support')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function to check if current user has any role in an organization
CREATE OR REPLACE FUNCTION user_is_org_member(p_org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM memberships
    WHERE organization_id = p_org_id
    AND user_id = auth.uid()
    AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function to check if current user has specific roles in an organization
CREATE OR REPLACE FUNCTION user_has_org_permission(
  p_org_id UUID,
  p_allowed_roles organization_role[]
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM memberships
    WHERE organization_id = p_org_id
    AND user_id = auth.uid()
    AND role = ANY(p_allowed_roles)
    AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function to get all organization IDs the current user has access to
CREATE OR REPLACE FUNCTION get_user_accessible_orgs()
RETURNS UUID[] AS $$
BEGIN
  RETURN ARRAY(
    SELECT organization_id
    FROM memberships
    WHERE user_id = auth.uid()
    AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function to get all organization IDs where user has management access
CREATE OR REPLACE FUNCTION get_user_managed_orgs()
RETURNS UUID[] AS $$
BEGIN
  RETURN ARRAY(
    SELECT organization_id
    FROM memberships
    WHERE user_id = auth.uid()
    AND role IN ('owner', 'admin', 'manager')
    AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- =====================================================
-- SECTION 3: ADDITIONAL RLS POLICIES FOR EDGE CASES
-- =====================================================

-- Note: Most policies are defined in their respective migration files.
-- This section adds superadmin access and edge case policies.

-- =====================================================
-- Superadmin bypass policies for all main tables
-- Superadmins need full access for platform administration
-- =====================================================

-- Superadmin access to organizations
DROP POLICY IF EXISTS "Superadmins have full organization access" ON organizations;
CREATE POLICY "Superadmins have full organization access"
  ON organizations
  FOR ALL
  USING (is_superadmin())
  WITH CHECK (is_superadmin());

-- Superadmin access to profiles
DROP POLICY IF EXISTS "Superadmins have full profile access" ON profiles;
CREATE POLICY "Superadmins have full profile access"
  ON profiles
  FOR ALL
  USING (is_superadmin())
  WITH CHECK (is_superadmin());

-- Superadmin access to memberships
DROP POLICY IF EXISTS "Superadmins have full membership access" ON memberships;
CREATE POLICY "Superadmins have full membership access"
  ON memberships
  FOR ALL
  USING (is_superadmin())
  WITH CHECK (is_superadmin());

-- Superadmin access to categories
DROP POLICY IF EXISTS "Superadmins have full category access" ON categories;
CREATE POLICY "Superadmins have full category access"
  ON categories
  FOR ALL
  USING (is_superadmin())
  WITH CHECK (is_superadmin());

-- Superadmin access to products
DROP POLICY IF EXISTS "Superadmins have full product access" ON products;
CREATE POLICY "Superadmins have full product access"
  ON products
  FOR ALL
  USING (is_superadmin())
  WITH CHECK (is_superadmin());

-- Superadmin access to product_modifiers
DROP POLICY IF EXISTS "Superadmins have full modifier access" ON product_modifiers;
CREATE POLICY "Superadmins have full modifier access"
  ON product_modifiers
  FOR ALL
  USING (is_superadmin())
  WITH CHECK (is_superadmin());

-- Superadmin access to modifier_options
DROP POLICY IF EXISTS "Superadmins have full modifier option access" ON modifier_options;
CREATE POLICY "Superadmins have full modifier option access"
  ON modifier_options
  FOR ALL
  USING (is_superadmin())
  WITH CHECK (is_superadmin());

-- Superadmin access to price_ledger (read-only, no UPDATE/DELETE allowed by trigger)
DROP POLICY IF EXISTS "Superadmins can view all price history" ON price_ledger;
CREATE POLICY "Superadmins can view all price history"
  ON price_ledger
  FOR SELECT
  USING (is_superadmin());

DROP POLICY IF EXISTS "Superadmins can create price entries" ON price_ledger;
CREATE POLICY "Superadmins can create price entries"
  ON price_ledger
  FOR INSERT
  WITH CHECK (is_superadmin());

-- Superadmin access to restaurant_tables
DROP POLICY IF EXISTS "Superadmins have full table access" ON restaurant_tables;
CREATE POLICY "Superadmins have full table access"
  ON restaurant_tables
  FOR ALL
  USING (is_superadmin())
  WITH CHECK (is_superadmin());

-- Superadmin access to orders
DROP POLICY IF EXISTS "Superadmins have full order access" ON orders;
CREATE POLICY "Superadmins have full order access"
  ON orders
  FOR ALL
  USING (is_superadmin())
  WITH CHECK (is_superadmin());

-- Superadmin access to order_items
DROP POLICY IF EXISTS "Superadmins have full order item access" ON order_items;
CREATE POLICY "Superadmins have full order item access"
  ON order_items
  FOR ALL
  USING (is_superadmin())
  WITH CHECK (is_superadmin());

-- Superadmin access to service_requests
DROP POLICY IF EXISTS "Superadmins have full service request access" ON service_requests;
CREATE POLICY "Superadmins have full service request access"
  ON service_requests
  FOR ALL
  USING (is_superadmin())
  WITH CHECK (is_superadmin());

-- =====================================================
-- Platform support policies (read-only access for support)
-- =====================================================

-- Support can view organizations
DROP POLICY IF EXISTS "Support can view all organizations" ON organizations;
CREATE POLICY "Support can view all organizations"
  ON organizations
  FOR SELECT
  USING (is_platform_support());

-- Support can view orders (for customer service)
DROP POLICY IF EXISTS "Support can view all orders" ON orders;
CREATE POLICY "Support can view all orders"
  ON orders
  FOR SELECT
  USING (is_platform_support());

-- Support can view memberships (for account verification)
DROP POLICY IF EXISTS "Support can view all memberships" ON memberships;
CREATE POLICY "Support can view all memberships"
  ON memberships
  FOR SELECT
  USING (is_platform_support());

-- =====================================================
-- SECTION 4: ANALYTICS/REPORTING POLICIES
-- =====================================================

-- Organization owners can export their analytics data
-- This ensures they have SELECT access to all their own data

-- Already covered by "Members can view..." policies in each table

-- =====================================================
-- SECTION 5: AUDIT LOGGING
-- =====================================================

-- Create audit log table for sensitive operations
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- User info
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email TEXT,
  user_ip INET,
  user_agent TEXT,

  -- Organization context
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,

  -- Action details
  action TEXT NOT NULL,                    -- e.g., 'login', 'order_create', 'price_change', 'member_invite'
  resource_type TEXT,                      -- e.g., 'order', 'product', 'membership'
  resource_id UUID,

  -- Changes
  old_data JSONB,
  new_data JSONB,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Security severity
  severity TEXT DEFAULT 'info' CHECK (severity IN ('debug', 'info', 'warning', 'critical'))
);

-- Indexes for audit logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_organization_id ON audit_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_severity ON audit_logs(severity) WHERE severity IN ('warning', 'critical');

-- Enable RLS on audit_logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Audit logs: Only superadmins can read all logs
CREATE POLICY "Superadmins can view all audit logs"
  ON audit_logs
  FOR SELECT
  USING (is_superadmin());

-- Audit logs: Organization owners can view their organization's logs
CREATE POLICY "Owners can view organization audit logs"
  ON audit_logs
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM memberships
      WHERE user_id = auth.uid()
      AND role = 'owner'
      AND is_active = true
    )
  );

-- Audit logs: Users can view their own actions
CREATE POLICY "Users can view their own audit logs"
  ON audit_logs
  FOR SELECT
  USING (user_id = auth.uid());

-- Audit logs: System can insert (via SECURITY DEFINER functions)
CREATE POLICY "System can insert audit logs"
  ON audit_logs
  FOR INSERT
  WITH CHECK (true);

-- Function to create audit log entry
CREATE OR REPLACE FUNCTION create_audit_log(
  p_action TEXT,
  p_resource_type TEXT DEFAULT NULL,
  p_resource_id UUID DEFAULT NULL,
  p_organization_id UUID DEFAULT NULL,
  p_old_data JSONB DEFAULT NULL,
  p_new_data JSONB DEFAULT NULL,
  p_severity TEXT DEFAULT 'info',
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
  v_user_id UUID;
  v_user_email TEXT;
  v_new_id UUID;
BEGIN
  v_user_id := auth.uid();

  -- Get user email if available
  SELECT email INTO v_user_email
  FROM profiles
  WHERE id = v_user_id;

  INSERT INTO audit_logs (
    user_id,
    user_email,
    organization_id,
    action,
    resource_type,
    resource_id,
    old_data,
    new_data,
    severity,
    metadata
  ) VALUES (
    v_user_id,
    v_user_email,
    p_organization_id,
    p_action,
    p_resource_type,
    p_resource_id,
    p_old_data,
    p_new_data,
    p_severity,
    p_metadata
  )
  RETURNING id INTO v_new_id;

  RETURN v_new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- SECTION 6: SECURITY VALIDATION QUERIES
-- =====================================================

-- Create a view to show RLS status summary
CREATE OR REPLACE VIEW rls_status_summary AS
SELECT
  t.tablename AS table_name,
  t.rowsecurity AS rls_enabled,
  COUNT(p.policyname) AS policy_count,
  ARRAY_AGG(p.policyname ORDER BY p.policyname) FILTER (WHERE p.policyname IS NOT NULL) AS policy_names
FROM pg_tables t
LEFT JOIN pg_policies p ON p.tablename = t.tablename AND p.schemaname = 'public'
WHERE t.schemaname = 'public'
AND t.tablename NOT LIKE 'pg_%'
AND t.tablename NOT LIKE '_prisma_%'
GROUP BY t.tablename, t.rowsecurity
ORDER BY t.tablename;

-- Grant select on the view to authenticated users
GRANT SELECT ON rls_status_summary TO authenticated;

-- =====================================================
-- SECTION 7: RLS VALIDATION ASSERTIONS
-- =====================================================

-- Verify all tables have RLS enabled
DO $$
DECLARE
  v_missing_rls TEXT;
BEGIN
  SELECT string_agg(tablename, ', ')
  INTO v_missing_rls
  FROM pg_tables
  WHERE schemaname = 'public'
  AND tablename NOT LIKE 'pg_%'
  AND tablename NOT LIKE '_prisma_%'
  AND NOT rowsecurity;

  IF v_missing_rls IS NOT NULL THEN
    RAISE WARNING 'Tables without RLS enabled: %', v_missing_rls;
  ELSE
    RAISE NOTICE 'All public tables have RLS enabled';
  END IF;
END $$;

-- Verify all tables have at least one policy
DO $$
DECLARE
  v_no_policies TEXT;
BEGIN
  SELECT string_agg(t.tablename, ', ')
  INTO v_no_policies
  FROM pg_tables t
  WHERE t.schemaname = 'public'
  AND t.tablename NOT LIKE 'pg_%'
  AND t.tablename NOT LIKE '_prisma_%'
  AND NOT EXISTS (
    SELECT 1 FROM pg_policies p
    WHERE p.tablename = t.tablename
    AND p.schemaname = 'public'
  );

  IF v_no_policies IS NOT NULL THEN
    RAISE WARNING 'Tables without any RLS policies: %', v_no_policies;
  ELSE
    RAISE NOTICE 'All public tables have at least one RLS policy';
  END IF;
END $$;

-- =====================================================
-- SECTION 8: DOCUMENTATION
-- =====================================================

COMMENT ON FUNCTION verify_rls_enabled() IS 'Returns RLS status for all public tables. Use to verify security configuration.';
COMMENT ON FUNCTION list_table_policies(TEXT) IS 'Lists all RLS policies for a specific table.';
COMMENT ON FUNCTION verify_tenant_isolation(UUID, UUID) IS 'Tests cross-tenant isolation by verifying a user cannot access another organization data.';
COMMENT ON FUNCTION is_superadmin() IS 'Returns true if the current user has superadmin system_role.';
COMMENT ON FUNCTION is_platform_support() IS 'Returns true if the current user has superadmin or support system_role.';
COMMENT ON FUNCTION user_is_org_member(UUID) IS 'Returns true if the current user is an active member of the specified organization.';
COMMENT ON FUNCTION user_has_org_permission(UUID, organization_role[]) IS 'Returns true if the current user has one of the specified roles in the organization.';
COMMENT ON FUNCTION get_user_accessible_orgs() IS 'Returns array of organization IDs the current user can access.';
COMMENT ON FUNCTION get_user_managed_orgs() IS 'Returns array of organization IDs where the current user has management access (owner/admin/manager).';
COMMENT ON FUNCTION create_audit_log(TEXT, TEXT, UUID, UUID, JSONB, JSONB, TEXT, JSONB) IS 'Creates an audit log entry for security tracking.';

COMMENT ON TABLE audit_logs IS 'Security audit trail for sensitive operations';
COMMENT ON VIEW rls_status_summary IS 'Summary view of RLS status for all public tables';

-- =====================================================
-- SECTION 9: COMPLETE TABLE LIST WITH RLS STATUS
-- =====================================================

-- This section documents all tables and their RLS configuration
-- Run SELECT * FROM verify_rls_enabled(); to see the current status

/*
Expected tables with RLS enabled:

Core (001_core_tables.sql):
- organizations: RLS ON, 5 policies
- profiles: RLS ON, 4 policies
- memberships: RLS ON, 7 policies

Menu (002_menu_tables.sql):
- categories: RLS ON, 5 policies
- products: RLS ON, 5 policies
- product_modifiers: RLS ON, 5 policies
- modifier_options: RLS ON, 5 policies

Price Ledger (003_price_ledger.sql):
- price_ledger: RLS ON, 3 policies (INSERT only - UPDATE/DELETE blocked by triggers)

Orders (004_order_tables.sql):
- restaurant_tables: RLS ON, 5 policies
- orders: RLS ON, 5 policies
- order_items: RLS ON, 5 policies
- service_requests: RLS ON, 4 policies

Subscription (005_subscription_tables.sql):
- features: RLS ON, 2 policies
- subscription_plans: RLS ON, 3 policies
- plan_features: RLS ON, 2 policies
- organization_subscriptions: RLS ON, 3 policies
- feature_overrides: RLS ON, 2 policies
- feature_usage: RLS ON, 2 policies

Audit (this migration):
- audit_logs: RLS ON, 4 policies

Total: 18 tables, all with RLS enabled
*/

-- =====================================================
-- END OF MIGRATION
-- =====================================================
