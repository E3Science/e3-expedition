# Isometric procedural map procedure

This document is the working contract between the isometric tilesheet, the
runtime, and the Admin Tile Editor.

## Authoritative data

- `alien-expansion/collection-v2/alien-collection-v2-master.png` is the active
  10-column by 60-row sheet loaded by Phaser. Its manifest preserves the old
  0-239 logical frame IDs while mapping them to their physical atlas cells.
- `alien-expansion/collection-v2/alien-collection-v2-manifest.json` is the
  active semantic catalog, including biome transitions, groups, and animations.
- New stored isometric map values use `20000 + frame`. Values saved with the
  retired `10000 + frame` contract are converted when loaded.
- A room layout is four equal-size arrays: `base`, `detail`, `overhead`, and
  `objects`. Empty cells use `-1`.

The logical map remains a rectangular grid even though it is rendered as
64×32 diamonds. Generation and collision always use logical tile coordinates.

## Layer contract

| Layer | Editor key | Purpose | Gameplay priority |
| --- | ---: | --- | --- |
| Base | 1 | Continuous ground: grass, dirt, water, hilltop | Lowest |
| Detail | 2 | Transitions, slopes, rocks, trunks, blockers | Overrides Base for collision and interaction metadata |
| Overhead | 3 | Canopies and other foreground cover | Visual-only; drawn above players, NPCs, and mobs |
| Objects | Object Editor | Portals, resource nodes, mobs, spawn markers | Independent object rules |

Do not paint a whole tree into Overhead if the player must collide with its
trunk. Put the trunk or solid footprint on Detail and its canopy on Overhead.
When an entity enters a cell containing an Overhead tile, its world 3D model is
temporarily replaced by the 2D entity below that tile so the cover is correct.

## Classification and flags

The supplied 16×10 classification is encoded directly in
`outside_manifest.json`. Each frame has:

- `label`: the material or feature name shown by the Admin Editor.
- `category`: ground, elevation, rock, water, vegetation, tree, decoration, or
  blank.
- `blank`: true for intentionally unused cells.
- `solidSuggested`: a review hint for collision metadata.
- `overheadSuggested`: a review hint for layer 3.

`solidSuggested` is not automatically saved as collision metadata. This is
intentional: a shoreline, decorative bush, or shallow water tile may need
different rules on a particular map. Use Metadata Editor to confirm collision,
then save the layout.

Two source rows contained eleven written labels for a ten-column sheet. The
catalog currently applies these ten-column interpretations:

1. Classification row 2 uses eight grass/dirt transitions followed by two
   blanks.
2. The river row uses six river variants followed by land edges N, E, W, S.
   The repeated trailing `water w/ land N` was omitted.

If either extra entry was meant to replace a different column, update
`TILE_LABEL_ROWS` in `tools/split_isometric_outside_tiles.py` and regenerate the
manifest.

## Generation procedure

### 1. Create deterministic fields

Start with a seed and produce one value per logical tile for:

- elevation
- moisture
- temperature or biome
- local variation

Use a deterministic PRNG/noise function. The same `seed` and
`generatorVersion` must reproduce the same base map.

### 2. Reserve required gameplay areas

Before decorating, reserve:

- player spawn and a clear 3×3 area around it
- portal footprints and arrival areas
- required buildings
- at least one connected route between required points

Reserved cells may influence generation but cannot become impassable.

### 3. Paint Base

Choose the base material from the generated fields:

- low elevation: water
- moderate dry ground: dirt
- moderate moist ground: grass
- high flat ground: hilltop or mountaintop

Use the manifest to find frames by semantic label rather than hard-coding
sheet filenames. Where more than one frame has the same label, select a variant
with a seeded hash of `(mapSeed, tileX, tileY)`.

### 4. Resolve neighbor transitions

For every tile, compute which neighboring materials differ. Convert the
N/NE/NW/E/W/SE/SW/S neighbor mask into the matching transition or slope frame.

