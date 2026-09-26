"""Phase 6 audit: real asset inventory + data/JS/HTML wiring check."""
import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
out = []


def rd(rel):
    p = os.path.join(ROOT, rel)
    return open(p, encoding="utf-8", errors="replace").read() if os.path.exists(p) else ""


def tree(rel):
    total = files = 0
    smallest, largest = None, None
    base = os.path.join(ROOT, rel)
    for dirpath, _dirs, names in os.walk(base):
        for n in names:
            p = os.path.join(dirpath, n)
            s = os.path.getsize(p) / 1024
            files += 1
            total += s
            relp = os.path.relpath(p, base).replace("\\", "/")
            if smallest is None or s < smallest[1]:
                smallest = (relp, s)
            if largest is None or s > largest[1]:
                largest = (relp, s)
    out.append(f"{rel}: {files} files, {total/1024:.0f} KB total | smallest {smallest} | largest {largest}")


out.append("===== asset trees =====")
tree("assets/menu/representative")
tree("assets/menu/thumbs")
tree("assets/hero")

try:
    from PIL import Image

    out.append("\n===== dimensions (sample) =====")
    for rel in [
        "assets/hero/mandi-chicken-rice.webp",
        "assets/hero/mandi-chicken-rice-1600.webp",
        "assets/menu/representative/drinks/karak-tea.webp",
        "assets/menu/representative/drinks/cola-glass.webp",
        "assets/menu/representative/meat/lamb-mandi.webp",
        "assets/menu/representative/qalabat/shakshuka.webp",
        "assets/menu/thumbs/drinks/karak-tea.webp",
    ]:
        p = os.path.join(ROOT, rel)
        if os.path.exists(p):
            with Image.open(p) as im:
                out.append(f"  {rel}: {im.size} {os.path.getsize(p)/1024:.1f} KB")
        else:
            out.append(f"  {rel}: MISSING")
except Exception as exc:  # pragma: no cover
    out.append("PIL unavailable: " + str(exc))

out.append("\n===== data-file placeholder mechanism =====")
for f in ("data/oman-menu-phase5.js", "data/uae-menu-phase5.js"):
    src = rd(f)
    out.append(f"  {f}: len={len(src)}")
    for pat in ("Phase 6", "representativeImagePools", "representativeImage(", "imageType:", "imageSource:",
                "menuImageOverrides", "Object.assign"):
        out.append(f"      {pat!r}: {src.count(pat)}")
    ids = re.findall(r"^\s{4}'([a-z0-9-]+)':", src, re.M)
    out.append(f"      override ids: {len(ids)}")
    out.append("      ids: " + " ".join(ids))

out.append("\n===== index.html script order + menu markup =====")
html = rd("index.html")
for m in re.finditer(r"<script[^>]*src=\"([^\"]+)\"[^>]*>", html):
    out.append("  script: " + m.group(1))
out.append("  hero img tags: " + json.dumps([m.group(0)[:200] for m in re.finditer(r"<img[^>]*(?:hero|Hero)[^>]*>", html)][:4]))
out.append("  menu search anchors: " + json.dumps(re.findall(r".{80}menu-search.{80}", html)[:2]))

out.append("\n===== js/app.js image rendering =====")
appjs = rd("js/app.js")
for pat in ("item.image", "imageType", "loading=", "menu-image", "menu-card__image", "<img"):
    out.append(f"  {pat!r}: {appjs.count(pat)}")
out.append("  img snippets: " + json.dumps([m.group(0) for m in re.finditer(r"<img[^`]{0,160}", appjs)][:5]))

open(os.path.join(ROOT, "build", "p6-audit.txt"), "w", encoding="utf-8").write("\n".join(out))
print("AUDIT OK")
