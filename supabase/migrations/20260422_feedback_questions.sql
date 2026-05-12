-- Editable feedback questions, managed by teachers from admin panel.
-- Responses are still keyed by question_key so deleting a question
-- doesn't orphan historical answers (the response just won't render
-- under any current question, but stays in the DB).

CREATE TABLE IF NOT EXISTS public.feedback_questions (
    id uuid primary key default gen_random_uuid(),
    question_key text unique not null,
    label text not null,
    helper text,
    kind text not null check (kind in ('rating', 'text', 'choice')),
    choices jsonb,           -- e.g. [{"value":"yes","label":"Ja"}, ...]
    optional boolean default false,
    order_index int not null default 0,
    is_active boolean default true,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

CREATE INDEX IF NOT EXISTS feedback_questions_order_idx
    ON public.feedback_questions (is_active, order_index);

ALTER TABLE public.feedback_questions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "everyone reads active feedback questions" ON public.feedback_questions;
DROP POLICY IF EXISTS "teachers manage feedback questions"       ON public.feedback_questions;

CREATE POLICY "everyone reads active feedback questions"
    ON public.feedback_questions FOR SELECT
    TO authenticated
    USING (is_active = true OR public.get_user_role() = 'teacher');

CREATE POLICY "teachers manage feedback questions"
    ON public.feedback_questions FOR ALL
    USING (public.get_user_role() = 'teacher')
    WITH CHECK (public.get_user_role() = 'teacher');

-- Seed defaults on first install (only if table is empty).
INSERT INTO public.feedback_questions (question_key, label, helper, kind, choices, optional, order_index)
SELECT * FROM (VALUES
    ('overall_rating',
        'Wie würdest du den Kurs insgesamt bewerten?',
        '1 Stern = nicht hilfreich, 5 Sterne = absolut top',
        'rating', NULL::jsonb, false, 1),
    ('liked_most',
        'Was hat dir am besten gefallen?',
        NULL,
        'text', NULL::jsonb, false, 2),
    ('improve',
        'Was könnten wir verbessern?',
        NULL,
        'text', NULL::jsonb, false, 3),
    ('recommend',
        'Würdest du diese Ausbildung weiterempfehlen?',
        NULL,
        'choice',
        '[{"value":"yes","label":"Ja, auf jeden Fall"},{"value":"maybe","label":"Vielleicht"},{"value":"no","label":"Eher nicht"}]'::jsonb,
        false, 4),
    ('additional_thoughts',
        'Möchtest du Maria noch etwas mitteilen?',
        'Optional — alles, was dir auf dem Herzen liegt',
        'text', NULL::jsonb, true, 5)
) AS seed(question_key, label, helper, kind, choices, optional, order_index)
WHERE NOT EXISTS (SELECT 1 FROM public.feedback_questions);
