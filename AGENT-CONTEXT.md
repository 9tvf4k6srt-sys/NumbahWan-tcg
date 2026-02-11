# AGENT-CONTEXT.md — Premium AI Setup for NumbahWan / KINTSUGI

> **Purpose**: Any AI agent (Claude, Cursor, Copilot, ChatGPT, Genspark) cloning this repo
> gets full project context, design rules, and operational knowledge in one read.
> This file replaces hours of onboarding. Read it FIRST before touching any code.

---

## 1. Project Identity

| Key | Value |
|-----|-------|
| **Brand** | KINTSUGI (金繕) |
| **Tagline EN** | Beauty in Imperfection. Strength in Gold. |
| **Tagline ZH** | 不完美之美。黃金之力。 |
| **Tagline JP** | 不完全の美。金の力。 |
| **Ticker** | $KIN |
| **Parent** | NumbahWan Group |
| **Repo** | `9tvf4k6srt-sys/NumbahWan-tcg` |
| **Stack** | Static HTML/CSS/JS + Python SimpleHTTPServer (port 5060) |
| **Philosophy** | Japanese art of repairing broken pottery with gold. What is broken becomes more beautiful. |

---

## 2. Owner Profile

- **Role**: NumbahWan Group founder/operator
- **Communication**: Direct, visual-first, action-oriented. Bilingual EN/Traditional Chinese.
- **Review Device**: iPhone (375px viewport), iOS Safari
- **Languages**: EN, Traditional Chinese (繁中), Japanese (JP)
- **Quality Bar**: No emoji as icons. No placeholder text. No amateur gradients. Real professional assets only.

### Decision Pattern Decoder

| Signal | Meaning | Action |
|--------|---------|--------|
| Screenshot with green circles | These spots need fixing | Fix exactly those spots |
| Says "plz" | Wants immediate action | Do it now, no discussion |
| Repeats same feedback | Previous fix failed | Try completely different approach |
| "Too big" / "revert" | Overshot | Go subtle, 50% of what you did |
| Screenshot without comment | This is the problem | Figure it out, don't ask |
| Silence or next task | Approved | Move on |

### Critical Frustration Triggers

1. **Images overflowing mobile viewport** — Fix: Triple-layer overflow (html + body + container, all max-width:100%)
2. **Fonts too big breaking layout** — Fix: Only bump 9-13px text to 11-15px. NEVER touch headings/stat values/ticker prices
3. **Repeated failed approaches** — Fix: If method fails twice, abandon entirely. Try opposite approach
4. **Being asked obvious questions** — Fix: Just do it. Ask forgiveness not permission
5. **Placeholder/emoji in production** — Fix: Use professional SVG/WebP. Generate if missing
6. **GitHub auth burning time** — Fix: `setup_github_environment` then IMMEDIATELY push. No diagnostics between

---

## 3. Design System

### Colors

```css
:root {
  --bg:          #06060c;
  --card:        #0e0e18;
  --card-hover:  #14142a;
  --border:      #1e1e3a;
  --border-glow: rgba(201,168,76,0.25);
  --gold:        #c9a84c;
  --gold-dark:   #8a6914;
  --cyan:        #00d4ff;
  --rose:        #e8a0bf;
  --green:       #00d26a;
  --red:         #ff4757;
  --purple:      #a855f7;
  --text:        #f0ece0;
  --text-dim:    #8a8678;
}
```

### Typography

| Role | Stack |
|------|-------|
| Display | `Cormorant Garamond, Noto Serif TC, serif` |
| Body | `Inter, Noto Sans TC, Noto Sans JP, system-ui, sans-serif` |
| Mono | `JetBrains Mono, monospace` |
| Accent | `Orbitron, sans-serif` |

### Aesthetic

Premium dark fintech. Luxury gold meets tech. Not crypto-bro, more Swiss-bank-meets-silicon.

---

## 4. Mobile Rules (CRITICAL)

Every mobile bug the owner has flagged comes down to these rules. Violate them and you will be asked to revert.

