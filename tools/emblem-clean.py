#!/usr/bin/env python3
"""
emblem-clean.py — deterministic cleanup for AI-generated logos after background removal.

The recurring pain point: AI image models render dark fills inside ENCLOSED counters
(the inner loop of a P/D/O/A, the inside of an open mouth, etc.). Edge-based background
removers (fal-bria-rmbg) only strip background connected to the image border, so those
enclosed dark pockets survive as ugly opaque patches on a dark page.

This script fixes it WITHOUT touching the artwork:
  1. Build a mask of "dark" pixels (near-black, below a luminance threshold).
  2. Among dark connected-components that are FULLY enclosed (do not touch any border and
     are surrounded by opaque art), knock out only the SMALL interior ones to transparent.
     We keep large dark regions (intentional black linework / demon body) by an area cap.
  3. Trim to alpha bbox, pad to square, resize (LANCZOS), save webp.

Usage:
  python3 tools/emblem-clean.py IN.png OUT.webp [--size 512] [--pad 1.10] \
      [--dark 70] [--max-hole-frac 0.04] [--quality 88]

Verification counters are printed so the caller can assert "holes punched > 0" when expected.
"""
import argparse, math, sys
from collections import deque
from PIL import Image


def luminance(r, g, b):
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def clear_embedded_islands(px, w, h, dark_thresh, ring_r=26, surround=18):
    """Clear dark blobs that sit INSIDE a light letter body (a dark island embedded in
    white), even when a thin dark bridge fuses them to other dark art. The connected-
    component pass misses these because the bridge makes them part of one huge blob.

    A pixel is an island seed if a ring of samples around it is overwhelmingly
    bright/transparent (i.e. it's surrounded by the white letter, not by more art).
    We then flood out from the seeds through dark pixels, but the flood is naturally
    contained because it can't cross the bright letter wall.
    """
    def lum_p(p):
        return luminance(p[0], p[1], p[2])

    def embedded(x, y):
        bright = 0
        for ang in range(0, 360, 15):
            nx = x + int(ring_r * math.cos(math.radians(ang)))
            ny = y + int(ring_r * math.sin(math.radians(ang)))
            if 0 <= nx < w and 0 <= ny < h:
                p = px[nx, ny]
                if p[3] < 40 or lum_p(p) >= 150:
                    bright += 1
        return bright >= surround

    seeds = []
    for y in range(0, h, 3):
        for x in range(0, w, 3):
            p = px[x, y]
            if p[3] > 40 and lum_p(p) <= dark_thresh and embedded(x, y):
                seeds.append((x, y))
    if not seeds:
        return 0
    vis = set(seeds)
    q = deque(seeds)
    cleared = 0
    while q:
        x, y = q.popleft()
        p = px[x, y]
        px[x, y] = (p[0], p[1], p[2], 0)
        cleared += 1
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if 0 <= nx < w and 0 <= ny < h and (nx, ny) not in vis:
                np = px[nx, ny]
                if np[3] > 40 and lum_p(np) <= dark_thresh + 20:
                    vis.add((nx, ny))
                    q.append((nx, ny))
    return cleared


def clean(inp, outp, size, pad, dark_thresh, max_hole_frac, quality):
    im = Image.open(inp).convert("RGBA")
    w, h = im.size
    px = im.load()
    total = w * h

    # Map of pixels eligible to become transparent: opaque AND dark.
    # We flood through these regions; a region that never touches the border is "enclosed".
    def is_dark_opaque(x, y):
        r, g, b, a = px[x, y]
        return a > 40 and luminance(r, g, b) <= dark_thresh

    visited = bytearray(total)
    holes_punched = 0
    px_cleared = 0
    max_hole_px = int(total * max_hole_frac)

    for sy in range(h):
        for sx in range(w):
            idx = sy * w + sx
            if visited[idx] or not is_dark_opaque(sx, sy):
                continue
            # BFS this dark component
            comp = []
            touches_border = False
            q = deque([(sx, sy)])
            visited[idx] = 1
            while q:
                x, y = q.popleft()
                comp.append((x, y))
                if x == 0 or y == 0 or x == w - 1 or y == h - 1:
                    touches_border = True
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < w and 0 <= ny < h:
                        nidx = ny * w + nx
                        if not visited[nidx] and is_dark_opaque(nx, ny):
                            visited[nidx] = 1
                            q.append((nx, ny))
            # Enclosed (no border contact) AND small enough => it's a counter/mouth artifact.
            if not touches_border and len(comp) <= max_hole_px:
                for (x, y) in comp:
                    r, g, b, a = px[x, y]
                    px[x, y] = (r, g, b, 0)
                holes_punched += 1
                px_cleared += len(comp)

    # Second pass: clear dark islands embedded inside the light letter body (e.g. a dark
    # patch fused to the demon via a thin bridge, which the component pass can't isolate).
    island_px = clear_embedded_islands(px, w, h, dark_thresh)
    if island_px:
        px_cleared += island_px
        print(f"emblem-clean: embedded_island_px={island_px}")

    # Trim to alpha bbox, square-pad, resize
    bbox = im.getbbox()
    if bbox:
        im = im.crop(bbox)
    cw, ch = im.size
    side = int(max(cw, ch) * pad)
    canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    canvas.paste(im, ((side - cw) // 2, (side - ch) // 2), im)
    out = canvas.resize((size, size), Image.LANCZOS)
    out.save(outp, "WEBP", quality=quality, method=6)

    v = out.load()
    corners = [v[0, 0], v[size - 1, 0], v[0, size - 1], v[size - 1, size - 1]]
    print(f"emblem-clean: holes_punched={holes_punched} px_cleared={px_cleared}")
    print(f"emblem-clean: corners={corners} size={out.size} -> {outp}")
    return holes_punched


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("inp")
    ap.add_argument("outp")
    ap.add_argument("--size", type=int, default=512)
    ap.add_argument("--pad", type=float, default=1.10)
    ap.add_argument("--dark", type=int, default=70, help="luminance <= this counts as dark")
    ap.add_argument("--max-hole-frac", type=float, default=0.04,
                    help="enclosed dark blobs up to this fraction of image are punched out")
    ap.add_argument("--quality", type=int, default=88)
    a = ap.parse_args()
    clean(a.inp, a.outp, a.size, a.pad, a.dark, a.max_hole_frac, a.quality)


if __name__ == "__main__":
    main()
