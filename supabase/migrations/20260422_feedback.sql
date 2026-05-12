-- Course-end feedback survey
-- One row per (user, question_key). Users update their own; teachers read all.

CREATE TABLE IF NOT EXISTS public.feedback_responses (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users (id) on delete cascade not null,
    question_key text not null,
    answer_rating int,
    answer_text text,
    created_at timestamptz default now(),
    updated_at timestamptz default now(),
    unique (user_id, question_key)
);

CREATE INDEX IF NOT EXISTS feedback_responses_user_idx ON public.feedback_responses (user_id);
CREATE INDEX IF NOT EXISTS feedback_responses_q_idx   ON public.feedback_responses (question_key);

ALTER TABLE public.feedback_responses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users insert own feedback"   ON public.feedback_responses;
DROP POLICY IF EXISTS "users update own feedback"   ON public.feedback_responses;
DROP POLICY IF EXISTS "users read own feedback"     ON public.feedback_responses;
DROP POLICY IF EXISTS "teachers read all feedback"  ON public.feedback_responses;

CREATE POLICY "users insert own feedback"
    ON public.feedback_responses FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users update own feedback"
    ON public.feedback_responses FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users read own feedback"
    ON public.feedback_responses FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "teachers read all feedback"
    ON public.feedback_responses FOR SELECT
    USING (public.get_user_role() = 'teacher');
