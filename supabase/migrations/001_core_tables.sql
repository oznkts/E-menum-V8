-- =====================================================
-- E-Menum Core Database Tables Migration
-- Migration: 001_core_tables
-- Description: Create core tables: organizations, profiles, memberships
-- =====================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- ENUM TYPES
-- =====================================================

-- Subscription tier levels
CREATE TYPE subscription_tier AS ENUM (
  'lite',       -- Basic tier - limited features
  'gold',       -- Mid-tier - most features
  'platinum',   -- Premium tier - all features
  'enterprise'  -- Custom tier - unlimited + API access
);

-- Subscription status
CREATE TYPE subscription_status AS ENUM (
  'active',     -- Subscription is active
  'trialing',   -- In trial period
  'past_due',   -- Payment overdue
  'canceled',   -- Subscription canceled
  'paused'      -- Temporarily paused
);

-- User role within organization
CREATE TYPE organization_role AS ENUM (
  'owner',      -- Full access + billing + can delete org
  'admin',      -- Full content + user management
  'manager',    -- Content management + reports
  'staff',      -- Order + table management (waiter)
  'kitchen',    -- Kitchen display only
  'viewer'      -- Read-only access
);

-- Platform-level system role
CREATE TYPE system_role AS ENUM (
  'user',       -- Regular user (default)
  'support',    -- Platform support staff
  'sales',      -- Platform sales team
  'superadmin'  -- Platform administrator
);

-- =====================================================
-- ORGANIZATIONS TABLE
-- Core multi-tenant entity representing a restaurant/business
-- =====================================================

CREATE TABLE organizations (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Basic info
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,  -- URL-friendly identifier (e.g., /r/my-restaurant)
  description TEXT,

  -- Ownership (references auth.users)
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,

  -- Subscription
  subscription_tier subscription_tier NOT NULL DEFAULT 'lite',
  subscription_status subscription_status NOT NULL DEFAULT 'trialing',
  trial_ends_at TIMESTAMPTZ,

  -- Branding
  logo_url TEXT,
  cover_url TEXT,
  primary_color TEXT DEFAULT '#2563eb',  -- Brand primary color
  secondary_color TEXT DEFAULT '#1e40af', -- Brand secondary color

  -- Contact info
  phone TEXT,
  email TEXT,
  website TEXT,

  -- Address
  address TEXT,
  city TEXT,
  district TEXT,
  postal_code TEXT,
  country TEXT NOT NULL DEFAULT 'TR',
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),

  -- Operational settings
  timezone TEXT NOT NULL DEFAULT 'Europe/Istanbul',
  currency TEXT NOT NULL DEFAULT 'TRY',
  language TEXT NOT NULL DEFAULT 'tr',

  -- Business hours stored as JSONB
  -- Format: { "mon": { "open": "09:00", "close": "22:00" }, ... }
  business_hours JSONB,

  -- Feature settings stored as JSONB
  -- Allows flexible settings without schema changes
  settings JSONB DEFAULT '{}'::jsonb,

  -- Metadata
  tax_id TEXT,  -- Vergi numarasi
  trade_registration TEXT,  -- Ticaret sicil no

  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,
  deleted_at TIMESTAMPTZ,  -- Soft delete

  -- Constraints
  CONSTRAINT slug_format CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  CONSTRAINT slug_length CHECK (char_length(slug) >= 3 AND char_length(slug) <= 63)
);

-- Indexes for organizations
CREATE INDEX idx_organizations_owner_id ON organizations(owner_id);
CREATE INDEX idx_organizations_slug ON organizations(slug);
CREATE INDEX idx_organizations_subscription_tier ON organizations(subscription_tier);
CREATE INDEX idx_organizations_subscription_status ON organizations(subscription_status);
CREATE INDEX idx_organizations_is_active ON organizations(is_active) WHERE is_active = true;
CREATE INDEX idx_organizations_city ON organizations(city);
CREATE INDEX idx_organizations_created_at ON organizations(created_at DESC);

-- =====================================================
-- PROFILES TABLE
-- Extends auth.users with additional user information
-- =====================================================

