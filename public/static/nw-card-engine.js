/**
 * NW-CARD-ENGINE v2.0 — NumbahWan Card Combat, Synergy & Rebalance Engine
 * ═══════════════════════════════════════════════════════════════════════════
 * This is the DEFINITIVE card mechanics system. Every ability, synergy, combo,
 * and balance rule lives here. Used by battle.html, pvp-battle.html, audit
 * dashboard, and the backend rebalancer.
 *
 * DESIGN PHILOSOPHY (Season 1 — "Age of Alimony"):
 *   1. NumbahWan core/origins cards = RELIABLY #1 in raw stat power
 *   2. Asmongold shrine cards = exciting UNDERDOGS
 *      - Individually WEAKER than tier peers (77-98% raw power)
 *      - Need PERFECT synergy combos + LUCKY RNG to compete
 *      - "numbahwan others numbahtwo" — OUR cards are consistently the best
 *   3. Every ability has a CLEAR combat effect tied to the card's name/flavor
 *   4. Set bonuses reward thematic deckbuilding
 *   5. Role synergies create comedic combos (Divorced Dad Energy, Parent Trap)
 *   6. Tier boundaries are STRICT — no lower tier outperforms a higher tier
 *   7. Inspired by Divorced Dads: Age of Alimony card pack mechanics
 *      (struggle, disappointment, and even more struggle!)
 */

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 1: ABILITY DEFINITIONS
// Every ability has: name, description, phase (when it fires), effect function
// ═══════════════════════════════════════════════════════════════════════════

const NW_ABILITIES = {
  // --- OFFENSIVE ---
  RUSH: {
    name: 'Rush',
    desc: 'Attacks first. +20% ATK on first strike.',
    phase: 'pre-combat',
    icon: '⚡',
    effect: (card, team, enemy) => ({
      priority: 1,
      atkBonus: Math.ceil(card.atk * 0.20),
      firstStrike: true
    }),
    flavorMatch: ['carry', 'grinder', 'rage_quitter']
  },

  CRIT_BOOST: {
    name: 'Crit Boost',
    desc: 'Crit chance +15%. Critical hits deal 2x damage.',
    phase: 'on-attack',
    icon: '🎯',
    effect: (card) => ({
      critBonus: 0.15,
      critMultiplier: 2.0
    }),
    flavorMatch: ['carry', 'theory_crafter', 'lurker']
  },

  LIFESTEAL: {
    name: 'Lifesteal',
    desc: 'Heals for 30% of damage dealt.',
    phase: 'on-hit',
    icon: '🩸',
    effect: (card, team, enemy, dmgDealt) => ({
      healSelf: Math.ceil(dmgDealt * 0.30)
    }),
    flavorMatch: ['carry', 'leech', 'whale']
  },

  SELF_DESTRUCT: {
    name: 'Self Destruct',
    desc: 'On death: deals 150% ATK to all enemies. Goes out swinging.',
    phase: 'on-death',
    icon: '💥',
    effect: (card) => ({
      aoeDeathDamage: Math.ceil(card.atk * 1.50)
    }),
    flavorMatch: ['rage_quitter', 'troll']
  },

  DEBUFF: {
    name: 'Debuff',
    desc: 'Reduces enemy team ATK by 15% for 2 rounds.',
    phase: 'pre-combat',
    icon: '☠️',
    effect: (card, team, enemy) => ({
      enemyAtkReduction: 0.15,
      duration: 2
    }),
    flavorMatch: ['troll', 'lurker', 'theory_crafter']
  },

  // --- DEFENSIVE ---
  TAUNT: {
    name: 'Taunt',
    desc: 'Forces enemies to attack this card first. +20% HP.',
    phase: 'pre-combat',
    icon: '🛡️',
    effect: (card) => ({
      taunt: true,
      hpBonus: Math.ceil(card.hp * 0.20)
    }),
    flavorMatch: ['grinder', 'guild_parent', 'afk_king']
  },

  SHIELD: {
    name: 'Shield',
    desc: 'Blocks the first hit entirely. "Not today."',
    phase: 'on-defend',
    icon: '🔰',
    effect: () => ({
      blockFirstHit: true,
      shieldHP: 0
    }),
    flavorMatch: ['guild_parent', 'grinder', 'carry', 'fashion_main']
  },

  DODGE: {
    name: 'Dodge',
    desc: '25% chance to completely dodge an attack.',
    phase: 'on-defend',
    icon: '💨',
    effect: (card) => ({
      dodgeChance: 0.25 + (card.dodge || 0)
    }),
    flavorMatch: ['lurker', 'fashion_main', 'afk_king']
  },

  DODGE_BOOST: {
    name: 'Dodge Boost',
    desc: 'Boosts entire team dodge rate by +10%.',
    phase: 'team-buff',
    icon: '🌀',
    effect: (card, team) => ({
      teamDodgeBonus: 0.10
    }),
    flavorMatch: ['lurker', 'troll', 'fashion_main']
  },

  HEAL: {
    name: 'Heal',
    desc: 'Heals lowest HP teammate for 25% of this card\'s HP each round.',
    phase: 'end-of-round',
    icon: '💚',
    effect: (card, team) => {
      const lowest = team.filter(c => c.currentHP > 0).sort((a, b) => a.currentHP - b.currentHP)[0];
      return { healTarget: lowest?.id, healAmount: Math.ceil(card.hp * 0.25) };
    },
    flavorMatch: ['guild_parent', 'simp']
  },

  // --- SUPPORT ---
  BUFF: {
    name: 'Buff',
    desc: 'Boosts team ATK by 10%. Stacks with multiple Buffers.',
    phase: 'pre-combat',
    icon: '✨',
    effect: (card, team) => ({
      teamAtkBonus: 0.10,
      stackable: true
    }),
    flavorMatch: ['simp', 'guild_parent', 'whale', 'theory_crafter']
  },

  STEALTH: {
    name: 'Stealth',
    desc: 'Cannot be targeted for 1 round. Attacks from shadows deal +25% damage.',
    phase: 'pre-combat',
    icon: '👻',
    effect: (card) => ({
      untargetable: 1,
      stealthAtkBonus: Math.ceil(card.atk * 0.25)
    }),
    flavorMatch: ['lurker', 'leech', 'troll']
  }
};


// ═══════════════════════════════════════════════════════════════════════════
// SECTION 2: SET BONUSES (Thematic deckbuilding rewards)
// Shrine bonuses are CONDITIONAL — they need lucky triggers to compete
// NW core bonuses are RELIABLE — consistent stat boosts
// ═══════════════════════════════════════════════════════════════════════════

