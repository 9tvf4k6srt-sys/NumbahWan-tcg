#!/usr/bin/env python3
"""
asset-alpha-lint.py — catch transparency artifacts in logo/emblem assets.

The class of bug a human keeps catching that our markup/layout lints cannot see:
  - AI-generated logos leave DARK fills inside enclosed counters (the loop of a P/D/O,
    the inside of a mouth) that edge-based background removal can't reach.
  - Background removal sometimes leaves the corners opaque (white box behind the art).

This lint opens each asset and flags:
  1. NON-TRANSPARENT CORNERS  — a logo asset should have transparent corners.
  2. ENCLOSED DARK HOLES       — small dark, fully-enclosed opaque blobs surrounded by art
     (the classic counter/mouth artifact) that should have been punched to transparent.

Exit code 1 if any asset fails (so it can block a ship). Pass paths as args; with no
args it scans the guild assets dir. Honors a small allowlist for assets that legitimately
have opaque content (e.g. full-bleed banners).
"""
import sys, os, glob
from collections import deque
from PIL import Image

DARK = 70          # luminance <= this is "dark"
MIN_HOLE = 80      # ignore tiny specks (compression noise) below this px count
MAX_HOLE_FRAC = 0.06  # enclosed dark blob up to this frac of image = suspicious "hole"
CORNER_ALPHA = 40  # corner alpha above this = "not transparent"

# Assets that are intentionally full-bleed / opaque — skip the corner check for these.
OPAQUE_ALLOW = {"banner.webp", "guildhall.webp", "hero-prontera.webp", "paradox-seam.webp"}


def lum(r, g, b):
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def scan(path):
    issues = []
    try:
        im = Image.open(path).convert("RGBA")
    except Exception as e:
        return [f"cannot open ({e})"]
    w, h = im.size
    px = im.load()
    total = w * h
    name = os.path.basename(path)

    # 1) corners
    if name not in OPAQUE_ALLOW:
        corners = {
            "TL": px[0, 0][3], "TR": px[w - 1, 0][3],
            "BL": px[0, h - 1][3], "BR": px[w - 1, h - 1][3],
        }
        opaque_corners = [k for k, a in corners.items() if a > CORNER_ALPHA]
        if opaque_corners:
            issues.append(f"opaque corners {opaque_corners} (background not removed)")

    # 2) enclosed dark holes (sampled stride for speed on big images)
    stride = 1 if total <= 600 * 600 else 2
    visited = set()
    max_hole = int(total * MAX_HOLE_FRAC)

    def dark_opaque(x, y):
        r, g, b, a = px[x, y]
        return a > 40 and lum(r, g, b) <= DARK

    # A counter-FILL artifact is a flat block: it fills most of its bounding box (high
    # rectangularity). An intentional dark cavity (a demon's open mouth) is organic and
    # fills only part of its bbox. We flag a hole only when it looks like a flat fill,
    # OR when there are several holes (the classic multi-counter artifact pattern).
    FILL_RATIO = 0.55   # comp area / bbox area >= this => looks like a solid fill block
    suspicious_fills = 0
    holes = 0
    for sy in range(0, h, stride):
        for sx in range(0, w, stride):
            if (sx, sy) in visited or not dark_opaque(sx, sy):
                continue
            comp = []
            touches_border = False
            q = deque([(sx, sy)])
            visited.add((sx, sy))
            minx = miny = 10 ** 9
            maxx = maxy = -1
            while q:
                x, y = q.popleft()
                comp.append((x, y))
                if x < minx: minx = x
                if y < miny: miny = y
                if x > maxx: maxx = x
                if y > maxy: maxy = y
                if x < stride or y < stride or x >= w - stride or y >= h - stride:
                    touches_border = True
                for dx, dy in ((stride, 0), (-stride, 0), (0, stride), (0, -stride)):
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < w and 0 <= ny < h and (nx, ny) not in visited and dark_opaque(nx, ny):
                        visited.add((nx, ny))
                        q.append((nx, ny))
            size = len(comp) * (stride * stride)
            if touches_border or not (MIN_HOLE <= size <= max_hole):
                continue
            holes += 1
            bbox_area = max(1, (maxx - minx + stride) * (maxy - miny + stride))
            fill_ratio = (len(comp) * stride * stride) / bbox_area
            if fill_ratio >= FILL_RATIO:
                suspicious_fills += 1

    # Decision: flag if a flat-fill block is present, or if there are 2+ enclosed holes
    # (single organic cavity like one mouth is allowed).
    if suspicious_fills or holes >= 2:
        kind = "flat counter-fill block(s)" if suspicious_fills else "enclosed dark holes"
        issues.append(f"{max(suspicious_fills, holes)} {kind} — likely unremoved counter fill "
                      f"(run: python3 tools/emblem-clean.py SRC {name})")
    return issues


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("-")]
    if not args:
        args = glob.glob("public/guild/brightinside/assets/*.webp") + \
               glob.glob("public/guild/brightinside/assets/*.png")
    # Only lint emblem/logo-type assets by default unless explicitly given.
    failed = 0
    scanned = 0
    print("  ASSET ALPHA  — transparency artifact gate")
    print("  " + "=" * 52)
    for p in args:
        if not os.path.exists(p):
            print(f"  ✗ {p}: not found")
            failed += 1
            continue
        scanned += 1
        issues = scan(p)
        if issues:
            failed += 1
            print(f"  ✗ {os.path.basename(p)}")
            for it in issues:
                print(f"      · {it}")
        else:
            print(f"  ✓ {os.path.basename(p)}")
    print()
    print(f"  {scanned} scanned · {failed} with issues")
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()
