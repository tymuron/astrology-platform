-- ==========================================================================
-- Holistic Vedic Astrology — clean bootstrap
-- Paste into Supabase SQL Editor → RUN. Idempotent + dependency-ordered.
-- Build a fresh DB or re-run safely.
-- ==========================================================================

create extension if not exists "uuid-ossp";

-- ==========================================================================
-- 0. SCHEMA GRANTS
-- DROP SCHEMA public CASCADE wipes the Supabase default grants for the
-- anon / authenticated / service_role roles. Re-grant them here so the
-- PostgREST API can reach our tables (RLS still gates which rows each
-- role sees per policy).
-- ==========================================================================
grant usage on schema public to anon, authenticated, service_role;
grant all on all tables    in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;
grant all on all routines  in schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables    to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant all on routines  to anon, authenticated, service_role;

-- ==========================================================================
-- 1. PROFILES
-- ==========================================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  role text not null default 'student' check (role in ('student', 'teacher')),
  avatar_url text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create or replace function public.get_user_role()
returns text
language sql security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile"
  on public.profiles for select using (auth.uid() = id);

drop policy if exists "Teachers can view all profiles" on public.profiles;
create policy "Teachers can view all profiles"
  on public.profiles for select using (public.get_user_role() = 'teacher');

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
  on public.profiles for insert with check (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

drop policy if exists "Teachers can update any profile" on public.profiles;
create policy "Teachers can update any profile"
  on public.profiles for update using (public.get_user_role() = 'teacher');

-- Auto-create profile when a new auth user is added.
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    'student'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ==========================================================================
-- 2. WEEKS (modules)
-- ==========================================================================
create table if not exists public.weeks (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  description text,
  is_locked boolean default false,
  available_from timestamptz,
  order_index integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.weeks enable row level security;

drop policy if exists "Authenticated users can view weeks" on public.weeks;
create policy "Authenticated users can view weeks"
  on public.weeks for select to authenticated using (true);

drop policy if exists "Teachers can manage weeks" on public.weeks;
create policy "Teachers can manage weeks"
  on public.weeks for all using (public.get_user_role() = 'teacher')
  with check (public.get_user_role() = 'teacher');

-- ==========================================================================
-- 3. DAYS (lessons)
-- ==========================================================================
create table if not exists public.days (
  id uuid primary key default uuid_generate_v4(),
  week_id uuid not null references public.weeks(id) on delete cascade,
  title text not null,
  description text,
  video_url text,
  vimeo_url text,
  rutube_url text,
  homework_description text,
  homework_checklist text,
  date timestamptz,
  is_visible boolean default true,
  order_index integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.days enable row level security;

drop policy if exists "Authenticated users can view days" on public.days;
create policy "Authenticated users can view days"
  on public.days for select to authenticated using (true);

drop policy if exists "Teachers can manage days" on public.days;
create policy "Teachers can manage days"
  on public.days for all using (public.get_user_role() = 'teacher')
  with check (public.get_user_role() = 'teacher');

-- ==========================================================================
-- 4. MATERIALS
-- ==========================================================================
create table if not exists public.materials (
  id uuid primary key default uuid_generate_v4(),
  week_id uuid references public.weeks(id) on delete cascade,
  day_id uuid references public.days(id) on delete cascade,
  title text not null,
  type text not null,
  url text not null,
  is_homework boolean default false,
  created_at timestamptz not null default now()
);

alter table public.materials enable row level security;

drop policy if exists "Authenticated users can view materials" on public.materials;
create policy "Authenticated users can view materials"
  on public.materials for select to authenticated using (true);

drop policy if exists "Teachers can manage materials" on public.materials;
create policy "Teachers can manage materials"
  on public.materials for all using (public.get_user_role() = 'teacher')
  with check (public.get_user_role() = 'teacher');

-- ==========================================================================
-- 5. USER PROGRESS
-- ==========================================================================
create table if not exists public.user_progress (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  day_id uuid not null references public.days(id) on delete cascade,
  completed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (user_id, day_id)
);

alter table public.user_progress enable row level security;

drop policy if exists "Users manage own progress" on public.user_progress;
create policy "Users manage own progress"
  on public.user_progress for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Teachers can read all progress" on public.user_progress;
create policy "Teachers can read all progress"
  on public.user_progress for select using (public.get_user_role() = 'teacher');

-- ==========================================================================
-- 6. HOMEWORK CHECKS (per-lesson checklist state)
-- ==========================================================================
create table if not exists public.homework_checks (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  day_id uuid not null references public.days(id) on delete cascade,
  checks jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  unique (user_id, day_id)
);

alter table public.homework_checks enable row level security;

drop policy if exists "Users manage own homework" on public.homework_checks;
create policy "Users manage own homework"
  on public.homework_checks for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Teachers can read homework" on public.homework_checks;
create policy "Teachers can read homework"
  on public.homework_checks for select using (public.get_user_role() = 'teacher');

-- ==========================================================================
-- 7. LIBRARY
-- ==========================================================================
create table if not exists public.library_items (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  category text not null,
  file_url text not null,
  description text,
  file_type text,
  is_master_file boolean default false,
  available_from timestamptz,
  created_at timestamptz not null default now()
);

alter table public.library_items enable row level security;

drop policy if exists "Authenticated users can view library" on public.library_items;
create policy "Authenticated users can view library"
  on public.library_items for select to authenticated using (true);

drop policy if exists "Teachers can manage library" on public.library_items;
create policy "Teachers can manage library"
  on public.library_items for all using (public.get_user_role() = 'teacher')
  with check (public.get_user_role() = 'teacher');

-- ==========================================================================
-- 8. LIVE STREAMS + AUDIO + COMMENTS
-- ==========================================================================
create table if not exists public.live_streams (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  description text,
  date timestamptz not null,
  video_url text,
  vimeo_url text,
  rutube_url text,
  audio_url text,
  created_at timestamptz not null default now()
);

alter table public.live_streams enable row level security;

drop policy if exists "Authenticated users can view streams" on public.live_streams;
create policy "Authenticated users can view streams"
  on public.live_streams for select to authenticated using (true);

drop policy if exists "Teachers can manage streams" on public.live_streams;
create policy "Teachers can manage streams"
  on public.live_streams for all using (public.get_user_role() = 'teacher')
  with check (public.get_user_role() = 'teacher');

create table if not exists public.stream_audio (
  id uuid primary key default uuid_generate_v4(),
  stream_id uuid not null references public.live_streams(id) on delete cascade,
  audio_url text not null,
  duration text,
  title text,
  created_at timestamptz not null default now()
);

alter table public.stream_audio enable row level security;

drop policy if exists "Authenticated users can view stream audio" on public.stream_audio;
create policy "Authenticated users can view stream audio"
  on public.stream_audio for select to authenticated using (true);

drop policy if exists "Teachers can manage stream audio" on public.stream_audio;
create policy "Teachers can manage stream audio"
  on public.stream_audio for all using (public.get_user_role() = 'teacher')
  with check (public.get_user_role() = 'teacher');

create table if not exists public.stream_comments (
  id uuid primary key default uuid_generate_v4(),
  stream_id uuid not null references public.live_streams(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  "userName" text,
  "userAvatar" text,
  content text not null,
  created_at timestamptz not null default now()
);

alter table public.stream_comments enable row level security;

drop policy if exists "Authenticated users can view comments" on public.stream_comments;
create policy "Authenticated users can view comments"
  on public.stream_comments for select to authenticated using (true);

drop policy if exists "Users can write own comments" on public.stream_comments;
create policy "Users can write own comments"
  on public.stream_comments for insert with check (auth.uid() = user_id);

drop policy if exists "Users can delete own comments" on public.stream_comments;
create policy "Users can delete own comments"
  on public.stream_comments for delete using (auth.uid() = user_id);

drop policy if exists "Teachers can moderate comments" on public.stream_comments;
create policy "Teachers can moderate comments"
  on public.stream_comments for all using (public.get_user_role() = 'teacher')
  with check (public.get_user_role() = 'teacher');

-- ==========================================================================
-- 9. PLATFORM SETTINGS (singleton row id=1)
-- ==========================================================================
create table if not exists public.platform_settings (
  id integer primary key check (id = 1),
  welcome_video_url text,
  zoom_link text,
  telegram_link text,
  vastu_map_link text,
  instruction_url text,
  updated_at timestamptz not null default now()
);

insert into public.platform_settings (id) values (1) on conflict (id) do nothing;

alter table public.platform_settings enable row level security;

drop policy if exists "Authenticated users can read settings" on public.platform_settings;
create policy "Authenticated users can read settings"
  on public.platform_settings for select to authenticated using (true);

drop policy if exists "Teachers can manage settings" on public.platform_settings;
create policy "Teachers can manage settings"
  on public.platform_settings for all using (public.get_user_role() = 'teacher')
  with check (public.get_user_role() = 'teacher');

-- ==========================================================================
-- 10. REVIEWS (video-review gate for bonus module)
-- ==========================================================================
create table if not exists public.reviews (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  review_url text not null,
  created_at timestamptz not null default now()
);

alter table public.reviews enable row level security;

drop policy if exists "Users see own reviews" on public.reviews;
create policy "Users see own reviews"
  on public.reviews for select using (auth.uid() = user_id);

drop policy if exists "Users insert own reviews" on public.reviews;
create policy "Users insert own reviews"
  on public.reviews for insert with check (auth.uid() = user_id);

drop policy if exists "Teachers can read all reviews" on public.reviews;
create policy "Teachers can read all reviews"
  on public.reviews for select using (public.get_user_role() = 'teacher');

create or replace function public.submit_review(url text)
returns boolean
language plpgsql security definer
set search_path = public
as $$
begin
  insert into public.reviews (user_id, review_url) values (auth.uid(), url);
  return true;
end;
$$;

grant execute on function public.submit_review(text) to authenticated;

-- ==========================================================================
-- 11. QUIZZES (per module)
-- ==========================================================================
create table if not exists public.quizzes (
  id uuid primary key default uuid_generate_v4(),
  week_id uuid not null references public.weeks(id) on delete cascade,
  title text not null,
  description text,
  quiz_type text not null default 'quiz' check (quiz_type in ('quiz', 'reflection')),
  created_at timestamptz not null default now()
);

alter table public.quizzes enable row level security;

drop policy if exists "Authenticated users can view quizzes" on public.quizzes;
create policy "Authenticated users can view quizzes"
  on public.quizzes for select to authenticated using (true);

drop policy if exists "Teachers can manage quizzes" on public.quizzes;
create policy "Teachers can manage quizzes"
  on public.quizzes for all using (public.get_user_role() = 'teacher')
  with check (public.get_user_role() = 'teacher');

create table if not exists public.quiz_questions (
  id uuid primary key default uuid_generate_v4(),
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  question text not null,
  options jsonb not null default '[]'::jsonb,
  correct_index integer not null default 0,
  order_index integer not null default 0
);

alter table public.quiz_questions enable row level security;

drop policy if exists "Authenticated users can view quiz questions" on public.quiz_questions;
create policy "Authenticated users can view quiz questions"
  on public.quiz_questions for select to authenticated using (true);

drop policy if exists "Teachers can manage quiz questions" on public.quiz_questions;
create policy "Teachers can manage quiz questions"
  on public.quiz_questions for all using (public.get_user_role() = 'teacher')
  with check (public.get_user_role() = 'teacher');

create table if not exists public.quiz_attempts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  answers jsonb not null default '{}'::jsonb,
  score integer not null default 0,
  total integer not null default 0,
  completed_at timestamptz not null default now()
);

alter table public.quiz_attempts enable row level security;

drop policy if exists "Users see own attempts" on public.quiz_attempts;
create policy "Users see own attempts"
  on public.quiz_attempts for select using (auth.uid() = user_id);

drop policy if exists "Users insert own attempts" on public.quiz_attempts;
create policy "Users insert own attempts"
  on public.quiz_attempts for insert with check (auth.uid() = user_id);

drop policy if exists "Teachers can read all attempts" on public.quiz_attempts;
create policy "Teachers can read all attempts"
  on public.quiz_attempts for select using (public.get_user_role() = 'teacher');

-- ==========================================================================
-- 12. ANNOUNCEMENTS
-- ==========================================================================
create table if not exists public.announcements (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  message text default '',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.announcements enable row level security;

drop policy if exists "Authenticated users can view announcements" on public.announcements;
create policy "Authenticated users can view announcements"
  on public.announcements for select to authenticated using (true);

drop policy if exists "Teachers can manage announcements" on public.announcements;
create policy "Teachers can manage announcements"
  on public.announcements for all using (public.get_user_role() = 'teacher')
  with check (public.get_user_role() = 'teacher');

create table if not exists public.announcement_reads (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  announcement_id uuid not null references public.announcements(id) on delete cascade,
  read_at timestamptz not null default now(),
  unique (user_id, announcement_id)
);

alter table public.announcement_reads enable row level security;

drop policy if exists "Users manage own reads" on public.announcement_reads;
create policy "Users manage own reads"
  on public.announcement_reads for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ==========================================================================
-- 13. COURSE EVENTS (teacher calendar)
-- ==========================================================================
create table if not exists public.course_events (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  date timestamptz not null,
  type text,
  link text,
  description text,
  created_at timestamptz not null default now()
);

alter table public.course_events enable row level security;

drop policy if exists "Authenticated users can view events" on public.course_events;
create policy "Authenticated users can view events"
  on public.course_events for select to authenticated using (true);

drop policy if exists "Teachers can manage events" on public.course_events;
create policy "Teachers can manage events"
  on public.course_events for all using (public.get_user_role() = 'teacher')
  with check (public.get_user_role() = 'teacher');

-- ==========================================================================
-- 14. FEEDBACK
-- ==========================================================================
create table if not exists public.feedback_questions (
  id uuid primary key default uuid_generate_v4(),
  question_key text unique not null,
  label text not null,
  helper text,
  kind text not null check (kind in ('rating', 'text', 'choice')),
  choices jsonb,
  optional boolean default false,
  order_index integer not null default 0,
  is_active boolean default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.feedback_questions enable row level security;

drop policy if exists "Authenticated users can view active questions" on public.feedback_questions;
create policy "Authenticated users can view active questions"
  on public.feedback_questions for select to authenticated
  using (is_active = true or public.get_user_role() = 'teacher');

drop policy if exists "Teachers can manage questions" on public.feedback_questions;
create policy "Teachers can manage questions"
  on public.feedback_questions for all using (public.get_user_role() = 'teacher')
  with check (public.get_user_role() = 'teacher');

create table if not exists public.feedback_responses (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  question_key text not null,
  answer_rating integer,
  answer_text text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, question_key)
);

alter table public.feedback_responses enable row level security;

drop policy if exists "Users manage own feedback" on public.feedback_responses;
create policy "Users manage own feedback"
  on public.feedback_responses for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Teachers can read all feedback" on public.feedback_responses;
create policy "Teachers can read all feedback"
  on public.feedback_responses for select using (public.get_user_role() = 'teacher');

-- Seed default feedback questions (German, astrology-friendly wording)
insert into public.feedback_questions (question_key, label, helper, kind, choices, optional, order_index)
select * from (values
  ('overall_rating',
   'Wie würdest du den Kurs insgesamt bewerten?',
   '1 Stern = nicht hilfreich, 5 Sterne = absolut top',
   'rating', null::jsonb, false, 1),
  ('liked_most',
   'Was hat dir am besten gefallen?',
   null,
   'text', null::jsonb, false, 2),
  ('improve',
   'Was könnten wir verbessern?',
   null,
   'text', null::jsonb, false, 3),
  ('recommend',
   'Würdest du diese Ausbildung weiterempfehlen?',
   null,
   'choice',
   '[{"value":"yes","label":"Ja, auf jeden Fall"},{"value":"maybe","label":"Vielleicht"},{"value":"no","label":"Eher nicht"}]'::jsonb,
   false, 4),
  ('additional_thoughts',
   'Möchtest du Maria noch etwas mitteilen?',
   'Optional — alles, was dir auf dem Herzen liegt',
   'text', null::jsonb, true, 5)
) as seed(question_key, label, helper, kind, choices, optional, order_index)
where not exists (select 1 from public.feedback_questions);

-- ==========================================================================
-- 15. STORAGE BUCKETS
-- ==========================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars', 'avatars', true, 5242880, array['image/*']),
  ('course-content', 'course-content', true, null, null),
  ('library_files', 'library_files', true, null, null)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public read all buckets" on storage.objects;
create policy "Public read all buckets"
  on storage.objects for select
  using (bucket_id in ('avatars', 'course-content', 'library_files'));

drop policy if exists "Authenticated can upload to buckets" on storage.objects;
create policy "Authenticated can upload to buckets"
  on storage.objects for insert to authenticated
  with check (bucket_id in ('avatars', 'course-content', 'library_files'));

drop policy if exists "Authenticated can update buckets" on storage.objects;
create policy "Authenticated can update buckets"
  on storage.objects for update to authenticated
  using (bucket_id in ('avatars', 'course-content', 'library_files'));

drop policy if exists "Authenticated can delete from buckets" on storage.objects;
create policy "Authenticated can delete from buckets"
  on storage.objects for delete to authenticated
  using (bucket_id in ('avatars', 'course-content', 'library_files'));

-- ==========================================================================
-- 16. RE-GRANT (catch any tables/functions created above)
-- Repeat the grants AFTER the tables exist so they actually get applied.
-- ==========================================================================
grant all on all tables    in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;
grant all on all routines  in schema public to anon, authenticated, service_role;
