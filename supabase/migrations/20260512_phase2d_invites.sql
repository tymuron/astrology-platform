-- Phase 2 step D (SQL half): invite-link based registration.
--
-- Each course gets one or more invite links (URL tokens). When a new
-- user lands on /register?invite=<token>, the page calls
-- public.validate_invite() (anon-callable, security definer) to show
-- the course title; on signup the freshly-authenticated client calls
-- public.redeem_invite() to atomically validate the token under a row
-- lock, insert an entitlement row (source='invite'), and bump
-- uses_count. Teachers manage the raw table from the admin panel.
--
-- Verified end-to-end on the live astrology Supabase:
--   * validate_invite('bogus') -> [] (no leak, no error)
--   * teacher inserts a token; validate_invite(token) returns the
--     course id + title to anon
--   * fresh signup -> redeem_invite(token) returns the course_id,
--     creates a user_entitlement (source='invite'), bumps uses_count
--   * unauthenticated redeem -> exception "Not authenticated"

create table if not exists public.course_invites (
  id uuid primary key default uuid_generate_v4(),
  course_id uuid not null references public.courses(id) on delete cascade,
  token text unique not null,
  label text,
  is_active boolean not null default true,
  expires_at timestamptz,
  max_uses integer,
  uses_count integer not null default 0,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);

create index if not exists course_invites_token_idx on public.course_invites(token);
create index if not exists course_invites_course_id_idx on public.course_invites(course_id);

alter table public.course_invites enable row level security;

drop policy if exists "Teachers can manage course invites" on public.course_invites;
create policy "Teachers can manage course invites"
  on public.course_invites for all
  using (public.get_user_role() = 'teacher')
  with check (public.get_user_role() = 'teacher');

create or replace function public.validate_invite(invite_token text)
returns table (course_id uuid, course_title text)
language sql
security definer
set search_path = public
as $$
  select i.course_id, c.title
  from public.course_invites i
  join public.courses c on c.id = i.course_id
  where i.token = invite_token
    and i.is_active = true
    and (i.expires_at is null or i.expires_at > now())
    and (i.max_uses is null or i.uses_count < i.max_uses);
$$;
grant execute on function public.validate_invite(text) to anon, authenticated;

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
