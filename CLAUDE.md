# NumbahWan TCG - AI Development Guide

> **Adaptive Continuous Learning System v2.0**
> Last Updated: 2026-02-08

## WORK RULES — READ FIRST, OBEY ALWAYS

These rules are calibrated to the owner's building style. Violating them wastes time and money.

### Rule 1: BUILD, DON'T STUDY
- Read MAX 2 files before writing code. The conversation history + this file has enough context.
- If you need info from a file, grep for the specific thing — don't read the whole file.
- NEVER read the same file twice in one session.
- The owner builds fast — 142K insertions in a single commit, 5800-line features in one shot. Match that energy.

### Rule 2: ONE CONTINUOUS FLOW
- When told to build something, execute ALL steps without stopping:
  Write files → Build → Test → Commit → Push. ONE FLOW.
- NEVER output a summary paragraph between tool calls. Just chain the next call.
- NEVER say "let me continue" or "now I have the full picture" — those are stop signals.
- If a tool call fails, fix it immediately. Don't stop to explain what happened.

### Rule 3: WRITE COMPLETE FILES
- Write the ENTIRE file in one Write call. Not pieces. Not chunks.
- The owner's codebase has files up to 3000+ lines. One-shot writes are normal here.
- If a file is too large, write the complete replacement. Don't do 10 small edits.

### Rule 4: COST EFFICIENCY
- Don't read files that the conversation history already described.
- Batch independent tool calls together (read 3 files in parallel, not sequentially).
- Skip todo lists for tasks under 5 steps. Just do the work.
- One commit per feature, not one commit per file.

### Rule 5: MATCH THE OWNER'S STYLE
- The owner thinks in SYSTEMS, not files. Build complete features end-to-end.
- The owner values FUN over perfection. Ship it working, make it perfect later.
- The owner asks big questions ("make it the funnest ever") — respond with big builds, not incremental patches.
- When the owner says "brainstorm" → think big. When the owner says "build" → write code NOW.
- The owner builds on Cloudflare Workers + Hono + Vanilla JS. No frameworks. No React. Keep it vanilla.

### Rule 6: NEVER STOP MID-TASK
- If you wrote a file, you MUST build + test + commit in the same flow.
- If you hit an error, fix it immediately. Don't pause to ask permission.
- The owner should NEVER have to say "continue" or "are you done?" — if they do, you failed this rule.

### Rule 7: ADAPTIVE AWARENESS
- Port 3000 via wrangler pages dev. PM2 process name: numbahwan-guild.
- After changing ANY file in public/ or src/: run `npm run build && pm2 restart all`
- The staticPages array in src/routes/pages.ts controls which pages are routed.
- .ai-cache/ has optimized context — check there before deep-reading source files.

### Build Command Cheat Sheet
```bash
npm run build && pm2 restart all && sleep 2   # Build + restart
curl -s http://localhost:3000/PAGE | head -5   # Verify page
pm2 logs --nostream --lines 3                  # Check errors
git add -A && git commit -m "msg" && git push origin main  # Ship it
```

---

## 🧠 Project Intelligence

### Quick Start
```bash
# Build & Run
npm run build && pm2 restart nwtcg

# Test locally
curl http://localhost:8080/api/health

# Get service URL
# Use GetServiceUrl tool with port 8080
```

### Architecture Overview
```
/home/user/webapp/
├── src/index.tsx          # Main Hono server (4300+ lines)
├── public/                # Static HTML pages (70+ pages)
│   └── static/           # JS modules, CSS, assets
├── .ai-cache/            # Optimized context cache
└── scripts/              # Build & maintenance tools
```

## 📊 Learning Database

### Known Issues & Solutions

| Issue | Pattern | Solution | Status |
|-------|---------|----------|--------|
| iOS Touch Double-Fire | `touchend` fires twice | Add flag to prevent double execution | ✅ Resolved |
| Language Toggle Fail | Stale event listeners | Clone buttons, use both click+touchend | ✅ Resolved |
| CORS on Translation | Direct Google API call | Server-side proxy at `/api/translate/free` | ✅ Resolved |
| Back Button Black Screen | `history.back()` unreliable | Always use direct navigation | ✅ Resolved |
| Viewport Zoom Lock | `user-scalable=no` | Use `maximum-scale=5.0, user-scalable=yes` | ✅ Resolved |
| Mobile Cramped Layout | Fixed control bar | Stack vertically, larger touch targets | ✅ Resolved |

