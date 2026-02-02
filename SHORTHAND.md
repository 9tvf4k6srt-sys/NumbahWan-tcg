# NumbahWan Shorthand Language

> Quick commands for you → I understand instantly → Less tokens = Less credits

---

## Page Shortcuts

| You say | I understand |
|---------|--------------|
| `home` | public/index.html |
| `forge` | public/forge.html (gacha/pack opening) |
| `battle` | public/battle.html |
| `cards` | public/cards.html (browse all cards) |
| `collection` | public/collection.html (your cards) |
| `deck` | public/deckbuilder.html |
| `wallet` | public/wallet.html |
| `market` | public/market.html |
| `arcade` | public/arcade.html |
| `court` | public/court.html |
| `therapy` | public/therapy.html |
| `hr` | public/hr.html |
| `conspiracy` | public/conspiracy.html |
| `updates` | public/updates.html (patch notes) |
| `fortune` | public/fortune.html |
| `academy` | public/academy.html |
| `museum` | public/museum.html |
| `vault` | public/vault.html |

---

## Module Shortcuts

| You say | I understand |
|---------|--------------|
| `config` | public/static/nw-config.js (central config, patch notes) |
| `wallet-js` | public/static/nw-wallet.js (currency, GM mode) |
| `upgrade` | public/static/nw-card-upgrade.js (star system, burn) |
| `guide` | public/static/nw-guide.js (AI chat assistant) |
| `nav` | public/static/nw-nav.js (menu) |
| `forge-js` | public/static/nw-forge-engine.js (gacha logic) |
| `battle-js` | public/static/nw-battle-engine.js |
| `cards-js` | public/static/nw-cards.js (card loader) |
| `user` | public/static/nw-user.js |
| `sounds` | public/static/nw-sounds.js |
| `renderer` | public/static/nw-card-renderer.js |

---

## Data Shortcuts

| You say | I understand |
|---------|--------------|
| `roster` | src/data/roster.json (guild members, CP) |
| `cards-data` | public/static/data/cards-v2.json |
| `season X` | public/static/data/cards-sX.json |
| `translations` | src/data/translations.json |
| `patches` | NW_CONFIG.patches in nw-config.js |

---

## Action Shortcuts

| You say | I do |
|---------|------|
| `rebuild` | npm run build && pm2 restart |
| `test` | curl localhost:3000/api/health |
| `save` | git add . && git commit |
| `push` | git push origin main |
| `deploy` | npm run deploy (Cloudflare) |
| `check X` | Read and show you file X |
| `fix X` | Find and fix issue in X |
| `add to X` | Add content to file X |

---

## Issue Shortcuts

| You say | I understand |
|---------|--------------|
| `broken` | Something's not working (I'll debug) |
| `ugly` | UI/styling issue |
| `wrong text` | Translation or text display issue |
| `no response` | Click/tap not doing anything |
| `missing` | Feature or element not showing |
| `slow` | Performance issue |
| `error` | Console error or crash |

---

## Feature Shortcuts

| You say | I understand |
|---------|--------------|
| `toast` | Popup notification |
| `modal` | Popup dialog/window |
| `i18n` | Translation/language |
| `GM` | Game Master testing mode |
| `pity` | Gacha pity system |
| `stars` | Card upgrade star level (1-5★) |
| `burn` | Convert cards to Sacred Logs |
| `dupes` | Duplicate cards |
| `logs` | Sacred Logs (wood currency) |

---

## Examples

**You say:** `forge broken no response`
**I understand:** The forge page has a button/click that's not responding

**You say:** `add toast to wallet`
**I understand:** Add a toast notification to the wallet page

**You say:** `fix guide wrong text`
**I understand:** The guide is showing untranslated or wrong text

**You say:** `check config`
**I understand:** Read and show you nw-config.js

**You say:** `update patches - added X feature`
**I understand:** Add new patch notes to NW_CONFIG.patches

**You say:** `collection ugly modal`
**I understand:** The collection page modal has styling issues

---

## Quick Phrases

| Phrase | Meaning |
|--------|---------|
| `looks good` | Approve and continue |
| `undo` | Revert last change |
| `more` | Show more details/options |
| `skip` | Don't do that, move on |
| `later` | Note for future, don't do now |
| `test it` | Build, restart, give me URL |
| `show me` | Display the relevant code |
| `explain` | Tell me how it works |

---

## Screenshot + Shorthand

When you send a screenshot, just add:
- `broken` - Something's not working
- `ugly` - Fix the styling
- `wrong` - Wrong text/data
- `add X` - Add something to it
- `remove X` - Take something away

**Example:** [screenshot] `ugly button too small`

---

*Use any combination! I'll figure it out.*