Directional labels point from the boundary toward the terrain being entered.
Therefore, the southernmost lake cell uses `transition land/lake_N`, because
land is to its south and lake water continues north. The southernmost mountain,
hill, and tall-grass cells follow the same rule and use their `_N` variants.

Compass directions are visual screen directions, not raw array axes. On the
logical isometric grid they map as follows:

| Screen direction | Logical offset |
| --- | --- |
| N | `(-1, -1)` |
| NE | `(0, -1)` |
| E | `(1, -1)` |
| SE | `(1, 0)` |
| S | `(1, 1)` |
| SW | `(0, 1)` |
| W | `(-1, 1)` |
| NW | `(-1, 0)` |

River labels describe their two connected diamond edges. For example,
`river NW-SE` enters through the upper-left edge and exits through the
lower-right edge. Consecutive river tiles must use opposite shared edges.
In the current sheet, frame 93 is `river NE-SE` and frame 94 is the only
`river NW-SW` tile.

The current grass/dirt transition cells are classified by material but are not
yet direction-tagged. Before full autotiling, add a `neighbors` or
`transitionMask` property to those manifest entries after visually confirming
their orientation. Until then, use them through the Admin Editor or a small
hand-authored lookup table.

### 5. Paint Detail

Place:

- grass/dirt and land/water transitions
- hill and mountain slopes
- river connectors
- rocks, logs, bramble, and tree trunks

Detail is the authoritative gameplay surface over Base. A collision-marked
Detail tile is impassable even when the Base tile beneath is walkable.

### 6. Paint Overhead

Place only cover that entities should pass behind:

- tree tops and large canopies
- roof fronts, arches, or elevated foreground edges

Do not use Overhead for collision. If an overhead feature needs a blocker, put
the blocker on the same cell in Detail.

### 7. Place objects

Use the object layer for runtime entities and interactive placements:

- portals and destination spawn markers
- resource nodes
- mob spawn definitions
- building interactions

Keep procedural spawn definitions separate from the decorative tile layers so
resources and mobs can respawn without rewriting terrain.

The Admin Tile Editor's biome selector can generate either **All biomes** or
one named biome. Changing the seed regenerates the selected mode. A
single-biome map still uses coherent open, forest, tall-flora, lake, and
elevation regions rather than distributing props uniformly.

Generated maps store invisible resource-slot markers on the object layer:

- plant slot: `-101`
- mining slot: `-102`
- fishing slot: `-103`
- communication slot: `-104`

Tiles marked with Dig, Mine, Fish, or Comm metadata are also treated as spawn
locations. The tile itself is never directly harvestable or usable. After the
map is saved, the server fills these locations with the gameplay nodes.
Plant populations are `5, 5, 3, 1`; mining populations are `5, 3, 1`; and
fishing populations are `5, 3, 1`. The first two plant variants share the
common distance band. Higher tiers prefer increasingly distant slots measured
from the player spawn marker. Collection removes the node for 60 seconds and
relocates it to another free slot in the same resource and rarity band.

One communication node is selected from the available Comm locations. Using
it adds a collection quest (up to five active quests), removes the node for 60
seconds, and relocates it. Quest progress accepts the requested item rarity or
any higher rarity. A completed quest is claimed from the Quest panel and awards
a communication quest token whose rarity matches the task difficulty.

### 8. Validate the generated map

Reject or repair a generation when any of these checks fail:

1. Every layer has identical width and height.
2. Every stored frame is `-1` or a valid classic/isometric frame.
3. Required spawn and portal cells are clear.
4. Flood fill or A* finds a walkable path between all required points.
5. No solid Detail tile blocks a required arrival cell.
6. Overhead tiles do not accidentally contain required collision metadata.
7. Water and slope transitions have compatible neighbors.
8. Objects do not overlap unless their object rules explicitly allow it.

### 9. Apply Admin overrides

Treat hand edits as patches over generated data:

```json
{
  "mapKey": "default_room",
  "seed": 42017,
  "generatorVersion": 1,
  "overrides": [
    { "layer": "base", "x": 12, "y": 8, "frame": 10000 },
    { "layer": "detail", "x": 13, "y": 8, "frame": 10066 },
    { "layer": "overhead", "x": 14, "y": 8, "frame": 10122 }
  ]
}
```

Generation order is:

1. generate from seed
2. validate and repair required routes
3. apply Admin overrides
4. validate again
5. publish the four resolved arrays to `room_layouts`

The current Admin save writes the resolved arrays. A later generator revision
should add seed/version/override columns or a companion table so a map can be
regenerated without losing hand changes.

## Built-in generator button

Open the Admin Tile Editor and click **Generate Procedural Map** in the
Tilesheet window. The generator:

- creates coherent lakes, mountain ranges, hills, forests, tall-grass fields,
  open ground, dirt areas, and a connected river
- selects directional shoreline, slope, tall-grass edge, and river connector
  frames from neighboring terrain
- concentrates grouped trees inside forest regions instead of scattering them
  uniformly over the map
- keeps existing Object-layer portals, spawn markers, mobs, and resources
- reserves clear space around players and placed objects
- applies the manifest's collision suggestions to generated solid frames
- reports the generated seed in the editor and Chat

After the first generation, the button changes to **Generate New Seed**.
Clicking it produces a new seed and replaces the three terrain layers again.
Generation is local and reviewable until **K** saves it.

## Admin editing controls

- Arrow keys or WASD: move
- T: toggle Tile Editor
- 1 / 2 / 3 while Tile Editor is active: Base / Detail / Overhead
- 1–9 while editors are closed: select hotbar slot
- F6 in Metadata Editor: collision mode
- F7 in Metadata Editor: layer-designation mode
  - 1 / 2 / 3: designate Base / Detail / Overhead
  - 0: clear the layer designation
- F8 in Metadata Editor: animate mode
- F9 in Metadata Editor: resource/action mode
  - 1 / 2 / 3 / 4 / 5: craft / dig / mine / fish / communicate
  - 0: clear the action/resource node
- Left drag: paint
- Right drag: erase
- Middle click: pick
- K: save layout and metadata

Start by blocking out Base, add solid transitions/footprints on Detail, and
finish with tree tops or other foreground cover on Overhead.

## Multi-layer tile groups

Tile groups are reusable local Admin prefabs. They are useful for trees,
buildings, arches, cliffs, or any feature assembled from multiple cells and
layers.

1. Open the Tile Editor and enter a name under **Multi-layer tile groups**.
2. Click **Start Group**.
3. Choose the first tile directly on the palette. It becomes the prefab anchor.
4. A tile's F7 layer designation is used automatically. For tiles without a
   designation, use `1`, `2`, and `3` to choose Base, Detail, or Overhead.
   Hold `Shift` and left-click more palette tiles to add them.
5. Hold `Shift` and right-click a selected tile to remove it from the group.
6. Finish and save by left-clicking without `Shift`, clicking **Finish Group**,
   changing editor tools, or closing the Tile Editor.
7. Select any palette tile that belongs to the saved group. Each left click on
   the map places the complete group with that selected member under the cursor
   and every other tile on its assigned layer.
8. Select a tile that is not part of a group to return to ordinary painting.

Saved groups remain available in the group selector on this computer for review
and deletion. Painting does not require choosing a group from the selector: the
newest saved group containing the selected palette tile is activated
automatically. Middle-clicking a placed grouped tile also picks and activates
its group.

The procedural generator also uses saved isometric groups whose member frames
are categorized as `tree`, `rock`, or `vegetation`. It places the complete group
on its designated layers and reserves the whole prefab footprint before placing
another feature. If no tree group exists, generation uses a complete single-tree
frame instead of combining unrelated trunk and canopy frames.

For a large tree, select the solid trunk pieces for Detail and the canopy pieces
for Overhead. Base terrain can remain untouched unless it is intentionally part
of the prefab. The colored palette outlines show the assigned layer: `1` Base,
`2` Detail, and `3` Overhead.
