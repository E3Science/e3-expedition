-- Keep Nova system offers limited to resources that already have gameplay uses.
create or replace function public.e3_system_market_rotation(requested_class_id uuid,requested_bucket bigint default null)
returns table(item_id text,rarity text,base_price integer,rotation_bucket bigint)
language sql stable security definer set search_path=public as $$
  with rotation as(select coalesce(requested_bucket,floor(extract(epoch from now())/600)::bigint) bucket),
  catalog as(
    select base_key||':'||quality item_id,quality rarity,
      case quality when 'legendary' then 360 when 'epic' then 150 when 'rare' then 60 when 'uncommon' then 24 else 10 end base_price,
      case quality when 'legendary' then 1.0 when 'epic' then 4.0 when 'rare' then 10.0 when 'uncommon' then 25.0 else 60.0 end selection_weight
    from unnest(array['rock_sample','water_sample','plant_sample','herbivore_specimen']) as bases(base_key)
    cross join unnest(array['common','uncommon','rare','epic','legendary']) as qualities(quality)
    union all
    select 'alien_artifact:epic','epic',150,2.0
  ),previous_items as(
    select prior.item_id from catalog prior cross join rotation
    order by -ln((abs(hashtextextended(requested_class_id::text||':'||(rotation.bucket-1)::text||':'||prior.item_id,0)%1000000)+1)::numeric/1000001)/prior.selection_weight
    limit 3
  )
  select catalog.item_id,catalog.rarity,catalog.base_price,rotation.bucket
  from catalog cross join rotation
  order by case when catalog.item_id in(select previous_items.item_id from previous_items) then 1 else 0 end,
    -ln((abs(hashtextextended(requested_class_id::text||':'||rotation.bucket::text||':'||catalog.item_id,0)%1000000)+1)::numeric/1000001)/catalog.selection_weight
  limit 3;
$$;
revoke all on function public.e3_system_market_rotation(uuid,bigint) from public,anon,authenticated;
grant execute on function public.e3_system_market_rotation(uuid,bigint) to service_role;
notify pgrst,'reload schema';
