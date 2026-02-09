#!/usr/bin/env node
/**
 * NumbahWan TCG — Tabletop Stats Generator
 * ═══════════════════════════════════════════
 * Generates D&D 5e-compatible stat blocks from cards-v2.json flavorStats.
 * Output: public/static/data/tabletop-stats.json
 *
 * Design rules:
 *   - flavorStats.power  → primary attack stats (STR or DEX or CHA)
 *   - flavorStats.endurance → defensive stats (CON, HP, AC)
 *   - role → D&D class mapping
 *   - rarity → CR range + ability count
 *   - set bonuses map to tabletop party buffs
 *   - star levels (1★-5★) unlock unique tabletop abilities
 *   - NEVER touches gameStats — digital balance stays separate
 *
 * Usage:
 *   node scripts/generate-tabletop-stats.cjs              # Generate
 *   node scripts/generate-tabletop-stats.cjs --preview    # Preview without writing
 *   node scripts/generate-tabletop-stats.cjs --card 101   # Preview one card
 */

const fs = require('fs');
const path = require('path');

const CARDS_FILE = path.join(__dirname, '..', 'public', 'static', 'data', 'cards-v2.json');
const OUTPUT_FILE = path.join(__dirname, '..', 'public', 'static', 'data', 'tabletop-stats.json');

// ═══════════════════════════════════════════════════════════════════════
// D&D MAPPING TABLES
// ═══════════════════════════════════════════════════════════════════════

// Role → D&D Class + primary stat
const ROLE_CLASS_MAP = {
  carry:           { class: 'Fighter (Champion)',    primary: 'STR', secondary: 'CON', hitDie: 10, saves: ['STR', 'CON'] },
  grinder:         { class: 'Barbarian (Totem)',     primary: 'CON', secondary: 'STR', hitDie: 12, saves: ['STR', 'CON'] },
  guild_parent:    { class: 'Cleric (Life)',         primary: 'WIS', secondary: 'CON', hitDie: 8,  saves: ['WIS', 'CHA'] },
  troll:           { class: 'Rogue (Trickster)',     primary: 'DEX', secondary: 'CHA', hitDie: 8,  saves: ['DEX', 'INT'] },
  lurker:          { class: 'Ranger (Gloom Stalker)',primary: 'DEX', secondary: 'WIS', hitDie: 10, saves: ['STR', 'DEX'] },
  whale:           { class: 'Paladin (Devotion)',    primary: 'CHA', secondary: 'STR', hitDie: 10, saves: ['WIS', 'CHA'] },
  simp:            { class: 'Bard (Glamour)',        primary: 'CHA', secondary: 'DEX', hitDie: 8,  saves: ['DEX', 'CHA'] },
  rage_quitter:    { class: 'Barbarian (Berserker)', primary: 'STR', secondary: 'CON', hitDie: 12, saves: ['STR', 'CON'] },
  afk_king:        { class: 'Druid (Dreams)',        primary: 'WIS', secondary: 'CON', hitDie: 8,  saves: ['INT', 'WIS'] },
  leech:           { class: 'Warlock (Fiend)',       primary: 'CHA', secondary: 'CON', hitDie: 8,  saves: ['WIS', 'CHA'] },
  theory_crafter:  { class: 'Wizard (Divination)',   primary: 'INT', secondary: 'WIS', hitDie: 6,  saves: ['INT', 'WIS'] },
  fashion_main:    { class: 'Sorcerer (Wild Magic)', primary: 'CHA', secondary: 'DEX', hitDie: 6,  saves: ['CON', 'CHA'] }
};

// Rarity → CR range, proficiency bonus, ability score budget, ability slots
const RARITY_CR_MAP = {
  common:    { crRange: [0.25, 2], profBonus: 2, abilityBudget: 60,  starAbilities: 1, baseAC: 10, hpMulti: 1.0 },
  uncommon:  { crRange: [2, 4],    profBonus: 2, abilityBudget: 68,  starAbilities: 1, baseAC: 12, hpMulti: 1.2 },
  rare:      { crRange: [4, 7],    profBonus: 3, abilityBudget: 74,  starAbilities: 2, baseAC: 14, hpMulti: 1.5 },
  epic:      { crRange: [7, 10],   profBonus: 4, abilityBudget: 80,  starAbilities: 2, baseAC: 16, hpMulti: 2.0 },
  legendary: { crRange: [11, 14],  profBonus: 5, abilityBudget: 86,  starAbilities: 3, baseAC: 17, hpMulti: 2.5 },
  mythic:    { crRange: [15, 20],  profBonus: 6, abilityBudget: 92,  starAbilities: 3, baseAC: 18, hpMulti: 3.0 }
};

