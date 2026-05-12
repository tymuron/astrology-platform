-- Phase 2 step E (SQL half): per-course welcome page settings.
--
-- Each course gets one row in course_settings holding the editable bits
-- of the welcome page Maria sees from the admin: personal greeting,
-- signature, video URL, zoom/telegram/external links, plus jsonb arrays
-- of useful links and calendar events. Students see the values for the
-- course they're entitled to; teachers see + edit everything.
--
-- An after-insert trigger on public.courses auto-creates an empty
-- settings row for every new wave so the admin form always has
-- somewhere to write. Existing courses are backfilled.
--
-- Verified end-to-end on the live astrology Supabase:
--   * Welle 1 backfilled with an empty row (all fields null / [])
--   * entitled student reads exactly that row; brand-new unentitled
--     student gets []
--   * after a teacher creates a new course, course_settings has the
--     auto-generated row
--   * teacher PATCH on welcome_intro / signature persists

create table if not exists public.course_settings (
  course_id uuid primary key references public.courses(id) on delete cascade,
  welcome_intro text,
  welcome_signature text,
  welcome_video_url text,
  zoom_link text,
  telegram_link text,
  external_tool_label text,
  external_tool_url text,
  useful_links jsonb not null default '[]'::jsonb,
  calendar_events jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.course_settings enable row level security;

drop policy if exists "Users see settings for entitled courses" on public.course_settings;
create policy "Users see settings for entitled courses"
  on public.course_settings for select
  using (
    exists (select 1 from public.user_entitlements e
            where e.user_id = auth.uid() and e.course_id = course_settings.course_id)
    or public.get_user_role() = 'teacher'
  );

drop policy if exists "Teachers manage course settings" on public.course_settings;
create policy "Teachers manage course settings"
  on public.course_settings for all
  using (public.get_user_role() = 'teacher')
  with check (public.get_user_role() = 'teacher');

create or replace function public.ensure_course_settings()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.course_settings (course_id) values (new.id)
    on conflict (course_id) do nothing;
  return new;
end;
$$;

drop trigger if exists trg_ensure_course_settings on public.courses;
create trigger trg_ensure_course_settings
  after insert on public.courses
  for each row execute procedure public.ensure_course_settings();

insert into public.course_settings (course_id)
  select id from public.courses
  on conflict (course_id) do nothing;
