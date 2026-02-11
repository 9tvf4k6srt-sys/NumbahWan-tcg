#!/usr/bin/env python3
"""
QQB Memory System — Session Bootstrap & Update Tools
Philosophy: Manus AI LTM Report (comprehensive_report.md)

Architecture:
  HOT  = current context window (session state, active task)
  WARM = qqb-memory.json (structured facts, survives compaction)
  COLD = git log + session_history (archival, queried on demand)

Usage:
  python3 memory/memory-ops.py --load          # Session start: print hot context
  python3 memory/memory-ops.py --lessons mobile # Before touching mobile CSS
  python3 memory/memory-ops.py --lesson "L011" "critical" "category" "The lesson text"
  python3 memory/memory-ops.py --session-end "summary of what happened"
  python3 memory/memory-ops.py --checkpoint '{"task":"...","pending":["..."]}'
  python3 memory/memory-ops.py --status         # Quick health
"""

import json
import sys
import os
from datetime import datetime

MEMORY_PATH = os.path.join(os.path.dirname(__file__), 'qqb-memory.json')

def load_memory():
    with open(MEMORY_PATH, 'r') as f:
        return json.load(f)

def save_memory(mem):
    mem['_meta']['updated'] = datetime.now().strftime('%Y-%m-%d')
    with open(MEMORY_PATH, 'w') as f:
        json.dump(mem, f, indent=2, ensure_ascii=False)
    print(f"Memory saved ({os.path.getsize(MEMORY_PATH)} bytes)")

def cmd_load():
    """Session start: print the minimal hot context needed to begin work."""
    mem = load_memory()
    u = mem['user_profile']
    p = mem['project']
    a = mem.get('active_state', {})

    print("=" * 60)
    print("QQB MEMORY — SESSION BOOTSTRAP")
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

    print("\n" + "=" * 60)

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
    """Add a new lesson."""
    mem = load_memory()
    new_lesson = {
        "id": lid,
        "severity": severity,
        "category": category,
        "importance_score": {"critical": 1.0, "high": 0.9, "medium": 0.7, "low": 0.5}.get(severity, 0.7),
        "lesson": lesson_text,
        "date": datetime.now().strftime('%Y-%m-%d'),
        "recurrence_count": 0
    }
    mem['lessons_learned'].append(new_lesson)
    save_memory(mem)
    print(f"Added lesson {lid}: {lesson_text[:60]}...")

def cmd_checkpoint(checkpoint_json=None):
    """Set or read the active checkpoint."""
    mem = load_memory()
    if checkpoint_json:
        mem['active_state']['checkpoint'] = json.loads(checkpoint_json)
        save_memory(mem)
        print(f"Checkpoint saved: {checkpoint_json[:80]}...")
    else:
        cp = mem.get('active_state', {}).get('checkpoint')
        if cp:
            print(json.dumps(cp, indent=2))
        else:
            print("No active checkpoint.")

def cmd_session_end(summary):
    """Archive current session to history."""
    mem = load_memory()
    session_id = f"S{len(mem['session_history']) + 1:03d}"
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

def cmd_status():
    """Quick health check."""
    mem = load_memory()
    print(f"Memory v{mem['_meta']['version']} | Updated: {mem['_meta']['updated']}")
    print(f"Lessons: {len(mem['lessons_learned'])} | Sessions: {len(mem['session_history'])}")
    print(f"Pages: {', '.join(mem['pages'].keys())}")
    print(f"GitHub: {mem['github']['last_commit']} on {mem['github']['branch']}")
    a = mem.get('active_state', {})
    print(f"Sentinel: Run #{a.get('sentinel_run', '?')} | Issues: {a.get('sentinel_issues', '?')}")
    if a.get('checkpoint'):
        print(f"CHECKPOINT: {json.dumps(a['checkpoint'])[:100]}")

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: memory-ops.py --load | --lessons [category] | --lesson ID SEV CAT TEXT | --checkpoint [JSON] | --session-end SUMMARY | --status")
        sys.exit(1)

    cmd = sys.argv[1]
    if cmd == '--load':
        cmd_load()
    elif cmd == '--lessons':
        cmd_lessons(sys.argv[2] if len(sys.argv) > 2 else None)
    elif cmd == '--lesson' and len(sys.argv) >= 6:
        cmd_add_lesson(sys.argv[2], sys.argv[3], sys.argv[4], ' '.join(sys.argv[5:]))
    elif cmd == '--checkpoint':
        cmd_checkpoint(sys.argv[2] if len(sys.argv) > 2 else None)
    elif cmd == '--session-end' and len(sys.argv) >= 3:
        cmd_session_end(' '.join(sys.argv[2:]))
    elif cmd == '--status':
        cmd_status()
    else:
        print(f"Unknown command: {cmd}")
        sys.exit(1)
