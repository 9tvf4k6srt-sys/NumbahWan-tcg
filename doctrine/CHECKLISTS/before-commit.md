# BEFORE-COMMIT CHECKLIST

**Run this before every `git commit`. If any answer is no, fix it first.**

---

## The 8 gates

1. **Word-level lint clean?**
   ```bash
   node tools/ai-tell-lint.cjs
   ```
   Must return 0. If a domain word is flagged, add a per-rule allowlist in `tools/ai-tell-corpus.json`, do not delete the rule.

2. **Burstiness lint advisory acknowledged?**
   ```bash
   node tools/burstiness-lint.cjs
   ```
   Advisory through 2026-06-06. After that = blocking. If it warns, add at least one short sentence (under 8 words) or one long sentence (over 25 words) to fix the variance.

3. **Structural lint advisory acknowledged?**
   ```bash
   node tools/structural-lint.cjs
   ```
   Counts CTAs, header/body ratio, paragraph variance. Advisory window same as burstiness.

4. **Doctrine drift check?**
   ```bash
   node tools/doctrine-check.cjs
   ```
   Verifies VOICE.md / REJECTIONS.md / PATTERNS.md / LESSONS.jsonl exist, are non-empty, and are not stale (> 30 days without review).

5. **Sensor trio green?**
   ```bash
   node tools/check-routes.cjs   # 0 dead links
   node tools/check-assets.cjs   # 0 over-budget pages
   node tools/check-motto.cjs    # canonical strings present
   ```

6. **Smoke test recorded?**
   For every route changed: `curl -s -o /dev/null -w "%{http_code} · %{size_download}B\n"`. Output goes in commit message body.

7. **Receipts for any new factual claim?**
   New copy that asserts something about a company, product, person, or number must have a `source_url` traceable in the diff. No exceptions.

8. **No bypass `--no-verify` without a paired lesson?**
   If you're bypassing for a real reason, append a `LESSONS.jsonl` entry in the same commit explaining why.

---

## Commit message format

```
<type>(<scope>): <short summary, imperative, lowercase, ≤72 chars>

WHAT SHIPPED
- bullet 1
- bullet 2

LIVE NUMBERS / VALUES (if applicable)
- ...

HONEST LIMITS
- caveat 1
- caveat 2

SMOKE
- /route 200 · 12 345 B
- sensors: routes N/0 dead · assets N pages/N assets/0 over budget · motto pass
```

Types: `feat`, `fix`, `refactor`, `chore`, `docs`, `test`, `style`, `perf`.
Scopes (most common): `desk`, `invest`, `playbooks`, `doctrine`, `tools`, `harness`.

---

## What gets a commit rejected by review

- Word-level lint failure (auto-blocked at pre-commit anyway).
- Hero sub > 30 words (caught by structural lint, soft today, hard after 2026-06-06).
- New page without trilingual `data-lang` spans on every user-facing string.
- New route without entry in `tools/anchor-preview.cjs` allowlist.
- New media (image / audio / video) without running the matching `MEDIA/` checklist.
- Claim without receipt.
- Smoke test missing from commit body.
