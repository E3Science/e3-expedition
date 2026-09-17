#!/usr/bin/env python3
"""Normalize the generated alien 4x4 source atlases into 64x64 game tiles."""

from __future__ import annotations

import json
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
PACK_DIR = ROOT / "public" / "assets" / "tiles" / "isometric" / "alien-expansion"
SOURCE_DIR = PACK_DIR / "source"
INDIVIDUAL_DIR = PACK_DIR / "individual"

CELL_SIZE = 64
GRID_COLUMNS = 4
GRID_ROWS = 4

SHEETS = (
    {
        "id": "terrain",
        "source": SOURCE_DIR / "alien-terrain-rgba-source.png",
        "output": PACK_DIR / "alien-terrain-4x4.png",
        "tiles": (
            ("fungal_turf_cyan", "Cyan fungal turf", "ground", False, False, None),
            ("moss_blue_violet", "Blue-violet moss", "ground", False, False, None),
            ("mineral_soil_coral", "Coral mineral soil", "ground", False, False, None),
            ("volcanic_soil_indigo", "Indigo volcanic soil", "ground", False, False, None),
            ("turf_soil_transition_w", "Turf/mineral transition W", "transition", False, False, None),
            ("turf_soil_transition_curve_w", "Turf/mineral curved transition W", "transition", False, False, None),
            ("turf_soil_transition_e", "Turf/mineral transition E", "transition", False, False, None),
            ("turf_soil_transition_curve_e", "Turf/mineral curved transition E", "transition", False, False, None),
            ("luminous_water", "Luminous alien water", "water", False, False, "fish"),
            ("luminous_shore_nw", "Luminous shoreline NW", "water", False, False, "fish"),
            ("luminous_shore_corner", "Luminous shoreline corner", "water", False, False, "fish"),
            ("luminous_mineral_island", "Luminous mineral island", "water", False, False, "fish"),
            ("crystal_cliff_violet", "Violet crystal cliff", "elevation", True, False, "mine"),
            ("crystal_cliff_cyan", "Cyan-veined cliff", "elevation", True, False, "mine"),
            ("glowing_plateau", "Glowing plateau", "elevation", True, False, None),
            ("alien_hill_slope", "Alien hill slope", "elevation", True, False, None),
        ),
    },
    {
        "id": "props",
        "source": SOURCE_DIR / "alien-props-rgba-source.png",
        "output": PACK_DIR / "alien-props-4x4.png",
        "tiles": (
            ("mushroom_tree_cyan", "Cyan mushroom tree", "tree", True, True, "communicate"),
            ("fan_tree_cobalt", "Cobalt fan-canopy tree", "tree", True, True, "communicate"),
            ("coral_tree_amber", "Amber coral tree", "tree", True, True, "harvest"),
            ("crystal_bark_tree_violet", "Violet crystal-bark tree", "tree", True, True, "mine"),
            ("spiral_fern_turquoise", "Turquoise spiral fern", "vegetation", False, False, "harvest"),
            ("glow_bulbs_blue", "Blue glow bulbs", "vegetation", False, False, "harvest"),
            ("cup_fungi_coral", "Coral cup fungi", "vegetation", False, False, "harvest"),
            ("ribbon_grass_violet", "Violet ribbon grass", "vegetation", False, False, "harvest"),
            ("crystal_cluster_cyan", "Cyan crystal cluster", "resource", True, False, "mine"),
            ("crystal_cluster_amber", "Amber crystal cluster", "resource", True, False, "mine"),
            ("meteor_rock_metallic", "Metallic meteor rock", "resource", True, False, "mine"),
            ("geode_luminous", "Luminous geode", "resource", True, False, "mine"),
            ("mineral_spring", "Bubbling mineral spring", "resource", False, False, "fish"),
            ("harvest_pod_plant", "Pod-bearing harvest plant", "resource", False, False, "harvest"),
            ("spore_nest_glowing", "Glowing spore nest", "resource", False, False, "dig"),
            ("bush_bioluminescent", "Bioluminescent bush", "vegetation", False, False, "harvest"),
        ),
    },
)


