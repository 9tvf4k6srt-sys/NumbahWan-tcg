# NumbahWan TCG - Module Dependency Map

## Visual Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        HTML PAGES                               │
├─────────────────────────────────────────────────────────────────┤
│  index.html  forge.html  battle.html  cards.html  wallet.html  │
│  collection  deckbuilder  market      pvp        arcade  ...   │
└───────────────────────────┬─────────────────────────────────────┘
                            │ includes
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                     CORE JS MODULES                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐   ┌─────────────────┐                     │
│  │ nw-essentials   │   │ nw-wallet       │                     │
│  │ ─────────────── │   │ ─────────────── │                     │
│  │ NW_ANIM         │   │ NW_WALLET       │                     │
│  │ NW_AUDIO        │◄──│ - getBalance()  │                     │
│  │ NW_UI           │   │ - spend/earn()  │                     │
│  │ NW_DEBUG        │   │ - isGM          │                     │
│  └────────┬────────┘   └────────┬────────┘                     │
│           │                     │                               │
│           ▼                     ▼                               │
│  ┌─────────────────┐   ┌─────────────────┐                     │
│  │ nw-cards        │   │ nw-nav          │                     │
│  │ ─────────────── │   │ ─────────────── │                     │
│  │ NW_CARDS        │   │ NW_NAV          │                     │
│  │ - init()        │   │ - init()        │                     │
│  │ - getAll()      │   │ - open/close()  │                     │
│  │ - getByRarity() │   │ - setLang()     │                     │
│  └────────┬────────┘   └─────────────────┘                     │
│           │                                                     │
│           ▼                                                     │
│  ┌─────────────────┐   ┌─────────────────┐                     │
│  │ nw-game-juice   │   │ nw-user-data    │                     │
│  │ ─────────────── │   │ ─────────────── │                     │
│  │ NW_JUICE        │   │ NW_USER_DATA    │                     │
│  │ - haptic.*      │   │ - progression   │                     │
│  │ - screen.shake  │   │ - achievements  │                     │
│  │ - sound.play    │   │                 │                     │
│  └─────────────────┘   └─────────────────┘                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                     RENDERING MODULES                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐   ┌─────────────────┐                     │
│  │ nw-card-renderer│   │ nw-3d-engine    │                     │
│  │ ─────────────── │   │ ─────────────── │                     │
│  │ Card DOM render │   │ 3D tilt effects │                     │
│  │ Template system │   │ Perspective     │                     │
│  └─────────────────┘   └─────────────────┘                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                      DATA LAYER                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  /static/data/                                                  │
│  ├── cards-v2.json    (Season 1 - 110 cards)                   │
│  ├── cards-s2.json    (Season 2 - 108 cards)                   │
│  ├── cards-s3.json    (Season 3)                               │
│  ├── ...              (Seasons 4-10)                           │
│  ├── seasons.json     (Season metadata)                        │
│  ├── config.json      (Game config)                            │
│  └── game-mechanics.json (Battle rules)                        │
│                                                                 │
│  localStorage                                                   │
│  ├── nw_wallet        (Currency, collection)                   │
│  ├── nw_forge_state   (Pity counters)                          │
│  ├── nw_gm_mode       (GM flag)                                │
│  └── nw_user_data     (Progression)                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    BACKEND (src/index.tsx)                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Hono Routes:                                                   │
│  ├── /api/health         Health check                          │
│  ├── /api/debug          System diagnostics                    │
│  ├── /api/cards/*        Card data endpoints                   │
│  ├── /api/market/*       Trading endpoints                     │
│  ├── /api/roster         Guild members                         │
│  └── /static/*           Static file serving                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Load Order (Critical!)

```html
<!-- HEAD: Foundation modules -->
<script src="/static/nw-essentials.js"></script>   <!-- 1st: Base utils -->
<script src="/static/nw-wallet.js"></script>       <!-- 2nd: Wallet/GM -->
<script src="/static/nw-cards.js"></script>        <!-- 3rd: Card data -->
<script src="/static/nw-nav.js"></script>          <!-- 4th: Navigation -->

<!-- BODY END: Optional enhancement modules -->
<script src="/static/nw-game-juice.js"></script>   <!-- Effects/haptics -->
<script src="/static/nw-card-renderer.js"></script><!-- Card rendering -->
<script src="/static/nw-3d-engine.js"></script>    <!-- 3D effects -->
```

## Page Dependencies

| Page | Required Modules | Optional |
|------|------------------|----------|
| index.html | essentials, nav | game-juice |
| forge.html | essentials, wallet, cards, nav | game-juice |
| battle.html | essentials, wallet, cards, nav | game-juice |
| cards.html | essentials, cards, nav | card-renderer |
| collection.html | essentials, wallet, cards, nav | - |
| deckbuilder.html | essentials, wallet, cards, nav | - |
| wallet.html | essentials, wallet, nav | - |
| market.html | essentials, wallet, cards, nav | - |

## Event Flow

```
Page Load
    │
    ├─► DOMContentLoaded
    │       │
    │       ├─► NW_WALLET.init()
    │       │       │
    │       │       └─► checkGMStatus()
    │       │               │
    │       │               └─► dispatch 'nw-wallet-ready'
    │       │
    │       ├─► NW_CARDS.init()
    │       │       │
    │       │       └─► fetch('/static/data/cards-v2.json')
    │       │
    │       └─► NW_NAV.init()
    │               │
    │               └─► inject nav HTML + event listeners
    │
    └─► window.load
            │
            └─► Page-specific initialization
```

## localStorage Keys

| Key | Module | Contents |
|-----|--------|----------|
| `nw_wallet` | nw-wallet | Full wallet state (balances, collection) |
| `nw_forge_state` | forge.html | Pity counters, pull history |
| `nw_gm_mode` | nw-wallet | Boolean GM flag |
| `nw_guest_id` | nw-wallet | User identifier |
| `nw_user_data` | nw-user-data | Level, XP, achievements |
| `nw_decks` | deckbuilder | Saved deck configurations |
| `nw_settings` | various | User preferences |
