# CLAUDE.md — read this first, no exceptions

You are an AI agent (Claude, Cursor, Codex, Copilot, anything) about to write code or copy in this repository. Before you do **anything else**, read `/doctrine/README.md` and the files it points to. The operator has paid for every rule in there with prior pushback. Skipping doctrine is the #1 reason your output gets rejected.

---

## The 3-minute mandatory induction

1. Open `/doctrine/README.md` — get the lay of the land (≤30 seconds).
2. Open `/doctrine/VOICE.md` — internalize the register (2 minutes).
3. Open `/doctrine/REJECTIONS.md` — know what's banned (1 minute).
4. Skim the last 5 entries of `/doctrine/LESSONS.jsonl` (10 seconds).
5. Run `/doctrine/CHECKLISTS/before-build.md` 10 questions in your response before writing code.

If your task involves images, audio, video, or infographics, also read the matching file in `/doctrine/MEDIA/`. Generated media leaks AI sheen worse than text.

## Repo at a glance

- **Project:** PINFORGE Wealth (品峰財富管理) — Taipei-rooted boutique advisor surfaces. Three primary surfaces: `/invest`, `/desk` (Taiwan AI-hardware), `/playbooks`.
- **Server:** `tools/anchor-preview.cjs` on port 8765. Hard-coded route allowlist (NOT Cloudflare Pages). New routes need a branch added in that file.
- **Doctrine:** `/doctrine/` — voice, rejections, patterns, lessons, checklists, media rules. Source of truth for AI agents.
- **Lints:** `tools/ai-tell-lint.cjs` (word-level, blocking) · `tools/burstiness-lint.cjs` (sentence-variance, advisory until 2026-06-06) · `tools/structural-lint.cjs` (shape, advisory until 2026-06-06).
- **Sensors:** `tools/check-routes.cjs` · `tools/check-assets.cjs` · `tools/check-motto.cjs` · `tools/doctrine-check.cjs`.
- **Audit trail:** `tools/verify.cjs` (receipt confirmation), `tools/lesson-log.cjs` (doctrine learning loop), `tools/distill.cjs` (lesson promotion proposal).
- **Branch:** work happens on `genspark_ai_developer` and gets PR'd into `main`.

## Three rules that, if broken, get you reverted

1. **No fake confidence on draft data.** If `verify_status: draft`, copy must reflect that. The desk has receipt badges for a reason — copy must mirror the discipline.
2. **No claim without a receipt.** Source URL, date, signed-by initials. Vague language fails.
3. **No buy/sell price predictions.** We give zones. Stock-price forecasts are rejected even with caveats.

## Voice in one sentence (memorize)

PINFORGE is a senior Taipei boutique partner: dry English, Taipei-street 繁中, formal-direct 日本語. Receipts before opinions. Iron-clad before bold. The names rotate. The discipline doesn't.

## Build response format the operator expects

Every push response includes:
- What shipped (bullet list)
- Live numbers (if applicable)
- Honest limits (caveats)
- Smoke test (HTTP code · payload size for changed routes)
- Live link · PR link · commit hash
- Three options for next push (1️⃣ / 2️⃣ / 3️⃣) with time estimates

See `/doctrine/CHECKLISTS/before-pr.md` for the full template.

## Workflow loop

```
read doctrine → answer before-build checklist → build → smoke test
  → before-commit checks → commit → before-pr checks → push → PR
  → if rework, append lesson via tools/lesson-log.cjs
  → every 20 lessons, run tools/distill.cjs and propose doctrine updates
```

The repo gets sharper with use. Don't break the loop.

## When in doubt

Ask the operator. The response pattern they prefer: numbered diagnosis (Problem 1 / 2 / 3), three options with time estimates, single recommendation. Not paragraphs of explanation. Not committee-speak.

---

**This file is the front door. `/doctrine/` is the building.** Read both.