const NW_SET_BONUSES = {
  // --- SHRINE SET: The React Lord Collection (High ceiling, low floor) ---
  // These bonuses look powerful BUT require specific combos + RNG to fire
  shrine: {
    name: 'The React Lord Collection',
    bonuses: [
      { count: 2, desc: '+5% team Crit (modest, needs luck to proc)', effect: { teamCritBonus: 0.05 } },
      { count: 3, desc: '"React Harder" — 50/50 chance: abilities trigger twice OR fizzle round 1', effect: { teamAtkBonus: 0.05, reactGamble: true } },
      { count: 5, desc: '"Bald Sovereign\'s Plea" — +15% all stats BUT 30% chance team gets debuffed instead (Chat trolling)', effect: { sovereignGamble: true, gambleBonus: 0.15, gamblePenalty: 0.10 } },
      { count: 7, desc: '"IT IS WHAT IT IS" — Full set: +20% ATK/HP, crit round 1 — but ONLY if Asmongold mythic is alive AND Chat chaos roll is positive', effect: { fullSetConditional: true, conditionalAtkBonus: 0.20, conditionalHpBonus: 0.20 } }
    ]
  },

  // --- CORE SET: The OG Guild Meta (RELIABLE bonuses) ---
  core: {
    name: 'NumbahWan Originals',
    bonuses: [
      { count: 3, desc: '+5% team HP (reliable)', effect: { teamHpBonus: 0.05 } },
      { count: 5, desc: '+10% team HP, +5% Crit (solid)', effect: { teamHpBonus: 0.10, teamCritBonus: 0.05 } },
      { count: 8, desc: '"Guild Bond" — all TAUNT cards gain SHIELD, +15% HP (fortress)', effect: { teamHpBonus: 0.15, tauntGainsShield: true } }
    ]
  },

  // --- ORIGINS SET: RegginA Timeline (RELIABLE carry power) ---
  origins: {
    name: 'RegginA\'s Journey',
    bonuses: [
      { count: 2, desc: '+10% ATK (carry diff, always fires)', effect: { teamAtkBonus: 0.10 } },
      { count: 4, desc: '"Founder\'s Flame" — RUSH on all origins cards, +15% Crit', effect: { setGainsRush: true, teamCritBonus: 0.15 } }
    ]
  },

  // --- MOMENTS SET: Plot Armor ---
  moments: {
    name: 'Guild Memories',
    bonuses: [
      { count: 3, desc: '+8% Dodge (slippery nostalgia)', effect: { teamDodgeBonus: 0.08 } },
      { count: 5, desc: '"Plot Armor" — first card to die revives with 30% HP', effect: { teamDodgeBonus: 0.12, firstDeathRevive: 0.30 } }
    ]
  },

  // --- GEAR SET: Equipment Bonus ---
  gear: {
    name: 'Full Loadout',
    bonuses: [
      { count: 3, desc: '+5% ATK and HP', effect: { teamAtkBonus: 0.05, teamHpBonus: 0.05 } },
      { count: 5, desc: '"Fully Geared" — SHIELD on all gear cards', effect: { setGainsShield: true } }
    ]
  },

  // --- VIBES SET: Emotional Damage ---
  vibes: {
    name: 'Emotional Damage',
    bonuses: [
      { count: 3, desc: '+10% Crit (mood swing crits)', effect: { teamCritBonus: 0.10 } },
      { count: 5, desc: '"Tilt Mode" — +25% ATK but -10% HP (high risk high reward)', effect: { teamAtkBonus: 0.25, teamHpPenalty: 0.10 } }
    ]
  },

  // --- SPOTS SET: Home Advantage ---
  spots: {
    name: 'Home Turf',
    bonuses: [
      { count: 3, desc: '"Home Advantage" — +8% HP, +5% Dodge', effect: { teamHpBonus: 0.08, teamDodgeBonus: 0.05 } }
    ]
  },

  legends: {
    name: 'Hall of Fame',
    bonuses: [
      { count: 1, desc: 'Legendary presence — +3% team ATK', effect: { teamAtkBonus: 0.03 } }
    ]
  },

  fashion: {
    name: 'Drip Check',
    bonuses: [
      { count: 1, desc: '"Drip Bonus" — +10% Dodge, -5% ATK (style over substance)', effect: { teamDodgeBonus: 0.10, teamAtkPenalty: 0.05 } }
    ]
  }
};


// ═══════════════════════════════════════════════════════════════════════════
// SECTION 3: ROLE SYNERGIES (Comedic combos — Divorced Dads: Age of Alimony flavor)
// ═══════════════════════════════════════════════════════════════════════════

