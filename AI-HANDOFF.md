# NumbahWan TCG - AI Handoff Document
> **QUICK REFERENCE FOR NEXT AI** - All card data, images, and mappings

---

## CRITICAL FILES

| File | Purpose |
|------|---------|
| `CARD_MASTER_DATA.json` | **SINGLE SOURCE OF TRUTH** - Complete card database with image mappings |
| `public/static/data/cards-v2.json` | Production card data (needs img field update) |
| `public/static/images/cards/*.png` | **99 card images** (all art complete) |
| `CARD_BIBLE.md` | Lore, art styles, design philosophy |

---

## CARD COUNTS

| Rarity | Count | Art Complete | Color |
|--------|-------|--------------|-------|
| Mythic | 1 | ✅ Yes | #ff6b00 |
| Legendary | 10 | ✅ Yes | #fbbf24 |
| Epic | 18 | ✅ Yes | #a855f7 |
| Rare | 22 | ✅ Yes | #3b82f6 |
| Uncommon | 25 | ✅ Yes | #22c55e |
| Common | 23 | ✅ Yes | #71717a |
| **TOTAL** | **99** | ✅ Complete | - |

---

## IMAGE NAMING CONVENTION

Pattern: `{rarity}-{slug}.png`

Examples:
- `mythic-sacred-log.png`
- `legendary-bigbrain.png`
- `epic-server-crash.png`
- `rare-f2p-legend.png`
- `uncommon-tilt.png`
- `common-the-void.png`

Path: `/static/images/cards/{filename}`

---

## QUICK CARD LIST BY RARITY

### MYTHIC (1 card)
| ID | Name | Image File |
|----|------|------------|
| 107 | The Sacred Log | `mythic-sacred-log.png` |

### LEGENDARY (10 cards)
| ID | Name | Image File |
|----|------|------------|
| 202 | Burnout, The Eternal Grinder | `legendary-burnout.png` |
| 203 | Whaleford, The Unlimited Budget | `legendary-whaleford.png` |
| 205 | Webweaver, The Drama Spinner | `legendary-webweaver.png` |
| 206 | AFK Luna, The Moonlit Slacker | `legendary-afk-luna.png` |
| 207 | Chadwick, The Absolute Carry | `legendary-chadwick.png` |
| 208 | Mochi, The Devoted Simp | `legendary-mochi.png` |
| 209 | 404, The Ghost Member | `legendary-404.png` |
| 210 | Karen, The Guild Mom | `legendary-karen.png` |
| 211 | CAPS_LOCK, The Rage Quitter | `legendary-capslock.png` |
| 212 | BigBrain, The Theory Crafter | `legendary-bigbrain.png` |

### EPIC (18 cards)
| ID | Name | Image File |
|----|------|------------|
| 301 | Grimhelm, The Burnt Out Tank | `epic-grimhelm.png` |
| 302 | Zephyra, The Comeback Queen | `epic-zephyra.png` |
| 303 | Fenneko, The Sass Master | `epic-fenneko.png` |
| 304 | Chonk, The Immovable | `epic-chonk.png` |
| 305 | Glimmer, The Fashion Disaster | `epic-glimmer.png` |
| 306 | Snipe, The Kill Stealer | `epic-snipe.png` |
| 307 | Mumbles, The Mic-Muted | `epic-mumbles.png` |
| 308 | Hype, The Cheerleader | `epic-hype.png` |
| 309 | Server Crash | `epic-server-crash.png` |
| 310 | Ninja Loot | `epic-ninja-loot.png` |
| 311 | Rage Quit Spectacular | `epic-rage-quit.png` |
| 312 | Accidental Pull | `epic-accidental-pull.png` |
| 313 | The Carry Diff | `epic-carry-diff.png` |
| 314 | Maintenance Day | `epic-maintenance-day.png` |
| 315 | Onca, The Primal Instinct | `epic-onca.png` |
| 316 | Panthera, Shadow Stalker | `epic-panthera.png` |
| 317 | The Promised Update | `epic-promised-update.png` |
| 318 | Guild Drama Bomb | `epic-drama-bomb.png` |

### RARE (22 cards)
| ID | Name | Image File |
|----|------|------------|
| 401 | Newbie with Potential | `rare-newbie.png` |
| 402 | The Alt Account | `rare-alt-account.png` |
| 403 | Dedicated Healer | `rare-dedicated-healer.png` |
| 404 | One-Trick Pony | `rare-one-trick.png` |
| 405 | The Backseat Gamer | `rare-backseat-gamer.png` |
| 406 | Early Bird | `rare-early-bird.png` |
| 407 | Night Owl | `rare-night-owl.png` |
| 408 | Weekend Warrior | `rare-weekend-warrior.png` |
| 409 | Gacha Victim | `rare-gacha-victim.png` |
| 410 | F2P Legend | `rare-f2p-legend.png` |
| 411 | Guild Bank Robbery | `rare-guild-bank-robbery.png` |
| 412 | Accidental Guild Kick | `rare-accidental-kick.png` |
| 413 | The Perfect Run | `rare-perfect-run.png` |
| 414 | Disconnected at Boss | `rare-disconnected-boss.png` |
| 415 | Carried to Victory | `rare-carried-victory.png` |
| 416 | Login Streak Broken | `rare-login-streak.png` |
| 417 | Golden Keyboard | `rare-golden-keyboard.png` |
| 418 | Energy Drink Elixir | `rare-energy-drink.png` |
| 419 | Copium Inhaler | `rare-copium-inhaler.png` |
| 420 | Touch Grass Scroll | `rare-touch-grass.png` |
| 421 | Ragequit Button | `rare-ragequit-button.png` |
| 422 | Second Monitor | `rare-second-monitor.png` |

