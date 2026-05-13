-- Phase 2 follow-up: make weeks.course_id (and friends) cascade on
-- course delete so admins can remove a wave from the UI cleanly.
-- Without this, DELETE on `courses` errors with a 23503 FK violation.
--
-- Idempotent: drops the old constraint (if any) and recreates with
-- ON DELETE CASCADE.

do $$
declare
  cname text;
begin
  -- weeks.course_id
  select tc.constraint_name into cname
  from information_schema.table_constraints tc
  join information_schema.key_column_usage kcu
    on tc.constraint_name = kcu.constraint_name and tc.table_schema = kcu.table_schema
  where tc.table_schema = 'public'
    and tc.table_name = 'weeks'
    and tc.constraint_type = 'FOREIGN KEY'
    and kcu.column_name = 'course_id'
  limit 1;
  if cname is not null then
    execute format('alter table public.weeks drop constraint %I', cname);
  end if;

  alter table public.weeks
    add constraint weeks_course_id_fkey
    foreign key (course_id) references public.courses(id) on delete cascade;
end $$;

-- Also clean up live_streams and library_items if their FKs to courses
-- exist and aren't already cascading (these were added by an earlier
-- Phase 2 scope migration in some setups).
do $$
declare
  cname text;
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'live_streams' and column_name = 'course_id'
  ) then
    select tc.constraint_name into cname
    from information_schema.table_constraints tc
    join information_schema.key_column_usage kcu
      on tc.constraint_name = kcu.constraint_name and tc.table_schema = kcu.table_schema
    where tc.table_schema = 'public' and tc.table_name = 'live_streams'
      and tc.constraint_type = 'FOREIGN KEY' and kcu.column_name = 'course_id'
    limit 1;
    if cname is not null then
      execute format('alter table public.live_streams drop constraint %I', cname);
    end if;
    alter table public.live_streams
      add constraint live_streams_course_id_fkey
      foreign key (course_id) references public.courses(id) on delete cascade;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'library_items' and column_name = 'course_id'
  ) then
    select tc.constraint_name into cname
    from information_schema.table_constraints tc
    join information_schema.key_column_usage kcu
      on tc.constraint_name = kcu.constraint_name and tc.table_schema = kcu.table_schema
    where tc.table_schema = 'public' and tc.table_name = 'library_items'
      and tc.constraint_type = 'FOREIGN KEY' and kcu.column_name = 'course_id'
    limit 1;
    if cname is not null then
      execute format('alter table public.library_items drop constraint %I', cname);
    end if;
    alter table public.library_items
      add constraint library_items_course_id_fkey
      foreign key (course_id) references public.courses(id) on delete cascade;
  end if;
end $$;
