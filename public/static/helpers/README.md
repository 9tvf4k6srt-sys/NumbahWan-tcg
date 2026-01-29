# NumbahWan Guild Helper Library v2.0.0

> An army of JavaScript helpers for building the NumbahWan Guild app with ease.

## Quick Start

```html
<!-- Load all helpers at once -->
<script src="/static/helpers/nw-helpers.js"></script>

<!-- Or load specific helpers -->
<script src="/static/helpers/nw-core.js"></script>
<script src="/static/helpers/nw-ui.js"></script>
```

## Helper Overview

| Helper | Size | Purpose |
|--------|------|---------|
| **NW_CORE** | 20KB | Base utilities, DOM, events, storage, formatting |
| **NW_UI** | 28KB | Toasts, modals, loading, tabs, accordion, dropdowns |
| **NW_API** | 15KB | HTTP client, caching, interceptors, file upload |
| **NW_FORMS** | 24KB | Validation, serialization, masking, auto-save |
| **NW_STATE** | 15KB | Reactive state, persistence, history, slices |
| **NW_ANIM** | 22KB | CSS/JS animations, easing, stagger, spring physics |
| **NW_AUDIO** | 14KB | SFX, music, spatial audio, visualization |
| **NW_GUILD** | 15KB | Cards, gacha, currency, achievements, rarity |

