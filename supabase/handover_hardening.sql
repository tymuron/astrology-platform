-- Handover hardening migration for production stability.
-- Safe to run multiple times.

create extension if not exists "uuid-ossp";

-- Cohorts table used by teacher admin pages.
create table if not exists public.kohorten (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  start_date date not null,
  description text,
  color text default '#c4b7b3',
  created_at timestamptz not null default now()
);

-- Make profile assignment explicit.
alter table public.profiles
  add column if not exists kohorte_id uuid references public.kohorten(id) on delete set null;

-- Keep legacy text column for backwards compatibility.
alter table public.profiles
  add column if not exists kohorte text;

-- Homework checklist persistence used by student lesson page.
create table if not exists public.homework_checks (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  day_id uuid not null references public.days(id) on delete cascade,
  checks jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  unique (user_id, day_id)
);

alter table public.kohorten enable row level security;
alter table public.homework_checks enable row level security;

drop policy if exists "Authenticated users can view kohorten" on public.kohorten;
create policy "Authenticated users can view kohorten"
  on public.kohorten for select
  to authenticated
  using (true);

drop policy if exists "Teachers can manage kohorten" on public.kohorten;
create policy "Teachers can manage kohorten"
  on public.kohorten for all
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'teacher'
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'teacher'
    )
  );

drop policy if exists "Users can read own homework checks" on public.homework_checks;
create policy "Users can read own homework checks"
  on public.homework_checks for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can write own homework checks" on public.homework_checks;
create policy "Users can write own homework checks"
  on public.homework_checks for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Teachers may inspect student checklist status if needed.
drop policy if exists "Teachers can read homework checks" on public.homework_checks;
create policy "Teachers can read homework checks"
  on public.homework_checks for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'teacher'
    )
  );

