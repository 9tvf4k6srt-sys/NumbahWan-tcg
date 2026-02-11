#!/usr/bin/env python3
"""
QQB Sentinel v1.0 - Workflow Auto-Healer
=========================================
Learns from every failure in our session and enforces solutions automatically.

FAILURE CATALOG (from this session):
  F1: Port 5060 OSError "Address already in use" - server restart failed 3x
  F2: HTML entities &#128142; rendered as raw text instead of emoji
  F3: Green treasury sub-text hardcoded in English, not in i18n system
  F4: Images 60-375KB causing slow loads, no thumbnails generated
  F5: innerHTML vs textContent mismatch losing emoji rendering
  F6: Achievement toast z-index/position blocking language toggle
  F7: Random reward popup text not in translation system
  F8: Streak badge too large on mobile, overlapping content

Each check below is a direct response to a real failure. No theoretical stuff.

Usage:
  python3 scripts/qqb-sentinel.py                    # Full diagnostic
  python3 scripts/qqb-sentinel.py --fix              # Diagnose + auto-fix
  python3 scripts/qqb-sentinel.py --preflight        # Run before edits
  python3 scripts/qqb-sentinel.py --postflight       # Run after edits
  python3 scripts/qqb-sentinel.py --restart          # Safe server restart
  python3 scripts/qqb-sentinel.py --watch            # Continuous monitoring
"""

import os
import re
import sys
import json
import time
import signal
import socket
import hashlib
import subprocess
from pathlib import Path
from datetime import datetime

# ═══════════════════════════════════════════════════════════════
# CONFIGURATION
# ═══════════════════════════════════════════════════════════════
PROJECT_ROOT = Path('/home/user/flutter_app')
PUBLIC_DIR = PROJECT_ROOT / 'public'
STATIC_DIR = PUBLIC_DIR / 'static'
QQB_HTML = PUBLIC_DIR / 'qinqin.html'
SENTINEL_LOG = PROJECT_ROOT / 'scripts' / 'sentinel-qqb.log'
SENTINEL_MEMORY = PROJECT_ROOT / 'scripts' / 'sentinel-qqb-memory.json'
PORT = 5060
MAX_IMAGE_KB = 55  # Anything over this gets auto-thumbnailed
THUMB_QUALITY = 70
THUMB_MAX_WIDTH = 400