const NW_ROLE_SYNERGIES = {
  // --- "The Classic Carry" combo ---
  carry_duo: {
    name: 'The Classic Carry',
    desc: 'Two carries in one team? Chad energy. +15% ATK to both.',
    requires: { role: 'carry', count: 2 },
    effect: { roleAtkBonus: 0.15 },
    flavorText: '"Just duo queue, bro." — Famous last words'
  },

  // --- "The Grind Never Stops" ---
  grinder_wall: {
    name: 'The Grind Never Stops',
    desc: 'Three grinders? Unstoppable wall. +20% HP to all grinders.',
    requires: { role: 'grinder', count: 3 },
    effect: { roleHpBonus: 0.20 },
    flavorText: '"Sleep is for the numbahtwo guild."'
  },

  // --- "Trolling is a Art" (sic) ---
  troll_chaos: {
    name: 'Trolling is a Art',
    desc: 'Two trolls create chaos. Random enemy loses 20% ATK.',
    requires: { role: 'troll', count: 2 },
    effect: { randomEnemyAtkDebuff: 0.20 },
    flavorText: '"kekw" — Ancient troll scripture'
  },

  // --- "The Lurker Network" ---
  lurker_shadows: {
    name: 'The Lurker Network',
    desc: 'Three lurkers? Nobody can find them. +15% Dodge to all.',
    requires: { role: 'lurker', count: 3 },
    effect: { roleDodgeBonus: 0.15 },
    flavorText: '"We were here the whole time. Watching."'
  },

  // --- "Whale Spending Spree" ---
  whale_power: {
    name: 'Whale Spending Spree',
    desc: 'Two whales? Money talks. +10% all stats.',
    requires: { role: 'whale', count: 2 },
    effect: { roleAllStatsBonus: 0.10 },
    flavorText: '"I spent $500 on this game and I\'ll spend $500 more."'
  },

  // --- "AFK but Still Winning" ---
  afk_passive: {
    name: 'AFK but Still Winning',
    desc: 'Three AFK Kings? Auto-heal 5% HP per round. They just... exist.',
    requires: { role: 'afk_king', count: 3 },
    effect: { roleAutoHeal: 0.05 },
    flavorText: '"brb" — Last seen 3 weeks ago'
  },

  // --- "Simp Shield" ---
  simp_devotion: {
    name: 'Simp Shield',
    desc: 'Two simps? They protect the team. +10% HP to all.',
    requires: { role: 'simp', count: 2 },
    effect: { roleHpBonus: 0.10 },
    flavorText: '"I would die for content." — Every simp ever'
  },

  // --- "Rage Quit Explosion" ---
  rage_chain: {
    name: 'Rage Quit Chain Reaction',
    desc: 'Two rage quitters? When one dies, the other deals 50% more ATK.',
    requires: { role: 'rage_quitter', count: 2 },
    effect: { deathFuryBonus: 0.50 },
    flavorText: '"THIS GAME IS TRASH. *queues again*"'
  },

  // --- "Guild Mom + Guild Dad" — DIVORCED DADS ENERGY ---
  parent_trap: {
    name: 'The Parent Trap',
    desc: 'Two guild parents? Full team heals 10% HP per round. Co-parenting the guild whether they like it or not.',
    requires: { role: 'guild_parent', count: 2 },
    effect: { teamAutoHeal: 0.10 },
    flavorText: '"Did everyone eat? Did everyone pot? WHO DIED ALREADY?"'
  },

  // --- "Divorced Dad Energy" — THE AGE OF ALIMONY COMBO ---
  // Inspired by Divorced Dads: Age of Alimony TCG — struggle, disappointment, and more struggle!
  divorced_dads: {
    name: 'Divorced Dad Energy',
    desc: 'A theory_crafter and a troll together — they know everything, agree on nothing. +12% Crit from spite-fueled precision. Like two divorced dads arguing over custody of the meta.',
    requires: { roles: ['theory_crafter', 'troll'], minEach: 1 },
    effect: { teamCritBonus: 0.12 },
    flavorText: '"Actually, if you read the patch notes—" "NOBODY CARES, NERD" — Age of Alimony, Round 1'
  },

  // --- "Alimony Payment" — When you lose a card, the opponent gets weaker too ---
  alimony_payment: {
    name: 'Alimony Payment',
    desc: 'A whale and a leech on the same team — when the whale dies, the enemy team loses 15% ATK. You\'re taking everyone down with the credit card debt.',
    requires: { roles: ['whale', 'leech'], minEach: 1 },
    effect: { whaleDeathPenalty: 0.15 },
    flavorText: '"The court has ruled: half of everything goes." — Age of Alimony, Court of Chaos'
  },

  // --- "Custody Battle" — Two carries fighting for the same team ---
  custody_battle: {
    name: 'Custody Battle',
    desc: 'A carry and a guild_parent together — the carry gets +10% ATK (motivated by parental disappointment), parent gets +15% HP (stress eating).',
    requires: { roles: ['carry', 'guild_parent'], minEach: 1 },
    effect: { carryAtkBonus: 0.10, parentHpBonus: 0.15 },
    flavorText: '"I got the kids this weekend." "You got the kids LAST weekend." — The meta is a courtroom'
  },

  // --- "The Leech + Carry Dynamic" ---
  carry_me_please: {
    name: 'Carry Me Please',
    desc: 'A carry and a leech together. Carry gets +20% ATK (motivated by rage), leech gets +30% HP (hiding behind carry).',
    requires: { roles: ['carry', 'leech'], minEach: 1 },
    effect: { carryAtkBonus: 0.20, leechHpBonus: 0.30 },
    flavorText: '"I contributed emotionally." — The leech'
  },

  // --- "Weekend Dad" — AFK King + Carry ---
  weekend_dad: {
    name: 'Weekend Dad',
    desc: 'An AFK King and a carry — the carry does all the work while AFK King shows up once a round to auto-heal 8%. Classic weekend dad energy.',
    requires: { roles: ['afk_king', 'carry'], minEach: 1 },
    effect: { afkAutoHeal: 0.08, carryAtkBonus: 0.05 },
    flavorText: '"I\'ll be there for the boss fight. Probably." — Every weekend dad'
  },

  // === SHRINE-SPECIFIC COMBOS (high ceiling but LUCK-DEPENDENT) ===

  // --- "The Zack & Rich Show" (Shrine exclusive combo) ---
  // Powerful BUT McConnell's dodge-dependent survival makes it inconsistent
  asmon_mcconnell: {
    name: 'The Zack & Rich Show',
    desc: 'Asmongold (700) + McConnell (702): +15% Crit, McConnell gains TAUNT (reluctantly), Asmongold gets +50% LIFESTEAL heal. BUT McConnell has low HP — if he dies early, Asmon loses LIFESTEAL bonus.',
    requires: { cards: [700, 702] },
    effect: { teamCritBonus: 0.15, mcconnellGainsTaunt: true, asmongoldLifestealBoost: 0.50 },
    flavorText: '"We\'re not friends. I just tolerate him." — Both of them, simultaneously'
  },

  // --- "Dr Pepper Power Hour" (conditional RUSH boost) ---
  dr_pepper_fuel: {
    name: 'Dr Pepper Power Hour',
    desc: 'Zack\'s Dr Pepper (704) + any carry: 60% chance RUSH triggers twice (sugar rush), 40% chance sugar crash (-10% ATK round 2).',
    requires: { cards: [704], roles: ['carry'], minCarry: 1 },
    effect: { sugarRushGamble: true, rushBonus: 0.15, crashPenalty: 0.10 },
    flavorText: '"23 flavors of maybe winning." — Dr Pepper, probably'
  },

  // --- "Chat Decides" (pure chaos) ---
  chat_chaos: {
    name: 'Chat Decides',
    desc: 'Chat (706) in team: Every round, 50% chance for +20% ATK, 50% chance for -15% ATK to whole team. Chat is unpredictable. This is a liability.',
    requires: { cards: [706] },
    effect: { chaosRoll: true, chaosPositive: 0.20, chaosNegative: -0.15 },
    flavorText: '"KEKW" — 10,000 voices making your strategy meaningless'
  },

  // --- "Cockroach Endurance" (survival but no damage) ---
  cockroach_endure: {
    name: 'Cockroach Endurance',
    desc: 'The Cockroach (705) + any 2 shrine cards: Cockroach gains auto-revive once at 15% HP. Still hits like a wet noodle though.',
    requires: { cards: [705], setCount: { shrine: 3 } },
    effect: { cockroachRevive: true },
    flavorText: '"Even after the apocalypse, this thing will still be watching streams."'
  },

  // --- "The Full Asmon Experience" (needs EVERYTHING to align) ---
  full_asmon: {
    name: 'The Full Asmon Experience',
    desc: 'Asmongold (700) + McConnell (702) + Dr Pepper (704) + React Throne (701): IF Chat chaos is positive AND crit procs round 1, Asmongold gets +30% ATK. Otherwise, just +5% ATK. The stars must align.',
    requires: { cards: [700, 701, 702, 704] },
    effect: { fullAsmonConditional: true, perfectBonus: 0.30, normalBonus: 0.05 },
    flavorText: '"It is what it is... and what it is, is a coin flip."'
  }
};


// ═══════════════════════════════════════════════════════════════════════════
// SECTION 4: TIER BALANCE RULES (The Rebalancer's Constitution)
// Updated for v2.0 — tighter ranges, shrine penalty built in
// ═══════════════════════════════════════════════════════════════════════════

