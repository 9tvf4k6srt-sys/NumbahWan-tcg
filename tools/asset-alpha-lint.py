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
import sys, os, glob, math
from collections import deque
from PIL import Image

DARK = 70          # luminance <= this is "dark"
MIN_HOLE = 80      # ignore tiny specks (compression noise) below this px count
MAX_HOLE_FRAC = 0.06  # enclosed dark blob up to this frac of image = suspicious "hole"
CORNER_ALPHA = 40  # corner alpha above this = "not transparent"
R_MARGIN = 24      # skip a border margin when scanning for embedded islands (ring radius)

# Assets that are intentionally full-bleed / opaque — skip the corner check for these.
OPAQUE_ALLOW = {"banner.webp", "guildhall.webp", "hero-prontera.webp", "paradox-seam.webp",
                "hero-bg.webp"}  # ganachaiboyz full-bleed painted hero landscape

# Video poster frames (extracted stills used as <video poster>) are full-bleed
# photographic frames: opaque corners and dark regions are the footage itself,
# not cutout artifacts. Match by suffix so every chapter poster is covered.
VIDEO_POSTER_SUFFIX = "_poster.webp"

# Assets that intentionally carry a dark glyph/monogram INSIDE a letter (a designed seal,
# not an artifact). Skip the embedded-island check for these; corners + counter-fill checks
# still apply. paradox-emblem has an Ohm/Omega (Ω) monogram carved into the P counter.
GLYPH_ALLOW = {"paradox-emblem.webp", "paradox-lockup.webp"}

# Cel-shaded CHARACTER ILLUSTRATIONS (not flat logos): black bean eyes, open mouths,
# ink outlines and painted shading are the art style, so the counter-fill / dark-hole
# heuristics misfire by design. Skip those checks entirely; the corner-transparency
# check still applies (a cutout must still have clean transparent corners).
# ganachaiboyz cabbage-poring mascot + chibi class cards + emperium item art.
ILLUSTRATION_ALLOW = {"emblem.webp", "knight.webp", "mage.webp", "merchant.webp",
                      "emperium.webp",
                      # full-bleed painted landscape: dark windows/shadows are paint,
                      # not counter fills (also in OPAQUE_ALLOW for the corner check)
                      "hero-bg.webp"}


def lum(r, g, b):
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def is_video_poster(name):
    return name.endswith(VIDEO_POSTER_SUFFIX)


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

    # Video poster stills: full-bleed footage frames, nothing to gate.
    if is_video_poster(name):
        return issues

    # 1) corners
    if name not in OPAQUE_ALLOW:
        corners = {
            "TL": px[0, 0][3], "TR": px[w - 1, 0][3],
            "BL": px[0, h - 1][3], "BR": px[w - 1, h - 1][3],
        }
        opaque_corners = [k for k, a in corners.items() if a > CORNER_ALPHA]
        if opaque_corners:
            issues.append(f"opaque corners {opaque_corners} (background not removed)")

    # Illustrations: outline/eye/mouth ink is intentional; only the corner check applies.
    if name in ILLUSTRATION_ALLOW:
        return issues

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

    # 3) embedded dark island: a dark patch sitting INSIDE a light letter body (surrounded
    # by bright/transparent on all sides). This is the case where a dark blob is fused to
    # other art by a thin bridge, so the component check above sees one big low-fill blob
    # and lets it pass — but visually it's a dirty patch inside the letter.
    def lum_p(p):
        return lum(p[0], p[1], p[2])

    def embedded(x, y, R=22):
        bright = 0
        for ang in range(0, 360, 20):
            nx = x + int(R * math.cos(math.radians(ang)))
            ny = y + int(R * math.sin(math.radians(ang)))
            if 0 <= nx < w and 0 <= ny < h:
                p = px[nx, ny]
                if p[3] < 40 or lum_p(p) >= 150:
                    bright += 1
        return bright >= 15  # almost fully ringed by bright/transparent

    island_px = 0
    if name not in GLYPH_ALLOW:  # assets with an intentional interior monogram skip this
        step = 3 if total <= 600 * 600 else 5
        for y in range(R_MARGIN, h - R_MARGIN, step):
            for x in range(R_MARGIN, w - R_MARGIN, step):
                p = px[x, y]
                if p[3] > 40 and lum_p(p) <= DARK and embedded(x, y):
                    island_px += step * step
    embedded_island = island_px >= 300  # a meaningful dark patch inside a letter

    # Decision: flag if a flat-fill block, an embedded island, or 2+ enclosed holes.
    # A single organic cavity (one demon mouth) is allowed.
    # GLYPH_ALLOW assets carry an intentional interior monogram (a dark badge/seal): allow
    # ONE flat fill and skip the embedded-island check, but still catch corners / 2+ fills.
    fill_limit = 1 if name in GLYPH_ALLOW else 0
    hole_limit = 2 if name in GLYPH_ALLOW else 1  # glyph asset: mouth + monogram badge ok
    flag_fill = suspicious_fills > fill_limit
    flag_island = embedded_island and name not in GLYPH_ALLOW
    if flag_fill or flag_island or holes > hole_limit:
        if flag_island:
            kind = f"dark island embedded inside the letter (~{island_px}px)"
        elif flag_fill:
            kind = f"{suspicious_fills} flat counter-fill block(s)"
        else:
            kind = f"{holes} enclosed dark holes (limit {hole_limit})"
        issues.append(f"{kind} — likely unremoved counter fill "
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
