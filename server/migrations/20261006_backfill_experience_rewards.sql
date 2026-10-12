-- Preserve progression earned before persistent account XP was introduced.
-- Run after 20261005_experience_streak_economy.sql. Safe to run repeatedly.

do $$
declare achievement record;
begin
  for achievement in
    select user_id,class_id,achievement_key,metal from public.player_achievements
  loop
    perform public.e3_grant_player_reward(
      achievement.user_id,
      achievement.class_id,
      'achievement:'||achievement.achievement_key,
      case when achievement.metal='gold' then 25 else 10 end,
      case when achievement.metal='gold' then 5 else 2 end
    );
  end loop;
end;
$$;

do $$
declare progress record;
begin
  for progress in
    select user_id,class_id,coalesce(sum(quantity),0)::integer as skill_points
    from public.inventories
    where item_id in(
      'progress_skill_geology',
      'progress_skill_botany',
      'progress_skill_zoology',
      'progress_skill_chemistry',
      'progress_skill_astrobiology'
    )
    group by user_id,class_id
  loop
    if progress.skill_points>0 then
      perform public.e3_grant_player_reward(
        progress.user_id,
        progress.class_id,
        'legacy-skill-progress',
        progress.skill_points,
        greatest(1,ceil(progress.skill_points/10.0)::integer)
      );
    end if;
  end loop;
end;
$$;

notify pgrst,'reload schema';