CREATE TABLE profiles (
  -- Primary key (same as auth.users id)
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Basic info
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  phone TEXT,

  -- Platform-level role
  system_role system_role NOT NULL DEFAULT 'user',

  -- Preferences stored as JSONB
  -- { "theme": "dark", "language": "tr", "notifications": {...} }
  preferences JSONB DEFAULT '{}'::jsonb,

  -- Email verification
  email_verified BOOLEAN NOT NULL DEFAULT false,
  email_verified_at TIMESTAMPTZ,

  -- Account status
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_login_at TIMESTAMPTZ,

  -- Soft delete
  deleted_at TIMESTAMPTZ,

  -- Constraints
  CONSTRAINT email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Indexes for profiles
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_system_role ON profiles(system_role);
CREATE INDEX idx_profiles_is_active ON profiles(is_active) WHERE is_active = true;
CREATE INDEX idx_profiles_created_at ON profiles(created_at DESC);

-- =====================================================
-- MEMBERSHIPS TABLE
-- Links users to organizations with roles
-- Enables multi-user access to organizations
-- =====================================================

CREATE TABLE memberships (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Foreign keys
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Role within this organization
  role organization_role NOT NULL DEFAULT 'staff',

  -- Invitation tracking
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  invited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  joined_at TIMESTAMPTZ,  -- NULL until invitation accepted

  -- Invitation token for email invites
  invitation_token TEXT,
  invitation_expires_at TIMESTAMPTZ,

  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,

  -- Constraints
  CONSTRAINT unique_org_user UNIQUE (organization_id, user_id)
);

-- Indexes for memberships
CREATE INDEX idx_memberships_organization_id ON memberships(organization_id);
CREATE INDEX idx_memberships_user_id ON memberships(user_id);
CREATE INDEX idx_memberships_role ON memberships(role);
CREATE INDEX idx_memberships_is_active ON memberships(is_active) WHERE is_active = true;
CREATE INDEX idx_memberships_invitation_token ON memberships(invitation_token) WHERE invitation_token IS NOT NULL;

-- =====================================================
-- TRIGGER FUNCTIONS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create owner membership when organization is created
CREATE OR REPLACE FUNCTION handle_new_organization()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.memberships (organization_id, user_id, role, joined_at)
  VALUES (NEW.id, NEW.owner_id, 'owner', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to validate slug uniqueness (case-insensitive)
CREATE OR REPLACE FUNCTION validate_organization_slug()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM organizations
    WHERE LOWER(slug) = LOWER(NEW.slug)
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
  ) THEN
    RAISE EXCEPTION 'Organization slug already exists (case-insensitive)';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Updated_at triggers
CREATE TRIGGER set_organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_memberships_updated_at
  BEFORE UPDATE ON memberships
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Auto-create profile on new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Auto-create owner membership when organization is created
CREATE TRIGGER on_organization_created
  AFTER INSERT ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_organization();

-- Validate slug uniqueness
CREATE TRIGGER validate_org_slug_before_insert
  BEFORE INSERT ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION validate_organization_slug();

CREATE TRIGGER validate_org_slug_before_update
  BEFORE UPDATE OF slug ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION validate_organization_slug();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- CRITICAL: Enable RLS on ALL tables
-- =====================================================

-- Enable RLS
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES - Organizations
-- =====================================================

-- Organizations: Users can view organizations they are members of
CREATE POLICY "Users can view their organizations"
  ON organizations
  FOR SELECT
  USING (
    id IN (
      SELECT organization_id FROM memberships
      WHERE user_id = auth.uid() AND is_active = true
    )
    OR owner_id = auth.uid()
  );

-- Organizations: Public view for active organizations (for QR menu)
CREATE POLICY "Public can view active organizations by slug"
  ON organizations
  FOR SELECT
  USING (is_active = true AND deleted_at IS NULL);

-- Organizations: Only authenticated users can create
CREATE POLICY "Authenticated users can create organizations"
  ON organizations
  FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

-- Organizations: Only owners and admins can update
CREATE POLICY "Owners and admins can update organizations"
  ON organizations
  FOR UPDATE
  USING (
    id IN (
      SELECT organization_id FROM memberships
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
      AND is_active = true
    )
  );

-- Organizations: Only owners can delete (soft delete)
CREATE POLICY "Only owners can delete organizations"
  ON organizations
  FOR DELETE
  USING (owner_id = auth.uid());

-- =====================================================
-- RLS POLICIES - Profiles
-- =====================================================

-- Profiles: Users can view their own profile
CREATE POLICY "Users can view their own profile"
  ON profiles
  FOR SELECT
  USING (id = auth.uid());

-- Profiles: Users can view profiles of members in same organization
CREATE POLICY "Users can view profiles in their organizations"
  ON profiles
  FOR SELECT
  USING (
    id IN (
      SELECT m2.user_id
      FROM memberships m1
      JOIN memberships m2 ON m1.organization_id = m2.organization_id
      WHERE m1.user_id = auth.uid() AND m1.is_active = true AND m2.is_active = true
    )
  );

-- Profiles: Users can update their own profile
CREATE POLICY "Users can update their own profile"
  ON profiles
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Profiles: System creates profiles (via trigger)
CREATE POLICY "System can insert profiles"
  ON profiles
  FOR INSERT
  WITH CHECK (true);  -- Controlled by SECURITY DEFINER trigger

-- =====================================================
-- RLS POLICIES - Memberships
-- =====================================================

-- Memberships: Users can view memberships in their organizations
CREATE POLICY "Users can view memberships in their organizations"
  ON memberships
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM memberships
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Memberships: Users can view their own memberships
CREATE POLICY "Users can view their own memberships"
  ON memberships
  FOR SELECT
  USING (user_id = auth.uid());

-- Memberships: Owners and admins can create memberships (invite users)
CREATE POLICY "Owners and admins can invite users"
  ON memberships
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM memberships
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
      AND is_active = true
    )
    AND invited_by = auth.uid()
  );

