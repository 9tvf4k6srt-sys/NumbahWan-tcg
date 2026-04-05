# Data Models — All JSON Data Schemas

> Documents every JSON data file in `public/static/data/` and key configs.

> For AI models: read this to understand data structures without opening each file.


## Data Files (32 files)

### `avatar-components.json` (8KB)
- **Type**: Object
- **Top keys**: `version`, `lastUpdated`, `description`, `slots`, `components`, `presets`, `generationSettings`
- **Purpose**: Avatar builder components: hair, eyes, outfits, accessories.

### `card-queue.json` (553B)
- **Type**: Object
- **Top keys**: `description`, `instructions`, `pending`, `completed`, `exampleEntry`
- **Purpose**: Card generation queue for factory.

### `card-templates.json` (11KB)
- **Type**: Object
- **Top keys**: `version`, `description`, `globalSettings`, `masterPromptStructure`, `imagePromptTemplates`, `likenessFromReference`, `cardDefaults`, `imageFileNaming`, `quickReference`, `cssFrameSystem`
- **Purpose**: Card template definitions for generation.

### `cards-s10.json` (21KB)
- **Type**: Object
- **Top keys**: `version`, `season`, `seasonName`, `seasonSubtitle`, `lastUpdated`, `totalCards`, `lore`, `newMechanics`, `categories`, `cards`

### `cards-s2.json` (45KB)
- **Type**: Object
- **Top keys**: `version`, `season`, `seasonName`, `seasonSubtitle`, `lastUpdated`, `totalCards`, `lore`, `newMechanics`, `categories`, `cards`

### `cards-s3.json` (56KB)
- **Type**: Object
- **Top keys**: `version`, `season`, `seasonName`, `seasonSubtitle`, `lastUpdated`, `totalCards`, `lore`, `newMechanics`, `categories`, `cards`

### `cards-s4.json` (56KB)
- **Type**: Object
- **Top keys**: `version`, `season`, `seasonName`, `seasonSubtitle`, `lastUpdated`, `totalCards`, `lore`, `newMechanics`, `categories`, `cards`

### `cards-s5.json` (52KB)
- **Type**: Object
- **Top keys**: `version`, `season`, `seasonName`, `seasonSubtitle`, `lastUpdated`, `totalCards`, `lore`, `newMechanics`, `categories`, `cards`

### `cards-s6.json` (52KB)
- **Type**: Object
- **Top keys**: `version`, `season`, `seasonName`, `seasonSubtitle`, `lastUpdated`, `totalCards`, `lore`, `newMechanics`, `categories`, `cards`

### `cards-s7.json` (51KB)
- **Type**: Object
- **Top keys**: `version`, `season`, `seasonName`, `seasonSubtitle`, `lastUpdated`, `totalCards`, `lore`, `newMechanics`, `categories`, `cards`

### `cards-s8.json` (23KB)
- **Type**: Object
- **Top keys**: `version`, `season`, `seasonName`, `seasonSubtitle`, `lastUpdated`, `totalCards`, `lore`, `newMechanics`, `categories`, `cards`

### `cards-s9.json` (21KB)
- **Type**: Object
- **Top keys**: `version`, `season`, `seasonName`, `seasonSubtitle`, `lastUpdated`, `totalCards`, `lore`, `newMechanics`, `categories`, `cards`

### `cards-v2.json` (65KB)
- **Type**: Object
- **Top keys**: `version`, `lastUpdated`, `totalCards`, `lore`, `roles`, `categories`, `rarityInfo`, `cards`, `model`, `lastRebalance`
- **Purpose**: Master card database. 117 cards with id, name, rarity, role, stats, abilities, art paths.

### `config.json` (3KB)
- **Type**: Object
- **Top keys**: `version`, `lastUpdated`, `site`, `currencies`, `features`, `gacha`, `market`, `vipTiers`, `social`, `meta`
- **Purpose**: Global site configuration: colors, API endpoints, feature flags.

### `game-mechanics.json` (17KB)
- **Type**: Object
- **Top keys**: `version`, `gameName`, `tagline`, `designPhilosophy`, `coreRules`, `cardTypes`, `cardStats`, `gamblingMechanics`, `turnStructure`, `keywords`
- **Purpose**: Game mechanics: battle rules, card abilities, damage formulas.

### `lore-index.json` (14KB)
- **Type**: Object
- **Top keys**: `version`, `lastUpdated`, `totalDives`, `secretsTotal`, `categories`, `deepDives`, `artPrompts`, `interactiveElements`, `continuousImprovement`
- **Purpose**: Lore deep-dive index: 17 entries across 5 categories.

### `navigation.json` (7KB)
- **Type**: Object
- **Top keys**: `version`, `lastUpdated`, `mainNav`, `businessNav`, `secondaryNav`, `governmentNav`, `quickLinks`, `footerLinks`
- **Purpose**: Site navigation structure. mainNav + subNav with i18n labels (en/zh/th).

### `oracle-wisdom.json` (136KB)
- **Type**: Array[22]
- **Top keys**: `tags`, `tagsZh`, `tagsTh`, `text`, `zh`, `th`
- **Purpose**: 20 curated wisdoms for the Oracle. Tags, 5-part responses in 3 languages.

