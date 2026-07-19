from pathlib import Path

from PIL import Image


IMAGE_ROOT = Path("images")
OUTPUT_ROOT = IMAGE_ROOT / "optimized"
SPECS = {
    "units": {"max_size": (900, 1200), "quality": 82},
    "icons": {"max_size": (256, 256), "quality": 82},
    "traits": {"max_size": (256, 256), "quality": 82},
}


def optimize_folder(folder, max_size, quality):
    source_dir = IMAGE_ROOT / folder
    output_dir = OUTPUT_ROOT / folder
    output_dir.mkdir(parents=True, exist_ok=True)
    created = 0
    skipped = 0

    for source in source_dir.glob("*.png"):
        destination = output_dir / f"{source.stem}.webp"
        if destination.exists() and destination.stat().st_mtime >= source.stat().st_mtime:
            skipped += 1
            continue

        with Image.open(source) as image:
            image.load()
            image.thumbnail(max_size, Image.Resampling.LANCZOS)
            if image.mode not in ("RGB", "RGBA"):
                image = image.convert("RGBA")
            image.save(destination, "WEBP", quality=quality, method=6)
        created += 1

    return created, skipped


def main():
    total_created = 0
    total_skipped = 0
    for folder, spec in SPECS.items():
        created, skipped = optimize_folder(folder, **spec)
        total_created += created
        total_skipped += skipped
        print(f"{folder}: {created} optimized, {skipped} current")
    print(f"total: {total_created} optimized, {total_skipped} current")


if __name__ == "__main__":
    main()
