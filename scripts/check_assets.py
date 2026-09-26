"""Find local asset references in HTML/CSS/JS and report which targets are missing."""
import os
import re
from collections import defaultdict

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SKIP_DIRS = {"node_modules", ".git", "build", "img-raw"}

refs = defaultdict(set)  # asset path -> set of referencing files

pattern = re.compile(
    r"""(?:src|href|content|imagesrcset|data-src)\s*=\s*["']([^"']+)["']"""
    r"""|url\(\s*["']?([^"')]+)["']?\s*\)"""
)

for dirpath, dirnames, filenames in os.walk(ROOT):
    dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
    for name in filenames:
        if not name.endswith((".html", ".css", ".js", ".webmanifest")):
            continue
        path = os.path.join(dirpath, name)
        rel = os.path.relpath(path, ROOT).replace("\\", "/")
        text = open(path, encoding="utf-8", errors="replace").read()
        # every literal that looks like a local asset path
        candidates = set()
        for match in pattern.finditer(text):
            candidates.update(g for g in match.groups() if g)
        candidates.update(re.findall(r"[\"'`]((?:\.\./)*(?:assets|data)/[^\"'`\s]+?\.(?:webp|png|jpe?g|svg|ico))", text))
        for cand in candidates:
            if cand.startswith(("http", "//", "data:", "mailto:", "tel:", "#")):
                continue
            for part in re.split(r"\s+", cand):  # handle srcset lists
                base = part.split("?")[0].split("#")[0]
                if not base or not re.search(r"\.(webp|png|jpe?g|svg|ico)$", base, re.I):
                    continue
                if base.startswith("/"):
                    target = os.path.join(ROOT, base.lstrip("/"))
                else:
                    target = os.path.normpath(os.path.join(os.path.dirname(path), base))
                reltarget = os.path.relpath(target, ROOT).replace("\\", "/")
                refs[reltarget].add(rel)
                if not os.path.exists(target):
                    refs[reltarget].add("!!MISSING!!")

missing = sorted(p for p, srcs in refs.items() if "!!MISSING!!" in srcs)
out = [f"{p}  <-  {', '.join(sorted(s for s in srcs if s != '!!MISSING!!'))}" for p, srcs in sorted(refs.items()) if p in missing]
out.insert(0, f"total referenced assets: {len(refs)} | missing: {len(missing)}\n")
open(os.path.join(ROOT, "build", "missing-assets.txt"), "w", encoding="utf-8").write("\n".join(out))
print("CHECK OK")
