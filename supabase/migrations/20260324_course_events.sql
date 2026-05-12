-- ============================================
-- Course Events — calendar reminders for students
-- Maria can create events, students download .ics files
-- ============================================
CREATE TABLE IF NOT EXISTS course_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    event_date TIMESTAMPTZ NOT NULL,
    duration_minutes INTEGER DEFAULT 120,
    location TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE course_events ENABLE ROW LEVEL SECURITY;

-- Everyone authenticated can see events
CREATE POLICY "Authenticated users can view events"
    ON course_events FOR SELECT TO authenticated
    USING (true);

-- Only teachers can manage events
CREATE POLICY "Teachers can insert events"
    ON course_events FOR INSERT TO authenticated
    WITH CHECK (public.get_user_role() = 'teacher');

CREATE POLICY "Teachers can update events"
    ON course_events FOR UPDATE TO authenticated
    USING (public.get_user_role() = 'teacher');

CREATE POLICY "Teachers can delete events"
    ON course_events FOR DELETE TO authenticated
    USING (public.get_user_role() = 'teacher');
