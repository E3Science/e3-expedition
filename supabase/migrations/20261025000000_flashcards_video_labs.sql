create table if not exists public.flashcard_set_completions(
  completion_id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  class_id uuid not null references public.classes(class_id) on delete cascade, rewarded boolean not null default false, completed_at timestamptz not null default now()
);
create index if not exists flashcard_completion_user_date on public.flashcard_set_completions(user_id,completed_at);

create table if not exists public.video_labs(
  lab_id uuid primary key default gen_random_uuid(), class_id uuid not null references public.classes(class_id) on delete cascade,
  owner_user_id uuid not null references auth.users(id) on delete cascade, title text not null, video_url text not null,
  active boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.video_lab_questions(
  question_id uuid primary key default gen_random_uuid(), lab_id uuid not null references public.video_labs(lab_id) on delete cascade,
  stop_seconds integer not null check(stop_seconds>=0), prompt text not null, answers jsonb not null check(jsonb_typeof(answers)='array' and jsonb_array_length(answers)>=2),
  correct_index integer not null check(correct_index>=0), time_limit integer not null default 15 check(time_limit between 5 and 120), created_at timestamptz not null default now()
);
create table if not exists public.video_lab_completions(
  completion_id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  class_id uuid not null references public.classes(class_id) on delete cascade, lab_id uuid not null references public.video_labs(lab_id) on delete cascade,
  score integer not null, question_count integer not null, rewarded boolean not null default false, completed_at timestamptz not null default now()
);

alter table public.flashcard_set_completions enable row level security;
alter table public.video_labs enable row level security;
alter table public.video_lab_questions enable row level security;
alter table public.video_lab_completions enable row level security;
drop policy if exists "users read own flashcard completions" on public.flashcard_set_completions;
create policy "users read own flashcard completions" on public.flashcard_set_completions for select to authenticated using(user_id=auth.uid() or public.e3_is_developer());
drop policy if exists "class users read video labs" on public.video_labs;
create policy "class users read video labs" on public.video_labs for select to authenticated using(public.e3_can_access_class(class_id));
drop policy if exists "teachers manage video labs" on public.video_labs;
create policy "teachers manage video labs" on public.video_labs for all to authenticated using(public.e3_is_teacher() and (owner_user_id=auth.uid() or public.e3_is_developer())) with check(public.e3_is_teacher() and public.e3_can_access_class(class_id));
drop policy if exists "class users read video questions" on public.video_lab_questions;
create policy "class users read video questions" on public.video_lab_questions for select to authenticated using(exists(select 1 from public.video_labs v where v.lab_id=video_lab_questions.lab_id and public.e3_can_access_class(v.class_id)));
drop policy if exists "teachers manage video questions" on public.video_lab_questions;
create policy "teachers manage video questions" on public.video_lab_questions for all to authenticated using(public.e3_is_teacher() and exists(select 1 from public.video_labs v where v.lab_id=video_lab_questions.lab_id and (v.owner_user_id=auth.uid() or public.e3_is_developer()))) with check(public.e3_is_teacher());
drop policy if exists "users read own video completions" on public.video_lab_completions;
create policy "users read own video completions" on public.video_lab_completions for select to authenticated using(user_id=auth.uid() or public.e3_is_developer());
grant select on public.flashcard_set_completions,public.video_lab_completions to authenticated;
grant select,insert,update,delete on public.video_labs,public.video_lab_questions to authenticated;

create or replace function public.e3_complete_flashcard_set(requested_class_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare state_class uuid;today_count integer;total_count integer;rewarded boolean;item_key text;milestone integer:=0;inventory_full boolean:=false;
begin
  if not public.e3_can_access_class(requested_class_id) then raise exception 'Class access required' using errcode='42501';end if;
  state_class:=public.e3_player_state_class(requested_class_id);
  select count(*)::integer into today_count from public.flashcard_set_completions where user_id=auth.uid() and completed_at>=(now() at time zone 'America/Los_Angeles')::date at time zone 'America/Los_Angeles';
  rewarded:=today_count<5;item_key:=(array['rock_sample:common','water_sample:common','plant_sample:common','herbivore_specimen:common'])[1+floor(random()*4)::integer];
  if rewarded then
    inventory_full:=not public.e3_inventory_can_add(requested_class_id,item_key,1);
    if not inventory_full then insert into public.inventories(user_id,class_id,item_id,quantity) values(auth.uid(),state_class,item_key,1) on conflict(user_id,class_id,item_id) do update set quantity=inventories.quantity+1;end if;
    insert into public.student_wallets(user_id,class_id,nova_credits) values(auth.uid(),state_class,3) on conflict(user_id,class_id) do update set nova_credits=student_wallets.nova_credits+3;
  end if;
  insert into public.flashcard_set_completions(user_id,class_id,rewarded) values(auth.uid(),state_class,rewarded);
  select count(*)::integer into total_count from public.flashcard_set_completions where user_id=auth.uid();
  if total_count=any(array[5,10,20,50,100]) then milestone:=total_count;perform public.e3_award_achievement(auth.uid(),state_class,'flashcards:'||total_count,total_count||' Flashcard Sets Complete','Orbital Flashcards milestone',case when total_count>=50 then 'gold' else 'silver' end);end if;
  return jsonb_build_object('rewarded',rewarded,'dailyRewards',least(today_count+1,5),'dailyLimit',5,'itemKey',case when rewarded and not inventory_full then item_key else null end,'credits',case when rewarded then 3 else 0 end,'inventoryFull',inventory_full,'totalCompletions',total_count,'achievementMilestone',milestone);
end;$$;

create or replace function public.e3_complete_video_lab(requested_class_id uuid,requested_lab_id uuid,requested_score integer,requested_question_count integer)
returns jsonb language plpgsql security definer set search_path=public as $$
declare state_class uuid;percent integer;rewarded boolean;item_key text;total_count integer;milestone integer:=0;inventory_full boolean:=false;
begin
  if not exists(select 1 from public.video_labs where lab_id=requested_lab_id and class_id=requested_class_id and active and public.e3_can_access_class(class_id)) then raise exception 'Video lab access required' using errcode='42501';end if;
  state_class:=public.e3_player_state_class(requested_class_id);percent:=case when requested_question_count>0 then floor(100.0*greatest(0,least(requested_score,requested_question_count))/requested_question_count)::integer else 100 end;rewarded:=percent>=80;
  item_key:=(array['rock_sample:common','water_sample:common','plant_sample:common','herbivore_specimen:common'])[1+floor(random()*4)::integer];
  if rewarded then inventory_full:=not public.e3_inventory_can_add(requested_class_id,item_key,1);if not inventory_full then insert into public.inventories(user_id,class_id,item_id,quantity) values(auth.uid(),state_class,item_key,1) on conflict(user_id,class_id,item_id) do update set quantity=inventories.quantity+1;end if;insert into public.student_wallets(user_id,class_id,nova_credits) values(auth.uid(),state_class,5) on conflict(user_id,class_id) do update set nova_credits=student_wallets.nova_credits+5;end if;
  insert into public.video_lab_completions(user_id,class_id,lab_id,score,question_count,rewarded) values(auth.uid(),state_class,requested_lab_id,greatest(0,requested_score),greatest(0,requested_question_count),rewarded);
  select count(*)::integer into total_count from public.video_lab_completions where user_id=auth.uid();
  if total_count=any(array[1,5,10,20,50,100]) then milestone:=total_count;perform public.e3_award_achievement(auth.uid(),state_class,'videos:'||total_count,case when total_count=1 then 'First Interactive Video' else total_count||' Videos Complete' end,'Interactive video lab milestone',case when total_count>=50 then 'gold' else 'silver' end);end if;
  return jsonb_build_object('percent',percent,'rewarded',rewarded,'itemKey',case when rewarded and not inventory_full then item_key else null end,'credits',case when rewarded then 5 else 0 end,'inventoryFull',inventory_full,'totalCompletions',total_count,'achievementMilestone',milestone);
end;$$;

revoke all on function public.e3_complete_flashcard_set(uuid),public.e3_complete_video_lab(uuid,uuid,integer,integer) from public,anon;
grant execute on function public.e3_complete_flashcard_set(uuid),public.e3_complete_video_lab(uuid,uuid,integer,integer) to authenticated,service_role;
notify pgrst,'reload schema';
