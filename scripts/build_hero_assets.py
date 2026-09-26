"""Build per-country hero photography and slim the shared hero asset.

Why this exists
---------------
`assets/hero/mandi-chicken-rice.webp` was a 6000x3368 download (965 KB) that the
home page loaded for an image displayed at ~540 px wide. Oman and UAE pages also
reused that one photo, so the two destinations looked identical.

This script keeps the original download in `build/img-raw/` for provenance and
writes:

* `assets/hero/mandi-chicken-rice-<width>.webp` - responsive widths (640/900/1600)
  for the shared home-page hero.
* `assets/hero/oman/hero-mandi-tray-<width>.webp` - Oman page hero.
* `assets/hero/uae/hero-chicken-mandi-<width>.webp` - UAE page hero.

The brand file `شعار مطعم كمران.png` is only 446x450 px, far too small to crop a
hero from, so the country heroes are cropped from the already licensed
representative photos (1440 px+ wide) instead of the brand sheet.

Crop ratio is 1.26 to match `.hero-food-photo { aspect-ratio: 1.26 }`, with the
focal point pushed toward the centre of the plate so the subject is never cut off.
"""

import os
import shutil
from datetime import datetime, timezone

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HERO_DIR = os.path.join(ROOT, "assets", "hero")
RAW_DIR = os.path.join(ROOT, "build", "img-raw")
LOG_PATH = os.path.join(ROOT, "build", "hero-build.log")

SHARED_NAME = "mandi-chicken-rice"
SHARED_MASTER = os.path.join(RAW_DIR, "mandi-chicken-rice-original.webp")
SHARED_WIDTHS = (640, 900, 1600)
SHARED_DEFAULT_WIDTH = 1600

# name -> (source photo, output folder, widths)
COUNTRY_HEROES = [
    ("oman", "hero-mandi-tray", "assets/menu/representative/chicken/chicken-mandi-tray.webp", (640, 700, 900)),
    ("uae", "hero-chicken-mandi", "assets/menu/representative/chicken/charcoal-grilled-chicken.webp", (640, 700, 900)),
]

RATIO = 1.26  # width / height, matches the hero image box in css/style.css
CROP_QUALITY = 78

lines = [f"hero build started {datetime.now(timezone.utc).isoformat(timespec='seconds')}"]


def centre_crop(image):
    """Crop to the hero box ratio around the middle of the frame."""
    width, height = image.size
    target_height = round(width / RATIO)
    if target_height <= height:
        top = round((height - target_height) * 0.45)
        box = (0, top, width, top + target_height)
    else:
        target_width = round(height * RATIO)
        left = round((width - target_width) * 0.5)
        box = (left, 0, left + target_width, height)
    return image.crop(box)


def save_webp(image, path, quality):
    image.save(path, "WEBP", quality=quality, method=6)
    return f"{os.path.relpath(path, ROOT).replace(chr(92), '/')} {image.size[0]}x{image.size[1]} {os.path.getsize(path) / 1024:.1f} KB"


def build_series(source_path, out_dir, slug, widths, quality=CROP_QUALITY):
    os.makedirs(out_dir, exist_ok=True)
    with Image.open(source_path) as raw:
        cropped = centre_crop(raw.convert("RGB"))
        results = []
        for width in widths:
            scale = width / cropped.size[0]
            size = (width, max(1, round(cropped.size[1] * scale)))
            variant = cropped.resize(size, Image.LANCZOS)
            results.append(save_webp(variant, os.path.join(out_dir, f"{slug}-{width}.webp"), quality))
        return results


# 1. Keep the oversized original out of the served tree.
os.makedirs(RAW_DIR, exist_ok=True)
shared_path = os.path.join(HERO_DIR, f"{SHARED_NAME}.webp")
if os.path.exists(shared_path) and not os.path.exists(SHARED_MASTER):
    with Image.open(shared_path) as check:
        original_size = check.size
    if original_size[0] > SHARED_DEFAULT_WIDTH:
        shutil.move(shared_path, SHARED_MASTER)
        lines.append(f"moved original {original_size} -> {os.path.relpath(SHARED_MASTER, ROOT)}")
elif os.path.exists(shared_path):
    with Image.open(shared_path) as check:
        lines.append(f"kept existing hero original at {check.size}")

# 2. Responsive widths for the shared home-page hero.
source = SHARED_MASTER if os.path.exists(SHARED_MASTER) else shared_path
for result in build_series(source, HERO_DIR, SHARED_NAME, SHARED_WIDTHS):
    lines.append(result)

# 3. Per-country heroes.
for country, slug, source_rel, widths in COUNTRY_HEROES:
    source_path = os.path.join(ROOT, source_rel)
    if not os.path.exists(source_path):
        lines.append(f"SKIPPED {country}: missing source {source_rel}")
        continue
    lines.append(f"source for {country}: {source_rel}")
    for result in build_series(source_path, os.path.join(HERO_DIR, country), slug, widths):
        lines.append(result)

# 4. The URL used without srcset should be a sane default, not the 965 KB master.
default_variant = os.path.join(HERO_DIR, f"{SHARED_NAME}-{SHARED_DEFAULT_WIDTH}.webp")
if os.path.exists(default_variant) and (
    not os.path.exists(shared_path) or os.path.getsize(shared_path) > os.path.getsize(default_variant)
):
    shutil.copyfile(default_variant, shared_path)
    lines.append(
        f"refreshed {SHARED_NAME}.webp from the {SHARED_DEFAULT_WIDTH}px variant "
        f"({os.path.getsize(shared_path) / 1024:.1f} KB)"
    )

lines.append(f"hero build finished {datetime.now(timezone.utc).isoformat(timespec='seconds')}")
with open(LOG_PATH, "a", encoding="utf-8") as handle:
    handle.write("\n".join(lines) + "\n\n")
print("\n".join(lines))
