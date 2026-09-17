#!/usr/bin/env python3
"""Build the extended alien-biome and space-habitat isometric tile collection."""

from __future__ import annotations

import json
import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
PACK_DIR = ROOT / "public" / "assets" / "tiles" / "isometric" / "alien-expansion" / "collection-v2"
SOURCE_DIR = PACK_DIR / "source"
SHEET_DIR = PACK_DIR / "sheets"
INDIVIDUAL_DIR = PACK_DIR / "individual"

CELL_SIZE = 64
GRID_COLUMNS = 4
GRID_ROWS = 4
GROUND_TOP = CELL_SIZE - 32
GROUND_CENTER_Y = GROUND_TOP + 16


SCREEN_DIRECTION_VECTORS = {
    "N": (0.0, -1.0),
    "NE": (1.0, -1.0),
    "E": (1.0, 0.0),
    "SE": (1.0, 1.0),
    "S": (0.0, 1.0),
    "SW": (-1.0, 1.0),
    "W": (-1.0, 0.0),
    "NW": (-1.0, -1.0),
}


def tile(
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
        "key": key,
        "label": label,
        "category": category,
        "layerSuggested": layer,
        "solidSuggested": solid,
        "overheadSuggested": overhead,
        "interactionSuggested": interaction,
    }


BIOMES = (
    ("cyan", "Cyan fungal", "giant mushroom"),
    ("violet", "Blue-violet moss", "giant fan tree"),
    ("coral", "Coral mineral", "giant coral tree"),
    ("indigo", "Indigo volcanic", "giant crystal-bark tree"),
)

TRANSITION_DIRECTIONS = ("N", "NE", "E", "SE", "S", "SW", "W", "NW")
TRANSITION_SHEETS = (
    ("a", (("cyan", "violet"), ("cyan", "coral"))),
    ("b", (("cyan", "indigo"), ("violet", "coral"))),
    ("c", (("violet", "indigo"), ("coral", "indigo"))),
)


def base_tiles() -> list[dict]:
    result: list[dict] = []
    for biome_key, biome_label, _ in BIOMES:
        for variant in range(1, 5):
            result.append(
                tile(
                    f"base_{biome_key}_{variant:02d}",
                    f"{biome_label} base {variant}",
                    "ground",
                    1,
                )
            )
    return result


def transition_tiles(pairs: tuple[tuple[str, str], tuple[str, str]]) -> list[dict]:
    result: list[dict] = []
    for biome_a, biome_b in pairs:
        for direction in TRANSITION_DIRECTIONS:
            result.append(
                tile(
                    f"transition_{biome_a}_{biome_b}_{direction.lower()}",
                    f"{biome_a.title()} to {biome_b} transition {direction}",
                    "biome_transition",
                    1,
                )
            )
    return result


def biome_tiles(biome_key: str, biome_label: str, giant_plant: str) -> list[dict]:
    return [
        tile(f"{biome_key}_mountain_top", f"{biome_label} mountain top", "mountain", 2, solid=True),
        tile(f"{biome_key}_mountain_face", f"{biome_label} mountain repeatable face", "mountain", 2, solid=True),
        tile(f"{biome_key}_mountain_base", f"{biome_label} mountain base", "mountain", 2, solid=True),
        tile(f"{biome_key}_mountain_corner", f"{biome_label} mountain corner", "mountain", 2, solid=True),
        tile(f"{biome_key}_hill_top", f"{biome_label} hill top", "hill", 2, solid=True),
        tile(f"{biome_key}_hill_face", f"{biome_label} hill repeatable face", "hill", 2, solid=True),
        tile(f"{biome_key}_hill_base", f"{biome_label} hill base", "hill", 2, solid=True),
        tile(f"{biome_key}_hill_corner", f"{biome_label} hill corner", "hill", 2, solid=True),
        tile(f"{biome_key}_giant_plant_01", f"{biome_label} {giant_plant} legacy piece 1", "legacy_giant_plant", 3, solid=True, overhead=True, interaction="harvest"),
        tile(f"{biome_key}_giant_plant_02", f"{biome_label} {giant_plant} legacy piece 2", "legacy_giant_plant", 3, solid=True, overhead=True, interaction="harvest"),
        tile(f"{biome_key}_giant_plant_03", f"{biome_label} {giant_plant} legacy piece 3", "legacy_giant_plant", 2, solid=True, interaction="harvest"),
        tile(f"{biome_key}_giant_plant_04", f"{biome_label} {giant_plant} legacy piece 4", "legacy_giant_plant", 2, solid=True, interaction="harvest"),
        tile(f"{biome_key}_plant_region_left", f"{biome_label} legacy plant region left edge", "legacy_plant_region", 2, interaction="harvest"),
        tile(f"{biome_key}_plant_region_center", f"{biome_label} legacy plant region center", "legacy_plant_region", 2, interaction="harvest"),
        tile(f"{biome_key}_plant_region_right", f"{biome_label} legacy plant region right edge", "legacy_plant_region", 2, interaction="harvest"),
        tile(f"{biome_key}_plant_region_corner", f"{biome_label} legacy plant region corner", "legacy_plant_region", 2, interaction="harvest"),
    ]


