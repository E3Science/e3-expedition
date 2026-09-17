#!/usr/bin/env python3
"""Normalize the generated alien inventory concept into game-ready icons."""

from __future__ import annotations

import json
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
ASSET_DIR = ROOT / "public" / "assets" / "ui" / "inventory"
SOURCE = ASSET_DIR / "alien-inventory-sheet-transparent.png"
SHEET = ASSET_DIR / "alien-inventory-sheet.png"
CELL_SIZE = 64
ICON_MAX_SIZE = 56
ITEMS = [
    ("rock_sample", "Rock Sample"),
    ("water_sample", "Water Sample"),
    ("plant_sample", "Plant Sample"),
    ("mission_badge", "Mission Badge"),
    ("herbivore_specimen", "Herbivore Specimen"),
    ("habitat_component", "Habitat Component"),
]


def fit_icon(source: Image.Image) -> Image.Image:
    alpha_box = source.getchannel("A").getbbox()
    output = Image.new("RGBA", (CELL_SIZE, CELL_SIZE), (0, 0, 0, 0))
    if not alpha_box:
        return output
    trimmed = source.crop(alpha_box)
    scale = min(ICON_MAX_SIZE / trimmed.width, ICON_MAX_SIZE / trimmed.height)
    size = (
        max(1, round(trimmed.width * scale)),
        max(1, round(trimmed.height * scale)),
    )
    resized = trimmed.resize(size, Image.Resampling.LANCZOS)
    output.alpha_composite(
        resized,
        ((CELL_SIZE - size[0]) // 2, (CELL_SIZE - size[1]) // 2),
    )
    return output


def main() -> None:
    ASSET_DIR.mkdir(parents=True, exist_ok=True)
    source = Image.open(SOURCE).convert("RGBA")
    sheet = Image.new("RGBA", (CELL_SIZE * 3, CELL_SIZE * 2), (0, 0, 0, 0))
    manifest = {
        "source": SHEET.name,
        "frameWidth": CELL_SIZE,
        "frameHeight": CELL_SIZE,
        "columns": 3,
        "rows": 2,
        "items": [],
    }

    for index, (key, label) in enumerate(ITEMS):
        column = index % 3
        row = index // 3
        left = round(column * source.width / 3)
        right = round((column + 1) * source.width / 3)
        top = round(row * source.height / 2)
        bottom = round((row + 1) * source.height / 2)
        icon = fit_icon(source.crop((left, top, right, bottom)))
        sheet.alpha_composite(icon, (column * CELL_SIZE, row * CELL_SIZE))
        icon_path = ASSET_DIR / f"{key}.png"
        icon.save(icon_path)
        manifest["items"].append(
            {
                "key": key,
                "label": label,
                "frame": index,
                "file": icon_path.name,
            }
        )

    sheet.save(SHEET)
    (ASSET_DIR / "alien-inventory-sheet.json").write_text(
        json.dumps(manifest, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"Wrote {SHEET} and {len(ITEMS)} transparent 64x64 inventory icons.")


if __name__ == "__main__":
    main()
