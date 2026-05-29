-- Helper function to check room membership without triggering RLS recursion
create or replace function public.is_room_member(room_uuid uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.room_members
    where room_id = room_uuid and user_id = auth.uid()
  );
$$;

-- Drop existing policies to allow idempotent re-runs
drop policy if exists "Users can read any profile" on public.users;
drop policy if exists "Users can update own profile" on public.users;
drop policy if exists "Users can insert own profile" on public.users;
drop policy if exists "Members can view their rooms" on public.rooms;
drop policy if exists "Authenticated users can create rooms" on public.rooms;
drop policy if exists "Admins can update their rooms" on public.rooms;
drop policy if exists "Admins can delete their rooms" on public.rooms;
drop policy if exists "Members can view room membership" on public.room_members;
drop policy if exists "Room creator can insert members" on public.room_members;
drop policy if exists "Members can update own membership" on public.room_members;
drop policy if exists "Admins can remove members" on public.room_members;
drop policy if exists "Members can remove own membership" on public.room_members;

-- Users profile table (mirrors auth.users)
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  avatar_url text,
  created_at timestamptz default now()
);

alter table public.users enable row level security;

create policy "Users can read any profile"
  on public.users for select
  using (true);

create policy "Users can update own profile"
  on public.users for update
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.users for insert
  with check (auth.uid() = id);

-- Rooms table
create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  location text,
  start_date date,
  end_date date,
  cover_image_url text,
  created_by uuid not null references public.users(id) on delete cascade,
  deleted_at timestamptz,
  created_at timestamptz default now()
);

alter table public.rooms enable row level security;

create policy "Members can view their rooms"
  on public.rooms for select
  using (
    auth.uid() = created_by
    or public.is_room_member(id)
  );

create policy "Authenticated users can create rooms"
  on public.rooms for insert
  with check (auth.uid() = created_by);

create policy "Admins can update their rooms"
  on public.rooms for update
  using (auth.uid() = created_by);

create policy "Admins can delete their rooms"
  on public.rooms for delete
  using (auth.uid() = created_by);

-- Room members table
create table if not exists public.room_members (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  role text not null default 'member' check (role in ('admin', 'member')),
  rsvp_status text not null default 'pending' check (rsvp_status in ('going', 'maybe', 'not_going', 'pending')),
  joined_at timestamptz default now(),
  unique (room_id, user_id)
);

alter table public.room_members enable row level security;

create policy "Members can view room membership"
  on public.room_members for select
  using (public.is_room_member(room_id));

create policy "Room creator can insert members"
  on public.room_members for insert
  with check (auth.uid() = user_id);

create policy "Members can update own membership"
  on public.room_members for update
  using (auth.uid() = user_id);

create policy "Members can remove own membership"
  on public.room_members for delete
  using (auth.uid() = user_id);
