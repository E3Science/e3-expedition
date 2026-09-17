"""Build a visual best-match map from the 16 px legacy sheet to ISO frames."""

from __future__ import annotations

import argparse
import colorsys
import json
from pathlib import Path

from PIL import Image, ImageStat


def average_rgb(image: Image.Image) -> tuple[float, float, float]:
    rgba = image.convert("RGBA")
    alpha = rgba.getchannel("A")
    if alpha.getbbox() is None:
        return 0.0, 0.0, 0.0
    return tuple(ImageStat.Stat(rgba.convert("RGB"), mask=alpha).mean)


def color_features(rgb: tuple[float, float, float]) -> tuple[float, float, float]:
    red, green, blue = (value / 255 for value in rgb)
    hue, saturation, value = colorsys.rgb_to_hsv(red, green, blue)
    return hue, saturation, value


def distance(left: tuple[float, float, float], right: tuple[float, float, float]) -> float:
    lh, ls, lv = color_features(left)
    rh, rs, rv = color_features(right)
    hue_delta = min(abs(lh - rh), 1 - abs(lh - rh))
    return hue_delta * 2.2 + abs(ls - rs) * 0.8 + abs(lv - rv) * 1.25


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("legacy", type=Path)
    parser.add_argument("isometric", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()

    legacy = Image.open(args.legacy).convert("RGBA")
    iso = Image.open(args.isometric).convert("RGBA")

    # Ground, slopes, rock/cliff, and water cells. Decorative vegetation rows
    # are deliberately excluded from automatic legacy conversion.
    candidate_frames = [
        frame
        for frame in range(110)
        if iso.crop(
            (
                (frame % 10) * 64,
                (frame // 10) * 64,
                (frame % 10 + 1) * 64,
                (frame // 10 + 1) * 64,
            )
        ).getchannel("A").getbbox()
    ]
    candidate_colors = {
        frame: average_rgb(
            iso.crop(
                (
                    (frame % 10) * 64,
                    (frame // 10) * 64,
                    (frame % 10 + 1) * 64,
                    (frame // 10 + 1) * 64,
                )
            )
        )
        for frame in candidate_frames
    }

    columns = legacy.width // 16
    rows = legacy.height // 16
    frame_map: dict[str, int] = {}
    for row in range(rows):
        for column in range(columns):
            frame = row * columns + column
            crop = legacy.crop(
                (column * 16, row * 16, (column + 1) * 16, (row + 1) * 16)
            )
            if crop.getchannel("A").getbbox() is None:
                frame_map[str(frame)] = 0
                continue
            legacy_color = average_rgb(crop)
            frame_map[str(frame)] = min(
                candidate_frames,
                key=lambda candidate: distance(legacy_color, candidate_colors[candidate]),
            )

    payload = {
        "legacyFrameSize": 16,
        "isometricFrameSize": 64,
        "strategy": "nearest visible HSV terrain frame",
        "frames": frame_map,
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {len(frame_map)} frame mappings to {args.output}")


if __name__ == "__main__":
    main()