def corrected_flora_tiles(biome_key: str, biome_label: str, giant_plant: str) -> list[dict]:
    return [
        tile(f"{biome_key}_giant_plant_left", f"{biome_label} {giant_plant} left branch", "giant_plant", 3, overhead=True, interaction="harvest"),
        tile(f"{biome_key}_giant_plant_crown", f"{biome_label} {giant_plant} center crown", "giant_plant", 3, overhead=True, interaction="harvest"),
        tile(f"{biome_key}_giant_plant_right", f"{biome_label} {giant_plant} right branch", "giant_plant", 3, overhead=True, interaction="harvest"),
        tile(f"{biome_key}_giant_plant_trunk", f"{biome_label} {giant_plant} trunk and roots", "giant_plant", 2, solid=True, interaction="harvest"),
        *[
            tile(f"{biome_key}_flora_{variant:02d}", f"{biome_label} standalone flora {variant}", "flora", 2, interaction="harvest")
            for variant in range(1, 5)
        ],
    ]


def tall_habitat_tiles() -> list[dict]:
    tiles: list[dict] = []
    for section, layer, overhead in (("top", 3, True), ("middle", 3, True), ("entrance", 2, False)):
        for module in ("command", "lab", "crew", "greenhouse"):
            tiles.append(
                tile(
                    f"habitat_tall_{module}_{section}",
                    f"Astronaut-scale {module} doorway {section}",
                    "habitat_tall_exterior",
                    layer,
                    solid=True,
                    overhead=overhead,
                    interaction="communicate" if section == "entrance" else None,
                )
            )
    for variant in range(1, 5):
        tiles.append(
            tile(
                f"habitat_tall_airlock_{variant:02d}",
                f"Astronaut-scale standalone airlock {variant}",
                "habitat_tall_exterior",
                2,
                solid=True,
                interaction="communicate",
            )
        )
    return tiles


WATER_TILES = [
    tile(f"water_open_{frame}", f"Open luminous water animation {frame}", "water", 1, solid=True, interaction="fish")
    for frame in range(1, 5)
] + [
    tile(f"water_shore_straight_{frame}", f"Straight shoreline animation {frame}", "water", 1, solid=True, interaction="fish")
    for frame in range(1, 5)
] + [
    tile(f"water_shore_corner_{frame}", f"Corner shoreline animation {frame}", "water", 1, solid=True, interaction="fish")
    for frame in range(1, 5)
] + [
    tile(f"water_mineral_island_{frame}", f"Mineral island water animation {frame}", "water", 1, solid=True, interaction="fish")
    for frame in range(1, 5)
]


HABITAT_EXTERIOR_TILES = [
    tile("habitat_command_roof", "Command module roof", "habitat_exterior", 3, solid=True, overhead=True),
    tile("habitat_lab_roof", "Science laboratory roof", "habitat_exterior", 3, solid=True, overhead=True),
    tile("habitat_crew_roof", "Crew habitat roof", "habitat_exterior", 3, solid=True, overhead=True),
    tile("habitat_greenhouse_roof", "Hydroponic greenhouse roof", "habitat_exterior", 3, solid=True, overhead=True),
    tile("habitat_command_middle", "Command module upper wall", "habitat_exterior", 3, solid=True, overhead=True),
    tile("habitat_lab_middle", "Science laboratory upper wall", "habitat_exterior", 3, solid=True, overhead=True),
    tile("habitat_crew_middle", "Crew habitat upper wall", "habitat_exterior", 3, solid=True, overhead=True),
    tile("habitat_greenhouse_middle", "Hydroponic greenhouse upper wall", "habitat_exterior", 3, solid=True, overhead=True),
    tile("habitat_command_entrance", "Command module entrance", "habitat_exterior", 2, solid=True, interaction="communicate"),
    tile("habitat_lab_entrance", "Science laboratory entrance", "habitat_exterior", 2, solid=True, interaction="communicate"),
    tile("habitat_crew_entrance", "Crew habitat entrance", "habitat_exterior", 2, solid=True, interaction="communicate"),
    tile("habitat_greenhouse_entrance", "Hydroponic greenhouse entrance", "habitat_exterior", 2, solid=True, interaction="communicate"),
    tile("habitat_corridor", "Pressurized corridor", "habitat_connector", 2, solid=True),
    tile("habitat_side_airlock", "Side airlock", "habitat_connector", 2, solid=True, interaction="communicate"),
    tile("habitat_power_junction", "Power and data junction", "habitat_connector", 2, solid=True, interaction="craft"),
    tile("habitat_foundation_connector", "Habitat foundation connector", "habitat_connector", 2, solid=True),
]