def normalize_cell(cell: Image.Image) -> Image.Image:
    """Fit nontransparent content into a bottom-centered 64x64 work cell."""
    alpha = cell.getchannel("A")
    bbox = alpha.point(lambda value: 255 if value > 10 else 0).getbbox()
    if bbox is None:
        return Image.new("RGBA", (CELL_SIZE, CELL_SIZE), (0, 0, 0, 0))

    content = cell.crop(bbox)
    scale = min(CELL_SIZE / content.width, (CELL_SIZE - 2) / content.height)
    size = (
        max(1, round(content.width * scale)),
        max(1, round(content.height * scale)),
    )
    content = content.resize(size, Image.Resampling.LANCZOS)

    output = Image.new("RGBA", (CELL_SIZE, CELL_SIZE), (0, 0, 0, 0))
    output.alpha_composite(content, ((CELL_SIZE - size[0]) // 2, CELL_SIZE - size[1]))
    return output


def build_sheet(spec: dict, frame_offset: int) -> tuple[Image.Image, list[dict]]:
    source = Image.open(spec["source"]).convert("RGBA")
    if source.width % GRID_COLUMNS or source.height % GRID_ROWS:
        raise ValueError(f"{spec['source']} must divide evenly into a 4x4 grid")

    source_cell_width = source.width // GRID_COLUMNS
    source_cell_height = source.height // GRID_ROWS
    output = Image.new(
        "RGBA",
        (GRID_COLUMNS * CELL_SIZE, GRID_ROWS * CELL_SIZE),
        (0, 0, 0, 0),
    )
    manifest_entries: list[dict] = []

    for local_frame, tile in enumerate(spec["tiles"]):
        column = local_frame % GRID_COLUMNS
        row = local_frame // GRID_COLUMNS
        source_box = (
            column * source_cell_width,
            row * source_cell_height,
            (column + 1) * source_cell_width,
            (row + 1) * source_cell_height,
        )
        normalized = normalize_cell(source.crop(source_box))
        output.alpha_composite(normalized, (column * CELL_SIZE, row * CELL_SIZE))

        key, label, category, solid, overhead, interaction = tile
        relative_file = f"individual/{key}.png"
        normalized.save(PACK_DIR / relative_file, optimize=True)
        manifest_entries.append(
            {
                "frame": frame_offset + local_frame,
                "sheet": spec["id"],
                "sheetFrame": local_frame,
                "row": row,
                "column": column,
                "key": key,
                "label": label,
                "category": category,
                "file": relative_file,
                "solidSuggested": solid,
                "overheadSuggested": overhead,
                "interactionSuggested": interaction,
                "anchor": {"x": 0.5, "y": 1.0},
                "footprint": {"width": 1, "height": 1},
            }
        )

    output.save(spec["output"], optimize=True)
    return output, manifest_entries


def main() -> None:
    INDIVIDUAL_DIR.mkdir(parents=True, exist_ok=True)
    combined = Image.new("RGBA", (GRID_COLUMNS * CELL_SIZE, GRID_ROWS * CELL_SIZE * 2), (0, 0, 0, 0))
    entries: list[dict] = []

    for sheet_index, spec in enumerate(SHEETS):
        output, sheet_entries = build_sheet(spec, sheet_index * 16)
        combined.alpha_composite(output, (0, sheet_index * GRID_ROWS * CELL_SIZE))
        entries.extend(sheet_entries)

    combined_path = PACK_DIR / "alien-expansion-master.png"
    combined.save(combined_path, optimize=True)

    manifest = {
        "id": "alien_isometric_expansion_v1",
        "source": "alien-expansion-master.png",
        "sourceSize": {"width": combined.width, "height": combined.height},
        "grid": {
            "frameWidth": CELL_SIZE,
            "frameHeight": CELL_SIZE,
            "columns": GRID_COLUMNS,
            "rows": GRID_ROWS * 2,
        },
        "projection": {"type": "isometric", "diamondWidth": 64, "diamondHeight": 32},
        "frames": entries,
    }
    (PACK_DIR / "alien-expansion-manifest.json").write_text(
        json.dumps(manifest, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"Wrote {combined_path}")
    print(f"Wrote {len(entries)} individual tiles to {INDIVIDUAL_DIR}")


if __name__ == "__main__":
    main()