### `pages.json` (6KB)
- **Type**: Object
- **Top keys**: `version`, `lastUpdated`, `pages`, `routeAliases`
- **Purpose**: Page metadata: titles, descriptions, keywords for SEO.

### `performance.json` (7KB)
- **Type**: Object
- **Top keys**: `lastUpdated`, `snapshots`, `performanceStats`, `weeklyHighlights`, `commentary`
- **Purpose**: Performance tracking data.

### `photos.json` (2KB)
- **Type**: Object
- **Top keys**: `guildPhotos`
- **Purpose**: Guild photo gallery metadata.

### `physical-origins-set.json` (8KB)
- **Type**: Object
- **Top keys**: `version`, `setId`, `setName`, `subtitle`, `releaseDate`, `totalCards`, `printRun`, `rarityDistribution`, `cardIds`, `cards`
- **Purpose**: Physical card set: print specs, pricing, edition info.

### `regina-dlc-manifest.json` (34KB)
- **Type**: Object
- **Top keys**: `meta`, `zones`, `suites`, `deckMap`, `globalStats`
- **Purpose**: DLC manifest for Regina expansion.

### `regina-stories.json` (67KB)
- **Type**: Object
- **Top keys**: `meta`, `ui`, `constructionStories`, `deckMap`, `credits`
- **Purpose**: Regina narrative content.

### `regina.json` (27KB)
- **Type**: Object
- **Top keys**: `meta`, `ship`, `ui`, `sections`, `cta`, `gallery`
- **Purpose**: R.M.S. Regina ship data: specs, history, rooms.

### `roster.json` (6KB)
- **Type**: Object
- **Top keys**: `previousCP`, `lastUpdated`, `members`, `guildStats`
- **Purpose**: Guild member roster with name, level, CP, contribution, role, avatar, online status.

### `seasons.json` (15KB)
- **Type**: Object
- **Top keys**: `version`, `currentSeason`, `maxSeasons`, `lastUpdated`, `seasons`, `progression`
- **Purpose**: Card season definitions and release dates.

### `sentinel-history.json` (29KB)
- **Type**: Object
- **Top keys**: `entries`, `created`, `trend`
- **Purpose**: Sentinel health score history over time.

### `sentinel-report.json` (154KB)
- **Type**: Object
- **Top keys**: `engine`, `version`, `timestamp`, `project`, `summary`, `modules`, `metrics`, `issues`, `plan`, `i18n`
- **Purpose**: Latest sentinel health report.

### `showcase-live.json` (55KB)
- **Type**: Object
- **Top keys**: `generated`, `version`, `currentScores`, `stats`, `impact`, `dailyTimeline`, `commitTimeline`, `bundleTrend`, `scoreTrend`, `milestones`
- **Purpose**: Live showcase data for the mycelium dashboard.

### `tabletop-stats.json` (262KB)
- **Type**: Object
- **Top keys**: `version`, `generated`, `sourceFile`, `totalCards`, `designNotes`, `cards`
- **Purpose**: D&D stats for all cards (CR, HP, AC, abilities).

### `translations.json` (17KB)
- **Type**: Object
- **Top keys**: `en`, `zh`, `th`, `photoTranslations`, `langFlags`, `langCodes`
- **Purpose**: i18n translations for common UI strings in en/zh/th.


## Season Card Files

Season-specific card data files (`cards-s2.json` through `cards-s10.json`).
Each contains an array of card objects for that season with:
- `id`, `name`, `rarity`, `role`, `stats` (atk/def/hp)
- `ability`, `flavorText`, `art` (image path), `thumb` (thumbnail path)


## Research Papers (501 files)

Location: `public/static/research-data/paper-{1..500}.json` + `papers-index.json`

Each paper JSON:
```json
{
  "id": 1,
  "title": "...",
  "category": "Gaming|Gambling|Consumer Behavior|...",
  "keywords": ["..."],
  "content": "# Full markdown article...",
  "references": "..."
}
```

Categories: Gaming (188), Gaming Behavior (99), Consumer Psychology (76), 
Gambling (50), Cross-Cultural Gaming (33), Cheating (10), and 15 more.


## i18n Files

- `public/static/i18n.json` — Main translation file
- `public/static/i18n.js` — i18n runtime loader
- `public/world/dlc-12-abyssal-temple.i18n.json` — DLC-specific translations
- `public/world/nwg-the-game.i18n.json` — Game page translations


## Config Files

| File | Purpose |
|------|---------|
| `package.json` | Dependencies, scripts, project metadata |
| `tsconfig.json` | TypeScript config (ESNext, Bundler resolution) |
| `vite.config.ts` | Vite build config with Hono Cloudflare Pages plugin |
| `vitest.config.ts` | Test runner config |
| `wrangler.jsonc` | Cloudflare Workers config (D1, KV, R2 bindings) |
| `biome.json` | Linter/formatter config |
| `.nw-config.json` | NumbahWan project config |
| `ecosystem.config.cjs` | PM2 process manager config |
| `public/manifest.json` | PWA manifest |
| `public/.well-known/ai-plugin.json` | AI plugin discovery |
| `public/.well-known/pcp.json` | PCP protocol config |
