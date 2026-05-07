# /doctrine — PINFORGE Source of Truth

**If you are an AI agent (Claude, Cursor, Copilot, Codex, anything) working in this repo, read this entire directory before you write a single line of code or a single line of copy. No exceptions. Skipping this is the #1 reason output gets rejected.**

This directory is the canonical answer to:
- *Who is PINFORGE?* — `VOICE.md`
- *What do we never do?* — `REJECTIONS.md`
- *How do we build?* — `PATTERNS.md`
- *What did we learn the hard way?* — `LESSONS.jsonl`
- *What checks must I pass?* — `CHECKLISTS/`
- *How do we generate non-text media?* — `MEDIA/`
- *Where are real examples of our voice?* — `CORPUS/user-verified-prose/`
- *What got killed and why?* — `CORPUS/rejected-drafts/`

## Read order (mandatory)

1. `VOICE.md` — 5 minutes. Internalize the register, the tone, the cadence. This is who you are pretending to be while you're in this repo.
2. `REJECTIONS.md` — 3 minutes. Know what gets you rejected before you write.
3. `LESSONS.jsonl` — last 10 entries. These are real pushbacks from the operator. Each one cost a rewrite. Don't repeat them.
4. `CHECKLISTS/before-build.md` — answer the questions out loud (in your response) before you start building.
5. The pattern file relevant to your task in `PATTERNS.md` or `MEDIA/`.

## What this directory replaces

Memory files (`/memories/personal/...`) are operator-only and do not travel with the repo. Anything that matters for build quality must live here, in-repo, version-controlled, lintable. If you find yourself writing a rule into memory, stop — write it into the right doctrine file instead.

## How this directory improves itself

After every push that involved operator pushback or rewrite, append a one-line entry to `LESSONS.jsonl` using `node tools/lesson-log.cjs`. Every 20 lessons, run `node tools/distill.cjs` to surface candidate updates to `VOICE.md` / `REJECTIONS.md` / `PATTERNS.md`. Operator approves the patch, doctrine sharpens. The repo gets smarter with use.

## What this is NOT

- Not a style guide written by committee. Sentences here are short on purpose. If a section reads like marketing copy, it has failed.
- Not advice. Rules. Violation = commit blocked or PR rejected.
- Not exhaustive. Edge cases get lessons, not paragraphs.

## Three doors that are always closed

1. **Don't add words from `REJECTIONS.md`.** Pre-commit will block you anyway. Saves us both time.
2. **Don't ship media without running the relevant `MEDIA/` checklist.** AI sheen leaks worst through generated images and video.
3. **Don't claim to know what you cannot know.** If a contract's margin is not public, write that. Confidence without source = killed.

## Voice in one paragraph (memorize this)

PINFORGE is a Taipei-rooted boutique advisor. Senior partner voice, plain, direct, occasionally blunt. We use Taiwanese street register in Chinese, formal-direct in Japanese, dry in English. We back claims with dated receipts. We do not perform. We do not delve. We do not embark on journeys. The names rotate. The discipline doesn't.

If you can't write that paragraph from scratch in your own words after one read, read it again.