```css
/* VIEWPORT LOCK */
<meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no, maximum-scale=1.0">

/* TRIPLE-LAYER OVERFLOW PROTECTION */
html, body { overflow-x: hidden; max-width: 100vw; }
* { max-width: 100vw; }  /* nuclear catch-all */
.section, .feature-row, .feature-img { max-width: 100%; overflow: hidden; }
img { max-width: 100%; height: auto; display: block; }

/* WORD SAFETY */
* { word-break: keep-all; overflow-wrap: break-word; }

/* SINGLE MOBILE BLOCK — never add a second one for the same breakpoint */
@media (max-width: 768px) {
  /* ALL mobile rules go here. Second block will override first via cascade. */
}

/* FONT SCALING */
/* Only bump 9-13px text to 11-15px. Leave 16px+ alone. */
/* NEVER touch h1, h2, stat values, or ticker prices. */
```

**Breakpoints**: Primary 768px. Secondary: 600px, 560px, 900px.

---

## 5. Architecture

### Page Structure

| Page | Role | Lines | Features |
|------|------|-------|----------|
| `kintsugi.html` | Main landing ($KIN token) | ~1894 | Ticker, asset grid, staking tiers, endorsements, gold drift particles |
| `coin-shop.html` | Gold Collection shop | ~1096 | 3 coin cards (Phoenix/Dragon/Qilin), spot pricing, circular pre-cropped images |
| `ai-assets.html` | AI Asset Manager (Beta) | ~844 | 6 TCG agent cards, coverage grid, beta metrics |

### Navigation

- Inline premium nav bar per page (not nw-nav.js — these are KINTSUGI premium pages)
- Fixed top, z-10000, translucent backdrop-blur, gold border
- Hamburger on mobile
- Language toggle: EN / 繁中 / JP
- Brand: KINTSUGI + 金繕 (bilingual, always visible)

### i18n System

- **kintsugi.html** uses localStorage key `kintsugi_lang`
- **coin-shop.html** and **ai-assets.html** use localStorage key `kin_lang`
- All pages: EN/ZH-TW/JP coverage
- Event name: `nw-lang-change` (NOT `nw-language-change`)
- Every user-visible string needs all 3 locale translations

### Buy Flow

- No toast popups, no "Coming Soon" text
- Buy buttons redirect directly to `/buy.html`
- `showBuyToast()` function = `window.location.href = '/buy.html'`

---

## 6. Assets

### Coin Images (pre-cropped circular, transparent alpha)

| Coin | Front | Back | Weight | Purity |
|------|-------|------|--------|--------|
| Phoenix Rebirth / 鳳凰重生 | `coins/phoenix-front.webp` | `coins/phoenix-back.webp` | 1 Troy Oz | 999.9 |
| Dragon's Mend / 龍脈金繕 | `coins/dragon-front.webp` | `coins/dragon-back.webp` | 1/2 Oz | 999.9 |
| Qilin's Grace / 麒麟祥瑞 | `coins/qilin-front.webp` | `coins/qilin-back.webp` | 1/4 Oz | 999.9 |

### AI Agents (TCG cards, 500x669)

Aurelius (Gold), Sentinel (Green), Cipher (Purple), Bastion (Cyan), Nexus (Blue), Oracle (Rose)

### All paths relative to `public/static/`

---

## 7. Memory System — How It Works

### Quick Start

```bash
# Session bootstrap (read this first)
python3 memory/memory-ops.py --load

# Check health
python3 memory/memory-ops.py --status

# Deep validation (catches drift before it becomes a bug)
python3 memory/memory-ops.py --validate

# Before touching mobile CSS
python3 memory/memory-ops.py --lessons mobile

# Before pushing to GitHub
python3 memory/memory-ops.py --lessons github

# After making changes, sync line counts
python3 memory/memory-ops.py --sync-lines

# After committing, sync git state
python3 memory/memory-ops.py --sync-git

# End of session
python3 memory/memory-ops.py --session-end "Summary of what you did"
```

### Memory Architecture

```
HOT   = Current session context (in your context window)
WARM  = memory/qqb-memory.json (structured facts, survives compaction)
COLD  = git history + .mycelium/ (archival, queried on demand)
```

### Key Files

| File | Purpose | Size |
|------|---------|------|
| `memory/qqb-memory.json` | Core memory: user profile, project state, lessons, sessions | ~29KB |
| `memory/memory-ops.py` | CLI tool: bootstrap, validate, sync, lesson management | ~7KB |
| `.mycelium/memory.json` | Mycelium learning system memory | ~190KB |
| `.mycelium/config.json` | Mycelium configuration | ~1KB |
| `.mycelium-mined/` | Deep intelligence: patterns, risk profiles, rules | ~2MB |
| `scripts/qqb-sentinel.py` | Health check automation (legacy name) | ~33KB |