**Total: ~153KB** (loads async, won't block rendering)

---

## NW_CORE - Base Utilities

### DOM Helpers
```javascript
// Query elements
const el = NW_CORE.$('#myId');           // Single element
const items = NW_CORE.$$('.items');       // All matching

// Create elements
const card = NW_CORE.create('div', {
    className: 'card',
    data: { id: '123' },
    onClick: () => console.log('clicked'),
    html: '<span>Content</span>'
});

// Class manipulation
NW_CORE.addClass(el, 'active', 'highlight');
NW_CORE.removeClass(el, 'hidden');
NW_CORE.toggleClass(el, 'expanded');

// Show/hide
NW_CORE.show(el);
NW_CORE.hide(el);
NW_CORE.toggle(el);
```

### Event Handling
```javascript
// Event delegation (great for dynamic content)
NW_CORE.delegate(document, 'click', '.card', (e, target) => {
    console.log('Card clicked:', target.dataset.id);
});

// Debounce (wait for pause in calls)
const search = NW_CORE.debounce((query) => {
    fetchResults(query);
}, 300);

// Throttle (limit call frequency)
const scroll = NW_CORE.throttle(() => {
    updatePosition();
}, 100);

// One-time listener
NW_CORE.once('#btn', 'click', () => console.log('First click only'));
```

### Storage
```javascript
// With auto-expiration
NW_CORE.storage.set('session', data, 3600000); // 1 hour
const session = NW_CORE.storage.get('session', defaultValue);
NW_CORE.storage.remove('session');
NW_CORE.storage.clear(); // Clear all NW_ prefixed keys
```

### Formatting
```javascript
NW_CORE.formatNumber(1234567);      // "1,234,567"
NW_CORE.formatCurrency(99.99);      // "$99.99"
NW_CORE.formatCompact(1500000);     // "1.5M"
NW_CORE.formatPercent(0.156);       // "15.6%"
NW_CORE.formatDate(new Date());     // "Jan 29, 2026"
NW_CORE.timeAgo('2026-01-01');      // "29 days ago"
NW_CORE.slugify('Hello World!');    // "hello-world"
NW_CORE.truncate('Long text...', 10); // "Long te..."
```

---

## NW_UI - UI Components

### Toast Notifications
```javascript
NW_UI.success('Saved successfully!');
NW_UI.error('Something went wrong');
NW_UI.warning('Low storage space');
NW_UI.info('New update available');

// Custom duration
NW_UI.toast('Custom message', 'info', 10000); // 10 seconds
```

### Modals
```javascript
// Alert
await NW_UI.alert('Important message', 'Notice');

// Confirm (returns true/false)
const confirmed = await NW_UI.confirm('Delete this item?', 'Confirm');
if (confirmed) { /* delete */ }

// Prompt (returns string or null)
const name = await NW_UI.prompt('Enter your name', 'Guest');

// Custom modal
const result = await NW_UI.modal({
    title: 'Custom Modal',
    content: '<p>Your content here</p>',
    buttons: [
        { text: 'Cancel', type: 'secondary', value: false },
        { text: 'Save', type: 'primary', value: true }
    ]
});
```

### Loading States
```javascript
NW_UI.showLoading('Processing...');
// ... do work ...
NW_UI.hideLoading();

// Update message
NW_UI.updateLoading('Almost done...');
```

### Progress Bars
```javascript
const progress = NW_UI.progress('#container', 0);
progress.set(50);  // 50%
progress.set(100); // 100%
```

### Tabs
```html
<div id="tabs">
    <div class="nw-tabs">
        <button class="nw-tab">Tab 1</button>
        <button class="nw-tab">Tab 2</button>
    </div>
    <div class="nw-tab-content">Content 1</div>
    <div class="nw-tab-content">Content 2</div>
</div>
<script>
    NW_UI.tabs('#tabs', { onChange: (index) => console.log(index) });
</script>
```

---

## NW_API - HTTP Client

### Basic Requests
```javascript
// GET
const cards = await NW_API.get('/api/cards');

// POST
const newCard = await NW_API.post('/api/cards', {
    name: 'Dragon',
    rarity: 'legendary'
});

// PUT/PATCH/DELETE
await NW_API.put('/api/cards/1', data);
await NW_API.patch('/api/cards/1', { name: 'Updated' });
await NW_API.delete('/api/cards/1');
```

### Configuration
```javascript
NW_API.configure({
    baseUrl: '/api',
    timeout: 30000,
    retries: 3,
    cache: true,
    cacheDuration: 60000
});

NW_API.setHeader('Authorization', 'Bearer token');
```

### File Upload
```javascript
await NW_API.upload('/api/upload', file, {
    onProgress: ({ percent }) => {
        console.log(`${percent}% uploaded`);
    }
});
```

### Endpoint Builder
```javascript
const users = NW_API.createEndpoint('/api/users');

const allUsers = await users.list({ page: 1 });
const user = await users.get(123);
const newUser = await users.create({ name: 'John' });
await users.update(123, { name: 'Jane' });
await users.delete(123);
```

---

## NW_FORMS - Form Handling

### Validation
```javascript
const schema = {
    email: ['required', 'email'],
    password: [
        'required',
        { rule: 'minLength', param: 8, message: 'Min 8 characters' }
    ],
    confirmPassword: [
        'required',
        { rule: 'match', param: 'password', message: 'Passwords must match' }
    ]
};

const { valid, errors, data } = NW_FORMS.validate('#form', schema);

// Real-time validation
const validateAll = NW_FORMS.attachValidation('#form', schema, {
    validateOn: 'blur',
    showSuccessState: true
});
```

### Serialization
```javascript
// Get form data as object
const data = NW_FORMS.serialize('#form');

// Populate form with data
NW_FORMS.deserialize('#form', savedData);
```

### Input Masking
```javascript
NW_FORMS.mask('#phone', '(###) ###-####');
NW_FORMS.mask('#card', '#### #### #### ####');
NW_FORMS.mask('#date', '##/##/####');
```

### Auto-Save
```javascript
const autoSave = NW_FORMS.autoSave('#form', 'draft-key', {
    debounceMs: 500,
    exclude: ['password'],
    onSave: (data) => console.log('Saved draft')
});

autoSave.restore(); // Load saved draft
autoSave.clear();   // Clear saved draft
```

---

## NW_STATE - State Management

### Basic State
```javascript
// Set values
NW_STATE.set('user.name', 'John');
NW_STATE.set('user.settings.theme', 'dark');

// Get values
const name = NW_STATE.get('user.name');
const all = NW_STATE.get(); // Entire state

// Update (merge)
NW_STATE.update('user', { email: 'john@example.com' });

// Delete
NW_STATE.remove('user.settings.theme');
```

### Subscriptions
```javascript
// Subscribe to changes
const unsubscribe = NW_STATE.subscribe('user', (newValue, oldValue) => {
    console.log('User changed:', newValue);
});

// Wildcard subscription
NW_STATE.subscribe('*', (state, path, changes) => {
    console.log('Any state changed');
});

// Cleanup
unsubscribe();
```

### State Slices
```javascript
const cartSlice = NW_STATE.createSlice('cart', 
    { items: [], total: 0 },
    {
        addItem: (state, item) => ({
            ...state,
            items: [...state.items, item],
            total: state.total + item.price
        }),
        clear: () => ({ items: [], total: 0 })
    }
);

cartSlice.actions.addItem({ name: 'Card', price: 100 });
console.log(cartSlice.get()); // { items: [...], total: 100 }
```

### Persistence & History
```javascript
// Enable persistence
NW_STATE.configure({ persist: true, persistKey: 'myApp' });

// Undo/Redo
NW_STATE.undo();
NW_STATE.redo();
```

---

## NW_ANIM - Animations

### CSS Class Animations
```javascript
// Apply CSS animation class
await NW_ANIM.cssAnimate('#box', 'nw-fadeInUp');

// Available classes:
// nw-fadeIn, nw-fadeOut, nw-fadeInUp, nw-fadeInDown
// nw-scaleIn, nw-bounceIn, nw-pulse, nw-shake, nw-swing
```

### JavaScript Animations
```javascript
await NW_ANIM.animate('#box', {
    opacity: '1',
    transform: 'translateY(0)'
}, {
    duration: 500,
    easing: 'easeOutCubic'
});
```

### Stagger Animations
```javascript
// Animate multiple elements with delay
NW_ANIM.stagger('.cards', 'nw-fadeInUp', { delay: 100 });
```

### Number Counting
```javascript
NW_ANIM.countTo('#score', 10000, {
    duration: 2000,
    prefix: '$',
    separator: ','
});
```

### Spring Physics
```javascript
NW_ANIM.spring('#box', 'transform', 'translateX(200px)', {
    stiffness: 100,
    damping: 10
});
```

---

## NW_AUDIO - Audio System

### Loading & Playing
```javascript
// Load sounds
await NW_AUDIO.load('click', '/sounds/click.mp3');
await NW_AUDIO.loadAll({
    click: '/sounds/click.mp3',
    success: { url: '/sounds/success.mp3', type: 'sfx' },
    bgm: { url: '/sounds/music.mp3', type: 'music', loop: true }
});

// Play
NW_AUDIO.play('click');
NW_AUDIO.play('click', { volume: 0.5, rate: 1.2 });
```

### Background Music
```javascript
NW_AUDIO.playMusic('bgm', { fadeIn: 2 });
NW_AUDIO.stopMusic({ fadeOut: 1 });
```

### Synthesized Sounds (No files needed!)
```javascript
NW_AUDIO.presets.click();
NW_AUDIO.presets.success();
NW_AUDIO.presets.error();
NW_AUDIO.presets.coin();
NW_AUDIO.presets.powerUp();
```

### Volume Control
```javascript
NW_AUDIO.setMasterVolume(0.8);
NW_AUDIO.setMusicVolume(0.5);
NW_AUDIO.mute();
NW_AUDIO.unmute();
NW_AUDIO.toggleMute();
```

---

## NW_GUILD - Guild-Specific

### Rarity System
```javascript
const mythic = NW_GUILD.getRarity('mythic');
// { name: 'Mythic', color: '#ff00ff', gradient: '...', rate: 0.01, ... }

NW_GUILD.getRarityColor('legendary'); // '#ffd700'
NW_GUILD.applyRarityStyle('#card', 'epic');
```

### Currency Formatting
```javascript
NW_GUILD.formatCurrency(1500);    // "⚡1,500"
NW_GUILD.formatCrystals(100);     // "💎100"
NW_GUILD.formatGold(50000);       // "🪙50K"
```

### Gacha Helpers
```javascript
const cost = NW_GUILD.getPullCost(10); // 1440 (10% discount)

const pity = NW_GUILD.getPityProgress({ mythic: 80, legendary: 45 });
// { mythic: { current: 80, hardPity: 90, inSoftPity: true }, ... }

const rates = NW_GUILD.getAdjustedRates({ mythic: 80 });
// Rates with soft pity boost applied
```

### Card Rendering
```javascript
const cardHtml = NW_GUILD.renderCard(card, { size: 'lg', showStats: true });
const gridHtml = NW_GUILD.renderCardGrid(cards, { size: 'md' });
```

### Achievements
```javascript
const unlocked = NW_GUILD.checkAchievements(playerData);
// ['first_pull', 'collector_10', 'lucky_pull']

const achievement = NW_GUILD.getAchievement('jackpot');
// { name: 'Jackpot!', desc: 'Pull a mythic card', reward: 5000 }
```

---

## Unified NW Namespace

All helpers are also accessible through the unified `NW` namespace:

```javascript
// Quick access
NW.$('#element');
NW.$$('.items');
NW.success('Done!');
NW.error('Failed');
NW.confirm('Sure?');

// Full access
NW.CORE.formatNumber(1000);
NW.UI.showLoading();
NW.API.get('/api/data');
NW.STATE.set('key', 'value');
NW.ANIM.animate('#box', props);
NW.AUDIO.play('sound');
NW.GUILD.formatCurrency(100);

// Check loaded helpers
NW.isLoaded('core');  // true
NW.getLoadedHelpers(); // ['core', 'ui', 'api', ...]
```

---

## Best Practices

1. **Load helpers in order**: `nw-core.js` first, then others
2. **Use delegation**: For dynamic content, use `NW_CORE.delegate()`
3. **Debounce user input**: Prevent API spam with `NW_CORE.debounce()`
4. **Cache API calls**: Enable `NW_API.configure({ cache: true })`
5. **Use state slices**: Organize state with `NW_STATE.createSlice()`
6. **Stagger animations**: Use `NW_ANIM.stagger()` for lists
7. **Pool audio**: Load sounds once, play many times

---

## File Size Summary

| File | Minified | Gzipped |
|------|----------|---------|
| nw-helpers.js | 9KB | ~3KB |
| nw-core.js | 20KB | ~6KB |
| nw-ui.js | 28KB | ~8KB |
| nw-api.js | 15KB | ~5KB |
| nw-forms.js | 24KB | ~7KB |
| nw-state.js | 15KB | ~5KB |
| nw-anim.js | 22KB | ~7KB |
| nw-audio.js | 14KB | ~5KB |
| nw-guild.js | 15KB | ~5KB |
| **Total** | **~153KB** | **~51KB** |

---

*Built with ❤️ for NumbahWan Guild*
