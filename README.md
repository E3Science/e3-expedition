# Epsilon Eridani Expedition (E3)

Multiplayer Phaser game client with a Three.js world overlay, an isometric map
renderer, Supabase authentication, and a Colyseus server.

## Run the game

```powershell
npm install
npm run dev
```

The Vite client runs at `http://localhost:8080` by default.

Run the multiplayer server in a second terminal:

```powershell
cd server
npm install
npm run dev
```

Create a production client build with `npm run build`. The generated `dist/`
folder is build output; make source changes in `src/` and `public/` instead.

## Where to edit the game

| Location | Purpose |
| --- | --- |
| `src/main.js` | Phaser gameplay, map/editor logic, input, and UI wiring |
| `src/three/` | Three.js renderers and GLB loading |
| `src/three/models/` | Editable procedural astronaut, mob, and resource-node models |
| `src/ui/` | Standalone UI sequences and panels |
| `public/assets/` | Runtime art, tiles, GLB models, and editable art sources |
| `server/src/` | Colyseus rooms, multiplayer state, and server gameplay |
| `tools/` | Tilesheet import and map-migration utilities |
| `scripts/` | Asset-generation scripts |

## Canonical art and model sources

See [`public/assets/README.md`](public/assets/README.md) for the complete asset
index. The important sources are:

- Active isometric world sheet: `public/assets/tiles/isometric/alien-expansion/collection-v2/alien-collection-v2-master.png`
- Untouched imported sheet: `public/assets/tiles/isometric/outside_source_original.png`
- Individual named tiles: `public/assets/tiles/isometric/individual/`
- Layered 2D character source: `public/assets/player/layers/new_character_sheet.paint`
- 2D object/mob source: `public/assets/objects/portal_mob_sheet.paint`
- Portal GLB: `public/assets/models/portals/expedition-portal.glb`
- 3D astronaut source: `src/three/models/astronautModel.js`
- 3D mob source: `src/three/models/mobModels.js`
- 3D resource-node source: `src/three/models/resourceModels.js`

The astronaut, mobs, and resource nodes are intentionally procedural Three.js
models, not hidden binary model files. Their geometry, proportions, materials,
and colors are directly editable in the model modules above. The portal is the
current GLB-based model and can be regenerated with
`node scripts/generate-portal-glb.mjs`.

## Isometric asset workflow

The active world and Admin Tile Editor use a 4-column by 48-row, 64x64-cell
sheet whose visible ground diamonds are approximately 64x32 pixels. Rebuild
and validate it with:

```powershell
python tools/build_alien_tile_collection_v2.py
python tools/validate_alien_tile_collection_v2.py
```

See
[`public/assets/tiles/isometric/PROCEDURAL_MAP_GUIDE.md`](public/assets/tiles/isometric/PROCEDURAL_MAP_GUIDE.md)
for layer rules, directional transitions, tile groups, and procedural-map
generation.
