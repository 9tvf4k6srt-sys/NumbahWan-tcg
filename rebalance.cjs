/**
 * NW CARD REBALANCER v2.0 — Automatic Card Mechanic Rebalancing & Audit
 * ══════════════════════════════════════════════════════════════════════
 * 
 * DESIGN PHILOSOPHY:
 *   - NumbahWan core/origins cards = RELIABLY #1 (raw stat kings)
 *   - Asmongold shrine cards = exciting underdogs, need PERFECT synergy + LUCK
 *   - Shrine cards individually are BELOW their tier peers in raw stats
 *   - Only perfect combos + lucky RNG can make shrine compete
 *   - "numbahwan others numbahtwo" = OUR cards are consistently #1
 *   - Divorced Dads / Age of Alimony inspired comedic mechanics
 *   - Every tier boundary is STRICT — no lower tier outperforms higher tier
 *   - Names, abilities, and combos comedically align
 */

const fs = require('fs');
const path = require('path');

// ═══════════════════════════════════════════════
// TIER RULES — The Constitution
// ═══════════════════════════════════════════════
const TIERS = {
  common:    { costRange: [1, 2], atkRange: [1, 3], hpRange: [1, 6], maxPower: 12, maxAbilities: 0, critCap: 0.10, dodgeCap: 0.10, targetPower: 7 },
  uncommon:  { costRange: [1, 3], atkRange: [1, 4], hpRange: [2, 7], maxPower: 15, maxAbilities: 0, critCap: 0.14, dodgeCap: 0.14, targetPower: 10 },
  rare:      { costRange: [2, 4], atkRange: [2, 5], hpRange: [2, 7], maxPower: 19, maxAbilities: 1, critCap: 0.15, dodgeCap: 0.15, targetPower: 13 },
  epic:      { costRange: [3, 5], atkRange: [2, 7], hpRange: [3, 9], maxPower: 25, maxAbilities: 1, critCap: 0.18, dodgeCap: 0.18, targetPower: 18 },
  legendary: { costRange: [5, 8], atkRange: [4, 8], hpRange: [6,11], maxPower: 32, maxAbilities: 2, critCap: 0.20, dodgeCap: 0.18, targetPower: 24 },
  mythic:    { costRange: [7,10], atkRange: [6,10], hpRange: [5,11], maxPower: 40, maxAbilities: 3, critCap: 0.20, dodgeCap: 0.10, targetPower: 32 }
};

// Shrine cards get a stat PENALTY (they rely on synergy, not raw power)
const SHRINE_PENALTY = 0.88; // 12% weaker raw stats than tier peers

const calcPower = (gs) => {
  return (gs.atk||0)*1.5 + (gs.hp||0)*1.0 + (gs.crit||0)*30 + (gs.dodge||0)*25 + (gs.abilities||[]).length*3;
};

// Ability-role flavor matrix: what abilities MAKE SENSE on which roles
const ABILITY_FITS = {
  RUSH:          ['carry', 'grinder', 'rage_quitter'],
  CRIT_BOOST:    ['carry', 'theory_crafter', 'lurker'],
  LIFESTEAL:     ['carry', 'leech', 'whale'],
  SELF_DESTRUCT: ['rage_quitter', 'troll'],
  DEBUFF:        ['troll', 'lurker', 'theory_crafter'],
  TAUNT:         ['grinder', 'guild_parent', 'afk_king'],
  SHIELD:        ['guild_parent', 'grinder', 'carry', 'fashion_main'],
  DODGE:         ['lurker', 'fashion_main', 'afk_king'],
  DODGE_BOOST:   ['lurker', 'troll', 'fashion_main'],
  HEAL:          ['guild_parent', 'simp'],
  BUFF:          ['simp', 'guild_parent', 'whale', 'theory_crafter'],
  STEALTH:       ['lurker', 'leech', 'troll']
};

