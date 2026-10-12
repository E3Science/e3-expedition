-- Teacher lesson library and per-class presentation progress.
-- Run once in the Supabase SQL editor. Safe to run repeatedly.

create table if not exists public.lesson_records (
  lesson_id uuid primary key default gen_random_uuid(),
  lesson_code text not null unique,
  title text not null,
  unit_name text not null default '',
  chapter_name text not null default '',
  sort_order integer not null default 0,
  status text not null default 'planned' check (status in ('planned','ready','in_progress','complete','skipped')),
  estimated_periods integer not null default 1 check (estimated_periods > 0),
  mission_position integer not null default 0 check (mission_position between 0 and 36),
  presentation_url text,
  guide_url text,
  assignment_links jsonb not null default '[]'::jsonb check (jsonb_typeof(assignment_links) = 'array'),
  notebook_links jsonb not null default '[]'::jsonb check (jsonb_typeof(notebook_links) = 'array'),
  resource_links jsonb not null default '[]'::jsonb check (jsonb_typeof(resource_links) = 'array'),
  prep_materials text not null default '',
  teacher_notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.class_lesson_progress (
  class_id uuid primary key references public.classes(class_id) on delete cascade,
  lesson_id uuid references public.lesson_records(lesson_id) on delete set null,
  slide_number integer not null default 1 check (slide_number > 0),
  class_notes text not null default '',
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

alter table public.lesson_records enable row level security;
alter table public.class_lesson_progress enable row level security;

drop policy if exists "teachers manage lessons" on public.lesson_records;
create policy "teachers manage lessons" on public.lesson_records for all to authenticated
using (public.e3_is_teacher()) with check (public.e3_is_teacher());

drop policy if exists "teachers manage class lesson progress" on public.class_lesson_progress;
create policy "teachers manage class lesson progress" on public.class_lesson_progress for all to authenticated
using (public.e3_is_teacher()) with check (public.e3_is_teacher());

grant select, insert, update, delete on public.lesson_records, public.class_lesson_progress to authenticated, service_role;

insert into public.lesson_records (lesson_code,title,unit_name,chapter_name,sort_order,mission_position)
values
  ('0.1.1','Class Syllabus','Science 101','Introduction to Science',10,1),
  ('0.1.2','All About Me Project','Science 101','Introduction to Science',20,1),
  ('0.1.3','Notebook and Lab Safety','Science 101','Lab Safety',30,1),
  ('0.1.4A','Lab Equipment & Tools','Science 101','Lab Safety',40,1),
  ('0.1.5A','Lab 1: Using the Metric System','Science 101','Lab Safety',50,1),
  ('0.1.4B','Scientific Method','Science 101','Scientific Thinking',60,2),
  ('0.1.5B','Scientific Method Vocabulary','Science 101','Scientific Thinking',70,2),
  ('0.1.6','Writing a Procedure','Science 101','Scientific Thinking',80,2),
  ('0.1.7','Variables and the Metric System','Science 101','Scientific Thinking',90,3),
  ('0.1.0','Science 101 Test','Science 101','Assessment',100,4)
on conflict (lesson_code) do nothing;
