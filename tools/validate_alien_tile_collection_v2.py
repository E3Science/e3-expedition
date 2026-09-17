#!/usr/bin/env python3
"""Validate the generated alien isometric collection v2."""

from __future__ import annotations

import json
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
PACK_DIR = ROOT / "public" / "assets" / "tiles" / "isometric" / "alien-expansion" / "collection-v2"


def check_image(path: Path, expected_size: tuple[int, int]) -> None:
    with Image.open(path) as image:
        assert image.size == expected_size, f"{path}: expected {expected_size}, got {image.size}"
        assert image.mode == "RGBA", f"{path}: expected RGBA, got {image.mode}"


def main() -> None:
    manifest = json.loads((PACK_DIR / "alien-collection-v2-manifest.json").read_text(encoding="utf-8"))
    frames = manifest["frames"]
    frame_ids = {entry["frame"] for entry in frames}
    frame_keys = {entry["key"] for entry in frames}

    logical_count = manifest["logicalFrameCount"]
    assert len(frames) == logical_count
    assert frame_ids == set(range(logical_count))
    assert len(frame_keys) == logical_count
    assert len(manifest["sheets"]) == 15
    assert len(manifest["groups"]) >= 31
    assert len(manifest["autoTileSets"]) == 4
    assert len(manifest["floraSets"]) == 4
    assert len(manifest["animations"]) >= 8
    assert len(manifest["biomes"]) == 4
    assert len(manifest["biomeTransitions"]) == 6

    check_image(PACK_DIR / manifest["source"], (640, 3840))
    check_image(PACK_DIR / manifest["preview"], (768, 1280))

    frames_by_key = {entry["key"]: entry["frame"] for entry in frames}
    assert frames_by_key["cyan_giant_plant_01"] == 24
    assert frames_by_key["coral_plant_region_corner"] == 63
    assert frames_by_key["habitat_command_roof"] == 96
    assert frames_by_key["habitat_foundation_connector"] == 111
    assert min(frames_by_key[key] for key in frame_keys if key.startswith("habitat_tall_")) >= 224

    for sheet in manifest["sheets"]:
        check_image(PACK_DIR / sheet["file"], (256, 256))

    texture_frames = {entry["textureFrame"] for entry in frames}
    assert len(texture_frames) == len(frames)
    assert all(0 <= frame < manifest["grid"]["columns"] * manifest["grid"]["rows"] for frame in texture_frames)

    for entry in frames[:240]:
        tile_path = PACK_DIR / entry["file"]
        check_image(tile_path, (64, 64))
        with Image.open(tile_path) as image:
            alpha_min, alpha_max = image.getchannel("A").getextrema()
            assert alpha_min == 0 and alpha_max > 0, f"{tile_path}: invalid transparency/content"
            if entry["category"] in {"ground", "water", "biome_transition"}:
                assert image.getchannel("A").getbbox() == (0, 32, 64, 64), (
                    f"{tile_path}: ground footprint is not aligned"
                )

    for group in manifest["groups"]:
        assert all(entry["frame"] in frame_ids for entry in group["entries"]), group["id"]
        if group["type"] in {"vertical_building", "tall_vertical_building"} and len(group["entries"]) == 3:
            assert [entry["layer"] for entry in group["entries"]] == ["overhead", "overhead", "detail"], group["id"]
        if repeatable := group.get("repeatable"):
            assert repeatable["frame"] in frame_ids, group["id"]

    for flora_set in manifest["floraSets"]:
        assert len(flora_set["frames"]) == 4, flora_set["id"]
        assert all(frame in frame_ids for frame in flora_set["frames"]), flora_set["id"]

    for auto_tiles in manifest["autoTileSets"]:
        assert all(frame in frame_ids for frame in auto_tiles["roles"].values()), auto_tiles["id"]

    for animation in manifest["animations"]:
        assert len(animation["frames"]) == 4, animation["id"]
        assert all(frame in frame_ids for frame in animation["frames"]), animation["id"]

    transition_frames = {
        frame
        for transition in manifest["biomeTransitions"]
        for frame in transition["frames"].values()
    }
    assert len(transition_frames) == 48
    assert all(frame in frame_ids for frame in transition_frames)

    previous_map = json.loads(
        (PACK_DIR / "previous-outside-frame-map.json").read_text(encoding="utf-8")
    )
    assert len(previous_map["frames"]) == 160
    assert all(int(frame) in frame_ids for frame in previous_map["frames"].values())

    print(
        f"Validated {logical_count} logical tiles, 15 legacy sheets, "
        f"{len(manifest['groups'])} groups, 6 biome transitions, and "
        f"{len(manifest['animations'])} animations."
    )


if __name__ == "__main__":
    main()
