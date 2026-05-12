-- ============================================
-- Announcements table for teacher -> student pop-up messages
-- ============================================
CREATE TABLE IF NOT EXISTS announcements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    message TEXT DEFAULT '',
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

-- Everyone authenticated can read active announcements
CREATE POLICY "Authenticated users can view announcements"
    ON announcements FOR SELECT TO authenticated USING (true);

-- Only teachers can manage announcements
CREATE POLICY "Teachers can manage announcements"
    ON announcements FOR ALL USING (
        public.get_user_role() = 'teacher'
    );

-- ============================================
-- Add quiz_type column to quizzes table
-- ============================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'quizzes' AND column_name = 'quiz_type'
    ) THEN
        ALTER TABLE quizzes ADD COLUMN quiz_type TEXT DEFAULT 'quiz';
    END IF;
END $$;
