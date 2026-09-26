"""Check every stylesheet for unbalanced braces and stray selector lines inside rules."""
import glob
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
report = []
problem_files = 0

for path in sorted(glob.glob(os.path.join(ROOT, "css", "*.css"))):
    text = open(path, encoding="utf-8", errors="replace").read()
    rel = os.path.relpath(path, ROOT).replace("\\", "/")
    stack = []          # True when the enclosing block is an at-rule (@media, @supports…)
    statement = ""      # selector / prelude text since the last delimiter
    depth = 0
    min_depth = 0
    issues = []
    lineno = 1

    for char in text:
        if char == "\n":
            lineno += 1
            if not statement.strip():
                statement = ""
            continue
        if char == "{":
            prelude = statement.strip()
            is_at_rule = prelude.startswith("@")
            if stack and stack[-1] is not True:
                name = (prelude or "(empty)")[:60]
                issues.append(f"    line {lineno}: '{name}' opens a block inside another rule")
            stack.append(True if is_at_rule else False)
            depth += 1
            statement = ""
            continue
        if char == "}":
            if not stack:
                issues.append(f"    line {lineno}: closing brace without a matching opening brace")
            else:
                stack.pop()
            depth = len(stack)
            min_depth = min(min_depth, depth)
            statement = ""
            continue
        if char in ";:":
            statement = "" if char == ";" else statement
            continue
        statement += char

    if depth != 0:
        issues.append(f"    file ends {depth} block(s) still open")
    status = "OK" if not issues else "PROBLEM"
    if issues:
        problem_files += 1
    report.append(f"{rel}: final_depth={depth} [{status}]")
    report.extend(issues)

report.insert(0, f"stylesheets with problems: {problem_files}\n")
open(os.path.join(ROOT, "build", "css-check.txt"), "w", encoding="utf-8").write("\n".join(report))
print("\n".join(report))
