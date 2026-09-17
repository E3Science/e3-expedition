# Vibrant alien isometric expansion

The active `collection-v2/` pack provides 240 tiles: four expanded
biomes, stackable elevation, grouped giant plants, animated water, modular
habitat exteriors and interiors, hardware, cargo, and 48 directional biome
transitions. The original 192 palette frames remain in their existing positions;
48 corrected flora and tall-entrance tiles are appended. See
`collection-v2/README.md` for its layout and metadata contract.

This review pack adds 32 vivid alien-world tiles without replacing the active
outside sheet. It follows the existing 64×64 work-cell and bottom-center anchor
contract.

## Files

- `alien-expansion-master.png`: normalized 4×8 atlas containing all 32 tiles.
- `alien-expansion-manifest.json`: frame names, categories, interaction hints,
  collision suggestions, and overhead suggestions.
- `alien-terrain-4x4.png`: terrain-only atlas, frames 0–15.
- `alien-props-4x4.png`: props/resources atlas, frames 16–31.
- `individual/`: one transparent 64×64 PNG per tile.
- `source/*-chroma-source.png`: untouched high-resolution generated sources.
- `source/*-rgba-source.png`: high-resolution sources after background removal.
- `PROMPTS.md`: exact image-generation briefs used to make the pack.

The active world sheet has not been overwritten. After visual review, selected
tiles can be appended to `../outside_master.png` and registered in
`../outside_manifest.json`, or loaded as a second Admin Editor palette.

## Rebuild normalized tiles

From the repository root:

```powershell
python tools/build_alien_tile_expansion.py
```

The script divides each high-resolution source into a 4×4 grid, finds the
transparent bounds of every cell, scales the art proportionally, anchors it at
bottom-center in a 64×64 cell, and regenerates both atlases and the manifest.

## Frame layout

| Frames | Contents |
| --- | --- |
| 0–3 | Alien ground materials |
| 4–7 | Turf/mineral-soil transitions |
| 8–11 | Luminous water and shore variants |
| 12–15 | Crystal cliffs, plateau, and hill |
| 16–19 | Alien trees |
| 20–23 | Low alien vegetation |
| 24–27 | Mineral and mining nodes |
| 28–31 | Interactive resource nodes |