### UNCOMMON (25 cards)
| ID | Name | Image File |
|----|------|------------|
| 501 | Hopeful Applicant | `uncommon-hopeful-applicant.png` |
| 502 | Eternal Lurker | `uncommon-eternal-lurker.png` |
| 503 | Ping Spammer | `uncommon-ping-spammer.png` |
| 504 | On My Way | `uncommon-on-my-way.png` |
| 505 | Bio Break Legend | `uncommon-bio-break.png` |
| 506 | Inventory Hoarder | `uncommon-inventory-hoarder.png` |
| 507 | Guide Reader | `uncommon-guide-reader.png` |
| 508 | Meta Slave | `uncommon-meta-slave.png` |
| 509 | Off-Meta Enjoyer | `uncommon-off-meta.png` |
| 510 | The Minimizer | `uncommon-minimizer.png` |
| 511 | First! | `uncommon-first.png` |
| 512 | Emoji Reactor | `uncommon-emoji-reactor.png` |
| 513 | Loading Screen | `uncommon-loading-screen.png` |
| 514 | Git Gud Moment | `uncommon-git-gud.png` |
| 515 | Patch Notes Panic | `uncommon-patch-notes.png` |
| 516 | Free Real Estate | `uncommon-free-real-estate.png` |
| 517 | Basic Gaming Chair | `uncommon-gaming-chair.png` |
| 518 | Gamer Snacks | `uncommon-gamer-snacks.png` |
| 519 | Broken Headset | `uncommon-broken-headset.png` |
| 520 | Sticky Keyboard | `uncommon-sticky-keyboard.png` |
| 521 | GG EZ | `uncommon-gg-ez.png` |
| 522 | Copium Cloud | `uncommon-copium-cloud.png` |
| 523 | Tilt | `uncommon-tilt.png` |
| 524 | In The Zone | `uncommon-in-the-zone.png` |
| 525 | Lag Spike | `uncommon-lag-spike.png` |

### COMMON (23 cards)
| ID | Name | Image File |
|----|------|------------|
| 601 | Cracked Phone Screen | `common-cracked-phone.png` |
| 602 | Charging Cable | `common-charging-cable.png` |
| 603 | WiFi Signal (1 Bar) | `common-wifi-1bar.png` |
| 604 | Notification | `common-notification.png` |
| 605 | Daily Login | `common-daily-login.png` |
| 606 | Free Summon | `common-free-summon.png` |
| 607 | Auto-Battle | `common-auto-battle.png` |
| 608 | Skip Button | `common-skip-button.png` |
| 609 | Loading Tip | `common-loading-tip.png` |
| 610 | Connection Lost | `common-connection-lost.png` |
| 611 | Guild Chat | `common-guild-chat.png` |
| 612 | AFK Spot | `common-afk-spot.png` |
| 613 | Spawn Point | `common-spawn-point.png` |
| 614 | Loot Pile | `common-loot-pile.png` |
| 615 | Salt Shaker | `common-salt-shaker.png` |
| 616 | Tiny Crown | `common-tiny-crown.png` |
| 617 | Expired Coupon | `common-expired-coupon.png` |
| 618 | 1 Star Review | `common-1star-review.png` |
| 619 | Unread Messages (99+) | `common-unread-messages.png` |
| 620 | Maintenance Compensation | `common-maintenance-comp.png` |
| 621 | Limited Banner | `common-limited-banner.png` |
| 622 | Newbie Zone | `common-newbie-zone.png` |
| 623 | The Void (Empty Inventory) | `common-the-void.png` |

---

## NEXT STEPS FOR AI

1. **Update cards-v2.json** - Map `img` field to new PNG filenames
2. **Build & Test** - `npm run build && pm2 start ecosystem.config.cjs`
3. **Verify Display** - Check card rendering at `http://localhost:3000`
4. **Deploy** - `npm run deploy:prod`

---

## DIRECTORY STRUCTURE

```
/home/user/webapp/
├── CARD_MASTER_DATA.json       # Complete card database (USE THIS)
├── AI-HANDOFF.md               # This quick reference
├── CARD_BIBLE.md               # Lore and design docs
├── public/
│   └── static/
│       ├── data/
│       │   └── cards-v2.json   # Production data (needs update)
│       └── images/
│           └── cards/          # 99 PNG card images
│               ├── mythic-*.png
│               ├── legendary-*.png
│               ├── epic-*.png
│               ├── rare-*.png
│               ├── uncommon-*.png
│               └── common-*.png
```

---

*Last Updated: 2026-01-29*
*Art Generation: 100% COMPLETE (99/99 cards)*