### Performance Patterns

| Pattern | Impact | Implementation |
|---------|--------|----------------|
| RAG Cache Optimization | 97% token savings | `.ai-cache/optimized-context.json` |
| Static Page Routing | Fast HTML serving | `staticPages` array in index.tsx |
| Image Lazy Loading | Faster initial load | `loading="lazy"` on images |
| CSS Containment | 60fps animations | `contain: content` on sections |

### Code Conventions

```javascript
// ✅ DO: Use NW_ prefix for global modules
const NW_WALLET = { ... };
const NW_CURRENCY = { ... };
const NW_DND = { ... };

// ✅ DO: Use data-page-id for navigation
<body data-page-id="tavern-tales">

// ✅ DO: Support all 3 languages
name: { en: 'Home', zh: '首頁', th: 'หน้าหลัก' }

// ✅ DO: Use unified currency icons
NW_CURRENCY.icon('nwg', 16) // Returns SVG

// ❌ DON'T: Lock zoom on mobile
// ❌ DON'T: Use window.history.back() alone
// ❌ DON'T: Call external APIs from frontend (CORS)
```

## 🔄 Development Workflow

### Adding New Pages
1. Create HTML in `public/`
2. Add to `staticPages` array in `src/index.tsx` (line ~3779)
3. Add to `NW_NAV.sections` in `public/static/nw-nav.js`
4. Add to `pageHierarchy` for back button support
5. Build & test

### Adding New Features
1. Check existing modules in `public/static/nw-*.js`
2. Follow the `NW_` naming convention
3. Add i18n support for all 3 languages
4. Test on mobile (iOS Safari especially)
5. Commit with conventional commits

### Git Workflow
```bash
# Always on genspark_ai_developer branch
git checkout genspark_ai_developer

# Commit immediately after changes
git add -A && git commit -m "type: description"

# Push and create/update PR
git push origin genspark_ai_developer
```

## 📁 Key Files Reference

### Core Systems
| File | Purpose |
|------|---------|
| `src/index.tsx` | Main server, API routes, static page routing |
| `public/static/nw-nav.js` | Unified navigation, back button, language |
| `public/static/nw-wallet.js` | Wallet, GM mode, streak protection |
| `public/static/nw-currency.js` | Currency icons and formatting |
| `public/static/nw-dnd-engine.js` | D&D game engine for Tavern Tales |

### Data Files
| File | Contents |
|------|----------|
| `public/static/data/cards.json` | Season 1 cards (109 cards) |
| `public/static/data/cards-s2.json` | Season 2 cards |
| `public/static/nw-config.js` | Global configuration, patch notes |

### Cache Files
| File | Purpose |
|------|---------|
| `.ai-cache/summaries.json` | Compressed file summaries |
| `.ai-cache/optimized-context.json` | Token-optimized context |
| `.ai-cache/quick-reference.md` | Auto-generated reference |

## 🎯 Current Project State

### Recently Completed
- [x] Research Library with 500 papers
- [x] Streak Protection System
- [x] Featured Card Rotation
- [x] Collection Value Leaderboard
- [x] Tavern Tales D&D Spectator
- [x] Intuitive Back Button
- [x] Mobile Layout Improvements

### Active Systems
- 10 Seasons of cards (583 total)
- 70+ HTML pages
- 80+ API endpoints
- 3 languages (EN/ZH/TH)
- GM mode with infinite resources

### Known Technical Debt
- [ ] Some pages missing nw-nav.js
- [ ] Inconsistent i18n coverage
- [ ] Some hardcoded URLs

## 🚀 Optimization Tips

### For Speed
1. Use `.ai-cache/quick-reference.md` for fast lookups
2. Check `staticPages` array before creating routes
3. Use `grep` for finding patterns across files

### For Quality
1. Always test on mobile viewport
2. Check iOS Safari touch handling
3. Verify back button works on new pages
4. Test all 3 languages

### For Consistency
1. Follow existing naming conventions
2. Use existing UI components from `nw-components.js`
3. Match the tavern/guild theme

## 📈 Metrics to Track

| Metric | Target | Current |
|--------|--------|---------|
| Build Time | < 3s | ~1.8s |
| Token Savings | > 95% | 97% |
| Mobile Usability | All pages | In progress |
| i18n Coverage | 100% | ~85% |

---

*This file is automatically referenced by Claude Code for project context.*
*Update when major patterns or solutions are discovered.*
