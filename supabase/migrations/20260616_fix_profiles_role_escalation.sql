-- ============================================================================
-- SECURITY FIX — privilege escalation via profiles.role self-update.
--
-- Root cause: the "Users can update own profile" RLS policy had only a USING
-- clause (auth.uid() = id) and no WITH CHECK / no column restriction. Because
-- the role column lives on public.profiles, any authenticated student could
-- call PostgREST directly:
--     update profiles set role = 'teacher' where id = auth.uid();
-- and self-promote to teacher — the master key that grants full read/write on
-- weeks, days, materials, user_entitlements, quizzes, platform_settings, and
-- read access to ALL profiles and progress, bypassing every per-course gate.
--
-- Fix (defense in depth):
--   1) A BEFORE UPDATE trigger that hard-blocks any change to profiles.role
--      unless the caller is a teacher, or a trusted admin context where there
--      is no end-user JWT (service_role / SQL editor — auth.uid() is null).
--      This is the load-bearing guarantee: it fires on every UPDATE regardless
--      of which RLS policy permitted the row, and cannot be bypassed by an
--      end-user JWT call.
--   2) An explicit WITH CHECK on the self-update policy (the missing clause was
--      the original root cause).
--   3) Re-assert the teacher-manages-any-profile policy so legitimate role
--      management through a teacher session keeps working.
--
-- Idempotent. Safe to run on the live database and to re-run.
-- ============================================================================

-- 1) Hard guard against role changes by non-teacher end users.
create or replace function public.enforce_role_change_teacher_only()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role then
    -- auth.uid() is null  -> service_role / SQL editor / superuser (trusted admin)
    -- get_user_role() = 'teacher' -> a teacher session may manage roles
    if auth.uid() is not null
       and coalesce(public.get_user_role(), '') <> 'teacher' then
      raise exception 'Rollenänderung ist nicht erlaubt';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_enforce_role_change on public.profiles;
create trigger trg_enforce_role_change
  before update on public.profiles
  for each row
  execute function public.enforce_role_change_teacher_only();

-- 2) Tighten the self-update policy with an explicit WITH CHECK.
drop policy if exists "Users can update own profile." on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile."
  on public.profiles for update
  using ( auth.uid() = id )
  with check ( auth.uid() = id );

-- 3) Ensure teachers retain full profile management (USING + WITH CHECK).
drop policy if exists "Teachers can update any profile" on public.profiles;
create policy "Teachers can update any profile"
  on public.profiles for update
  using ( public.get_user_role() = 'teacher' )
  with check ( public.get_user_role() = 'teacher' );
