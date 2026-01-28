-- =====================================================
-- E-Menum Subscription Tables Migration
-- Migration: 005_subscription_tables
-- Description: Create subscription tables: features, plans, subscriptions, overrides
-- Depends on: 001_core_tables.sql
-- =====================================================
-- This migration creates the subscription and feature flagging system:
-- - Platform features with usage limits
-- - Subscription plans with feature bundles
-- - Organization subscriptions with billing
-- - Feature overrides for custom configurations
-- IMPORTANT: No hard-coded package checks in code - all feature access
-- should be checked dynamically through these tables.
-- =====================================================

-- =====================================================
-- ENUM TYPES
-- =====================================================

-- Feature category for organization
CREATE TYPE feature_category AS ENUM (
  'menu',          -- Menu management features
  'ordering',      -- Ordering system features
  'analytics',     -- Analytics and reporting
  'marketing',     -- Marketing and promotions
  'integrations',  -- Third-party integrations
  'ai',            -- AI-powered features
  'support',       -- Support level features
  'branding',      -- Branding and customization
  'management'     -- Staff and multi-location management
);

-- Feature value type
CREATE TYPE feature_value_type AS ENUM (
  'boolean',       -- Feature is on/off
  'number',        -- Feature has numeric limit
  'unlimited'      -- No limit (enterprise)
);

-- Billing cycle
CREATE TYPE billing_cycle AS ENUM (
  'monthly',
  'quarterly',
  'yearly',
  'lifetime'
);

-- =====================================================
-- FEATURES TABLE
-- Defines all available features in the platform
-- =====================================================

CREATE TABLE features (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Feature identification
  code TEXT NOT NULL UNIQUE,              -- Unique code (e.g., 'menu_categories', 'ai_descriptions')
  name TEXT NOT NULL,                     -- Display name
  name_tr TEXT NOT NULL,                  -- Turkish display name
  description TEXT,                       -- English description
  description_tr TEXT,                    -- Turkish description

  -- Categorization
  category feature_category NOT NULL,

  -- Value type
  value_type feature_value_type NOT NULL DEFAULT 'boolean',
  default_value TEXT,                     -- Default value (stored as text, parsed by type)

  -- UI configuration
  sort_order INTEGER NOT NULL DEFAULT 0,
  icon TEXT,                              -- Icon name for UI
  is_highlighted BOOLEAN DEFAULT false,   -- Show prominently in pricing page

  -- Feature availability
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_visible BOOLEAN NOT NULL DEFAULT true,  -- Show in pricing comparison

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Constraints
  CONSTRAINT code_format CHECK (code ~ '^[a-z][a-z0-9_]*$'),
  CONSTRAINT code_length CHECK (char_length(code) >= 2 AND char_length(code) <= 50)
);

-- Indexes for features
CREATE INDEX idx_features_code ON features(code);
CREATE INDEX idx_features_category ON features(category);
CREATE INDEX idx_features_sort_order ON features(sort_order);
CREATE INDEX idx_features_is_active ON features(is_active) WHERE is_active = true;

-- =====================================================
-- SUBSCRIPTION PLANS TABLE
-- Defines available subscription plans
-- =====================================================

