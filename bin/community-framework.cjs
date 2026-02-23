#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * NW Community Framework v1.0
 * Shared guild / trade / PvP / progression-illusion systems for all games
 * 
 * This file documents the SPEC — the actual runtime lives inside each
 * single-HTML game. The factory page-gen injects these systems via template.
 * ═══════════════════════════════════════════════════════════════════════════
 */
'use strict';
const fs = require('fs');
const path = require('path');

// ─────────────────────────────────────────────────────────────────────────
// COMMUNITY SYSTEMS SPEC — injected into every game-page HTML
// ─────────────────────────────────────────────────────────────────────────

const COMMUNITY_SPEC = {

  // ═══════════════════════════════════════════
  // 1. GUILD SYSTEM
  // ═══════════════════════════════════════════
  guild: {
    description: 'Healthy cooperative guild with shared base building',
    config: {
      maxMembers: 30,
      rankNames: ['Recruit','Member','Officer','Leader'],
      // Participation-based contribution — not power-based
      contributionMetrics: ['dailyLogin','questsCompleted','itemsDonated','pvpPlayed','guildQuestHelped'],
      // No kick-weak-members incentive
      kickProtection: { minDaysBeforeKickable: 7, requireVote: true, voteThreshold: 0.6 },
      // Shared communal base (SVG town)
      base: {
        buildings: [
          { id:'hall',     name:'Guild Hall',    levels:5, bonuses:['memberCap+5/lvl','xpBoost+2%/lvl'] },
          { id:'armory',   name:'Armory',        levels:5, bonuses:['weaponStorage+10/lvl','repairDiscount+5%/lvl'] },
          { id:'market',   name:'Trade Post',    levels:5, bonuses:['tradeSlots+2/lvl','barterRange+10%/lvl'] },
          { id:'arena',    name:'Training Yard',  levels:5, bonuses:['pvpTickets+1/lvl','statNormBoost+1%/lvl'] },
          { id:'shrine',   name:'Shrine',        levels:5, bonuses:['dailyBless','cosmetic_aura'] },
          { id:'garden',   name:'Community Garden',levels:5, bonuses:['passiveGold+5%/lvl','healBoost+3%/lvl'] },
        ],
        // Everyone contributes materials → building upgrades → shared benefits
        upgradeRequires: 'collective_materials_not_gold',
      },
      // Guild quests — cooperative, not competitive
      guildQuests: {
        types: ['killTarget','collectResources','surviveWaves','craftItems','helpNewbies'],
        rewards: 'guildXP + cosmetic banners + base materials',
        resetCycle: 'daily',
        scaling: 'member_count_based_so_small_guilds_arent_punished',
      },
      // Guild seasons — cosmetic rewards
      seasons: {
        durationWeeks: 4,
        rewards: ['banner','nameColor','baseTheme','emotes','titlePrefix'],
        leaderboard: 'participation_score_not_power',
      },
    },
  },

  // ═══════════════════════════════════════════
  // 2. TRADE ECONOMY
  // ═══════════════════════════════════════════
  trade: {
    description: 'Healthy barter economy with anti-inflation mechanics',
    config: {
      // Bound vs tradeable
      itemBinding: {
        gacha_weapons: 'soulbound',      // Can't trade — prevents pay-to-win trading
        crafting_materials: 'tradeable',   // Economy fuel
        cosmetics: 'tradeable',            // Social economy
        currency: 'not_tradeable',         // Prevents gold selling
      },
      // Barter board — not auction house (prevents price manipulation)
      barterBoard: {
        type: 'direct_swap',               // "I offer X, I want Y"
        maxListings: 5,                     // Per player, prevents hoarding
        listingDuration: '24h',
        noMoneyListings: true,             // Can't list gold-for-items
        fairnessCheck: 'rarity_tier_must_match', // Can't trade common for SSR
      },
      // Currency sinks
      sinks: ['cosmetic_shop','guild_base_upgrade','weapon_mastery_reroll','seasonal_event_entry','title_purchase'],
      // Anti-inflation
      antiInflation: {
        dailyGoldCap: 'level * 100 + 500',
        materialDropCap: '50_per_session',
        tradeVolumeCap: '10_trades_per_day',
        // Gentle decay: unused gold slowly converts to "legacy points" (cosmetic currency)
        idleDecay: { afterDays: 14, rate: '1%_per_day', convertsTo: 'legacy_points' },
      },
      // Crafting system as economy backbone
      crafting: {
        recipes: 'combine materials → unique items',
        failChance: false,  // No frustration — always succeeds
        upgradePath: 'materials + existing item → better version',
      },
    },
  },

  // ═══════════════════════════════════════════
  // 3. PVP SYSTEM
  // ═══════════════════════════════════════════
  pvp: {
    description: 'Satisfying but forgiving PvP — no punishment for losing',
    config: {
      // Stat normalization — gear doesn't determine outcome
      normalization: {
        arenaMode: 'fully_normalized',     // Everyone at same base stats
        gearEffect: 'cosmetic_only',       // Your gear shows but doesn't boost
        skillEffect: 'weapon_moveset_only', // Different weapons = different playstyles, not power
        masteryBonus: 'max_3_percent',     // Tiny edge for dedication, not wall
      },
      // Lose nothing on defeat
      rewards: {
        winner: { currency: 'pvp_tokens', xp: 'bonus_xp', cosmetic: 'chance_at_pvp_cosmetic' },
        loser:  { currency: 'consolation_tokens(50%_of_winner)', xp: 'base_xp', cosmetic: 'none' },
        // Both players always gain SOMETHING
        participation: 'always_positive',
      },
      // Revenge system
      revenge: {
        enabled: true,
        cooldown: '5min',
        bonusForRevenge: '1.5x_tokens',
      },
      // Modes
      modes: {
        friendly: { description: 'Default mode, no ranking', cost: 'free' },
        ranked:   { description: 'Opt-in, seasonal leaderboard', cost: '1_pvp_ticket' },
        guildWar: { description: 'Guild vs guild, cosmetic stakes only', cost: 'guild_entry' },
      },
      // Seasonal leaderboard — resets so new players always have hope
      seasons: {
        durationWeeks: 2,
        rewards: ['title','border','emote','pvp_cosmetic_set'],
        mmr: { startingElo: 1000, resetTo: 'soft_reset_toward_1000', kFactor: 32 },
      },
      // Anti-grief
      antiGrief: {
        afkDetection: true,
        surrenderOption: true,
        matchmakingRange: '±200_elo',
        smurfDetection: 'win_streak_accelerates_elo',
      },
    },
  },

  // ═══════════════════════════════════════════
  // 4. PROGRESSION ILLUSION
  // ═══════════════════════════════════════════
  progression: {
    description: 'Feel of constant growth through horizontal expansion, not vertical power',
    config: {
      // Horizontal growth — more OPTIONS not more POWER
      horizontal: {
        weaponMastery: {
          description: 'Each weapon has mastery tree — cosmetic + slight playstyle variation',
          levels: 20,
          perks: 'visual_effects + animation_variants + tiny_stat_tweaks(±3%)',
          reset: 'free_respec_anytime',
        },
        titleCollection: {
          description: 'Hundreds of titles earned through varied gameplay',
          categories: ['combat','social','exploration','crafting','pvp','seasonal','hidden'],
        },
        cosmeticProgression: {
          description: 'Visual progression that feels impactful',
          systems: ['weapon_skins','aura_effects','death_animations','hit_effects','trail_effects','nameplate_borders'],
        },
      },
      // Rotating modifiers — old content feels new
      dailyModifiers: {
        examples: [
          'Toxic Rain: poison pools spawn randomly',
          'Blood Moon: zombies are faster but drop 2x materials',
          'Gold Rush: gold drops tripled, enemies have shields',
          'Ghost Hour: enemies are semi-transparent, harder to see',
          'Pack Hunt: enemies always spawn in groups',
          'Boss Blitz: boss every 3 waves instead of 10',
        ],
        source: 'seeded from date — deterministic, everyone gets same modifier',
      },
      // Season pass (free, not paid)
      seasonJourney: {
        type: 'free_battlepass',
        tiers: 50,
        rewards: 'cosmetics + titles + materials + guild_contribution',
        duration: '4_weeks',
        xpSources: ['dailyLogin','quests','pvp','guildQuest','exploration','crafting'],
        catchUpMechanic: 'bonus_xp_for_behind_players',
      },
      // Mastery progression per zone
      zoneStars: {
        description: 'Each zone has challenge stars — cosmetic badge system',
        starsPerZone: 5,
        challenges: ['clear_under_time','no_damage','use_only_common','kill_boss_solo','clear_with_modifier'],
      },
    },
  },

  // ═══════════════════════════════════════════
  // 5. ART DIRECTION (Enhanced with Art Forge v2.0)
  // ═══════════════════════════════════════════
  art: {
    description: 'AI-generated art pipeline with background removal, sprite extraction, and weapon binding',
    config: {
      // Art Forge integration — manifest-driven generation
      pipeline: {
        module: '../bin/art-forge.cjs',
        strategy: 'batch_sheet',     // Sheet-based batch generation for small assets
        embedMode: 'base64',         // Inline into single HTML for true single-file games
        fallback: 'procedural',      // If art not loaded, use procedural SVG/Canvas
      },
      // Sprite requirements — all sprites MUST be:
      spriteRequirements: {
        backgroundRemoval: true,      // ★ CRITICAL: fal-bria-rmbg, no grey/checkered backgrounds
        pixelCrop: true,              // Tight-crop to non-transparent bounds
        consistentStyle: true,        // All assets must match the game's art style
        noWatermarks: true,           // Clean, watermark-free sprites
        transparentPNG: true,         // Output as PNG with alpha channel
      },
      // Weapon-character binding — how weapons attach to characters
      weaponBinding: {
        description: 'Weapons must visually attach to characters with correct hold points',
        melee: {
          holdPoint: { x: 0.65, y: 0.45 },
          swingArc: 120,
          reachMultiplier: 1.0,
          animations: ['idle_hold', 'swing_start', 'swing_mid', 'swing_end', 'swing_impact'],
          physics: 'swing arc with collision detection at damage frame',
        },
        ranged: {
          holdPoint: { x: 0.55, y: 0.4 },
          aimRange: 180,
          recoilPx: 4,
          muzzleOffset: { x: 1.0, y: 0.0 },
          animations: ['idle_hold', 'aim', 'fire', 'recoil', 'reload'],
          projectile: { speed: 800, gravity: false, trailLength: 3 },
        },
        thrown: {
          holdPoint: { x: 0.6, y: 0.35 },
          spinRate: 720,
          animations: ['wind_up', 'throw', 'return'],
        },
      },
      // Enemy sprite system
      zombieGenerator: {
        baseParts: ['head','torso','arms','legs'],
        mutations: ['glowing_eyes','torn_clothes','extra_limbs','size_variation','color_shift','bone_exposure'],
        rarityScaling: 'more_mutations_per_zone',
        bossArt: 'unique_silhouette + glow_aura + particle_system',
        spriteSource: 'art_forge_individual',  // Each enemy gets its own gen + rmbg
      },
      // Stage/background system
      stageArt: {
        parallaxLayers: 5,
        weatherSystem: ['clear','rain','fog','toxic_mist','blood_rain','snow','sandstorm'],
        timeOfDay: ['dawn','day','dusk','night'],
        biomeTransitions: 'particle_sweep + color_lerp + 1s_duration',
        spriteSource: 'art_forge_individual',   // Each background generated individually
      },
      // UI art
      uiArt: {
        panels: 'glassmorphism + subtle_glow',
        buttons: 'satisfying_press_animation + haptic_feedback_hint',
        modals: 'slide_in + backdrop_blur',
        notifications: 'toast_system + particle_burst',
        spriteSource: 'art_forge_sheet',        // UI icons batched on sheets
      },
    },
  },
};