// ═══════════════════════════════════════════════
// REBALANCE EACH CARD
// ═══════════════════════════════════════════════
function rebalanceCard(card) {
  const gs = card.gameStats;
  if (!gs) return { card, issues: [], fixes: [] };
  
  const rules = TIERS[card.rarity];
  if (!rules) return { card, issues: [], fixes: [] };
  
  const isShrine = card.set === 'shrine';
  const issues = [];
  const fixes = [];
  
  // Effective max power for shrine cards (penalized)
  const effectiveMaxPower = isShrine ? Math.floor(rules.maxPower * SHRINE_PENALTY) : rules.maxPower;
  const effectiveTarget = isShrine ? Math.floor(rules.targetPower * SHRINE_PENALTY) : rules.targetPower;
  
  // === FIX ABILITIES COUNT ===
  if ((gs.abilities||[]).length > rules.maxAbilities) {
    const before = [...gs.abilities];
    // Keep abilities that fit the role best
    const role = card.role || 'carry';
    gs.abilities = gs.abilities
      .sort((a, b) => {
        const aFits = (ABILITY_FITS[a]||[]).includes(role) ? 1 : 0;
        const bFits = (ABILITY_FITS[b]||[]).includes(role) ? 1 : 0;
        return bFits - aFits;
      })
      .slice(0, rules.maxAbilities);
    fixes.push(`ABILITIES: ${before.join(',')} -> ${gs.abilities.join(',')}`);
    issues.push({ type: 'TOO_MANY_ABILITIES', severity: 'fix' });
  }
  
  // === FIX CRIT CAP ===
  if ((gs.crit||0) > rules.critCap) {
    const before = gs.crit;
    gs.crit = rules.critCap;
    fixes.push(`CRIT: ${before} -> ${gs.crit}`);
    issues.push({ type: 'CRIT_OVERCAP', severity: 'fix' });
  }
  
  // === FIX DODGE CAP ===
  if ((gs.dodge||0) > rules.dodgeCap) {
    const before = gs.dodge;
    gs.dodge = rules.dodgeCap;
    fixes.push(`DODGE: ${before} -> ${gs.dodge}`);
    issues.push({ type: 'DODGE_OVERCAP', severity: 'fix' });
  }
  
  // === FIX COST RANGE ===
  if (gs.cost < rules.costRange[0]) {
    gs.cost = rules.costRange[0];
    fixes.push(`COST: raised to min ${gs.cost}`);
  }
  if (gs.cost > rules.costRange[1]) {
    gs.cost = rules.costRange[1];
    fixes.push(`COST: lowered to max ${gs.cost}`);
  }
  
  // === FIX ATK RANGE ===
  if (gs.atk < rules.atkRange[0]) {
    gs.atk = rules.atkRange[0];
    fixes.push(`ATK: raised to min ${gs.atk}`);
  }
  if (gs.atk > rules.atkRange[1]) {
    const before = gs.atk;
    gs.atk = rules.atkRange[1];
    fixes.push(`ATK: ${before} -> ${gs.atk} (tier cap)`);
    issues.push({ type: 'ATK_OUT_OF_RANGE', severity: 'fix' });
  }
  
  // === FIX HP RANGE ===
  if (gs.hp < rules.hpRange[0]) {
    gs.hp = rules.hpRange[0];
    fixes.push(`HP: raised to min ${gs.hp}`);
  }
  if (gs.hp > rules.hpRange[1]) {
    const before = gs.hp;
    gs.hp = rules.hpRange[1];
    fixes.push(`HP: ${before} -> ${gs.hp} (tier cap)`);
    issues.push({ type: 'HP_OUT_OF_RANGE', severity: 'fix' });
  }
  
  // === CHECK POWER BUDGET ===
  let power = calcPower(gs);
  
  if (power > effectiveMaxPower) {
    issues.push({ type: 'OVER_BUDGET', severity: 'fix' });
    // Reduce ATK first (1.5x weight), then HP, then crit, then dodge
    let excess = power - effectiveMaxPower * 0.85;
    
    // Reduce ATK
    while (excess > 0 && gs.atk > rules.atkRange[0]) {
      gs.atk--;
      excess -= 1.5;
      fixes.push(`ATK: reduced by 1 (over budget)`);
    }
    // Reduce crit
    while (excess > 0 && (gs.crit||0) > 0) {
      gs.crit = Math.max(0, (gs.crit||0) - 0.03);
      excess -= 0.9;
      fixes.push(`CRIT: reduced by 0.03 (over budget)`);
    }
    // Reduce HP
    while (excess > 0 && gs.hp > rules.hpRange[0]) {
      gs.hp--;
      excess -= 1.0;
      fixes.push(`HP: reduced by 1 (over budget)`);
    }
    // Reduce dodge
    while (excess > 0 && (gs.dodge||0) > 0) {
      gs.dodge = Math.max(0, (gs.dodge||0) - 0.03);
      excess -= 0.75;
      fixes.push(`DODGE: reduced by 0.03 (over budget)`);
    }
  }
  
  // === CHECK UNDERPOWERED ===
  power = calcPower(gs);
  if (power < effectiveTarget * 0.5 && !isShrine) {
    issues.push({ type: 'UNDERPOWERED', severity: 'warn' });
    // Boost HP slightly
    while (calcPower(gs) < effectiveTarget * 0.6 && gs.hp < rules.hpRange[1]) {
      gs.hp++;
      fixes.push(`HP: +1 (underpowered boost)`);
    }
  }
  
  // === ABILITY-FLAVOR CHECK ===
  const role = card.role || 'carry';
  for (const ability of (gs.abilities||[])) {
    if (ABILITY_FITS[ability] && !ABILITY_FITS[ability].includes(role)) {
      issues.push({ type: 'FLAVOR_MISMATCH', severity: 'info', msg: `${ability} doesn't thematically fit ${role}` });
    }
  }
  
  // Round crit/dodge to clean values
  if (gs.crit) gs.crit = +gs.crit.toFixed(2);
  if (gs.dodge) gs.dodge = +gs.dodge.toFixed(2);
  
  return { card, issues, fixes };
}