CREATE TABLE subscription_plans (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Plan identification
  tier subscription_tier NOT NULL UNIQUE,  -- Uses enum from 001_core_tables
  name TEXT NOT NULL,                      -- Display name (e.g., "Gold")
  name_tr TEXT NOT NULL,                   -- Turkish display name (e.g., "Altın")
  description TEXT,                        -- English description
  description_tr TEXT,                     -- Turkish description

  -- Pricing (in TRY)
  monthly_price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  quarterly_price DECIMAL(10, 2),          -- Optional discount for quarterly
  yearly_price DECIMAL(10, 2),             -- Optional discount for yearly
  currency TEXT NOT NULL DEFAULT 'TRY',

  -- Trial
  trial_days INTEGER DEFAULT 14,

  -- Display
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_popular BOOLEAN DEFAULT false,        -- Show "Most Popular" badge
  badge_text TEXT,                         -- Custom badge (e.g., "Best Value")
  badge_text_tr TEXT,                      -- Turkish badge text

  -- Availability
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_public BOOLEAN NOT NULL DEFAULT true, -- Show in public pricing page
  requires_contact BOOLEAN DEFAULT false,  -- Enterprise-style "Contact Us"

  -- Limits (quick access without joining plan_features)
  max_products INTEGER,                    -- NULL = unlimited
  max_categories INTEGER,
  max_tables INTEGER,
  max_orders_per_month INTEGER,
  max_users INTEGER,
  max_locations INTEGER,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes for subscription_plans
CREATE INDEX idx_subscription_plans_tier ON subscription_plans(tier);
CREATE INDEX idx_subscription_plans_sort_order ON subscription_plans(sort_order);
CREATE INDEX idx_subscription_plans_is_active ON subscription_plans(is_active) WHERE is_active = true;
CREATE INDEX idx_subscription_plans_is_public ON subscription_plans(is_public) WHERE is_public = true;

-- =====================================================
-- PLAN FEATURES TABLE (Junction)
-- Links plans to features with specific limits
-- =====================================================

CREATE TABLE plan_features (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Foreign keys
  plan_id UUID NOT NULL REFERENCES subscription_plans(id) ON DELETE CASCADE,
  feature_id UUID NOT NULL REFERENCES features(id) ON DELETE CASCADE,

  -- Feature value for this plan
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  value TEXT,                              -- Limit value (for number type)
  is_unlimited BOOLEAN DEFAULT false,      -- Override to unlimited

  -- UI customization
  display_value TEXT,                      -- Custom display text
  display_value_tr TEXT,                   -- Turkish display text

  -- Constraints
  CONSTRAINT unique_plan_feature UNIQUE (plan_id, feature_id)
);

-- Indexes for plan_features
CREATE INDEX idx_plan_features_plan_id ON plan_features(plan_id);
CREATE INDEX idx_plan_features_feature_id ON plan_features(feature_id);
CREATE INDEX idx_plan_features_is_enabled ON plan_features(plan_id, is_enabled) WHERE is_enabled = true;

-- =====================================================
-- ORGANIZATION SUBSCRIPTIONS TABLE
-- Tracks active subscriptions for organizations
-- =====================================================

CREATE TABLE organization_subscriptions (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Multi-tenant foreign key
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Plan reference
  plan_id UUID NOT NULL REFERENCES subscription_plans(id) ON DELETE RESTRICT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Subscription dates
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  current_period_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  current_period_end TIMESTAMPTZ NOT NULL,
  canceled_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,

  -- Trial tracking
  trial_start TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  is_trial BOOLEAN NOT NULL DEFAULT false,

  -- Billing
  billing_cycle billing_cycle NOT NULL DEFAULT 'monthly',
  price_at_subscription DECIMAL(10, 2) NOT NULL,  -- Price locked at subscription time
  currency TEXT NOT NULL DEFAULT 'TRY',

  -- Payment provider integration (for future)
  external_subscription_id TEXT,           -- Stripe/Paddle subscription ID
  external_customer_id TEXT,               -- Stripe/Paddle customer ID

  -- Status tracking (uses subscription_status from 001_core_tables)
  status subscription_status NOT NULL DEFAULT 'trialing',
  status_changed_at TIMESTAMPTZ DEFAULT NOW(),

  -- Auto-renewal
  auto_renew BOOLEAN NOT NULL DEFAULT true,
  renewal_reminder_sent_at TIMESTAMPTZ,

  -- Cancellation
  cancel_at_period_end BOOLEAN DEFAULT false,
  cancellation_reason TEXT,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Constraints
  CONSTRAINT active_subscription_unique UNIQUE (organization_id, status)
    DEFERRABLE INITIALLY DEFERRED
);

-- Partial unique index to ensure only one active subscription per org
CREATE UNIQUE INDEX idx_one_active_subscription_per_org
  ON organization_subscriptions(organization_id)
  WHERE status IN ('active', 'trialing');

-- Indexes for organization_subscriptions
CREATE INDEX idx_org_subscriptions_organization_id ON organization_subscriptions(organization_id);
CREATE INDEX idx_org_subscriptions_plan_id ON organization_subscriptions(plan_id);
CREATE INDEX idx_org_subscriptions_status ON organization_subscriptions(status);
CREATE INDEX idx_org_subscriptions_current_period_end ON organization_subscriptions(current_period_end);
CREATE INDEX idx_org_subscriptions_trial_end ON organization_subscriptions(trial_end) WHERE is_trial = true;
CREATE INDEX idx_org_subscriptions_renewal ON organization_subscriptions(current_period_end, auto_renew)
  WHERE status = 'active' AND auto_renew = true;

-- =====================================================
-- FEATURE OVERRIDES TABLE
-- Organization-specific feature overrides
-- =====================================================

CREATE TABLE feature_overrides (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Multi-tenant foreign key
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Feature reference
  feature_id UUID NOT NULL REFERENCES features(id) ON DELETE CASCADE,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Override values
  is_enabled BOOLEAN,                      -- Override enabled state
  value TEXT,                              -- Override limit value
  is_unlimited BOOLEAN,                    -- Override to unlimited

  -- Override reason
  reason TEXT,                             -- Why this override exists
  granted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Expiration
  expires_at TIMESTAMPTZ,                  -- NULL = permanent
  is_active BOOLEAN NOT NULL DEFAULT true,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Constraints
  CONSTRAINT unique_org_feature_override UNIQUE (organization_id, feature_id)
);

-- Indexes for feature_overrides
CREATE INDEX idx_feature_overrides_organization_id ON feature_overrides(organization_id);
CREATE INDEX idx_feature_overrides_feature_id ON feature_overrides(feature_id);
CREATE INDEX idx_feature_overrides_is_active ON feature_overrides(organization_id, is_active) WHERE is_active = true;
CREATE INDEX idx_feature_overrides_expires_at ON feature_overrides(expires_at) WHERE expires_at IS NOT NULL;

-- =====================================================
-- USAGE TRACKING TABLE
-- Tracks feature usage for limits enforcement
-- =====================================================

CREATE TABLE feature_usage (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Multi-tenant foreign key
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Feature reference
  feature_id UUID NOT NULL REFERENCES features(id) ON DELETE CASCADE,

  -- Usage period
  period_start TIMESTAMPTZ NOT NULL,       -- Start of usage period
  period_end TIMESTAMPTZ NOT NULL,         -- End of usage period

  -- Usage count
  usage_count INTEGER NOT NULL DEFAULT 0,
  usage_limit INTEGER,                     -- Limit for this period (cached from plan)

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT unique_org_feature_period UNIQUE (organization_id, feature_id, period_start)
);

-- Indexes for feature_usage
CREATE INDEX idx_feature_usage_organization_id ON feature_usage(organization_id);
CREATE INDEX idx_feature_usage_feature_id ON feature_usage(feature_id);
CREATE INDEX idx_feature_usage_period ON feature_usage(organization_id, period_start, period_end);

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Updated_at triggers
CREATE TRIGGER set_features_updated_at
  BEFORE UPDATE ON features
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_subscription_plans_updated_at
  BEFORE UPDATE ON subscription_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_plan_features_updated_at
  BEFORE UPDATE ON plan_features
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_org_subscriptions_updated_at
  BEFORE UPDATE ON organization_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_feature_overrides_updated_at
  BEFORE UPDATE ON feature_overrides
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_feature_usage_updated_at
  BEFORE UPDATE ON feature_usage
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- SYNC ORGANIZATION SUBSCRIPTION TIER
-- =====================================================

-- Function to sync organization's subscription_tier with active subscription
CREATE OR REPLACE FUNCTION sync_org_subscription_tier()
RETURNS TRIGGER AS $$
BEGIN
  -- Update organization's subscription fields when subscription changes
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    IF NEW.status IN ('active', 'trialing') THEN
      UPDATE organizations
      SET
        subscription_tier = (SELECT tier FROM subscription_plans WHERE id = NEW.plan_id),
        subscription_status = NEW.status,
        trial_ends_at = CASE WHEN NEW.is_trial THEN NEW.trial_end ELSE NULL END
      WHERE id = NEW.organization_id;
    ELSIF NEW.status IN ('canceled', 'paused') THEN
      -- Optionally downgrade to lite on cancellation
      -- UPDATE organizations
      -- SET subscription_tier = 'lite', subscription_status = NEW.status
      -- WHERE id = NEW.organization_id;
      UPDATE organizations
      SET subscription_status = NEW.status
      WHERE id = NEW.organization_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_subscription_change_sync_org
  AFTER INSERT OR UPDATE ON organization_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION sync_org_subscription_tier();

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to check if organization has access to a feature
CREATE OR REPLACE FUNCTION org_has_feature(
  p_org_id UUID,
  p_feature_code TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_feature_id UUID;
  v_has_override BOOLEAN;
  v_override_enabled BOOLEAN;
  v_plan_enabled BOOLEAN;
BEGIN
  -- Get feature ID
  SELECT id INTO v_feature_id
  FROM features
  WHERE code = p_feature_code AND is_active = true;

  IF v_feature_id IS NULL THEN
    RETURN false;
  END IF;

  -- Check for active override first
  SELECT is_enabled INTO v_override_enabled
  FROM feature_overrides
  WHERE organization_id = p_org_id
  AND feature_id = v_feature_id
  AND is_active = true
  AND (expires_at IS NULL OR expires_at > NOW());

  IF v_override_enabled IS NOT NULL THEN
    RETURN v_override_enabled;
  END IF;

  -- Check plan features
  SELECT pf.is_enabled INTO v_plan_enabled
  FROM organization_subscriptions os
  JOIN plan_features pf ON pf.plan_id = os.plan_id
  WHERE os.organization_id = p_org_id
  AND os.status IN ('active', 'trialing')
  AND pf.feature_id = v_feature_id;

  RETURN COALESCE(v_plan_enabled, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get feature limit for organization
CREATE OR REPLACE FUNCTION get_org_feature_limit(
  p_org_id UUID,
  p_feature_code TEXT
)
RETURNS INTEGER AS $$
DECLARE
  v_feature_id UUID;
  v_override_value TEXT;
  v_override_unlimited BOOLEAN;
  v_plan_value TEXT;
  v_plan_unlimited BOOLEAN;
BEGIN
  -- Get feature ID
  SELECT id INTO v_feature_id
  FROM features
  WHERE code = p_feature_code AND is_active = true;

  IF v_feature_id IS NULL THEN
    RETURN 0;
  END IF;

  -- Check for active override first
  SELECT value, is_unlimited INTO v_override_value, v_override_unlimited
  FROM feature_overrides
  WHERE organization_id = p_org_id
  AND feature_id = v_feature_id
  AND is_active = true
  AND is_enabled IS NOT false
  AND (expires_at IS NULL OR expires_at > NOW());

  IF v_override_unlimited = true THEN
    RETURN -1; -- -1 indicates unlimited
  END IF;

  IF v_override_value IS NOT NULL THEN
    RETURN v_override_value::INTEGER;
  END IF;

  -- Check plan features
  SELECT pf.value, pf.is_unlimited INTO v_plan_value, v_plan_unlimited
  FROM organization_subscriptions os
  JOIN plan_features pf ON pf.plan_id = os.plan_id
  WHERE os.organization_id = p_org_id
  AND os.status IN ('active', 'trialing')
  AND pf.feature_id = v_feature_id
  AND pf.is_enabled = true;

  IF v_plan_unlimited = true THEN
    RETURN -1; -- -1 indicates unlimited
  END IF;

  RETURN COALESCE(v_plan_value::INTEGER, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get organization's current subscription with plan details
CREATE OR REPLACE FUNCTION get_org_subscription(p_org_id UUID)
RETURNS TABLE (
  subscription_id UUID,
  plan_tier subscription_tier,
  plan_name TEXT,
  status subscription_status,
  is_trial BOOLEAN,
  trial_end TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  billing_cycle billing_cycle,
  price DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    os.id AS subscription_id,
    sp.tier AS plan_tier,
    sp.name AS plan_name,
    os.status,
    os.is_trial,
    os.trial_end,
    os.current_period_end,
    os.billing_cycle,
    os.price_at_subscription AS price
  FROM organization_subscriptions os
  JOIN subscription_plans sp ON sp.id = os.plan_id
  WHERE os.organization_id = p_org_id
  AND os.status IN ('active', 'trialing')
  ORDER BY os.created_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get all features for an organization (with effective values)
CREATE OR REPLACE FUNCTION get_org_features(p_org_id UUID)
RETURNS TABLE (
  feature_code TEXT,
  feature_name TEXT,
  category feature_category,
  is_enabled BOOLEAN,
  value_limit INTEGER,
  is_unlimited BOOLEAN,
  source TEXT
) AS $$
BEGIN
  RETURN QUERY
  WITH active_sub AS (
    SELECT os.plan_id
    FROM organization_subscriptions os
    WHERE os.organization_id = p_org_id
    AND os.status IN ('active', 'trialing')
    LIMIT 1
  ),
  plan_feature_values AS (
    SELECT
      f.id AS feature_id,
      f.code,
      f.name,
      f.category,
      COALESCE(pf.is_enabled, false) AS is_enabled,
      pf.value::INTEGER AS value_limit,
      COALESCE(pf.is_unlimited, false) AS is_unlimited
    FROM features f
    LEFT JOIN active_sub asub ON true
    LEFT JOIN plan_features pf ON pf.feature_id = f.id AND pf.plan_id = asub.plan_id
    WHERE f.is_active = true
  ),
  with_overrides AS (
    SELECT
      pfv.feature_id,
      pfv.code,
      pfv.name,
      pfv.category,
      COALESCE(fo.is_enabled, pfv.is_enabled) AS is_enabled,
      COALESCE(fo.value::INTEGER, pfv.value_limit) AS value_limit,
      COALESCE(fo.is_unlimited, pfv.is_unlimited) AS is_unlimited,
      CASE WHEN fo.id IS NOT NULL THEN 'override' ELSE 'plan' END AS source
    FROM plan_feature_values pfv
    LEFT JOIN feature_overrides fo ON fo.feature_id = pfv.feature_id
      AND fo.organization_id = p_org_id
      AND fo.is_active = true
      AND (fo.expires_at IS NULL OR fo.expires_at > NOW())
  )
  SELECT
    wo.code,
    wo.name,
    wo.category,
    wo.is_enabled,
    wo.value_limit,
    wo.is_unlimited,
    wo.source
  FROM with_overrides wo
  ORDER BY wo.category, wo.code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment feature usage
CREATE OR REPLACE FUNCTION increment_feature_usage(
  p_org_id UUID,
  p_feature_code TEXT,
  p_amount INTEGER DEFAULT 1
)
RETURNS TABLE (
  current_usage INTEGER,
  usage_limit INTEGER,
  is_within_limit BOOLEAN
) AS $$
DECLARE
  v_feature_id UUID;
  v_limit INTEGER;
  v_period_start TIMESTAMPTZ;
  v_period_end TIMESTAMPTZ;
  v_current_usage INTEGER;
BEGIN
  -- Get feature ID
  SELECT id INTO v_feature_id
  FROM features
  WHERE code = p_feature_code AND is_active = true;

  IF v_feature_id IS NULL THEN
    RETURN QUERY SELECT 0, 0, false;
    RETURN;
  END IF;

  -- Get limit for this org
  v_limit := get_org_feature_limit(p_org_id, p_feature_code);

  -- Calculate current month period
  v_period_start := date_trunc('month', NOW());
  v_period_end := date_trunc('month', NOW()) + INTERVAL '1 month';

  -- Upsert usage record
  INSERT INTO feature_usage (
    organization_id,
    feature_id,
    period_start,
    period_end,
    usage_count,
    usage_limit
  ) VALUES (
    p_org_id,
    v_feature_id,
    v_period_start,
    v_period_end,
    p_amount,
    CASE WHEN v_limit = -1 THEN NULL ELSE v_limit END
  )
  ON CONFLICT (organization_id, feature_id, period_start)
  DO UPDATE SET
    usage_count = feature_usage.usage_count + p_amount,
    usage_limit = CASE WHEN v_limit = -1 THEN NULL ELSE v_limit END,
    updated_at = NOW()
  RETURNING feature_usage.usage_count INTO v_current_usage;

  -- Return result
  RETURN QUERY SELECT
    v_current_usage,
    CASE WHEN v_limit = -1 THEN NULL ELSE v_limit END,
    CASE WHEN v_limit = -1 THEN true ELSE v_current_usage <= v_limit END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if organization is within usage limit
CREATE OR REPLACE FUNCTION is_within_usage_limit(
  p_org_id UUID,
  p_feature_code TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_feature_id UUID;
  v_limit INTEGER;
  v_current_usage INTEGER;
  v_period_start TIMESTAMPTZ;
BEGIN
  -- Get feature ID
  SELECT id INTO v_feature_id
  FROM features
  WHERE code = p_feature_code AND is_active = true;

  IF v_feature_id IS NULL THEN
    RETURN false;
  END IF;

  -- Get limit
  v_limit := get_org_feature_limit(p_org_id, p_feature_code);

  -- Unlimited
  IF v_limit = -1 THEN
    RETURN true;
  END IF;

  -- Get current usage
  v_period_start := date_trunc('month', NOW());

  SELECT COALESCE(usage_count, 0) INTO v_current_usage
  FROM feature_usage
  WHERE organization_id = p_org_id
  AND feature_id = v_feature_id
  AND period_start = v_period_start;

  RETURN COALESCE(v_current_usage, 0) < v_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- CRITICAL: Enable RLS on ALL tables
-- =====================================================

ALTER TABLE features ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_usage ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES - Features
-- =====================================================

-- Features: Public can view active features (for pricing page)
CREATE POLICY "Anyone can view active features"
  ON features
  FOR SELECT
  USING (is_active = true AND is_visible = true);

-- Features: Only superadmins can manage features
CREATE POLICY "Superadmins can manage features"
  ON features
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND system_role = 'superadmin'
    )
  );

-- =====================================================
-- RLS POLICIES - Subscription Plans
-- =====================================================

-- Plans: Public can view active public plans
CREATE POLICY "Anyone can view public plans"
  ON subscription_plans
  FOR SELECT
  USING (is_active = true AND is_public = true);

-- Plans: Authenticated users can view all active plans
CREATE POLICY "Authenticated users can view all active plans"
  ON subscription_plans
  FOR SELECT
  USING (is_active = true AND auth.uid() IS NOT NULL);

-- Plans: Only superadmins can manage plans
CREATE POLICY "Superadmins can manage plans"
  ON subscription_plans
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND system_role = 'superadmin'
    )
  );

-- =====================================================
-- RLS POLICIES - Plan Features
-- =====================================================

-- Plan Features: Public can view (for pricing comparison)
CREATE POLICY "Anyone can view plan features"
  ON plan_features
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM subscription_plans sp
      WHERE sp.id = plan_id AND sp.is_active = true
    )
  );

