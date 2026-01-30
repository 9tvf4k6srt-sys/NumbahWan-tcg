# 🚀 NumbahWan Helper Quick Reference

Copy-paste snippets for fast development!

---

## 🎯 NW_CORE - DOM & Utilities

```javascript
// DOM Shortcuts (way faster than document.querySelector)
const btn = NW_CORE.$('.pull-btn');           // Single element
const cards = NW_CORE.$$('.card');            // All elements (array)

// Create elements fast
const div = NW_CORE.create('div', { 
    className: 'card',
    text: 'Hello',
    data: { id: 123 },
    onClick: () => console.log('clicked!')
});

// Event delegation (handles dynamic elements!)
NW_CORE.delegate(document, 'click', '.card', (e, card) => {
    console.log('Card clicked:', card.dataset.id);
});

// Debounce (for search inputs)
const search = NW_CORE.debounce((query) => {
    // Only runs after 300ms pause
}, 300);

// Throttle (for scroll/resize)
const onScroll = NW_CORE.throttle(() => {
    // Max 60fps
}, 16);

// Formatting
NW_CORE.formatNumber(1234567);      // "1,234,567"
NW_CORE.formatCompact(1500000);     // "1.5M"
NW_CORE.formatCurrency(99.99);      // "$99.99"
NW_CORE.timeAgo(new Date('2024-01-01')); // "3 months ago"

// Storage (with expiry!)
NW_CORE.storage.set('key', value, 3600000);  // 1 hour TTL
NW_CORE.storage.get('key', defaultValue);
NW_CORE.storage.remove('key');

// Device detection
if (NW_CORE.device.isMobile) { /* touch UI */ }
if (NW_CORE.device.isSmall) { /* < 640px */ }

// Async helpers
await NW_CORE.sleep(1000);  // Wait 1 second
await NW_CORE.waitFor(() => element.loaded, 5000);  // Wait for condition
await NW_CORE.retry(fetchData, 3, 1000);  // Retry 3x with 1s delay
```

---

## 🎨 NW_UI - User Feedback

```javascript
// Toast notifications
NW_UI.success('Saved!');
NW_UI.error('Something went wrong');
NW_UI.warning('Are you sure?');
NW_UI.info('Tip: Try swiping');
NW_UI.toast('Custom message', 'info', 5000);  // 5 second duration

// Modals
const confirmed = await NW_UI.confirm('Delete this card?');
if (confirmed) { /* delete */ }

const name = await NW_UI.prompt('Enter card name');
await NW_UI.alert('Important message!');

// Custom modal
const result = await NW_UI.modal({
    title: 'Trade Card',
    content: '<p>Confirm trade?</p>',
    buttons: [
        { text: 'Cancel', type: 'secondary', value: false },
        { text: 'Trade', type: 'primary', value: true }
    ]
});

// Loading states
NW_UI.showLoading('Processing...');
NW_UI.updateLoading('Almost done...');
NW_UI.hideLoading();

// Progress bar
const progress = NW_UI.progress('#container', 0);
progress.set(50);   // 50%
progress.set(100);  // Done!

// Skeleton loaders (for loading states)
container.innerHTML = NW_UI.skeleton('card', 6);  // 6 card placeholders
```

---

## 🎬 NW_ANIM - Buttery Animations

```javascript
// Animate any property
await NW_ANIM.animate('#card', {
    opacity: '1',
    transform: 'translateY(0)'
}, {
    duration: 400,
    easing: 'easeOutCubic'
});

// Spring physics (bouncy!)
await NW_ANIM.spring('#card', 'transform', 'scale(1)', {
    stiffness: 200,  // Higher = snappier
    damping: 15,     // Higher = less bounce
    mass: 1
});

// CSS class animations
await NW_ANIM.cssAnimate('#card', 'nw-bounceIn');
await NW_ANIM.cssAnimate('#card', 'nw-pulse');
await NW_ANIM.cssAnimate('#card', 'nw-shake');

// Stagger (animate multiple with delay)
await NW_ANIM.stagger('.cards', 'nw-fadeInUp', { delay: 50 });

// Count up numbers
await NW_ANIM.countTo('#score', 1000, {
    duration: 2000,
    easing: 'easeOutCubic',
    separator: ','
});

// Color transition
await NW_ANIM.colorTo('#btn', 'backgroundColor', '#ff6b00');

// Available CSS classes:
// nw-fadeIn, nw-fadeOut, nw-fadeInUp, nw-fadeInDown
// nw-scaleIn, nw-scaleOut, nw-bounceIn
// nw-pulse, nw-shake, nw-swing, nw-rubberBand, nw-flip

// Available easing functions:
// linear, easeInQuad, easeOutQuad, easeInOutQuad
// easeInCubic, easeOutCubic, easeInOutCubic
// easeInBack, easeOutBack, easeInOutBack
// easeOutBounce, easeOutElastic
```

---

## 🔊 NW_AUDIO - Sound Effects

```javascript
// Load sounds
await NW_AUDIO.load('click', '/static/audio/ui-select.mp3');
await NW_AUDIO.loadAll({
    click: '/static/audio/ui-select.mp3',
    flip: '/static/audio/gacha-flip.mp3',
    mythic: '/static/audio/gacha-mythic.mp3'
});

// Play sounds
NW_AUDIO.play('click');
NW_AUDIO.play('flip', { volume: 0.8 });
NW_AUDIO.playVariant('click', { pitchRange: 0.1 });  // Random pitch

// Music
NW_AUDIO.playMusic('bgm', { fadeIn: 2 });
NW_AUDIO.stopMusic({ fadeOut: 1 });

// Volume control
NW_AUDIO.setMasterVolume(0.8);
NW_AUDIO.setMusicVolume(0.5);
NW_AUDIO.setSfxVolume(1);
NW_AUDIO.mute();
NW_AUDIO.unmute();

// Quick beeps (no files needed)
NW_AUDIO.presets.click();
NW_AUDIO.presets.success();
NW_AUDIO.presets.error();
NW_AUDIO.presets.coin();
```

