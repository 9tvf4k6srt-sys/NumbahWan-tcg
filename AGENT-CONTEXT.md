# AGENT-CONTEXT.md — NumbahWan TCG AI Agent Onboarding

> **Purpose**: Any AI agent cloning this repo gets full project context, design rules,
> and operational knowledge in one read. Read FIRST before touching code.
>
> **CRITICAL**: This repo contains **two brand surfaces** that coexist. The owner
> switches between them. Read Section 1 carefully before touching any page.

---

## 1. Project Identity — Two Brands, One Repo

This repo serves **two distinct brands** under the NumbahWan Group umbrella.
The owner actively works on both. **Never merge their aesthetics.**

| Key | Value |
|-----|-------|
| **Parent** | NumbahWan Group |
| **Repo** | `9tvf4k6srt-sys/NumbahWan-tcg` |
| **Stack** | Hono (Cloudflare Workers) + Static HTML/CSS/JS (port 3000) |

### Brand A: NumbahWan (NW) — Guild / TCG / Game Pages

| Key | Value |
|-----|-------|
| **Identity** | NumbahWan TCG — Trading Card Game + Guild Warfare |
| **Design Theme** | Golden Age MMORPG Protocol (EverQuest/RO/Lineage inspired) |
| **Ticker** | $NWG (NumbahWan Gold) |
| **Primary Color** | Ember orange `#ff6b00` |
| **Background** | `#0a0a0f` |
| **Fonts** | NumbahWan (brand), Orbitron (headings), Inter (body) |
| **Languages** | EN, Traditional Chinese (繁中), Thai (TH) |
| **Pages** | `guild-siege.html`, `wallet.html`, and future guild/game pages |
| **Nav** | `nw-nav.js` (universal NW nav with hamburger + lang toggle) |
| **i18n storage** | `nw_lang` |

### Brand B: KINTSUGI (金繕) — Premium Gold / Token Pages

| Key | Value |
|-----|-------|
| **Identity** | KINTSUGI — Beauty in Imperfection. Strength in Gold. 不完美之美。黃金之力。 |
| **Philosophy** | Japanese art of repairing broken pottery with gold |
| **Ticker** | $KIN |
| **Primary Color** | KINTSUGI gold `#c9a84c` |
| **Background** | `#06060c` |
| **Fonts** | Cormorant Garamond / Noto Serif TC (display), Inter (body), Orbitron (accent) |
| **Languages** | EN, Traditional Chinese (繁中), Japanese (JP) |
| **Pages** | `kintsugi.html`, `coin-shop.html`, `ai-assets.html`, `buy.html` |
| **Nav** | Inline premium nav (separate from nw-nav.js) |
| **i18n storage** | `kintsugi_lang` (kintsugi.html), `kin_lang` (coin-shop, ai-assets) |

### Which Brand Am I Working On?

| If the owner mentions... | Brand | Design system to use |
|--------------------------|-------|---------------------|
| Guild, siege, TCG, party, cards, NW | **NumbahWan** | Ember #ff6b00, NumbahWan/Orbitron/Inter fonts, nw-tokens.css |
| KINTSUGI, $KIN, coins, gold collection, ai-assets | **KINTSUGI** | Gold #c9a84c, Cormorant Garamond/Noto Serif TC, luxury fintech |
| wallet, buy | Check context | Could be either — look at which nav system the page uses |

---

## 2. Owner Profile

- **Role**: NumbahWan Group founder/operator
- **Communication**: Direct, visual-first, action-oriented
- **Review Device**: iPhone (375px viewport), iOS Safari
- **Languages**: EN, Traditional Chinese, Thai
- **Quality Bar**: No emoji as icons. No placeholder text. No amateur gradients. Professional assets only.
- **Work Style**: "plz" = act now. Screenshot = fix what you see. Silence = approved. Repeated feedback = try opposite approach.

### Critical Frustration Triggers

1. **Images overflowing mobile viewport** — Triple-layer overflow protection required
2. **Fonts too small/big on mobile** — Only bump 9-13px to 11-15px. Never touch headings/stat values
3. **Repeated failed approaches** — If method fails twice, abandon. Try opposite
4. **Being asked obvious questions** — Just do it
5. **Placeholder/emoji in production** — Use professional SVG/WebP
6. **GitHub auth delays** — `setup_github_environment` then IMMEDIATELY push

---

## 3. Design Systems (Two Brands)

