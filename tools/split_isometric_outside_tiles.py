"""Split the iso-64x64-outside source sheet into named transparent game assets.

The source uses a 10 x 16 grid of 64 px work cells. Terrain occupies individual
cells, while the vegetation at the bottom contains taller variable-size props.
The script keeps the source sheet, exports cell-aligned terrain, exports the
tall props without cutting them apart, and writes a JSON catalog.
"""

from __future__ import annotations

import argparse
import json
import shutil
from pathlib import Path

from PIL import Image


CELL = 64

TILE_LABEL_ROWS = [
    ["grass", "grass", "dirt", "dirt", "transition grass/dirt", "transition grass/dirt", "transition grass/dirt", "blank", "blank", "blank"],
    ["transition grass/dirt", "transition grass/dirt", "transition grass/dirt", "transition grass/dirt", "transition grass/dirt", "transition grass/dirt", "transition grass/dirt", "transition grass/dirt", "blank", "blank"],
    ["transition grass/dirt", "transition grass/dirt", "transition grass/dirt", "transition grass/dirt", "blank", "blank", "blank", "blank", "blank", "blank"],
    ["hill slope_N", "hill slope_NE", "hill slope_NW", "hill slope_E", "hilltop", "hill slope_W", "hill slope_SE", "hill slope_SW", "hill slope_S", "blank"],
    ["hill slope_S", "hill slope_W", "hill slope_N", "hill slope_E", "blank", "blank", "blank", "blank", "blank", "blank"],
    ["mountain slope_N", "mountain slope_NE", "mountain slope_NW", "mountain slope_E", "mountaintop", "mountaintop", "mountain slope_W", "hill slope_SE", "mountain slope_SW", "mountain slope_S"],
    ["mountaintop w/ waterfall", "mountaintop w/ waterfall", "mountaintop w/ waterfall", "mountaintop w/ waterfall", "mountaintop w/ waterfall", "mountaintop w/ waterfall", "rock", "rock", "rock", "large rock"],
    ["large rock", "mountaintop w/ grass", "mountaintop w/ grass", "mountaintop w/ grass", "mountaintop w/ grass", "mountaintop w/ grass", "mountaintop w/ grass", "mountaintop w/ grass", "mountaintop w/ grass", "mountaintop w/ grass"],
    ["transition land/lake_N", "transition land/lake_NE", "transition land/lake_NW", "transition land/lake_E", "water", "water", "transition land/lake_W", "transition land/lake_SE", "transition land/lake_SW", "transition land/lake_S"],
    ["river NW-NE", "river NW-SE", "river SW-NE", "river NE-SE", "river NW-SW", "river SW-SE", "water w/ land N", "water w/ land E", "water w/ land W", "water w/ land S"],
    ["water w/ rock", "puddle", "water w/ island", "blank", "blank", "blank", "blank", "blank", "blank", "blank"],
    ["tallgrass edge_N", "tallgrass edge_NE", "tallgrass edge_NW", "tallgrass edge_E", "tallgrass", "tallgrass edge_W", "tallgrass edge_SE", "tallgrass edge_SW", "tallgrass edge_S", "bramble"],
    ["small bush", "large bush", "tree top", "tree top", "log", "log", "small bush", "small bush", "medium bush", "large bush"],
    ["tree top", "tree top", "tree trunk", "tree trunk", "blank", "blank", "blank", "tree top", "tree top", "tree top"],
    ["tree", "tree", "tree top", "tree top", "tree top", "tree top", "tree top", "tree", "tree", "tree"],
    ["tree trunk", "tree trunk", "tree trunk", "tree trunk", "tree", "tree trunk", "tree", "tree", "tree trunk", "tree"],
]

TERRAIN_ROWS = {
    0: ("ground", "grass"),
    1: ("ground", "grass"),
    2: ("ground", "grass"),
    3: ("terrain_transition", "grass_slope"),
    4: ("terrain_transition", "grass_cliff"),
    5: ("resource", "rock_formation"),
    6: ("terrain", "stone_cliff"),
    7: ("terrain", "grass_cliff"),
    8: ("water", "water_edge"),
    9: ("water", "water_edge"),
    10: ("water_detail", "water_detail"),
    11: ("vegetation", "grass_tuft"),
}

# These source rectangles keep tall vegetation together instead of slicing it
# into unrelated 64 px fragments.
PROP_RECTS = [
    ("shrub_small_01", "vegetation", (0, 768, 64, 832)),
    ("shrub_small_02", "vegetation", (64, 768, 128, 832)),
    ("conifer_small_01", "tree", (128, 768, 192, 896)),
    ("conifer_small_02", "tree", (192, 768, 256, 896)),
    ("fallen_log_01", "decoration", (256, 768, 320, 832)),
    ("fallen_log_02", "decoration", (320, 768, 384, 832)),
    ("shrub_medium_01", "vegetation", (384, 768, 448, 832)),
    ("shrub_medium_02", "vegetation", (448, 768, 512, 832)),
    ("shrub_large_01", "vegetation", (512, 768, 576, 832)),
    ("shrub_large_02", "vegetation", (576, 768, 640, 832)),
    ("pine_tree_01", "tree", (0, 832, 64, 1024)),
    ("dead_tree_01", "tree", (64, 832, 128, 1024)),
    ("pine_tree_02", "tree", (128, 832, 192, 1024)),
    ("dead_tree_02", "tree", (192, 832, 256, 1024)),
    ("dead_tree_large", "tree", (256, 832, 448, 1024)),
    ("canopy_tree_large", "tree", (448, 832, 640, 1024)),
]