---

## 📦 NW_STATE - State Management

```javascript
// Set/Get state
NW_STATE.set('user.name', 'Player1');
NW_STATE.set('wallet.logs', 500);
const name = NW_STATE.get('user.name');
const wallet = NW_STATE.get('wallet');  // { logs: 500 }

// Subscribe to changes (reactive!)
NW_STATE.subscribe('wallet.logs', (newVal, oldVal) => {
    console.log('Logs changed:', oldVal, '->', newVal);
    updateUI();
});

// Subscribe to all changes
NW_STATE.subscribe((state, path) => {
    console.log('State changed at', path);
});

// Batch updates (single notification)
NW_STATE.batch(() => {
    NW_STATE.set('wallet.logs', 100);
    NW_STATE.set('wallet.gems', 50);
    NW_STATE.set('user.level', 5);
});

// Undo/Redo!
NW_STATE.undo();
NW_STATE.redo();
if (NW_STATE.canUndo()) { /* show button */ }

// Persistence (auto-save to localStorage)
NW_STATE.configure({ persist: true });

// State slices (modular)
const walletSlice = NW_STATE.createSlice('wallet', 
    { logs: 0, gems: 0 },
    {
        addLogs: (state, amount) => ({ ...state, logs: state.logs + amount }),
        spend: (state, amount) => ({ ...state, logs: state.logs - amount })
    }
);
walletSlice.actions.addLogs(100);
```

---

## 🏰 NW_GUILD - TCG Utilities

```javascript
// Rarity info
const mythic = NW_GUILD.getRarity('mythic');
// { name: 'Mythic', color: '#ff00ff', gradient: '...', glow: '...', rate: 0.01 }

NW_GUILD.getRarityColor('legendary');   // '#ffd700'
NW_GUILD.getRarityGradient('epic');     // 'linear-gradient(...)'
NW_GUILD.applyRarityStyle(element, 'mythic');  // Apply styling

// Currency formatting
NW_GUILD.formatCurrency(1500);           // '⚡1,500'
NW_GUILD.formatCurrency(1500000, { compact: true }); // '⚡1.5M'
NW_GUILD.formatCrystals(100);            // '💎100'
NW_GUILD.formatGold(50000);              // '🪙50K'

// Pull costs
NW_GUILD.getPullCost(1);   // 160
NW_GUILD.getPullCost(10);  // 1440 (10% discount)

// Pity tracking
const pity = NW_GUILD.getPityProgress({ mythic: 45, legendary: 20 });
// { mythic: { current: 45, softPity: 75, progress: 50, inSoftPity: false }, ... }

// Card rendering
const html = NW_GUILD.renderCard(card, { size: 'md', showStats: true });
const grid = NW_GUILD.renderCardGrid(cards);

// Achievements
const unlocked = NW_GUILD.checkAchievements(playerData);
const info = NW_GUILD.getAchievement('jackpot');

// Rewards
NW_GUILD.getSellValue(card);        // Based on rarity
NW_GUILD.getDailyReward(streak);    // Login streak bonus
```

---

## 🔥 NW_FORGE - Gacha System

```javascript
// Initialize
await NW_FORGE.init();
NW_FORGE.setCards(cardPool);

// Execute pulls
const cards = await NW_FORGE.pull(1);   // Single pull
const cards = await NW_FORGE.pull(5);   // 5-pull (6 cards)
const cards = await NW_FORGE.pull(10);  // 10-pull (12 cards)

// Currency
NW_FORGE.getLogs();
NW_FORGE.addLogs(100, 'DAILY_BONUS');
NW_FORGE.spendLogs(160);
NW_FORGE.canAfford(160);
NW_FORGE.getPullCost(10);  // 1440

// State
const state = NW_FORGE.getState();
// { logs, totalPulls, pity, collection, rates, pityProgress }

const pity = NW_FORGE.getPityStatus();
// { mythic: { count, progress, inSoft }, legendary: {...}, epic: {...} }

// Events
NW_FORGE.on('pull', (cards) => showCards(cards));
NW_FORGE.on('mythic', (card) => celebrate(card));
NW_FORGE.on('legendary', (card) => flashGold());
NW_FORGE.on('logs_change', ({ amount, total }) => updateUI());

// Utilities
NW_FORGE.getHighestRarity(cards);  // 'mythic'
NW_FORGE.formatLogs(1500);         // '🪵 1,500'
await NW_FORGE.preloadCards(cards);
```

---

## 🎮 Common Patterns

### Loading with feedback
```javascript
NW_UI.showLoading('Pulling cards...');
const cards = await NW_FORGE.pull(10);
NW_UI.hideLoading();
NW_UI.success(`Got ${cards.length} cards!`);
```

### Animated counter update
```javascript
NW_STATE.subscribe('wallet.logs', (newVal) => {
    NW_ANIM.countTo('#logBalance', newVal, { duration: 600 });
});
```

### Confirm before action
```javascript
const confirmed = await NW_UI.confirm('Spend 1440 logs for 10-pull?');
if (confirmed) {
    await NW_FORGE.pull(10);
}
```

### Staggered card reveal
```javascript
await NW_ANIM.stagger('.reveal-card', 'nw-bounceIn', { 
    delay: 100,
    startDelay: 500 
});
```

### Device-specific UI
```javascript
if (NW_CORE.device.isMobile) {
    // Larger touch targets
    NW_CORE.$$('.btn').forEach(b => b.classList.add('touch-large'));
}
```