### NumbahWan (NW) Design Tokens — Guild/TCG Pages

```css
:root {
  --bg:        #0a0a0f;   /* NW dark background */
  --bg2:       #12121a;
  --card-bg:   #0e0e18;
  --border:    #1e1e3a;
  --primary:   #ff6b00;   /* Ember orange — NW signature */
  --gold:      #ffd700;
  --gold-dim:  #b8860b;
  --cyan:      #00d4ff;
  --green:     #00d26a;
  --red:       #ff4757;
  --purple:    #a855f7;
  --text:      #f0ece0;
  --text-dim:  #8a8678;
}
```

| Role | Font | Source |
|------|------|--------|
| **Brand/Display** | `NumbahWan` | `/static/fonts/NumbahWan-Regular.woff2`, `.ttf` |
| **Headings/Data** | `Orbitron` (variable) | `/static/fonts/orbitron-variable.woff2` |
| **Body** | `Inter` (variable) | `/static/fonts/inter-variable.woff2` |

CSS source: `nw-tokens.css`, `nw-core.css`, `nw-utilities.css`. Use `clamp()` for headings.

### KINTSUGI Design Tokens — Premium/Gold Pages

```css
:root {
  --bg:          #06060c;
  --card:        #0e0e18;
  --card-hover:  #14142a;
  --border:      #1e1e3a;
  --border-glow: rgba(201,168,76,0.25);
  --gold:        #c9a84c;   /* KINTSUGI signature gold */
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

| Role | Font |
|------|------|
| **Display** | `Cormorant Garamond, Noto Serif TC, serif` |
| **Body** | `Inter, Noto Sans TC, Noto Sans JP, system-ui, sans-serif` |
| **Accent** | `Orbitron, sans-serif` |
| **Mono** | `JetBrains Mono, monospace` |

Aesthetic: Premium dark fintech. Luxury gold meets tech. Swiss-bank-meets-silicon.

### DO NOT Cross-Contaminate

- **NW pages**: Never use Cinzel, Cormorant Garamond, or KINTSUGI gold `#c9a84c`
- **KINTSUGI pages**: Never use NumbahWan font, ember `#ff6b00`, or MMORPG UI patterns
- Both share: Inter (body), Orbitron (accent), dark backgrounds, mobile overflow rules

---

## 4. Mobile Rules (CRITICAL)

```css
/* VIEWPORT LOCK */
<meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no, maximum-scale=1.0">

/* TRIPLE-LAYER OVERFLOW PROTECTION */
html, body { overflow-x: hidden; max-width: 100vw; }
* { max-width: 100vw; }
img { max-width: 100%; height: auto; display: block; }

/* SINGLE MOBILE BLOCK per breakpoint */
@media (max-width: 768px) { /* ALL mobile rules here */ }

/* FONT SCALING */
/* Bump 9-13px to 11-15px. Leave 16px+ alone. */
/* NEVER touch h1, h2, stat values, timer, or ticker prices. */
```

**Breakpoints**: Primary `768px`. Secondary: `600px`, `560px`.

---

## 5. Architecture

### Server

| Component | Tech | Details |
|-----------|------|---------|
| **Runtime** | Hono on Cloudflare Workers | `src/index.ts` |
| **Dev** | `npm run dev` | Port 3000 (wrangler pages dev) |
| **Routing** | `src/routes/pages.ts` | Static pages map + redirects |
| **Static** | `public/` | All HTML/CSS/JS/assets served from here |

### Pages

| Page | Route | Role |
|------|-------|------|
| `guild-siege.html` | `/guild-siege` | Guild Siege — Golden Age MMORPG card warfare |
| `kintsugi.html` | `/kintsugi` | KINTSUGI landing (legacy $KIN token) |
| `coin-shop.html` | `/coin-shop` | Gold Collection shop |
| `ai-assets.html` | `/ai-assets` | AI Asset Manager (Beta) |
| `wallet.html` | `/wallet` | NW Wallet / Economy |
| `buy.html` | `/buy` | Purchase flow |

### Navigation

| Page type | Nav system | Lang toggle |
|-----------|-----------|-------------|
| NW / Guild pages | `nw-nav.js` (universal, hamburger) | EN / 繁中 / TH |
| KINTSUGI pages | Inline premium nav (per-page) | EN / 繁中 / JP |

### i18n System

