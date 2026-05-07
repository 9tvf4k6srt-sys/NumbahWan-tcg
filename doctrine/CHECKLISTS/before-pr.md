# BEFORE-PR CHECKLIST

**Run this before opening or updating a pull request. The PR is what the operator and any reviewer actually sees.**

---

## The 7 gates

1. **Sync with remote.**
   ```bash
   git fetch origin main
   git rebase origin/main
   ```
   Resolve conflicts prioritizing remote unless local change is essential. Document essential-local-keeps in commit message.

2. **Squash all per-push commits into one.**
   Non-interactive method:
   ```bash
   git reset --soft HEAD~N && git commit -m "<comprehensive message>"
   ```
   Where N is the number of work commits since the last clean point. Comprehensive message follows `before-commit.md` format.

3. **All sensor trio green on final state.**
   Re-run after squash, paste output into PR description.

4. **All smoke tests recorded for changed routes.**
   Final HTTP codes + sizes in PR body.

5. **Live links provided.**
   - Live page URL (sandbox or deployed)
   - PR URL
   - Commit hash
   See VOICE.md / memory rule: this triple is non-negotiable.

6. **Doctrine touched if rules changed.**
   If this PR introduced a new pattern, anti-pattern, or rejection — those files must be updated in the same PR. Doctrine and code ship together.

7. **LESSONS.jsonl appended if rework happened.**
   If the operator made you rewrite anything in this PR cycle, that's a lesson. Capture it via `node tools/lesson-log.cjs` so the next session doesn't repeat it.

---

## PR description template

```
## What shipped
- ...

## Live numbers / values (if applicable)
- ...

## Honest limits
- ...

## Smoke
- /route 200 · 12 345 B
- sensors: ...

## Links
- Live: https://...
- PR: https://github.com/.../pull/N
- Commit: <sha>

## Doctrine touched
- VOICE.md: no
- REJECTIONS.md: no
- PATTERNS.md: yes — added P-### for [pattern name]
- LESSONS.jsonl: yes — L-### appended for [lesson]

## Three options for next push
1️⃣ ...
2️⃣ ...
3️⃣ ...
Reply 1, 2, or 3.
```

---

## Common PR rejections

- "PR doesn't show live numbers." Always include them when the change touches a number-producing surface.
- "Smoke missing." Always paste the curl output.
- "No follow-up options." End every PR with the three-options decision close.
- "Doctrine drifted but no doctrine commits." If you noticed a new pattern, you must capture it. Don't leave it for the next session.
