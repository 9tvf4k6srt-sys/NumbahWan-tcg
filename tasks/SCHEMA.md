# tasks/ — resumable task queue

One JSON file per task: `tasks/<id>.json`. Plus an auto-generated
`tasks/INDEX.md` so you can read the queue without running anything.

## Schema

```json
{
  "id": "T-2026-05-04-001",
  "title": "Clean up 投資テーゼ Japanese calques on /invest",
  "status": "pending",
  "created": "2026-05-04T10:30:00Z",
  "updated": "2026-05-04T10:30:00Z",
  "owner": "claude",
  "moves": [
    { "n": 1, "do": "Locate the 4 hits via ai-tell-lint --all", "done": false },
    { "n": 2, "do": "Replace with TW-register equivalent", "done": false },
    { "n": 3, "do": "Smoke /invest, commit, push", "done": false }
  ],
  "evidence": [],
  "notes": "From ai-tell-lint --all on 2026-05-04: 4 hits at L2965/L3061."
}
```

## Status values

- `pending` — created, not started
- `in_progress` — actively being worked
- `blocked` — needs input or external dep; `notes` says why
- `done` — finished; `evidence[]` has commit hashes / smoke results

## CLI

```sh
node tools/task.cjs new "title here"     # create
node tools/task.cjs list                 # show all
node tools/task.cjs list --open          # pending + in_progress only
node tools/task.cjs start <id>           # → in_progress
node tools/task.cjs note  <id> "text"    # append to notes
node tools/task.cjs evidence <id> "<commit hash> <link>"  # append to evidence[]
node tools/task.cjs check <id> <move-n>  # mark a move as done
node tools/task.cjs done  <id>           # → done
node tools/task.cjs block <id> "reason"  # → blocked
node tools/task.cjs show  <id>           # full json + INDEX entry
```

Every mutation regenerates `tasks/INDEX.md` automatically.

## Garbage collection

`tools/gc-drift.cjs` reports `done` tasks older than 30 days as
candidates for removal. **Default is dry-run** — `--prune` actually
deletes. Never auto-pruned by pre-commit.

## Why this exists

Multi-step work survives session boundaries. Pick up `T-2026-05-04-001`
tomorrow without re-deriving context. Evidence trail (commit hashes +
live links) is the receipt for "what shipped on this task."