- **Core**: `public/static/nw-i18n-core.js` — `NW_I18N.register({ en, zh, th })` or `{ en, zh, jp }`
- **Usage**: HTML `data-i18n="key"` + JS `NW_I18N.t('key', 'fallback')`
- **Event**: `nw-lang-change` (NOT `nw-language-change`)
- **Rule**: Every user-visible string needs all locale translations for that page's brand

| Page type | localStorage key | Languages |
|-----------|-----------------|----------|
| NW / Guild | `nw_lang` | EN / ZH-TW / TH |
| kintsugi.html | `kintsugi_lang` | EN / ZH-TW / JP |
| coin-shop, ai-assets | `kin_lang` | EN / ZH-TW / JP |

### NW Core Systems

| System | File | Purpose |
|--------|------|---------|
| **NW Tokens** | `public/static/nw-tokens.css` | Design tokens, clamp() typography, color vars |
| **NW Core** | `public/static/nw-core.css` | Base component styles |
| **NW Utilities** | `public/static/nw-utilities.css` | Utility classes |
| **NW Nav** | `public/static/nw-nav.js` | Universal navigation |
| **NW i18n** | `public/static/nw-i18n-core.js` | Internationalization |
| **NW Wallet** | `public/static/nw-wallet.js` | Economy ($1 = 100 NWG) |
| **NW Icons** | `public/static/nw-icons-inline.js` | Premium SVG icon system |
| **Click Juice** | `public/static/click-juice.js` | Micro-interactions |

---

## 6. Guild Siege — Golden Age MMORPG Protocol

The siege page implements five pillars from golden_age_mmorpg_analysis.pdf:

| Pillar | Implementation |
|--------|---------------|
| **Forced Grouping** | Holy Trinity party (Tank/Healer/DPS/Support) — mathematically impossible solo |
| **Harsh Death Penalties** | PvE: -15% XP, PvP: -10% XP + card drop, Corpse run: 5 min |
| **Variable-Ratio Loot** | MVP Zakum: 0.01% legendary, 2.5% epic, standard otherwise |
| **Slow Progression** | Rank 7/10, Season III milestones, 12 hidden synergies |
| **Social Interdependence** | Card slot system (8 sockets), guild standings, karma PvP |

### Siege UI Tabs

1. **Siege** — Castle map (5 towers + throne), siege timer, battle log, actions
2. **Party** — Holy Trinity assignment, synergy bonuses, role chips
3. **Card Slots** — 8 equipment sockets (RO-style), hidden synergies
4. **MVP Hunt** — Zakum boss (1M HP, 3 phases), DPS meter, loot table
5. **Karma PvP** — Lineage-style karma meter, death penalties, PvP actions
6. **Standings** — Guild rankings, siege history, rank progression, milestones

---

## 7. Assets

### Fonts (public/static/fonts/)

| Font | Files |
|------|-------|
| NumbahWan | `NumbahWan-Regular.woff2`, `NumbahWan-Regular.ttf` |
| Orbitron | `orbitron-variable.woff2` |
| Inter | `inter-variable.woff2` |

### Icons & Images

- Favicon: `/static/icons/favicon-32x32.webp`
- Coin images: `coins/phoenix-front.webp`, `dragon-front.webp`, `qilin-front.webp` (+ backs)
- AI Agent cards: Aurelius, Sentinel, Cipher, Bastion, Nexus, Oracle (500x669)
- All paths relative to `public/static/`

---

## 8. Agent-First Infrastructure

### API Endpoints (Runtime — for programmatic access)

| Endpoint | Tokens | Purpose |
|----------|--------|---------|
| `GET /api/agent/brief` | ~2K | Minimum viable context to start working |
| `GET /api/agent/context` | ~8K | Full structured context for deep sessions |
| `GET /api/agent/rules` | ~1K | Hard constraints that prevent regressions |
| `GET /api/agent/health` | ~3K | Unified health scores across all systems |
| `GET /api/agent/files` | ~2K | File map with sizes and hot paths |
| `GET /api/agent/task` | ~1K | Work queue + auto-generated suggestions |
| `GET /api/agent/diff` | ~1K | Recent changes for context |

### CLI Tools (Local — for agents with shell access)

```bash
node bin/agent-brief.cjs --quick      # ~500 tokens, instant state
node bin/agent-brief.cjs --onboard    # Full first-time context
node bin/agent-brief.cjs --rules      # Hard constraints
node bin/agent-brief.cjs --health     # Health scores
node bin/agent-brief.cjs --workflow   # Git workflow steps
```