// Category → flavor for tabletop abilities
const CATEGORY_FLAVOR = {
  member:  { theme: 'guild',    weapon: 'signature weapon', spellFlavor: 'guild magic' },
  gear:    { theme: 'equipment', weapon: 'enchanted item',  spellFlavor: 'item activation' },
  moment:  { theme: 'event',    weapon: 'temporal echo',    spellFlavor: 'memory magic' },
  vibe:    { theme: 'aura',     weapon: 'emotional force',  spellFlavor: 'mood manipulation' },
  spot:    { theme: 'terrain',  weapon: 'environmental',    spellFlavor: 'place of power' }
};

// Digital ability → D&D ability flavor
const ABILITY_DND_MAP = {
  RUSH:          { name: 'First Strike',    desc: 'Advantage on initiative. On first turn, deal extra {dice} damage.',         dice: { common: '1d4', uncommon: '1d6', rare: '1d8', epic: '2d6', legendary: '2d8', mythic: '3d8' } },
  CRIT_BOOST:    { name: 'Precision Strike', desc: 'Crit range expanded to {range}. Critical hits deal triple weapon damage.', range: { common: '19-20', uncommon: '19-20', rare: '18-20', epic: '18-20', legendary: '17-20', mythic: '17-20' } },
  LIFESTEAL:     { name: 'Vampiric Strike',  desc: 'On hit, heal {amount} HP. Once per round.',                                amount: { common: '1d4', uncommon: '1d6', rare: '1d8', epic: '2d6', legendary: '2d8', mythic: '3d8' } },
  SELF_DESTRUCT: { name: 'Last Stand',       desc: 'When reduced to 0 HP, explode for {dice} fire damage in 15ft radius.',     dice: { common: '2d6', uncommon: '3d6', rare: '4d6', epic: '6d6', legendary: '8d6', mythic: '10d6' } },
  DEBUFF:        { name: 'Demoralizing Aura',desc: 'Enemies within 30ft have -{penalty} to attack rolls for {dur} rounds.',    penalty: { common: 1, uncommon: 1, rare: 2, epic: 2, legendary: 3, mythic: 3 }, dur: { common: 1, uncommon: 1, rare: 2, epic: 2, legendary: 2, mythic: 3 } },
  TAUNT:         { name: 'Guardian Stance',   desc: 'Bonus action: force {count} enemy to target you. Gain {hp} temp HP.',     count: { common: 1, uncommon: 1, rare: 1, epic: 2, legendary: 2, mythic: 3 }, hp: { common: '1d8', uncommon: '1d10', rare: '2d8', epic: '2d10', legendary: '3d10', mythic: '4d10' } },
  SHIELD:        { name: 'Aegis Ward',        desc: 'Reaction: negate first {count} hit(s) per combat. Block up to {dmg} damage.', count: { common: 1, uncommon: 1, rare: 1, epic: 2, legendary: 2, mythic: 3 }, dmg: { common: 10, uncommon: 15, rare: 25, epic: 35, legendary: 50, mythic: 75 } },
  DODGE:         { name: 'Evasive Instinct',  desc: 'Passive: +{bonus} AC. Dexterity saving throws have advantage.',           bonus: { common: 1, uncommon: 1, rare: 2, epic: 2, legendary: 3, mythic: 3 } },
  DODGE_BOOST:   { name: 'Shadow Veil',       desc: 'Allies within 15ft gain +{bonus} AC until your next turn.',                bonus: { common: 1, uncommon: 1, rare: 1, epic: 2, legendary: 2, mythic: 3 } },
  HEAL:          { name: 'Mending Touch',     desc: 'Action: heal one ally for {dice}. Range 30ft.',                            dice: { common: '1d8+2', uncommon: '2d8+2', rare: '2d8+4', epic: '3d8+4', legendary: '4d8+5', mythic: '5d8+6' } },
  BUFF:          { name: 'War Cry',            desc: 'Bonus action: allies within 30ft gain +{bonus} to attack and damage for {dur} rounds.', bonus: { common: 1, uncommon: 1, rare: 2, epic: 2, legendary: 3, mythic: 3 }, dur: { common: 1, uncommon: 2, rare: 2, epic: 3, legendary: 3, mythic: 4 } },
  STEALTH:       { name: 'Vanish',             desc: 'Bonus action: become invisible for {dur} round(s). First attack from stealth deals +{dice} damage.', dur: { common: 1, uncommon: 1, rare: 1, epic: 2, legendary: 2, mythic: 3 }, dice: { common: '2d6', uncommon: '2d6', rare: '3d6', epic: '4d6', legendary: '5d6', mythic: '6d6' } }
};

