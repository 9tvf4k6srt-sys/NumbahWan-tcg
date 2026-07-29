# legacy/ — preserved for history, never run

Everything in this directory is a **fossil**: kept because it documents a
decision or a lesson, not because anything uses it. Verified at move time
(2026-07-29) — zero live references from hooks, observers, CI, package.json,
or other LIVE files.

**Rules (from ARCHITECTURE.md invariants):**
- Nothing here may gain a live reference. Need the code? Extract it into a
  LIVE path with a header noting the source.
- Append-only. Fossils go in; they don't come back out.
- Reading this directory costs tokens and teaches outdated rules. Agents:
  stay out unless a human explicitly sends you here.

## audits/ — frozen audit reports and historical plans

| File | What it was |
|---|---|
| `AUDIT-2026-04.md` | The 2026-04 refactor audit (referenced by AI_PLAYBOOK.md as history) |
| `AUDIT-guild-page-2026-06-03.md` | Guild page audit |
| `AUDIT-learning-stack-2026-06-04.md` | Learning stack audit |
| `AUDIT-mine-value-2026-06-04.md` | Mining value audit |
| `AUDIT-recursive-learning-2026-07-05.md` | **The turning-point audit** — "silent non-execution wearing a green dashboard." Still worth reading once, as history. |
| `AUDIT-token-efficiency-2026-06-03.md` | Token efficiency audit (part 1) |
| `AUDIT-token-efficiency-build-2026-06-04.md` | Token efficiency audit (part 2) |
| `LEARNING-SYSTEMS-AUDIT.md` | 2026-02 learning-systems inventory (7 loops, no event bus) |
| `SENTINEL-UPGRADE-PLAN.md` | Analysis that was judged scope creep — kept as the record of *why it wasn't done* |

The audit *program* didn't die — it became `evals/` (living, regenerable
checks) and `docs/case-studies/` (narratives with receipts). These files are
where the lessons came from.

## scripts/ — orphaned scripts (zero live references at move time)

| File | What it was | Why it's here |
|---|---|---|
| `rebalance.cjs` | One-off data rebalance | Task complete; nothing calls it |
| `mycelium-upgrade.cjs` | mycelium self-upgrade helper | Superseded by the standalone mycelium library |
| `ai-context.sh` | Pre-AGENTS.md context printer | Replaced by AGENTS.md + `node bin/ai.cjs brief` |
| `card-add.sh` | Card-adding helper | Replaced by `scripts/card-manager.sh` |
| `preflight.sh` | Pre-flight checklist | Replaced by `bin/ship-gate.cjs` + CI |
| `restore.sh` | One-off restore helper | Task complete |
| `ecosystem.config.cjs` | PM2 process config | Repo runs on Cloudflare; PM2 was sandbox-era |
| `dev-screenshot.cjs` | Screenshot helper | Replaced by backstop + dev tooling |

Root-level PoC test scripts (`test-all-games.cjs`, `test-v2-poc.cjs`) were
moved to `tests/` instead — they still run, they were just misplaced.
