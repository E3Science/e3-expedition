#!/usr/bin/env python3
"""Register the hand-edited 10-column alien atlas without rebuilding its art.

The first 240 logical frame ids are intentionally stable.  Their pixels still
live in the first four columns of each atlas row, so ``textureFrame`` maps those
logical ids into Phaser's new 10-column row-major frame numbers.  Hand-added
cells are assigned logical ids after 239.

This script edits only the JSON manifest.  It never writes the user-authored
master PNG.
"""

from __future__ import annotations

import json
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
PACK_DIR = (
    ROOT
    / "public"
    / "assets"
    / "tiles"
    / "isometric"
    / "alien-expansion"
    / "collection-v2"
)
MANIFEST_PATH = PACK_DIR / "alien-collection-v2-manifest.json"
MASTER_PATH = PACK_DIR / "alien-collection-v2-master.png"
LEGACY_COLUMNS = 4
ATLAS_COLUMNS = 10
FRAME_SIZE = 64
BUILT_IN_FRAME_COUNT = 240
CUSTOM_PREFIX = "master_v3_"


def texture_frame(row: int, column: int) -> int:
    return row * ATLAS_COLUMNS + column


def frame_definition(
    logical_frame: int,
    row: int,
    column: int,
    key: str,
    label: str,
    category: str,
    layer: int,
    *,
    solid: bool = False,
    overhead: bool = False,
    interaction: str | None = None,
) -> dict:
    return {
        "frame": logical_frame,
        "textureFrame": texture_frame(row, column),
        "sheet": "user-master-additions-v3",
        "sheetFrame": texture_frame(row, column),
        "row": row,
        "column": column,
        "atlasRow": row,
        "atlasColumn": column,
        "key": f"{CUSTOM_PREFIX}{key}",
        "label": label,
        "category": category,
        "layerSuggested": layer,
        "solidSuggested": solid,
        "overheadSuggested": overhead,
        "interactionSuggested": interaction,
        "file": None,
        "anchor": {"x": 0.5, "y": 1.0},
        "footprint": {"width": 1, "height": 1},
    }


