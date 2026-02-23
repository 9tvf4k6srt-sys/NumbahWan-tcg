#!/usr/bin/env python3
"""
Art Forge Extractor v1.0 — Extract individual sprites from sheet images.

Analyzes a sprite sheet, detects grid cells, extracts each item,
tight-crops to non-transparent bounds, and saves as individual PNGs.

Also validates output quality and logs lessons for the learning loop.

Usage:
  python3 bin/art-extract.py <sheet.png> <cols> <rows> <output_dir> [--names name1,name2,...]
  python3 bin/art-extract.py --weapons   (shortcut for DEADRIFT weapons)
  python3 bin/art-extract.py --chars     (shortcut for DEADRIFT characters tight-crop)
"""
import sys, os, json, time
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    print("ERROR: Pillow not installed. Run: pip install Pillow")
    sys.exit(1)


def tight_crop(img):
    """Crop image to tight non-transparent bounds."""
    if img.mode != 'RGBA':
        img = img.convert('RGBA')
    bbox = img.getbbox()
    if bbox:
        return img.crop(bbox)
    return img


def extract_grid(sheet_path, cols, rows, output_dir, names=None, pad_pct=0.02):
    """
    Extract individual sprites from a grid sheet.
    
    Args:
        sheet_path: Path to the sheet PNG
        cols: Number of columns in grid
        rows: Number of rows in grid
        output_dir: Directory to save extracted sprites
        names: Optional list of names for each cell (left-to-right, top-to-bottom)
        pad_pct: Padding percentage to skip grid borders (0.02 = 2%)
    
    Returns:
        dict with results and quality metrics
    """
    start = time.time()
    os.makedirs(output_dir, exist_ok=True)
    
    sheet = Image.open(sheet_path).convert('RGBA')
    sw, sh = sheet.size
    cell_w = sw // cols
    cell_h = sh // rows
    pad_x = int(cell_w * pad_pct)
    pad_y = int(cell_h * pad_pct)
    
    results = {
        'sheet': str(sheet_path),
        'sheet_size': f'{sw}x{sh}',
        'grid': f'{cols}x{rows}',
        'cell_size': f'{cell_w}x{cell_h}',
        'extractions': [],
        'quality_log': [],
    }
    
    total = cols * rows
    if names and len(names) < total:
        # Pad names if fewer than cells
        names = names + [f'item_{i}' for i in range(len(names), total)]
    elif not names:
        names = [f'item_{i}' for i in range(total)]
    
    for idx in range(total):
        col = idx % cols
        row = idx // cols
        name = names[idx] if idx < len(names) else f'item_{idx}'
        
        # Extract cell with padding to skip borders
        x1 = col * cell_w + pad_x
        y1 = row * cell_h + pad_y
        x2 = (col + 1) * cell_w - pad_x
        y2 = (row + 1) * cell_h - pad_y
        
        cell = sheet.crop((x1, y1, x2, y2))
        
        # Tight crop to non-transparent bounds
        cropped = tight_crop(cell)
        cw, ch = cropped.size
        
        # Quality check: is there actual content?
        pixels = list(cropped.getdata())
        non_transparent = sum(1 for p in pixels if p[3] > 10)
        coverage = non_transparent / len(pixels) if pixels else 0
        
        quality = 'good'
        issues = []
        
        if coverage < 0.01:
            quality = 'empty'
            issues.append('Cell appears empty (< 1% opaque pixels)')
        elif coverage < 0.05:
            quality = 'sparse'
            issues.append(f'Very sparse content ({coverage:.1%} coverage)')
        elif cw < 20 or ch < 20:
            quality = 'tiny'
            issues.append(f'Extracted sprite very small ({cw}x{ch})')
        
        # Save
        out_path = os.path.join(output_dir, f'{name}.png')
        cropped.save(out_path, 'PNG')
        file_size = os.path.getsize(out_path)
        
        result = {
            'name': name,
            'cell': f'[{row},{col}]',
            'size': f'{cw}x{ch}',
            'file_size_kb': round(file_size / 1024, 1),
            'coverage': f'{coverage:.1%}',
            'quality': quality,
            'path': out_path,
        }
        results['extractions'].append(result)
        
        if issues:
            results['quality_log'].append({
                'name': name,
                'issues': issues,
                'action': 'needs_review' if quality != 'good' else 'ok',
            })
        
        status = '  OK ' if quality == 'good' else ' WARN'
        print(f'  [{status}] {name}: {cw}x{ch}px, {file_size/1024:.1f}KB, {coverage:.0%} fill')
    
    elapsed = time.time() - start
    results['elapsed_s'] = round(elapsed, 2)
    results['total_extracted'] = len(results['extractions'])
    results['quality_issues'] = len(results['quality_log'])
    
    # Save extraction report
    report_path = os.path.join(output_dir, '_extraction_report.json')
    with open(report_path, 'w') as f:
        json.dump(results, f, indent=2)
    
    return results


