-- =====================================================
-- Fix recursive RLS policies on memberships
-- Migration: 007_fix_membership_policies
-- Description: Replace self-referential policies with helper functions
-- Depends on: 006_rls_policies.sql (helper functions)
-- =====================================================

-- Memberships: Users can view memberships in their organizations
DROP POLICY IF EXISTS "Users can view memberships in their organizations" ON memberships;
CREATE POLICY "Users can view memberships in their organizations"
  ON memberships
  FOR SELECT
  USING (user_is_org_member(organization_id));

-- Memberships: Owners and admins can create memberships (invite users)
DROP POLICY IF EXISTS "Owners and admins can invite users" ON memberships;
CREATE POLICY "Owners and admins can invite users"
  ON memberships
  FOR INSERT
  WITH CHECK (
    user_has_org_permission(
      organization_id,
      ARRAY['owner','admin']::organization_role[]
    )
  );

-- Memberships: Owners and admins can update memberships
DROP POLICY IF EXISTS "Owners and admins can update memberships" ON memberships;
CREATE POLICY "Owners and admins can update memberships"
  ON memberships
  FOR UPDATE
  USING (
    user_has_org_permission(
      organization_id,
      ARRAY['owner','admin']::organization_role[]
    )
  );

-- Memberships: Owners can delete memberships (except their own)
DROP POLICY IF EXISTS "Owners can remove members" ON memberships;
CREATE POLICY "Owners can remove members"
  ON memberships
  FOR DELETE
  USING (
    user_has_org_permission(
      organization_id,
      ARRAY['owner']::organization_role[]
    )
  );

-- Organizations: Users can view organizations they are members of
DROP POLICY IF EXISTS "Users can view their organizations" ON organizations;
CREATE POLICY "Users can view their organizations"
  ON organizations
  FOR SELECT
  USING (user_is_org_member(id) OR owner_id = auth.uid());
