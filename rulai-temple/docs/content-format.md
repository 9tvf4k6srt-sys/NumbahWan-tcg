# Content Format Guide

> How to write and edit content markdown files in `content/`.

## Overview

Each markdown file in `content/` represents one section of the website. The build script
(`scripts/compile-content.js`) parses these files and generates `src/content-data.ts`.

**You never edit `src/content-data.ts` directly.** Always edit `content/*.md`, then run `npm run content`.

## Markdown Table Format

Content is stored in markdown tables. There are two formats:

### Key-Value Config Tables

For non-translatable settings:

```markdown
| Key | Value |
|-----|-------|
| background | /static/images/bg_hero.webp |
| overlay | dark |
```

### Trilingual Content Tables

For translatable text:

```markdown
| Key | zh | en | th |
|-----|----|----|-----|
| title | 中文標題 | English Title | ชื่อภาษาไทย |
| body | 中文內容... | English content... | เนื้อหาภาษาไทย... |
```

### Gallery/List Tables

For arrays of items with mixed data:

```markdown
| src | alt | zh | en | th |
|-----|-----|----|----|-----|
| /path/image.webp | Alt text | 中文標題 | English | ไทย |
```

## File Naming Convention

| File | Section |
|------|---------|
| `site.md` | Global config (meta, nav, fonts, footer) |
| `hero.md` | Hero section |
| `trailer.md` | Video trailer |
| `history.md` | History/Origin timeline |
| `about.md` | About cards |
| `abbot.md` | Abbot profile |
| `services.md` | Services list |
| `gallery.md` | Photo gallery |
| `vision.md` | Renovation vision |
| `visit.md` | Visit info |

## Adding a New Section

1. Create `content/new-section.md` following the table format above
2. Add parsing logic in `scripts/compile-content.js`
3. Add the section template in `src/index.tsx`
4. Run `npm run content && npm run build`

## Editing Existing Content

1. Open the relevant `content/*.md` file
2. Edit the table cell values (preserve table formatting)
3. Run `npm run content` to regenerate the data
4. Run `npm run build` to rebuild

## Rules

- **Never edit `src/content-data.ts` manually** — it gets overwritten by `npm run content`
- **Keep table formatting clean** — the parser expects standard markdown tables
- **Escape pipes** in content with `\|` if your text contains the `|` character
- **H2 and H3 headings** structure the data hierarchy (H2 = section group, H3 = item)
- **Chinese is the default language** — `zh` content is what shows on initial page load