// ═══════════════════════════════════════════════
// CROSS-TIER VALIDATION
// ═══════════════════════════════════════════════
function validateCrossTier(cards) {
  const tierOrder = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'];
  const tierAvgs = {};
  
  for (const rarity of tierOrder) {
    const tier = cards.filter(c => c.rarity === rarity);
    if (!tier.length) continue;
    const powers = tier.map(c => calcPower(c.gameStats || {}));
    tierAvgs[rarity] = {
      avg: powers.reduce((a,b) => a+b, 0) / tier.length,
      max: Math.max(...powers),
      min: Math.min(...powers),
      count: tier.length
    };
  }
  
  const violations = [];
  for (let i = 0; i < tierOrder.length - 1; i++) {
    const lower = tierOrder[i];
    const upper = tierOrder[i + 1];
    if (!tierAvgs[lower] || !tierAvgs[upper]) continue;
    
    // No lower tier card should exceed the AVERAGE of the next tier
    const lowerCards = cards.filter(c => c.rarity === lower);
    for (const card of lowerCards) {
      const power = calcPower(card.gameStats || {});
      if (power > tierAvgs[upper].avg) {
        violations.push({
          card: card.name,
          id: card.id,
          rarity: card.rarity,
          power: +power.toFixed(1),
          exceeds: `${upper} avg ${+tierAvgs[upper].avg.toFixed(1)}`
        });
        // Auto-fix: cap the card's power
        const gs = card.gameStats;
        const target = tierAvgs[upper].avg * 0.85;
        while (calcPower(gs) > target && gs.atk > TIERS[lower].atkRange[0]) {
          gs.atk--;
        }
        while (calcPower(gs) > target && gs.hp > TIERS[lower].hpRange[0]) {
          gs.hp--;
        }
        while (calcPower(gs) > target && (gs.crit||0) > 0) {
          gs.crit = Math.max(0, gs.crit - 0.02);
        }
        if (gs.crit) gs.crit = +gs.crit.toFixed(2);
      }
    }
  }
  
  return { tierAvgs, violations };
}

// ═══════════════════════════════════════════════
// MAIN REBALANCE
// ═══════════════════════════════════════════════
const dataPath = path.join(__dirname, 'public/static/data/cards-v2.json');
const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
const cards = data.cards;

console.log(`\n=== NW REBALANCER v2.0 ===`);
console.log(`Total cards: ${cards.length}`);
console.log(`Design: NW core = #1, Shrine = underdog (needs perfect play + luck)\n`);

