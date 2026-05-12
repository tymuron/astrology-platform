-- =====================================================
-- FIX: Backfill missing profiles + fix trigger + fix RLS
-- Run this in Supabase SQL Editor
-- =====================================================

-- 1. Create/fix the trigger function for new user signups
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, created_at)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    'student',
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Ensure the trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Backfill all auth.users who don't have a profiles row yet
INSERT INTO public.profiles (id, email, full_name, role, created_at)
SELECT
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'full_name', au.raw_user_meta_data->>'name'),
  'student',
  au.created_at
FROM auth.users au
LEFT JOIN public.profiles p ON p.id = au.id
WHERE p.id IS NULL;

-- 4. Fix any profiles with NULL role
UPDATE public.profiles SET role = 'student' WHERE role IS NULL;

-- 5. Fix RLS recursion: helper function so teacher policies don't infinitely recurse
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text
LANGUAGE sql SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- 6. Fix the teacher profiles policy to use the helper function
DROP POLICY IF EXISTS "Teachers can view all profiles" ON profiles;
CREATE POLICY "Teachers can view all profiles"
  ON profiles FOR SELECT
  USING ( public.get_user_role() = 'teacher' );
