# AGENT-CONTEXT.md
# Auto-bootstrap for any AI agent cloning this repo.
# Read this file FIRST before writing any code.

## Quick Start
```bash
python3 memory/memory-ops.py --load    # Bootstrap full project context
python3 memory/memory-ops.py --lessons # Show all learned rules
python3 memory/memory-ops.py --status  # Health check
```

---

## 1. Project Identity

| Field | Value |
|-------|-------|
| **Brand** | KINTSUGI -- 金繕 |
| **Tagline EN** | Beauty in Imperfection. Strength in Gold. |
| **Tagline ZH** | 不完美之美。黄金之力。 |
| **Repo** | `github.com/9tvf4k6srt-sys/NumbahWan-tcg` |
| **Server** | Python SimpleHTTPServer on port `5060`, root = `public/` |
| **Parent org** | NumbahWan Group (Guild TCG + KINTSUGI coin ecosystem) |

### KINTSUGI Pages (premium coin landing)
- `kintsugi.html` -- main landing (price ticker, staking tiers, mascots, community)
- `coin-shop.html` -- gold coin collection (Phoenix/Dragon/Qilin, 24K 999.9 fine)
- `ai-assets.html` -- AI-managed portfolio + agent gallery

### Guild Pages (~96 other HTML files)
- `index.html` -- Guild hub / TCG card game
- `arcade.html`, `battle.html`, `tavern-tales.html`, `restaurant.html`, etc.
- Shared static assets under `public/static/`

---

## 2. Owner Profile

- **Identity**: NumbahWan Group founder/operator
- **Review device**: iPhone (375px viewport), 5G, iOS Safari
- **Communication**: Direct, visual-first, action-oriented. Bilingual EN/繁中, also uses JP.
- **Feedback style**: Screenshots from iPhone with green-circle annotations = problem areas
- **Approval signal**: Silence or moving to next task = approved
- **Frustration signal**: Repeating the same feedback twice = you missed it the first time
- **Hard rules**:
  - No emoji in UI (use SVG/WebP professional icons instead)
  - No placeholder text, no "Coming Soon", no "Redirecting"
  - Dark premium fintech aesthetic always
  - Buy buttons redirect to `/buy.html` instantly (no popups, no toasts)
  - Every visible string must have EN, ZH, JP translations

---

## 3. Design System

### Colors
```
bg:           #06060c
card:         #0e0e18
card_hover:   #14142a
border:       #1e1e3a
border_glow:  rgba(201,168,76,0.25)
gold:         #c9a84c
gold_dark:    #8a6914
cyan:         #00d4ff
rose:         #e8a0bf
green:        #00d26a
red:          #ff4757
purple:       #a855f7
text:         #f0ece0
text_dim:     #8a8678
```

### Typography
```
display:  Cormorant Garamond, Noto Serif TC, serif
body:     Inter, Noto Sans TC, Noto Sans JP, system-ui, sans-serif
mono:     JetBrains Mono, Fira Code, monospace
accent:   Noto Serif TC
```

### Layout Rules
- All pages use `overflow-x: hidden` on `html, body`
- Mobile breakpoint: `@media (max-width: 768px)`
- ONE consolidated `@media` block per breakpoint per page (no competing blocks)
- Images: `max-width: 100%` on BOTH container AND `<img>`, container gets `overflow: hidden`
- Font scaling: only bump nav, body, labels, badges. Leave h1/h2/stat values/prices alone.
- Gap values: desktop 60px, mobile override to 20px

---

## 4. i18n Architecture

Each page has an inline `T` object with three locale blocks:
```javascript
const T = {
    en: { heroTitle: 'KINTSUGI', heroSub: 'Beauty in Imperfection...', ... },
    zh: { heroTitle: '金繕幣', heroSub: '世界上最安全的幣...', ... },
    jp: { heroTitle: '金繕コイン', heroSub: '世界一安全なコイン...', ... }
};
```
- Language stored in `localStorage` key: `kin_lang` (default: `en`)
- Toggle via `setLang('zh')` / `setLang('jp')` / `setLang('en')`
- `t('key')` function returns localized string
- `data-i18n="key"` attribute on HTML elements for auto-translation
- ALL user-visible strings need all 3 locales. No exceptions.

---

## 5. Navigation

Unified premium nav across all 3 KINTSUGI pages (inline, not shared JS):
```
Home        -> /kintsugi.html       (navHome)
Reserve     -> /kintsugi.html#backing (navBacking)
Collections -> /coin-shop.html      (navCollections)
AI Assets   -> /ai-assets.html      (navAI)
Staking     -> /kintsugi.html#staking (navStaking)
```
Brand displays: `KINTSUGI` with `金繕` underneath (bilingual always visible).

Buy/wallet links (`href="/wallet"`) are intercepted by JS and redirect to `/buy.html` directly. No popups, no toasts, no delays.

---

## 6. Asset Inventory

### Coin Images (`public/static/coins/`)
Pre-cropped to circular with transparent alpha. 500x500 WebP.
- `phoenix-front.webp` / `phoenix-back.webp` -- Series I inaugural
- `dragon-front.webp` / `dragon-back.webp` -- Year of the Dragon
- `qilin-front.webp` / `qilin-back.webp` -- Entry-level collection
- `hero-banner.webp` -- 1200x675 hero background

### Hero Backgrounds (`public/static/`)
- `hero-bg-kintsugi.webp` -- kintsugi.html hero
- `ai-hero-bg.webp` -- ai-assets.html hero
- `hero-coin-shop.webp` -- coin-shop.html hero

### Icons (`public/static/icons/`)
19 SVG/WebP icons for UI elements (no emoji).

### Agent Cards (`public/static/agents/`)
6 AI agent portraits for ai-assets.html.