def main() -> None:
    manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    with Image.open(MASTER_PATH) as image:
        assert image.mode == "RGBA", f"Expected RGBA atlas, got {image.mode}"
        assert image.width == ATLAS_COLUMNS * FRAME_SIZE, (
            f"Expected {ATLAS_COLUMNS * FRAME_SIZE}px width, got {image.width}px"
        )
        assert image.height % FRAME_SIZE == 0, "Atlas height must be a multiple of 64"
        atlas_rows = image.height // FRAME_SIZE

    stable_frames = [
        entry
        for entry in manifest.get("frames", [])
        if int(entry.get("frame", -1)) < BUILT_IN_FRAME_COUNT
    ]
    assert len(stable_frames) == BUILT_IN_FRAME_COUNT
    stable_frames.sort(key=lambda entry: int(entry["frame"]))
    for logical_frame, entry in enumerate(stable_frames):
        assert int(entry["frame"]) == logical_frame
        atlas_row = logical_frame // LEGACY_COLUMNS
        atlas_column = logical_frame % LEGACY_COLUMNS
        entry["textureFrame"] = texture_frame(atlas_row, atlas_column)
        entry["atlasRow"] = atlas_row
        entry["atlasColumn"] = atlas_column

    custom_specs = [
        # Additional cliff silhouettes aligned by the user.
        (4, 4, "cyan_cliff_large_top", "Cyan large cliff top", "mountain", 2, True, False, None),
        (5, 4, "cyan_cliff_large_face", "Cyan large cliff face", "mountain", 2, True, False, None),
        (16, 4, "indigo_cliff_large_top", "Indigo large cliff top", "mountain", 2, True, False, None),
        # Four animated banks.  The direction names describe where the water continues.
        *[(20, col, f"water_edge_ne_{col - 3}", f"Water edge NE {col - 3}", "water", 1, False, False, "fish") for col in range(4, 8)],
        *[(21, col, f"water_edge_nw_{col - 3}", f"Water edge NW {col - 3}", "water", 1, False, False, "fish") for col in range(4, 8)],
        *[(22, col, f"water_edge_sw_{col - 3}", f"Water edge SW {col - 3}", "water", 1, False, False, "fish") for col in range(4, 8)],
        *[(23, col, f"water_edge_se_{col - 3}", f"Water edge SE {col - 3}", "water", 1, False, False, "fish") for col in range(4, 8)],
        # New modular wall and doorway halves.
        (29, 4, "habitat_wall_left", "Habitat wall left half", "habitat_exterior", 2, True, False, None),
        (29, 5, "habitat_wall_right", "Habitat wall right half", "habitat_exterior", 2, True, False, None),
        (30, 4, "habitat_door_left", "Habitat door left half", "habitat_connector", 2, False, False, "communicate"),
        (30, 5, "habitat_door_right", "Habitat door right half", "habitat_connector", 2, False, False, "communicate"),
        # Wide, branched flora: three canopy cells plus one trunk cell per biome.
        (47, 4, "cyan_tree_left", "Cyan elder tree left canopy", "giant_plant", 3, False, True, "harvest"),
        (47, 5, "cyan_tree_crown", "Cyan elder tree crown", "giant_plant", 3, False, True, "harvest"),
        (47, 6, "cyan_tree_right", "Cyan elder tree right canopy", "giant_plant", 3, False, True, "harvest"),
        (48, 5, "cyan_tree_trunk", "Cyan elder tree trunk", "giant_plant", 2, True, False, "harvest"),
        (49, 4, "violet_tree_left", "Violet shelf tree left canopy", "giant_plant", 3, False, True, "harvest"),
        (49, 5, "violet_tree_crown", "Violet shelf tree crown", "giant_plant", 3, False, True, "harvest"),
        (49, 6, "violet_tree_right", "Violet shelf tree right canopy", "giant_plant", 3, False, True, "harvest"),
        (50, 5, "violet_tree_trunk", "Violet shelf tree trunk", "giant_plant", 2, True, False, "harvest"),
        (51, 4, "coral_tree_left", "Coral fan tree left canopy", "giant_plant", 3, False, True, "harvest"),
        (51, 5, "coral_tree_crown", "Coral fan tree crown", "giant_plant", 3, False, True, "harvest"),
        (51, 6, "coral_tree_right", "Coral fan tree right canopy", "giant_plant", 3, False, True, "harvest"),
        (52, 5, "coral_tree_trunk", "Coral fan tree trunk", "giant_plant", 2, True, False, "harvest"),
        (54, 4, "indigo_tree_left", "Indigo crystal tree left canopy", "giant_plant", 3, False, True, "harvest"),
        (54, 5, "indigo_tree_crown", "Indigo crystal tree crown", "giant_plant", 3, False, True, "harvest"),
        (54, 6, "indigo_tree_right", "Indigo crystal tree right canopy", "giant_plant", 3, False, True, "harvest"),
        (55, 5, "indigo_tree_trunk", "Indigo crystal tree trunk", "giant_plant", 2, True, False, "harvest"),
        # Astronaut-scale doorway added at the bottom of the atlas.
        (58, 5, "habitat_tall_door_top", "Habitat tall doorway upper section", "habitat_tall_exterior", 3, False, True, None),
        (59, 5, "habitat_tall_door_bottom", "Habitat tall doorway entrance", "habitat_tall_exterior", 2, False, False, "communicate"),
    ]

    next_frame = BUILT_IN_FRAME_COUNT
    custom_frames = []
    logical_by_key: dict[str, int] = {}
    for row, column, key, label, category, layer, solid, overhead, interaction in custom_specs:
        definition = frame_definition(
            next_frame,
            row,
            column,
            key,
            label,
            category,
            layer,
            solid=solid,
            overhead=overhead,
            interaction=interaction,
        )
        custom_frames.append(definition)
        logical_by_key[key] = next_frame
        next_frame += 1

    manifest["sourceSize"] = {
        "width": ATLAS_COLUMNS * FRAME_SIZE,
        "height": atlas_rows * FRAME_SIZE,
    }
    manifest["grid"] = {
        "frameWidth": FRAME_SIZE,
        "frameHeight": FRAME_SIZE,
        "columns": ATLAS_COLUMNS,
        "rows": atlas_rows,
    }
    manifest["legacyLogicalColumns"] = LEGACY_COLUMNS
    manifest["logicalFrameCount"] = next_frame
    manifest["frames"] = stable_frames + custom_frames

    groups = [
        group
        for group in manifest.get("groups", [])
        if not str(group.get("id", "")).startswith(CUSTOM_PREFIX)
    ]

    def tree_group(biome: str) -> dict:
        return {
            "id": f"{CUSTOM_PREFIX}{biome}_elder_tree",
            "name": f"{biome.title()} elder tree (user atlas)",
            "type": "tile_group",
            "projection": "isometric",
            "offsetSpace": "map",
            "anchorFrame": logical_by_key[f"{biome}_tree_trunk"],
            "entries": [
                {"frame": logical_by_key[f"{biome}_tree_left"], "dx": -2, "dy": 0, "layer": "overhead"},
                {"frame": logical_by_key[f"{biome}_tree_crown"], "dx": -1, "dy": -1, "layer": "overhead"},
                {"frame": logical_by_key[f"{biome}_tree_right"], "dx": 0, "dy": -2, "layer": "overhead"},
                {"frame": logical_by_key[f"{biome}_tree_trunk"], "dx": 0, "dy": 0, "layer": "detail"},
            ],
            "collisionFootprint": [{"dx": 0, "dy": 0}],
        }

    groups.extend(tree_group(biome) for biome in ("cyan", "violet", "coral", "indigo"))
    groups.extend(
        [
            {
                "id": f"{CUSTOM_PREFIX}habitat_wall_pair",
                "name": "Habitat wide wall pair (user atlas)",
                "type": "tile_group",
                "projection": "isometric",
                "offsetSpace": "map",
                "anchorFrame": logical_by_key["habitat_wall_right"],
                "entries": [
                    {"frame": logical_by_key["habitat_wall_left"], "dx": -1, "dy": 1, "layer": "detail"},
                    {"frame": logical_by_key["habitat_wall_right"], "dx": 0, "dy": 0, "layer": "detail"},
                ],
                "collisionFootprint": [{"dx": -1, "dy": 1}, {"dx": 0, "dy": 0}],
            },
            {
                "id": f"{CUSTOM_PREFIX}habitat_door_pair",
                "name": "Habitat wide door pair (user atlas)",
                "type": "tile_group",
                "projection": "isometric",
                "offsetSpace": "map",
                "anchorFrame": logical_by_key["habitat_door_right"],
                "entries": [
                    {"frame": logical_by_key["habitat_door_left"], "dx": -1, "dy": 1, "layer": "detail"},
                    {"frame": logical_by_key["habitat_door_right"], "dx": 0, "dy": 0, "layer": "detail"},
                ],
            },
            {
                "id": f"{CUSTOM_PREFIX}habitat_tall_door",
                "name": "Habitat tall doorway (user atlas)",
                "type": "tall_vertical_building",
                "projection": "isometric",
                "offsetSpace": "map",
                "anchorFrame": logical_by_key["habitat_tall_door_bottom"],
                "entries": [
                    {"frame": logical_by_key["habitat_tall_door_top"], "dx": -2, "dy": -2, "layer": "overhead"},
                    {"frame": logical_by_key["habitat_tall_door_bottom"], "dx": 0, "dy": 0, "layer": "detail"},
                ],
            },
        ]
    )
    manifest["groups"] = groups

    for biome in manifest.get("biomes", []):
        biome_id = biome.get("id")
        if biome_id not in {"cyan", "violet", "coral", "indigo"}:
            continue
        ordered = [
            f"{CUSTOM_PREFIX}{biome_id}_elder_tree",
            biome.get("giantPlantGroup"),
        ]
        biome["giantPlantGroups"] = [value for value in ordered if value]

    animations = [
        animation
        for animation in manifest.get("animations", [])
        if not str(animation.get("id", "")).startswith(f"{CUSTOM_PREFIX}water_edge_")
    ]
    for direction in ("ne", "nw", "sw", "se"):
        animations.append(
            {
                "id": f"{CUSTOM_PREFIX}water_edge_{direction}_loop",
                "name": f"Directional luminous shoreline {direction.upper()}",
                "frames": [logical_by_key[f"water_edge_{direction}_{index}"] for index in range(1, 5)],
                "frameDurationMs": 180,
                "repeat": -1,
            }
        )
    manifest["animations"] = animations

    MANIFEST_PATH.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(
        f"Registered {len(stable_frames)} stable + {len(custom_frames)} user frames "
        f"across a {ATLAS_COLUMNS}x{atlas_rows} atlas."
    )


if __name__ == "__main__":
    main()
