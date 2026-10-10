-- Our Little World: run this whole block once in the Supabase SQL editor (safe to run again).
create table if not exists public.game_state (
  room_code text primary key,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.game_state enable row level security;

-- Anyone holding the publishable key and your room code can read and write that room.
-- Treat the room code like a password. Real sign in can tighten this later.
drop policy if exists "room access" on public.game_state;
create policy "room access" on public.game_state for all using (true) with check (true);

-- Live updates between your two phones.
do $$
begin
  alter publication supabase_realtime add table public.game_state;
exception when duplicate_object then null;
end $$;