# ANSI colors
class C:
    RED = '\033[91m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    CYAN = '\033[96m'
    BOLD = '\033[1m'
    DIM = '\033[2m'
    END = '\033[0m'

def log(msg, level='INFO'):
    colors = {'INFO': C.CYAN, 'PASS': C.GREEN, 'FAIL': C.RED, 'WARN': C.YELLOW, 'FIX': C.BOLD}
    timestamp = datetime.now().strftime('%H:%M:%S')
    prefix = colors.get(level, '') + f'[{level}]' + C.END
    print(f"  {C.DIM}{timestamp}{C.END} {prefix} {msg}")
    with open(SENTINEL_LOG, 'a') as f:
        f.write(f"{timestamp} [{level}] {msg}\n")

def load_memory():
    if SENTINEL_MEMORY.exists():
        return json.loads(SENTINEL_MEMORY.read_text())
    return {'runs': 0, 'fixes_applied': 0, 'failures_caught': 0, 'history': []}

def save_memory(mem):
    SENTINEL_MEMORY.write_text(json.dumps(mem, indent=2))


# ═══════════════════════════════════════════════════════════════
# CHECK 1: PORT HEALTH (Learned from F1 - port binding failures)
# ═══════════════════════════════════════════════════════════════
def check_port_health():
    """F1: We failed 3x restarting because port 5060 was stuck in TIME_WAIT.
    Solution: Always use SO_REUSEADDR + force kill + wait cycle."""
    issues = []
    
    # Check if port is responding
    try:
        result = subprocess.run(
            ['curl', '-s', '-o', '/dev/null', '-w', '%{http_code}', f'http://localhost:{PORT}/qinqin.html'],
            capture_output=True, text=True, timeout=5
        )
        code = result.stdout.strip()
        if code == '200':
            log(f'Port {PORT} responding HTTP 200', 'PASS')
        elif code == '000':
            issues.append({'id': 'F1-NO-SERVER', 'msg': f'Port {PORT} not responding', 'severity': 'critical'})
            log(f'Port {PORT} not responding (000)', 'FAIL')
        else:
            issues.append({'id': 'F1-BAD-STATUS', 'msg': f'Port {PORT} returned {code}', 'severity': 'warning'})
            log(f'Port {PORT} returned {code}', 'WARN')
    except subprocess.TimeoutExpired:
        issues.append({'id': 'F1-TIMEOUT', 'msg': f'Port {PORT} connection timeout', 'severity': 'critical'})
        log(f'Port {PORT} timeout', 'FAIL')
    except Exception as e:
        issues.append({'id': 'F1-ERROR', 'msg': str(e), 'severity': 'critical'})
        log(f'Port check error: {e}', 'FAIL')
    
    # Check for zombie processes holding the port
    try:
        result = subprocess.run(['lsof', '-ti', f':{PORT}'], capture_output=True, text=True, timeout=5)
        pids = result.stdout.strip().split('\n') if result.stdout.strip() else []
        if len(pids) > 1:
            issues.append({'id': 'F1-MULTI-PID', 'msg': f'Multiple processes on port {PORT}: {pids}', 'severity': 'warning'})
            log(f'Multiple PIDs on port: {pids}', 'WARN')
    except:
        pass
    
    return issues

def fix_port_health(issues):
    """Auto-fix: Force kill + wait + restart with SO_REUSEADDR."""
    for issue in issues:
        if issue['id'].startswith('F1'):
            log('Executing safe server restart...', 'FIX')
            safe_server_restart()
            return True
    return False


# ═══════════════════════════════════════════════════════════════
# CHECK 2: HTML ENTITY RENDERING (Learned from F2 + F5)
# ═══════════════════════════════════════════════════════════════
def check_html_entities():
    """F2: &#128142; appeared as raw text because textContent was used instead of innerHTML.
    F5: showAchievement used textContent, killing emoji rendering.
    Solution: Scan for HTML entities in JS that are assigned via textContent (not innerHTML)."""
    issues = []
    
    if not QQB_HTML.exists():
        log('qinqin.html not found', 'FAIL')
        return [{'id': 'F2-NO-FILE', 'msg': 'qinqin.html missing', 'severity': 'critical'}]
    
    content = QQB_HTML.read_text()
    js_section = content[content.find('<script>'):]
    
    # ONLY flag: .textContent = something containing &#NNN;
    # Template literals (backtick strings with innerHTML) are SAFE — skip them.
    tc_pattern = re.compile(r'\.textContent\s*=\s*[^;]+&#\d+;[^;]*;')
    for match in tc_pattern.finditer(js_section):
        issues.append({
            'id': 'F5-TEXTCONTENT-ENTITY',
            'msg': f'textContent used with HTML entity: {match.group()[:80]}',
            'severity': 'critical'
        })
    
    # Check for direct string assignments (not template literals) containing entities
    # Pattern: variable = '...&#NNN;...'  (single-quoted string with entity)
    # But SKIP if it's inside a backtick template
    direct_pattern = re.compile(r"(?<!`)\s*=\s*'[^']*&#\d+;[^']*'(?!`)")
    for match in direct_pattern.finditer(js_section):
        # Verify it's not inside a template literal
        pos = match.start()
        before = js_section[max(0, pos-500):pos]
        backtick_count = before.count('`')
        if backtick_count % 2 == 1:
            continue  # Inside template literal, innerHTML handles it
        text = match.group().strip()
        issues.append({
            'id': 'F2-RAW-ENTITY',
            'msg': f'HTML entity in direct JS assignment: {text[:60]}',
            'severity': 'warning',
        })
    
    if not issues:
        log('No raw HTML entities in textContent assignments', 'PASS')
    else:
        log(f'{len(issues)} HTML entity issues found', 'FAIL')
    
    return issues


# ═══════════════════════════════════════════════════════════════
# CHECK 3: i18n COMPLETENESS (Learned from F3 + F7)
# ═══════════════════════════════════════════════════════════════
def check_i18n_completeness():
    """F3: Green treasury sub-text was hardcoded English.
    F7: Random reward popup wasn't in translation system.
    Solution: Verify every language has identical key sets."""
    issues = []
    
    if not QQB_HTML.exists():
        return [{'id': 'F3-NO-FILE', 'msg': 'qinqin.html missing', 'severity': 'critical'}]
    
    content = QQB_HTML.read_text()
    
    # Extract translation blocks
    t_start = content.find('const T = {')
    t_end = content.find('\n};', t_start) + 3
    if t_start == -1:
        return [{'id': 'F3-NO-T', 'msg': 'Translation object T not found', 'severity': 'critical'}]
    
    t_block = content[t_start:t_end]
    
    # Parse each language block — handle keys on same line (comma-separated)
    lang_pattern = re.compile(r'^(\w+): \{', re.MULTILINE)
    lang_starts = [(m.group(1), m.end()) for m in lang_pattern.finditer(t_block)]
    
    lang_keys = {}
    for lang, start_pos in lang_starts:
        # Find matching closing brace
        depth = 1
        pos = start_pos
        while pos < len(t_block) and depth > 0:
            if t_block[pos] == '{': depth += 1
            elif t_block[pos] == '}': depth -= 1
            pos += 1
        block = t_block[start_pos:pos-1]
        # Match ALL keys: word followed by colon (handles both line-start and inline)
        keys = set(re.findall(r"(?:^|,|\n)\s*(\w+)\s*:", block))
        lang_keys[lang] = keys
        log(f'{lang}: {len(keys)} keys', 'INFO')
    
    # Check parity
    if 'en' in lang_keys:
        en_keys = lang_keys['en']
        for lang in ['zh', 'jp']:
            if lang in lang_keys:
                missing = en_keys - lang_keys[lang]
                extra = lang_keys[lang] - en_keys
                if missing:
                    issues.append({
                        'id': f'F3-MISSING-{lang.upper()}',
                        'msg': f'{lang} missing {len(missing)} keys: {missing}',
                        'severity': 'critical',
                        'keys': list(missing)
                    })
                    log(f'{lang} missing {len(missing)} keys: {missing}', 'FAIL')
                else:
                    log(f'{lang} has all {len(en_keys)} keys', 'PASS')
                if extra:
                    log(f'{lang} has {len(extra)} extra keys: {extra}', 'WARN')
    
    # Check for t() calls referencing keys that don't exist in EN
    # Exclude known false positives from regex matching HTML attribute names
    FALSE_POSITIVE_KEYS = {'style', 'div', 'span', 'class', 'id', 'src', 'alt', 'href', 'img', 'a', 'p', 'br'}
    t_calls = set(re.findall(r"t\('(\w+)'\)", content))
    undefined_keys = t_calls - lang_keys.get('en', set()) - FALSE_POSITIVE_KEYS
    if undefined_keys:
        issues.append({
            'id': 'F3-UNDEFINED-KEY',
            'msg': f't() calls with undefined keys: {undefined_keys}',
            'severity': 'warning'
        })
        log(f'Undefined t() keys: {undefined_keys}', 'WARN')
    
    # Check for hardcoded English in data-i18n elements that AREN'T in any translation
    data_i18n_keys = set(re.findall(r'data-i18n="(\w+)"', content))
    all_known_keys = set()
    for lk in lang_keys.values():
        all_known_keys.update(lk)
    # Also check t() calls for keys defined inline via comma-separated patterns
    all_t_calls = set(re.findall(r"t\('(\w+)'\)", content))
    all_known_keys.update(all_t_calls)
    missing_data_keys = data_i18n_keys - all_known_keys
    if missing_data_keys:
        issues.append({
            'id': 'F3-MISSING-DATA-I18N',
            'msg': f'data-i18n keys not in translations: {missing_data_keys}',
            'severity': 'critical'
        })
        log(f'Missing data-i18n keys: {missing_data_keys}', 'FAIL')
    else:
        log(f'All {len(data_i18n_keys)} data-i18n keys have translations', 'PASS')
    
    return issues


# ═══════════════════════════════════════════════════════════════
# CHECK 4: IMAGE OPTIMIZATION (Learned from F4)
# ═══════════════════════════════════════════════════════════════
def check_image_optimization():
    """F4: Images were 60-375KB causing 3-5s load times.
    Solution: Every image referenced in HTML must have a thumb version < MAX_IMAGE_KB."""
    issues = []
    
    if not QQB_HTML.exists():
        return [{'id': 'F4-NO-FILE', 'msg': 'qinqin.html missing', 'severity': 'critical'}]
    
    content = QQB_HTML.read_text()
    
    # Find all image references (src="..." in both HTML and JS)
    img_refs = set()
    # HTML src attributes
    img_refs.update(re.findall(r'src="(/static/[^"]+\.webp)"', content))
    # JS string image paths
    img_refs.update(re.findall(r"'(/static/[^']+\.webp)'", content))
    
    for ref in sorted(img_refs):
        filepath = PUBLIC_DIR / ref.lstrip('/')
        if filepath.exists():
            size_kb = filepath.stat().st_size / 1024
            if size_kb > MAX_IMAGE_KB:
                issues.append({
                    'id': 'F4-LARGE-IMAGE',
                    'msg': f'{ref} is {size_kb:.0f}KB (max {MAX_IMAGE_KB}KB)',
                    'severity': 'warning',
                    'path': str(filepath),
                    'size_kb': size_kb
                })
                log(f'{ref}: {size_kb:.0f}KB > {MAX_IMAGE_KB}KB limit', 'WARN')
            else:
                log(f'{ref}: {size_kb:.0f}KB OK', 'PASS')
        else:
            issues.append({
                'id': 'F4-MISSING-IMAGE',
                'msg': f'{ref} referenced but file missing',
                'severity': 'critical',
                'path': ref
            })
            log(f'{ref}: FILE MISSING', 'FAIL')
    
    # Check that all <img> tags have loading="lazy" and decoding="async"
    # Exception: tiny icons (<= 28px) and above-fold hero images (coin faces) can load eagerly
    EAGER_LOAD_PATTERNS = ['favicon', 'coin-front', 'coin-back', 'hero-coin-static', 'hero-bg-vault', 'nav-brand']  # Above-fold assets
    img_tags = re.findall(r'<img\s[^>]+>', content)
    for tag in img_tags:
        if 'loading="lazy"' not in tag:
            # Skip known eager-load patterns
            if any(p in tag for p in EAGER_LOAD_PATTERNS):
                continue
            # Skip small icons (width <= 28)
            width_match = re.search(r'width="(\d+)"', tag)
            if width_match and int(width_match.group(1)) <= 28:
                continue
            issues.append({
                'id': 'F4-NO-LAZY',
                'msg': f'Image without lazy loading: {tag[:60]}',
                'severity': 'warning'
            })
    
    # F9: COIN VISUAL QUALITY CHECK — ensure coin images have actual detail, not flat color
    try:
        from PIL import Image as PILImage
        import struct
        for coin_name in ['qqb-coin-front.webp', 'qqb-coin-back.webp']:
            coin_path = PUBLIC_DIR / 'static' / 'icons' / coin_name
            if coin_path.exists():
                cimg = PILImage.open(coin_path).convert('RGBA')
                pixels = list(cimg.getdata())
                visible = [(r,g,b) for r,g,b,a in pixels if a > 10]
                if len(visible) > 0:
                    unique_colors = len(set(visible))
                    avg_r = sum(p[0] for p in visible) / len(visible)
                    avg_g = sum(p[1] for p in visible) / len(visible)
                    avg_b = sum(p[2] for p in visible) / len(visible)
                    # Flat image check: fewer than 500 unique colors = likely broken
                    if unique_colors < 500:
                        issues.append({
                            'id': 'F9-FLAT-COIN',
                            'msg': f'{coin_name}: only {unique_colors} unique colors — image looks flat/broken',
                            'severity': 'critical'
                        })
                        log(f'{coin_name}: {unique_colors} colors — FLAT IMAGE', 'FAIL')
                    else:
                        log(f'{coin_name}: {unique_colors} colors, avg RGB=({avg_r:.0f},{avg_g:.0f},{avg_b:.0f}) OK', 'PASS')
                    # Transparency check: corners must be transparent
                    w, h = cimg.size
                    corners = [cimg.getpixel((0,0)), cimg.getpixel((w-1,0)), cimg.getpixel((0,h-1)), cimg.getpixel((w-1,h-1))]
                    if any(c[3] > 10 for c in corners):
                        issues.append({
                            'id': 'F9-BORDER-LEAK',
                            'msg': f'{coin_name}: corners not transparent — will show border during 3D spin',
                            'severity': 'critical'
                        })
                        log(f'{coin_name}: corners NOT transparent', 'FAIL')
    except ImportError:
        pass  # PIL not available, skip visual check
    
    return issues

def fix_image_optimization(issues):
    """Auto-fix: Generate thumbnails for oversized images."""
    fixed = 0
    try:
        from PIL import Image
    except ImportError:
        log('PIL not available, cannot auto-generate thumbnails', 'WARN')
        return 0
    
    for issue in issues:
        if issue['id'] == 'F4-LARGE-IMAGE':
            src_path = Path(issue['path'])
            thumb_name = src_path.stem + '-thumb' + src_path.suffix
            thumb_path = src_path.parent / thumb_name
            
            if thumb_path.exists():
                log(f'Thumbnail already exists: {thumb_path.name}', 'INFO')
                continue
            
            try:
                img = Image.open(src_path)
                w, h = img.size
                if w > THUMB_MAX_WIDTH:
                    ratio = THUMB_MAX_WIDTH / w
                    img = img.resize((THUMB_MAX_WIDTH, int(h * ratio)), Image.LANCZOS)
                img.save(thumb_path, 'WEBP', quality=THUMB_QUALITY, method=4)
                old_kb = src_path.stat().st_size / 1024
                new_kb = thumb_path.stat().st_size / 1024
                log(f'Created {thumb_path.name}: {old_kb:.0f}KB -> {new_kb:.0f}KB ({int((1-new_kb/old_kb)*100)}% smaller)', 'FIX')
                fixed += 1
            except Exception as e:
                log(f'Failed to thumbnail {src_path.name}: {e}', 'FAIL')
    
    return fixed


# ═══════════════════════════════════════════════════════════════
# CHECK 5: UI OVERLAP / Z-INDEX (Learned from F6 + F8)
# ═══════════════════════════════════════════════════════════════
def check_ui_overlap():
    """F6: Achievement toast overlapped language toggle.
    F8: Streak badge was too large on mobile.
    Solution: Verify z-index hierarchy and element sizing."""
    issues = []
    
    if not QQB_HTML.exists():
        return issues
    
    content = QQB_HTML.read_text()
    
    # Extract all z-index values and their selectors
    z_pattern = re.compile(r'([.#][\w-]+)\s*\{[^}]*z-index:\s*(\d+)', re.DOTALL)
    z_map = {}
    for match in z_pattern.finditer(content):
        selector = match.group(1)
        z_val = int(match.group(2))
        z_map[selector] = z_val
    
    # Verify hierarchy: each element should be above the next in the list
    # achievement-toast (99999, temp) > premium-nav (10000) > reward-bar (9999) > streak-badge (9998)
    expected_order = ['.achievement-toast', '.premium-nav', '.reward-bar', '.streak-badge']
    for i in range(len(expected_order) - 1):
        a, b = expected_order[i], expected_order[i+1]
        za = z_map.get(a, 0)
        zb = z_map.get(b, 0)
        if za <= zb:
            issues.append({
                'id': 'F6-Z-ORDER',
                'msg': f'{a} (z:{za}) should be above {b} (z:{zb})',
                'severity': 'warning'
            })
            log(f'Z-index issue: {a}({za}) <= {b}({zb})', 'WARN')
    
    if not issues:
        log('Z-index hierarchy correct', 'PASS')
    
    # Check fixed elements have reasonable sizing
    fixed_sizes = re.findall(r'\.streak-badge\s*\{[^}]*width:\s*(\d+)px', content)
    for size in fixed_sizes:
        if int(size) > 56:
            issues.append({
                'id': 'F8-OVERSIZED',
                'msg': f'Streak badge width {size}px exceeds 56px mobile limit',
                'severity': 'warning'
            })
            log(f'Streak badge oversized: {size}px', 'WARN')
    
    if not [i for i in issues if i['id'].startswith('F8')]:
        log('Fixed element sizes within limits', 'PASS')
    
    return issues


# ═══════════════════════════════════════════════════════════════
# CHECK 6: SERVER RESTART SAFETY (Learned from F1)
# ═══════════════════════════════════════════════════════════════
def safe_server_restart():
    """The battle-tested restart sequence that actually works.
    Learned the hard way: fuser + sleep + SO_REUSEADDR + health check."""
    
    log('=== SAFE SERVER RESTART SEQUENCE ===', 'FIX')
    
    # Step 1: Kill everything on port
    log('Step 1: Force killing port holders...', 'INFO')
    subprocess.run(['bash', '-c', f'fuser -k {PORT}/tcp 2>/dev/null || true'], timeout=5)
    time.sleep(1)
    
    # Step 2: Double-kill any stragglers
    subprocess.run(['bash', '-c', 'pkill -f "python3.*http.server.*5060" 2>/dev/null || true'], timeout=5)
    subprocess.run(['bash', '-c', 'pkill -f "python3.*CORSHandler" 2>/dev/null || true'], timeout=5)
    time.sleep(1)
    
    # Step 3: Verify port is truly free
    for attempt in range(5):
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        try:
            sock.bind(('0.0.0.0', PORT))
            sock.close()
            log(f'Port {PORT} free (attempt {attempt+1})', 'PASS')
            break
        except OSError:
            sock.close()
            if attempt < 4:
                log(f'Port still busy, waiting... (attempt {attempt+1})', 'WARN')
                time.sleep(2)
            else:
                log(f'Port {PORT} stuck after 5 attempts. Using nuclear option.', 'FAIL')
                subprocess.run(['bash', '-c', f'lsof -ti:{PORT} | xargs -r kill -9'], timeout=5)
                time.sleep(3)
    
    # Step 4: Start server with CORS + cache-busting
    server_script = f'''
import http.server, socket, socketserver

class ReuseServer(socketserver.TCPServer):
    allow_reuse_address = True
    def server_bind(self):
        self.socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        try:
            self.socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEPORT, 1)
        except (AttributeError, OSError):
            pass
        super().server_bind()

class CORSHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('X-Frame-Options', 'ALLOWALL')
        self.send_header('Content-Security-Policy', 'frame-ancestors *')
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        super().end_headers()
    def log_message(self, format, *args):
        pass

with ReuseServer(('0.0.0.0', {PORT}), CORSHandler) as httpd:
    print(f"QQB Sentinel Server on port {PORT}", flush=True)
    httpd.serve_forever()
'''
    
    # Write server script to temp file for reliability
    server_file = Path('/tmp/qqb-server.py')
    server_file.write_text(server_script)
    
    log('Step 4: Starting CORS server...', 'INFO')
    subprocess.Popen(
        ['python3', str(server_file)],
        cwd=str(PUBLIC_DIR),
        stdout=open('/tmp/qqb-server.log', 'w'),
        stderr=subprocess.STDOUT,
        start_new_session=True
    )
    
    # Step 5: Health check loop
    for attempt in range(10):
        time.sleep(1)
        try:
            result = subprocess.run(
                ['curl', '-s', '-o', '/dev/null', '-w', '%{http_code}', f'http://localhost:{PORT}/qinqin.html'],
                capture_output=True, text=True, timeout=3
            )
            if result.stdout.strip() == '200':
                log(f'Server UP and healthy (attempt {attempt+1})', 'PASS')
                return True
        except:
            pass
        log(f'Waiting for server... (attempt {attempt+1})', 'INFO')
    
    log('Server failed to start after 10 attempts', 'FAIL')
    return False


# ═══════════════════════════════════════════════════════════════
# CHECK 7: CONTENT INTEGRITY (Hash-based change detection)
# ═══════════════════════════════════════════════════════════════
def check_content_integrity():
    """Track file hashes to detect unintended changes."""
    issues = []
    
    if not QQB_HTML.exists():
        return [{'id': 'INTEGRITY-NO-FILE', 'msg': 'qinqin.html missing', 'severity': 'critical'}]
    
    current_hash = hashlib.md5(QQB_HTML.read_bytes()).hexdigest()[:12]
    file_size = QQB_HTML.stat().st_size
    
    mem = load_memory()
    last_hash = mem.get('last_hash', None)
    
    if last_hash and last_hash != current_hash:
        log(f'File changed: {last_hash} -> {current_hash} ({file_size} bytes)', 'WARN')
    else:
        log(f'File hash: {current_hash} ({file_size} bytes)', 'PASS')
    
    mem['last_hash'] = current_hash
    mem['last_size'] = file_size
    save_memory(mem)
    
    return issues


# ═══════════════════════════════════════════════════════════════
# MASTER ORCHESTRATOR
# ═══════════════════════════════════════════════════════════════
def run_all_checks():
    """Run every diagnostic check and return aggregated results."""
    print(f"\n{C.BOLD}{'='*60}{C.END}")
    print(f"{C.BOLD}  QQB SENTINEL v1.0 - Workflow Auto-Healer{C.END}")
    print(f"{C.BOLD}{'='*60}{C.END}\n")
    
    mem = load_memory()
    mem['runs'] += 1
    
    all_issues = []
    
    checks = [
        ('PORT HEALTH (F1)', check_port_health),
        ('HTML ENTITIES (F2/F5)', check_html_entities),
        ('i18n COMPLETENESS (F3/F7)', check_i18n_completeness),
        ('IMAGE OPTIMIZATION (F4)', check_image_optimization),
        ('UI OVERLAP (F6/F8)', check_ui_overlap),
        ('CONTENT INTEGRITY', check_content_integrity),
    ]
    
    for name, check_fn in checks:
        print(f"\n  {C.CYAN}--- {name} ---{C.END}")
        try:
            issues = check_fn()
            all_issues.extend(issues)
        except Exception as e:
            log(f'Check failed: {e}', 'FAIL')
            all_issues.append({'id': 'CHECK-ERROR', 'msg': str(e), 'severity': 'critical'})
    
    # Summary
    critical = [i for i in all_issues if i.get('severity') == 'critical']
    warnings = [i for i in all_issues if i.get('severity') == 'warning']
    
    print(f"\n{C.BOLD}{'='*60}{C.END}")
    if not all_issues:
        print(f"  {C.GREEN}{C.BOLD}ALL CLEAR - 0 issues found{C.END}")
        mem['last_status'] = 'CLEAN'
    else:
        print(f"  {C.RED if critical else C.YELLOW}{C.BOLD}{len(critical)} critical, {len(warnings)} warnings{C.END}")
        mem['last_status'] = 'ISSUES'
    
    mem['failures_caught'] += len(all_issues)
    mem['last_run'] = datetime.now().isoformat()
    mem['history'].append({
        'time': datetime.now().isoformat(),
        'critical': len(critical),
        'warnings': len(warnings)
    })
    # Keep last 50 runs
    mem['history'] = mem['history'][-50:]
    save_memory(mem)
    
    print(f"  {C.DIM}Run #{mem['runs']} | Total fixes: {mem['fixes_applied']} | Total catches: {mem['failures_caught']}{C.END}")
    print(f"{C.BOLD}{'='*60}{C.END}\n")
    
    return all_issues

def run_with_fixes():
    """Run all checks, then auto-fix what we can."""
    issues = run_all_checks()
    
    if not issues:
        return
    
    print(f"\n  {C.BOLD}=== AUTO-FIX MODE ==={C.END}\n")
    
    mem = load_memory()
    fixed = 0
    
    # Port fixes
    port_issues = [i for i in issues if i['id'].startswith('F1')]
    if port_issues:
        if fix_port_health(port_issues):
            fixed += 1
    
    # Image fixes
    img_issues = [i for i in issues if i['id'] == 'F4-LARGE-IMAGE']
    if img_issues:
        fixed += fix_image_optimization(img_issues)
    
    mem['fixes_applied'] += fixed
    save_memory(mem)
    
    if fixed:
        log(f'Applied {fixed} auto-fixes', 'FIX')
    else:
        log('No auto-fixes available for remaining issues', 'INFO')

def run_preflight():
    """Quick checks before making edits."""
    print(f"\n  {C.BOLD}=== PREFLIGHT CHECK ==={C.END}\n")
    issues = []
    
    print(f"  {C.CYAN}--- PORT ---{C.END}")
    issues.extend(check_port_health())
    
    print(f"  {C.CYAN}--- CONTENT ---{C.END}")
    issues.extend(check_content_integrity())
    
    if not issues:
        print(f"\n  {C.GREEN}PREFLIGHT PASS - Safe to edit{C.END}\n")
    else:
        print(f"\n  {C.YELLOW}PREFLIGHT WARNINGS - Check issues before editing{C.END}\n")
    
    return issues

def run_postflight():
    """Full validation after edits."""
    print(f"\n  {C.BOLD}=== POSTFLIGHT CHECK ==={C.END}\n")
    return run_all_checks()

def run_watch(interval=30):
    """Continuous monitoring mode."""
    print(f"\n  {C.BOLD}=== WATCH MODE (every {interval}s) ==={C.END}")
    print(f"  {C.DIM}Press Ctrl+C to stop{C.END}\n")
    
    last_hash = None
    try:
        while True:
            if QQB_HTML.exists():
                current_hash = hashlib.md5(QQB_HTML.read_bytes()).hexdigest()[:12]
                if current_hash != last_hash:
                    if last_hash:
                        log('File changed! Running postflight...', 'WARN')
                        run_postflight()
                    last_hash = current_hash
            
            # Quick port check
            try:
                result = subprocess.run(
                    ['curl', '-s', '-o', '/dev/null', '-w', '%{http_code}', f'http://localhost:{PORT}/qinqin.html'],
                    capture_output=True, text=True, timeout=3
                )
                if result.stdout.strip() != '200':
                    log(f'Server down! Auto-restarting...', 'FAIL')
                    safe_server_restart()
            except:
                pass
            
            time.sleep(interval)
    except KeyboardInterrupt:
        print(f"\n  {C.DIM}Watch mode stopped.{C.END}\n")


# ═══════════════════════════════════════════════════════════════
# CLI
# ═══════════════════════════════════════════════════════════════
if __name__ == '__main__':
    args = sys.argv[1:]
    
    if '--fix' in args:
        run_with_fixes()
    elif '--preflight' in args:
        run_preflight()
    elif '--postflight' in args:
        run_postflight()
    elif '--restart' in args:
        safe_server_restart()
    elif '--watch' in args:
        interval = 30
        for a in args:
            if a.isdigit():
                interval = int(a)
        run_watch(interval)
    else:
        run_all_checks()
