# REJECTIONS — What we don't do, and why

This file is the negative space of `VOICE.md`. Every entry is a rule that, if violated, gets your work rejected. Most are enforced by lints. The rest are enforced by the operator and recorded in `LESSONS.jsonl` when missed.

Two categories: **WORD-LEVEL** (specific phrases, regex-blockable, hard fail) and **STRUCTURAL** (shape of the writing, harder to detect, soft fail in advisory mode for first 30 days then hard fail).

---

## WORD-LEVEL rejections (hard fail at pre-commit)

Authoritative source for the regex enforcement: `tools/ai-tell-corpus.json`. This file is the human-readable companion. They must agree. If you add to one, add to the other.

### English filler / AI tells

| Phrase | Why banned | Acceptable substitute |
|---|---|---|
| delve, delve into | classic AI tell | examine, dig into, look at |
| tapestry | hollow metaphor | drop it, name the thing |
| pivotal | vague importance-claim | specific outcome ("doubled revenue", "killed the deal") |
| furthermore, moreover | connective filler | start a new sentence |
| state-of-the-art | empty | name the actual feature |
| cutting-edge | empty | name the actual feature |
| world-class | empty | name a specific peer comparison |
| paradigm shift | empty | describe the change concretely |
| in a world where… | wind-up opener | open with the thing |
| journey through, embark on, your journey | tourism metaphor | working verbs |
| testament to | hagiography | "shows that", "proves" |
| navigate (generic) | empty | "find", "choose", "decide" |
| leverage (verb) | corporate-comms | "use", "apply" |
| elevate, elevate your | aspirational hollow | concrete verb |
| robust | tech-marketing filler | specific quality ("survives 10× load") |
| vibrant | empty adjective | name the colors / concrete details |
| showcase (verb, marketing) | performance register | "show", "list" |
| craft (verb, marketing) | precious | "build", "write" |
| unleash, unlock potential | aspirational | concrete capability |
| comprehensive, holistic | catch-all hedge | name the parts |
| seamlessly | always a lie | describe the transitions honestly |
| in today's fast-moving market | wind-up | drop the wind-up |
| em-dash flooding (3+ in one paragraph) | rhythm tell | use commas, periods |
| exclamation marks in body copy | tone tell | drop them |

### 繁中 calques and AI buzz

| Phrase | Why banned | Acceptable substitute |
|---|---|---|
| 在這個快速變化的市場中 | 啟動式贅語 | 直接講事 |
| 為您打造 | 翻譯腔 + 過度自吹 | 「我們做的這一套」 |
| 讓我們一起 / 攜手共創 | 無內容口號 | 具體下一步 |
| 賦能 | 中國互聯網黑話 | 「給工具」、「給資源」 |
| 全方位 / 一站式 | 萬用空話 | 列出實際範圍 |
| 沉浸式 (非字面) | AI 譯文味 | 描述具體體驗 |
| 解鎖 (比喻用法) | AI 譯文味 | 「拿到」、「打開」 |
| 都在你手上 | 翻譯腔 | 「股票你自己抓著」 |
| 預約 30 分鐘第一次聊聊 | 翻譯腔 | 「先約 30 分鐘,坐下來聊」 |
| 卷軸 (在編輯文脈, 非遊戲卡牌) | AI 中譯 scroll 直譯 | 「卷宗」 / 「報告」 |
| 〜之旅 | tourism metaphor 中譯 | drop it |

### 日本語 calques

| Phrase | Why banned | Acceptable substitute |
|---|---|---|
| 〜の世界へ | tourism metaphor | drop |
| 〜への旅 | tourism metaphor | drop |
| 〜を解き放つ | unlock metaphor | concrete verb |
| 〜のタペストリー | tapestry calque | drop |
| パラダイムシフト | calque | concrete change |
| シナジー (非ゲーム) | calque | drop or specify |
| 〜させていただきます chains (3+ in a paragraph) | over-keigo | です/ます plain |
| ブランド・イン・ザ・ワイルド | flagged 2026-04 | drop |
| 巻物 (in editorial context) | calque | 報告書 / 文書 |

---

## STRUCTURAL rejections (advisory through 2026-06-06, then hard fail)

