"""Verify that every local asset referenced by the pages or the JS data resolves on disk.

Covers src/href/srcset/imagesrcset in the HTML pages plus every quoted 'assets/...'
path inside js/ and data/ files, which is how the menu and gallery data store photos.
"""

import glob
import os
import re
from urllib.parse import unquote

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
lines = []
missing = []

attr_pattern = re.compile(r'\b(src|href|imagesrcset|srcset|content)="([^"]+)"')
js_asset_pattern = re.compile(r"""['"](assets/[^'"]+)['"]""")


def resolve(value):
    value = unquote(value.strip())
    if value.startswith(("http://", "https://", "//", "data:", "mailto:", "tel:", "#", "blob:")):
        return None
    value = value.split("?", 1)[0].split("#", 1)[0]
    if not value:
        return None
    return os.path.join(ROOT, value.replace("/", os.sep))


def check(label, value):
    path = resolve(value)
    if path is None:
        return
    if not os.path.exists(path):
        missing.append(f"  [missing] {label} -> {value}")


for page in sorted(glob.glob(os.path.join(ROOT, "*.html"))):
    name = os.path.basename(page)
    html = open(page, encoding="utf-8", errors="replace").read()
    for attribute, value in attr_pattern.findall(html):
        if attribute == "content" and not value.startswith("assets/"):
            continue
        for candidate in value.split(","):
            candidate = candidate.strip().split(" ")[0]
            if candidate:
                check(f"{name} [{attribute}]", candidate)

scanned = 0
for script in sorted(glob.glob(os.path.join(ROOT, "js", "*.js")) + glob.glob(os.path.join(ROOT, "data", "*.js"))):
    name = os.path.relpath(script, ROOT).replace("\\", "/")
    for value in js_asset_pattern.findall(open(script, encoding="utf-8", errors="replace").read()):
        scanned += 1
        check(name, value)

lines.append(f"quoted asset paths in js/data files: {scanned}")
lines.append(f"missing references: {len(missing)}")
lines.extend(missing)
open(os.path.join(ROOT, "build", "page-asset-check.txt"), "w", encoding="utf-8").write("\n".join(lines))
print("\n".join(lines))