-- Plan Features: Only superadmins can manage
CREATE POLICY "Superadmins can manage plan features"
  ON plan_features
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND system_role = 'superadmin'
    )
  );

-- =====================================================
-- RLS POLICIES - Organization Subscriptions
-- =====================================================

-- Subscriptions: Organization members can view their subscription
CREATE POLICY "Members can view organization subscription"
  ON organization_subscriptions
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM memberships
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Subscriptions: Only owners can manage subscription
CREATE POLICY "Owners can manage organization subscription"
  ON organization_subscriptions
  FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM memberships
      WHERE user_id = auth.uid()
      AND role = 'owner'
      AND is_active = true
    )
  );

-- Subscriptions: Superadmins can manage all subscriptions
CREATE POLICY "Superadmins can manage all subscriptions"
  ON organization_subscriptions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND system_role = 'superadmin'
    )
  );

-- =====================================================
-- RLS POLICIES - Feature Overrides
-- =====================================================

-- Overrides: Organization owners can view their overrides
CREATE POLICY "Owners can view organization overrides"
  ON feature_overrides
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM memberships
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
      AND is_active = true
    )
  );

-- Overrides: Only superadmins and support can manage overrides
CREATE POLICY "Support and superadmins can manage overrides"
  ON feature_overrides
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND system_role IN ('superadmin', 'support')
    )
  );

