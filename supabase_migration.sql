-- ============================================
-- Vastu Course: Supabase Migration
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Profiles table (auto-populated on signup via trigger)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'teacher')),
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Modules (the DB table is called "weeks" for backward compat)
CREATE TABLE IF NOT EXISTS weeks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    order_index INTEGER NOT NULL DEFAULT 0,
    available_from TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Lektionen (the DB table is called "days" for backward compat)
CREATE TABLE IF NOT EXISTS days (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    week_id UUID NOT NULL REFERENCES weeks(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    homework_description TEXT,
    vimeo_url TEXT,
    date TIMESTAMPTZ,
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Materials (attachments per module or lektion)
CREATE TABLE IF NOT EXISTS materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('video', 'pdf', 'pptx', 'doc', 'link', 'zip')),
    url TEXT NOT NULL,
    week_id UUID REFERENCES weeks(id) ON DELETE CASCADE,
    day_id UUID REFERENCES days(id) ON DELETE CASCADE,
    is_homework BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Progress tracking (which lektionen a student completed)
CREATE TABLE IF NOT EXISTS progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    day_id UUID NOT NULL REFERENCES days(id) ON DELETE CASCADE,
    completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (user_id, day_id)
);

-- 6. Library items
CREATE TABLE IF NOT EXISTS library_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('slides', 'bonus', 'guide')),
    file_url TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- Row Level Security (RLS)
-- ============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE weeks ENABLE ROW LEVEL SECURITY;
ALTER TABLE days ENABLE ROW LEVEL SECURITY;
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE library_items ENABLE ROW LEVEL SECURITY;

-- Helper function to get user role without triggering recursion
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text
LANGUAGE sql SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- Profiles: users can read their own, teachers can read all
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Teachers can view all profiles" ON profiles FOR SELECT USING (
    public.get_user_role() = 'teacher'
);

-- Weeks/Days/Materials: everyone authenticated can read, teachers can modify
CREATE POLICY "Authenticated users can view weeks" ON weeks FOR SELECT TO authenticated USING (true);
CREATE POLICY "Teachers can manage weeks" ON weeks FOR ALL USING (
    public.get_user_role() = 'teacher'
);

CREATE POLICY "Authenticated users can view days" ON days FOR SELECT TO authenticated USING (true);
CREATE POLICY "Teachers can manage days" ON days FOR ALL USING (
    public.get_user_role() = 'teacher'
);

CREATE POLICY "Authenticated users can view materials" ON materials FOR SELECT TO authenticated USING (true);
CREATE POLICY "Teachers can manage materials" ON materials FOR ALL USING (
    public.get_user_role() = 'teacher'
);

-- Progress: users can manage their own
CREATE POLICY "Users can view own progress" ON progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own progress" ON progress FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own progress" ON progress FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Teachers can view all progress" ON progress FOR SELECT USING (
    public.get_user_role() = 'teacher'
);

-- Library: everyone authenticated can read, teachers can modify
CREATE POLICY "Authenticated users can view library" ON library_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Teachers can manage library" ON library_items FOR ALL USING (
    public.get_user_role() = 'teacher'
);

-- ============================================
-- Auto-create profile on signup
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (
        new.id,
        new.email,
        COALESCE(new.raw_user_meta_data->>'full_name', ''),
        COALESCE(new.raw_user_meta_data->>'role', 'student')
    );
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop if exists, then create trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- Storage buckets
-- ============================================

INSERT INTO storage.buckets (id, name, public)
VALUES
    ('course-content', 'course-content', true),
    ('library_files', 'library_files', true),
    ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: authenticated users can upload, public can read
CREATE POLICY "Public read access" ON storage.objects FOR SELECT USING (bucket_id IN ('course-content', 'library_files', 'avatars'));
CREATE POLICY "Authenticated upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id IN ('course-content', 'library_files', 'avatars'));
CREATE POLICY "Owner can update" ON storage.objects FOR UPDATE TO authenticated USING (auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Owner can delete" ON storage.objects FOR DELETE TO authenticated USING (auth.uid()::text = (storage.foldername(name))[1]);

-- ============================================
-- Make the first user a teacher (run manually)
-- ============================================
-- UPDATE profiles SET role = 'teacher' WHERE email = 'your-admin@email.de';