HABITAT_INTERIOR_TILES = [
    tile("interior_floor_crew", "Crew floor", "interior_floor", 1),
    tile("interior_floor_lab", "Laboratory floor", "interior_floor", 1),
    tile("interior_floor_engineering", "Engineering grate floor", "interior_floor", 1),
    tile("interior_floor_hydroponic", "Hydroponic floor", "interior_floor", 1),
    tile("interior_wall_bulkhead", "Clean bulkhead wall", "interior_wall", 2, solid=True),
    tile("interior_wall_lab_window", "Laboratory observation wall", "interior_wall", 2, solid=True),
    tile("interior_wall_engineering", "Engineering conduit wall", "interior_wall", 2, solid=True),
    tile("interior_wall_greenhouse", "Greenhouse glazed wall", "interior_wall", 2, solid=True),
    tile("interior_airlock", "Interior airlock", "interior_connection", 2, solid=True, interaction="communicate"),
    tile("interior_bulkhead_door", "Reinforced bulkhead door", "interior_connection", 2, solid=True, interaction="communicate"),
    tile("interior_observation_window", "Observation window", "interior_connection", 2, solid=True),
    tile("interior_corridor_junction", "Four-way corridor junction", "interior_connection", 1),
    tile("interior_sleeping_berth", "Sleeping berth", "interior_station", 2, solid=True, interaction="communicate"),
    tile("interior_lab_bench", "Laboratory workbench", "interior_station", 2, solid=True, interaction="craft"),
    tile("interior_hydroponic_planter", "Hydroponic planter", "interior_station", 2, solid=True, interaction="harvest"),
    tile("interior_command_console", "Command console", "interior_station", 2, solid=True, interaction="communicate"),
]


HARDWARE_TILES = [
    tile("cargo_supply_crate", "Sealed supply crate", "cargo", 2, solid=True),
    tile("cargo_crate_stack", "Stacked cargo crates", "cargo", 2, solid=True),
    tile("cargo_equipment_case", "Rugged equipment case", "cargo", 2, solid=True),
    tile("cargo_strapped_pallet", "Strapped cargo pallet", "cargo", 2, solid=True),
    tile("hardware_generator", "Compact power generator", "hardware", 2, solid=True, interaction="craft"),
    tile("hardware_atmosphere_processor", "Atmospheric processor", "hardware", 2, solid=True, interaction="craft"),
    tile("hardware_water_recycler", "Water recycler", "hardware", 2, solid=True, interaction="craft"),
    tile("hardware_communications_rack", "Communications rack", "hardware", 2, solid=True, interaction="communicate"),
    tile("hardware_oxygen_rack", "Oxygen cylinder rack", "storage", 2, solid=True),
    tile("hardware_liquid_tank", "Liquid storage tank", "storage", 2, solid=True),
    tile("hardware_locker_bank", "Wall locker bank", "storage", 2, solid=True),
    tile("hardware_battery_rack", "Battery and power-cell rack", "storage", 2, solid=True, interaction="craft"),
    tile("hardware_work_light", "Portable work light", "hardware", 2),
    tile("hardware_tool_cart", "Tool cart", "hardware", 2, solid=True, interaction="craft"),
    tile("hardware_hose_bundle", "Hose and cable bundle", "hardware", 2),
    tile("hardware_maintenance_robot", "Inactive maintenance robot", "hardware", 2, solid=True, interaction="communicate"),
]


SHEET_SPECS = [
    {"id": "base-biomes", "source": "base-biomes-rgba.png", "tiles": base_tiles()},
    *[
        {
            "id": f"biome-{biome_key}",
            "source": f"biome-{biome_key}-rgba.png",
            "tiles": biome_tiles(biome_key, biome_label, giant_plant),
        }
        for biome_key, biome_label, giant_plant in BIOMES
    ],
    {"id": "water-animation", "source": "water-animation-rgba.png", "tiles": WATER_TILES},
    {
        "id": "habitat-exterior",
        "source": "habitat-exterior-rgba.png",
        "tiles": HABITAT_EXTERIOR_TILES,
    },
    {"id": "habitat-interior", "source": "habitat-interior-rgba.png", "tiles": HABITAT_INTERIOR_TILES},
    {"id": "hardware-cargo", "source": "hardware-cargo-rgba.png", "tiles": HARDWARE_TILES},
    *[
        {
            "id": f"biome-transitions-{sheet_id}",
            "source": f"biome-transitions-{sheet_id}-rgba.png",
            "tiles": transition_tiles(pairs),
        }
        for sheet_id, pairs in TRANSITION_SHEETS
    ],
    {
        "id": "flora-cyan-violet-v2",
        "source": "biome-cyan-flora-rgba-v2.png",
        "frameSources": [
            *[
                {"source": "biome-cyan-flora-rgba-v2.png", "frame": frame}
                for frame in range(8)
            ],
            *[
                {"source": "biome-violet-flora-rgba-v2.png", "frame": frame}
                for frame in range(8)
            ],
        ],
        "tiles": [
            *corrected_flora_tiles("cyan", "Cyan fungal", "giant mushroom"),
            *corrected_flora_tiles("violet", "Blue-violet moss", "giant fan tree"),
        ],
    },
    {
        "id": "flora-coral-indigo-v2",
        "source": "biome-coral-flora-rgba-v2.png",
        "frameSources": [
            *[
                {"source": "biome-coral-flora-rgba-v2.png", "frame": frame}
                for frame in range(8)
            ],
            *[
                {"source": "biome-indigo-flora-rgba-v2.png", "frame": frame}
                for frame in range(8)
            ],
        ],
        "tiles": [
            *corrected_flora_tiles("coral", "Coral mineral", "giant coral tree"),
            *corrected_flora_tiles("indigo", "Indigo volcanic", "giant crystal-bark tree"),
        ],
    },
    {
        "id": "habitat-tall-entrances-v2",
        "source": "habitat-entrances-rgba-v2.png",
        "verticalEntranceSource": "habitat-entrances-rgba-v2.png",
        "tiles": tall_habitat_tiles(),
    },
]


