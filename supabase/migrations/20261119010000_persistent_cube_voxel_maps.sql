alter table public.room_layouts
  add column if not exists voxel_blocks jsonb;

insert into public.room_layouts (
  layout_key, layout_name, class_id,
  base_layer, detail_layer, overhead_layer, object_layer, voxel_blocks
)
select
  face.layout_key,
  face.layout_key,
  source.class_id,
  source.base_layer,
  source.detail_layer,
  source.overhead_layer,
  source.object_layer,
  null
from (
  values
    ('cube_north'), ('cube_east'), ('cube_south'),
    ('cube_west'), ('cube_top'), ('cube_bottom')
) as face(layout_key)
cross join lateral (
  select class_id, base_layer, detail_layer, overhead_layer, object_layer
  from public.room_layouts
  where layout_key = 'default_room'
  limit 1
) as source
on conflict (layout_key) do nothing;