const NW_BALANCE_RULES = {
  tiers: {
    common:    { costRange: [1, 2], atkRange: [1, 3], hpRange: [1, 6], maxPower: 12, maxAbilities: 0, critCap: 0.10, dodgeCap: 0.10 },
    uncommon:  { costRange: [1, 3], atkRange: [1, 4], hpRange: [2, 7], maxPower: 15, maxAbilities: 0, critCap: 0.14, dodgeCap: 0.14 },
    rare:      { costRange: [2, 4], atkRange: [2, 5], hpRange: [2, 7], maxPower: 19, maxAbilities: 1, critCap: 0.15, dodgeCap: 0.15 },
    epic:      { costRange: [3, 5], atkRange: [2, 7], hpRange: [3, 9], maxPower: 25, maxAbilities: 1, critCap: 0.18, dodgeCap: 0.18 },
    legendary: { costRange: [5, 8], atkRange: [4, 8], hpRange: [6,11], maxPower: 32, maxAbilities: 2, critCap: 0.20, dodgeCap: 0.18 },
    mythic:    { costRange: [7,10], atkRange: [6,10], hpRange: [5,11], maxPower: 40, maxAbilities: 3, critCap: 0.20, dodgeCap: 0.10 }
  },

  // Shrine penalty: shrine cards have 88% power budget vs NW cards
  SHRINE_PENALTY: 0.88,

  calcPower(card) {
    const gs = card.gameStats || {};
    return (
      (gs.atk || 0) * 1.5 +
      (gs.hp || 0) * 1.0 +
      (gs.crit || 0) * 30 +
      (gs.dodge || 0) * 25 +
      (gs.abilities || []).length * 3
    );
  },

  calcEfficiency(card) {
    const gs = card.gameStats || {};
    const cost = gs.cost || 1;
    return this.calcPower(card) / cost;
  }
};


// ═══════════════════════════════════════════════════════════════════════════
// SECTION 5: THE REBALANCER (Automatic audit + fix engine)
// ═══════════════════════════════════════════════════════════════════════════

const NW_REBALANCER = {
  audit(cards) {
    const issues = [];
    const fixes = [];
    const tierStats = {};

    for (const rarity of Object.keys(NW_BALANCE_RULES.tiers)) {
      const tier = cards.filter(c => c.rarity === rarity);
      if (!tier.length) continue;
      const powers = tier.map(c => NW_BALANCE_RULES.calcPower(c));
      tierStats[rarity] = {
        count: tier.length,
        avgPower: +(powers.reduce((a, b) => a + b, 0) / tier.length).toFixed(1),
        minPower: +Math.min(...powers).toFixed(1),
        maxPower: +Math.max(...powers).toFixed(1),
        target: +(NW_BALANCE_RULES.tiers[rarity].maxPower * 0.65).toFixed(1)
      };
    }

    for (const card of cards) {
      const gs = card.gameStats || {};
      const rules = NW_BALANCE_RULES.tiers[card.rarity];
      if (!rules) continue;

      const power = NW_BALANCE_RULES.calcPower(card);
      const isShrine = card.set === 'shrine';
      const effectiveMax = isShrine ? rules.maxPower * NW_BALANCE_RULES.SHRINE_PENALTY : rules.maxPower;
      const cardIssues = [];

      if (gs.cost < rules.costRange[0] || gs.cost > rules.costRange[1])
        cardIssues.push({ type: 'COST_OUT_OF_RANGE', msg: 'Cost ' + gs.cost + ' outside ' + card.rarity + ' range', severity: 'warn' });
      if (gs.atk < rules.atkRange[0] || gs.atk > rules.atkRange[1])
        cardIssues.push({ type: 'ATK_OUT_OF_RANGE', severity: 'warn' });
      if (gs.hp < rules.hpRange[0] || gs.hp > rules.hpRange[1])
        cardIssues.push({ type: 'HP_OUT_OF_RANGE', severity: 'warn' });
      if ((gs.crit || 0) > rules.critCap)
        cardIssues.push({ type: 'CRIT_OVERCAP', severity: 'fix' });
      if ((gs.dodge || 0) > rules.dodgeCap)
        cardIssues.push({ type: 'DODGE_OVERCAP', severity: 'fix' });
      if ((gs.abilities || []).length > rules.maxAbilities)
        cardIssues.push({ type: 'TOO_MANY_ABILITIES', severity: 'fix' });
      if (power > effectiveMax)
        cardIssues.push({ type: 'OVER_BUDGET', msg: 'Power ' + power.toFixed(1) + ' > ' + effectiveMax.toFixed(1) + (isShrine ? ' (shrine-penalized)' : ''), severity: 'fix' });

      // Cross-tier
      const tierOrder = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'];
      const tierIdx = tierOrder.indexOf(card.rarity);
      if (tierIdx < 5) {
        const nextTier = tierOrder[tierIdx + 1];
        if (tierStats[nextTier] && power > tierStats[nextTier].avgPower)
          cardIssues.push({ type: 'CROSS_TIER_OP', severity: 'critical' });
      }

      // Ability-flavor
      for (const ability of (gs.abilities || [])) {
        const abilDef = NW_ABILITIES[ability];
        if (abilDef && card.role && !abilDef.flavorMatch.includes(card.role))
          cardIssues.push({ type: 'FLAVOR_MISMATCH', msg: ability + ' on ' + card.role, severity: 'info' });
      }

      if (cardIssues.length > 0)
        issues.push({ card: { id: card.id, name: card.name, rarity: card.rarity, set: card.set }, power: +power.toFixed(1), issues: cardIssues });
    }

    for (const item of issues) {
      const card = cards.find(c => c.id === item.card.id);
      if (!card) continue;
      const fixable = item.issues.filter(i => i.severity === 'fix' || i.severity === 'critical');
      if (fixable.length > 0) fixes.push(this._generateFix(card, item.issues));
    }

    return {
      issues,
      fixes,
      summary: {
        totalCards: cards.length,
        totalIssues: issues.length,
        criticalIssues: issues.filter(i => i.issues.some(x => x.severity === 'critical')).length,
        fixableIssues: fixes.length,
        tierStats,
        shrineAnalysis: this._analyzeShrineBalance(cards, tierStats)
      }
    };
  },

  _analyzeShrineBalance(cards, tierStats) {
    const analysis = {};
    const tierOrder = ['common','uncommon','rare','epic','legendary','mythic'];
    for (const rarity of tierOrder) {
      const shrine = cards.filter(c => c.rarity === rarity && c.set === 'shrine');
      const nw = cards.filter(c => c.rarity === rarity && c.set !== 'shrine');
      if (!shrine.length) continue;
      const shrinePow = shrine.reduce((s,c) => s + NW_BALANCE_RULES.calcPower(c), 0) / shrine.length;
      const nwPow = nw.length ? nw.reduce((s,c) => s + NW_BALANCE_RULES.calcPower(c), 0) / nw.length : 0;
      analysis[rarity] = {
        shrinePower: +shrinePow.toFixed(1),
        nwPower: +nwPow.toFixed(1),
        ratio: nwPow ? +((shrinePow / nwPow) * 100).toFixed(1) : 0,
        isWeaker: shrinePow < nwPow,
        verdict: shrinePow < nwPow ? 'SHRINE WEAKER (correct)' : 'WARN: shrine too strong!'
      };
    }
    return analysis;
  },

  _generateFix(card, issues) {
    const gs = { ...card.gameStats };
    const rules = NW_BALANCE_RULES.tiers[card.rarity];
    const changes = [];

    for (const issue of issues) {
      switch (issue.type) {
        case 'CRIT_OVERCAP':
          changes.push({ field: 'crit', from: gs.crit, to: rules.critCap });
          gs.crit = rules.critCap;
          break;
        case 'DODGE_OVERCAP':
          changes.push({ field: 'dodge', from: gs.dodge, to: rules.dodgeCap });
          gs.dodge = rules.dodgeCap;
          break;
        case 'TOO_MANY_ABILITIES': {
          const trimmed = gs.abilities.slice(0, rules.maxAbilities);
          changes.push({ field: 'abilities', from: gs.abilities, to: trimmed });
          gs.abilities = trimmed;
          break;
        }
        case 'CROSS_TIER_OP':
        case 'OVER_BUDGET': {
          const effectiveMax = card.set === 'shrine' ? rules.maxPower * NW_BALANCE_RULES.SHRINE_PENALTY : rules.maxPower;
          const currentPower = NW_BALANCE_RULES.calcPower({ gameStats: gs });
          const excess = currentPower - effectiveMax * 0.80;
          if (excess > 0) {
            const atkReduce = Math.min(Math.ceil(excess / 1.5), gs.atk - rules.atkRange[0]);
            if (atkReduce > 0) {
              changes.push({ field: 'atk', from: gs.atk, to: gs.atk - atkReduce });
              gs.atk -= atkReduce;
            }
          }
          break;
        }
      }
    }

    return { cardId: card.id, cardName: card.name, rarity: card.rarity, set: card.set, changes, before: { ...card.gameStats }, after: { ...gs } };
  },

  applyFixes(cards, fixes) {
    let applied = 0;
    for (const fix of fixes) {
      const card = cards.find(c => c.id === fix.cardId);
      if (!card) continue;
      for (const change of fix.changes) card.gameStats[change.field] = change.to;
      applied++;
    }
    return applied;
  }
};


