# E3 Expedition Blocks

`e3-block-material-atlas-v1.png` is an original 4×4 pixel-art material atlas generated for E3. It does not reuse Minecraft textures.

The first-pass block builder is available in the Original E3 World:

- `V`: open or close Expedition Blocks
- Left click: place the selected block on the clicked ground or block surface
- Right click: destroy the clicked block
- Middle click: pick a placed block's material
- `Space`: jump one block high and climb no more than one elevation step; travel distance comes from the natural jump duration and movement speed

Layer 0 is the existing unbreakable E3 map. Layers 1–4 hold buildable blocks. Blocks are currently stored in browser local storage per portal map; server-authoritative multiplayer persistence is the next architecture step.

General terrain and nature blocks have a fixed orientation. Gravity settles
each column after placement or removal so unsupported blocks drop downward.

The expanded builder also includes four biome blocks, one compact flora sample
per biome, habitat glass/wall/lab/console blocks, and selected expedition
furniture sourced from the E3 alien tilesheet. Furniture occupies two collision
levels even though it renders one block tall, so players cannot stack on or
jump onto it. Water and portal blocks are translucent and animated.

Accessibility settings include player/mob dithering and improved translucent
layering for overlapping glass, water, and portal blocks.
