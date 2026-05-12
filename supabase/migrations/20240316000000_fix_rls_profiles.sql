-- ============================================
-- Vastu Course: Fix RLS Infinite Recursion
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Create a helper function to get the current user's role
-- This function uses SECURITY DEFINER to bypass RLS and avoid infinite recursion
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text
LANGUAGE sql SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- 2. Update existing policies that check for the 'teacher' role
-- Drop old policies first (these names must match your existing policies, we'll try to drop the ones we just saw)
DROP POLICY IF EXISTS "Teachers can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Teachers can manage weeks" ON weeks;
DROP POLICY IF EXISTS "Teachers can edit weeks" ON weeks;
DROP POLICY IF EXISTS "Teachers can update weeks." ON weeks;
DROP POLICY IF EXISTS "Teachers can insert weeks." ON weeks;
DROP POLICY IF EXISTS "Teachers can delete weeks." ON weeks;
DROP POLICY IF EXISTS "Teachers can manage days" ON days;
DROP POLICY IF EXISTS "Teachers can edit days." ON days;
DROP POLICY IF EXISTS "Teachers can manage materials" ON materials;
DROP POLICY IF EXISTS "Teachers can edit materials." ON materials;
DROP POLICY IF EXISTS "Teachers can view all progress" ON progress;
DROP POLICY IF EXISTS "Teachers can manage library" ON library_items;

-- 3. Recreate the policies using the new helper function
CREATE POLICY "Teachers can view all profiles" ON profiles FOR SELECT USING ( public.get_user_role() = 'teacher' );

-- Weeks policies (covering both variants found in schema files)
CREATE POLICY "Teachers can manage weeks" ON weeks FOR ALL USING ( public.get_user_role() = 'teacher' );
CREATE POLICY "Teachers can insert weeks." ON weeks FOR INSERT WITH CHECK ( public.get_user_role() = 'teacher' );
CREATE POLICY "Teachers can update weeks." ON weeks FOR UPDATE USING ( public.get_user_role() = 'teacher' );
CREATE POLICY "Teachers can delete weeks." ON weeks FOR DELETE USING ( public.get_user_role() = 'teacher' );

-- Days policies
CREATE POLICY "Teachers can manage days" ON days FOR ALL USING ( public.get_user_role() = 'teacher' );
CREATE POLICY "Teachers can edit days." ON days FOR ALL USING ( public.get_user_role() = 'teacher' );

-- Materials policies
CREATE POLICY "Teachers can manage materials" ON materials FOR ALL USING ( public.get_user_role() = 'teacher' );
CREATE POLICY "Teachers can edit materials." ON materials FOR ALL USING ( public.get_user_role() = 'teacher' );

-- Progress & Library & settings policies
CREATE POLICY "Teachers can view all progress" ON progress FOR SELECT USING ( public.get_user_role() = 'teacher' );
CREATE POLICY "Teachers can manage library" ON library_items FOR ALL USING ( public.get_user_role() = 'teacher' );

-- Platform settings
DROP POLICY IF EXISTS "Enable update for teachers" ON public.platform_settings;
CREATE POLICY "Enable update for teachers" ON public.platform_settings 
FOR ALL TO authenticated 
USING ( public.get_user_role() = 'teacher' )
WITH CHECK ( public.get_user_role() = 'teacher' );
