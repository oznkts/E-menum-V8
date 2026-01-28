-- =====================================================
-- Fix membership SELECT policy to allow users to see their own memberships
-- Migration: 008_fix_membership_self_select
-- Description: Add direct self-membership policy to avoid circular RLS
-- =====================================================

-- Drop all existing membership SELECT policies
DROP POLICY IF EXISTS "Users can view memberships in their organizations" ON memberships;
DROP POLICY IF EXISTS "Users can view their own memberships" ON memberships;
DROP POLICY IF EXISTS "Users can view co-members in their organizations" ON memberships;

-- Create a simple policy: Users can always see their OWN memberships
CREATE POLICY "Users can view their own memberships"
  ON memberships
  FOR SELECT
  USING (user_id = auth.uid());

-- Also allow users to see other members in orgs where they are a member
-- This uses a subquery instead of the helper function to avoid issues
CREATE POLICY "Users can view co-members in their organizations"
  ON memberships
  FOR SELECT
  USING (
    organization_id IN (
      SELECT m.organization_id 
      FROM memberships m 
      WHERE m.user_id = auth.uid() 
      AND m.is_active = true
    )
  );

-- Fix organizations SELECT policy too
DROP POLICY IF EXISTS "Users can view their organizations" ON organizations;
DROP POLICY IF EXISTS "Owners can view their organizations" ON organizations;
DROP POLICY IF EXISTS "Members can view their organizations" ON organizations;

-- Users can view organizations where they are the owner
CREATE POLICY "Owners can view their organizations"
  ON organizations
  FOR SELECT
  USING (owner_id = auth.uid());

-- Users can view organizations where they have membership
CREATE POLICY "Members can view their organizations"
  ON organizations
  FOR SELECT
  USING (
    id IN (
      SELECT m.organization_id 
      FROM memberships m 
      WHERE m.user_id = auth.uid() 
      AND m.is_active = true
    )
  );
