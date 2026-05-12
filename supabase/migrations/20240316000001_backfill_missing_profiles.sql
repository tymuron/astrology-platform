-- Backfill missing profiles for auth users who don't have a profiles row.
-- This happens when users were created before the handle_new_user() trigger
-- was set up, or when the trigger failed silently.

INSERT INTO public.profiles (id, email, name, role, created_at)
SELECT
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'full_name', au.raw_user_meta_data->>'name'),
  'student',
  au.created_at
FROM auth.users au
LEFT JOIN public.profiles p ON p.id = au.id
WHERE p.id IS NULL;

-- Also fix any profiles that exist but have a NULL role
UPDATE public.profiles
SET role = 'student'
WHERE role IS NULL;
