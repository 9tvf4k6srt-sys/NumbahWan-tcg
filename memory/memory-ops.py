#!/usr/bin/env python3
"""
KINTSUGI Memory System v2.1 — Session Bootstrap, Validation & Progressive Learning

Architecture:
  HOT  = current context window (session state, active task)
  WARM = qqb-memory.json (structured facts, survives compaction)
  COLD = git log + session_history (archival, queried on demand)

Commands:
  python3 memory/memory-ops.py --load              # Session start: print hot context
  python3 memory/memory-ops.py --status             # Quick health
  python3 memory/memory-ops.py --validate           # Deep integrity check (NEW)
  python3 memory/memory-ops.py --lessons [category]  # Filter lessons
  python3 memory/memory-ops.py --lesson ID SEV CAT TEXT  # Add lesson
  python3 memory/memory-ops.py --checkpoint [JSON]  # Set/read checkpoint
  python3 memory/memory-ops.py --session-end SUMMARY  # Archive session
  python3 memory/memory-ops.py --sync-lines         # Sync page line counts from disk (NEW)
  python3 memory/memory-ops.py --sync-git           # Sync git state from repo (NEW)
"""

import json
import sys
import os
import subprocess
from datetime import datetime
from pathlib import Path

MEMORY_PATH = os.path.join(os.path.dirname(__file__), 'qqb-memory.json')
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


# ═══════════════════════════════════════════════
# CORE I/O
# ═══════════════════════════════════════════════

def load_memory():
    """Load memory with schema validation."""
    try:
        with open(MEMORY_PATH, 'r') as f:
            mem = json.load(f)
    except json.JSONDecodeError as e:
        print(f"FATAL: Memory file corrupt — {e}")
        print(f"  Path: {MEMORY_PATH}")
        print(f"  Recovery: restore from git — git checkout HEAD -- memory/qqb-memory.json")
        sys.exit(1)
    except FileNotFoundError:
        print(f"FATAL: Memory file missing — {MEMORY_PATH}")
        print(f"  Recovery: git checkout HEAD -- memory/qqb-memory.json")
        sys.exit(1)

    # Schema validation
    required_keys = ['_meta', 'user_profile', 'project', 'pages', 'lessons_learned', 'session_history', 'github', 'active_state']
    missing = [k for k in required_keys if k not in mem]
    if missing:
        print(f"WARNING: Memory schema incomplete — missing: {missing}")

    return mem


def save_memory(mem):
    """Save with backup and size tracking."""
    mem['_meta']['updated'] = datetime.now().strftime('%Y-%m-%d')

    # Atomic write: write to temp, then rename
    tmp_path = MEMORY_PATH + '.tmp'
    try:
        with open(tmp_path, 'w') as f:
            json.dump(mem, f, indent=2, ensure_ascii=False)
        os.replace(tmp_path, MEMORY_PATH)
        size = os.path.getsize(MEMORY_PATH)
        print(f"Memory saved ({size:,} bytes)")
    except Exception as e:
        print(f"ERROR: Save failed — {e}")
        if os.path.exists(tmp_path):
            os.remove(tmp_path)
        sys.exit(1)


# ═══════════════════════════════════════════════
# SESSION BOOTSTRAP
# ═══════════════════════════════════════════════

def cmd_load():
    """Session start: print the minimal hot context needed to begin work."""
    mem = load_memory()
    u = mem['user_profile']
    p = mem['project']
    a = mem.get('active_state', {})

    print("=" * 60)
    print(f"KINTSUGI MEMORY v{mem['_meta']['version']} — SESSION BOOTSTRAP")
    print("=" * 60)
    print(f"\nUser: {u['identity']}")
    print(f"Style: {u['communication_style']['mode']}")
    print(f"Review: {u['preferences']['review_device']}")
    print(f"Project: {p['name']} ({p['repo']})")
    print(f"Server: port {p['server']['port']} on {p.get('sandbox_host', 'unknown')}")

    if a.get('checkpoint'):
        print(f"\n!! ACTIVE CHECKPOINT: {json.dumps(a['checkpoint'], indent=2)}")
    if a.get('wip'):
        print(f"\n!! WIP: {a['wip']}")

    print(f"\nSentinel: Run #{a.get('sentinel_run', '?')}, Issues: {a.get('sentinel_issues', '?')}")
    print(f"Last commit: {mem['github']['last_commit']} — {mem['github']['last_commit_msg']}")

    # Print top-severity lessons
    critical = [l for l in mem['lessons_learned'] if l['severity'] == 'critical']
    if critical:
        print(f"\nCRITICAL LESSONS ({len(critical)}):")
        for l in critical:
            print(f"  [{l['id']}] {l['lesson'][:100]}")

    # Print frustration triggers
    triggers = u.get('frustration_triggers', [])
    crit_triggers = [t for t in triggers if t.get('severity') == 'critical']
    if crit_triggers:
        print(f"\nCRITICAL TRIGGERS ({len(crit_triggers)}):")
        for t in crit_triggers:
            print(f"  - {t['trigger']} → {t['fix'][:80]}")

    print("\n" + "=" * 60)


