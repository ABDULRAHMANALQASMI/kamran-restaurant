"""Temporary state audit: report what is wired vs missing."""
import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
out = []


def sec(title):
    out.append("\n===== " + title + " =====")


def rep(path):
    p = os.path.join(ROOT, path)
    if not os.path.exists(p):
        return None
    return open(p, encoding="utf-8", errors="replace").read()


sec("image build logs")
for log in ("build/image-fetch-build.log", "build/image-build.log", "build/hero-build.log"):
    p = os.path.join(ROOT, log)
    out.append(f"-- {log}: " + ("MISSING" if not os.path.exists(p) else "exists"))
    if os.path.exists(p):
        lines = rep(log).splitlines()
        out.extend(lines[-6:])

sec("asset inventory")
for folder in ("assets/menu/representative", "assets/menu/thumbs", "assets/hero", "assets/hero/oman", "assets/hero/uae", "assets/logo"):
    d = os.path.join(ROOT, folder)
    if not os.path.isdir(d):
        out.append(f"{folder}: MISSING DIR")
        continue
    files = [f for f in sorted(os.listdir(d)) if os.path.isfile(os.path.join(d, f))]
    total = sum(os.path.getsize(os.path.join(d, f)) for f in files)
    out.append(f"{folder}: {len(files)} files, {total/1024:.0f} KB")
    if len(files) <= 14:
        for f in files:
            out.append("    " + f + f" ({os.path.getsize(os.path.join(d, f))/1024:.1f} KB)")

sec("index.html markers")
html = rep("index.html") or ""
for marker in ("apple-touch-icon", "imagesrcset", "hero-oman", "hero-uae", "destination", "js/menu.js",
               "preload", "menu-image", "loading=\"lazy\"", "sizes="):
    out.append(f"  {marker!r}: {html.count(marker)}")
out.append("  head (first 45 lines):")
out.extend("    " + ln for ln in html.splitlines()[:45])

sec("js/app.js markers")
appjs = rep("js/app.js") or ""
out.append(f"  length: {len(appjs)} chars, {appjs.count(chr(10))} lines")
for marker in ("representative", "menu/thumbs", "thumb", "hero-oman", "destinationCard", "menuImage", "imageSource"):
    out.append(f"  {marker!r}: {appjs.count(marker)}")

sec("data files: image paths in use")
for f in ("data/oman-menu-phase5.js", "data/uae-menu-phase5.js"):
    src = rep(f) or ""
    paths = set(re.findall(r"image:\s*'([^']+)'", src))
    out.append(f"  {f}: {len(paths)} distinct override images")
    out.append("    thumbs: " + str(sum(1 for p in paths if "thumbs" in p)))
    out.append("    representative: " + str(sum(1 for p in paths if "representative" in p)))
    out.append("    other: " + str(sorted(p for p in paths if "representative" not in p and "thumbs" not in p)))

sec("menu item counts")
for f in ("data/oman-menu-phase5.js", "data/uae-menu-phase5.js"):
    src = rep(f) or ""
    out.append(f"  {f}: rows={len(re.findall(r'^\s+\[', src, re.M))}")

sec("manifest / map artifacts")
for f in ("scripts/image-manifest.json", "scripts/image-map.txt", "scripts/phase6-mapping.json",
          "scripts/apply-phase6-images.js", "scripts/hero-build.log", "scripts/build_hero_assets.py",
          "scripts/list-override-keys.js", "build/override-keys.txt"):
    out.append(f"  {f}: " + ("yes" if os.path.exists(os.path.join(ROOT, f)) else "no"))

with open(os.path.join(ROOT, "build", "phase6-state.txt"), "w", encoding="utf-8") as fh:
    fh.write("\n".join(out))
print("STATE DONE")
