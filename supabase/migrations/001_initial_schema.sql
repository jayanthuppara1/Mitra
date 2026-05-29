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
    or exists (
      select 1 from public.room_members
      where room_members.room_id = rooms.id
        and room_members.user_id = auth.uid()
    )
  );

create policy "Authenticated users can create rooms"
  on public.rooms for insert
  with check (auth.uid() = created_by);

create policy "Admins can update their rooms"
  on public.rooms for update
  using (
    exists (
      select 1 from public.room_members
      where room_members.room_id = rooms.id
        and room_members.user_id = auth.uid()
        and room_members.role = 'admin'
    )
  );

create policy "Admins can delete their rooms"
  on public.rooms for delete
  using (
    exists (
      select 1 from public.room_members
      where room_members.room_id = rooms.id
        and room_members.user_id = auth.uid()
        and room_members.role = 'admin'
    )
  );

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
  using (
    exists (
      select 1 from public.room_members rm
      where rm.room_id = room_members.room_id
        and rm.user_id = auth.uid()
    )
  );

create policy "Room creator can insert members"
  on public.room_members for insert
  with check (
    auth.uid() = user_id
    or exists (
      select 1 from public.room_members rm
      where rm.room_id = room_members.room_id
        and rm.user_id = auth.uid()
        and rm.role = 'admin'
    )
  );

create policy "Members can update own membership"
  on public.room_members for update
  using (auth.uid() = user_id);

create policy "Admins can remove members"
  on public.room_members for delete
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.room_members rm
      where rm.room_id = room_members.room_id
        and rm.user_id = auth.uid()
        and rm.role = 'admin'
    )
  );