def normalize_cell(cell: Image.Image) -> Image.Image:
    alpha = cell.getchannel("A")
    bbox = alpha.point(lambda value: 255 if value > 10 else 0).getbbox()
    if bbox is None:
        return Image.new("RGBA", (CELL_SIZE, CELL_SIZE), (0, 0, 0, 0))

    content = cell.crop(bbox)
    scale = min(CELL_SIZE / content.width, (CELL_SIZE - 2) / content.height)
    target_size = (
        max(1, round(content.width * scale)),
        max(1, round(content.height * scale)),
    )
    content = content.resize(target_size, Image.Resampling.LANCZOS)
    output = Image.new("RGBA", (CELL_SIZE, CELL_SIZE), (0, 0, 0, 0))
    output.alpha_composite(
        content,
        ((CELL_SIZE - target_size[0]) // 2, CELL_SIZE - target_size[1]),
    )
    return output


def create_ground_diamond_mask() -> Image.Image:
    """Return the exact hard-edged 64x32 footprint used by every ground tile."""
    mask = Image.new("L", (CELL_SIZE, CELL_SIZE), 0)
    draw = ImageDraw.Draw(mask)
    draw.polygon(
        [
            (CELL_SIZE // 2, GROUND_TOP),
            (CELL_SIZE - 1, GROUND_CENTER_Y),
            (CELL_SIZE // 2, CELL_SIZE - 1),
            (0, GROUND_CENTER_Y),
        ],
        fill=255,
    )
    return mask


GROUND_DIAMOND_MASK = create_ground_diamond_mask()


def normalize_ground_cell(cell: Image.Image) -> Image.Image:
    """Fit terrain to one shared diamond so adjacent frames cannot expose seams."""
    alpha = cell.getchannel("A")
    bbox = alpha.point(lambda value: 255 if value > 10 else 0).getbbox()
    if bbox is None:
        return Image.new("RGBA", (CELL_SIZE, CELL_SIZE), (0, 0, 0, 0))

    content = cell.crop(bbox).resize(
        (CELL_SIZE, CELL_SIZE - GROUND_TOP),
        Image.Resampling.LANCZOS,
    )
    output = Image.new("RGBA", (CELL_SIZE, CELL_SIZE), (0, 0, 0, 0))
    output.paste(content, (0, GROUND_TOP))
    output.putalpha(GROUND_DIAMOND_MASK)
    return output


def crop_source_cell(source: Image.Image, sheet_frame: int) -> Image.Image:
    source_cell_width = source.width / GRID_COLUMNS
    source_cell_height = source.height / GRID_ROWS
    row = sheet_frame // GRID_COLUMNS
    column = sheet_frame % GRID_COLUMNS
    return source.crop(
        (
            round(column * source_cell_width),
            round(row * source_cell_height),
            round((column + 1) * source_cell_width),
            round((row + 1) * source_cell_height),
        )
    )


def build_vertical_habitat_segments(source: Image.Image) -> dict[int, Image.Image]:
    """Slice four full entrance facades into top/middle/bottom 32px layers."""
    segments: dict[int, Image.Image] = {}
    for column in range(GRID_COLUMNS):
        full_cell = crop_source_cell(source, column)
        alpha = full_cell.getchannel("A")
        bbox = alpha.point(lambda value: 255 if value > 10 else 0).getbbox()
        if bbox is None:
            tall_facade = Image.new("RGBA", (CELL_SIZE, 96), (0, 0, 0, 0))
        else:
            tall_facade = full_cell.crop(bbox).resize(
                (CELL_SIZE, 96),
                Image.Resampling.LANCZOS,
            )

        for layer_row in range(3):
            strip = tall_facade.crop(
                (0, layer_row * 32, CELL_SIZE, (layer_row + 1) * 32)
            )
            frame = Image.new("RGBA", (CELL_SIZE, CELL_SIZE), (0, 0, 0, 0))
            frame.alpha_composite(strip, (0, GROUND_TOP))
            segments[layer_row * GRID_COLUMNS + column] = frame
    return segments


def build_transition_cell(definition: dict, sheet_frame: int) -> Image.Image:
    """Blend aligned biome bases; generated transition art never carries slab edges."""
    parts = definition["key"].split("_")
    biome_a, biome_b, direction = parts[1], parts[2], parts[3].upper()
    variant = sheet_frame % 4 + 1
    base_a = Image.open(
        INDIVIDUAL_DIR / "base-biomes" / f"base_{biome_a}_{variant:02d}.png"
    ).convert("RGBA")
    base_b = Image.open(
        INDIVIDUAL_DIR / "base-biomes" / f"base_{biome_b}_{variant:02d}.png"
    ).convert("RGBA")
    vector_x, vector_y = SCREEN_DIRECTION_VECTORS[direction]

    blend_mask = Image.new("L", (CELL_SIZE, CELL_SIZE), 0)
    pixels = blend_mask.load()
    for y in range(GROUND_TOP, CELL_SIZE):
        normalized_y = (y - GROUND_CENTER_Y) / 16.0
        for x in range(CELL_SIZE):
            if GROUND_DIAMOND_MASK.getpixel((x, y)) == 0:
                continue
            normalized_x = (x - CELL_SIZE / 2) / 32.0
            wave = math.sin((normalized_x * 3.7 + normalized_y * 2.3 + variant) * math.pi) * 0.08
            projection = vector_x * normalized_x + vector_y * normalized_y + wave
            pixels[x, y] = 255 if projection >= 0 else 0

    blend_mask = blend_mask.filter(ImageFilter.GaussianBlur(radius=2.0))
    result = Image.composite(base_b, base_a, blend_mask)
    result.putalpha(GROUND_DIAMOND_MASK)
    return result


def build_sheet(spec: dict, frame_offset: int) -> tuple[Image.Image, list[dict]]:
    source_path = SOURCE_DIR / spec["source"]
    source = Image.open(source_path).convert("RGBA")
    source_cache = {spec["source"]: source}
    alternate_source = (
        Image.open(SOURCE_DIR / spec["alternateSource"]).convert("RGBA")
        if spec.get("alternateSource")
        else None
    )
    vertical_habitat_segments = (
        build_vertical_habitat_segments(
            Image.open(SOURCE_DIR / spec["verticalEntranceSource"]).convert("RGBA")
        )
        if spec.get("verticalEntranceSource")
        else {}
    )
    sheet = Image.new("RGBA", (CELL_SIZE * GRID_COLUMNS, CELL_SIZE * GRID_ROWS), (0, 0, 0, 0))
    sheet_individual_dir = INDIVIDUAL_DIR / spec["id"]
    sheet_individual_dir.mkdir(parents=True, exist_ok=True)
    for stale_output in sheet_individual_dir.glob("*.png"):
        stale_output.unlink()
    entries: list[dict] = []

    for sheet_frame, definition in enumerate(spec["tiles"]):
        row = sheet_frame // GRID_COLUMNS
        column = sheet_frame % GRID_COLUMNS
        uses_alternate = (
            alternate_source is not None
            and sheet_frame >= spec.get("alternateStartFrame", 0)
            and sheet_frame < spec.get("alternateEndFrame", len(spec["tiles"]))
        )
        if sheet_frame in vertical_habitat_segments:
            normalized = vertical_habitat_segments[sheet_frame]
        elif definition["category"] == "biome_transition":
            normalized = build_transition_cell(definition, sheet_frame)
        else:
            source_frame = sheet_frame
            active_source = source
            if spec.get("frameSources"):
                frame_source = spec["frameSources"][sheet_frame]
                source_name = frame_source["source"]
                if source_name not in source_cache:
                    source_cache[source_name] = Image.open(
                        SOURCE_DIR / source_name
                    ).convert("RGBA")
                active_source = source_cache[source_name]
                source_frame = frame_source["frame"]
            elif uses_alternate:
                active_source = alternate_source
                source_frame = sheet_frame - spec.get("alternateFrameOffset", 0)
            crop = crop_source_cell(active_source, source_frame)
            normalized = (
                normalize_ground_cell(crop)
                if definition["category"] in {"ground", "water"}
                else normalize_cell(crop)
            )
        sheet.alpha_composite(normalized, (column * CELL_SIZE, row * CELL_SIZE))
        output_file = sheet_individual_dir / f"{definition['key']}.png"
        normalized.save(output_file, optimize=True)

        entries.append(
            {
                "frame": frame_offset + sheet_frame,
                "sheet": spec["id"],
                "sheetFrame": sheet_frame,
                "row": row,
                "column": column,
                **definition,
                "file": output_file.relative_to(PACK_DIR).as_posix(),
                "anchor": {"x": 0.5, "y": 1.0},
                "footprint": {"width": 1, "height": 1},
            }
        )

    output_path = SHEET_DIR / f"{spec['id']}-4x4.png"
    sheet.save(output_path, optimize=True)
    return sheet, entries


def build_metadata(frames_by_key: dict[str, int]) -> tuple[list[dict], list[dict], list[dict], list[dict]]:
    groups: list[dict] = []
    auto_tiles: list[dict] = []
    flora_sets: list[dict] = []

    for biome_key, biome_label, _ in BIOMES:
        groups.extend(
            [
                {
                    "id": f"{biome_key}_mountain_stack_3",
                    "name": f"{biome_label} mountain stack (3 high)",
                    "type": "vertical_stack",
                    "projection": "isometric",
                    "offsetSpace": "map",
                    "anchorFrame": frames_by_key[f"{biome_key}_mountain_base"],
                    "entries": [
                        {"frame": frames_by_key[f"{biome_key}_mountain_top"], "dx": -2, "dy": -2, "layer": "detail"},
                        {"frame": frames_by_key[f"{biome_key}_mountain_face"], "dx": -1, "dy": -1, "layer": "detail"},
                        {"frame": frames_by_key[f"{biome_key}_mountain_base"], "dx": 0, "dy": 0, "layer": "detail"},
                    ],
                    "repeatable": {"frame": frames_by_key[f"{biome_key}_mountain_face"], "axis": "up", "minimumRepeats": 1},
                },
                {
                    "id": f"{biome_key}_hill_stack_3",
                    "name": f"{biome_label} hill stack (3 high)",
                    "type": "vertical_stack",
                    "projection": "isometric",
                    "offsetSpace": "map",
                    "anchorFrame": frames_by_key[f"{biome_key}_hill_base"],
                    "entries": [
                        {"frame": frames_by_key[f"{biome_key}_hill_top"], "dx": -2, "dy": -2, "layer": "detail"},
                        {"frame": frames_by_key[f"{biome_key}_hill_face"], "dx": -1, "dy": -1, "layer": "detail"},
                        {"frame": frames_by_key[f"{biome_key}_hill_base"], "dx": 0, "dy": 0, "layer": "detail"},
                    ],
                    "repeatable": {"frame": frames_by_key[f"{biome_key}_hill_face"], "axis": "up", "minimumRepeats": 1},
                },
                {
                    "id": f"{biome_key}_giant_plant_2x2",
                    "name": f"{biome_label} legacy giant plant (2x2)",
                    "type": "tile_group",
                    "projection": "isometric",
                    "offsetSpace": "map",
                    "anchorFrame": frames_by_key[f"{biome_key}_giant_plant_03"],
                    "entries": [
                        {"frame": frames_by_key[f"{biome_key}_giant_plant_01"], "dx": 0, "dy": -1, "layer": "overhead"},
                        {"frame": frames_by_key[f"{biome_key}_giant_plant_02"], "dx": 1, "dy": -1, "layer": "overhead"},
                        {"frame": frames_by_key[f"{biome_key}_giant_plant_03"], "dx": 0, "dy": 0, "layer": "detail"},
                        {"frame": frames_by_key[f"{biome_key}_giant_plant_04"], "dx": 1, "dy": 0, "layer": "detail"},
                    ],
                    "collisionFootprint": [
                        {"dx": 0, "dy": -1},
                        {"dx": 1, "dy": -1},
                        {"dx": 0, "dy": 0},
                        {"dx": 1, "dy": 0},
                    ],
                },
                {
                    "id": f"{biome_key}_branching_giant_plant",
                    "name": f"{biome_label} branching giant plant (new)",
                    "type": "tile_group",
                    "projection": "isometric",
                    "offsetSpace": "map",
                    "anchorFrame": frames_by_key[f"{biome_key}_giant_plant_trunk"],
                    "entries": [
                        {"frame": frames_by_key[f"{biome_key}_giant_plant_left"], "dx": -2, "dy": 0, "layer": "overhead"},
                        {"frame": frames_by_key[f"{biome_key}_giant_plant_crown"], "dx": -1, "dy": -1, "layer": "overhead"},
                        {"frame": frames_by_key[f"{biome_key}_giant_plant_right"], "dx": 0, "dy": -2, "layer": "overhead"},
                        {"frame": frames_by_key[f"{biome_key}_giant_plant_trunk"], "dx": 0, "dy": 0, "layer": "detail"},
                    ],
                    "collisionFootprint": [{"dx": 0, "dy": 0}],
                },
            ]
        )
        auto_tiles.append(
            {
                "id": f"{biome_key}_plant_region",
                "name": f"{biome_label} legacy spreading plant region",
                "roles": {
                    "left": frames_by_key[f"{biome_key}_plant_region_left"],
                    "center": frames_by_key[f"{biome_key}_plant_region_center"],
                    "right": frames_by_key[f"{biome_key}_plant_region_right"],
                    "corner": frames_by_key[f"{biome_key}_plant_region_corner"],
                },
            }
        )
        flora_sets.append(
            {
                "id": f"{biome_key}_flora",
                "name": f"{biome_label} standalone flora",
                "frames": [
                    frames_by_key[f"{biome_key}_flora_{variant:02d}"]
                    for variant in range(1, 5)
                ],
            }
        )

    for module in ("command", "lab", "crew", "greenhouse"):
        groups.append(
            {
                "id": f"habitat_{module}_3_high",
                "name": f"Habitat {module} module (3 high)",
                "type": "vertical_building",
                "projection": "isometric",
                "offsetSpace": "map",
                "anchorFrame": frames_by_key[f"habitat_{module}_entrance"],
                "entries": [
                    {"frame": frames_by_key[f"habitat_{module}_roof"], "dx": -2, "dy": -2, "layer": "overhead"},
                    {"frame": frames_by_key[f"habitat_{module}_middle"], "dx": -1, "dy": -1, "layer": "overhead"},
                    {"frame": frames_by_key[f"habitat_{module}_entrance"], "dx": 0, "dy": 0, "layer": "detail"},
                ],
                "collisionFootprint": [{"dx": 0, "dy": 0}],
            }
        )
        groups.append(
            {
                "id": f"habitat_tall_{module}_3_high",
                "name": f"Habitat {module} astronaut-scale entrance (new)",
                "type": "tall_vertical_building",
                "projection": "isometric",
                "offsetSpace": "map",
                "anchorFrame": frames_by_key[f"habitat_tall_{module}_entrance"],
                "entries": [
                    {"frame": frames_by_key[f"habitat_tall_{module}_top"], "dx": -2, "dy": -2, "layer": "overhead"},
                    {"frame": frames_by_key[f"habitat_tall_{module}_middle"], "dx": -1, "dy": -1, "layer": "overhead"},
                    {"frame": frames_by_key[f"habitat_tall_{module}_entrance"], "dx": 0, "dy": 0, "layer": "detail"},
                ],
                "collisionFootprint": [{"dx": 0, "dy": 0}],
            }
        )

    animations = [
        {
            "id": "water_open_loop",
            "name": "Open luminous water",
            "frames": [frames_by_key[f"water_open_{frame}"] for frame in range(1, 5)],
            "frameDurationMs": 180,
            "repeat": -1,
        },
        {
            "id": "water_shore_straight_loop",
            "name": "Straight luminous shoreline",
            "frames": [frames_by_key[f"water_shore_straight_{frame}"] for frame in range(1, 5)],
            "frameDurationMs": 180,
            "repeat": -1,
        },
        {
            "id": "water_shore_corner_loop",
            "name": "Corner luminous shoreline",
            "frames": [frames_by_key[f"water_shore_corner_{frame}"] for frame in range(1, 5)],
            "frameDurationMs": 180,
            "repeat": -1,
        },
        {
            "id": "water_mineral_island_loop",
            "name": "Luminous mineral island",
            "frames": [frames_by_key[f"water_mineral_island_{frame}"] for frame in range(1, 5)],
            "frameDurationMs": 180,
            "repeat": -1,
        },
    ]
    return groups, auto_tiles, flora_sets, animations


def build_legacy_frame_map(frames_by_key: dict[str, int]) -> dict[str, int]:
    """Map the retired 160-frame outside sheet to close v2 equivalents."""
    mapping = {str(frame): frames_by_key["base_cyan_01"] for frame in range(160)}
    mapping.update({"0": frames_by_key["base_cyan_01"], "1": frames_by_key["base_cyan_02"]})
    mapping.update({"2": frames_by_key["base_coral_01"], "3": frames_by_key["base_coral_02"]})

    old_ground_transitions = [4, 5, 6, 10, 11, 12, 13, 14, 15, 16, 17, 20, 21, 22, 23]
    coral_directions = [
        frames_by_key[f"transition_cyan_coral_{direction.lower()}"]
        for direction in TRANSITION_DIRECTIONS
    ]
    for index, old_frame in enumerate(old_ground_transitions):
        mapping[str(old_frame)] = coral_directions[index % len(coral_directions)]

    for old_frame in (30, 31, 32, 33, 35, 36, 37, 38, 40, 41, 42, 43):
        mapping[str(old_frame)] = frames_by_key["cyan_hill_face"]
    mapping["34"] = frames_by_key["cyan_hill_top"]

    for old_frame in (50, 51, 52, 53, 56, 57, 58, 59):
        mapping[str(old_frame)] = frames_by_key["cyan_mountain_face"]
    for old_frame in (54, 55, 71, 72, 73, 74, 75, 76, 77, 78, 79):
        mapping[str(old_frame)] = frames_by_key["cyan_mountain_top"]
    for old_frame in range(60, 66):
        mapping[str(old_frame)] = frames_by_key["water_mineral_island_1"]
    for old_frame in range(66, 71):
        mapping[str(old_frame)] = frames_by_key["coral_mountain_corner"]

    for old_frame in (84, 85, 90, 91, 92, 93, 94, 95, 101):
        mapping[str(old_frame)] = frames_by_key["water_open_1"]
    for old_frame in (80, 81, 82, 83, 86, 87, 88, 89, 96, 97, 98, 99):
        mapping[str(old_frame)] = frames_by_key["water_shore_straight_1"]
    for old_frame in (100, 102):
        mapping[str(old_frame)] = frames_by_key["water_mineral_island_1"]

    plant_region_keys = (
        "cyan_plant_region_left",
        "cyan_plant_region_center",
        "cyan_plant_region_right",
        "cyan_plant_region_corner",
    )
    for index, old_frame in enumerate(range(110, 122)):
        mapping[str(old_frame)] = frames_by_key[plant_region_keys[index % 4]]
    for index, old_frame in enumerate((126, 127, 128, 129)):
        mapping[str(old_frame)] = frames_by_key[plant_region_keys[index]]

    for old_frame in (124, 125):
        mapping[str(old_frame)] = frames_by_key["hardware_hose_bundle"]
    for index, old_frame in enumerate((122, 123, 130, 131, 137, 138, 139, 142, 143, 144, 145, 146)):
        mapping[str(old_frame)] = frames_by_key[f"cyan_giant_plant_{(index % 2) + 1:02d}"]
    for index, old_frame in enumerate((132, 133, 140, 141, 147, 148, 149, 150, 151, 152, 153, 154, 155, 156, 157, 158, 159)):
        mapping[str(old_frame)] = frames_by_key[f"cyan_giant_plant_{(index % 2) + 3:02d}"]
    return mapping


def main() -> None:
    SHEET_DIR.mkdir(parents=True, exist_ok=True)
    INDIVIDUAL_DIR.mkdir(parents=True, exist_ok=True)
    combined = Image.new(
        "RGBA",
        (GRID_COLUMNS * CELL_SIZE, len(SHEET_SPECS) * GRID_ROWS * CELL_SIZE),
        (0, 0, 0, 0),
    )
    entries: list[dict] = []

    for sheet_index, spec in enumerate(SHEET_SPECS):
        sheet, sheet_entries = build_sheet(spec, sheet_index * 16)
        combined.alpha_composite(sheet, (0, sheet_index * GRID_ROWS * CELL_SIZE))
        entries.extend(sheet_entries)

    master_path = PACK_DIR / "alien-collection-v2-master.png"
    combined.save(master_path, optimize=True)
    preview_columns = 3
    preview_rows = math.ceil(len(SHEET_SPECS) / preview_columns)
    preview = Image.new(
        "RGBA",
        (
            GRID_COLUMNS * CELL_SIZE * preview_columns,
            GRID_ROWS * CELL_SIZE * preview_rows,
        ),
        (7, 13, 24, 255),
    )
    for sheet_index, spec in enumerate(SHEET_SPECS):
        sheet = Image.open(SHEET_DIR / f"{spec['id']}-4x4.png").convert("RGBA")
        preview.alpha_composite(
            sheet,
            (
                (sheet_index % preview_columns) * sheet.width,
                (sheet_index // preview_columns) * sheet.height,
            ),
        )
    preview_path = PACK_DIR / "alien-collection-v2-preview.png"
    preview.save(preview_path, optimize=True)
    frames_by_key = {entry["key"]: entry["frame"] for entry in entries}
    groups, auto_tiles, flora_sets, animations = build_metadata(frames_by_key)
    biome_transitions = []
    for _sheet_id, pairs in TRANSITION_SHEETS:
        for biome_a, biome_b in pairs:
            biome_transitions.append(
                {
                    "id": f"{biome_a}_{biome_b}",
                    "biomes": [biome_a, biome_b],
                    "frames": {
                        direction: frames_by_key[
                            f"transition_{biome_a}_{biome_b}_{direction.lower()}"
                        ]
                        for direction in TRANSITION_DIRECTIONS
                    },
                }
            )

    legacy_map_path = PACK_DIR / "previous-outside-frame-map.json"
    legacy_map_path.write_text(
        json.dumps(
            {
                "sourceTileset": "iso_outside_v1",
                "targetTileset": "alien_isometric_collection_v2",
                "sourceStoredFrameOffset": 10000,
                "targetStoredFrameOffset": 20000,
                "frames": build_legacy_frame_map(frames_by_key),
            },
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )

    manifest = {
        "id": "alien_isometric_collection_v2",
        "storedFrameOffset": 20000,
        "previousStoredFrameOffset": 10000,
        "source": master_path.name,
        "preview": preview_path.name,
        "sourceSize": {"width": combined.width, "height": combined.height},
        "grid": {
            "frameWidth": CELL_SIZE,
            "frameHeight": CELL_SIZE,
            "columns": GRID_COLUMNS,
            "rows": len(SHEET_SPECS) * GRID_ROWS,
        },
        "projection": {"type": "isometric", "diamondWidth": 64, "diamondHeight": 32},
        "sheets": [
            {"id": spec["id"], "file": f"sheets/{spec['id']}-4x4.png", "frameOffset": index * 16}
            for index, spec in enumerate(SHEET_SPECS)
        ],
        "frames": entries,
        "biomes": [
            {
                "id": biome_key,
                "label": biome_label,
                "baseFrames": [frames_by_key[f"base_{biome_key}_{variant:02d}"] for variant in range(1, 5)],
                "mountainGroup": f"{biome_key}_mountain_stack_3",
                "hillGroup": f"{biome_key}_hill_stack_3",
                "giantPlantGroup": f"{biome_key}_branching_giant_plant",
                "floraSet": f"{biome_key}_flora",
            }
            for biome_key, biome_label, _giant_plant in BIOMES
        ],
        "biomeTransitions": biome_transitions,
        "groups": groups,
        "autoTileSets": auto_tiles,
        "floraSets": flora_sets,
        "proceduralHabitatGroups": [
            f"habitat_tall_{module}_3_high"
            for module in ("command", "lab", "crew", "greenhouse")
        ],
        "animations": animations,
    }
    manifest_path = PACK_DIR / "alien-collection-v2-manifest.json"
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {master_path}")
    print(f"Wrote {preview_path}")
    print(f"Wrote {legacy_map_path}")
    print(f"Wrote {len(entries)} tiles, {len(groups)} groups, and {len(animations)} animations")


if __name__ == "__main__":
    main()
