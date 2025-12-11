-- Fix RLS Infinite Recursion using SECURITY DEFINER functions

-- 1. Create helper functions that bypass RLS
CREATE OR REPLACE FUNCTION get_user_role(user_id UUID)
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = user_id;
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_user_company_id(user_id UUID)
RETURNS UUID AS $$
  SELECT company_id FROM public.profiles WHERE id = user_id;
$$ LANGUAGE sql SECURITY DEFINER;

-- 2. Drop existing recursive policies
DROP POLICY IF EXISTS "Super admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Org admins can view company profiles" ON profiles;
DROP POLICY IF EXISTS "Super admins can update any profile" ON profiles;
DROP POLICY IF EXISTS "Org admins can update company profiles" ON profiles;

-- 3. Re-create policies using the helper functions (Non-recursive)

-- Super admins can view all profiles
CREATE POLICY "Super admins can view all profiles" ON profiles
  FOR SELECT USING (
    get_user_role(auth.uid()) = 'super_admin'
  );

-- Org admins can view profiles in their company
CREATE POLICY "Org admins can view company profiles" ON profiles
  FOR SELECT USING (
    (get_user_role(auth.uid()) IN ('super_admin', 'org_admin'))
    AND
    (
      company_id = get_user_company_id(auth.uid()) 
      OR 
      get_user_role(auth.uid()) = 'super_admin'
    )
  );

-- Super admins can update any profile
CREATE POLICY "Super admins can update any profile" ON profiles
  FOR UPDATE USING (
    get_user_role(auth.uid()) = 'super_admin'
  );

-- Org admins can update profiles in their company
CREATE POLICY "Org admins can update company profiles" ON profiles
  FOR UPDATE USING (
    (get_user_role(auth.uid()) IN ('super_admin', 'org_admin'))
    AND
    (
      company_id = get_user_company_id(auth.uid()) 
      OR 
      get_user_role(auth.uid()) = 'super_admin'
    )
  );