-- =====================================================
-- RLS POLICIES - Feature Usage
-- =====================================================

-- Usage: Organization members can view their usage
CREATE POLICY "Members can view organization usage"
  ON feature_usage
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM memberships
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Usage: System functions handle inserts/updates (via SECURITY DEFINER)
CREATE POLICY "System can manage usage"
  ON feature_usage
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- SEED DEFAULT SUBSCRIPTION PLANS
-- =====================================================

-- Insert default plans (matching the 4-tier model from spec)
INSERT INTO subscription_plans (tier, name, name_tr, description, description_tr, monthly_price, yearly_price, trial_days, sort_order, is_popular, max_products, max_categories, max_tables, max_orders_per_month, max_users, max_locations)
VALUES
  ('lite', 'Lite', 'Başlangıç', 'Perfect for small cafes and food trucks', 'Küçük kafeler ve food truck''lar için ideal', 0, 0, 0, 1, false, 50, 10, 10, 500, 2, 1),
  ('gold', 'Gold', 'Altın', 'Great for growing restaurants', 'Büyüyen restoranlar için harika', 299, 2990, 14, 2, true, 200, 30, 30, 2000, 5, 2),
  ('platinum', 'Platinum', 'Platin', 'Full features for busy restaurants', 'Yoğun restoranlar için tam özellikler', 599, 5990, 14, 3, false, NULL, NULL, NULL, NULL, 15, 5),
  ('enterprise', 'Enterprise', 'Kurumsal', 'Custom solutions for restaurant chains', 'Restoran zincirleri için özel çözümler', 0, 0, 30, 4, false, NULL, NULL, NULL, NULL, NULL, NULL)