// ═══════════════════════════════════════════════════════════════════════
// STAR ABILITY TEMPLATES (unique per role, unlocked by star level)
// These are the Sacred Log sinks — players upgrade stars to unlock these
// ═══════════════════════════════════════════════════════════════════════

const STAR_ABILITIES = {
  carry: [
    { star: 1, name: 'Relentless',     cost: '50 Sacred Logs',  desc: 'Once per long rest: when you drop to 0 HP, instead drop to 1 HP.' },
    { star: 2, name: 'Double Strike',   cost: '100 Sacred Logs', desc: 'Once per short rest: make two attacks as a single action.' },
    { star: 3, name: 'Killing Blow',    cost: '200 Sacred Logs', desc: 'When you reduce an enemy to 0 HP, immediately make another attack.' },
    { star: 4, name: 'Adrenaline Rush', cost: '350 Sacred Logs', desc: 'Once per long rest: take an additional full turn immediately.' },
    { star: 5, name: 'Avatar of War',   cost: '500 Sacred Logs', desc: 'Once per long rest: for 3 rounds, all attacks deal max damage.' }
  ],
  grinder: [
    { star: 1, name: 'Thick Skin',     cost: '50 Sacred Logs',  desc: 'Reduce all non-magical damage by 2.' },
    { star: 2, name: 'Endure',         cost: '100 Sacred Logs', desc: 'Advantage on Constitution saving throws.' },
    { star: 3, name: 'Unmovable',      cost: '200 Sacred Logs', desc: 'Cannot be knocked prone or pushed. Immune to fear.' },
    { star: 4, name: 'Last One Standing', cost: '350 Sacred Logs', desc: 'When below half HP, gain +3 AC and resistance to all damage.' },
    { star: 5, name: 'Eternal Grind',  cost: '500 Sacred Logs', desc: 'Once per long rest: fully restore HP. "The grind never stops."' }
  ],
  guild_parent: [
    { star: 1, name: 'Guild Blessing',  cost: '50 Sacred Logs',  desc: 'At dawn, bless 3 allies: +1d4 to their next saving throw.' },
    { star: 2, name: 'Group Heal',      cost: '100 Sacred Logs', desc: 'Once per short rest: heal all allies within 30ft for 2d8+WIS.' },
    { star: 3, name: 'Parental Shield', cost: '200 Sacred Logs', desc: 'Reaction: when an ally takes damage, redirect half to yourself.' },
    { star: 4, name: 'Rally',           cost: '350 Sacred Logs', desc: 'Once per long rest: remove all conditions from allies in 30ft.' },
    { star: 5, name: 'Guild Mom/Dad Energy', cost: '500 Sacred Logs', desc: 'Aura 30ft: allies regain 1d6 HP at start of each of their turns.' }
  ],
  troll: [
    { star: 1, name: 'Cheap Shot',     cost: '50 Sacred Logs',  desc: 'Sneak attack deals +1d6 damage even without advantage (once/turn).' },
    { star: 2, name: 'Misdirect',      cost: '100 Sacred Logs', desc: 'Reaction: when targeted, redirect attack to adjacent creature.' },
    { star: 3, name: 'Gaslighter',     cost: '200 Sacred Logs', desc: 'Once per short rest: target believes an ally is an enemy for 1 round.' },
    { star: 4, name: 'Chaos Agent',    cost: '350 Sacred Logs', desc: 'Once per long rest: all creatures in 30ft must attack random targets for 1 round.' },
    { star: 5, name: 'KEKW',           cost: '500 Sacred Logs', desc: 'Once per long rest: copy any ability you\'ve seen used this combat. Use it once.' }
  ],
  lurker: [
    { star: 1, name: 'Silent Step',    cost: '50 Sacred Logs',  desc: 'Advantage on Stealth checks. Leave no tracks.' },
    { star: 2, name: 'Shadow Strike',  cost: '100 Sacred Logs', desc: 'Attacks from hiding deal +2d6 damage.' },
    { star: 3, name: 'Unseen Presence',cost: '200 Sacred Logs', desc: 'Once per short rest: become invisible for 1 minute (no concentration).' },
    { star: 4, name: 'Death From Above', cost: '350 Sacred Logs', desc: 'If you attack from higher ground, auto-crit on first hit.' },
    { star: 5, name: 'Ghost',          cost: '500 Sacred Logs', desc: 'Once per long rest: phase through walls/objects for 1 minute. Attacks while phased deal +4d6 force damage.' }
  ],
  whale: [
    { star: 1, name: 'Deep Pockets',   cost: '50 Sacred Logs',  desc: 'Start each session with a random uncommon magic item (consumable).' },
    { star: 2, name: 'Premium Gear',   cost: '100 Sacred Logs', desc: 'All equipped items count as +1 magical.' },
    { star: 3, name: 'Money Talks',    cost: '200 Sacred Logs', desc: 'Once per long rest: auto-succeed one Persuasion or Intimidation check.' },
    { star: 4, name: 'Pay to Win',     cost: '350 Sacred Logs', desc: 'Once per long rest: reroll any single die roll. Use the new result.' },
    { star: 5, name: 'Whale Mode',     cost: '500 Sacred Logs', desc: 'Once per long rest: summon a spectral guardian (CR 5) that fights for 3 rounds.' }
  ],
  simp: [
    { star: 1, name: 'Devoted Fan',    cost: '50 Sacred Logs',  desc: 'Choose one ally at dawn: they get +1 to all rolls while you can see them.' },
    { star: 2, name: 'Inspiring Word',  cost: '100 Sacred Logs', desc: 'Bonus action: one ally gains temporary HP equal to your CHA mod + level.' },
    { star: 3, name: 'Shield of Devotion', cost: '200 Sacred Logs', desc: 'Reaction: take damage meant for an adjacent ally.' },
    { star: 4, name: 'Power of Friendship', cost: '350 Sacred Logs', desc: 'Once per long rest: grant one ally an extra action on their turn.' },
    { star: 5, name: 'True Devotion',   cost: '500 Sacred Logs', desc: 'Once per long rest: if your chosen ally drops to 0 HP, they instead heal to half HP. "I would die for content."' }
  ],
  rage_quitter: [
    { star: 1, name: 'Short Fuse',     cost: '50 Sacred Logs',  desc: 'When you take damage, gain +1 to your next attack roll.' },
    { star: 2, name: 'Tilted',         cost: '100 Sacred Logs', desc: 'When below half HP, rage: +2 damage on all melee attacks.' },
    { star: 3, name: 'Keyboard Smash', cost: '200 Sacred Logs', desc: 'Once per short rest: AoE slam — 3d8 damage in 10ft radius.' },
    { star: 4, name: 'Alt+F4',         cost: '350 Sacred Logs', desc: 'Once per long rest: disappear from combat entirely, reappear next round behind any enemy.' },
    { star: 5, name: 'Rage Quit',      cost: '500 Sacred Logs', desc: 'Once per long rest: when reduced to 0 HP, explode for 8d6 damage in 20ft. Then stabilize at 1 HP. "THIS GAME IS TRASH."' }
  ],
  afk_king: [
    { star: 1, name: 'Idle Regen',     cost: '50 Sacred Logs',  desc: 'Regain 1d4 HP at start of each of your turns if you didn\'t move last turn.' },
    { star: 2, name: 'Auto-Pilot',     cost: '100 Sacred Logs', desc: 'While incapacitated, your character auto-dodges (enemies have disadvantage).' },
    { star: 3, name: 'AFK Aura',       cost: '200 Sacred Logs', desc: 'Enemies that end their turn within 10ft of you fall asleep (WIS save DC 14).' },
    { star: 4, name: 'Phone Alarm',    cost: '350 Sacred Logs', desc: 'Once per long rest: wake from any magical sleep/charm and gain advantage on all rolls for 1 round.' },
    { star: 5, name: 'Ascended AFK',   cost: '500 Sacred Logs', desc: 'Once per long rest: take no actions for 3 rounds, then auto-heal to full HP and gain +5 to all stats for 2 rounds.' }
  ],
  leech: [
    { star: 1, name: 'Drain Touch',    cost: '50 Sacred Logs',  desc: 'Melee attacks heal you for 1d4.' },
    { star: 2, name: 'Parasite',       cost: '100 Sacred Logs', desc: 'When adjacent to an ally, gain +1 AC. They lose 1 AC.' },
    { star: 3, name: 'Soul Siphon',    cost: '200 Sacred Logs', desc: 'Once per short rest: drain 3d8 HP from a target. Heal that amount.' },
    { star: 4, name: 'Borrowed Power',  cost: '350 Sacred Logs', desc: 'Once per long rest: copy one ability of an adjacent ally for 1 minute.' },
    { star: 5, name: 'Ultimate Leech',  cost: '500 Sacred Logs', desc: 'Once per long rest: for 3 rounds, all damage you deal heals you. All healing allies receive also heals you.' }
  ],
  theory_crafter: [
    { star: 1, name: 'Analyze',        cost: '50 Sacred Logs',  desc: 'Bonus action: learn one creature\'s AC, HP, or highest ability score.' },
    { star: 2, name: 'Exploit Weakness',cost: '100 Sacred Logs', desc: 'After analyzing, attacks against that creature deal +1d6 damage.' },
    { star: 3, name: 'Predict',        cost: '200 Sacred Logs', desc: 'Once per short rest: predict an enemy\'s next action. If correct, all allies get advantage.' },
    { star: 4, name: 'Min-Max',        cost: '350 Sacred Logs', desc: 'Once per long rest: set any single ability score to 20 for 1 hour.' },
    { star: 5, name: 'Spreadsheet God',cost: '500 Sacred Logs', desc: 'Once per long rest: for 1 minute, you know every stat, weakness, and action of all visible creatures. All your attacks auto-hit.' }
  ],
  fashion_main: [
    { star: 1, name: 'Dazzle',         cost: '50 Sacred Logs',  desc: 'Your outfit distracts: enemies have -1 to hit you.' },
    { star: 2, name: 'Outfit Change',  cost: '100 Sacred Logs', desc: 'Bonus action: change appearance. Gain advantage on next CHA check.' },
    { star: 3, name: 'Main Character Energy', cost: '200 Sacred Logs', desc: 'Once per short rest: all enemies must target you for 1 round (you gain +3 AC).' },
    { star: 4, name: 'Drip So Hard',   cost: '350 Sacred Logs', desc: 'Once per long rest: blind all enemies in 30ft for 1 round with your sheer drip.' },
    { star: 5, name: 'Final Form',     cost: '500 Sacred Logs', desc: 'Once per long rest: transform. +4 AC, +4 CHA, fly 60ft, advantage on everything for 3 rounds. Style over substance? Style IS substance.' }
  ]
};

