-- supabase/migrations/0020_fix_dm_room_rpc_param_name_drift.sql
--
-- Root cause of "can't open a chat with someone I've never messaged before":
-- the LIVE function had drifted to parameter name `other_user_id` at some
-- point after migration 0011 shipped — no migration file in this repo
-- records that change, so it was almost certainly a manual edit made
-- directly in the Supabase SQL editor at some point, never committed here.
--
-- The client (Chat.tsx's startDmWith) has always called this RPC with
-- `p_other_user_id`, matching migration 0011's original definition. With
-- the live function expecting `other_user_id` instead, PostgREST couldn't
-- resolve the RPC call by named parameter and returned:
--   "Could not find the function public.get_or_create_dm_room(p_other_user_id)
--    in the schema cache"
-- — which looks like a missing/broken function, but was really just a
-- parameter-name mismatch between the deployed function and every caller.
--
-- This restores the original `p_other_user_id` parameter name and forces
-- PostgREST to reload its schema cache immediately rather than waiting for
-- its normal poll interval.

drop function if exists public.get_or_create_dm_room(uuid);

create or replace function public.get_or_create_dm_room(p_other_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room_id uuid;
begin
  if p_other_user_id is null then
    raise exception 'p_other_user_id is required';
  end if;
  if p_other_user_id = auth.uid() then
    raise exception 'Cannot start a DM with yourself';
  end if;
  if not exists (select 1 from public.profiles where id = p_other_user_id) then
    raise exception 'Target user does not exist';
  end if;

  select rm1.room_id into v_room_id
  from public.room_members rm1
  join public.room_members rm2 on rm2.room_id = rm1.room_id
  join public.chat_rooms cr on cr.id = rm1.room_id
  where rm1.user_id = auth.uid()
    and rm2.user_id = p_other_user_id
    and cr.type = 'dm'
  limit 1;

  if v_room_id is not null then
    update public.room_members set hidden_at = null
      where room_id = v_room_id and user_id = auth.uid();
    return v_room_id;
  end if;

  insert into public.chat_rooms (type) values ('dm') returning id into v_room_id;
  insert into public.room_members (room_id, user_id) values (v_room_id, auth.uid());
  insert into public.room_members (room_id, user_id) values (v_room_id, p_other_user_id);

  return v_room_id;
end;
$$;

grant execute on function public.get_or_create_dm_room(uuid) to authenticated;

notify pgrst, 'reload schema';