### Validation Commands

```bash
# Run before every push — catches 8 types of drift:
python3 memory/memory-ops.py --validate

# Checks:
# 1. Session ID uniqueness (no duplicates)
# 2. Lesson text/lesson field sync
# 3. Lesson ID uniqueness
# 4. Asset path validation (all referenced files exist)
# 5. Page line count accuracy
# 6. Dead feature detection (removed features still in metadata)
# 7. localStorage key consistency (no stale references)
# 8. Git state sync (stored hash matches actual HEAD)
```

---

## 8. Lessons Learned (Anti-Regression Guards)

These are PERMANENT. Every lesson was learned from a real production bug. Check them before touching related code.

| ID | Severity | Category | Lesson |
|----|----------|----------|--------|
| L001 | CRITICAL | mobile | Always set max-width:100% on BOTH image AND container. html/body overflow-x:hidden. |
| L002 | CRITICAL | css | Never two @media blocks for same breakpoint. Last one wins via cascade. |
| L003 | CRITICAL | github | setup_github_environment token is ephemeral. Push IMMEDIATELY after. No diagnostics between. |
| L004 | HIGH | design | User reviews on iPhone 375px. Both container AND img need max-width:100% + overflow:hidden. |
| L005 | HIGH | fonts | Font scaling +15% body text only. NEVER touch headings, stat values, ticker prices. |
| L006 | HIGH | workflow | When user repeats feedback: acknowledge, try completely different approach, show proof. |
| L007 | MEDIUM | assets | Replace emoji with professional SVG/WebP. Generate if missing. |
| L008 | MEDIUM | i18n | All pages need matching EN/ZH-TW/JP coverage. Language keys: kintsugi_lang or kin_lang. |
| L009 | CRITICAL | mobile | Global * { max-width:100vw } prevents ANY element from escaping viewport. |
| L010 | HIGH | css | Desktop gap:60px bleeds into mobile. Explicitly reduce to 20px in mobile block. |
| L011 | HIGH | workflow | Use nano-banana-pro for all image generation. |

---

## 9. Related Systems

| System | Purpose | Key File |
|--------|---------|----------|
| **Mycelium** | Self-improving codebase learning | `.mycelium/`, `mycelium.cjs` |
| **Sentinel** | Health check automation | `scripts/qqb-sentinel.py` |
| **NW Nav** | Universal navigation (Guild pages) | `public/static/nw-nav.js` |
| **NW i18n** | Internationalization (Guild pages) | `public/static/nw-i18n-core.js` |
| **NW Wallet** | Economy system ($1 = 100 NWG) | `public/static/nw-wallet.js` |

---

## 10. Server & Deployment

```bash
# Start local server
cd public && python3 -m http.server 5060 --bind 0.0.0.0

# Ship to GitHub (uses Mycelium)
node bin/mycelium.cjs ship "feat: description"

# Or manual push
git add . && git commit -m "feat: description" && git push origin main
```

---

## 11. Progressive Improvement Protocol

This system gets smarter over time. Here's how to feed it:

### After Fixing a Bug
```bash
python3 memory/memory-ops.py --lesson L012 critical mobile "Description of what went wrong and the fix"
```

### After a Session
```bash
python3 memory/memory-ops.py --session-end "Built X, fixed Y, decided Z"
```

### Before Any Code Change
```bash
# Check if there's a lesson about what you're about to touch
python3 memory/memory-ops.py --lessons mobile   # or css, fonts, images, github, i18n
```

### After Committing
```bash
python3 memory/memory-ops.py --sync-git
python3 memory/memory-ops.py --sync-lines
```

---

## 12. What NOT to Do

- Do not use emoji as UI icons in production
- Do not add a second @media block for the same breakpoint
- Do not explain why a fix should work — just show the result
- Do not ask obvious questions — make decisions and show proof
- Do not use placeholder text or Lorem Ipsum
- Do not update font sizes for headings, stat values, or ticker prices
- Do not use `qqb_lang` — it's been replaced with `kintsugi_lang` / `kin_lang`
- Do not add "Coming Soon" or toast popups for unavailable features
- Do not run git diagnostics between `setup_github_environment` and `git push`

---

*Generated by KINTSUGI Memory System v2.1 | Last updated: 2026-02-11*
*Run `python3 memory/memory-ops.py --validate` to verify system integrity.*
