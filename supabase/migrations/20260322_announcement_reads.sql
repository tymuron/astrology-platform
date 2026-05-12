-- ============================================
-- Track which users have seen which announcements
-- So popups only show ONCE per user, across all devices
-- ============================================
CREATE TABLE IF NOT EXISTS announcement_reads (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    announcement_id UUID NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    read_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(announcement_id, user_id)
);

ALTER TABLE announcement_reads ENABLE ROW LEVEL SECURITY;

-- Users can see their own reads
CREATE POLICY "Users can view own reads"
    ON announcement_reads FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

-- Users can mark announcements as read
CREATE POLICY "Users can mark as read"
    ON announcement_reads FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Teachers can see all reads (to know who saw what)
CREATE POLICY "Teachers can view all reads"
    ON announcement_reads FOR SELECT TO authenticated
    USING (public.get_user_role() = 'teacher');