### Discovery Files

| File | Purpose |
|------|---------|
| `/.well-known/ai-plugin.json` | OpenAI plugin spec + agent endpoint registry |
| `/llms.txt` | Human-readable AI visitor guide |
| `/llms-full.txt` | Deep technical details |
| `AGENT-CONTEXT.md` | This file — full onboarding |
| `CLAUDE.md` | Claude-specific session protocol |

### Recommended Agent Workflow

1. `GET /api/agent/brief` (or `node bin/agent-brief.cjs --quick`)
2. `GET /api/agent/rules` (know what NOT to break)
3. Make changes
4. `node sentinel.cjs --guard` (validate)
5. Commit + PR

---

## 9. Memory & Tooling

### Mycelium System

```
HOT   = Current session context (your context window)
WARM  = .mycelium/memory.json (structured facts — DO NOT read directly, ~190KB)
COLD  = git history (archival)
```

| Tool | Purpose |
|------|---------|
| `.mycelium/` | Self-improving codebase learning |
| `scripts/qqb-sentinel.py` | Health check automation |
| `memory/memory-ops.py` | CLI: bootstrap, validate, sync, lessons |

### Token Budget Rule

- Hard 200K token budget per session (input + output)
- Never read `.mycelium/memory.json` directly (~186K tokens)
- Prefer `Edit` over `Read+Write` for large files
- After 4+ tool results, assume 50% budget used

---

## 10. Deployment

```bash
# Dev server
npm run dev  # Hono + Wrangler on port 3000

# Ship
git add . && git commit -m "feat: description" && git push origin main
```

---

## 11. Lessons Learned (Anti-Regression)

| ID | Severity | Category | Lesson |
|----|----------|----------|--------|
| L001 | CRITICAL | mobile | max-width:100% on BOTH image AND container. html/body overflow-x:hidden. |
| L002 | CRITICAL | css | Never two @media blocks for same breakpoint. Last one wins. |
| L003 | CRITICAL | github | setup_github_environment token is ephemeral. Push IMMEDIATELY. |
| L004 | HIGH | design | Owner reviews on iPhone 375px. Container + img need max-width:100%. |
| L005 | HIGH | fonts | Font scaling +15% body only. NEVER touch headings/stat/ticker. |
| L006 | HIGH | workflow | Repeated feedback = try completely different approach. |
| L007 | MEDIUM | assets | Replace emoji with professional SVG/WebP. |
| L008 | MEDIUM | i18n | All pages need EN/ZH-TW/TH (or JP for KINTSUGI). Use NW_I18N.register(). |
| L009 | CRITICAL | mobile | Global * { max-width:100vw } prevents viewport escape. |
| L010 | HIGH | css | Desktop gap:60px bleeds mobile. Reduce to 20px in mobile block. |
| L011 | HIGH | workflow | Use nano-banana-pro for all image generation. |
| L012 | HIGH | branding | NW pages use NumbahWan/Orbitron/Inter. KINTSUGI pages use Cormorant Garamond/Noto Serif TC. Never cross. |
| L013 | HIGH | i18n | Use t() wrapper for all JS-generated strings: `const t = (k,fb) => NW_I18N.t(k,fb) || fb` |
| L014 | CRITICAL | branding | Two brands coexist in one repo. Check which brand a page belongs to BEFORE editing. See Section 1. |

---

## 12. What NOT to Do

- Do not use emoji as UI icons in production
- Do not add a second @media block for the same breakpoint
- Do not use Cinzel/Cormorant/KINTSUGI gold (#c9a84c) on NW/Guild pages
- Do not use NumbahWan font/ember #ff6b00/MMORPG patterns on KINTSUGI pages
- Do not explain why a fix should work — show the result
- Do not ask obvious questions — make decisions and show proof
- Do not update font sizes for headings, stat values, or ticker prices
- Do not use Python SimpleHTTPServer — the stack is Hono/Cloudflare (port 3000)
- Do not read `.mycelium/memory.json` directly (186K tokens)
- Do not add "Coming Soon" or toast popups for unavailable features

---

*NumbahWan TCG Agent Context v4.0 | Updated: 2026-02-12*
*Two brands: NumbahWan (Guild/TCG) + KINTSUGI (Premium/Gold). Never merge aesthetics.*
*Agent-first: /api/agent/* endpoints + bin/agent-brief.cjs CLI*