// ═══════════════════════════════════════════════════════════════════════
// STAT GENERATION
// ═══════════════════════════════════════════════════════════════════════

function mod(score) {
  return Math.floor((score - 10) / 2);
}

function modStr(score) {
  const m = mod(score);
  return m >= 0 ? `+${m}` : `${m}`;
}

function generateAbilityScores(card, roleInfo, rarityInfo) {
  const fs = card.flavorStats || {};
  // Fallback: if flavorStats empty (e.g., shrine cards), derive from gameStats
  const gs = card.gameStats || {};
  const power = fs.power || Math.round((gs.atk || 1) * 0.9);      // Shrine gets 90% raw power
  const endurance = fs.endurance || Math.round((gs.hp || 1) * 1.1); // Slightly more survivable

  // Base: 8 for all stats (point buy minimum)
  const scores = { STR: 8, DEX: 8, CON: 8, INT: 8, WIS: 8, CHA: 8 };

  // Budget from rarity
  const budget = rarityInfo.abilityBudget;
  const baseBudget = 48; // 8 * 6
  let remaining = budget - baseBudget;

  // Primary stat gets the most from power
  const primaryBoost = Math.min(12, Math.round(power * 1.2));
  scores[roleInfo.primary] += primaryBoost;
  remaining -= primaryBoost;

  // Secondary stat gets from endurance
  const secondaryBoost = Math.min(10, Math.round(endurance * 0.6));
  scores[roleInfo.secondary] += secondaryBoost;
  remaining -= secondaryBoost;

  // CON always gets something from endurance (if not already primary/secondary)
  if (roleInfo.primary !== 'CON' && roleInfo.secondary !== 'CON') {
    const conBoost = Math.min(8, Math.round(endurance * 0.4));
    scores.CON += conBoost;
    remaining -= conBoost;
  }

  // Spread remaining across other stats
  const otherStats = ['STR','DEX','CON','INT','WIS','CHA'].filter(
    s => s !== roleInfo.primary && s !== roleInfo.secondary
  );
  const perStat = Math.max(0, Math.floor(remaining / otherStats.length));
  for (const s of otherStats) {
    scores[s] += Math.min(perStat, 6); // Cap individual boost
  }

  // Clamp all scores to 1-20 range (30 for mythic primary)
  const maxPrimary = card.rarity === 'mythic' ? 24 : 20;
  for (const s of Object.keys(scores)) {
    const max = s === roleInfo.primary ? maxPrimary : 20;
    scores[s] = Math.max(1, Math.min(max, scores[s]));
  }

  return scores;
}

