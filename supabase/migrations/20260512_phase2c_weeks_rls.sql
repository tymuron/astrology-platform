-- Phase 2 step C (RLS half): replace the "any authenticated" SELECT
-- policies on weeks / days / materials with entitlement-gated versions.
-- Teachers retain full read access. INSERT/UPDATE/DELETE policies are
-- untouched.
--
-- Verified end-to-end against the live astrology Supabase:
--   * a temporarily-promoted teacher inserts a test week into Welle 1
--   * an entitled student reads back exactly that 1 row
--   * a brand new unentitled student reads 0 rows on the same call
--   * cleanup deletes the test week and restores the student role

drop policy if exists "Authenticated users can view weeks" on public.weeks;
drop policy if exists "Users can view weeks for entitled courses" on public.weeks;
create policy "Users can view weeks for entitled courses"
  on public.weeks for select
  using (
    exists (
      select 1 from public.user_entitlements e
      where e.user_id = auth.uid() and e.course_id = weeks.course_id
    )
    or public.get_user_role() = 'teacher'
  );

drop policy if exists "Authenticated users can view days" on public.days;
drop policy if exists "Users can view days for entitled courses" on public.days;
create policy "Users can view days for entitled courses"
  on public.days for select
  using (
    exists (
      select 1 from public.weeks w
      where w.id = days.week_id and (
        exists (
          select 1 from public.user_entitlements e
          where e.user_id = auth.uid() and e.course_id = w.course_id
        )
        or public.get_user_role() = 'teacher'
      )
    )
  );

drop policy if exists "Authenticated users can view materials" on public.materials;
drop policy if exists "Users can view materials for entitled courses" on public.materials;
create policy "Users can view materials for entitled courses"
  on public.materials for select
  using (
    exists (
      select 1 from public.weeks w
      where (
        w.id = materials.week_id
        or w.id = (select d.week_id from public.days d where d.id = materials.day_id)
      )
      and (
        exists (
          select 1 from public.user_entitlements e
          where e.user_id = auth.uid() and e.course_id = w.course_id
        )
        or public.get_user_role() = 'teacher'
      )
    )
  );
