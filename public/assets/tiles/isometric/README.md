# Isometric world tiles

The active world tiles are in `alien-expansion/collection-v2/`. The imported
`iso-64x64-outside.png` set remains here as a legacy editable source and for
saved-map conversion.

## Recommended usage

Keep both representations:

- `outside_source_original.png` is the untouched downloaded source.
- `outside_master.png` is the normalized transparent master sheet.
- `outside_manifest.json` describes all 160 grid frames, their semantic labels,
  suggested collision/overhead roles, and every extracted asset.
- `individual/` contains named PNGs for direct placement and future procedural
  generation.

The full sheet is useful for compact loading and indexed terrain frames.
Individual files are better for semantic rules such as collision, spawn
weights, footprints, biome restrictions, and procedural placement.

## Phaser cache keys

The game preloads:

- `iso_outside_tilesheet`: 64 x 64 indexed frames
- `iso_outside_master`: full-sheet image
- `iso_outside_manifest`: JSON catalog

The cache-key names remain stable, but they now load collection v2. Legacy
classic frames are converted through `legacy_to_iso_frame.json`, then retired
outside-sheet frames are converted through
`alien-expansion/collection-v2/previous-outside-frame-map.json`.

## Projection

- Work cell: 64 x 64 pixels
- Visible ground diamond: approximately 64 x 32 pixels
- Projection: 2:1 isometric
- Default prop anchor: bottom-center

## Regenerating the extracted assets

From the repository root, run:

```powershell
python tools/split_isometric_outside_tiles.py `
  "C:\path\to\iso-64x64-outside.png" `
  "public\assets\tiles\isometric"
```

The script preserves the original, normalizes hidden green RGB beneath
transparent pixels, exports cell-aligned terrain, keeps tall props intact, and
rewrites the manifest.

See [PROCEDURAL_MAP_GUIDE.md](PROCEDURAL_MAP_GUIDE.md) for the layer contract,
generation stages, validation rules, and admin-override workflow.

[`alien-expansion/collection-v2/`](alien-expansion/collection-v2/) is the active
240-frame runtime and Admin Editor collection. Frames 0-191 retain the original
palette positions; corrected flora and tall entrances are appended at 192-239.