function generateHP(card, scores, roleInfo, rarityInfo) {
  const conMod = mod(scores.CON);
  const hitDie = roleInfo.hitDie;
  const cr = generateCR(card, rarityInfo);

  // Approximate level from CR (CR roughly equals level for monsters)
  const effectiveLevel = Math.max(1, Math.ceil(cr));

  // HP = hitDie avg * level + CON mod * level, scaled by rarity
  const avgHitDie = (hitDie / 2) + 1;
  const baseHP = Math.round((avgHitDie + conMod) * effectiveLevel * rarityInfo.hpMulti);

  return Math.max(4, baseHP);
}

function generateCR(card, rarityInfo) {
  const fs = card.flavorStats || {};
  const gs = card.gameStats || {};
  const power = fs.power || Math.round((gs.atk || 1) * 0.9);
  const endurance = fs.endurance || Math.round((gs.hp || 1) * 1.1);

  // CR within rarity range, influenced by power + endurance
  const [crMin, crMax] = rarityInfo.crRange;
  const totalStat = power + endurance;

  // Normalize within this rarity's expected stat range
  const maxExpected = { common: 7, uncommon: 9, rare: 12, epic: 16, legendary: 21, mythic: 28 };
  const ratio = Math.min(1, totalStat / (maxExpected[card.rarity] || 10));

  const cr = crMin + (crMax - crMin) * ratio;

  // Shrine penalty: shrine cards are slightly lower CR
  const penalty = card.set === 'shrine' ? 0.9 : 1.0;
  return Math.max(crMin, Math.round(cr * penalty * 4) / 4); // Round to nearest 0.25
}