# ═══════════════════════════════════════════════
# VALIDATION (NEW)
# ═══════════════════════════════════════════════

def cmd_validate():
    """Deep integrity check — catches drift before it becomes a bug."""
    mem = load_memory()
    issues = []
    warnings = []

    # 1. Session ID uniqueness
    session_ids = [s['id'] for s in mem['session_history']]
    dupes = set([i for i in session_ids if session_ids.count(i) > 1])
    if dupes:
        issues.append(f"Duplicate session IDs: {dupes}")

    # 2. Lesson text/lesson field sync
    for l in mem['lessons_learned']:
        if l.get('text') and l.get('lesson') and l['text'] != l['lesson']:
            issues.append(f"Lesson {l['id']}: text field != lesson field (data drift)")

    # 3. Lesson ID uniqueness
    lesson_ids = [l['id'] for l in mem['lessons_learned']]
    lesson_dupes = set([i for i in lesson_ids if lesson_ids.count(i) > 1])
    if lesson_dupes:
        issues.append(f"Duplicate lesson IDs: {lesson_dupes}")

    # 4. Asset path validation (if in project root)
    if os.path.exists(os.path.join(PROJECT_ROOT, 'public')):
        for asset_group in ['coin_images', 'svg_icons', 'brand']:
            for asset in mem.get('assets', {}).get(asset_group, []):
                path = asset if isinstance(asset, str) else asset.get('file', '')
                full = os.path.join(PROJECT_ROOT, 'public', 'static', path)
                if not os.path.exists(full):
                    issues.append(f"Missing asset: {path}")

        for hero in mem.get('assets', {}).get('hero_images', []):
            full = os.path.join(PROJECT_ROOT, 'public', 'static', hero['file'])
            if not os.path.exists(full):
                issues.append(f"Missing hero image: {hero['file']}")

        for agent in mem.get('assets', {}).get('agent_tcg', []):
            full = os.path.join(PROJECT_ROOT, 'public', 'static', agent['file'])
            if not os.path.exists(full):
                issues.append(f"Missing agent art: {agent['file']}")

    # 5. Page line count drift
    for page_key, page_data in mem['pages'].items():
        html_path = os.path.join(PROJECT_ROOT, page_data['path'])
        if os.path.exists(html_path):
            actual = sum(1 for _ in open(html_path))
            stored = page_data.get('lines', 0)
            if abs(actual - stored) > 10:
                warnings.append(f"{page_key}: stored {stored} lines, actual {actual} (drift: {actual - stored})")

    # 6. Dead feature check
    removed_features = ['toast', 'achievement', 'streak', 'coming soon']
    for page_key, page_data in mem['pages'].items():
        for f in page_data.get('features', []):
            for dead in removed_features:
                if dead in f.lower():
                    issues.append(f"Dead feature in {page_key}: '{f}'")

    # 7. localStorage key consistency
    stored_key = mem['user_profile']['preferences'].get('language_storage_key', '')
    for page_key, page_data in mem['pages'].items():
        html_path = os.path.join(PROJECT_ROOT, page_data['path'])
        if os.path.exists(html_path):
            content = open(html_path).read()
            if 'qqb_lang' in content:
                issues.append(f"Stale qqb_lang reference in {page_key}")

    # 8. Git state sync
    try:
        result = subprocess.run(['git', 'log', '--oneline', '-1'], capture_output=True, text=True, cwd=PROJECT_ROOT)
        if result.returncode == 0:
            latest_hash = result.stdout.strip().split()[0]
            stored_hash = mem['github']['last_commit']
            if latest_hash != stored_hash:
                warnings.append(f"Git drift: stored {stored_hash}, actual {latest_hash}")
    except Exception:
        warnings.append("Could not check git state")

    # Report
    print("=" * 60)
    print("MEMORY VALIDATION REPORT")
    print("=" * 60)

    if not issues and not warnings:
        print("\nALL CHECKS PASSED")
    else:
        if issues:
            print(f"\nISSUES ({len(issues)}):")
            for i in issues:
                print(f"  [FAIL] {i}")
        if warnings:
            print(f"\nWARNINGS ({len(warnings)}):")
            for w in warnings:
                print(f"  [WARN] {w}")

    print(f"\nSummary: {len(issues)} issues, {len(warnings)} warnings")
    print("=" * 60)

    return len(issues)


