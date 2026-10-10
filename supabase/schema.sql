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

-- ---------------------------------------------------------------------------
-- Quadrant goals and the daily synergy tracker.
-- The game currently keeps all of this inside game_state (healthDays, synergyUntil, vault, library,
-- bottles and banners), so it syncs with no extra setup. These tables are the relational shape of the
-- same data, keyed by room_code like everything else, ready for reporting or a future server side check.
-- ---------------------------------------------------------------------------
create table if not exists quadrant_goals (
  id uuid primary key default gen_random_uuid(),
  room_code text not null,
  player text not null check (player in ('A', 'B')),
  quadrant text not null check (quadrant in ('health', 'career', 'learning', 'finance', 'romance', 'social', 'environment', 'recreation')),
  title text not null,
  if_then_plan text,                  -- e.g. IF it is 7 AM, THEN I will walk for 20 mins
  coin_value int default 20,
  shell_value int default 0,
  status text default 'IN_PROGRESS',  -- IN_PROGRESS, WAITING_FOR_VERIFY, APPROVED
  proof_type text,                    -- PHOTO, NOTE, VOICE_MEMO
  proof_data text,
  created_at timestamptz default now()
);

create table if not exists daily_synergy (
  id uuid primary key default gen_random_uuid(),
  room_code text not null,
  day date default current_date,
  a_completed_health boolean default false,
  b_completed_health boolean default false,
  synergy_multiplier_active boolean default false,
  shared_vault_coins int default 0,
  unique (room_code, day)
);

alter table quadrant_goals enable row level security;
alter table daily_synergy enable row level security;
drop policy if exists "open quadrant_goals" on quadrant_goals;
drop policy if exists "open daily_synergy" on daily_synergy;
create policy "open quadrant_goals" on quadrant_goals for all using (true) with check (true);
create policy "open daily_synergy" on daily_synergy for all using (true) with check (true);
