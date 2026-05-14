-- Teacher-only RPC that fully deletes a user (auth + profile + entitlements + progress).
-- Cascades from auth.users handle all dependent rows.

create or replace function public.admin_delete_user(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
    caller_role text;
begin
    -- Only teachers may delete users.
    select role into caller_role
    from public.profiles
    where id = auth.uid();

    if caller_role is null or caller_role <> 'teacher' then
        raise exception 'Nur Lehrer dürfen Teilnehmer löschen';
    end if;

    -- Never let a teacher delete themselves through this RPC.
    if target_user_id = auth.uid() then
        raise exception 'Du kannst dein eigenes Konto hier nicht löschen';
    end if;

    -- Wipe from auth.users — cascades to profiles, entitlements, progress, etc.
    delete from auth.users where id = target_user_id;
end;
$$;

revoke all on function public.admin_delete_user(uuid) from public;
grant execute on function public.admin_delete_user(uuid) to authenticated;
