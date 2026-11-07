# E3 Expedition Blocks

`e3-block-material-atlas-v1.png` is an original 4×4 pixel-art material atlas generated for E3. It does not reuse Minecraft textures.

The first-pass block builder is available in the Original E3 World:

- `V`: open or close Expedition Blocks
- Left click: place the selected block
- Right click: destroy the highest block at a tile
- Middle click: pick a placed block and its height
- `Q` / `R`: quarter-turn the selected block
- `[` / `]`: change build height from 1 through 4
- `Space`: jump with a 1.5-block visual arc; one-block elevation changes are traversable

Layer 0 is the existing unbreakable E3 map. Layers 1–4 hold buildable blocks. Blocks are currently stored in browser local storage per portal map; server-authoritative multiplayer persistence is the next architecture step.
