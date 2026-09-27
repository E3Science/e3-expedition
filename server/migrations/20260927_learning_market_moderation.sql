-- Adaptive study archive, teacher question editor, trading post, and chat moderation.
-- Run once in Supabase SQL Editor. Safe to run repeatedly.

-- Older projects may not have received the original voyage-position migration.
-- Keep this migration self-contained because study availability depends on it.
alter table public.classes
  add column if not exists mission_position integer not null default 0;
alter table public.classes
  drop constraint if exists classes_mission_position_check;
alter table public.classes
  add constraint classes_mission_position_check check (mission_position between 0 and 36);

create table if not exists public.question_sets (
  set_id uuid primary key default gen_random_uuid(),
  unit_name text not null,
  chapter_name text not null,
  mission_position integer not null check (mission_position between 0 and 36),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (unit_name, chapter_name)
);
create table if not exists public.study_questions (
  question_id uuid primary key default gen_random_uuid(),
  set_id uuid not null references public.question_sets(set_id) on delete cascade,
  prompt text not null,
  answers jsonb not null check (jsonb_typeof(answers) = 'array' and jsonb_array_length(answers) >= 2),
  correct_index integer not null check (correct_index >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create table if not exists public.student_question_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  question_id uuid not null references public.study_questions(question_id) on delete cascade,
  attempts integer not null default 0,
  correct_count integer not null default 0,
  wrong_count integer not null default 0,
  last_seen_at timestamptz,
  primary key (user_id, question_id)
);
create table if not exists public.student_study_state (
  user_id uuid not null references auth.users(id) on delete cascade,
  class_id uuid not null references public.classes(class_id) on delete cascade,
  mastery_points integer not null default 0 check (mastery_points between 0 and 10),
  primary key (user_id, class_id)
);
alter table public.student_study_state drop constraint if exists student_study_state_mastery_points_check;
alter table public.student_study_state add constraint student_study_state_mastery_points_check check (mastery_points between 0 and 10);
create table if not exists public.student_wallets (
  user_id uuid not null references auth.users(id) on delete cascade,
  class_id uuid not null references public.classes(class_id) on delete cascade,
  nova_credits integer not null default 0 check (nova_credits >= 0),
  primary key (user_id, class_id)
);
create table if not exists public.market_listings (
  listing_id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(class_id) on delete cascade,
  seller_id uuid not null references auth.users(id) on delete cascade,
  buyer_id uuid references auth.users(id) on delete set null,
  item_id text not null,
  rarity text not null,
  price integer not null check (price > 0),
  status text not null default 'available' check (status in ('available', 'sold', 'removed')),
  created_at timestamptz not null default now(),
  sold_at timestamptz
);
create table if not exists public.class_chat_mutes (
  class_id uuid not null references public.classes(class_id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  muted_until timestamptz not null,
  muted_by uuid not null references auth.users(id),
  primary key (class_id, user_id)
);
alter table public.class_messages add column if not exists deleted_at timestamptz;
alter table public.class_messages add column if not exists deleted_by uuid references auth.users(id);

alter table public.question_sets enable row level security;
alter table public.study_questions enable row level security;
alter table public.student_question_progress enable row level security;
alter table public.student_study_state enable row level security;
alter table public.student_wallets enable row level security;
alter table public.market_listings enable row level security;
alter table public.class_chat_mutes enable row level security;

drop policy if exists "signed in users read question sets" on public.question_sets;
create policy "signed in users read question sets" on public.question_sets for select to authenticated using (active or public.e3_is_teacher());
drop policy if exists "teachers manage question sets" on public.question_sets;
create policy "teachers manage question sets" on public.question_sets for all to authenticated using (public.e3_is_teacher()) with check (public.e3_is_teacher());
drop policy if exists "signed in users read questions" on public.study_questions;
create policy "signed in users read questions" on public.study_questions for select to authenticated using (active or public.e3_is_teacher());
drop policy if exists "teachers manage questions" on public.study_questions;
create policy "teachers manage questions" on public.study_questions for all to authenticated using (public.e3_is_teacher()) with check (public.e3_is_teacher());
drop policy if exists "class members read market" on public.market_listings;
create policy "class members read market" on public.market_listings for select to authenticated using (public.e3_can_access_class(class_id));

revoke all on table public.question_sets, public.study_questions, public.student_question_progress, public.student_study_state, public.student_wallets, public.market_listings, public.class_chat_mutes from anon;
grant select, insert, update, delete on table public.question_sets, public.study_questions to authenticated, service_role;
grant select on table public.market_listings to authenticated;
grant select, insert, update, delete on table public.student_question_progress, public.student_study_state, public.student_wallets, public.market_listings, public.class_chat_mutes to service_role;

create or replace function public.e3_next_study_question(requested_class_id uuid, requested_unit text default null)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare selected record; points integer; pool_mastered boolean;
begin
  if not public.e3_can_access_class(requested_class_id) then raise exception 'Class access required' using errcode='42501'; end if;
  select coalesce(state.mastery_points, 0) into points from public.student_study_state state where state.user_id=auth.uid() and state.class_id=requested_class_id;
  select coalesce(bool_and(coalesce(progress.correct_count,0)>0),false) into pool_mastered
  from public.study_questions q join public.question_sets sets on sets.set_id=q.set_id
  join public.classes classes on classes.class_id=requested_class_id
  left join public.student_question_progress progress on progress.question_id=q.question_id and progress.user_id=auth.uid()
  where q.active and sets.active and sets.mission_position<=classes.mission_position
    and (requested_unit is null or sets.unit_name=requested_unit);
  select q.question_id, q.prompt, q.answers, sets.unit_name, sets.chapter_name into selected
  from public.study_questions q join public.question_sets sets on sets.set_id=q.set_id
  join public.classes classes on classes.class_id=requested_class_id
  left join public.student_question_progress progress on progress.question_id=q.question_id and progress.user_id=auth.uid()
  where q.active and sets.active and sets.mission_position <= classes.mission_position
    and (requested_unit is null or sets.unit_name=requested_unit)
  order by case when pool_mastered then random() else (-ln(greatest(random(), 0.000001)) / greatest(1, 6 - coalesce(progress.attempts,0) + coalesce(progress.wrong_count,0)*2)) end asc
  limit 1;
  if selected.question_id is null then return jsonb_build_object('question', null, 'points', coalesce(points,0)); end if;
  return jsonb_build_object('points',coalesce(points,0),'question',jsonb_build_object('id',selected.question_id,'prompt',selected.prompt,'answers',selected.answers,'unit',selected.unit_name,'chapter',selected.chapter_name));
end;
$$;

create or replace function public.e3_answer_study_question(requested_class_id uuid, requested_question_id uuid, selected_index integer, selected_sphere text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare answer_index integer; was_correct boolean; points integer; resource text; quality text; item_key text; roll float;
begin
  if not public.e3_can_access_class(requested_class_id) then raise exception 'Class access required' using errcode='42501'; end if;
  select q.correct_index into answer_index from public.study_questions q
  join public.question_sets sets on sets.set_id=q.set_id
  join public.classes classes on classes.class_id=requested_class_id
  where q.question_id=requested_question_id and q.active and sets.active and sets.mission_position<=classes.mission_position;
  if answer_index is null then raise exception 'Question not found'; end if;
  was_correct := selected_index=answer_index;
  insert into public.student_question_progress(user_id,question_id,attempts,correct_count,wrong_count,last_seen_at)
  values(auth.uid(),requested_question_id,1,case when was_correct then 1 else 0 end,case when was_correct then 0 else 1 end,now())
  on conflict(user_id,question_id) do update set attempts=student_question_progress.attempts+1,
    correct_count=student_question_progress.correct_count+case when was_correct then 1 else 0 end,
    wrong_count=student_question_progress.wrong_count+case when was_correct then 0 else 1 end,last_seen_at=now();
  insert into public.student_study_state(user_id,class_id,mastery_points) values(auth.uid(),requested_class_id,case when was_correct then 1 else 0 end)
  on conflict(user_id,class_id) do update set mastery_points=case when was_correct then least(10,student_study_state.mastery_points+1) else greatest(0,student_study_state.mastery_points-3) end
  returning mastery_points into points;
  if points < 10 then return jsonb_build_object('correct',was_correct,'points',points,'reward',null); end if;
  update public.student_study_state set mastery_points=0 where user_id=auth.uid() and class_id=requested_class_id;
  roll:=random();
  resource:=case selected_sphere
    when 'Geosphere' then case when roll<.4 then 'rock_sample' when roll<.8 then 'plant_sample' when roll<.9 then 'water_sample' else 'herbivore_specimen' end
    when 'Atmosphere' then case when roll<.4 then 'herbivore_specimen' when roll<.8 then 'water_sample' when roll<.9 then 'plant_sample' else 'rock_sample' end
    when 'Hydrosphere' then case when roll<.4 then 'water_sample' when roll<.8 then 'plant_sample' when roll<.9 then 'rock_sample' else 'herbivore_specimen' end
    else case when roll<.4 then 'plant_sample' when roll<.8 then 'herbivore_specimen' when roll<.9 then 'water_sample' else 'rock_sample' end end;
  roll:=random(); quality:=case when roll<.60 then 'common' when roll<.85 then 'uncommon' when roll<.95 then 'rare' when roll<.99 then 'epic' else 'legendary' end;
  item_key:=resource||':'||quality;
  insert into public.inventories(user_id,class_id,item_id,quantity) values(auth.uid(),requested_class_id,item_key,1)
  on conflict(user_id,class_id,item_id) do update set quantity=inventories.quantity+1;
  return jsonb_build_object('correct',was_correct,'points',0,'reward',jsonb_build_object('itemKey',item_key,'quality',quality,'presentation','resource_wheel','resourceTier',1,'cooldownMs',2200));
end;
$$;

create or replace function public.e3_sell_inventory_item(requested_class_id uuid, requested_item_id text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare item_rarity text; item_price integer; remaining integer;
begin
  item_rarity:=coalesce(nullif(split_part(requested_item_id,':',2),''),'common');
  item_price:=case item_rarity when 'legendary' then 180 when 'epic' then 75 when 'rare' then 30 when 'uncommon' then 12 else 5 end;
  update public.inventories set quantity=quantity-1 where user_id=auth.uid() and class_id=requested_class_id and item_id=requested_item_id and quantity>0 returning quantity into remaining;
  if remaining is null then raise exception 'Item is not available'; end if;
  delete from public.inventories where user_id=auth.uid() and class_id=requested_class_id and item_id=requested_item_id and quantity<=0;
  insert into public.student_wallets(user_id,class_id,nova_credits) values(auth.uid(),requested_class_id,item_price)
  on conflict(user_id,class_id) do update set nova_credits=student_wallets.nova_credits+item_price;
  insert into public.market_listings(class_id,seller_id,item_id,rarity,price) values(requested_class_id,auth.uid(),requested_item_id,item_rarity,item_price);
  return jsonb_build_object('success',true,'creditsEarned',item_price);
end;
$$;

create or replace function public.e3_buy_market_item(requested_listing_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare listing public.market_listings%rowtype; balance integer;
begin
  select * into listing from public.market_listings where listing_id=requested_listing_id and status='available' for update;
  if listing.listing_id is null then raise exception 'Listing is no longer available'; end if;
  if not public.e3_can_access_class(listing.class_id) then raise exception 'Class access required' using errcode='42501'; end if;
  select nova_credits into balance from public.student_wallets where user_id=auth.uid() and class_id=listing.class_id for update;
  if coalesce(balance,0)<listing.price then raise exception 'Not enough Nova Credits'; end if;
  update public.student_wallets set nova_credits=nova_credits-listing.price where user_id=auth.uid() and class_id=listing.class_id;
  insert into public.inventories(user_id,class_id,item_id,quantity) values(auth.uid(),listing.class_id,listing.item_id,1)
  on conflict(user_id,class_id,item_id) do update set quantity=inventories.quantity+1;
  update public.market_listings set status='sold',buyer_id=auth.uid(),sold_at=now() where listing_id=listing.listing_id;
  return jsonb_build_object('success',true,'itemId',listing.item_id,'price',listing.price);
end;
$$;

create or replace function public.e3_market_snapshot(requested_class_id uuid)
returns jsonb language plpgsql stable security definer set search_path=public,auth as $$
declare result jsonb;
begin
  if not public.e3_can_access_class(requested_class_id) then raise exception 'Class access required' using errcode='42501'; end if;
  select jsonb_build_object('credits',coalesce((select nova_credits from public.student_wallets where user_id=auth.uid() and class_id=requested_class_id),0),'listings',coalesce(jsonb_agg(jsonb_build_object('id',listings.listing_id,'itemId',listings.item_id,'rarity',listings.rarity,'price',listings.price,'sellerName',coalesce(profiles.display_name,'Explorer')) order by listings.created_at desc) filter(where listings.listing_id is not null),'[]'::jsonb)) into result
  from public.market_listings listings left join public.profiles profiles on profiles.user_id=listings.seller_id where listings.class_id=requested_class_id and listings.status='available';
  return result;
end;
$$;

create or replace function public.e3_delete_chat_message(requested_message_id bigint)
returns jsonb language plpgsql security definer set search_path=public as $$
declare message public.class_messages%rowtype;
begin
  select * into message from public.class_messages where message_id=requested_message_id;
  if message.message_id is null then raise exception 'Message not found'; end if;
  if message.user_id<>auth.uid() and not public.e3_is_teacher() then raise exception 'Not allowed' using errcode='42501'; end if;
  update public.class_messages set deleted_at=now(),deleted_by=auth.uid() where message_id=requested_message_id;
  return jsonb_build_object('success',true);
end;
$$;

create or replace function public.e3_set_chat_mute(requested_class_id uuid, requested_user_id uuid, mute_minutes integer default 15)
returns jsonb language plpgsql security definer set search_path=public as $$
begin
  if not public.e3_is_teacher() then raise exception 'Teacher access required' using errcode='42501'; end if;
  if mute_minutes<=0 then delete from public.class_chat_mutes where class_id=requested_class_id and user_id=requested_user_id;
  else insert into public.class_chat_mutes(class_id,user_id,muted_until,muted_by) values(requested_class_id,requested_user_id,now()+(mute_minutes||' minutes')::interval,auth.uid()) on conflict(class_id,user_id) do update set muted_until=excluded.muted_until,muted_by=excluded.muted_by; end if;
  return jsonb_build_object('success',true);
end;
$$;

create or replace function public.e3_set_mission_position(requested_class_id uuid, requested_position integer)
returns jsonb language plpgsql security definer set search_path=public as $$
declare next_position integer;
begin
  if not public.e3_is_teacher() then raise exception 'Teacher access required' using errcode='42501'; end if;
  next_position:=greatest(0,least(36,requested_position));
  update public.classes set mission_position=next_position where class_id=requested_class_id;
  if not found then raise exception 'Class not found'; end if;
  return jsonb_build_object('success',true,'missionPosition',next_position);
end;
$$;

create or replace function public.e3_mission_position(requested_class_id uuid)
returns integer language plpgsql stable security definer set search_path=public as $$
declare current_position integer;
begin
  if not public.e3_can_access_class(requested_class_id) then raise exception 'Class access required' using errcode='42501'; end if;
  select mission_position into current_position from public.classes where class_id=requested_class_id;
  return coalesce(current_position,0);
end;
$$;

drop policy if exists "class members can send messages" on public.class_messages;
create policy "class members can send messages" on public.class_messages for insert to authenticated
with check (user_id=auth.uid() and public.e3_can_access_class(class_id) and not exists(select 1 from public.class_chat_mutes where class_id=class_messages.class_id and user_id=auth.uid() and muted_until>now()));

revoke all on function public.e3_next_study_question(uuid,text), public.e3_answer_study_question(uuid,uuid,integer,text), public.e3_sell_inventory_item(uuid,text), public.e3_buy_market_item(uuid), public.e3_market_snapshot(uuid), public.e3_delete_chat_message(bigint), public.e3_set_chat_mute(uuid,uuid,integer), public.e3_set_mission_position(uuid,integer), public.e3_mission_position(uuid) from public,anon;
grant execute on function public.e3_next_study_question(uuid,text), public.e3_answer_study_question(uuid,uuid,integer,text), public.e3_sell_inventory_item(uuid,text), public.e3_buy_market_item(uuid), public.e3_market_snapshot(uuid), public.e3_delete_chat_message(bigint), public.e3_set_chat_mute(uuid,uuid,integer), public.e3_set_mission_position(uuid,integer), public.e3_mission_position(uuid) to authenticated,service_role;

do $publication$ begin
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='market_listings') then alter publication supabase_realtime add table public.market_listings; end if;
end $publication$;
