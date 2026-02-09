# NumbahWan Project Cheat Sheet
> Use this to tell AI exactly what to modify!

## 🎮 CORE SYSTEMS (What They Do)

| File | Purpose | Key Functions |
|------|---------|---------------|
| `nw-wallet.js` | 💰 Currency, daily rewards, achievements | `earn()`, `spend()`, `claimDailyReward()`, `unlockAchievement()` |
| `nw-economy.js` | 📊 Currency definitions, prices, rates | `CURRENCY_INFO`, `DAILY_REWARDS`, `MERCH_PRICING` |
| `nw-sounds.js` | 🔊 Audio effects | `play('click')`, `play('legendary')`, `play('profit')` |
| `nw-guide.js` | 🤖 AI chat assistant (EN/ZH/TH) | Auto-loads, language switcher |
| `nw-cards.js` | 🃏 Card database | `getCard()`, `getAllCards()`, `getByRarity()` |
| `nw-nav.js` | 🧭 Navigation menu | Auto-loads on all pages |

## 💵 CURRENCIES

| Currency | Icon | Color | Purpose |
|----------|------|-------|---------|
| Diamond | 💎 | Cyan #00ffff | Premium - arcade, merch |
| Gold | 🪙 | Gold #ffd700 | Standard - from arcade wins |
| Iron | ⚙️ | Silver #94a3b8 | Crafting - card upgrades |
| Stone | 🪨 | Green #00ff88 | Foundation - market buys |
| Sacred Log | 🪵 | Brown #c97f3d | ULTRA RARE - forge pulls, merch |

## 📄 KEY PAGES

| Page | URL | Uses Wallet? | Purpose |
|------|-----|--------------|---------|
| Wallet | `/wallet` | ✅ | View balance, claim daily, achievements |
| Forge | `/forge` | ✅ | Pull cards (costs Sacred Logs) |
| Arcade | `/arcade` | ✅ | Play games, earn currencies |
| Merch | `/merch` | ✅ | Buy with USD or currencies |
| Market | `/market` | ✅ | Trade cards (costs Stone) |
| TCG | `/tcg` | ✅ | View/manage collection |
| Fortune | `/fortune` | ✅ | Daily tarot (streak system) |

## 🔧 COMMON TASKS

### Add currency earning:
```js
NW_WALLET.earn('diamond', 10, 'SOURCE_NAME');
```

### Add currency spending:
```js
if (NW_WALLET.spend('wood', 1, 'FORGE_PULL')) { /* success */ }
```

### Play sound:
```js
NW_SOUNDS.play('click');  // Options: click, profit, legendary, bgm
```

### Check balance:
```js
const bal = NW_WALLET.getBalance('diamond');
```

## 🎯 GM MODE (Testing)
- Code: `numbahwan-gm-2026`
- Activate: `/wallet` → Settings → Enter code
- Effect: Infinite currencies (999,999)

## 📁 FILE LOCATIONS
- Pages: `/home/user/webapp/public/*.html`
- Scripts: `/home/user/webapp/public/static/*.js`
- Styles: `/home/user/webapp/public/static/*.css`
- Images: `/home/user/webapp/public/static/images/`

## 🚀 QUICK REQUEST TEMPLATE
```
Task: [What you want]
Page: [Which page, e.g., /wallet, /forge]
Behavior: [What should happen]
Example: "When user clicks X, give them 10 diamonds"
```
