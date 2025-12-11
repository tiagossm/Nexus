-- Migration: Authentication & RBAC System
-- This migration creates the profiles table with role-based access control
-- and multi-tenancy support (company isolation)

-- =============================================================================
-- 1. PROFILES TABLE (extends auth.users)
-- =============================================================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  
  -- Multi-tenancy: User belongs to a company
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  
  -- RBAC: Role-based access control
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('super_admin', 'org_admin', 'manager', 'user', 'viewer')),
  
  -- Approval workflow: Users need approval before accessing the system
  is_approved BOOLEAN DEFAULT false,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  
  -- Account status
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_company ON profiles(company_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_is_approved ON profiles(is_approved);

-- =============================================================================
-- 2. ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Super admins can view all profiles
CREATE POLICY "Super admins can view all profiles" ON profiles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

-- Org admins can view profiles in their company
CREATE POLICY "Org admins can view company profiles" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.id = auth.uid() 
      AND p.role IN ('super_admin', 'org_admin')
      AND (p.company_id = profiles.company_id OR p.role = 'super_admin')
    )
  );

-- Users can update their own profile (limited fields)
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Super admins can update any profile
CREATE POLICY "Super admins can update any profile" ON profiles
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

-- Org admins can update profiles in their company
CREATE POLICY "Org admins can update company profiles" ON profiles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.id = auth.uid() 
      AND p.role IN ('super_admin', 'org_admin')
      AND (p.company_id = profiles.company_id OR p.role = 'super_admin')
    )
  );

-- Allow insert during signup (trigger handles this)
CREATE POLICY "Allow profile creation on signup" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- =============================================================================
-- 3. TRIGGER: Auto-create profile on user signup
-- =============================================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  is_first_user BOOLEAN;
  should_approve BOOLEAN;
BEGIN
  -- Check if this is the first user (becomes super_admin, auto-approved)
  SELECT COUNT(*) = 0 INTO is_first_user FROM public.profiles;
  
  -- Check if email is the designated sysadmin
  should_approve := (NEW.email = 'eng.tiagosm@gmail.com') OR is_first_user;
  
  INSERT INTO public.profiles (
    id, 
    email, 
    full_name, 
    avatar_url,
    role,
    is_approved,
    approved_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url',
    CASE WHEN (NEW.email = 'eng.tiagosm@gmail.com') OR is_first_user THEN 'super_admin' ELSE 'user' END,
    should_approve,
    CASE WHEN should_approve THEN NOW() ELSE NULL END
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if exists, then create
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- =============================================================================
-- 4. TRIGGER: Update updated_at on profile changes
-- =============================================================================
CREATE OR REPLACE FUNCTION update_profile_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_profile_updated ON profiles;
CREATE TRIGGER on_profile_updated
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_profile_updated_at();

-- =============================================================================
-- 5. SEED: Update existing users if they exist
-- =============================================================================
-- Make eng.tiagosm@gmail.com a super_admin if they exist
DO $$
DECLARE
  user_id UUID;
BEGIN
  SELECT id INTO user_id FROM auth.users WHERE email = 'eng.tiagosm@gmail.com' LIMIT 1;
  
  IF user_id IS NOT NULL THEN
    INSERT INTO public.profiles (id, email, role, is_approved, approved_at)
    VALUES (user_id, 'eng.tiagosm@gmail.com', 'super_admin', true, NOW())
    ON CONFLICT (id) DO UPDATE SET
      role = 'super_admin',
      is_approved = true,
      approved_at = NOW();
  END IF;
END $$;

-- =============================================================================
-- 6. HELPER FUNCTION: Check user role
-- =============================================================================
CREATE OR REPLACE FUNCTION get_user_role(user_id UUID)
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = user_id;
$$ LANGUAGE sql SECURITY DEFINER;

-- Helper to check if user has minimum role
CREATE OR REPLACE FUNCTION user_has_role(user_id UUID, required_roles TEXT[])
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = user_id 
    AND role = ANY(required_roles)
    AND is_approved = true
    AND is_active = true
  );
$$ LANGUAGE sql SECURITY DEFINER;
