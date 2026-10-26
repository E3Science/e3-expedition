-- Read-only, developer-only account context used by the account viewer.
create or replace function public.e3_developer_account_context(requested_user_id uuid, requested_class_id uuid default null)
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare
  target_class uuid;
  state_class uuid;
  target_role text;
  result jsonb;
begin
  if not public.e3_is_developer() then raise exception 'Developer access required' using errcode='42501'; end if;
  if not exists(select 1 from auth.users where id=requested_user_id) then raise exception 'Account not found'; end if;

  select coalesce(nullif(u.raw_app_meta_data->>'e3_role',''),case when exists(select 1 from public.classes c where c.teacher_user_id=u.id) then 'teacher' else 'student' end)
  into target_role from auth.users u where u.id=requested_user_id;

  if requested_class_id is not null and exists(
    select 1 from public.classes c left join public.class_memberships cm on cm.class_id=c.class_id
    where c.class_id=requested_class_id and (c.teacher_user_id=requested_user_id or cm.user_id=requested_user_id)
  ) then target_class:=requested_class_id; end if;
  if target_class is null then
    select c.class_id into target_class from public.classes c left join public.class_memberships cm on cm.class_id=c.class_id
    where c.teacher_user_id=requested_user_id or cm.user_id=requested_user_id order by c.class_name,c.class_code limit 1;
  end if;
  select class_id into state_class from public.student_game_stats where user_id=requested_user_id order by experience_points desc,updated_at desc limit 1;
  state_class:=coalesce(state_class,target_class);

  select jsonb_build_object(
    'userId',u.id,'email',u.email,'displayName',coalesce(p.display_name,split_part(u.email,'@',1)),'role',target_role,
    'classes',coalesce((select jsonb_agg(x.obj order by x.name) from (
      select distinct c.class_name as name,jsonb_build_object('id',c.class_id,'name',coalesce(c.class_name,c.class_code),'code',c.class_code,'missionPosition',coalesce(c.mission_position,0)) obj
      from public.classes c left join public.class_memberships cm on cm.class_id=c.class_id where c.teacher_user_id=requested_user_id or cm.user_id=requested_user_id
    ) x),'[]'::jsonb),
    'selectedClassId',target_class,
    'inventory',coalesce((select jsonb_object_agg(item_id,quantity) from public.inventories where user_id=requested_user_id and class_id=state_class and quantity>0),'{}'::jsonb),
    'overview',jsonb_build_object(
      'experiencePoints',coalesce(s.experience_points,0),'studyCompletions',coalesce(s.study_completions,0),'plateMotionRuns',coalesce(s.plate_motion_runs,0),
      'sphereCompletions',jsonb_build_object('Geosphere',coalesce(s.geosphere_completions,0),'Atmosphere',coalesce(s.atmosphere_completions,0),'Hydrosphere',coalesce(s.hydrosphere_completions,0),'Biosphere',coalesce(s.biosphere_completions,0)),
      'itemsSold',coalesce(s.items_sold,0),'novaCredits',coalesce((select nova_credits from public.student_wallets where user_id=requested_user_id and class_id=state_class),0),
      'questTokens',coalesce((select sum(quantity) from public.inventories where user_id=requested_user_id and class_id=state_class and item_id like 'comm_quest_token:%'),0),
      'skillPoints',coalesce((select sum(quantity) from public.inventories where user_id=requested_user_id and class_id=state_class and item_id like 'progress_skill_%'),0),
      'achievementCount',(select count(distinct achievement_key) from public.player_achievements where user_id=requested_user_id),
      'achievements',coalesce((select jsonb_agg(jsonb_build_object('key',achievement_key,'title',title,'detail',detail,'metal',metal,'earnedAt',earned_at) order by earned_at desc) from public.player_achievements where user_id=requested_user_id),'[]'::jsonb)
    ),
    'quests',jsonb_build_object('maxQuests',5,'quests',coalesce((select jsonb_agg(jsonb_build_object('id',q.quest_id,'resourceKey',q.resource_key,'resourceLabel',q.resource_label,'minimumQuality',q.minimum_quality,'requiredCount',q.required_count,'rewardQuality',q.reward_quality,'createdAtEpochMs',floor(extract(epoch from q.created_at)*1000),'eligibleInventoryCount',0,'progress',0,'status','active') order by q.created_at) from public.student_quests q where q.user_id=requested_user_id and q.class_id=target_class),'[]'::jsonb)),
    'locker',jsonb_build_object('equipped',coalesce((select jsonb_object_agg(slot,item_key) from public.player_equipment where user_id=requested_user_id and class_id=state_class),'{}'::jsonb))
  ) into result
  from auth.users u left join public.profiles p on p.user_id=u.id
  left join lateral (select * from public.student_game_stats where user_id=requested_user_id order by experience_points desc,updated_at desc limit 1) s on true
  where u.id=requested_user_id;
  return result;
end;
$$;
revoke all on function public.e3_developer_account_context(uuid,uuid) from public,anon;
grant execute on function public.e3_developer_account_context(uuid,uuid) to authenticated,service_role;
notify pgrst,'reload schema';