These are detected by `tools/burstiness-lint.cjs` and `tools/structural-lint.cjs`. Quantified so the lint can act.

### Sentence-length variance (burstiness)

**Rule:** within any 6-sentence window, the standard deviation of word counts must be ≥ 5.0. Below that = monotone AI cadence.

**Why:** the single biggest detectability lever. Human writing has bursty rhythm. AI without explicit prompting flatlines around 14–18 words per sentence.

**How to fix:** insert a short sentence (under 8 words). Or merge two with a conjunction into one long one.

### Paragraph-length variance

**Rule:** within any 5-paragraph block, no more than 2 paragraphs may have word counts within ±15% of each other. Three nearly-equal paragraphs = AI shape.

**How to fix:** the long-form copy should have a 3-word standalone paragraph somewhere. We are not afraid of single-line paragraphs.

### CTA discipline (hero blocks)

**Rule:** maximum 2 CTAs in any hero / above-the-fold block. 3+ blocks the commit.

**Why:** the "two roads" co-headline failure of Push 6 was this exact structural problem. One product per landing.

### Header / body ratio

**Rule:** in any page, body word count ÷ header word count must be ≥ 8.0. Below that = listicle-shaped AI output, not editorial.

**Exception:** index/landing pages with intentional headline emphasis can opt out via a comment marker `<!-- doctrine:skip header-ratio -->`.

### Hero sub-paragraph length

**Rule:** hero sub-paragraph max 30 words. Above 30 = wind-up.

**Source:** Push 6 lesson — "80-word sub-paras in hero".

### Forbidden structures

| Structure | Why |
|---|---|
| Three CTAs in a hero | violates one-product rule |
| Co-headlines for two products | violates one-product rule |
| Lead with posture before product | "we sit on your side" before "what we do" — kills time |
| 3+ adjectives stacked on a noun | "innovative, comprehensive, robust solution" |
| Bullet lists where every bullet starts with the same verb | listicle AI shape |
| Paragraphs that begin with "Furthermore," / "Moreover," / "Additionally," | banned connectives |
| Numbered lists with 7+ items | break into two lists or condense |

---

## Doctrine rejections (architectural, not phrase-level)

These cause review rejection even if all word-level / structural lints pass.

1. **Confidence on draft data.** A sentence written as fact when the underlying input is `verify_status: draft`. The desk has receipt-status badges for a reason. Copy must mirror that discipline.
2. **Inventing a receipt.** A claim with no `source_url`, no `dated`, no analyst initials. Pre-commit doesn't catch this; the operator does. Always.
3. **Stock-price prediction.** We give zones, not numbers. "Buy at NT$485" is rejected even when surrounded by caveats.
4. **Margin claims on private contracts.** We can know contract value (when MOPS discloses it). We cannot know margin. Saying we can = killed.
5. **Shipping without smoke test.** Smoke output (HTTP code + payload size) goes in every push response. Skipping it = rework.
6. **Shipping without live link.** Operator preference, recorded in memory. Build links are part of the answer, not an afterthought.
7. **80-word hero sub-paragraphs.** See structural rule.
8. **Co-headlining two products.** See structural rule.
9. **Splash overlays / "loading" screens on real pages.** Killed in Push 5. Don't reintroduce.
10. **"Newest models" claims that drift.** If the model lineup is hard-coded, a date stamp is mandatory.

---

## Why all this exists

Three reasons.

1. The operator's bar is high. Without explicit rules, every conversation re-discovers them through pushback. Expensive.
2. AI tells leak through word filters because they are *structural*. Burstiness, paragraph variance, listicle shape — those are how detectors find AI text. Word lints alone are necessary but insufficient.
3. The repo has to outlast any single conversation window. Every rule here has been paid for in prior pushback. They are not theoretical.

When you find a new rejection — operator pushback, detector flagged something, post-merge regret — append a lesson via `node tools/lesson-log.cjs`. The distill pass will surface it for promotion into this file.

---

**Last reviewed:** 2026-05-06
**Mode:** word-level = blocking · structural = advisory until 2026-06-06 then blocking
**Bypass:** `git commit --no-verify` exists for emergencies. Every bypass requires a lesson-log entry with reason within 24 hours, or the operator reviews and reverses.
