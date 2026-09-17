-- Run once in the Supabase SQL Editor.
-- Keeps each class's expedition ship position after server restarts.
alter table public.classes
  add column if not exists mission_position integer not null default 0
  check (mission_position between 0 and 36);