function generateAC(card, scores, roleInfo, rarityInfo) {
  const base = rarityInfo.baseAC;
  const dexMod = mod(scores.DEX);

  // Light armor classes get DEX bonus
  const lightArmor = ['Rogue', 'Ranger', 'Bard', 'Warlock', 'Sorcerer'];
  const isLight = lightArmor.some(c => roleInfo.class.includes(c));

  if (isLight) {
    return base + Math.min(dexMod, 2); // Light armor caps DEX mod
  }
  return base; // Heavy armor = flat AC
}

function generateSpeed(roleInfo) {
  const fast = ['Rogue', 'Ranger', 'Barbarian'];
  const slow = ['Cleric', 'Wizard', 'Druid'];
  if (fast.some(c => roleInfo.class.includes(c))) return 35;
  if (slow.some(c => roleInfo.class.includes(c))) return 25;
  return 30;
}

function generateTabletopAbilities(card, roleInfo, rarityInfo) {
  const abilities = [];
  const gs = card.gameStats || {};
  const digitalAbilities = gs.abilities || [];

  // Map digital abilities to D&D equivalents
  for (const ab of digitalAbilities) {
    const mapping = ABILITY_DND_MAP[ab];
    if (!mapping) continue;

    let desc = mapping.desc;
    // Replace template tokens with rarity-appropriate values
    for (const [key, vals] of Object.entries(mapping)) {
      if (key === 'name' || key === 'desc') continue;
      if (typeof vals === 'object' && vals[card.rarity] !== undefined) {
        desc = desc.replace(`{${key}}`, vals[card.rarity]);
      }
    }

    abilities.push({
      name: mapping.name,
      desc,
      source: `digital:${ab}`
    });
  }

  return abilities;
}