// ═══════════════════════════════════════════════════════════════════════════
// SECTION 6: COMBAT SIMULATOR
// Shrine bonuses are LUCK-DEPENDENT, NW bonuses are RELIABLE
// ═══════════════════════════════════════════════════════════════════════════

const NW_COMBAT = {
  simulate(teamA, teamB, maxRounds = 10) {
    const a = teamA.map(c => this._initCombatCard(c));
    const b = teamB.map(c => this._initCombatCard(c));
    const log = [];

    this._applySetBonuses(a, log, 'A');
    this._applySetBonuses(b, log, 'B');
    this._applyRoleSynergies(a, log, 'A');
    this._applyRoleSynergies(b, log, 'B');
    this._processPhase(a, b, 'pre-combat', log);
    this._processPhase(b, a, 'pre-combat', log);

    // NO auto-win for shrine. The "IT IS WHAT IT IS" bonus is conditional
    // and luck-dependent (see set bonus logic). NW core doesn't need auto-win
    // because they just out-stat everyone.

    for (let round = 1; round <= maxRounds; round++) {
      log.push({ round, event: 'ROUND_START' });

      const aliveA = a.filter(c => c.currentHP > 0);
      const aliveB = b.filter(c => c.currentHP > 0);
      if (aliveA.length === 0 || aliveB.length === 0) break;

      // Chat chaos: re-roll every round if Chat is in team
      this._applyChatChaos(a, round, log, 'A');
      this._applyChatChaos(b, round, log, 'B');

      const allCards = [
        ...aliveA.map(c => ({ ...c, team: 'A', enemies: aliveB })),
        ...aliveB.map(c => ({ ...c, team: 'B', enemies: aliveA }))
      ].sort((x, y) => {
        const xRush = x._rush ? 1 : 0;
        const yRush = y._rush ? 1 : 0;
        return yRush - xRush || Math.random() - 0.5;
      });

      for (const attacker of allCards) {
        const realCard = (attacker.team === 'A' ? a : b).find(c => c.id === attacker.id);
        if (!realCard || realCard.currentHP <= 0) continue;

        if (realCard._stealth > 0) {
          realCard._stealth--;
          log.push({ round, event: 'STEALTH_SKIP', card: realCard.name, team: attacker.team });
          continue;
        }

        const enemies = attacker.team === 'A' ? b.filter(c => c.currentHP > 0) : a.filter(c => c.currentHP > 0);
        if (enemies.length === 0) break;

        const tauntTargets = enemies.filter(c => c._taunt && !c._stealth);
        const target = tauntTargets.length > 0
          ? tauntTargets[Math.floor(Math.random() * tauntTargets.length)]
          : enemies[Math.floor(Math.random() * enemies.length)];

        let dmg = realCard.combatATK + (realCard._stealthAtkBonus || 0);
        realCard._stealthAtkBonus = 0;

        const critChance = (realCard.combatCrit || 0) + (realCard._critBonus || 0);
        const isCrit = Math.random() < critChance || (round === 1 && realCard._guaranteedCritR1);
        if (isCrit) {
          dmg = Math.ceil(dmg * (realCard._critMult || 1.5));
          log.push({ round, event: 'CRIT', card: realCard.name, team: attacker.team, dmg });
        }

        const dodgeChance = (target.combatDodge || 0) + (target._dodgeBonus || 0);
        if (Math.random() < dodgeChance) {
          log.push({ round, event: 'DODGE', card: target.name, attacker: realCard.name });
          continue;
        }

        if (target._shield) {
          target._shield = false;
          log.push({ round, event: 'SHIELD_BLOCK', card: target.name, attacker: realCard.name });
          continue;
        }

        target.currentHP = Math.max(0, target.currentHP - dmg);
        log.push({ round, event: 'ATTACK', attacker: realCard.name, target: target.name, dmg, remainHP: target.currentHP });

        if (realCard._lifesteal) {
          const lsMult = realCard._lifestealBoost ? (1 + realCard._lifestealBoost) : 1;
          const heal = Math.ceil(dmg * 0.30 * lsMult);
          realCard.currentHP = Math.min(realCard.maxHP, realCard.currentHP + heal);
          log.push({ round, event: 'LIFESTEAL', card: realCard.name, heal });
        }

        if (target.currentHP <= 0) {
          log.push({ round, event: 'DEATH', card: target.name });

          if (target._selfDestruct) {
            const aoe = Math.ceil(target.combatATK * 1.50);
            const attackerTeam = attacker.team === 'A' ? a.filter(c => c.currentHP > 0) : b.filter(c => c.currentHP > 0);
            for (const ally of attackerTeam) ally.currentHP = Math.max(0, ally.currentHP - aoe);
            log.push({ round, event: 'SELF_DESTRUCT', card: target.name, dmg: aoe });
          }

          if (target._deathFuryTeam) {
            const teammates = (target._team === 'A' ? a : b).filter(c => c.currentHP > 0 && c.role === 'rage_quitter');
            for (const mate of teammates) {
              mate.combatATK = Math.ceil(mate.combatATK * 1.50);
              log.push({ round, event: 'DEATH_FURY', card: mate.name });
            }
          }

          // Alimony payment: whale dies, enemy team loses ATK
          if (target._whaleDeathPenalty) {
            const enemyTeam = target._team === 'A' ? b.filter(c => c.currentHP > 0) : a.filter(c => c.currentHP > 0);
            for (const e of enemyTeam) e.combatATK = Math.ceil(e.combatATK * (1 - target._whaleDeathPenalty));
            log.push({ round, event: 'ALIMONY_PAYMENT', card: target.name, msg: 'The court has ruled: half of everything goes.' });
          }

          if (target._reviveOnce && !target._reviveUsed) {
            target._reviveUsed = true;
            target.currentHP = Math.ceil(target.maxHP * 0.30);
            log.push({ round, event: 'REVIVE', card: target.name, hp: target.currentHP });
          }

          // Cockroach revive (shrine synergy)
          if (target._cockroachRevive && !target._cockroachReviveUsed) {
            target._cockroachReviveUsed = true;
            target.currentHP = Math.ceil(target.maxHP * 0.15);
            log.push({ round, event: 'COCKROACH_REVIVE', card: target.name, hp: target.currentHP, msg: 'The Cockroach endures.' });
          }

          // McConnell death breaks Asmongold lifesteal boost
          if (target.id === 702) {
            const asmon = (target._team === 'A' ? a : b).find(c => c.id === 700);
            if (asmon) {
              asmon._lifestealBoost = 0;
              log.push({ round, event: 'SYNERGY_BREAK', msg: 'McConnell died! Asmongold loses lifesteal boost.' });
            }
          }
        }
      }

      this._processEndOfRound(a, b, round, log);
      this._processEndOfRound(b, a, round, log);

      if (a.filter(c => c.currentHP > 0).length === 0) return { winner: 'B', rounds: round, log, teamAFinal: a, teamBFinal: b };
      if (b.filter(c => c.currentHP > 0).length === 0) return { winner: 'A', rounds: round, log, teamAFinal: a, teamBFinal: b };
    }

    const hpA = a.reduce((s, c) => s + Math.max(0, c.currentHP), 0);
    const hpB = b.reduce((s, c) => s + Math.max(0, c.currentHP), 0);
    return { winner: hpA >= hpB ? 'A' : 'B', rounds: maxRounds, log, teamAFinal: a, teamBFinal: b };
  },

  _initCombatCard(card) {
    const gs = card.gameStats || {};
    return {
      id: card.id, name: card.name, rarity: card.rarity, role: card.role, set: card.set,
      combatATK: gs.atk || 0, combatCrit: gs.crit || 0, combatDodge: gs.dodge || 0,
      maxHP: gs.hp || 1, currentHP: gs.hp || 1, abilities: gs.abilities || [],
      _rush: (gs.abilities || []).includes('RUSH'),
      _taunt: false, _shield: (gs.abilities || []).includes('SHIELD'),
      _stealth: 0, _stealthAtkBonus: 0,
      _lifesteal: (gs.abilities || []).includes('LIFESTEAL'),
      _lifestealBoost: 0,
      _selfDestruct: (gs.abilities || []).includes('SELF_DESTRUCT'),
      _critBonus: 0, _critMult: 1.5, _dodgeBonus: 0,
      _autoHeal: 0, _deathFuryTeam: false,
      _reviveOnce: false, _reviveUsed: false,
      _guaranteedCritR1: false, _autoWin: false,
      _team: null, _debuffDuration: 0, _atkDebuff: 0,
      _whaleDeathPenalty: 0,
      _cockroachRevive: false, _cockroachReviveUsed: false,
      _chatChaos: false
    };
  },

  _applySetBonuses(team, log, teamLabel) {
    const setCounts = {};
    for (const card of team) setCounts[card.set] = (setCounts[card.set] || 0) + 1;
    team.forEach(c => c._team = teamLabel);

    for (const [setName, count] of Object.entries(setCounts)) {
      const setDef = NW_SET_BONUSES[setName];
      if (!setDef) continue;

      for (const bonus of setDef.bonuses) {
        if (count >= bonus.count) {
          const fx = bonus.effect;

          // RELIABLE bonuses (NW sets)
          if (fx.teamAtkBonus && !fx.reactGamble && !fx.sovereignGamble && !fx.fullSetConditional) {
            team.forEach(c => c.combatATK = Math.ceil(c.combatATK * (1 + fx.teamAtkBonus)));
          }
          if (fx.teamHpBonus) {
            team.forEach(c => { c.maxHP = Math.ceil(c.maxHP * (1 + fx.teamHpBonus)); c.currentHP = c.maxHP; });
          }
          if (fx.teamCritBonus && !fx.reactGamble) team.forEach(c => c._critBonus += fx.teamCritBonus);
          if (fx.teamDodgeBonus) team.forEach(c => c._dodgeBonus += fx.teamDodgeBonus);
          if (fx.teamAllStatsBonus) {
            team.forEach(c => {
              c.combatATK = Math.ceil(c.combatATK * (1 + fx.teamAllStatsBonus));
              c.maxHP = Math.ceil(c.maxHP * (1 + fx.teamAllStatsBonus));
              c.currentHP = c.maxHP;
            });
          }
          if (fx.teamHpPenalty) {
            team.forEach(c => { c.maxHP = Math.ceil(c.maxHP * (1 - fx.teamHpPenalty)); c.currentHP = c.maxHP; });
          }
          if (fx.teamAtkPenalty) team.forEach(c => c.combatATK = Math.ceil(c.combatATK * (1 - fx.teamAtkPenalty)));
          if (fx.firstDeathRevive) team.forEach(c => c._reviveOnce = true);
          if (fx.tauntGainsShield) team.filter(c => c._taunt).forEach(c => c._shield = true);
          if (fx.setGainsRush) team.filter(c => c.set === setName).forEach(c => c._rush = true);
          if (fx.setGainsShield) team.filter(c => c.set === setName).forEach(c => c._shield = true);

          // SHRINE GAMBLE bonuses (luck-dependent)
          if (fx.reactGamble) {
            const lucky = Math.random() < 0.50;
            if (lucky) {
              team.forEach(c => c._critBonus += 0.05);
              log.push({ round: 0, event: 'REACT_GAMBLE', team: teamLabel, result: 'WIN', msg: '"React Harder" procs! +5% crit' });
            } else {
              log.push({ round: 0, event: 'REACT_GAMBLE', team: teamLabel, result: 'FAIL', msg: '"React Harder" fizzles. Chat is disappointed.' });
            }
          }

          if (fx.sovereignGamble) {
            const lucky = Math.random() < 0.70;
            if (lucky) {
              team.forEach(c => {
                c.combatATK = Math.ceil(c.combatATK * (1 + fx.gambleBonus));
                c.maxHP = Math.ceil(c.maxHP * (1 + fx.gambleBonus));
                c.currentHP = c.maxHP;
              });
              log.push({ round: 0, event: 'SOVEREIGN_GAMBLE', team: teamLabel, result: 'WIN', msg: 'Bald Sovereign\'s Plea succeeds! +15% all stats' });
            } else {
              team.forEach(c => c.combatATK = Math.ceil(c.combatATK * (1 - fx.gamblePenalty)));
              log.push({ round: 0, event: 'SOVEREIGN_GAMBLE', team: teamLabel, result: 'FAIL', msg: 'Chat trolled the Sovereign! -10% ATK' });
            }
          }

          if (fx.fullSetConditional) {
            // Only fires if Asmongold mythic is present AND a lucky roll
            const hasAsmon = team.some(c => c.id === 700);
            const lucky = Math.random() < 0.40; // Only 40% chance!
            if (hasAsmon && lucky) {
              team.forEach(c => {
                c.combatATK = Math.ceil(c.combatATK * (1 + fx.conditionalAtkBonus));
                c.maxHP = Math.ceil(c.maxHP * (1 + fx.conditionalHpBonus));
                c.currentHP = c.maxHP;
              });
              team.forEach(c => c._guaranteedCritR1 = true);
              log.push({ round: 0, event: 'IT_IS_WHAT_IT_IS', team: teamLabel, result: 'WIN', msg: 'IT IS WHAT IT IS! Full shrine activated! +20% all stats!' });
            } else {
              log.push({ round: 0, event: 'IT_IS_WHAT_IT_IS', team: teamLabel, result: 'FAIL', msg: hasAsmon ? 'The stars didn\'t align. Just a +5% ATK consolation.' : 'Asmongold not present. Shrine power dormant.' });
              team.forEach(c => c.combatATK = Math.ceil(c.combatATK * 1.05));
            }
          }

          log.push({ round: 0, event: 'SET_BONUS', team: teamLabel, set: setDef.name, bonus: bonus.desc });
        }
      }
    }
  },

  _applyRoleSynergies(team, log, teamLabel) {
    const roleCounts = {};
    for (const card of team) {
      if (card.role) roleCounts[card.role] = (roleCounts[card.role] || 0) + 1;
    }
    const cardIds = new Set(team.map(c => c.id));

    for (const [key, syn] of Object.entries(NW_ROLE_SYNERGIES)) {
      let active = false;

      if (syn.requires.role && roleCounts[syn.requires.role] >= syn.requires.count) active = true;
      if (syn.requires.roles) {
        active = syn.requires.roles.every(r => roleCounts[r] >= (syn.requires.minEach || 1));
      }
      if (syn.requires.cards) {
        active = syn.requires.cards.every(id => cardIds.has(id));
        if (syn.requires.roles) {
          active = active && syn.requires.roles.every(r => roleCounts[r] >= (syn.requires.minCarry || syn.requires.minEach || 1));
        }
        if (syn.requires.setCount) {
          const setCounts = {};
          team.forEach(c => setCounts[c.set] = (setCounts[c.set]||0)+1);
          for (const [s,cnt] of Object.entries(syn.requires.setCount)) {
            if ((setCounts[s]||0) < cnt) active = false;
          }
        }
      }

      if (!active) continue;

      const fx = syn.effect;
      if (fx.roleAtkBonus) team.filter(c => c.role === syn.requires.role).forEach(c => c.combatATK = Math.ceil(c.combatATK * (1 + fx.roleAtkBonus)));
      if (fx.roleHpBonus) team.filter(c => c.role === syn.requires.role).forEach(c => { c.maxHP = Math.ceil(c.maxHP * (1 + fx.roleHpBonus)); c.currentHP = c.maxHP; });
      if (fx.roleDodgeBonus) team.filter(c => c.role === syn.requires.role).forEach(c => c._dodgeBonus += fx.roleDodgeBonus);
      if (fx.roleAllStatsBonus) team.forEach(c => { c.combatATK = Math.ceil(c.combatATK * (1 + fx.roleAllStatsBonus)); c.maxHP = Math.ceil(c.maxHP * (1 + fx.roleAllStatsBonus)); c.currentHP = c.maxHP; });
      if (fx.roleAutoHeal) team.filter(c => c.role === syn.requires.role).forEach(c => c._autoHeal += fx.roleAutoHeal);
      if (fx.teamAutoHeal) team.forEach(c => c._autoHeal += fx.teamAutoHeal);
      if (fx.teamCritBonus) team.forEach(c => c._critBonus += fx.teamCritBonus);
      if (fx.deathFuryBonus) team.filter(c => c.role === 'rage_quitter').forEach(c => c._deathFuryTeam = true);
      if (fx.carryAtkBonus) team.filter(c => c.role === 'carry').forEach(c => c.combatATK = Math.ceil(c.combatATK * (1 + fx.carryAtkBonus)));
      if (fx.leechHpBonus) team.filter(c => c.role === 'leech').forEach(c => { c.maxHP = Math.ceil(c.maxHP * (1 + fx.leechHpBonus)); c.currentHP = c.maxHP; });
      if (fx.parentHpBonus) team.filter(c => c.role === 'guild_parent').forEach(c => { c.maxHP = Math.ceil(c.maxHP * (1 + fx.parentHpBonus)); c.currentHP = c.maxHP; });
      if (fx.afkAutoHeal) team.filter(c => c.role === 'afk_king').forEach(c => c._autoHeal += fx.afkAutoHeal);
      if (fx.whaleDeathPenalty) team.filter(c => c.role === 'whale').forEach(c => c._whaleDeathPenalty = fx.whaleDeathPenalty);

      // Shrine-specific conditional synergies
      if (fx.mcconnellGainsTaunt) { const mc = team.find(c => c.id === 702); if (mc) mc._taunt = true; }
      if (fx.asmongoldLifestealBoost) { const as = team.find(c => c.id === 700); if (as) as._lifestealBoost = fx.asmongoldLifestealBoost; }

      if (fx.sugarRushGamble) {
        const lucky = Math.random() < 0.60;
        if (lucky) {
          team.filter(c => c._rush).forEach(c => c.combatATK = Math.ceil(c.combatATK * (1 + fx.rushBonus)));
          log.push({ round: 0, event: 'SUGAR_RUSH', team: teamLabel, result: 'WIN', msg: 'Sugar rush! RUSH cards get +15% ATK' });
        } else {
          log.push({ round: 0, event: 'SUGAR_CRASH', team: teamLabel, result: 'FAIL', msg: 'Sugar crash incoming round 2... -10% ATK' });
          // Crash applied in round 2 processing
        }
      }

      if (fx.chaosRoll) {
        team.forEach(c => c._chatChaos = true);
        // First chaos roll
        const roll = Math.random() < 0.5;
        const mult = roll ? (1 + fx.chaosPositive) : (1 + fx.chaosNegative);
        team.forEach(c => c.combatATK = Math.ceil(c.combatATK * mult));
        log.push({ round: 0, event: 'CHAT_CHAOS', team: teamLabel, positive: roll, msg: roll ? 'Chat says POGGERS! +20% ATK' : 'Chat says KEKW! -15% ATK' });
      }

      if (fx.cockroachRevive) {
        const roach = team.find(c => c.id === 705);
        if (roach) roach._cockroachRevive = true;
      }

      if (fx.fullAsmonConditional) {
        // This requires Chat chaos AND crit — checked during combat
        const hasChatPositive = team.some(c => c._chatChaos);
        const lucky = Math.random() < 0.35; // Very unlikely
        if (hasChatPositive && lucky) {
          const asmon = team.find(c => c.id === 700);
          if (asmon) {
            asmon.combatATK = Math.ceil(asmon.combatATK * (1 + fx.perfectBonus));
            log.push({ round: 0, event: 'FULL_ASMON', team: teamLabel, result: 'PERFECT', msg: 'THE STARS ALIGNED! Asmongold +30% ATK! Chat is going insane!' });
          }
        } else {
          team.forEach(c => c.combatATK = Math.ceil(c.combatATK * (1 + fx.normalBonus)));
          log.push({ round: 0, event: 'FULL_ASMON', team: teamLabel, result: 'NORMAL', msg: 'Close but no cigar. +5% ATK consolation.' });
        }
      }

      log.push({ round: 0, event: 'SYNERGY', team: teamLabel, name: syn.name, desc: syn.desc, flavor: syn.flavorText });
    }

    // Apply per-card abilities
    for (const card of team) {
      if (card.abilities.includes('TAUNT')) { card._taunt = true; card.maxHP = Math.ceil(card.maxHP * 1.20); card.currentHP = card.maxHP; }
      if (card.abilities.includes('STEALTH')) { card._stealth = 1; card._stealthAtkBonus = Math.ceil(card.combatATK * 0.25); }
      if (card.abilities.includes('CRIT_BOOST')) { card._critBonus += 0.15; card._critMult = 2.0; }
      if (card.abilities.includes('BUFF')) team.forEach(c => c.combatATK = Math.ceil(c.combatATK * 1.10));
      if (card.abilities.includes('DEBUFF')) card._debuffDuration = 2;
      if (card.abilities.includes('HEAL')) card._autoHeal += 0.25;
      if (card.abilities.includes('DODGE')) card._dodgeBonus += 0.25;
      if (card.abilities.includes('DODGE_BOOST')) team.forEach(c => c._dodgeBonus += 0.10);
      if (card.abilities.includes('RUSH')) card.combatATK = Math.ceil(card.combatATK * 1.20);
    }
  },

  _applyChatChaos(team, round, log, teamLabel) {
    // Chat re-rolls every round if Chat card is alive
    const chat = team.find(c => c.id === 706 && c.currentHP > 0);
    if (!chat) return;
    const roll = Math.random() < 0.5;
    const mult = roll ? 1.05 : 0.97; // Smaller per-round swings
    team.forEach(c => c.combatATK = Math.ceil(c.combatATK * mult));
    if (round <= 3) {
      log.push({ round, event: 'CHAT_CHAOS_TICK', team: teamLabel, positive: roll, msg: roll ? 'Chat: "LET\'S GOOOO"' : 'Chat: "OMEGALUL"' });
    }
  },

  _processPhase(team, enemies, phase, log) {
    // Phase processing for pre-combat abilities
  },

  _processEndOfRound(team, enemies, round, log) {
    for (const card of team) {
      if (card.currentHP <= 0) continue;
      if (card._autoHeal > 0) {
        const heal = Math.ceil(card.maxHP * card._autoHeal);
        card.currentHP = Math.min(card.maxHP, card.currentHP + heal);
        if (heal > 0) log.push({ round, event: 'HEAL', card: card.name, heal });
      }
      if (card._debuffDuration > 0) {
        enemies.filter(c => c.currentHP > 0).forEach(c => { c.combatATK = Math.ceil(c.combatATK * 0.95); });
        card._debuffDuration--;
      }
    }
  }
};