-- Memberships: System can create memberships (via trigger for owner)
CREATE POLICY "System can insert memberships"
  ON memberships
  FOR INSERT
  WITH CHECK (true);  -- Controlled by SECURITY DEFINER trigger

-- Memberships: Owners and admins can update memberships
CREATE POLICY "Owners and admins can update memberships"
  ON memberships
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM memberships
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
      AND is_active = true
    )
    -- Prevent owners from being modified except by themselves
    AND NOT (role = 'owner' AND user_id != auth.uid())
  );

-- Memberships: Users can update their own membership (accept invite)
CREATE POLICY "Users can accept their own invitations"
  ON memberships
  FOR UPDATE
  USING (user_id = auth.uid() AND joined_at IS NULL)
  WITH CHECK (user_id = auth.uid());

-- Memberships: Owners can delete memberships (except their own)
CREATE POLICY "Owners can remove members"
  ON memberships
  FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM memberships
      WHERE user_id = auth.uid()
      AND role = 'owner'
      AND is_active = true
    )
    AND user_id != auth.uid()  -- Cannot remove themselves
  );

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to check if user has specific role in organization
CREATE OR REPLACE FUNCTION user_has_org_role(
  p_user_id UUID,
  p_org_id UUID,
  p_roles organization_role[]
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM memberships
    WHERE user_id = p_user_id
    AND organization_id = p_org_id
    AND role = ANY(p_roles)
    AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's role in organization
CREATE OR REPLACE FUNCTION get_user_org_role(
  p_user_id UUID,
  p_org_id UUID
)
RETURNS organization_role AS $$
DECLARE
  v_role organization_role;
BEGIN
  SELECT role INTO v_role
  FROM memberships
  WHERE user_id = p_user_id
  AND organization_id = p_org_id
  AND is_active = true
  LIMIT 1;

  RETURN v_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is organization owner
CREATE OR REPLACE FUNCTION is_org_owner(
  p_user_id UUID,
  p_org_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM organizations
    WHERE id = p_org_id
    AND owner_id = p_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get all organizations for a user
CREATE OR REPLACE FUNCTION get_user_organizations(p_user_id UUID)
RETURNS TABLE (
  organization_id UUID,
  organization_name TEXT,
  organization_slug TEXT,
  user_role organization_role,
  is_owner BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    o.id,
    o.name,
    o.slug,
    m.role,
    (o.owner_id = p_user_id)
  FROM organizations o
  JOIN memberships m ON o.id = m.organization_id
  WHERE m.user_id = p_user_id
  AND m.is_active = true
  AND o.is_active = true
  AND o.deleted_at IS NULL
  ORDER BY m.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE organizations IS 'Multi-tenant organizations representing restaurants/businesses';
COMMENT ON TABLE profiles IS 'User profiles extending auth.users with additional information';
COMMENT ON TABLE memberships IS 'Links users to organizations with specific roles';

COMMENT ON COLUMN organizations.slug IS 'URL-friendly unique identifier for public menu access';
COMMENT ON COLUMN organizations.subscription_tier IS 'Current subscription plan level';
COMMENT ON COLUMN organizations.settings IS 'Flexible JSONB settings for feature flags and preferences';

COMMENT ON COLUMN profiles.system_role IS 'Platform-level role (superadmin, support, etc.)';
COMMENT ON COLUMN profiles.preferences IS 'User preferences stored as JSONB';

COMMENT ON COLUMN memberships.role IS 'User role within this specific organization';
COMMENT ON COLUMN memberships.invitation_token IS 'Token for email invitation verification';
