-- =====================================================
-- Fix infinite recursion in memberships RLS policy
-- Migration: 009_fix_infinite_recursion
-- Description: Remove self-referential policies that cause infinite loops
-- =====================================================

-- Drop the problematic policy that causes infinite recursion
DROP POLICY IF EXISTS "Users can view co-members in their organizations" ON memberships;

-- Drop and recreate the membership SELECT policy
-- Only allow users to see their OWN memberships (simple, no recursion)
DROP POLICY IF EXISTS "Users can view their own memberships" ON memberships;
CREATE POLICY "Users can view their own memberships"
  ON memberships
  FOR SELECT
  USING (user_id = auth.uid());

-- For INSERT: Allow authenticated users to create their own membership
-- This is needed for organization creation (owner creates their own membership)
DROP POLICY IF EXISTS "Users can create their own membership" ON memberships;
CREATE POLICY "Users can create their own membership"
  ON memberships
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Fix the organization policies too - avoid referencing memberships in subquery
DROP POLICY IF EXISTS "Members can view their organizations" ON organizations;

-- Create a SECURITY DEFINER function to safely check membership without RLS recursion
CREATE OR REPLACE FUNCTION get_user_org_ids_bypass_rls()
RETURNS UUID[] AS $$
  SELECT COALESCE(
    array_agg(organization_id),
    '{}'::UUID[]
  )
  FROM memberships
  WHERE user_id = auth.uid()
  AND is_active = true;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Members can view organizations using the bypass function
CREATE POLICY "Members can view their organizations"
  ON organizations
  FOR SELECT
  USING (id = ANY(get_user_org_ids_bypass_rls()));

-- Also fix organizations INSERT policy for new restaurant creation
DROP POLICY IF EXISTS "Authenticated users can create organizations" ON organizations;
CREATE POLICY "Authenticated users can create organizations"
  ON organizations
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND owner_id = auth.uid());

-- Ensure owners can update their organizations
DROP POLICY IF EXISTS "Owners can update their organizations" ON organizations;
CREATE POLICY "Owners can update their organizations"
  ON organizations
  FOR UPDATE
  USING (owner_id = auth.uid());

-- Ensure owners can delete their organizations
DROP POLICY IF EXISTS "Owners can delete their organizations" ON organizations;
CREATE POLICY "Owners can delete their organizations"
  ON organizations
  FOR DELETE
  USING (owner_id = auth.uid());

-- =====================================================
-- END OF MIGRATION
-- =====================================================

