# Alien isometric collection v2

This active collection contains 281 registered 64x64 isometric work-cell tiles. Logical frames 0-239 preserve the original palette order and artwork families. Logical frames 240-280 register the hand-edited additions in the expanded master: larger cliffs and trees, directional water edges, building parts, and tall doors. The old tiles remain available.

This is now the active Phaser world and Admin Editor tilesheet. Newly saved tile frames use offset `20000`; rooms saved with the retired `10000` offset are translated through `previous-outside-frame-map.json` when loaded.

## Files

- `alien-collection-v2-preview.png` - 3x5 contact sheet of the fifteen themed atlases.
- `alien-collection-v2-master.png` - hand-edited 10x60 runtime atlas (640x3840).
- `alien-collection-v2-manifest.json` - frame names, layers, collision, groups, standalone flora sets, and animations.
- `sheets/` - fifteen transparent 4x4 atlases, each 256x256.
- `individual/` - 240 named transparent 64x64 tiles.
- `previous-outside-frame-map.json` - compatibility map for rooms saved with the retired outside sheet.
- `source/*-chroma.png` - untouched high-resolution generated art.
- `source/*-rgba.png` - editable high-resolution art after chroma removal.
- `PROMPTS.md` - generation briefs and production notes.

## Contents

| Sheet | Contents |
| --- | --- |
| `base-biomes` | Four base variations for cyan fungal, blue-violet moss, coral mineral, and indigo volcanic biomes |
| `biome-cyan` | Cyan biome mountain, hill, one branching giant mushroom-tree, and standalone flora |
| `biome-violet` | Violet biome mountain, hill, one branching giant fan-tree, and standalone flora |
| `biome-coral` | Coral biome mountain, hill, one branching giant coral-tree, and standalone flora |
| `biome-indigo` | Indigo biome mountain, hill, one branching crystal-bark tree, and standalone flora |
| `water-animation` | Four-frame open water, straight shore, corner shore, and mineral-island loops |
| `habitat-exterior` | Command, laboratory, crew, and greenhouse modules plus connectors |
| `habitat-interior` | Floors, bulkheads, doors, corridor, and room furnishings |
| `hardware-cargo` | Cargo, power, atmosphere, water, communications, storage, tools, and maintenance hardware |
| `biome-transitions-a` | Cyan-violet and cyan-coral transitions in eight directions each |
| `biome-transitions-b` | Cyan-indigo and violet-coral transitions in eight directions each |
| `biome-transitions-c` | Violet-indigo and coral-indigo transitions in eight directions each |
| `flora-cyan-violet-v2` | New connected cyan/violet giant flora and standalone layer-2 plants |
| `flora-coral-indigo-v2` | New connected coral/indigo giant flora and standalone layer-2 plants |
| `habitat-tall-entrances-v2` | New three-level astronaut-scale entrances plus tall standalone airlocks |

## Group and stacking behavior

`groups` in the manifest contains 31 ready-made definitions:

- Each biome has a three-tile mountain stack and a three-tile hill stack. The middle face is marked repeatable upward, so an editor can insert as many face tiles as needed between the top and base.
- Each biome keeps its original 2x2 giant-plant group and adds a new branching group: three connected crown/branch pieces on layer 3 and one trunk/root anchor on layer 2. Only the new trunk is collision-bearing.
- Each habitat type keeps its original three-tile group and adds a new three-level entrance group. The new facade is sliced across all three levels, so the doorway is astronaut-scale instead of a one-tile miniature hatch.
- Built-in groups can be deleted in the Admin Editor. A deleted built-in ID is kept in local storage so it stays removed after reload; a newly recorded group using the same frames takes over automatic placement.

`autoTileSets` retains the old connected plant-region frames. `floraSets` contains four new standalone layer-2 flora frames per biome. The new frames have no ground diamond or square terrain patch and can be placed over any compatible base tile.

## Water animation

The original four water families and four new directional shoreline families each contain four frames. The manifest registers them as separate 180 ms loops. Procedural maps place the first frame and the runtime resolves the complete animation group automatically.

## Procedural generation

The editor can generate all four deterministic biome regions or one selected biome. Mixed-biome boundaries select one of the 48 transition frames from their biome pair and the direction of the neighboring region. Lakes use the animated water families. Elevation stacks, branching giant plants, clustered standalone flora inside coherent forest zones, habitat exteriors, and nearby hardware use the manifest metadata.

## Synchronize the edited master

From the repository root:

```powershell
python tools/sync_alien_tile_collection_v2_manifest.py
python tools/validate_alien_tile_collection_v2.py
```

The sync script updates only the manifest. It preserves the hand-edited master PNG, keeps logical frames 0-239 stable, and registers populated cells added to columns 5-10. Do not run `build_alien_tile_collection_v2.py` against this edited master unless you intentionally want to regenerate the atlas from the older 4-column source sheets.
