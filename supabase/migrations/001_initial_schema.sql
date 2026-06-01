-- Mitra initial schema
-- Core collaborative experience-room tables, invite flow, and RLS policies.

create extension if not exists "pgcrypto";

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(trim(title)) > 0),
  description text,
  location text,
  start_date date,
  end_date date,
  cover_image_url text,
  invite_code text not null default encode(gen_random_bytes(8), 'hex') unique,
  created_by uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint rooms_date_order check (end_date is null or start_date is null or end_date >= start_date)
);

create table if not exists public.room_members (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  role text not null default 'member' check (role in ('admin', 'member')),
  rsvp_status text not null default 'pending' check (rsvp_status in ('going', 'maybe', 'not_going', 'pending')),
  joined_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (room_id, user_id)
);

create index if not exists rooms_created_by_idx on public.rooms(created_by);
create index if not exists rooms_deleted_at_idx on public.rooms(deleted_at);
create index if not exists rooms_invite_code_idx on public.rooms(invite_code);
create index if not exists rooms_start_date_idx on public.rooms(start_date);
create index if not exists room_members_room_id_idx on public.room_members(room_id);
create index if not exists room_members_user_id_idx on public.room_members(user_id);

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(coalesce(new.email, ''), '@', 1)),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do update set
    email = excluded.email,
    display_name = coalesce(public.users.display_name, excluded.display_name),
    avatar_url = coalesce(public.users.avatar_url, excluded.avatar_url),
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

-- Backfill profiles for existing Supabase auth users.
insert into public.users (id, email, display_name, avatar_url)
select
  au.id,
  coalesce(au.email, ''),
  coalesce(au.raw_user_meta_data ->> 'display_name', split_part(coalesce(au.email, ''), '@', 1)),
  au.raw_user_meta_data ->> 'avatar_url'
from auth.users au
on conflict (id) do update set
  email = excluded.email,
  display_name = coalesce(public.users.display_name, excluded.display_name),
  avatar_url = coalesce(public.users.avatar_url, excluded.avatar_url),
  updated_at = now();

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.enforce_room_member_update_rules()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (
    select 1
    from public.room_members rm
    where rm.room_id = old.room_id
      and rm.user_id = auth.uid()
      and rm.role = 'admin'
  ) then
    return new;
  end if;

  if old.user_id = auth.uid()
     and new.user_id = old.user_id
     and new.room_id = old.room_id
     and new.role = old.role then
    return new;
  end if;

  raise exception 'Only room admins can change membership details; members can only update their own RSVP.';
end;
$$;

drop trigger if exists set_users_updated_at on public.users;
create trigger set_users_updated_at
before update on public.users
for each row execute function public.set_updated_at();

drop trigger if exists set_rooms_updated_at on public.rooms;
create trigger set_rooms_updated_at
before update on public.rooms
for each row execute function public.set_updated_at();

drop trigger if exists set_room_members_updated_at on public.room_members;
create trigger set_room_members_updated_at
before update on public.room_members
for each row execute function public.set_updated_at();

drop trigger if exists enforce_room_member_update_rules on public.room_members;
create trigger enforce_room_member_update_rules
before update on public.room_members
for each row execute function public.enforce_room_member_update_rules();

-- SECURITY DEFINER helpers avoid recursive RLS checks inside policies.
drop function if exists public.is_room_member(uuid) cascade;
create or replace function public.is_room_member(target_room_id uuid, target_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.room_members rm
    where rm.room_id = target_room_id
      and rm.user_id = target_user_id
  );
$$;

create or replace function public.is_room_admin(target_room_id uuid, target_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.room_members rm
    where rm.room_id = target_room_id
      and rm.user_id = target_user_id
      and rm.role = 'admin'
  );
$$;

create or replace function public.shares_room_with_user(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select target_user_id = auth.uid()
    or exists (
      select 1
      from public.room_members mine
      join public.room_members theirs on theirs.room_id = mine.room_id
      where mine.user_id = auth.uid()
        and theirs.user_id = target_user_id
    );
$$;

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

alter table public.users enable row level security;
alter table public.rooms enable row level security;
alter table public.room_members enable row level security;

-- Drop legacy and current policies to keep the migration idempotent during early MVP work.
drop policy if exists "Users can read any profile" on public.users;
drop policy if exists "Users can update own profile" on public.users;
drop policy if exists "Users can insert own profile" on public.users;
drop policy if exists "users can insert own profile" on public.users;
drop policy if exists "users can view shared profiles" on public.users;
drop policy if exists "users can update own profile" on public.users;

drop policy if exists "Members can view their rooms" on public.rooms;
drop policy if exists "Authenticated users can create rooms" on public.rooms;
drop policy if exists "Admins can update their rooms" on public.rooms;
drop policy if exists "Admins can delete their rooms" on public.rooms;
drop policy if exists "members can view rooms" on public.rooms;
drop policy if exists "users can create rooms" on public.rooms;
drop policy if exists "admins can update rooms" on public.rooms;

drop policy if exists "Members can view room membership" on public.room_members;
drop policy if exists "Room creator can insert members" on public.room_members;
drop policy if exists "Members can update own membership" on public.room_members;
drop policy if exists "Admins can remove members" on public.room_members;
drop policy if exists "Members can remove own membership" on public.room_members;
drop policy if exists "members can view room memberships" on public.room_members;
drop policy if exists "room creators and admins can add members" on public.room_members;
drop policy if exists "members can update own rsvp admins can manage members" on public.room_members;
drop policy if exists "admins can remove members" on public.room_members;

-- Profiles
create policy "users can insert own profile"
on public.users
for insert
to authenticated
with check (id = auth.uid());

create policy "users can view shared profiles"
on public.users
for select
to authenticated
using (public.shares_room_with_user(id));

create policy "users can update own profile"
on public.users
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

-- Rooms
create policy "members can view rooms"
on public.rooms
for select
to authenticated
using (
  deleted_at is null
  and (created_by = auth.uid() or public.is_room_member(id, auth.uid()))
);

create policy "users can create rooms"
on public.rooms
for insert
to authenticated
with check (created_by = auth.uid());

create policy "admins can update rooms"
on public.rooms
for update
to authenticated
using (created_by = auth.uid() or public.is_room_admin(id, auth.uid()))
with check (created_by = auth.uid() or public.is_room_admin(id, auth.uid()));

-- Room memberships
create policy "members can view room memberships"
on public.room_members
for select
to authenticated
using (
  public.is_room_member(room_id, auth.uid())
  or exists (select 1 from public.rooms r where r.id = room_id and r.created_by = auth.uid())
);

create policy "room creators admins and invitees can add members"
on public.room_members
for insert
to authenticated
with check (
  (
    user_id = auth.uid()
    and role = 'member'
    and exists (select 1 from public.rooms r where r.id = room_id and r.deleted_at is null)
  )
  or exists (select 1 from public.rooms r where r.id = room_id and r.created_by = auth.uid())
  or public.is_room_admin(room_id, auth.uid())
);

create policy "members can update own rsvp admins can manage members"
on public.room_members
for update
to authenticated
using (user_id = auth.uid() or public.is_room_admin(room_id, auth.uid()))
with check (user_id = auth.uid() or public.is_room_admin(room_id, auth.uid()));

create policy "admins can remove members"
on public.room_members
for delete
to authenticated
using (public.is_room_admin(room_id, auth.uid()));
