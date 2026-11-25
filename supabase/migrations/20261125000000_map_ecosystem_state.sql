alter table public.room_layouts
  add column if not exists ecosystem_state jsonb not null default '{}'::jsonb;
