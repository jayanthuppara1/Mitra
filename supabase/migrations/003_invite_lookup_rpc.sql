-- Replace broad invite-code room visibility with a narrow SECURITY DEFINER lookup RPC.
-- This keeps dashboard RLS scoped to memberships while still allowing invite links.

drop policy if exists "Anyone can find room by invite code" on public.rooms;

create or replace function public.get_room_by_invite_code(code text)
returns table (
  id uuid,
  title text,
  description text,
  location text,
  start_date date,
  end_date date
)
language sql
stable
security definer
set search_path = public
as $$
  select r.id, r.title, r.description, r.location, r.start_date, r.end_date
  from public.rooms r
  where r.invite_code::text = code
    and r.deleted_at is null
  limit 1;
$$;
