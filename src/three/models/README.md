# Procedural 3D model sources

These modules are the original editable sources for the Three.js models used in
the game. They build ordinary Three.js groups from geometry and materials at
runtime; the astronaut, mobs, and resource nodes do not depend on hidden GLB or
Blender files.

## Files

- `astronautModel.js` builds the live player model and higher-detail profile
  paperdoll. Edit body dimensions, materials, and colors here.
- `mobModels.js` builds `herbivore`, `carnivore`, and `apex_predator` variants.
  `tier` changes scale while `kind` controls form and palette.
- `resourceModels.js` builds `rock`, `plant`, and `pond` nodes. `tier` controls
  size and rarity colors.

Each factory returns a `root` Three.js group plus the moving parts needed by the
world renderer. Keep those returned properties when changing the internal mesh
layout so walking and resource animations continue to work.

The portal is a separate GLB asset at
`public/assets/models/portals/expedition-portal.glb`; its editable generator is
`scripts/generate-portal-glb.mjs`.
