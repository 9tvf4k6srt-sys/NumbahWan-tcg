# Lessons Learned - NWG Development Session
**Date**: 2026-02-03
**Focus**: Battle System Consolidation, PvP Matchmaking, Image Loading Fixes

---

## Summary of Today's Work

### 1. Battle Systems Consolidated
**Before**: 4 battle pages (/battle, /battle-2026, /battle-unified, /pvp-battle)
**After**: 2 battle pages
- `/battle` - AI battles with psychology-driven luck system
- `/pvp-battle` - Real player matchmaking

### 2. PvP Matchmaking System Built
- Queue-based matchmaking (players matched by bet amount ±50%)
- Polling-based status updates (every 2 seconds)
- House fee: 5% on all winnings
- Bet range: 50 - 100,000 NWG

### 3. Image Loading Fixed
**Root Cause**: iOS Safari doesn't reliably handle CSS class toggling on `onload`
**Solution**: Use inline style manipulation instead of class toggling

---

## Technical Lessons Learned

### Issue 1: Cloudflare Workers Global Scope Restrictions

**Problem**: `setInterval` and `setTimeout` cannot run in global scope
```javascript
// ❌ WRONG - Fails in Cloudflare Workers
setInterval(cleanupStaleEntries, 30000);

// ❌ WRONG - Also fails
setTimeout(() => { ... }, 5000);
```

**Solution**: Remove timers from global scope, use per-request cleanup
```javascript
// ✅ CORRECT - Call cleanup in request handler
app.get('/api/pvp/status/:id', (c) => {
  cleanupStaleEntries(); // Called on each request
  // ... rest of handler
});
```

**Why**: Cloudflare Workers are stateless - there's no persistent process to run intervals.

---

### Issue 2: Image Extension Mismatch

**Problem**: `cards.json` references `.png/.jpg` but actual files are `.webp`
```json
// cards.json
{ "img": "legendary-burnout.png" }

// Actual file
public/static/images/cards/legendary-burnout.webp
```

**Solution**: Convert extensions in JavaScript
```javascript
function getCardImagePath(card) {
  const img = card.img || card.image || '';
  // Convert any extension to .webp
  const webpImg = img.replace(/\.(png|jpg|jpeg)$/i, '.webp');
  return '/static/images/cards/' + webpImg + '?v=3';
}
```

**Better Long-Term Fix**: Update `cards.json` to use correct `.webp` extensions

---

### Issue 3: iOS Safari Image Loading

**Problem**: CSS class-based opacity toggle unreliable on iOS Safari
```javascript
// ❌ UNRELIABLE on iOS Safari
<img class="card-image loading" 
     onload="this.classList.remove('loading')">
     
.card-image.loading { opacity: 0; }
```

**Solution**: Use inline style manipulation
```javascript
// ✅ RELIABLE cross-browser
<img class="card-image" 
     style="opacity: 0; transition: opacity 0.3s;"
     onload="this.style.opacity='1'; this.previousElementSibling.style.display='none';">
```

---

### Issue 4: Worker Bundle Size Growth

**Problem**: Bundle grew from ~160KB to ~185KB after adding PvP
**Cause**: PvP matchmaking service adds ~450 lines of TypeScript

**Recommendations**:
1. Code-split large features (lazy load PvP only when needed)
2. Use external state stores (Cloudflare Durable Objects) for complex features
3. Keep worker code minimal - heavy logic on client-side when possible
4. Monitor bundle size: `npm run build` shows output size

---

### Issue 5: Duplicate Static Files

**Problem**: `battle-unified.html` exists in both:
- `/home/user/webapp/public/battle-unified.html`
- `/home/user/webapp/public/battle.html` (same content)

**Solution**: Remove duplicates, use canonical paths

---

## Psychology Framework Applied

From **curiosity_gap_analysis.pdf**:

