# Contributing to NumbahWan

Thanks for your interest in contributing! This project is a vanilla JS web experience with 116 pages, and there's plenty of room to help.

## Quick Start

```bash
git clone https://github.com/9tvf4k6srt-sys/NumbahWan-tcg.git
cd NumbahWan-tcg
npm install
npm run build
npx wrangler pages dev dist --port 3000
```

Open `http://localhost:3000` — you should see the guild homepage.

## Project Structure

- `public/` — 116 HTML pages, each self-contained with inline CSS/JS
- `public/static/nw-*.js` — 62 shared JS modules
- `src/routes/` — 30 API route handlers (Hono + TypeScript)
- `sentinel.cjs` — Standalone codebase health scanner
- `mycelium.cjs` — AI session memory system
- `scripts/` — 29 build and audit tools

## Good First Contributions

### Add an Oracle Wisdom
The Oracle has 20 wisdoms per language across 15 life topics. To add one:

1. Open the Oracle route in `src/routes/oracle.ts`
2. Find the `fallbackWisdoms` array
3. Add a new entry following the 5-part format:
   - **Empathy opener** — validate the feeling
   - **Ancient Consensus** — one insight each from Buddhism, Taoism, Bible, Quran
   - **Funny Truth** — genuine humor, not mockery
   - **Do This Today** — one concrete action
   - **Oracle's Seal** — reframe the situation positively
4. Add translations for all 3 languages (EN, ZH, TH)

### Fix a Sentinel Issue
Run `node sentinel.cjs` and pick any issue to fix. The scanner reports across 10 modules with specific file paths and suggestions.

### Add a New Page
Every page is a standalone HTML file in `public/`. Copy any existing page as a template. Remember to:
- Add `data-i18n` attributes for all visible text
- Register translations with `NW_I18N.register()`
- Include translations for EN, ZH (繁體中文), and TH (ภาษาไทย)
- Add the page to `src/routes/pages.ts` if it needs a clean URL

### Improve i18n Coverage
Run `node scripts/audit-i18n.cjs` to see which pages have missing translations.

## Development Workflow

### The Memory System
This project uses git hooks to track development context:

```bash
# Before your first commit, create a session marker:
echo $(date +%s) > .nw-session

# Before touching a sensitive area:
node mycelium.cjs --premortem <area>

# After discovering something important:
node mycelium.cjs --constraint "area" "what you learned"
```

The post-commit hook automatically snapshots your work. This isn't required for external contributors, but it helps if you're doing multi-session work.

### Running Tests

```bash
npm test              # All tests
npm run test:api      # API route tests
npm run test:html     # HTML validation
npm run sentinel      # Codebase health check
```

### Code Style

- **No frameworks** — this is vanilla JS by design
- **Self-contained pages** — each HTML file should work independently
- **i18n required** — all user-visible text needs EN/ZH/TH translations
- **Self-hosted assets** — no external CDN dependencies at runtime

## Commit Messages

We use conventional commits:

```
feat(oracle): add wisdom about career changes
fix(i18n): missing Thai translation on museum page
docs: update README tool descriptions
```

## Questions?

Open an issue or check the [showcase](https://numbahwan.pages.dev/showcase) to understand the full scope of the project.
