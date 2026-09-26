"""Build the icon family and web app manifest for Kamran Restaurant.

Everything is derived from the restaurant's own logo file so the brand mark stays
consistent. Icons are composited onto the brand navy background because iOS
renders transparent `apple-touch-icon` edges black. The maskable 512 px icon keeps
the mark inside the 60 % safe zone required by Android launchers.

Outputs
-------
assets/logo/favicon-48.png    (48, opaque, standard tab icon)
assets/logo/favicon-192.png   (192, opaque)
assets/logo/favicon-512.png   (512, opaque, declared maskable)
assets/logo/apple-touch-icon.png (180, opaque)
assets/logo/favicon.svg       (hand-authored vector mark, no font/text dependency)
manifest.webmanifest          (standalone, RTL, Arabic-first)

A build log with sizes and alpha statistics is appended to build/favicon-build.log.
"""

import json
import os
from datetime import datetime, timezone

from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LOGO_DIR = os.path.join(ROOT, "assets", "logo")
LOG_PATH = os.path.join(ROOT, "build", "favicon-build.log")

SOURCE = os.path.join(ROOT, "شعار مطعم كمران.png")
NAVY = "#102c45"
GOLD = "#bd9552"
CREAM = "#f3efe6"

# (output name, size, scale of the mark relative to the canvas)
TARGETS = [
    ("favicon-48.png", 48, 0.92),
    ("favicon-192.png", 192, 0.92),
    ("favicon-512.png", 512, 0.62),
    ("apple-touch-icon.png", 180, 0.92),
]

SVG = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" role="img" aria-label="Kamran Mandi Restaurant">
  <rect width="48" height="48" rx="9" fill="{NAVY}"/>
  <g stroke="{GOLD}" stroke-width="1.7" stroke-linecap="round" fill="none" opacity="0.9">
    <path d="M18.5 15.5c0-2.4 2.2-2.6 2.2-5"/>
    <path d="M24 14.6c0-2.6 2.2-2.8 2.2-5.4"/>
    <path d="M29.5 15.5c0-2.4 2.2-2.6 2.2-5"/>
  </g>
  <ellipse cx="24" cy="31.5" rx="14" ry="8.6" fill="{CREAM}"/>
  <ellipse cx="24" cy="30.8" rx="9" ry="5.4" fill="{GOLD}"/>
  <circle cx="24" cy="25.4" r="5.1" fill="#d9b56d"/>
</svg>
"""

MANIFEST = {
    "name": "مطعم كمران للمندي | Kamran Mandi Restaurant",
    "short_name": "كمران",
    "description": "قائمة ومعلومات مطاعم كمران للمندي في عُمان والإمارات.",
    "lang": "ar",
    "dir": "rtl",
    "start_url": "./index.html",
    "scope": "./",
    "display": "standalone",
    "orientation": "portrait",
    "background_color": CREAM,
    "theme_color": NAVY,
    "categories": ["food", "restaurants"],
    "icons": [
        {"src": "assets/logo/favicon-48.png", "sizes": "48x48", "type": "image/png", "purpose": "any"},
        {"src": "assets/logo/favicon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any"},
        {"src": "assets/logo/favicon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any"},
        {"src": "assets/logo/favicon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable"},
    ],
}

lines = [f"favicon build started {datetime.now(timezone.utc).isoformat(timespec='seconds')}"]

if not os.path.exists(SOURCE):
    raise SystemExit(f"brand logo not found: {SOURCE}")

os.makedirs(LOGO_DIR, exist_ok=True)

with Image.open(SOURCE) as raw:
    source = raw.convert("RGBA")
    lines.append(f"source logo: {source.size[0]}x{source.size[1]} alpha_min={source.getchannel('A').getextremes()[0]}")

for name, size, scale in TARGETS:
    canvas = Image.new("RGBA", (size, size), NAVY)
    mark_size = max(1, round(size * scale))
    mark = source.copy()
    mark.thumbnail((mark_size, mark_size), Image.LANCZOS)
    canvas.paste(mark, ((size - mark.size[0]) // 2, (size - mark.size[1]) // 2), mark)
    flat = canvas.convert("RGB")
    path = os.path.join(LOGO_DIR, name)
    flat.save(path, "PNG", optimize=True)
    lines.append(f"{name} {size}x{size} opaque {os.path.getsize(path) / 1024:.1f} KB")

svg_path = os.path.join(LOGO_DIR, "favicon.svg")
with open(svg_path, "w", encoding="utf-8") as handle:
    handle.write(SVG)
lines.append(f"favicon.svg written ({os.path.getsize(svg_path)} bytes, vector, no text dependency)")

# Sanity check on the maskable safe zone: nothing brand-critical outside the centre 60 %.
with Image.open(os.path.join(LOGO_DIR, "favicon-512.png")) as maskable:
    maskable.load()
    edge = maskable.crop((0, 0, 512, 103))
    edge_colors = edge.convert("RGB").getcolors(maxcolors=1)
    lines.append(f"maskable top safe-zone uniform: {edge_colors is not None}")

manifest_path = os.path.join(ROOT, "manifest.webmanifest")
with open(manifest_path, "w", encoding="utf-8") as handle:
    json.dump(MANIFEST, handle, ensure_ascii=False, indent=2)
    handle.write("\n")
lines.append(f"manifest.webmanifest written ({len(MANIFEST['icons'])} icons, dir={MANIFEST['dir']}, theme={NAVY})")

lines.append(f"favicon build finished {datetime.now(timezone.utc).isoformat(timespec='seconds')}")
with open(LOG_PATH, "a", encoding="utf-8") as handle:
    handle.write("\n".join(lines) + "\n\n")
print("\n".join(lines))
