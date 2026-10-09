-- Placeholder schema for Build 2 (real-time shared state). Run in the Supabase SQL editor.
create table if not exists game_state (
  room_code text primary key,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table game_state enable row level security;

-- Prototype policy: anyone holding the anon key and room code can read/write.
-- Tighten with Supabase Auth in Build 2.
create policy "room access" on game_state for all using (true) with check (true);

alter publication supabase_realtime add table game_state;