// Phase 1: Individual card rebalance
let totalFixes = 0;
let totalIssues = 0;
const allResults = [];

for (const card of cards) {
  const result = rebalanceCard(card);
  allResults.push(result);
  if (result.fixes.length > 0) {
    totalFixes += result.fixes.length;
    totalIssues += result.issues.length;
    console.log(`[FIX] ${card.name} (${card.rarity}, id:${card.id}):`);
    result.fixes.forEach(f => console.log(`  - ${f}`));
  }
}

// Phase 2: Cross-tier validation (iterate until clean)
let pass = 0;
let violations;
do {
  pass++;
  const result = validateCrossTier(cards);
  violations = result.violations;
  if (violations.length > 0) {
    console.log(`\n[CROSS-TIER PASS ${pass}] ${violations.length} violations:`);
    violations.forEach(v => console.log(`  - ${v.card} (${v.rarity}, power ${v.power}) > ${v.exceeds}`));
  }
} while (violations.length > 0 && pass < 5);

// Phase 3: Final tier stats
const tierOrder = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'];
console.log(`\n=== FINAL TIER STATS ===`);
for (const rarity of tierOrder) {
  const tier = cards.filter(c => c.rarity === rarity);
  if (!tier.length) continue;
  const powers = tier.map(c => calcPower(c.gameStats));
  const avg = (powers.reduce((a,b)=>a+b,0)/tier.length).toFixed(1);
  const min = Math.min(...powers).toFixed(1);
  const max = Math.max(...powers).toFixed(1);
  const shrineCards = tier.filter(c => c.set === 'shrine');
  const shrinePowers = shrineCards.map(c => calcPower(c.gameStats));
  const shrineAvg = shrinePowers.length ? (shrinePowers.reduce((a,b)=>a+b,0)/shrinePowers.length).toFixed(1) : 'N/A';
  console.log(`  ${rarity.padEnd(12)} ${tier.length} cards | avg: ${avg} | range: ${min}-${max} | shrine avg: ${shrineAvg} | max: ${TIERS[rarity].maxPower}`);
}

// Phase 4: Verify shrine cards are BELOW tier peers
console.log(`\n=== SHRINE VS TIER VERIFICATION ===`);
for (const rarity of tierOrder) {
  const tier = cards.filter(c => c.rarity === rarity);
  const shrine = tier.filter(c => c.set === 'shrine');
  const nonShrine = tier.filter(c => c.set !== 'shrine');
  if (!shrine.length || !nonShrine.length) continue;
  
  const shrineAvg = shrine.reduce((s,c) => s + calcPower(c.gameStats), 0) / shrine.length;
  const nonShrineAvg = nonShrine.reduce((s,c) => s + calcPower(c.gameStats), 0) / nonShrine.length;
  const pct = ((shrineAvg / nonShrineAvg) * 100).toFixed(1);
  const ok = shrineAvg < nonShrineAvg;
  console.log(`  ${rarity.padEnd(12)} Shrine avg: ${shrineAvg.toFixed(1)} vs NW avg: ${nonShrineAvg.toFixed(1)} (${pct}%) ${ok ? 'OK - shrine weaker' : 'WARN - shrine too strong!'}`);
}

// Phase 5: Verify no cross-tier violations remain
const finalCheck = validateCrossTier(cards);
console.log(`\n=== FINAL CROSS-TIER CHECK ===`);
console.log(`  Violations remaining: ${finalCheck.violations.length}`);

// Write rebalanced data
data.lastRebalance = new Date().toISOString();
data.rebalanceVersion = 'v2.0.0-auto';
data.lastUpdated = new Date().toISOString();
fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));

// Also write to cards.json
const cardsJsonPath = path.join(__dirname, 'public/static/data/cards.json');
if (fs.existsSync(cardsJsonPath)) {
  fs.writeFileSync(cardsJsonPath, JSON.stringify(data, null, 2));
}

console.log(`\n=== REBALANCE COMPLETE ===`);
console.log(`Total fixes applied: ${totalFixes}`);
console.log(`Cards with issues: ${totalIssues}`);
console.log(`Cross-tier passes: ${pass}`);
console.log(`Files written: cards-v2.json, cards.json`);
