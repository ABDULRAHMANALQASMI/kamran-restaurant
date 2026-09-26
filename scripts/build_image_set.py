"""Phase 6 image build.

1. Normalize freshly downloaded Pexels JPEGs into assets/menu/representative/
   (consistent 3:2 crop, WebP, never upscaled).
2. Rebuild assets/menu/thumbs/ (500 px 3:2 cards) for every representative
   image so menu cards never download full-size artwork.
3. Build responsive hero variants (assets/hero/*-1600/-900/-640.webp).
4. Build favicon / apple-touch-icon from the supplied brand mark.

Run:  python scripts/build_image_set.py
"""
from __future__ import annotations

import json
import os
from PIL import Image, ImageOps

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = os.path.join(ROOT, "build", "img-raw")
REP = os.path.join(ROOT, "assets", "menu", "representative")
THUMBS = os.path.join(ROOT, "assets", "menu", "thumbs")
HERO = os.path.join(ROOT, "assets", "hero")
LOGO = os.path.join(ROOT, "assets", "logo")
RATIO = 3 / 2

report: dict = {"normalized": [], "thumbs": 0, "warnings": [], "hero": [], "icons": []}


def cover_crop(img: Image.Image, ratio: float = RATIO) -> Image.Image:
    """Center-crop to `ratio` (landscape) without changing pixels otherwise."""
    w, h = img.size
    current = w / h
    if abs(current - ratio) < 0.01:
        return img
    if current > ratio:  # too wide -> trim sides
        new_w = int(round(h * ratio))
        left = (w - new_w) // 2
        return img.crop((left, 0, left + new_w, h))
    new_h = int(round(w / ratio))
    top = int(round((h - new_h) * 0.42))  # favour the upper-middle where food sits
    return img.crop((0, top, w, top + new_h))


def fit(img: Image.Image, max_w: int, max_h: int) -> Image.Image:
    """Downscale only; never enlarge (avoids introducing blur)."""
    w, h = img.size
    scale = min(max_w / w, max_h / h, 1.0)
    if scale >= 1.0:
        return img
    return img.resize((max(1, int(round(w * scale))), max(1, int(round(h * scale)))), Image.LANCZOS)


def save(img: Image.Image, dest: str, quality: int) -> int:
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    img.save(dest, "WEBP", quality=quality, method=6)
    return os.path.getsize(dest)


# 1 --------------------------------------------------------------- normalize
manifest = json.load(open(os.path.join(ROOT, "scripts", "image-manifest.json"), encoding="utf-8"))
for entry in manifest:
    src = os.path.join(RAW, f"{entry['id']}.jpg")
    dest = os.path.join(ROOT, "assets", "menu", "representative", entry["target"].replace("/", os.sep))
    if not os.path.exists(src):
        report["warnings"].append(f"missing raw download for {entry['id']} ({entry['target']})")
        continue
    with Image.open(src) as im:
        im = ImageOps.exif_transpose(im).convert("RGB")
        full = save(fit(cover_crop(im), 900, 600), dest, 78)
    report["normalized"].append(
        {"target": entry["target"], "photoId": entry["id"], "alt": entry["alt"],
         "size": list(Image.open(dest).size), "bytes": full}
    )

# 2 --------------------------------------------------------------- thumbnails
for folder, _dirs, files in os.walk(REP):
    for name in sorted(files):
        if not name.endswith(".webp"):
            continue
        src = os.path.join(folder, name)
        rel = os.path.relpath(src, REP)
        dest = os.path.join(THUMBS, rel)
        with Image.open(src) as im:
            thumb_img = fit(cover_crop(im.convert("RGB")), 500, 334)
        save(thumb_img, dest, 72)
        report["thumbs"] += 1

# 3 ------------------------------------------------------------------- hero
hero_src = os.path.join(HERO, "mandi-chicken-rice.webp")
if os.path.exists(hero_src):
    with Image.open(hero_src) as im:
        base = im.convert("RGB")
    for width in (1600, 900, 640):
        dest = os.path.join(HERO, f"mandi-chicken-rice-{width}.webp")
        img = fit(cover_crop(base, 16 / 9 if width == 1600 else 16 / 10), width, 10000)
        report["hero"].append({"file": os.path.basename(dest), "size": list(img.size),
                               "bytes": save(img, dest, 76)})

# 4 ------------------------------------------------------------------ icons
brand = None
for candidate in os.listdir(ROOT):
    if candidate.lower().endswith(".png") and ("logo" in candidate.lower() or "\u0634\u0639\u0627\u0631" in candidate):
        brand = os.path.join(ROOT, candidate)
        break
if brand:
    with Image.open(brand) as im:
        im = ImageOps.exif_transpose(im).convert("RGBA")
        square = ImageOps.center_crop(im, (min(im.size), min(im.size))) if hasattr(ImageOps, "center_crop") else im.crop(
            ((im.width - min(im.size)) // 2, (im.height - min(im.size)) // 2,
             (im.width - min(im.size)) // 2 + min(im.size), (im.height - min(im.size)) // 2 + min(im.size)))
        for size, name in ((192, "favicon-192.png"), (48, "favicon-48.png"), (180, "apple-touch-icon.png")):
            os.makedirs(LOGO, exist_ok=True)
            out = square.resize((size, size), Image.LANCZOS)
            path = os.path.join(LOGO, name)
            out.save(path, "PNG", optimize=True)
            report["icons"].append({"file": f"assets/logo/{name}", "px": size, "bytes": os.path.getsize(path)})
else:
    report["warnings"].append("brand mark PNG not found; favicons not generated")

total_bytes = sum(x["bytes"] for x in report["normalized"])
report["normalized_bytes"] = total_bytes
os.makedirs(os.path.join(ROOT, "build"), exist_ok=True)
json.dump(report, open(os.path.join(ROOT, "build", "image-build-report.json"), "w", encoding="utf-8"),
          indent=2, ensure_ascii=False)
print(f"normalized {len(report['normalized'])} images ({total_bytes/1024:.0f} KB), "
      f"thumbs {report['thumbs']}, hero {len(report['hero'])}, icons {len(report['icons'])}")
for warning in report["warnings"]:
    print("  WARN:", warning)