ON CONFLICT (tier) DO NOTHING;

-- Update enterprise plan to require contact
UPDATE subscription_plans SET requires_contact = true WHERE tier = 'enterprise';

-- =====================================================
-- SEED DEFAULT FEATURES
-- =====================================================

INSERT INTO features (code, name, name_tr, category, value_type, sort_order, is_highlighted)
VALUES
  -- Menu features
  ('menu_categories', 'Menu Categories', 'Menü Kategorileri', 'menu', 'number', 1, true),
  ('menu_products', 'Menu Products', 'Menü Ürünleri', 'menu', 'number', 2, true),
  ('product_modifiers', 'Product Modifiers', 'Ürün Eklentileri', 'menu', 'boolean', 3, false),
  ('product_images', 'Multiple Product Images', 'Çoklu Ürün Görseli', 'menu', 'number', 4, false),
  ('nested_categories', 'Nested Categories', 'Alt Kategoriler', 'menu', 'boolean', 5, false),
  ('allergen_info', 'Allergen Information', 'Alerjen Bilgisi', 'menu', 'boolean', 6, false),

  -- Ordering features
  ('tables', 'Restaurant Tables', 'Masa Sayısı', 'ordering', 'number', 10, true),
  ('orders_per_month', 'Monthly Orders', 'Aylık Sipariş', 'ordering', 'number', 11, true),
  ('qr_ordering', 'QR Code Ordering', 'QR Kod Sipariş', 'ordering', 'boolean', 12, true),
  ('kitchen_display', 'Kitchen Display System', 'Mutfak Ekranı', 'ordering', 'boolean', 13, false),
  ('waiter_call', 'Waiter Call Button', 'Garson Çağır', 'ordering', 'boolean', 14, false),
  ('order_notes', 'Order Notes', 'Sipariş Notları', 'ordering', 'boolean', 15, false),

  -- Analytics features
  ('basic_analytics', 'Basic Analytics', 'Temel Analiz', 'analytics', 'boolean', 20, false),
  ('advanced_analytics', 'Advanced Analytics', 'Gelişmiş Analiz', 'analytics', 'boolean', 21, false),
  ('export_reports', 'Export Reports', 'Rapor Dışa Aktar', 'analytics', 'boolean', 22, false),
  ('real_time_dashboard', 'Real-time Dashboard', 'Anlık Panel', 'analytics', 'boolean', 23, false),

  -- Branding features
  ('custom_branding', 'Custom Branding', 'Özel Marka', 'branding', 'boolean', 30, false),
  ('custom_domain', 'Custom Domain', 'Özel Alan Adı', 'branding', 'boolean', 31, false),
  ('remove_watermark', 'Remove Watermark', 'Filigran Kaldır', 'branding', 'boolean', 32, false),

  -- AI features
  ('ai_descriptions', 'AI Menu Descriptions', 'AI Menü Açıklaması', 'ai', 'number', 40, true),
  ('ai_translations', 'AI Translations', 'AI Çeviri', 'ai', 'boolean', 41, false),
  ('ai_suggestions', 'AI Suggestions', 'AI Öneriler', 'ai', 'boolean', 42, false),

  -- Management features
  ('team_members', 'Team Members', 'Takım Üyeleri', 'management', 'number', 50, false),
  ('multi_location', 'Multiple Locations', 'Çoklu Şube', 'management', 'number', 51, true),
  ('role_management', 'Role Management', 'Rol Yönetimi', 'management', 'boolean', 52, false),

  -- Support features
  ('email_support', 'Email Support', 'E-posta Destek', 'support', 'boolean', 60, false),
  ('priority_support', 'Priority Support', 'Öncelikli Destek', 'support', 'boolean', 61, false),
  ('dedicated_manager', 'Dedicated Account Manager', 'Özel Hesap Yöneticisi', 'support', 'boolean', 62, false),

  -- Integration features
  ('api_access', 'API Access', 'API Erişimi', 'integrations', 'boolean', 70, false),
  ('webhooks', 'Webhooks', 'Webhook Entegrasyonu', 'integrations', 'boolean', 71, false),
  ('pos_integration', 'POS Integration', 'POS Entegrasyonu', 'integrations', 'boolean', 72, false)
