# NumbahWan Project Snapshot
> Auto-generated: 2026-02-04 05:30

## Pages (63 total)
```
about,academy,ai-lounge,apply,arcade,basement,battle,battle-legacy,breakroom,business,buy,cafeteria,card-bridge,card-print-template,cards,citizenship,collection,conspiracy,court,crafts,deckbuilder,embassy,exchange,fashion,forge,fortune,guide,historical-society,hr,index,intelligence,invest,jobs,lost-found,maintenance,market,markets,matchalatte,memes,menu-demo,merch,museum,my-business,nwg-shop,parking,pvp,pvp-battle,realestate,regina,research,restaurant,restaurants,services,supermarket,tcg,therapy,tournament,treasury,updates,vault,wallet,wyckoff,zakum
```

## Features Implemented

### Economy
- 74 files with economy logic
- Currencies: NWG, Wood, Gold, Diamond, Sacred Logs
- Daily login rewards (7-day streak)
- GM mode (infinite currency)

### Cards & Collection
- 11 card data files (seasons)
- Card upgrade system (1-5★)
- Card burning for Sacred Logs
- Forge/Gacha system

### Battle
- Luck-based battle (3 cards)
- Difficulty levels
- Win streaks

### Social/Guild
- Embassy system (cross-guild rewards)
- Sister guild: MatchaLatte
- Citizen ID system (NW-XXX)
- Cross-domain auth via URL params

### i18n
- Languages: EN, 繁體中文, ไทย
- 31 pages with i18n

## Recent Changes (last 15 commits)
```
7a5ae89 Consolidate: merge learnings into .ai-context.md, delete bloat
da5f753 Embassy: proper emblems, cross-domain auth, learnings update
a7d8572 Embassy: use single lang event listener
7b4ab8d Embassy: fix language toggle + add hero banner
d96feac Embassy System: citizen-gated rewards across partner sites
968b5f0 Add Embassy System for cross-guild integration
35b711f Remove duplicate language toggle from Guide - use nav menu only
d424c3a Rewrite Guide: match actual luck-based battle system
8de7eff Update README with learnings, i18n status, nav structure, and development best practices
0aea3ce Add Sister Guilds: MatchaLatte (Aquila-22) with nav section and landing page
c9d13ed i18n complete: 29/29 pages translated (0 missing), add injection audit tools
228a77e Complete i18n: add EN/zh/th translations for research.html (35 keys) - 0 missing pages
b86f949 fix: Complete i18n translations for Wyckoff page - all 113 keys
b25d364 fix: iOS scroll lock after language toggle
18296c4 feat: Add 3-Step Fool-Proof Wyckoff Guide with TSMC example
```

## Structure
```
public/           # 62 HTML pages
public/static/    # JS modules, CSS, images
public/static/data/  # Card JSON files
src/              # Hono backend
src/data/         # roster.json, translations
```

## URLs
- Sandbox: https://3000-i8pqrv0s1id0a05f7rae2-583b4d74.sandbox.novita.ai
- MatchaLatte: https://3001-i8pqrv0s1id0a05f7rae2-583b4d74.sandbox.novita.ai
- GitHub: https://github.com/9tvf4k6srt-sys/NumbahWan-tcg

## Potential Gaps (pages with minimal JS)
- conspiracy.html (778 lines)
- intelligence.html (908 lines)
- museum.html (648 lines)
- research.html (462 lines)
- treasury.html (941 lines)
- citizenship.html (1864 lines)
- invest.html (1333 lines)

## Lore & Unique Elements
- The number 47 (recurring easter egg)
- RegginA misprint card
- Sacred Logs
- 13-floor Vault
- Zakum boss
- Therapy & HR departments (corporate satire)
- Court system

---
*Run: bash scripts/generate-snapshot.sh to refresh*

## NOT Built Yet (Strategy Ideas)

### Engagement Loops (Missing)
- [ ] Achievement system with shareable badges
- [ ] Profile cards (screenshot-ready flex)
- [ ] Leaderboards (battle wins, collection, wealth)
- [ ] Seasonal events with time-limited rewards
- [ ] Daily/weekly quests beyond login

### Social/Viral (Missing)
- [ ] Card trading between players
- [ ] Guild chat/messages
- [ ] Referral rewards (invite friends)
- [ ] Community lore submissions
- [ ] Meme generator with card art

### Monetization (Not Implemented)
- [ ] Premium currency purchase
- [ ] Battle pass / season pass
- [ ] Cosmetic card skins
- [ ] Physical card redemption (QR exists, flow incomplete)

### Content (Shallow Pages)
- [ ] Museum - just displays, no interaction
- [ ] Conspiracy - lore but no gameplay
- [ ] Intelligence - static content
- [ ] Treasury - no actual treasury mechanics
- [ ] Invest - UI exists, no real system

### Physical-Digital Bridge
- [ ] Card claim system (backend incomplete)
- [ ] QR code generation per card
- [ ] Ownership verification

### Advanced Gameplay
- [ ] PvP matchmaking (page exists, no real system)
- [ ] Tournaments (page exists, not functional)
- [ ] Guild vs Guild battles
- [ ] Boss raids (Zakum page exists)

