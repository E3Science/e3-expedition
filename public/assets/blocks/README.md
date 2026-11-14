# E3 Expedition Blocks

`e3-block-material-atlas-v1.png` is an original 4×4 pixel-art material atlas generated for E3. It does not reuse Minecraft textures.

The first-pass block builder is available in the Original E3 World:

- `V`: open or close Expedition Blocks
- Left click: place the selected block on the clicked ground or block surface
- Right click: destroy the clicked block
- Middle click: pick a placed block's material
- `Space`, `Shift`, or `Z`: jump one block high and climb no more than one elevation step. `Shift` and `Z` provide alternatives for keyboards that cannot report particular three-key arrow/Space combinations.

Layer 0 is an unbreakable dirt bed. Layers 1–5 hold generated and buildable
blocks. Version 2 worlds generate grass, protected water, ore-bearing mountains,
and trees from a stable map seed. Blocks are currently stored in browser local
storage per portal map; server-authoritative multiplayer persistence is the next
architecture step.

General terrain and nature blocks have a fixed orientation. Gravity settles
each column after placement or removal so unsupported blocks drop downward.

The expanded builder also includes four terrain blocks inspired by the cyan
mountain top, blue-violet mountain face, coral mountain face, and indigo large
cliff top frames. Their biome palettes and surface motifs are rendered through
the same cube geometry and dimensions as the standard dirt voxel. Compact flora samples retain their original transparent
sprites and have no collision, allowing players and mobs to pass through them.
Habitat glass/wall/lab/console blocks and selected expedition furniture are also
available. Furniture renders by itself inside an invisible cell and occupies
two collision levels, so players cannot stack on or jump onto it. Water and portal blocks
are translucent and animated.

Accessibility settings include player/mob dithering and improved translucent
layering for overlapping glass, water, and portal blocks.

Water yields samples instead of being removed. Exposed generated dirt is
re-covered by a falling grass block after 30 seconds. Tree sprouts mature into
block trees, and cutting a trunk releases their floating leaf rings. The habitat
kit places a 5×5×4 modular shell; press `R` before placement to switch its door
between southeast and southwest, then enter the doorway to reach the lab.