ON CONFLICT (code) DO NOTHING;

-- =====================================================
-- SEED PLAN FEATURES (Link features to plans)
-- =====================================================

-- Helper: Get IDs
DO $$
DECLARE
  v_lite_id UUID;
  v_gold_id UUID;
  v_platinum_id UUID;
  v_enterprise_id UUID;
BEGIN
  SELECT id INTO v_lite_id FROM subscription_plans WHERE tier = 'lite';
  SELECT id INTO v_gold_id FROM subscription_plans WHERE tier = 'gold';
  SELECT id INTO v_platinum_id FROM subscription_plans WHERE tier = 'platinum';
  SELECT id INTO v_enterprise_id FROM subscription_plans WHERE tier = 'enterprise';

  -- Lite plan features
  INSERT INTO plan_features (plan_id, feature_id, is_enabled, value, is_unlimited)
  SELECT v_lite_id, id, true, '10', false FROM features WHERE code = 'menu_categories'
  ON CONFLICT (plan_id, feature_id) DO NOTHING;

  INSERT INTO plan_features (plan_id, feature_id, is_enabled, value, is_unlimited)
  SELECT v_lite_id, id, true, '50', false FROM features WHERE code = 'menu_products'
  ON CONFLICT (plan_id, feature_id) DO NOTHING;

  INSERT INTO plan_features (plan_id, feature_id, is_enabled, value, is_unlimited)
  SELECT v_lite_id, id, true, '10', false FROM features WHERE code = 'tables'
  ON CONFLICT (plan_id, feature_id) DO NOTHING;

  INSERT INTO plan_features (plan_id, feature_id, is_enabled, value, is_unlimited)
  SELECT v_lite_id, id, true, '500', false FROM features WHERE code = 'orders_per_month'
  ON CONFLICT (plan_id, feature_id) DO NOTHING;

  INSERT INTO plan_features (plan_id, feature_id, is_enabled, value, is_unlimited)
  SELECT v_lite_id, id, true, NULL, false FROM features WHERE code = 'qr_ordering'
  ON CONFLICT (plan_id, feature_id) DO NOTHING;

  INSERT INTO plan_features (plan_id, feature_id, is_enabled, value, is_unlimited)
  SELECT v_lite_id, id, true, NULL, false FROM features WHERE code = 'basic_analytics'
  ON CONFLICT (plan_id, feature_id) DO NOTHING;

  INSERT INTO plan_features (plan_id, feature_id, is_enabled, value, is_unlimited)
  SELECT v_lite_id, id, true, '2', false FROM features WHERE code = 'team_members'
  ON CONFLICT (plan_id, feature_id) DO NOTHING;

  INSERT INTO plan_features (plan_id, feature_id, is_enabled, value, is_unlimited)
  SELECT v_lite_id, id, true, NULL, false FROM features WHERE code = 'email_support'
  ON CONFLICT (plan_id, feature_id) DO NOTHING;

  -- Gold plan features (includes all Lite features plus more)
  INSERT INTO plan_features (plan_id, feature_id, is_enabled, value, is_unlimited)
  SELECT v_gold_id, id, true, '30', false FROM features WHERE code = 'menu_categories'
  ON CONFLICT (plan_id, feature_id) DO NOTHING;

  INSERT INTO plan_features (plan_id, feature_id, is_enabled, value, is_unlimited)
  SELECT v_gold_id, id, true, '200', false FROM features WHERE code = 'menu_products'
  ON CONFLICT (plan_id, feature_id) DO NOTHING;

  INSERT INTO plan_features (plan_id, feature_id, is_enabled, value, is_unlimited)
  SELECT v_gold_id, id, true, '30', false FROM features WHERE code = 'tables'
  ON CONFLICT (plan_id, feature_id) DO NOTHING;

  INSERT INTO plan_features (plan_id, feature_id, is_enabled, value, is_unlimited)
  SELECT v_gold_id, id, true, '2000', false FROM features WHERE code = 'orders_per_month'
  ON CONFLICT (plan_id, feature_id) DO NOTHING;

  INSERT INTO plan_features (plan_id, feature_id, is_enabled, value, is_unlimited)
  SELECT v_gold_id, id, true, NULL, false FROM features WHERE code = 'qr_ordering'
  ON CONFLICT (plan_id, feature_id) DO NOTHING;

  INSERT INTO plan_features (plan_id, feature_id, is_enabled, value, is_unlimited)
  SELECT v_gold_id, id, true, NULL, false FROM features WHERE code = 'product_modifiers'
  ON CONFLICT (plan_id, feature_id) DO NOTHING;

  INSERT INTO plan_features (plan_id, feature_id, is_enabled, value, is_unlimited)
  SELECT v_gold_id, id, true, '5', false FROM features WHERE code = 'product_images'
  ON CONFLICT (plan_id, feature_id) DO NOTHING;

  INSERT INTO plan_features (plan_id, feature_id, is_enabled, value, is_unlimited)
  SELECT v_gold_id, id, true, NULL, false FROM features WHERE code = 'kitchen_display'
  ON CONFLICT (plan_id, feature_id) DO NOTHING;

  INSERT INTO plan_features (plan_id, feature_id, is_enabled, value, is_unlimited)
  SELECT v_gold_id, id, true, NULL, false FROM features WHERE code = 'waiter_call'
  ON CONFLICT (plan_id, feature_id) DO NOTHING;

  INSERT INTO plan_features (plan_id, feature_id, is_enabled, value, is_unlimited)
  SELECT v_gold_id, id, true, NULL, false FROM features WHERE code = 'basic_analytics'
  ON CONFLICT (plan_id, feature_id) DO NOTHING;

  INSERT INTO plan_features (plan_id, feature_id, is_enabled, value, is_unlimited)
  SELECT v_gold_id, id, true, NULL, false FROM features WHERE code = 'custom_branding'
  ON CONFLICT (plan_id, feature_id) DO NOTHING;

  INSERT INTO plan_features (plan_id, feature_id, is_enabled, value, is_unlimited)
  SELECT v_gold_id, id, true, '50', false FROM features WHERE code = 'ai_descriptions'
  ON CONFLICT (plan_id, feature_id) DO NOTHING;

  INSERT INTO plan_features (plan_id, feature_id, is_enabled, value, is_unlimited)
  SELECT v_gold_id, id, true, '5', false FROM features WHERE code = 'team_members'
  ON CONFLICT (plan_id, feature_id) DO NOTHING;

  INSERT INTO plan_features (plan_id, feature_id, is_enabled, value, is_unlimited)
  SELECT v_gold_id, id, true, '2', false FROM features WHERE code = 'multi_location'
  ON CONFLICT (plan_id, feature_id) DO NOTHING;

  INSERT INTO plan_features (plan_id, feature_id, is_enabled, value, is_unlimited)
  SELECT v_gold_id, id, true, NULL, false FROM features WHERE code = 'email_support'
  ON CONFLICT (plan_id, feature_id) DO NOTHING;

  INSERT INTO plan_features (plan_id, feature_id, is_enabled, value, is_unlimited)
  SELECT v_gold_id, id, true, NULL, false FROM features WHERE code = 'priority_support'
  ON CONFLICT (plan_id, feature_id) DO NOTHING;

  -- Platinum plan features (all features with high limits)
  INSERT INTO plan_features (plan_id, feature_id, is_enabled, value, is_unlimited)
  SELECT v_platinum_id, id, true, NULL, true FROM features WHERE code IN (
    'menu_categories', 'menu_products', 'tables', 'orders_per_month'
  )
  ON CONFLICT (plan_id, feature_id) DO NOTHING;

  INSERT INTO plan_features (plan_id, feature_id, is_enabled, value, is_unlimited)
  SELECT v_platinum_id, id, true, NULL, false FROM features WHERE code IN (
    'qr_ordering', 'product_modifiers', 'nested_categories', 'allergen_info',
    'kitchen_display', 'waiter_call', 'order_notes',
    'basic_analytics', 'advanced_analytics', 'export_reports', 'real_time_dashboard',
    'custom_branding', 'remove_watermark',
    'ai_translations', 'ai_suggestions', 'role_management',
    'email_support', 'priority_support'
  )
  ON CONFLICT (plan_id, feature_id) DO NOTHING;

  INSERT INTO plan_features (plan_id, feature_id, is_enabled, value, is_unlimited)
  SELECT v_platinum_id, id, true, '10', false FROM features WHERE code = 'product_images'
  ON CONFLICT (plan_id, feature_id) DO NOTHING;

  INSERT INTO plan_features (plan_id, feature_id, is_enabled, value, is_unlimited)
  SELECT v_platinum_id, id, true, '200', false FROM features WHERE code = 'ai_descriptions'
  ON CONFLICT (plan_id, feature_id) DO NOTHING;

  INSERT INTO plan_features (plan_id, feature_id, is_enabled, value, is_unlimited)
  SELECT v_platinum_id, id, true, '15', false FROM features WHERE code = 'team_members'
  ON CONFLICT (plan_id, feature_id) DO NOTHING;

  INSERT INTO plan_features (plan_id, feature_id, is_enabled, value, is_unlimited)
  SELECT v_platinum_id, id, true, '5', false FROM features WHERE code = 'multi_location'
  ON CONFLICT (plan_id, feature_id) DO NOTHING;

  -- Enterprise plan features (everything unlimited)
  INSERT INTO plan_features (plan_id, feature_id, is_enabled, is_unlimited)
  SELECT v_enterprise_id, id, true, true FROM features
  ON CONFLICT (plan_id, feature_id) DO NOTHING;

