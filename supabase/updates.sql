
-- 1. Create Reviews Table
create table if not exists reviews (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) not null,
  review_url text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Add RLS to Reviews
alter table reviews enable row level security;

create policy "Users can insert their own reviews"
  on reviews for insert
  with check (auth.uid() = user_id);

create policy "Users can view their own reviews"
  on reviews for select
  using (auth.uid() = user_id);

create policy "Teachers can view all reviews"
  on reviews for select
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.role = 'teacher'
    )
  );

-- 3. Add Submit Review Function
create or replace function submit_review(url text)
returns boolean
language plpgsql
security definer
as $$
begin
  insert into reviews (user_id, review_url)
  values (auth.uid(), url);
  return true;
end;
$$;

-- 4. Add Master File Column to Library
alter table library_items 
add column if not exists is_master_file boolean default false;
