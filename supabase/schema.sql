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

-- Minigame history. The live game itself syncs over Realtime broadcast channels, which need no table.
-- (Adapted from the spec: this game identifies a couple by room code, so there is no players table.)
create table if not exists public.minigame_sessions (
  id uuid primary key default gen_random_uuid(),
  room_code text not null,
  game_type text not null,              -- MATCHA_MASTERS, STELLAR_FISHING, CRANE_CRAZE, ORCHARD_HARVEST
  player_a text,
  player_b text,
  current_score int not null default 0,
  stars int not null default 0,
  sync_state jsonb,                     -- final snapshot: orders, claw positions, catches
  status text not null default 'IN_PROGRESS',  -- IN_PROGRESS, COMPLETED, QUIT
  created_at timestamptz not null default now()
);
alter table public.minigame_sessions enable row level security;
drop policy if exists "session access" on public.minigame_sessions;
create policy "session access" on public.minigame_sessions for all using (true) with check (true);