# ═══════════════════════════════════════════════
# LIVE SYNC COMMANDS (NEW)
# ═══════════════════════════════════════════════

def cmd_sync_lines():
    """Sync page line counts from actual disk files."""
    mem = load_memory()
    changes = 0
    for page_key, page_data in mem['pages'].items():
        html_path = os.path.join(PROJECT_ROOT, page_data['path'])
        if os.path.exists(html_path):
            actual = sum(1 for _ in open(html_path))
            old = page_data.get('lines', 0)
            if actual != old:
                page_data['lines'] = actual
                print(f"  {page_key}: {old} → {actual}")
                changes += 1
    if changes:
        save_memory(mem)
        print(f"Synced {changes} page(s)")
    else:
        print("All line counts already current.")


def cmd_sync_git():
    """Sync git state from actual repo."""
    mem = load_memory()
    try:
        result = subprocess.run(
            ['git', 'log', '--oneline', '-1'],
            capture_output=True, text=True, cwd=PROJECT_ROOT
        )
        if result.returncode == 0:
            parts = result.stdout.strip().split(' ', 1)
            new_hash = parts[0]
            new_msg = parts[1] if len(parts) > 1 else ''
            old_hash = mem['github']['last_commit']
            if new_hash != old_hash:
                mem['github']['last_commit'] = new_hash
                mem['github']['last_commit_msg'] = new_msg
                save_memory(mem)
                print(f"Git synced: {old_hash} → {new_hash}")
            else:
                print(f"Git already current: {new_hash}")
        else:
            print(f"Git check failed: {result.stderr}")
    except Exception as e:
        print(f"Git sync error: {e}")


# ═══════════════════════════════════════════════
# LESSONS
# ═══════════════════════════════════════════════

def cmd_lessons(category=None):
    """Print lessons filtered by category or retrieval_hints."""
    mem = load_memory()
    lessons = mem['lessons_learned']

    if category:
        # Check retrieval_hints first
        hint_key = f"when_touching_{category}"
        hints = mem.get('retrieval_hints', {})
        if hint_key in hints:
            ids = hints[hint_key]
            lessons = [l for l in lessons if l['id'] in ids]
        else:
            lessons = [l for l in lessons if l.get('category') == category]

    if not lessons:
        print(f"No lessons found for '{category}'")
        # Suggest available categories
        cats = set(l.get('category', '?') for l in mem['lessons_learned'])
        hint_keys = [k.replace('when_touching_', '') for k in mem.get('retrieval_hints', {}).keys()]
        print(f"Available categories: {sorted(cats)}")
        print(f"Available hints: {sorted(hint_keys)}")
        return

    print(f"\nLESSONS ({len(lessons)}):")
    for l in sorted(lessons, key=lambda x: x.get('importance_score', 0), reverse=True):
        sev = l['severity'].upper()
        print(f"  [{l['id']}] ({sev}) {l['lesson']}")
        if l.get('anti_pattern'):
            print(f"    ANTI: {l['anti_pattern']}")
        if l.get('fix_pattern'):
            print(f"    FIX:  {l['fix_pattern']}")
        print()


def cmd_add_lesson(lid, severity, category, lesson_text):
    """Add a new lesson with dedup check."""
    mem = load_memory()

    # Dedup: check if lesson ID already exists
    existing = [l for l in mem['lessons_learned'] if l['id'] == lid]
    if existing:
        print(f"WARNING: Lesson {lid} already exists. Incrementing recurrence_count.")
        existing[0]['recurrence_count'] = existing[0].get('recurrence_count', 0) + 1
        existing[0]['date'] = datetime.now().strftime('%Y-%m-%d')
        save_memory(mem)
        return

    new_lesson = {
        "id": lid,
        "severity": severity,
        "category": category,
        "importance_score": {"critical": 1.0, "high": 0.9, "medium": 0.7, "low": 0.5}.get(severity, 0.7),
        "lesson": lesson_text,
        "text": lesson_text,
        "date": datetime.now().strftime('%Y-%m-%d'),
        "recurrence_count": 0
    }
    mem['lessons_learned'].append(new_lesson)
    save_memory(mem)
    print(f"Added lesson {lid}: {lesson_text[:60]}...")


# ═══════════════════════════════════════════════
# CHECKPOINT & SESSION
# ═══════════════════════════════════════════════