END $$;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE features IS 'Platform features that can be enabled/limited per subscription plan';
COMMENT ON TABLE subscription_plans IS 'Available subscription plans (Lite, Gold, Platinum, Enterprise)';
COMMENT ON TABLE plan_features IS 'Junction table linking plans to features with specific limits';
COMMENT ON TABLE organization_subscriptions IS 'Active subscriptions for organizations';
COMMENT ON TABLE feature_overrides IS 'Organization-specific feature overrides (e.g., for promotions or custom deals)';
COMMENT ON TABLE feature_usage IS 'Tracks feature usage for limit enforcement';

COMMENT ON COLUMN features.code IS 'Unique code for programmatic access (e.g., "menu_categories")';
COMMENT ON COLUMN features.value_type IS 'Type of feature value: boolean (on/off), number (with limit), unlimited';

COMMENT ON COLUMN subscription_plans.tier IS 'Subscription tier level from subscription_tier enum';
COMMENT ON COLUMN subscription_plans.requires_contact IS 'If true, show "Contact Us" instead of price';

COMMENT ON COLUMN plan_features.is_unlimited IS 'If true, feature has no limit regardless of value field';

COMMENT ON COLUMN organization_subscriptions.price_at_subscription IS 'Price locked at subscription time for billing consistency';
COMMENT ON COLUMN organization_subscriptions.cancel_at_period_end IS 'If true, subscription will not renew after current period';

COMMENT ON COLUMN feature_overrides.expires_at IS 'If NULL, override is permanent; otherwise expires at this time';

COMMENT ON FUNCTION org_has_feature(UUID, TEXT) IS 'Check if organization has access to a feature (considers overrides and plan)';
COMMENT ON FUNCTION get_org_feature_limit(UUID, TEXT) IS 'Get feature limit for organization (-1 = unlimited)';
COMMENT ON FUNCTION increment_feature_usage(UUID, TEXT, INTEGER) IS 'Increment usage counter and check if within limit';
