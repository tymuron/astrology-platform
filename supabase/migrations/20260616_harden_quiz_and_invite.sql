-- ============================================================================
-- AUDIT HARDENING — cross-cohort quiz leak + orphaned-course invite redemption.
--
-- 1) quizzes / quiz_questions were left at the legacy "Authenticated users can
--    view ... USING (true)" policy when phase2c gated weeks/days/materials by
--    course entitlement. Result: a student entitled to course A could read
--    (via direct PostgREST) every quiz of every other cohort — including
--    quiz_questions.correct_index, i.e. the answer key. Gate both tables by the
--    same week -> course_id -> user_entitlements path, with a teacher bypass.
--
-- 2) redeem_invite() did not verify the target course is still active, so an
--    invite token for a deleted/deactivated cohort could still mint an
--    entitlement to it. Add an is_active check.
--
-- Idempotent. Safe to run on the live database and to re-run.
-- ============================================================================

-- 1a) Quizzes: only visible for courses the user is entitled to (or teacher).
drop policy if exists "Authenticated users can view quizzes" on public.quizzes;
drop policy if exists "Users can view quizzes for entitled courses" on public.quizzes;
create policy "Users can view quizzes for entitled courses"
  on public.quizzes for select using (
    public.get_user_role() = 'teacher'
    or exists (
      select 1
      from public.weeks w
      join public.user_entitlements e on e.course_id = w.course_id
      where w.id = quizzes.week_id
        and e.user_id = auth.uid()
    )
  );

-- 1b) Quiz questions (hold correct_index = the answer key): same gate, one hop
--     further through quiz_id -> quizzes -> weeks.
drop policy if exists "Authenticated users can view quiz questions" on public.quiz_questions;
drop policy if exists "Users can view quiz questions for entitled courses" on public.quiz_questions;
create policy "Users can view quiz questions for entitled courses"
  on public.quiz_questions for select using (
    public.get_user_role() = 'teacher'
    or exists (
      select 1
      from public.quizzes q
      join public.weeks w on w.id = q.week_id
      join public.user_entitlements e on e.course_id = w.course_id
      where q.id = quiz_questions.quiz_id
        and e.user_id = auth.uid()
    )
  );

-- 2) redeem_invite: refuse to grant access to a course that no longer exists
--    or is deactivated.
create or replace function public.redeem_invite(invite_token text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite record;
  v_user uuid;
begin
  v_user := auth.uid();
  if v_user is null then
    raise exception 'Not authenticated';
  end if;

  select id, course_id, is_active, expires_at, max_uses, uses_count
    into v_invite
    from public.course_invites
    where token = invite_token
    for update;

  if not found then
    raise exception 'Invite not found';
  end if;
  if not v_invite.is_active then
    raise exception 'Invite is no longer active';
  end if;
  if v_invite.expires_at is not null and v_invite.expires_at <= now() then
    raise exception 'Invite has expired';
  end if;
  if v_invite.max_uses is not null and v_invite.uses_count >= v_invite.max_uses then
    raise exception 'Invite has been used up';
  end if;
  if not exists (
    select 1 from public.courses
    where id = v_invite.course_id and is_active = true
  ) then
    raise exception 'Course is no longer available';
  end if;

  insert into public.user_entitlements (user_id, course_id, source, source_payment_id)
    values (v_user, v_invite.course_id, 'invite', v_invite.id::text)
    on conflict (user_id, course_id) do nothing;

  update public.course_invites
    set uses_count = uses_count + 1
    where id = v_invite.id;

  return v_invite.course_id;
end;
$$;
grant execute on function public.redeem_invite(text) to authenticated;