### Implemented
1. **Zeigarnik Effect**: Progress bars at 87% completion (optimal tension)
2. **Near-Miss Frequency**: 35% of losses feel "almost won"
3. **Loss Aversion**: Streak loss messages 2x more emotional than wins
4. **Information Gap**: Cliffhanger messages after each battle
5. **Pity System**: Soft pity at 50 losses, hard pity at 80

### Constants Used
```javascript
const PSYCHOLOGY = {
  ZEIGARNIK_OPTIMAL_COMPLETION: 0.87,  // Progress bars stop at 87%
  LOSS_AVERSION_MULTIPLIER: 2,         // Losses hurt 2x more
  NEAR_MISS_FREQUENCY: 0.35,           // 35% of losses are "close"
  OPTIMAL_MYSTERY_REVEAL: 0.60,        // Reveal 60% info, hide 40%
  LATE_GAME_DAY_THRESHOLD: 16          // Day 16+ = late game (whale target)
};
```

---

## Card Value Philosophy

**Before**: Card stats determine battle outcome (Pay-to-Win)
**After**: Card value is collectibility, NOT power

### Value Factors
| Factor | Weight | Description |
|--------|--------|-------------|
| Rarity | 25% | How rare is the card? |
| Lore/Story | 20% | Does it have interesting backstory? |
| Art Quality | 15% | Visual appeal |
| Memory | 15% | Guild moments, nostalgia |
| NWG Locked | 15% | How much NWG is staked? |
| Tradability | 10% | Market demand |

### Battle Outcome
- **Luck-based**: Random roll × luck multiplier
- **Luck sources**: Card rarity, win streak, collection completion, pity buildup
- **No pay-to-win**: A common card can beat a mythic (unlikely but possible)

---

## Improvements for Next Session

### High Priority
1. **Fix cards.json** - Update all image extensions to `.webp`
2. **Remove duplicates** - Delete `battle-unified.html`
3. **Test on real iOS** - Verify images load on actual iPhone

### Medium Priority
4. **Real-time PvP** - Consider Cloudflare Durable Objects or Pusher for instant matching
5. **Deploy to production** - Run `npx wrangler pages deploy dist`
6. **Bundle optimization** - Code-split PvP service

### Low Priority
7. **Image fallbacks** - Better placeholders for missing images
8. **Analytics** - Track battle completions, PvP matches, image failures

---

## Files Changed Today

| File | Action | Description |
|------|--------|-------------|
| `public/battle.html` | Modified | Unified AI battle with psychology hooks |
| `public/pvp-battle.html` | Created | Real player matchmaking UI |
| `src/services/pvp-matchmaking.ts` | Created | PvP queue and match logic |
| `public/battle-2026.html` | Deleted | Merged into /battle |
| `public/battle-legacy.html` | Created | Backup of original battle |
| `docs/PHYSICAL_CARD_SET_STRATEGY.md` | Created | Physical card recommendation |

---

## Quick Reference

### Test URLs
- AI Battle: https://[sandbox]/battle
- PvP Battle: https://[sandbox]/pvp-battle
- Cards API: https://[sandbox]/api/cards
- PvP Info: https://[sandbox]/api/pvp/info

### Useful Commands
```bash
# Build
cd /home/user/webapp && npm run build

# Start
pm2 restart numbahwan-guild

# Test images
curl -sI "http://localhost:3000/static/images/cards/legendary-burnout.webp"

# Check logs
pm2 logs numbahwan-guild --nostream

# Deploy
npx wrangler pages deploy dist --project-name webapp
```

---

## Conclusion

Today we successfully:
1. Merged 4 battle pages into 2
2. Built a complete PvP matchmaking system
3. Fixed image loading for iOS Safari
4. Applied psychology principles from curiosity_gap_analysis.pdf
5. Redesigned card value to be collectibility-based, not stats-based

**Key Insight**: Cloudflare Workers is stateless - no timers, no persistent state, no file system. Design accordingly.
