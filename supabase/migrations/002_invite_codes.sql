-- Add invite code to rooms for shareable invite links
alter table public.rooms
  add column if not exists invite_code uuid default gen_random_uuid() not null;

create unique index if not exists rooms_invite_code_idx on public.rooms(invite_code);

-- Allow any authenticated user to look up a room by invite code (for joining)
create policy "Anyone can find room by invite code"
  on public.rooms for select
  using (invite_code is not null and auth.uid() is not null);
