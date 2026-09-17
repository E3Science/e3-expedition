# E3 asset index

This folder contains the canonical runtime art and the editable sources needed
to reproduce it. Do not edit copies under `dist/`; Vite rebuilds those files
from this folder.

## World tiles

| File | Role |
| --- | --- |
| `tiles/isometric/outside_source_original.png` | Untouched imported source sheet |
| `tiles/isometric/outside_master.png` | Retired 10x16 sheet retained as an editable legacy source |
| `tiles/isometric/outside_manifest.json` | Semantic catalog for the retired sheet and compatibility tooling |
| `tiles/isometric/individual/` | Named standalone PNGs for direct editing and UI use |
| `tiles/isometric/legacy_to_iso_frame.json` | Conversion table for maps saved with legacy frame IDs |
| `tiles/isometric/PROCEDURAL_MAP_GUIDE.md` | Map layers and procedural-generation rules |
| `tiles/isometric/alien-expansion/` | Vibrant alien-biome review packs with editable sources |
| `tiles/isometric/alien-expansion/collection-v2/` | Active 240-tile biome, transition, elevation, vegetation, water, habitat, interior, hardware, and cargo collection; original 192 frames retained |

Regenerate this set with `tools/split_isometric_outside_tiles.py`. Regenerate
the legacy conversion table with `tools/build_legacy_iso_frame_map.py`.
Regenerate the alien expansion atlases and individual tiles with
`tools/build_alien_tile_expansion.py`.
Regenerate collection v2 with `tools/build_alien_tile_collection_v2.py`.

## Characters, mobs, and objects

| File | Role |
| --- | --- |
| `player/layers/new_character_sheet.paint` | Editable layered 2D player source |
| `player/layers/recruit_*.png` | Active exported character layers |
| `objects/portal_mob_sheet.paint` | Editable 2D object/mob source |
| `objects/portal_mob_sheet.png` | Active exported object/mob spritesheet |
| `models/portals/expedition-portal.glb` | Active 3D portal model |
| `ui/items/*.png` | Inventory and reward icons |

The active Three.js astronaut, mobs, and resource nodes are code-defined models
so they can be edited without a proprietary model file:

| Source module | Models |
| --- | --- |
| `../../src/three/models/astronautModel.js` | World astronaut and profile paperdoll |
| `../../src/three/models/mobModels.js` | Herbivore, carnivore, and apex-predator variants |
| `../../src/three/models/resourceModels.js` | Rock, plant, and pond resource nodes |

See `../../src/three/models/README.md` for the model contract. The portal GLB
can be regenerated from its editable generator with
`node scripts/generate-portal-glb.mjs`.