// ═══════════════════════════════════════════════════════════════════════════
// SECTION 7: META ANALYSIS
// ═══════════════════════════════════════════════════════════════════════════

const NW_META = {
  analyzeWinRates(allCards, simulations = 500) {
    const cardWins = {};
    const cardGames = {};
    const comboWins = {};

    for (let i = 0; i < simulations; i++) {
      const shuffled = [...allCards].sort(() => Math.random() - 0.5);
      const teamA = shuffled.slice(0, 5);
      const teamB = shuffled.slice(5, 10);
      const result = NW_COMBAT.simulate(teamA, teamB);
      const winners = result.winner === 'A' ? teamA : teamB;
      const losers = result.winner === 'A' ? teamB : teamA;

      for (const c of winners) { cardWins[c.id] = (cardWins[c.id] || 0) + 1; cardGames[c.id] = (cardGames[c.id] || 0) + 1; }
      for (const c of losers) { cardGames[c.id] = (cardGames[c.id] || 0) + 1; }

      for (let a = 0; a < winners.length; a++) {
        for (let b = a + 1; b < winners.length; b++) {
          const key = [winners[a].id, winners[b].id].sort().join('+');
          comboWins[key] = (comboWins[key] || 0) + 1;
        }
      }
    }

    const winRates = allCards.map(c => ({
      id: c.id, name: c.name, rarity: c.rarity, set: c.set,
      winRate: cardGames[c.id] ? (cardWins[c.id] || 0) / cardGames[c.id] : 0,
      games: cardGames[c.id] || 0
    })).sort((a, b) => b.winRate - a.winRate);

    const bestCombos = Object.entries(comboWins)
      .map(([key, wins]) => {
        const [idA, idB] = key.split('+').map(Number);
        const cA = allCards.find(c => c.id === idA);
        const cB = allCards.find(c => c.id === idB);
        return { cards: [cA?.name, cB?.name], ids: [idA, idB], wins };
      })
      .sort((a, b) => b.wins - a.wins)
      .slice(0, 20);

    return { winRates, bestCombos, simulations };
  },

  testDeck(deck, allCards, simulations = 200) {
    let wins = 0;
    for (let i = 0; i < simulations; i++) {
      const opponents = [...allCards].filter(c => !deck.find(d => d.id === c.id)).sort(() => Math.random() - 0.5).slice(0, 5);
      const result = NW_COMBAT.simulate(deck, opponents);
      if (result.winner === 'A') wins++;
    }
    return { deck: deck.map(c => c.name), winRate: wins / simulations, wins, simulations };
  }
};


// ═══════════════════════════════════════════════════════════════════════════
// SECTION 8: EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { NW_ABILITIES, NW_SET_BONUSES, NW_ROLE_SYNERGIES, NW_BALANCE_RULES, NW_REBALANCER, NW_COMBAT, NW_META };
}

if (typeof window !== 'undefined') {
  window.NW_ABILITIES = NW_ABILITIES;
  window.NW_SET_BONUSES = NW_SET_BONUSES;
  window.NW_ROLE_SYNERGIES = NW_ROLE_SYNERGIES;
  window.NW_BALANCE_RULES = NW_BALANCE_RULES;
  window.NW_REBALANCER = NW_REBALANCER;
  window.NW_COMBAT = NW_COMBAT;
  window.NW_META = NW_META;
}

console.log('[NW_CARD_ENGINE] v2.0 loaded — Season 1: Age of Alimony | NW = #1, Shrine = underdog');