// ─────────────────────────────────────────────────────────────────────────
// RUNTIME CODE GENERATOR — produces JS snippets for single-HTML injection
// ─────────────────────────────────────────────────────────────────────────

/**
 * Generate the community systems JS code block for injection into game HTML.
 * This produces a self-contained IIFE that attaches to the game's state object.
 */
function generateCommunityJS(gameConfig = {}) {
  const guildNames = gameConfig.guildNames || [
    'Shadow Reapers','Undead Legion','Bone Collectors','Night Stalkers',
    'Crimson Guard','Iron Wolves','Death Dealers','Storm Breakers',
    'Void Walkers','Flame Born','Frost Fangs','Dark Harvest',
    'Blood Oath','Steel Tide','Neon Ghosts','Ash Phoenix',
  ];

  return `
// ═══════════════════════════════════════════════════════════════
// COMMUNITY FRAMEWORK v1.0 — Guild / Trade / PvP / Progression
// ═══════════════════════════════════════════════════════════════
const COMMUNITY = {
  guildNames: ${JSON.stringify(guildNames)},
  init(G) {
    // Guild
    G.guild = G.guild || this.generateGuild(G);
    // Trade board
    G.tradeBoard = G.tradeBoard || this.generateTradeBoard(G);
    // PvP
    G.pvp = G.pvp || { elo:1000, wins:0, losses:0, streak:0, bestStreak:0, seasonWins:0, tokens:0, revengeTarget:null };
    // Progression
    G.mastery = G.mastery || {};
    G.titles = G.titles || ['Newcomer'];
    G.activeTitle = G.activeTitle || 'Newcomer';
    G.seasonXP = G.seasonXP || 0;
    G.seasonTier = G.seasonTier || 0;
    G.zoneStars = G.zoneStars || {};
    // Dailies
    G.dailyMod = this.getDailyModifier();
    G.dailyGoldEarned = G.dailyGoldEarned || 0;
    G.dailyGoldCap = (G.level||1) * 100 + 500;
    G.lastDailyReset = G.lastDailyReset || 0;
    this.checkDailyReset(G);
  },

  // ── GUILD ──
  generateGuild(G) {
    const name = this.guildNames[Math.floor(Math.random()*this.guildNames.length)];
    const memberCount = 8 + Math.floor(Math.random()*18);
    const members = [];
    const firstNames = ['Ash','Blade','Crypt','Dusk','Echo','Fang','Ghost','Hex','Iron','Jade','Knox','Luna','Mist','Nyx','Onyx','Pyre','Raze','Scar','Thorn','Vex'];
    const used = new Set();
    for (let i = 0; i < memberCount; i++) {
      let n; do { n = firstNames[Math.floor(Math.random()*firstNames.length)] + Math.floor(Math.random()*99); } while(used.has(n));
      used.add(n);
      members.push({
        name: n,
        rank: i === 0 ? 3 : i < 3 ? 2 : Math.random() > 0.7 ? 1 : 0,
        contribution: Math.floor(Math.random()*500),
        online: Math.random() > 0.6,
        lastSeen: Date.now() - Math.floor(Math.random()*86400000*7),
      });
    }
    return {
      name, members, level: 1 + Math.floor(Math.random()*4),
      xp: Math.floor(Math.random()*500), xpToNext: 500,
      buildings: { hall:1, armory:0, market:0, arena:0, shrine:0, garden:0 },
      quests: this.generateGuildQuests(),
      season: { week:1, score:0, rank: 50+Math.floor(Math.random()*200) },
      banner: { color1:'#ff4444', color2:'#1a1a2e', emblem:'skull' },
      motd: 'Welcome! Donate materials to upgrade our base.',
      isPlayerGuild: true,
    };
  },

  generateGuildQuests() {
    const types = [
      { desc:'Slay {n} zombies as a guild', type:'kill', icon:'⚔️' },
      { desc:'Collect {n} crafting materials', type:'collect', icon:'📦' },
      { desc:'Survive {n} waves without dying', type:'survive', icon:'🛡️' },
      { desc:'Win {n} PvP matches', type:'pvp', icon:'⚡' },
      { desc:'Upgrade a guild building', type:'build', icon:'🏗️' },
    ];
    return Array.from({length:3}, () => {
      const t = types[Math.floor(Math.random()*types.length)];
      const n = [25,50,100,10,1][types.indexOf(t)] * (1+Math.floor(Math.random()*3));
      return { ...t, desc: t.desc.replace('{n}',n), target:n, progress:Math.floor(Math.random()*n*.6), reward: {guildXP:50+n, materials:Math.floor(n/2)} };
    });
  },

  // ── TRADE ──
  generateTradeBoard(G) {
    const items = [
      {name:'Iron Scrap',icon:'🔩',rarity:'common'},{name:'Zombie Fang',icon:'🦷',rarity:'common'},
      {name:'Toxic Sludge',icon:'🧪',rarity:'rare'},{name:'Shadow Essence',icon:'🌑',rarity:'rare'},
      {name:'Void Crystal',icon:'💎',rarity:'epic'},{name:'Phoenix Feather',icon:'🪶',rarity:'epic'},
      {name:'Dragon Scale',icon:'🐉',rarity:'legendary'},{name:'Star Fragment',icon:'⭐',rarity:'legendary'},
    ];
    const listings = [];
    for (let i = 0; i < 8; i++) {
      const offer = items[Math.floor(Math.random()*items.length)];
      let want; do { want = items[Math.floor(Math.random()*items.length)]; } while(want.name===offer.name);
      listings.push({
        id: i, seller: 'Player'+Math.floor(Math.random()*999),
        offer: { ...offer, qty: 1+Math.floor(Math.random()*5) },
        want: { ...want, qty: 1+Math.floor(Math.random()*3) },
        posted: Date.now() - Math.floor(Math.random()*86400000),
        expires: Date.now() + 86400000,
      });
    }
    return { listings, playerListings: [], maxPlayerListings: 5, dailyTradesLeft: 10 };
  },

  // ── PVP ──
  generateOpponent(G) {
    const names = ['xDarkSlayer','ZombKing99','NightBlade','CryptLord','BoneSnap','GhostFury','VoidReaper','IronFist','BlazeSoul','FrostBite'];
    const n = names[Math.floor(Math.random()*names.length)];
    const eloDiff = Math.floor(Math.random()*400)-200;
    const oppElo = Math.max(600, (G.pvp?.elo||1000) + eloDiff);
    const oppLvl = Math.max(1, (G.level||1) + Math.floor(eloDiff/100));
    const weapons = ['🔧','⚔️','🔫','🗡️','🔨','🪓','🚀','💀'];
    return {
      name:n, level:oppLvl, elo:oppElo,
      weapon: weapons[Math.floor(Math.random()*weapons.length)],
      hp:100, maxHp:100, dmg: 8+Math.floor(Math.random()*4), atkSpd: 0.8+Math.random()*0.6,
      style: ['aggressive','defensive','balanced'][Math.floor(Math.random()*3)],
    };
  },

  resolvePvP(G, playerWon) {
    const p = G.pvp;
    const K = 32;
    const expected = 1 / (1 + Math.pow(10, ((p.revengeTarget?.elo||p.elo) - p.elo) / 400));
    const result = playerWon ? 1 : 0;
    p.elo = Math.max(100, Math.round(p.elo + K * (result - expected)));
    if (playerWon) {
      p.wins++; p.seasonWins++; p.streak++; p.bestStreak = Math.max(p.bestStreak, p.streak);
      const base = 20; const streakBonus = Math.min(p.streak * 2, 20);
      const revengeBonus = p.revengeTarget ? 10 : 0;
      p.tokens += base + streakBonus + revengeBonus;
      p.revengeTarget = null;
      return { won:true, tokens: base+streakBonus+revengeBonus, eloChange: Math.round(K*(1-expected)), title: p.streak>=5?'Hot Streak':null };
    } else {
      p.losses++; p.streak = 0;
      const consolation = 10;
      p.tokens += consolation;
      return { won:false, tokens: consolation, eloChange: -Math.round(K*expected), canRevenge:true };
    }
  },

  // ── PROGRESSION ──
  getDailyModifier() {
    const mods = [
      {id:'toxic_rain',name:'☣️ Toxic Rain',desc:'Poison pools spawn randomly',color:'#22c55e',fx:'poison'},
      {id:'blood_moon',name:'🌑 Blood Moon',desc:'Zombies faster, 2x material drops',color:'#ef4444',fx:'red_tint'},
      {id:'gold_rush',name:'💰 Gold Rush',desc:'3x gold, enemies have shields',color:'#facc15',fx:'gold_particles'},
      {id:'ghost_hour',name:'👻 Ghost Hour',desc:'Enemies semi-transparent',color:'#a78bfa',fx:'ghost'},
      {id:'pack_hunt',name:'🐺 Pack Hunt',desc:'Enemies always in groups',color:'#f97316',fx:'swarm'},
      {id:'boss_blitz',name:'💀 Boss Blitz',desc:'Boss every 3 waves',color:'#dc2626',fx:'boss_aura'},
      {id:'calm_day',name:'☀️ Calm Day',desc:'No modifier — enjoy the peace',color:'#38bdf8',fx:'none'},
    ];
    const dayIndex = Math.floor(Date.now() / 86400000);
    return mods[dayIndex % mods.length];
  },

  checkDailyReset(G) {
    const today = Math.floor(Date.now() / 86400000);
    if (G.lastDailyReset !== today) {
      G.lastDailyReset = today;
      G.dailyGoldEarned = 0;
      G.dailyMod = this.getDailyModifier();
      if (G.tradeBoard) G.tradeBoard.dailyTradesLeft = 10;
      // Refresh guild quests
      if (G.guild) G.guild.quests = this.generateGuildQuests();
    }
  },

  addGold(G, amount) {
    const cap = G.dailyGoldCap || 1000;
    const canEarn = Math.max(0, cap - (G.dailyGoldEarned||0));
    const actual = Math.min(amount, canEarn);
    G.gold = (G.gold||0) + actual;
    G.totalGold = (G.totalGold||0) + actual;
    G.dailyGoldEarned = (G.dailyGoldEarned||0) + actual;
    return actual;
  },

  getWeaponMastery(G, weaponId) {
    if (!G.mastery[weaponId]) G.mastery[weaponId] = { level:0, xp:0, xpToNext:100, perks:[] };
    return G.mastery[weaponId];
  },

  addMasteryXP(G, weaponId, amount) {
    const m = this.getWeaponMastery(G, weaponId);
    m.xp += amount;
    while (m.xp >= m.xpToNext && m.level < 20) {
      m.xp -= m.xpToNext;
      m.level++;
      m.xpToNext = Math.floor(100 * Math.pow(1.3, m.level));
    }
    return m;
  },

  getSeasonTier(G) {
    const xpPerTier = 200;
    G.seasonTier = Math.min(50, Math.floor((G.seasonXP||0) / xpPerTier));
    return G.seasonTier;
  },

  awardTitle(G, title) {
    if (!G.titles.includes(title)) { G.titles.push(title); return true; }
    return false;
  },
};
`;
}

// ─────────────────────────────────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────────────────────────────────
module.exports = {
  COMMUNITY_SPEC,
  generateCommunityJS,
};

// CLI usage
if (require.main === module) {
  const arg = process.argv[2];
  if (arg === '--spec') {
    console.log(JSON.stringify(COMMUNITY_SPEC, null, 2));
  } else if (arg === '--js') {
    console.log(generateCommunityJS());
  } else {
    console.log('NW Community Framework v1.0');
    console.log('  --spec   Print community systems spec as JSON');
    console.log('  --js     Generate embeddable JS code for game HTML');
    console.log('\nSystems: Guild, Trade, PvP, Progression Illusion, Art Direction');
  }
}
