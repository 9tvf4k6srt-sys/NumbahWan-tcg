/**
 * NumbahWan Card Value System v1.0
 * ORGANIC LONG-TERM VALUE CREATION
 * 
 * Philosophy: Cards gain value through SCARCITY, UTILITY, STORY, and SOCIAL PROOF
 * Not through arbitrary price inflation
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 * WHAT MAKES A CARD VALUABLE:
 * ┌────────────────────────────────────────────────────────────────────────┐
 * │ 1. SCARCITY: Limited prints, burning reduces supply                   │
 * │ 2. UTILITY: More uses = more demand (Battle, D&D, Stake, Trade)       │
 * │ 3. STORY: Lore significance, character arc completion                 │
 * │ 4. SOCIAL PROOF: Who owns it, what was achieved with it               │
 * │ 5. TIME: Older cards become irreplaceable (no reprints)               │
 * └────────────────────────────────────────────────────────────────────────┘
 */

const NW_CARD_VALUE = {
    version: '1.0',
    
    // ═══════════════════════════════════════════════════════════════════════
    // SCARCITY SYSTEM - Supply decreases over time
    // ═══════════════════════════════════════════════════════════════════════
    
    scarcity: {
        // Print runs by rarity (NEVER increase these)
        maxPrintRuns: {
            common:    10000,
            uncommon:  5000,
            rare:      1000,
            epic:      250,
            legendary: 50,
            mythic:    10,
        },
        
        // Cards can be BURNED for Sacred Logs (reduces supply permanently)
        burnRates: {
            common:    { logs: 1,   nwgRefund: 50 },
            uncommon:  { logs: 3,   nwgRefund: 125 },
            rare:      { logs: 10,  nwgRefund: 250 },
            epic:      { logs: 50,  nwgRefund: 1000 },
            legendary: { logs: 200, nwgRefund: 5000 },
            mythic:    { logs: 1000, nwgRefund: 25000 },
        },
        
        // Display format: "Card #47 of 50"
        formatScarcity(cardNumber, maxPrint) {
            const remaining = maxPrint - (cardNumber - 1);
            const percentRemaining = ((remaining / maxPrint) * 100).toFixed(1);
            
            if (percentRemaining <= 10) return `🔥 ULTRA RARE: #${cardNumber} of ${maxPrint} (${percentRemaining}% remain)`;
            if (percentRemaining <= 25) return `⚠️ SCARCE: #${cardNumber} of ${maxPrint}`;
            return `#${cardNumber} of ${maxPrint}`;
        },
        
        // Scarcity multiplier for pricing
        getScarcityMultiplier(remaining, maxPrint) {
            const ratio = remaining / maxPrint;
            if (ratio <= 0.05) return 5.0;   // Last 5% = 5x value
            if (ratio <= 0.10) return 3.0;   // Last 10% = 3x value
            if (ratio <= 0.25) return 2.0;   // Last 25% = 2x value
            if (ratio <= 0.50) return 1.5;   // Last 50% = 1.5x value
            return 1.0;
        }
    },
    
    // ═══════════════════════════════════════════════════════════════════════
    // UTILITY SYSTEM - More uses = more demand
    // ═══════════════════════════════════════════════════════════════════════
    
    utility: {
        // Each utility adds to card value
        uses: {
            battle: {
                name: 'Battle Arena',
                description: 'Use in luck-based card battles',
                valueBoost: 1.0, // Base value
                icon: '⚔️'
            },
            dnd: {
                name: 'Tabletop Realm',
                description: 'Convert to D&D character for IRL play',
                valueBoost: 1.25, // +25% for D&D-playable cards
                icon: '🎲',
                // D&D conversion makes cards MORE valuable (utility expansion)
                conversionBonuses: {
                    // Higher rarity = stronger D&D character = more desirable
                    common:    { level: 3,  abilities: 1, spellSlots: 0 },
                    uncommon:  { level: 5,  abilities: 2, spellSlots: 1 },
                    rare:      { level: 8,  abilities: 3, spellSlots: 2 },
                    epic:      { level: 12, abilities: 4, spellSlots: 4 },
                    legendary: { level: 16, abilities: 5, spellSlots: 6 },
                    mythic:    { level: 20, abilities: 7, spellSlots: 9 },
                }
            },
            stake: {
                name: 'Staking',
                description: 'Lock for passive NWG rewards (APY)',
                valueBoost: 1.15, // +15% for stakeable cards
                icon: '🔒',
                apyRates: {
                    common:    0.05,  // 5% APY
                    uncommon:  0.10,  // 10% APY
                    rare:      0.15,  // 15% APY
                    epic:      0.25,  // 25% APY
                    legendary: 0.35,  // 35% APY
                    mythic:    0.40,  // 40% APY
                }
            },
            trade: {
                name: 'Market Trading',
                description: 'Buy/sell on open market',
                valueBoost: 1.10, // +10% for tradeable cards
                icon: '💱'
            },
            display: {
                name: 'Profile Display',
                description: 'Show off in profile/gallery',
                valueBoost: 1.05, // +5% for displayable
                icon: '🖼️'
            },
            tournament: {
                name: 'Tournament Entry',
                description: 'Required for ranked tournaments',
                valueBoost: 1.20, // +20% for tournament-legal
                icon: '🏆'
            }
        },
        
        // Calculate total utility multiplier
        getTotalUtilityMultiplier(cardUtilities = ['battle', 'trade', 'display']) {
            let multiplier = 1.0;
            cardUtilities.forEach(util => {
                if (this.uses[util]) {
                    multiplier *= this.uses[util].valueBoost;
                }
            });
            return multiplier;
        }
    },
    
    // ═══════════════════════════════════════════════════════════════════════
    // STORY VALUE - Lore significance
    // ═══════════════════════════════════════════════════════════════════════
    
    story: {
        // Cards connected to Deep Dive lore gain value
        loreConnections: {
            'reggina-origin': { 
                boost: 1.50, 
                description: 'Part of the RegginA Origin story',
                cards: ['reggina', 'reggina-young', 'reggina-founder']
            },
            'whale-wars': { 
                boost: 1.35, 
                description: 'Featured in the Whale Wars saga',
                cards: ['whale-king', 'market-crash', 'diamond-hands']
            },
            'zakum-raid': { 
                boost: 1.40, 
                description: 'Zakum Raid participant',
                cards: ['zakum', 'zakum-arm', 'boss-key']
            },
            'sacred-log': { 
                boost: 1.25, 
                description: 'Sacred Log discovery',
                cards: ['sacred-log', 'ancient-tree', 'guild-founder']
            },
            'afk-incident': { 
                boost: 1.30, 
                description: 'AFK Incident survivor',
                cards: ['afk-ghost', 'timeout', 'resurrection']
            },
            'conspiracy': { 
                boost: 1.45, 
                description: 'AI Conspiracy evidence',
                cards: ['ai-reggina', 'conspiracy-board', 'red-string']
            }
        },
        
        // Set completion bonuses
        setCompletionBonus: 1.75, // +75% value when you complete a lore set
        
        // Check if card is part of lore
        getLoreBoost(cardId) {
            for (const [loreId, lore] of Object.entries(this.loreConnections)) {
                if (lore.cards.includes(cardId)) {
                    return { boost: lore.boost, loreId, description: lore.description };
                }
            }
            return { boost: 1.0, loreId: null, description: null };
        }
    },
    
    // ═══════════════════════════════════════════════════════════════════════
    // SOCIAL PROOF - Who owns it, what was achieved
    // ═══════════════════════════════════════════════════════════════════════
    
    socialProof: {
        // Achievement badges add value
        badges: {
            'first-owner': { boost: 1.10, label: '🥇 First Owner' },
            'whale-owned': { boost: 1.25, label: '🐋 Whale Collection' },
            'tournament-winner': { boost: 1.30, label: '🏆 Tournament Winner' },
            'zakum-slayer': { boost: 1.20, label: '⚔️ Zakum Slayer' },
            'dnd-legendary': { boost: 1.15, label: '🎲 D&D Legend' },
            'streak-master': { boost: 1.10, label: '🔥 100 Win Streak' },
            'og-player': { boost: 1.35, label: '👴 OG Player (Day 1)' },
        },
        
        // Display recent notable owners
        formatOwnerHistory(owners = []) {
            if (owners.length === 0) return 'New card - be the first owner!';
            const notable = owners.filter(o => o.isWhale || o.isOG || o.achievements?.length > 0);
            if (notable.length > 0) {
                return `Previously owned by ${notable.length} notable collectors`;
            }
            return `${owners.length} previous owners`;
        }
    },
    
    // ═══════════════════════════════════════════════════════════════════════
    // TIME VALUE - Older = more valuable (no reprints)
    // ═══════════════════════════════════════════════════════════════════════
    
    timeValue: {
        // Season multipliers (older seasons = higher value)
        seasonMultipliers: {
            'S1': 2.0,   // Season 1 cards = 2x value (OG)
            'S2': 1.5,   // Season 2 = 1.5x
            'S3': 1.25,  // Season 3 = 1.25x
            'S4': 1.0,   // Current season = base value
        },
        
        // Age bonuses (card gets more valuable over time)
        getAgeBonus(mintDate) {
            const now = new Date();
            const mint = new Date(mintDate);
            const daysOld = Math.floor((now - mint) / (1000 * 60 * 60 * 24));
            
            if (daysOld >= 365) return 1.50; // 1+ year old
            if (daysOld >= 180) return 1.25; // 6+ months
            if (daysOld >= 90) return 1.15;  // 3+ months
            if (daysOld >= 30) return 1.05;  // 1+ month
            return 1.0;
        },
        
        // NO REPRINTS policy
        noReprintPolicy: `
            ⚠️ NO REPRINTS EVER
            Once a card's print run ends, it's gone forever.
            S1 cards can never be obtained again.
            This is how we protect your investment.
        `
    },
    
    // ═══════════════════════════════════════════════════════════════════════
    // MASTER VALUE CALCULATOR
    // ═══════════════════════════════════════════════════════════════════════
    
    calculateCardValue(card) {
        // Base NWG value by rarity
        const baseValues = {
            common: 100, uncommon: 250, rare: 500, 
            epic: 2000, legendary: 10000, mythic: 50000
        };
        
        let value = baseValues[card.rarity] || 100;
        const factors = [];
        
        // 1. Scarcity multiplier
        if (card.printNumber && card.maxPrint) {
            const remaining = card.maxPrint - card.printNumber + 1;
            const scarcityMult = this.scarcity.getScarcityMultiplier(remaining, card.maxPrint);
            if (scarcityMult > 1) {
                value *= scarcityMult;
                factors.push({ name: 'Scarcity', mult: scarcityMult, icon: '🔥' });
            }
        }
        
        // 2. Utility multiplier
        const utilities = card.utilities || ['battle', 'trade', 'display'];
        const utilityMult = this.utility.getTotalUtilityMultiplier(utilities);
        if (utilityMult > 1) {
            value *= utilityMult;
            factors.push({ name: 'Utility', mult: utilityMult, icon: '🔧' });
        }
        
        // 3. Lore boost
        const lore = this.story.getLoreBoost(card.id);
        if (lore.boost > 1) {
            value *= lore.boost;
            factors.push({ name: lore.description, mult: lore.boost, icon: '📖' });
        }
        
        // 4. Social proof badges
        if (card.badges && card.badges.length > 0) {
            card.badges.forEach(badgeId => {
                const badge = this.socialProof.badges[badgeId];
                if (badge) {
                    value *= badge.boost;
                    factors.push({ name: badge.label, mult: badge.boost, icon: '🏅' });
                }
            });
        }
        
        // 5. Time/Season value
        if (card.season) {
            const seasonMult = this.timeValue.seasonMultipliers[card.season] || 1.0;
            if (seasonMult > 1) {
                value *= seasonMult;
                factors.push({ name: `${card.season} Card`, mult: seasonMult, icon: '📅' });
            }
        }
        
        if (card.mintDate) {
            const ageMult = this.timeValue.getAgeBonus(card.mintDate);
            if (ageMult > 1) {
                value *= ageMult;
                factors.push({ name: 'Aged Value', mult: ageMult, icon: '⏳' });
            }
        }
        
        return {
            baseValue: baseValues[card.rarity],
            finalValue: Math.round(value),
            multiplier: (value / baseValues[card.rarity]).toFixed(2),
            factors,
            displayValue: this.formatNWG(Math.round(value)),
        };
    },
    
    // Format NWG display
    formatNWG(amount) {
        if (amount >= 1000000) return `◆ ${(amount / 1000000).toFixed(2)}M`;
        if (amount >= 1000) return `◆ ${(amount / 1000).toFixed(1)}K`;
        return `◆ ${amount}`;
    },
    
    // ═══════════════════════════════════════════════════════════════════════
    // VALUE DISPLAY COMPONENT
    // ═══════════════════════════════════════════════════════════════════════
    
    renderValueBreakdown(card) {
        const valuation = this.calculateCardValue(card);
        
        return `
            <div class="value-breakdown" style="background: rgba(0,0,0,0.4); border-radius: 12px; padding: 16px; font-family: system-ui;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                    <span style="color: rgba(255,255,255,0.6); font-size: 12px;">ESTIMATED VALUE</span>
                    <span style="color: #00d4ff; font-size: 24px; font-weight: 900;">${valuation.displayValue}</span>
                </div>
                
                <div style="font-size: 11px; color: rgba(255,255,255,0.5); margin-bottom: 8px;">
                    Base: ◆ ${valuation.baseValue} × ${valuation.multiplier}
                </div>
                
                ${valuation.factors.length > 0 ? `
                    <div style="border-top: 1px solid rgba(255,255,255,0.1); padding-top: 12px;">
                        <div style="font-size: 10px; color: rgba(255,255,255,0.4); margin-bottom: 8px;">VALUE FACTORS</div>
                        ${valuation.factors.map(f => `
                            <div style="display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 12px;">
                                <span style="color: rgba(255,255,255,0.7);">${f.icon} ${f.name}</span>
                                <span style="color: #22c55e;">×${f.mult.toFixed(2)}</span>
                            </div>
                        `).join('')}
                    </div>
                ` : ''}
                
                <div style="margin-top: 12px; padding: 8px; background: rgba(0,212,255,0.1); border-radius: 8px; font-size: 10px; color: #00d4ff;">
                    💎 This card has locked NWG value that can be redeemed when burned
                </div>
            </div>
        `;
    }
};

// Export for use across pages
if (typeof window !== 'undefined') {
    window.NW_CARD_VALUE = NW_CARD_VALUE;
}

// Log initialization
console.log('%c[NW_CARD_VALUE] v1.0 - Organic Value System loaded', 'color: #00d4ff; font-weight: bold;');
console.log('%c  Scarcity + Utility + Story + Social Proof + Time = Long-term Value', 'color: #888;');
