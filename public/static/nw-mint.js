/**
 * NW-MINT — Card Serial Number & Power Tier System v1.0
 * 
 * Every card pulled gets a unique serial number (#1, #2, #3...).
 * Lower serial = more powerful. Creates real market value.
 * 
 * TIER SYSTEM:
 *   #1         GENESIS      +20% ATK/HP, +10% crit, holo border, Hall of Fame
 *   #2-10      FOUNDERS     +12% ATK/HP, +6% crit, animated border
 *   #11-100    FIRST_ED     +5% ATK/HP, +3% crit, gold badge
 *   #101-1000  EARLY        +2% ATK/HP, +1% crit, silver badge
 *   #1001+     STANDARD     base stats, no bonus
 * 
 * STORAGE:
 *   Global mint registry: server-side (API) when online, localStorage fallback
 *   Player inventory: NW_WALLET stores card instances with serial + tier
 * 
 * USED BY:
 *   - nw-forge-engine.js (executePull → mint)
 *   - nw-battle-v7.js (getEffAtk/getEffCrit reads tier bonus)
 *   - market-trading (listings show serial + tier, transfers on buy)
 *   - Card rendering (tier determines border/badge)
 */

const NW_MINT = (() => {
    'use strict';

    // ─── Tier Definitions ───────────────────────────────────────
    const TIERS = {
        GENESIS:   { name: 'GENESIS',      maxSerial: 1,    atkBonus: 0.20, hpBonus: 0.20, critBonus: 10, dodgeBonus: 5,  color: '#ff0044', glow: '#ff0044', badge: 'I',    label: 'GENESIS #1' },
        FOUNDERS:  { name: 'FOUNDERS',     maxSerial: 10,   atkBonus: 0.12, hpBonus: 0.12, critBonus: 6,  dodgeBonus: 3,  color: '#ff6b00', glow: '#ff9100', badge: 'F',    label: 'FOUNDERS' },
        FIRST_ED:  { name: 'FIRST EDITION', maxSerial: 100,  atkBonus: 0.05, hpBonus: 0.05, critBonus: 3,  dodgeBonus: 1,  color: '#ffd700', glow: '#ffea00', badge: '1st',  label: 'FIRST EDITION' },
        EARLY:     { name: 'EARLY',        maxSerial: 1000, atkBonus: 0.02, hpBonus: 0.02, critBonus: 1,  dodgeBonus: 0,  color: '#b0bec5', glow: '#90a4ae', badge: 'E',    label: 'EARLY' },
        STANDARD:  { name: 'STANDARD',     maxSerial: Infinity, atkBonus: 0, hpBonus: 0, critBonus: 0, dodgeBonus: 0, color: '#546e7a', glow: 'none', badge: '', label: '' }
    };

    // ─── Storage Keys ───────────────────────────────────────────
    const REGISTRY_KEY = 'nw_mint_registry_v1';    // Global: { cardId -> nextSerial }
    const INVENTORY_KEY = 'nw_mint_inventory_v1';   // Player: [{ cardId, serial, tier, mintedAt }]

    // ─── Load/Save ──────────────────────────────────────────────
    function loadRegistry() {
        try {
            return JSON.parse(localStorage.getItem(REGISTRY_KEY) || '{}');
        } catch { return {}; }
    }

    function saveRegistry(reg) {
        try { localStorage.setItem(REGISTRY_KEY, JSON.stringify(reg)); } catch {}
    }

    function loadInventory() {
        try {
            return JSON.parse(localStorage.getItem(INVENTORY_KEY) || '[]');
        } catch { return []; }
    }

    function saveInventory(inv) {
        try { localStorage.setItem(INVENTORY_KEY, JSON.stringify(inv)); } catch {}
    }

    // ─── Tier Resolution ────────────────────────────────────────
    function getTier(serial) {
        if (serial === 1) return TIERS.GENESIS;
        if (serial <= 10) return TIERS.FOUNDERS;
        if (serial <= 100) return TIERS.FIRST_ED;
        if (serial <= 1000) return TIERS.EARLY;
        return TIERS.STANDARD;
    }

    function getTierName(serial) {
        return getTier(serial).name;
    }

    // ─── Mint a Card ────────────────────────────────────────────
    // Called on every pull. Returns { serial, tier, instanceId }
    function mint(cardId) {
        const registry = loadRegistry();
        const serial = (registry[cardId] || 0) + 1;
        registry[cardId] = serial;
        saveRegistry(registry);

        const tier = getTier(serial);
        const instanceId = `${cardId}-${serial}`;
        const instance = {
            instanceId,
            cardId: Number(cardId),
            serial,
            tierName: tier.name,
            mintedAt: Date.now(),
            ownerId: _getOwnerId()
        };

        // Add to player inventory
        const inventory = loadInventory();
        inventory.push(instance);
        saveInventory(inventory);

        console.log(`[NW-MINT] Minted card #${cardId} serial #${serial} (${tier.name})`);
        return instance;
    }

    // ─── Get all instances player owns for a specific card ──────
    function getPlayerInstances(cardId) {
        const inventory = loadInventory();
        return inventory.filter(i => i.cardId === Number(cardId))
            .sort((a, b) => a.serial - b.serial);
    }

    // ─── Get best (lowest serial) instance for a card ───────────
    function getBestInstance(cardId) {
        const instances = getPlayerInstances(cardId);
        return instances.length > 0 ? instances[0] : null;
    }

    // ─── Get player's full inventory ────────────────────────────
    function getInventory() {
        return loadInventory();
    }

    // ─── Transfer a card instance (for market sell/buy) ─────────
    function transfer(instanceId, newOwnerId) {
        const inventory = loadInventory();
        const idx = inventory.findIndex(i => i.instanceId === instanceId);
        if (idx === -1) return false;

        const instance = inventory[idx];

        // Remove from seller
        inventory.splice(idx, 1);
        saveInventory(inventory);

        // In a real system, the buyer's client would add it.
        // For local demo: if newOwnerId matches current player, add it
        if (newOwnerId === _getOwnerId()) {
            inventory.push({ ...instance, ownerId: newOwnerId });
            saveInventory(inventory);
        }

        console.log(`[NW-MINT] Transferred ${instanceId} to ${newOwnerId}`);
        return true;
    }

    // ─── Remove instance from inventory (when selling on market) ─
    function removeFromInventory(instanceId) {
        const inventory = loadInventory();
        const idx = inventory.findIndex(i => i.instanceId === instanceId);
        if (idx === -1) return null;
        const removed = inventory.splice(idx, 1)[0];
        saveInventory(inventory);
        return removed;
    }

    // ─── Add instance to inventory (when buying from market) ────
    function addToInventory(instance) {
        const inventory = loadInventory();
        instance.ownerId = _getOwnerId();
        inventory.push(instance);
        saveInventory(inventory);
        return instance;
    }

    // ─── Battle Stat Bonuses ────────────────────────────────────
    // Returns the bonus multipliers for a card instance in battle
    function getBattleBonus(cardId) {
        const best = getBestInstance(cardId);
        if (!best) return { atkMult: 1, hpMult: 1, critBonus: 0, dodgeBonus: 0, tier: TIERS.STANDARD };
        const tier = getTier(best.serial);
        return {
            atkMult: 1 + tier.atkBonus,
            hpMult: 1 + tier.hpBonus,
            critBonus: tier.critBonus,
            dodgeBonus: tier.dodgeBonus,
            tier,
            serial: best.serial
        };
    }

    // ─── Get mint count for a card (how many exist globally) ────
    function getTotalMinted(cardId) {
        const registry = loadRegistry();
        return registry[cardId] || 0;
    }

    // ─── Get registry stats ─────────────────────────────────────
    function getStats() {
        const registry = loadRegistry();
        const inventory = loadInventory();
        const totalMinted = Object.values(registry).reduce((a, b) => a + b, 0);
        const genCount = inventory.filter(i => getTier(i.serial).name === 'GENESIS').length;
        const foundCount = inventory.filter(i => getTier(i.serial).name === 'FOUNDERS').length;
        const firstCount = inventory.filter(i => getTier(i.serial).name === 'FIRST EDITION').length;
        return {
            totalCards: inventory.length,
            totalMinted,
            genesis: genCount,
            founders: foundCount,
            firstEdition: firstCount,
            uniqueCards: new Set(inventory.map(i => i.cardId)).size
        };
    }

    // ─── Helper: Get current player ID ──────────────────────────
    function _getOwnerId() {
        if (typeof NW_WALLET !== 'undefined' && NW_WALLET.wallet) {
            return NW_WALLET.wallet.guestId || NW_WALLET.getGuestId?.() || 'local';
        }
        return 'local';
    }

    // ─── Visual: Tier badge HTML ────────────────────────────────
    function getBadgeHTML(serial, size) {
        if (!serial) return '';
        const tier = getTier(serial);
        if (tier.name === 'STANDARD' && serial > 1000) return `<span class="mint-badge mint-standard">#${serial}</span>`;
        const sz = size || 'sm';
        return `<span class="mint-badge mint-${tier.name.toLowerCase().replace(/\s+/g, '-')}" data-serial="${serial}" data-tier="${tier.name}">
            ${tier.badge ? `<span class="mint-tier-icon">${tier.badge}</span>` : ''}
            <span class="mint-serial">#${serial}</span>
        </span>`;
    }

    // ─── Visual: Tier border CSS class ──────────────────────────
    function getTierClass(serial) {
        if (!serial) return '';
        const tier = getTier(serial);
        return 'mint-tier-' + tier.name.toLowerCase().replace(/\s+/g, '-');
    }

    // ─── Inject CSS for tier visuals ────────────────────────────
    function injectStyles() {
        if (document.getElementById('nw-mint-styles')) return;
        const style = document.createElement('style');
        style.id = 'nw-mint-styles';
        style.textContent = `
/* ═══ MINT TIER BADGES ═══ */
.mint-badge {
    display: inline-flex; align-items: center; gap: 2px;
    padding: 1px 5px; border-radius: 4px;
    font-family: 'Orbitron', monospace; font-weight: 900;
    font-size: 8px; letter-spacing: 0.5px;
    line-height: 1.2; white-space: nowrap;
    vertical-align: middle;
}
.mint-tier-icon { font-size: 7px; opacity: 0.9; }
.mint-serial { font-variant-numeric: tabular-nums; }

/* GENESIS #1 — Red holographic */
.mint-genesis {
    background: linear-gradient(135deg, #ff0044, #ff4477, #ff0044);
    color: #fff; border: 1px solid #ff0044;
    box-shadow: 0 0 8px rgba(255,0,68,0.6), inset 0 0 4px rgba(255,255,255,0.2);
    animation: mintGenesisGlow 2s infinite;
    text-shadow: 0 0 4px rgba(255,0,68,0.8);
}
@keyframes mintGenesisGlow {
    0%,100% { box-shadow: 0 0 8px rgba(255,0,68,0.6); }
    50% { box-shadow: 0 0 16px rgba(255,0,68,0.9), 0 0 30px rgba(255,0,68,0.3); }
}

/* FOUNDERS #2-10 — Orange flame */
.mint-founders {
    background: linear-gradient(135deg, #ff6b00, #ff9100);
    color: #fff; border: 1px solid #ff6b00;
    box-shadow: 0 0 6px rgba(255,107,0,0.5);
    animation: mintFoundersGlow 2.5s infinite;
}
@keyframes mintFoundersGlow {
    0%,100% { box-shadow: 0 0 6px rgba(255,107,0,0.5); }
    50% { box-shadow: 0 0 12px rgba(255,107,0,0.8); }
}

/* FIRST EDITION #11-100 — Gold */
.mint-first-edition {
    background: linear-gradient(135deg, #ffd700, #ffab00);
    color: #1a1a2e; border: 1px solid #ffd700;
    box-shadow: 0 0 4px rgba(255,215,0,0.4);
}

/* EARLY #101-1000 — Silver */
.mint-early {
    background: linear-gradient(135deg, #b0bec5, #90a4ae);
    color: #1a1a2e; border: 1px solid #b0bec5;
}

/* STANDARD #1001+ — Subtle */
.mint-standard {
    background: rgba(255,255,255,0.08);
    color: rgba(255,255,255,0.4); border: 1px solid rgba(255,255,255,0.1);
    font-size: 7px;
}

/* ═══ CARD BORDER TIERS (applied to board-card, hand-card) ═══ */
.mint-tier-genesis {
    border-color: #ff0044 !important;
    box-shadow: 0 0 12px rgba(255,0,68,0.5), inset 0 0 6px rgba(255,0,68,0.15) !important;
    animation: mintGenesisGlow 2s infinite;
}
.mint-tier-founders {
    border-color: #ff6b00 !important;
    box-shadow: 0 0 10px rgba(255,107,0,0.4) !important;
    animation: mintFoundersGlow 2.5s infinite;
}
.mint-tier-first-edition {
    border-color: #ffd700 !important;
    box-shadow: 0 0 8px rgba(255,215,0,0.3) !important;
}
.mint-tier-early {
    border-color: #b0bec5 !important;
    box-shadow: 0 0 4px rgba(176,190,197,0.2) !important;
}

/* ═══ MINT REVEAL (forge pull animation) ═══ */
.mint-reveal {
    position: absolute; bottom: 4px; left: 50%;
    transform: translateX(-50%) scale(0);
    animation: mintRevealPop 0.4s 0.3s cubic-bezier(0.34,1.56,0.64,1) forwards;
    z-index: 5;
}
@keyframes mintRevealPop {
    0% { transform: translateX(-50%) scale(0); opacity: 0; }
    100% { transform: translateX(-50%) scale(1); opacity: 1; }
}

/* ═══ MINT HALL OF FAME STAMP (Genesis only) ═══ */
.mint-hof-stamp {
    position: absolute; top: -8px; right: -8px;
    width: 28px; height: 28px;
    background: radial-gradient(circle, #ff0044, #cc0033);
    border-radius: 50%; border: 2px solid #fff;
    display: flex; align-items: center; justify-content: center;
    color: #fff; font-family: 'Orbitron', sans-serif;
    font-size: 10px; font-weight: 900;
    box-shadow: 0 0 10px rgba(255,0,68,0.6);
    animation: mintGenesisGlow 2s infinite;
    z-index: 10;
}

/* ═══ MOBILE ═══ */
@media (max-width: 375px) {
    .mint-badge { font-size: 7px; padding: 1px 3px; }
    .mint-tier-icon { font-size: 6px; }
    .mint-hof-stamp { width: 22px; height: 22px; font-size: 8px; }
}
        `;
        document.head.appendChild(style);
    }

    // ─── Init ───────────────────────────────────────────────────
    injectStyles();

    // Public API
    return {
        // Core
        mint,
        getTier,
        getTierName,
        TIERS,

        // Inventory
        getInventory,
        getPlayerInstances,
        getBestInstance,
        removeFromInventory,
        addToInventory,
        transfer,

        // Battle
        getBattleBonus,

        // Display
        getTotalMinted,
        getStats,
        getBadgeHTML,
        getTierClass,

        // Utility
        loadRegistry,
        loadInventory
    };
})();

// Expose globally
if (typeof window !== 'undefined') window.NW_MINT = NW_MINT;