def normalize_transparency(image: Image.Image) -> Image.Image:
    """Clear hidden green RGB while preserving the source alpha exactly."""
    rgba = image.convert("RGBA")
    pixels = []
    for red, green, blue, alpha in rgba.get_flattened_data():
        pixels.append((0, 0, 0, 0) if alpha == 0 else (red, green, blue, alpha))
    rgba.putdata(pixels)
    return rgba


def has_visible_pixels(image: Image.Image) -> bool:
    return image.getchannel("A").getbbox() is not None


def semantic_category(label: str) -> str:
    lowered = label.lower()
    if lowered == "blank":
        return "blank"
    if "tree" in lowered:
        return "tree"
    if "bush" in lowered or "tallgrass" in lowered or "bramble" in lowered:
        return "vegetation"
    if "log" in lowered:
        return "decoration"
    if "water" in lowered or "lake" in lowered or "river" in lowered or "puddle" in lowered:
        return "water"
    if "mountain" in lowered or "hill" in lowered:
        return "elevation"
    if "rock" in lowered:
        return "rock"
    return "ground"


def semantic_flags(label: str) -> tuple[bool, bool]:
    lowered = label.lower()
    solid = any(
        term in lowered
        for term in ("slope", "mountaintop", "rock", "water", "lake", "river", "bush", "tree", "log", "bramble")
    )
    overhead = "tree top" in lowered
    return solid, overhead


def save_asset(
    source: Image.Image,
    output_dir: Path,
    name: str,
    category: str,
    source_rect: tuple[int, int, int, int],
    *,
    tile_aligned: bool,
) -> dict:
    crop = source.crop(source_rect)
    file_name = f"{name}.png"
    crop.save(output_dir / file_name, optimize=True)
    return {
        "key": name,
        "category": category,
        "file": f"individual/{file_name}",
        "sourceRect": {
            "x": source_rect[0],
            "y": source_rect[1],
            "width": source_rect[2] - source_rect[0],
            "height": source_rect[3] - source_rect[1],
        },
        "tileAligned": tile_aligned,
        "anchor": {"x": 0.5, "y": 1.0},
        "footprint": {"width": 1, "height": 1},
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()

    output_root = args.output
    individual_dir = output_root / "individual"
    individual_dir.mkdir(parents=True, exist_ok=True)

    source = normalize_transparency(Image.open(args.source))
    if source.size != (640, 1024):
        raise ValueError(f"Expected a 640 x 1024 source sheet, got {source.size}")

    master_path = output_root / "outside_master.png"
    source.save(master_path, optimize=True)
    shutil.copy2(args.source, output_root / "outside_source_original.png")

    assets: list[dict] = []
    frames: list[dict] = []
    counters: dict[str, int] = {}

    for row, labels in enumerate(TILE_LABEL_ROWS):
        for column, label in enumerate(labels):
            solid, overhead = semantic_flags(label)
            frames.append(
                {
                    "frame": row * 10 + column,
                    "row": row,
                    "column": column,
                    "label": label,
                    "category": semantic_category(label),
                    "blank": label == "blank",
                    "solidSuggested": solid,
                    "overheadSuggested": overhead,
                }
            )

    for row, (category, stem) in TERRAIN_ROWS.items():
        for column in range(source.width // CELL):
            rect = (
                column * CELL,
                row * CELL,
                (column + 1) * CELL,
                (row + 1) * CELL,
            )
            crop = source.crop(rect)
            if not has_visible_pixels(crop):
                continue
            counters[stem] = counters.get(stem, 0) + 1
            name = f"{stem}_{counters[stem]:02d}"
            asset = save_asset(
                    source,
                    individual_dir,
                    name,
                    category,
                    rect,
                    tile_aligned=True,
                )
            asset["frame"] = row * 10 + column
            asset["label"] = TILE_LABEL_ROWS[row][column]
            asset["category"] = semantic_category(asset["label"])
            assets.append(asset)

    for name, category, rect in PROP_RECTS:
        crop = source.crop(rect)
        if not has_visible_pixels(crop):
            continue
        assets.append(
            save_asset(
                source,
                individual_dir,
                name,
                category,
                rect,
                tile_aligned=False,
            )
        )

    manifest = {
        "id": "iso_64x64_outside",
        "source": "outside_master.png",
        "sourceSize": {"width": source.width, "height": source.height},
        "grid": {
            "frameWidth": CELL,
            "frameHeight": CELL,
            "columns": source.width // CELL,
            "rows": source.height // CELL,
        },
        "projection": {
            "type": "isometric",
            "diamondWidth": 64,
            "diamondHeight": 32,
        },
        "frames": frames,
        "assets": assets,
    }
    (output_root / "outside_manifest.json").write_text(
        json.dumps(manifest, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"Wrote {len(assets)} assets to {output_root}")


if __name__ == "__main__":
    main()