def cmd_checkpoint(checkpoint_json=None):
    """Set or read the active checkpoint."""
    mem = load_memory()
    if checkpoint_json:
        try:
            mem['active_state']['checkpoint'] = json.loads(checkpoint_json)
        except json.JSONDecodeError as e:
            print(f"ERROR: Invalid JSON — {e}")
            sys.exit(1)
        save_memory(mem)
        print(f"Checkpoint saved: {checkpoint_json[:80]}...")
    else:
        cp = mem.get('active_state', {}).get('checkpoint')
        if cp:
            print(json.dumps(cp, indent=2))
        else:
            print("No active checkpoint.")


def cmd_session_end(summary):
    """Archive current session to history with auto-ID."""
    mem = load_memory()

    # Auto-generate next session ID
    existing_ids = [s['id'] for s in mem['session_history']]
    max_num = 0
    for sid in existing_ids:
        try:
            num = int(sid.replace('S', ''))
            max_num = max(max_num, num)
        except ValueError:
            pass
    session_id = f"S{max_num + 1:03d}"

    new_session = {
        "id": session_id,
        "date": datetime.now().strftime('%Y-%m-%d'),
        "importance_score": 0.8,
        "summary": summary
    }
    mem['session_history'].append(new_session)
    mem['active_state']['checkpoint'] = None
    mem['active_state']['wip'] = None
    mem['active_state']['last_action'] = summary[:120]
    save_memory(mem)
    print(f"Session {session_id} archived.")


# ═══════════════════════════════════════════════
# STATUS
# ═══════════════════════════════════════════════

def cmd_status():
    """Quick health check with real validation."""
    mem = load_memory()
    print(f"Memory v{mem['_meta']['version']} | Updated: {mem['_meta']['updated']}")
    print(f"Lessons: {len(mem['lessons_learned'])} | Sessions: {len(mem['session_history'])}")
    print(f"Pages: {', '.join(mem['pages'].keys())}")
    print(f"GitHub: {mem['github']['last_commit']} on {mem['github']['branch']}")
    a = mem.get('active_state', {})
    print(f"Sentinel: Run #{a.get('sentinel_run', '?')} | Issues: {a.get('sentinel_issues', '?')}")
    if a.get('checkpoint'):
        print(f"CHECKPOINT: {json.dumps(a['checkpoint'])[:100]}")

    # Quick validation
    issues = 0
    session_ids = [s['id'] for s in mem['session_history']]
    if len(session_ids) != len(set(session_ids)):
        print("  [WARN] Duplicate session IDs detected")
        issues += 1
    for l in mem['lessons_learned']:
        if l.get('text') and l.get('lesson') and l['text'] != l['lesson']:
            issues += 1
    if issues:
        print(f"  [WARN] {issues} integrity issue(s) — run --validate for details")
    else:
        print("  [OK] Memory integrity clean")


# ═══════════════════════════════════════════════
# CLI ROUTER
# ═══════════════════════════════════════════════

USAGE = """
KINTSUGI Memory System v2.1

Commands:
  --load              Session start: print hot context
  --status            Quick health check
  --validate          Deep integrity check (assets, drift, dupes)
  --lessons [CAT]     Print lessons (optional: filter by category/hint)
  --lesson ID SEV CAT TEXT   Add a new lesson
  --checkpoint [JSON]        Set or read checkpoint
  --session-end SUMMARY      Archive session
  --sync-lines        Sync page line counts from disk
  --sync-git          Sync git commit state from repo

Categories: mobile, css, github, design, fonts, workflow, assets, i18n
Hints: mobile_css, fonts, images, github, i18n, buy_flow, new_page
"""

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print(USAGE)
        sys.exit(1)

    cmd = sys.argv[1]
    if cmd == '--load':
        cmd_load()
    elif cmd == '--status':
        cmd_status()
    elif cmd == '--validate':
        issues = cmd_validate()
        sys.exit(1 if issues > 0 else 0)
    elif cmd == '--lessons':
        cmd_lessons(sys.argv[2] if len(sys.argv) > 2 else None)
    elif cmd == '--lesson' and len(sys.argv) >= 6:
        cmd_add_lesson(sys.argv[2], sys.argv[3], sys.argv[4], ' '.join(sys.argv[5:]))
    elif cmd == '--checkpoint':
        cmd_checkpoint(sys.argv[2] if len(sys.argv) > 2 else None)
    elif cmd == '--session-end' and len(sys.argv) >= 3:
        cmd_session_end(' '.join(sys.argv[2:]))
    elif cmd == '--sync-lines':
        cmd_sync_lines()
    elif cmd == '--sync-git':
        cmd_sync_git()
    else:
        print(f"Unknown command: {cmd}")
        print(USAGE)
        sys.exit(1)
