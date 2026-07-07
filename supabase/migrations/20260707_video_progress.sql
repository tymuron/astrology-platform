-- Per-student video playback position, so students resume where they paused.
-- One row per (user, video). video_key is set by the app:
--   'day-<dayId>'      for a lesson's main video
--   'mat-<materialId>' for an extra video on a lesson
-- The app degrades to localStorage if this table is missing, so running this
-- migration is what turns on cross-device resume.

create table if not exists public.video_progress (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    video_key text not null,
    position_seconds integer not null default 0,
    duration_seconds integer,
    updated_at timestamptz not null default now(),
    unique (user_id, video_key)
);

alter table public.video_progress enable row level security;

-- Each user can only see and change their own rows.
drop policy if exists "video_progress_select_own" on public.video_progress;
create policy "video_progress_select_own" on public.video_progress
    for select using (auth.uid() = user_id);

drop policy if exists "video_progress_insert_own" on public.video_progress;
create policy "video_progress_insert_own" on public.video_progress
    for insert with check (auth.uid() = user_id);

drop policy if exists "video_progress_update_own" on public.video_progress;
create policy "video_progress_update_own" on public.video_progress
    for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "video_progress_delete_own" on public.video_progress;
create policy "video_progress_delete_own" on public.video_progress
    for delete using (auth.uid() = user_id);

grant select, insert, update, delete on public.video_progress to authenticated;
