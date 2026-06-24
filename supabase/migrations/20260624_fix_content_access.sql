-- ============================================================================
-- Fix: ensure quizzes/content can't be locked out by an edge-case NULL course,
-- and make the quiz gate bulletproof.
--
-- 1) Safety backfill: any week without a course_id (legacy/edge rows the
--    original multi-cohort backfill may have missed, or a module created in a
--    weird state) is assigned to the default (first) course. The quiz/content
--    entitlement gates join through weeks.course_id, so a NULL there locks
--    students out of that week's quiz/content. This guarantees no NULLs remain.
--
-- 2) Re-create the quizzes + quiz_questions SELECT policies using the same
--    proven nested-exists pattern as the materials gate, PLUS a "course_id IS
--    NULL" safety branch so legacy content is never invisible to students.
--    (After the backfill there are no NULL weeks, so that branch matches
--    nothing — it is pure belt-and-suspenders, no cross-cohort exposure.)
--
-- Idempotent. Safe to run on the live database and to re-run.
-- ============================================================================

-- 1) Backfill orphaned weeks to the default (first) course.
update public.weeks
  set course_id = (select id from public.courses order by order_index asc limit 1)
  where course_id is null
    and exists (select 1 from public.courses);

-- 2a) Quizzes: entitled course (or NULL-course legacy) or teacher.
drop policy if exists "Authenticated users can view quizzes" on public.quizzes;
drop policy if exists "Users can view quizzes for entitled courses" on public.quizzes;
create policy "Users can view quizzes for entitled courses"
  on public.quizzes for select using (
    public.get_user_role() = 'teacher'
    or exists (
      select 1 from public.weeks w
      where w.id = quizzes.week_id
        and (
          w.course_id is null
          or exists (
            select 1 from public.user_entitlements e
            where e.user_id = auth.uid() and e.course_id = w.course_id
          )
        )
    )
  );

-- 2b) Quiz questions: same gate, one hop further through quiz_id -> quizzes -> weeks.
drop policy if exists "Authenticated users can view quiz questions" on public.quiz_questions;
drop policy if exists "Users can view quiz questions for entitled courses" on public.quiz_questions;
create policy "Users can view quiz questions for entitled courses"
  on public.quiz_questions for select using (
    public.get_user_role() = 'teacher'
    or exists (
      select 1 from public.quizzes q
      join public.weeks w on w.id = q.week_id
      where q.id = quiz_questions.quiz_id
        and (
          w.course_id is null
          or exists (
            select 1 from public.user_entitlements e
            where e.user_id = auth.uid() and e.course_id = w.course_id
          )
        )
    )
  );