def tight_crop_single(img_path, output_path):
    """Tight-crop a single image to non-transparent bounds."""
    img = Image.open(img_path).convert('RGBA')
    cropped = tight_crop(img)
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    cropped.save(output_path, 'PNG')
    ow, oh = img.size
    cw, ch = cropped.size
    reduction = 1 - (cw * ch) / (ow * oh) if ow * oh > 0 else 0
    print(f'  Cropped: {ow}x{oh} -> {cw}x{ch} ({reduction:.0%} smaller)')
    return {'original': f'{ow}x{oh}', 'cropped': f'{cw}x{ch}', 'path': output_path}


if __name__ == '__main__':
    args = sys.argv[1:]
    
    if not args or args[0] == '--help':
        print(__doc__)
        sys.exit(0)
    
    if args[0] == '--weapons':
        # DEADRIFT weapon extraction shortcut
        print('\n  Art Forge Extractor — DEADRIFT Weapons')
        print('  ' + '=' * 45)
        weapon_names = ['wpn_bat', 'wpn_pipe', 'wpn_machete', 'wpn_katana', 'wpn_chainsaw',
                       'wpn_m4a1', 'wpn_shotgun', 'wpn_minigun', 'wpn_railgun', 'wpn_plasma']
        sheet = 'public/games/art/sheets/weapon_sheet_nobg.png'
        outdir = 'public/games/art/weapons'
        results = extract_grid(sheet, 5, 2, outdir, weapon_names)
        print(f'\n  Extracted {results["total_extracted"]} weapons in {results["elapsed_s"]}s')
        if results['quality_issues']:
            print(f'  WARNING: {results["quality_issues"]} quality issues found — check report')
        sys.exit(0)
    
    if args[0] == '--chars':
        # DEADRIFT character tight-crop shortcut
        print('\n  Art Forge Extractor — DEADRIFT Characters')
        print('  ' + '=' * 45)
        chars = [
            ('public/games/art/cropped/char_tier0_gamer.png', 'public/games/art/chars/char_tier0_gamer.png'),
            ('public/games/art/cropped/char_tier1_enforcer.png', 'public/games/art/chars/char_tier1_enforcer.png'),
            ('public/games/art/cropped/char_tier2_seal.png', 'public/games/art/chars/char_tier2_seal.png'),
        ]
        for src, dst in chars:
            print(f'  {os.path.basename(src)}:')
            tight_crop_single(src, dst)
        sys.exit(0)
    
    # Generic extraction
    if len(args) < 4:
        print('Usage: python3 bin/art-extract.py <sheet.png> <cols> <rows> <output_dir> [--names n1,n2,...]')
        sys.exit(1)
    
    sheet_path = args[0]
    cols = int(args[1])
    rows = int(args[2])
    output_dir = args[3]
    names = None
    for a in args[4:]:
        if a.startswith('--names'):
            names = a.split('=')[1].split(',') if '=' in a else args[args.index(a)+1].split(',')
    
    print(f'\n  Art Forge Extractor — Grid {cols}x{rows}')
    print('  ' + '=' * 45)
    results = extract_grid(sheet_path, cols, rows, output_dir, names)
    print(f'\n  Extracted {results["total_extracted"]} items in {results["elapsed_s"]}s')