### TCG Mascots (`public/static/s2/thumbs/`)
55+ character thumbnails for the mascot gallery.

---

## 7. Memory System

### Architecture: HOT / WARM / COLD
- **HOT** = current context window (this file + conversation)
- **WARM** = `memory/qqb-memory.json` (structured facts, survives compaction)
- **COLD** = `git log` + `session_history` in memory file (archival)

### Files
| Path | Purpose | Size |
|------|---------|------|
| `memory/qqb-memory.json` | Primary memory store | ~27KB |
| `memory/memory-ops.py` | CLI bootstrap/query tool | ~7KB |
| `.mycelium/memory.json` | Mycelium pattern memory | ~190KB |
| `.mycelium/config.json` | Mycelium config | <1KB |
| `.mycelium-mined/` | Deep intelligence (patterns, rules, risk) | ~2MB |
| `scripts/qqb-sentinel.py` | Code quality sentinel | ~33KB |
| `sentinel.cjs` | Node.js sentinel runner | ~79KB |

### CLI Commands
```bash
python3 memory/memory-ops.py --load              # Print hot context for session start
python3 memory/memory-ops.py --lessons            # List all lessons sorted by importance
python3 memory/memory-ops.py --lessons mobile     # Filter by category
python3 memory/memory-ops.py --lesson L012 high css "New lesson text"  # Add lesson
python3 memory/memory-ops.py --session-end "Summary of what was done"  # Archive session
python3 memory/memory-ops.py --checkpoint '{"wip":"task description"}' # Set checkpoint
python3 memory/memory-ops.py --status             # Quick health check
```

---

## 8. Learned Rules (Critical)

These are battle-tested rules from real production bugs. Follow them.

### CSS / Mobile (L001, L002, L004, L005, L009, L010)
- Set `max-width: 100%` on BOTH image AND container; `overflow-x: hidden` on `html,body`
- ONE `@media(max-width:768px)` block per page. Merging prevents cascade overwrites.
- Font scaling: only body text, nav, labels. Never headings or stat values.
- Large gap values need mobile overrides (60px desktop -> 20px mobile).

### GitHub (L003)
- `setup_github_environment` token is **ephemeral**. Call setup, then `git push` in the VERY NEXT command. No `git config` checks, no diagnostics between. Token expires fast.

### Workflow (L006)
- If the owner repeats feedback, DO NOT explain why your fix should work. Acknowledge, try a completely different approach, show proof.

### Assets (L007, L011)
- Generate images with transparent backgrounds for overlay elements.
- Replace ALL emoji with professional SVG/WebP icons.

### i18n (L008)
- Every user-visible string needs EN, ZH, JP. Check all three match key-for-key.

---

## 9. Server Setup

```bash
# Start local server
cd public && python3 -m http.server 5060 --bind 0.0.0.0

# Verify
curl -I http://localhost:5060/kintsugi.html  # Expect 200

# Kill
lsof -ti:5060 | xargs -r kill -9
```

No build step required -- these are static HTML pages served directly.

---

## 10. Git Workflow

```bash
# Stage + commit
git add -A && git commit -m "fix(scope): description"

# Push (Genspark sandbox -- token is ephemeral)
# Call setup_github_environment FIRST, then push IMMEDIATELY
git push origin main

# Conventional commit prefixes
feat(scope):   New feature
fix(scope):    Bug fix
refactor:      Code restructuring
style:         Visual/CSS changes
chore:         Config, deps, maintenance
```

---

## 11. Quality Checks Before Push

```bash
# JS syntax validation (run from repo root)
node -e "
const fs = require('fs');
['public/kintsugi.html','public/coin-shop.html','public/ai-assets.html'].forEach(p => {
    const html = fs.readFileSync(p,'utf8');
    const scripts = html.match(/<script[^>]*>([\s\S]*?)<\/script>/gi)||[];
    scripts.forEach((s,i) => {
        const code = s.replace(/<script[^>]*>/i,'').replace(/<\/script>/i,'');
        if(code.trim().length<10)return;
        try{new Function(code);}catch(e){console.log(p+' #'+i+': FAIL - '+e.message);}
    });
    console.log(p + ': OK');
});
"

# Remnant scan (should all return 0)
grep -ric 'showBuyToast\|coming soon\|redirecting\|卿\|qinqin' public/kintsugi.html public/coin-shop.html public/ai-assets.html

# Memory health
python3 memory/memory-ops.py --status
```

---

## 12. What NOT To Do

- Do NOT add emoji to any UI element
- Do NOT add "Coming Soon", "Redirecting", or placeholder text
- Do NOT create popup toasts for buy/wallet actions
- Do NOT use QinQin/卿/Qing anywhere (fully rebranded to KINTSUGI/金繕)
- Do NOT create competing @media blocks at the same breakpoint
- Do NOT scale heading fonts (h1/h2) -- only body text
- Do NOT run diagnostics between `setup_github_environment` and `git push`
- Do NOT use anonymous/guest/demo authentication flows
- Do NOT add floating hearts, particle bursts, confetti, or gamification elements

---

## 13. Mycelium Intelligence (Advanced)

The `.mycelium/` and `.mycelium-mined/` directories contain the self-improving code intelligence system:

- **Patterns**: Common code patterns and anti-patterns detected across the codebase
- **Decisions**: Historical decision log with context and outcomes
- **Breakages**: Past failures and their root causes
- **Learnings**: Extracted lessons from development sessions
- **Risk profiles**: Files ranked by change risk
- **Auto-rules**: Machine-generated rules from pattern analysis

Read `.mycelium-mined/db/` for structured CSV/JSON data. Read `.mycelium/memory.json` for the full snapshot.

---

*Generated by system audit. Last verified: 2026-02-11. Commit: 4e6d427.*