function generateStarAbilities(card, roleInfo) {
  const roleStars = STAR_ABILITIES[card.role];
  if (!roleStars) return [];

  return roleStars.map(sa => ({
    star: sa.star,
    name: sa.name,
    desc: sa.desc,
    unlockCost: sa.cost
  }));
}

function generateCard(card) {
  const roleInfo = ROLE_CLASS_MAP[card.role] || ROLE_CLASS_MAP.carry;
  const rarityInfo = RARITY_CR_MAP[card.rarity] || RARITY_CR_MAP.common;

  const scores = generateAbilityScores(card, roleInfo, rarityInfo);
  const cr = generateCR(card, rarityInfo);
  const hp = generateHP(card, scores, roleInfo, rarityInfo);
  const ac = generateAC(card, scores, roleInfo, rarityInfo);
  const speed = generateSpeed(roleInfo);
  const abilities = generateTabletopAbilities(card, roleInfo, rarityInfo);
  const starAbilities = generateStarAbilities(card, roleInfo);

  return {
    id: card.id,
    name: card.name,
    rarity: card.rarity,
    role: card.role,
    category: card.category,
    set: card.set || 'core',

    // D&D stat block
    dnd: {
      class: roleInfo.class,
      cr,
      proficiencyBonus: rarityInfo.profBonus,
      ac,
      hp,
      speed: `${speed}ft`,
      hitDie: `d${roleInfo.hitDie}`,

      abilityScores: {
        STR: { score: scores.STR, mod: modStr(scores.STR) },
        DEX: { score: scores.DEX, mod: modStr(scores.DEX) },
        CON: { score: scores.CON, mod: modStr(scores.CON) },
        INT: { score: scores.INT, mod: modStr(scores.INT) },
        WIS: { score: scores.WIS, mod: modStr(scores.WIS) },
        CHA: { score: scores.CHA, mod: modStr(scores.CHA) }
      },

      savingThrows: roleInfo.saves,
      abilities,
      starAbilities
    },

    // Metadata
    sourceStats: {
      power: (card.flavorStats || {}).power || 0,
      endurance: (card.flavorStats || {}).endurance || 0
    }
  };
}

// ═══════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════

