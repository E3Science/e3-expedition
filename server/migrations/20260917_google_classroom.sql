-- Run once in the Supabase SQL Editor before connecting Google Classroom.
alter table public.classes
  add column if not exists google_course_id text unique,
  add column if not exists classroom_synced_at timestamptz;

create table if not exists public.google_classroom_connections (
  teacher_user_id uuid primary key references auth.users(id) on delete cascade,
  google_email text,
  refresh_token_ciphertext text not null,
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.google_classroom_roster (
  google_course_id text not null,
  google_user_id text not null,
  email text,
  display_name text,
  synced_at timestamptz not null default now(),
  primary key (google_course_id, google_user_id)
);

alter table public.google_classroom_connections enable row level security;
alter table public.google_classroom_roster enable row level security;

-- No browser policies are intentionally created. These tables are accessible
-- only through the trusted multiplayer server's secret/service-role key.
