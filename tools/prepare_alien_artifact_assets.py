from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE_ROOT = ROOT / "public" / "assets" / "source" / "imagegen" / "alien-artifact"


def trim_and_fit(source: Path, destination: Path, size: tuple[int, int], padding: int) -> None:
    image = Image.open(source).convert("RGBA")
    alpha = image.getchannel("A")
    bounds = alpha.getbbox()
    if not bounds:
        raise RuntimeError(f"No visible pixels found in {source}")

    left, top, right, bottom = bounds
    left = max(0, left - padding)
    top = max(0, top - padding)
    right = min(image.width, right + padding)
    bottom = min(image.height, bottom + padding)
    trimmed = image.crop((left, top, right, bottom))

    scale = min(size[0] / trimmed.width, size[1] / trimmed.height)
    resized_size = (
        max(1, round(trimmed.width * scale)),
        max(1, round(trimmed.height * scale)),
    )
    resized = trimmed.resize(resized_size, Image.Resampling.NEAREST)
    output = Image.new("RGBA", size, (0, 0, 0, 0))
    output.alpha_composite(
        resized,
        ((size[0] - resized.width) // 2, (size[1] - resized.height) // 2),
    )
    destination.parent.mkdir(parents=True, exist_ok=True)
    output.save(destination, optimize=True)


def main() -> None:
    trim_and_fit(
        SOURCE_ROOT / "alien-artifact-inventory-transparent.png",
        ROOT / "public" / "assets" / "ui" / "inventory" / "alien_artifact.png",
        (96, 96),
        12,
    )
    trim_and_fit(
        SOURCE_ROOT / "alien-artifact-event-transparent.png",
        ROOT / "public" / "assets" / "events" / "alien-artifact" / "alien-artifact-event.png",
        (384, 384),
        20,
    )


if __name__ == "__main__":
    main()