function main() {
  const args = process.argv.slice(2);
  const isPreview = args.includes('--preview');
  const cardIdArg = args.find(a => a !== '--preview' && a !== '--card');
  const cardIdIdx = args.indexOf('--card');
  const singleCardId = cardIdIdx >= 0 ? parseInt(args[cardIdIdx + 1]) : null;

  // Load cards
  const data = JSON.parse(fs.readFileSync(CARDS_FILE, 'utf8'));
  const cards = data.cards;
  console.log(`Loaded ${cards.length} cards from cards-v2.json`);

  // Generate
  const tabletopCards = cards.map(c => generateCard(c));

  // Single card preview
  if (singleCardId) {
    const card = tabletopCards.find(c => c.id === singleCardId);
    if (card) {
      printStatBlock(card);
    } else {
      console.log(`Card #${singleCardId} not found`);
    }
    return;
  }

  // Summary
  const byRarity = {};
  for (const c of tabletopCards) {
    if (!byRarity[c.rarity]) byRarity[c.rarity] = [];
    byRarity[c.rarity].push(c);
  }

  console.log('\n=== TABLETOP STATS SUMMARY ===\n');
  for (const r of ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic']) {
    const tier = byRarity[r] || [];
    if (!tier.length) continue;
    const crs = tier.map(c => c.dnd.cr);
    const hps = tier.map(c => c.dnd.hp);
    const acs = tier.map(c => c.dnd.ac);
    console.log(`  ${r.padEnd(12)}: ${tier.length} cards | CR ${Math.min(...crs)}-${Math.max(...crs)} | HP ${Math.min(...hps)}-${Math.max(...hps)} | AC ${Math.min(...acs)}-${Math.max(...acs)}`);
  }

  // Preview a sample from each rarity
  console.log('\n=== SAMPLE STAT BLOCKS ===\n');
  for (const r of ['common', 'epic', 'mythic']) {
    const sample = (byRarity[r] || [])[0];
    if (sample) printStatBlock(sample);
  }

  if (isPreview) {
    console.log('\n[PREVIEW MODE] — no file written. Remove --preview to generate.');
    return;
  }

  // Write output
  const output = {
    version: '1.0.0',
    generated: new Date().toISOString(),
    sourceFile: 'cards-v2.json',
    totalCards: tabletopCards.length,
    designNotes: {
      statSource: 'Generated from flavorStats (power/endurance), NOT gameStats',
      balanceRule: 'Digital rebalancing does NOT affect these stats',
      starAbilities: 'Unlocked by spending Sacred Logs — progression sink',
      constraint: 'CR respects rarity: Common 0.25-2, Uncommon 2-4, Rare 4-7, Epic 7-10, Legendary 11-14, Mythic 15-20'
    },
    cards: tabletopCards
  };

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));
  console.log(`\nWritten ${tabletopCards.length} tabletop stat blocks to ${OUTPUT_FILE}`);
  console.log(`File size: ${(fs.statSync(OUTPUT_FILE).size / 1024).toFixed(1)}KB`);
}

function printStatBlock(card) {
  const d = card.dnd;
  const scores = d.abilityScores;
  console.log(`╔══════════════════════════════════════════════════════════╗`);
  console.log(`║  ${card.name.padEnd(54)} ║`);
  console.log(`║  ${(card.rarity.toUpperCase() + ' ' + card.role).padEnd(54)} ║`);
  console.log(`╠══════════════════════════════════════════════════════════╣`);
  console.log(`║  Class: ${d.class.padEnd(20)}  CR: ${String(d.cr).padEnd(6)} Prof: +${d.proficiencyBonus}    ║`);
  console.log(`║  AC: ${String(d.ac).padEnd(4)}  HP: ${String(d.hp).padEnd(6)}  Speed: ${d.speed.padEnd(8)}  ${d.hitDie.padEnd(4)}      ║`);
  console.log(`║                                                          ║`);
  console.log(`║  STR ${String(scores.STR.score).padStart(2)} (${scores.STR.mod.padStart(2)})  DEX ${String(scores.DEX.score).padStart(2)} (${scores.DEX.mod.padStart(2)})  CON ${String(scores.CON.score).padStart(2)} (${scores.CON.mod.padStart(2)})     ║`);
  console.log(`║  INT ${String(scores.INT.score).padStart(2)} (${scores.INT.mod.padStart(2)})  WIS ${String(scores.WIS.score).padStart(2)} (${scores.WIS.mod.padStart(2)})  CHA ${String(scores.CHA.score).padStart(2)} (${scores.CHA.mod.padStart(2)})     ║`);
  console.log(`║  Saves: ${d.savingThrows.join(', ').padEnd(48)} ║`);

  if (d.abilities.length > 0) {
    console.log(`║                                                          ║`);
    console.log(`║  Combat Abilities:                                       ║`);
    for (const ab of d.abilities) {
      console.log(`║    ${ab.name}: ${ab.desc.substring(0, 48).padEnd(48)} ║`);
    }
  }

  if (d.starAbilities.length > 0) {
    console.log(`║                                                          ║`);
    console.log(`║  Star Abilities (Sacred Log unlock):                     ║`);
    for (const sa of d.starAbilities.slice(0, 3)) {
      console.log(`║    ${sa.star}★ ${sa.name}: ${sa.desc.substring(0, 44).padEnd(44)} ║`);
    }
    if (d.starAbilities.length > 3) {
      console.log(`║    ... +${d.starAbilities.length - 3} more at higher stars                          ║`);
    }
  }

  console.log(`╚══════════════════════════════════════════════════════════╝\n`);
}

main();
