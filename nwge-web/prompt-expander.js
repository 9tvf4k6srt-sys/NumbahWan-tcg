// ════════════════════════════════════════════════════════════════
//  NWGE PROMPT EXPANDER — Turns "World of Warcraft" into a game
// ════════════════════════════════════════════════════════════════
//
//  The core insight: a 3-word prompt like "World of Warcraft" implies
//  thousands of game design decisions. This module decomposes prompts
//  into archetype matches, then expands them into full game content.

// ─── Archetype Database ─────────────────────────────────────────
// Each archetype defines a pattern, implied content layers, and
// a template that generates entities/items/scenes/events/systems.

const ARCHETYPES = {
  mmorpg: {
    match: /mmorpg|mmo|world\s*of\s*warcraft|wow|everquest|final\s*fantasy\s*(xiv|14|online)|guild\s*wars|elder\s*scrolls\s*online|runescape|massive.?multi/i,
    genre: 'rpg',
    render: '2d',
    label: 'MMORPG',
    layers: ['races', 'classes', 'zones', 'dungeons', 'raids', 'pvp', 'professions', 'mounts', 'factions', 'quests', 'economy'],
  },
  openWorldRPG: {
    match: /open\s*world\s*rpg|skyrim|witcher|elden\s*ring|breath\s*of\s*the\s*wild|botw|zelda|dark\s*souls|baldur.?s\s*gate|dragon\s*age/i,
    genre: 'rpg',
    render: '2d',
    label: 'Open World RPG',
    layers: ['classes', 'zones', 'dungeons', 'quests', 'economy', 'crafting', 'mounts'],
  },
  survivalCraft: {
    match: /survival\s*(craft|game)?|minecraft|terraria|valheim|\bark\b|\brust\b|7\s*days|don.?t\s*starve|subnautica|the\s*forest|\braft\b/i,
    genre: 'sandbox',
    render: '2d',
    label: 'Survival Craft',
    layers: ['biomes', 'crafting_deep', 'building', 'mobs', 'bosses', 'tools_progression'],
  },
  battleRoyale: {
    match: /battle\s*royale|fortnite|apex|pubg|warzone|last\s*man|shrinking\s*circle/i,
    genre: 'shooter',
    render: '2d',
    label: 'Battle Royale',
    layers: ['weapons_br', 'armor', 'vehicles', 'zones_br', 'loot'],
  },
  metroidvania: {
    match: /metroidvania|hollow\s*knight|metroid|castlevania|ori\s*(and|&)|celeste|dead\s*cells|salt\s*and/i,
    genre: 'platformer',
    render: '2d',
    label: 'Metroidvania',
    layers: ['abilities', 'zones_mv', 'bosses_mv', 'upgrades', 'secrets'],
  },
  farmingSim: {
    match: /stardew|harvest\s*moon|animal\s*crossing|farm\s*sim|story\s*of\s*seasons|my\s*time\s*at|slime\s*rancher|moonstone\s*island/i,
    genre: 'farming-rpg',
    render: '2d',
    label: 'Farming Sim',
    layers: ['crops_deep', 'animals_deep', 'villagers', 'seasons', 'festivals', 'romance', 'fishing', 'cooking'],
  },
  roguelite: {
    match: /roguelite|roguelike|hades|slay\s*the\s*spire|binding\s*of\s*isaac|enter\s*the\s*gungeon|risk\s*of\s*rain|vampire\s*survivors|dead\s*cells/i,
    genre: 'roguelike',
    render: '2d',
    label: 'Roguelite',
    layers: ['characters_rl', 'weapons_rl', 'floors', 'bosses_rl', 'upgrades_rl', 'meta_progression'],
  },
  cityBuilder: {
    match: /city\s*build|simcity|cities\s*skylines|banished|frostpunk|tropico|anno\s*\d|civilization|civ\s*\d|age\s*of\s*empires|rts|strategy\s*game/i,
    genre: 'sandbox',
    render: '2d',
    label: 'Strategy / City Builder',
    layers: ['buildings_city', 'resources_city', 'population', 'tech_tree', 'military'],
  },
  horror: {
    match: /resident\s*evil|silent\s*hill|amnesia|outlast|phasmophobia|dead\s*space|alien\s*isolation|horror\s*game|survival\s*horror/i,
    genre: 'horror',
    render: '2d',
    label: 'Survival Horror',
    layers: ['weapons_horror', 'enemies_horror', 'zones_horror', 'puzzles_horror', 'resources_horror'],
  },
  towerDefense: {
    match: /tower\s*defense|bloons|kingdom\s*rush|plants\s*vs|defense\s*game/i,
    genre: 'tower-defense',
    render: '2d',
    label: 'Tower Defense',
    layers: ['towers', 'enemies_td', 'waves', 'upgrades_td', 'maps_td'],
  },
};

// ─── Content Layer Generators ──────────────────────────────────
// Each layer adds entities, items, scenes, events, systems, and variables.

const LAYERS = {
  // ──────── MMORPG LAYERS ────────────────────────

  races(ctx) {
    const races = [
      { name: 'human', sprite: 'human', stats: { str: 10, agi: 10, int: 10, sta: 10 }, desc: 'Versatile and adaptable', faction: 'alliance' },
      { name: 'orc', sprite: 'orc', stats: { str: 14, agi: 8, int: 7, sta: 12 }, desc: 'Fierce warriors of the Horde', faction: 'horde' },
      { name: 'elf', sprite: 'elf', stats: { str: 7, agi: 14, int: 12, sta: 8 }, desc: 'Ancient forest dwellers', faction: 'alliance' },
      { name: 'undead', sprite: 'undead', stats: { str: 9, agi: 9, int: 13, sta: 10 }, desc: 'Risen from the grave', faction: 'horde' },
      { name: 'dwarf', sprite: 'dwarf', stats: { str: 12, agi: 8, int: 8, sta: 13 }, desc: 'Stout mountain folk', faction: 'alliance' },
      { name: 'troll', sprite: 'troll', stats: { str: 11, agi: 13, int: 8, sta: 9 }, desc: 'Cunning and agile', faction: 'horde' },
    ];
    ctx.vars.player_race = 'human';
    for (const r of races) {
      ctx.items.push({ name: `${r.name}_racial`, type: 'quest', description: `${r.desc}. Faction: ${r.faction}`, rarity: 'uncommon' });
    }
    ctx.events.select_race = [{ action: 'dialog', speaker: 'System', text: 'Choose your race: Human, Orc, Elf, Undead, Dwarf, or Troll.' }];
    ctx.vars.available_races = races.length;
  },

  classes(ctx) {
    const classes = [
      { name: 'warrior', role: 'tank/dps', weapon: 'greatsword', armor: 'plate', skills: ['charge', 'shield_bash', 'whirlwind', 'battle_shout'] },
      { name: 'mage', role: 'ranged dps', weapon: 'staff', armor: 'cloth', skills: ['fireball', 'frost_nova', 'arcane_blast', 'blink'] },
      { name: 'rogue', role: 'melee dps', weapon: 'daggers', armor: 'leather', skills: ['backstab', 'stealth', 'poison', 'evasion'] },
      { name: 'priest', role: 'healer', weapon: 'wand', armor: 'cloth', skills: ['heal', 'shield', 'smite', 'resurrect'] },
      { name: 'hunter', role: 'ranged dps', weapon: 'bow', armor: 'mail', skills: ['aimed_shot', 'trap', 'tame_beast', 'volley'] },
      { name: 'paladin', role: 'tank/healer', weapon: 'mace', armor: 'plate', skills: ['holy_strike', 'lay_on_hands', 'divine_shield', 'consecrate'] },
      { name: 'warlock', role: 'ranged dps', weapon: 'staff', armor: 'cloth', skills: ['shadow_bolt', 'summon_demon', 'drain_life', 'fear'] },
      { name: 'druid', role: 'hybrid', weapon: 'staff', armor: 'leather', skills: ['moonfire', 'bear_form', 'cat_form', 'rejuvenation'] },
    ];
    for (const c of classes) {
      // Weapon for each class
      ctx.items.push({ name: c.weapon, type: 'weapon', damage: 15 + Math.floor(Math.random() * 20), slot: 'weapon', description: `${c.role} weapon` });
      // Class armor
      ctx.items.push({ name: `${c.armor}_armor`, type: 'equipment', slot: 'body', stats: { defense: c.armor === 'plate' ? 20 : c.armor === 'mail' ? 14 : c.armor === 'leather' ? 10 : 6 }, rarity: 'common' });
    }
    ctx.vars.player_class = 'warrior';
    ctx.vars.available_classes = classes.length;
    ctx.systems.push({ type: 'combat', config: { classes: classes.map(c => c.name) } });
  },

  zones(ctx) {
    const zones = [
      { name: 'elwynn_forest', size: [120, 90], lighting: 'day', music: 'peaceful_forest', level: '1-10', tile: 16, desc: 'Rolling green hills, farms, and the great city walls in the distance' },
      { name: 'durotar', size: [100, 80], lighting: 'day', music: 'tribal_drums', level: '1-10', tile: 16, desc: 'Red desert canyons and orc strongholds' },
      { name: 'westfall', size: [110, 85], lighting: 'day', music: 'dusty_plains', level: '10-20', tile: 16, desc: 'Abandoned farmlands overrun by bandits' },
      { name: 'ashenvale', size: [130, 100], lighting: 'dusk', music: 'ancient_woods', level: '18-30', tile: 16, desc: 'Ancient purple forests where elves stand guard' },
      { name: 'stranglethorn', size: [140, 110], lighting: 'day', music: 'jungle_beats', level: '30-45', tile: 16, desc: 'Dense tropical jungle with pirates and trolls' },
      { name: 'burning_steppes', size: [100, 80], lighting: 'dusk', music: 'dark_fire', level: '50-55', tile: 16, desc: 'Scorched earth, rivers of lava, black dragons' },
      { name: 'plaguelands', size: [120, 90], lighting: 'night', music: 'undead_march', level: '55-60', tile: 16, desc: 'Cursed land of the undead Scourge' },
      { name: 'stormwind', size: [80, 60], lighting: 'day', music: 'city_fanfare', level: 'all', tile: 16, desc: 'Grand Alliance capital city with auction house and bank' },
      { name: 'orgrimmar', size: [80, 60], lighting: 'day', music: 'horde_capital', level: 'all', tile: 16, desc: 'Fortified Horde capital carved into red canyons' },
      { name: 'tanaris', size: [110, 85], lighting: 'day', music: 'desert_wind', level: '40-50', tile: 16, desc: 'Vast desert with hidden tombs and goblin trading posts' },
    ];
    // NPCs for each zone
    const zoneNPCs = {
      elwynn_forest: [
        { name: 'guard_thomas', sprite: 'guard', tags: ['npc', 'interactable'], ai: 'patrol', dialog: [{ text: 'Kobolds have overrun the mine! Clear them out for 50 gold.' }] },
        { name: 'farmer_saldean', sprite: 'farmer', tags: ['npc', 'interactable'], ai: 'idle', dialog: [{ text: 'The harvest moon festival is next week!' }] },
      ],
      durotar: [
        { name: 'thrall', sprite: 'orc_chief', tags: ['npc', 'interactable'], ai: 'idle', dialog: [{ text: 'Strength and honor, champion. The Horde needs you.' }] },
      ],
      stormwind: [
        { name: 'king_varian', sprite: 'king', tags: ['npc', 'interactable'], ai: 'idle', dialog: [{ text: 'Welcome to Stormwind. Speak to the trainers to learn your craft.' }] },
        { name: 'auctioneer', sprite: 'npc', tags: ['npc', 'interactable'], ai: 'idle', dialog: [{ text: 'Looking to buy or sell? Browse the auction house!' }] },
        { name: 'banker', sprite: 'npc', tags: ['npc', 'interactable'], ai: 'idle', dialog: [{ text: 'Your vault is secure. 200 slots available.' }] },
        { name: 'flight_master', sprite: 'npc', tags: ['npc', 'interactable'], ai: 'idle', dialog: [{ text: 'Where would you like to fly?' }] },
      ],
      orgrimmar: [
        { name: 'warchief', sprite: 'orc_chief', tags: ['npc', 'interactable'], ai: 'idle', dialog: [{ text: 'For the Horde! Speak to the battle masters for PvP.' }] },
        { name: 'goblin_auctioneer', sprite: 'goblin', tags: ['npc', 'interactable'], ai: 'idle', dialog: [{ text: "Buy low, sell high! That's the goblin way." }] },
      ],
      westfall: [
        { name: 'gryan_stoutmantle', sprite: 'captain', tags: ['npc', 'interactable'], ai: 'idle', dialog: [{ text: 'The Defias Brotherhood threatens these lands. Will you help?' }] },
      ],
      stranglethorn: [
        { name: 'hemet_nesingwary', sprite: 'hunter_npc', tags: ['npc', 'interactable'], ai: 'idle', dialog: [{ text: 'Ah, a hunter! Care to join the great safari?' }] },
      ],
      burning_steppes: [
        { name: 'dragon_watcher', sprite: 'npc', tags: ['npc', 'interactable'], ai: 'idle', dialog: [{ text: 'Nefarian rules Blackrock Mountain. Only the strongest survive.' }] },
      ],
    };

    for (const z of zones) {
      const sceneEntities = [{ entity: 'hero', at: [10, 10] }];
      // Zone enemies
      if (z.level !== 'all') {
        const lvl = parseInt(z.level);
        const enemyName = `${z.name}_mob`;
        ctx.entities.push({ name: enemyName, sprite: 'enemy', speed: 30 + lvl, size: [14, 14], tags: ['enemy'], body: 'dynamic', health: 20 + lvl * 5, ai: 'wander', props: { damage: 5 + lvl * 2, xp_reward: 10 + lvl * 3, respawn: 30, zone_level: z.level } });
        // Place multiple enemies
        for (let i = 0; i < 3; i++) {
          sceneEntities.push({ entity: enemyName, at: [20 + i * 25, 20 + i * 15] });
        }
      }
      // Zone NPCs
      const npcs = zoneNPCs[z.name] || [];
      for (const npc of npcs) {
        ctx.entities.push({ ...npc, speed: npc.ai === 'patrol' ? 30 : 0, size: [14, 14], body: 'static' });
        sceneEntities.push({ entity: npc.name, at: [40 + Math.floor(Math.random() * 30), 20 + Math.floor(Math.random() * 20)] });
      }
      // Scene exits to adjacent zones
      const exits = [];
      const idx = zones.indexOf(z);
      if (idx > 0) exits.push({ to: zones[idx - 1].name, at: [0, Math.floor(z.size[1] / 2)], direction: 'left' });
      if (idx < zones.length - 1) exits.push({ to: zones[idx + 1].name, at: [z.size[0] - 1, Math.floor(z.size[1] / 2)], direction: 'right' });
      // Cities connect to everything
      if (z.name === 'stormwind' || z.name === 'orgrimmar') {
        for (const oz of zones) {
          if (oz.name !== z.name) exits.push({ to: oz.name, at: [Math.floor(z.size[0] / 2), 0], direction: 'up' });
        }
      }

      ctx.scenes.push({
        name: z.name, size: z.size, tile_size: z.tile, spawn_point: [10, 10],
        lighting: z.lighting, music: z.music, entities: sceneEntities, exits,
      });
    }
    ctx.vars.current_zone = 'elwynn_forest';
    ctx.vars.zones_discovered = 1;
    ctx.vars.total_zones = zones.length;
  },

  dungeons(ctx) {
    const dungeons = [
      { name: 'deadmines', level: '18-22', boss: 'vancleef', bossHP: 500, loot: 'defias_cutlass', desc: 'A hidden pirate fortress beneath Westfall' },
      { name: 'shadowfang_keep', level: '22-30', boss: 'arugal', bossHP: 800, loot: 'shadow_fang', desc: 'Haunted castle of the mad wizard' },
      { name: 'scarlet_monastery', level: '34-45', boss: 'mograine', bossHP: 1200, loot: 'scarlet_crusader_set', desc: 'Zealot-filled cathedral of the Scarlet Crusade' },
      { name: 'blackrock_depths', level: '52-60', boss: 'emperor_thaurissan', bossHP: 3000, loot: 'ironfoe', desc: 'Massive underground city of the Dark Iron dwarves' },
      { name: 'stratholme', level: '58-60', boss: 'baron_rivendare', bossHP: 4000, loot: 'deathcharger_reins', desc: 'The burning undead city, timed run for the mount' },
    ];
    for (const d of dungeons) {
      // Boss entity
      ctx.entities.push({
        name: d.boss, sprite: 'boss', speed: 25, size: [20, 20], tags: ['enemy', 'boss', 'interactable'],
        body: 'dynamic', health: d.bossHP, ai: 'chase',
        props: { damage: 30 + parseInt(d.level) * 2, xp_reward: 500, loot_table: d.loot, dungeon: d.name },
      });
      // Dungeon loot
      ctx.items.push({ name: d.loot, type: 'weapon', damage: 20 + parseInt(d.level), rarity: 'rare', description: `Drops from ${d.boss} in ${d.name}` });
      // Dungeon scene
      ctx.scenes.push({
        name: d.name, size: [80, 60], tile_size: 16, lighting: 'cave', music: 'dungeon_ambience',
        spawn_point: [5, 30], entities: [{ entity: 'hero', at: [5, 30] }, { entity: d.boss, at: [70, 30] }],
        on_enter: [{ action: 'dialog', speaker: 'System', text: `Entering ${d.name} (Level ${d.level}): ${d.desc}` }],
      });
    }
    ctx.vars.dungeons_cleared = 0;
    ctx.vars.total_dungeons = dungeons.length;
  },

  raids(ctx) {
    const raids = [
      { name: 'molten_core', level: 60, boss: 'ragnaros', bossHP: 20000, players: 40, loot: 'sulfuras_hand_of_ragnaros', desc: 'The Firelord awaits in the depths of Blackrock Mountain' },
      { name: 'onyxias_lair', level: 60, boss: 'onyxia', bossHP: 15000, players: 40, loot: 'onyxia_scale_cloak', desc: 'The dragon aspect lurks in her volcanic lair' },
      { name: 'blackwing_lair', level: 60, boss: 'nefarian', bossHP: 25000, players: 40, loot: 'ashkandi', desc: 'Nefarian plots the doom of all races from his mountain throne' },
    ];
    for (const r of raids) {
      ctx.entities.push({
        name: r.boss, sprite: 'raid_boss', speed: 15, size: [32, 32], tags: ['enemy', 'boss', 'raid'],
        body: 'dynamic', health: r.bossHP, ai: 'chase',
        props: { damage: 200, xp_reward: 5000, loot_table: r.loot, raid: r.name, required_players: r.players },
      });
      ctx.items.push({ name: r.loot, type: 'weapon', damage: 80 + Math.floor(Math.random() * 40), rarity: 'legendary', description: `Legendary drop from ${r.boss} (${r.players}-player raid)` });
      ctx.scenes.push({
        name: r.name, size: [120, 80], tile_size: 16, lighting: 'cave', music: 'epic_battle',
        spawn_point: [10, 40], entities: [{ entity: 'hero', at: [10, 40] }, { entity: r.boss, at: [100, 40] }],
        on_enter: [{ action: 'dialog', speaker: 'System', text: `RAID: ${r.name} — ${r.desc}. ${r.players} players required.` }],
      });
    }
    ctx.vars.raids_cleared = 0;
    ctx.vars.total_raids = raids.length;
  },

  pvp(ctx) {
    const battlegrounds = [
      { name: 'warsong_gulch', type: 'ctf', players: '10v10', size: [80, 60] },
      { name: 'arathi_basin', type: 'domination', players: '15v15', size: [100, 80] },
      { name: 'alterac_valley', type: 'large_battle', players: '40v40', size: [160, 120] },
    ];
    for (const bg of battlegrounds) {
      ctx.scenes.push({
        name: bg.name, size: bg.size, tile_size: 16, lighting: 'day', music: 'battle_horns',
        spawn_point: [10, Math.floor(bg.size[1] / 2)],
        entities: [{ entity: 'hero', at: [10, Math.floor(bg.size[1] / 2)] }],
        on_enter: [{ action: 'dialog', speaker: 'System', text: `PvP Battleground: ${bg.name} (${bg.type}, ${bg.players})` }],
      });
    }
    ctx.items.push({ name: 'pvp_trinket', type: 'equipment', slot: 'ring', stats: { defense: 5 }, rarity: 'rare', description: 'Breaks crowd control effects', buy_price: 10000 });
    ctx.items.push({ name: 'honor_gear_set', type: 'equipment', slot: 'body', stats: { defense: 25, attack: 15 }, rarity: 'epic', description: 'Earned through PvP honor' });
    ctx.vars.honor_points = 0;
    ctx.vars.pvp_rank = 'private';
    ctx.vars.kills = 0;
    ctx.systems.push({ type: 'combat', config: { pvp_enabled: true } });
  },

  professions(ctx) {
    const profs = [
      { name: 'mining', type: 'gathering', items: ['copper_ore', 'iron_ore', 'mithril_ore', 'thorium_ore'] },
      { name: 'herbalism', type: 'gathering', items: ['peacebloom', 'silverleaf', 'fadeleaf', 'black_lotus'] },
      { name: 'skinning', type: 'gathering', items: ['light_leather', 'medium_leather', 'thick_leather', 'rugged_leather'] },
      { name: 'blacksmithing', type: 'crafting', items: ['iron_sword', 'mithril_plate', 'thorium_helm', 'arcanite_reaper'] },
      { name: 'alchemy', type: 'crafting', items: ['minor_healing_potion', 'swiftness_potion', 'elixir_of_giants', 'flask_of_titans'] },
      { name: 'enchanting', type: 'crafting', items: ['fiery_enchant', 'crusader_enchant', 'agility_enchant', 'spellpower_enchant'] },
      { name: 'tailoring', type: 'crafting', items: ['silk_robe', 'mooncloth_vest', 'felcloth_pants', 'truefaith_vestments'] },
      { name: 'engineering', type: 'crafting', items: ['goblin_bomb', 'gnomish_goggles', 'mechanical_squirrel', 'world_enlarger'] },
      { name: 'cooking', type: 'secondary', items: ['roasted_boar', 'spider_cake', 'nightfin_soup', 'dirges_kickin_chimaerok'] },
      { name: 'fishing', type: 'secondary', items: ['raw_nightfin', 'deviate_fish', 'stonescale_eel', 'winter_squid'] },
      { name: 'first_aid', type: 'secondary', items: ['linen_bandage', 'silk_bandage', 'runecloth_bandage', 'heavy_runecloth_bandage'] },
    ];
    for (const p of profs) {
      for (const item of p.items) {
        const isGathered = p.type === 'gathering' || p.type === 'secondary';
        ctx.items.push({
          name: item,
          type: isGathered ? 'material' : 'equipment',
          sell_price: 5 + p.items.indexOf(item) * 15,
          buy_price: isGathered ? 0 : 20 + p.items.indexOf(item) * 25,
          rarity: p.items.indexOf(item) >= 3 ? 'rare' : p.items.indexOf(item) >= 2 ? 'uncommon' : 'common',
          description: `${p.name}: ${item.replace(/_/g, ' ')}`,
        });
      }
    }
    ctx.vars.profession_1 = 'none';
    ctx.vars.profession_2 = 'none';
    ctx.vars.cooking_skill = 0;
    ctx.vars.fishing_skill = 0;
    ctx.vars.first_aid_skill = 0;
    ctx.systems.push({ type: 'crafting', config: { professions: profs.map(p => p.name) } });
  },

  mounts(ctx) {
    const mounts = [
      { name: 'brown_horse', speed: 160, buy_price: 100, level: 40, rarity: 'common' },
      { name: 'swift_palomino', speed: 200, buy_price: 1000, level: 60, rarity: 'uncommon' },
      { name: 'black_war_steed', speed: 200, buy_price: 0, level: 60, rarity: 'epic', desc: 'PvP Rank 11 reward' },
      { name: 'deathcharger', speed: 200, buy_price: 0, level: 60, rarity: 'legendary', desc: 'Drops from Baron Rivendare (0.02% chance)' },
      { name: 'swift_zulian_tiger', speed: 200, buy_price: 0, level: 60, rarity: 'legendary', desc: 'Drops from High Priest Thekal in Zul\'Gurub' },
      { name: 'onyxian_drake', speed: 200, buy_price: 0, level: 60, rarity: 'legendary', desc: 'Onyxia raid drop' },
    ];
    for (const m of mounts) {
      ctx.items.push({ name: m.name, type: 'key', buy_price: m.buy_price, rarity: m.rarity, description: `Mount (${m.speed}% speed). Requires level ${m.level}. ${m.desc || ''}` });
    }
    ctx.vars.has_mount = false;
    ctx.vars.mount_speed = 100;
  },

  factions(ctx) {
    const factions = [
      { name: 'alliance', leader: 'king_varian', capital: 'stormwind', races: ['human', 'elf', 'dwarf'] },
      { name: 'horde', leader: 'warchief', capital: 'orgrimmar', races: ['orc', 'undead', 'troll'] },
      { name: 'argent_dawn', type: 'neutral', desc: 'Holy warriors fighting the undead Scourge' },
      { name: 'cenarion_circle', type: 'neutral', desc: 'Druid protectors of nature' },
      { name: 'thorium_brotherhood', type: 'neutral', desc: 'Dark Iron dwarf smiths offering rare recipes' },
    ];
    for (const f of factions) {
      ctx.vars[`rep_${f.name}`] = f.type === 'neutral' ? 0 : 3000;
    }
    ctx.systems.push({ type: 'relationship', config: { factions: factions.map(f => f.name) } });
  },

  quests(ctx) {
    ctx.vars.quests_completed = 0;
    ctx.vars.active_quests = 0;
    ctx.events.quest_complete = [
      { action: 'add', var: 'quests_completed', amount: 1 },
      { action: 'add', var: 'hero.xp', amount: 200 },
      { action: 'sfx', sound: 'quest_complete' },
      { action: 'dialog', speaker: 'System', text: 'Quest completed! Rewards have been added to your inventory.' },
    ];
    ctx.events.quest_accept = [
      { action: 'add', var: 'active_quests', amount: 1 },
      { action: 'sfx', sound: 'quest_accept' },
    ];
    ctx.systems.push({ type: 'quest', config: { max_active: 20, quest_log: true } });
  },

  economy(ctx) {
    // General items every RPG economy needs
    const econItems = [
      { name: 'health_potion', type: 'potion', heal_amount: 50, buy_price: 30, sell_price: 7 },
      { name: 'mana_potion', type: 'potion', heal_amount: 40, buy_price: 40, sell_price: 10, description: 'Restores mana' },
      { name: 'elixir_of_fortitude', type: 'potion', heal_amount: 0, buy_price: 80, sell_price: 20, stats: { sta: 10 }, description: '+10 Stamina for 60 min' },
      { name: 'bag_16_slot', type: 'material', buy_price: 500, sell_price: 125, description: '16-slot bag for inventory expansion' },
      { name: 'hearthstone', type: 'key', description: 'Teleports you to your home inn (30 min cooldown)' },
      { name: 'repair_anvil', type: 'material', buy_price: 100, description: 'Repair your gear anywhere' },
    ];
    for (const item of econItems) ctx.items.push(item);
    ctx.vars.gold = 0;
    ctx.vars.bank_gold = 0;
    ctx.systems.push({ type: 'shop', config: { auction_house: true, vendor_buyback: true } });
    ctx.systems.push({ type: 'inventory', config: { base_slots: 16, bag_expansion: true, bank_slots: 28 } });
  },

  // ──────── OPEN WORLD RPG LAYERS ──────────────

  crafting(ctx) {
    const recipes = [
      { name: 'iron_sword', recipe: { iron_ore: 3 }, type: 'weapon', damage: 20 },
      { name: 'leather_armor', recipe: { light_leather: 5 }, type: 'equipment', slot: 'body', stats: { defense: 12 } },
      { name: 'healing_salve', recipe: { peacebloom: 2, silverleaf: 1 }, type: 'potion', heal_amount: 30 },
    ];
    for (const r of recipes) ctx.items.push({ ...r, rarity: 'uncommon', description: `Crafted: ${JSON.stringify(r.recipe)}` });
    ctx.systems.push({ type: 'crafting', config: { workbench_required: true } });
  },

  // ──────── SURVIVAL CRAFT LAYERS ──────────────

  biomes(ctx) {
    const biomes = [
      { name: 'plains', size: [120, 90], lighting: 'day', tile: 16 },
      { name: 'deep_forest', size: [100, 80], lighting: 'dusk', tile: 16 },
      { name: 'mountains', size: [80, 100], lighting: 'day', tile: 16 },
      { name: 'desert', size: [120, 80], lighting: 'day', tile: 16 },
      { name: 'ocean', size: [140, 100], lighting: 'day', tile: 16 },
      { name: 'caves', size: [60, 60], lighting: 'cave', tile: 16 },
      { name: 'nether', size: [80, 60], lighting: 'night', tile: 16 },
    ];
    for (const b of biomes) {
      ctx.scenes.push({ name: b.name, size: b.size, tile_size: b.tile, lighting: b.lighting, spawn_point: [10, 10], entities: [{ entity: 'hero', at: [10, 10] }] });
    }
  },

  crafting_deep(ctx) {
    const tiers = ['wood', 'stone', 'iron', 'gold', 'diamond', 'obsidian'];
    const toolTypes = ['pickaxe', 'axe', 'sword', 'shovel', 'hoe'];
    for (const tier of tiers) {
      for (const tool of toolTypes) {
        const idx = tiers.indexOf(tier);
        ctx.items.push({
          name: `${tier}_${tool}`, type: tool === 'sword' ? 'weapon' : 'tool',
          tool_type: tool === 'sword' ? undefined : tool,
          damage: tool === 'sword' ? 5 + idx * 8 : undefined,
          rarity: idx >= 4 ? 'rare' : idx >= 2 ? 'uncommon' : 'common',
          recipe: { [`${tier}_ingot`]: tool === 'sword' ? 2 : 3, stick: 2 },
        });
      }
      ctx.items.push({ name: `${tier}_ingot`, type: 'material', sell_price: 5 + tiers.indexOf(tier) * 10 });
    }
    ctx.systems.push({ type: 'crafting', config: { tiers: tiers.length } });
  },

  building(ctx) {
    const blocks = ['wood_planks', 'stone_bricks', 'glass', 'door', 'chest', 'furnace', 'crafting_table', 'torch', 'ladder', 'fence'];
    for (const b of blocks) {
      ctx.items.push({ name: b, type: 'building', stackable: true, description: `Building block: ${b.replace(/_/g, ' ')}` });
    }
    ctx.systems.push({ type: 'building', config: { grid_snap: true, blueprint: true } });
  },

  mobs(ctx) {
    const mobs = [
      { name: 'zombie', health: 20, damage: 3, ai: 'chase', drops: ['rotten_flesh'] },
      { name: 'skeleton', health: 20, damage: 5, ai: 'chase', drops: ['bone', 'arrow'] },
      { name: 'spider', health: 16, damage: 2, ai: 'chase', drops: ['string', 'spider_eye'] },
      { name: 'creeper', health: 20, damage: 30, ai: 'chase', drops: ['gunpowder'] },
      { name: 'enderman', health: 40, damage: 7, ai: 'idle', drops: ['ender_pearl'] },
    ];
    for (const m of mobs) {
      ctx.entities.push({ name: m.name, sprite: m.name, speed: 30, size: [14, 14], tags: ['enemy'], health: m.health, ai: m.ai, props: { damage: m.damage, drops: m.drops } });
      for (const d of m.drops) {
        if (!ctx.items.find(i => i.name === d)) ctx.items.push({ name: d, type: 'material', sell_price: 2 });
      }
    }
  },

  bosses(ctx) {
    const bosses = [
      { name: 'ender_dragon', health: 200, damage: 10, loot: 'dragon_egg' },
      { name: 'wither', health: 300, damage: 8, loot: 'nether_star' },
    ];
    for (const b of bosses) {
      ctx.entities.push({ name: b.name, sprite: 'boss', speed: 20, size: [32, 32], tags: ['enemy', 'boss'], health: b.health, ai: 'chase', props: { damage: b.damage } });
      ctx.items.push({ name: b.loot, type: 'material', rarity: 'legendary' });
    }
  },

  tools_progression(ctx) {
    ctx.vars.hunger = 100;
    ctx.vars.thirst = 100;
    ctx.vars.temperature = 72;
    ctx.systems.push({ type: 'physics' });
    ctx.systems.push({ type: 'day_night', config: { cycle_minutes: 20 } });
    ctx.systems.push({ type: 'weather', config: { types: ['clear', 'rain', 'storm', 'snow'] } });
  },

  // ──────── BATTLE ROYALE LAYERS ──────────────

  weapons_br(ctx) {
    const weapons = [
      { name: 'pistol', damage: 15, rarity: 'common' },
      { name: 'shotgun', damage: 90, rarity: 'common' },
      { name: 'assault_rifle', damage: 30, rarity: 'uncommon' },
      { name: 'sniper_rifle', damage: 100, rarity: 'rare' },
      { name: 'smg', damage: 20, rarity: 'common' },
      { name: 'rocket_launcher', damage: 120, rarity: 'legendary' },
      { name: 'golden_scar', damage: 40, rarity: 'legendary' },
    ];
    for (const w of weapons) ctx.items.push({ ...w, type: 'weapon', slot: 'weapon' });
  },

  armor(ctx) {
    for (const tier of ['light', 'medium', 'heavy']) {
      const def = tier === 'light' ? 10 : tier === 'medium' ? 20 : 30;
      ctx.items.push({ name: `${tier}_vest`, type: 'equipment', slot: 'body', stats: { defense: def }, rarity: tier === 'heavy' ? 'rare' : 'common' });
      ctx.items.push({ name: `${tier}_helmet`, type: 'equipment', slot: 'head', stats: { defense: Math.floor(def / 2) }, rarity: tier === 'heavy' ? 'rare' : 'common' });
    }
  },

  vehicles(ctx) {
    for (const v of ['quad', 'truck', 'helicopter', 'boat']) {
      ctx.entities.push({ name: v, sprite: v, speed: v === 'helicopter' ? 200 : v === 'truck' ? 120 : 150, size: [24, 24], tags: ['vehicle', 'interactable'] });
    }
  },

  zones_br(ctx) {
    ctx.scenes.push({ name: 'battle_island', size: [200, 200], tile_size: 16, lighting: 'day', spawn_point: [100, 100], entities: [{ entity: 'hero', at: [100, 100] }] });
    ctx.vars.circle_radius = 100;
    ctx.vars.players_alive = 100;
    ctx.vars.storm_damage = 1;
  },

  loot(ctx) {
    const lootItems = ['bandages', 'shield_potion', 'med_kit', 'ammo_box', 'grenade', 'smoke_bomb'];
    for (const l of lootItems) ctx.items.push({ name: l, type: l.includes('potion') || l.includes('bandage') || l.includes('med') ? 'potion' : 'material', heal_amount: l.includes('potion') ? 50 : l.includes('bandage') ? 15 : l.includes('med') ? 75 : 0 });
  },

  // ──────── METROIDVANIA LAYERS ──────────────

  abilities(ctx) {
    const abs = ['double_jump', 'wall_climb', 'dash', 'ground_pound', 'grapple', 'phase_shift'];
    for (const a of abs) ctx.items.push({ name: a, type: 'key', rarity: 'epic', description: `Ability unlock: ${a.replace(/_/g, ' ')}` });
  },

  zones_mv(ctx) {
    const mvZones = ['forgotten_crossroads', 'greenpath', 'crystal_peak', 'deepnest', 'city_of_tears', 'abyss'];
    for (const z of mvZones) {
      ctx.scenes.push({ name: z, size: [80, 60], tile_size: 16, lighting: z === 'deepnest' ? 'cave' : 'indoor', spawn_point: [5, 30], entities: [{ entity: 'hero', at: [5, 30] }] });
    }
  },

  bosses_mv(ctx) {
    const bosses = [
      { name: 'false_knight', health: 200, damage: 10 },
      { name: 'hornet', health: 300, damage: 15 },
      { name: 'soul_master', health: 400, damage: 20 },
      { name: 'hollow_knight', health: 800, damage: 30 },
    ];
    for (const b of bosses) {
      ctx.entities.push({ name: b.name, sprite: 'boss', speed: 50, size: [20, 20], tags: ['enemy', 'boss'], health: b.health, ai: 'chase', props: { damage: b.damage } });
    }
  },

  upgrades(ctx) {
    for (const u of ['nail_upgrade_1', 'nail_upgrade_2', 'nail_upgrade_3', 'nail_upgrade_4']) {
      ctx.items.push({ name: u, type: 'material', rarity: 'uncommon' });
    }
  },

  secrets(ctx) {
    ctx.vars.grubs_found = 0;
    ctx.vars.total_grubs = 46;
    ctx.vars.mask_shards = 0;
    ctx.vars.vessel_fragments = 0;
    ctx.vars.completion_percentage = 0;
  },

  // ──────── FARMING SIM LAYERS ──────────────

  crops_deep(ctx) {
    const crops = [
      { seed: 'parsnip_seeds', crop: 'parsnip', season: 'spring', days: 4, sell: 35, buy: 20 },
      { seed: 'cauliflower_seeds', crop: 'cauliflower', season: 'spring', days: 12, sell: 175, buy: 80 },
      { seed: 'melon_seeds', crop: 'melon', season: 'summer', days: 12, sell: 250, buy: 80 },
      { seed: 'blueberry_seeds', crop: 'blueberry', season: 'summer', days: 13, sell: 50, buy: 80 },
      { seed: 'pumpkin_seeds', crop: 'pumpkin', season: 'fall', days: 13, sell: 320, buy: 100 },
      { seed: 'cranberry_seeds', crop: 'cranberry', season: 'fall', days: 7, sell: 75, buy: 240 },
      { seed: 'ancient_seeds', crop: 'ancient_fruit', season: 'all', days: 28, sell: 750, buy: 0, rarity: 'legendary' },
    ];
    for (const c of crops) {
      ctx.items.push({ name: c.seed, type: 'seed', crop: c.crop, buy_price: c.buy, description: `Season: ${c.season}, ${c.days} days` });
      ctx.items.push({ name: c.crop, type: 'crop', sell_price: c.sell, rarity: c.rarity || 'common' });
    }
    ctx.systems.push({ type: 'farming', config: { seasons: true, quality_levels: ['normal', 'silver', 'gold', 'iridium'] } });
  },

  animals_deep(ctx) {
    const animals = [
      { name: 'chicken', produces: 'egg', interval: 1, buy: 800 },
      { name: 'cow', produces: 'milk', interval: 1, buy: 1500 },
      { name: 'goat', produces: 'goat_milk', interval: 2, buy: 4000 },
      { name: 'sheep', produces: 'wool', interval: 3, buy: 8000 },
      { name: 'pig', produces: 'truffle', interval: 1, buy: 16000 },
      { name: 'dinosaur', produces: 'dinosaur_egg', interval: 7, buy: 0, rarity: 'legendary' },
    ];
    for (const a of animals) {
      ctx.entities.push({ name: a.name, sprite: a.name, speed: 15, size: [12, 12], tags: ['npc', 'animal'], ai: 'wander', props: { produces: a.produces, produce_interval: a.interval, happiness: 100 } });
      ctx.items.push({ name: a.produces, type: 'material', sell_price: a.buy / 10 || 50, rarity: a.rarity || 'common' });
    }
  },

  villagers(ctx) {
    const names = ['Abigail', 'Sebastian', 'Haley', 'Sam', 'Alex', 'Emily', 'Penny', 'Shane', 'Harvey', 'Leah', 'Maru', 'Elliott'];
    for (const n of names) {
      ctx.entities.push({ name: n.toLowerCase(), sprite: 'villager', speed: 20, size: [14, 14], tags: ['npc', 'interactable'], ai: 'wander', dialog: [{ text: `Hi! I'm ${n}. Nice to meet you!` }], props: { friendship: 0, birthday: 'spring_1', loves: [], likes: [] } });
    }
    ctx.vars.total_villagers = names.length;
    ctx.systems.push({ type: 'relationship', config: { max_hearts: 10, marriage: true, gifts: true } });
  },

  seasons(ctx) {
    ctx.vars.season = 'spring';
    ctx.vars.day = 1;
    ctx.vars.year = 1;
    ctx.systems.push({ type: 'day_night', config: { season_days: 28, seasons: ['spring', 'summer', 'fall', 'winter'] } });
  },

  festivals(ctx) {
    ctx.events.egg_festival = [{ action: 'dialog', speaker: 'System', text: 'The Egg Festival has begun! Hunt for eggs in town.' }];
    ctx.events.luau = [{ action: 'dialog', speaker: 'System', text: 'Summer Luau! Bring your best ingredients for the potluck.' }];
    ctx.events.fair = [{ action: 'dialog', speaker: 'System', text: 'The Stardew Valley Fair has arrived! Show your best crops.' }];
    ctx.events.winter_feast = [{ action: 'dialog', speaker: 'System', text: 'Feast of the Winter Star — exchange gifts with a secret friend.' }];
  },

  romance(ctx) {
    ctx.vars.spouse = 'none';
    ctx.items.push({ name: 'bouquet', type: 'quest', buy_price: 200, description: 'Give to someone with 8+ hearts to start dating' });
    ctx.items.push({ name: 'mermaid_pendant', type: 'quest', buy_price: 5000, description: 'Propose marriage' });
  },

  fishing(ctx) {
    const fish = ['sunfish', 'catfish', 'largemouth_bass', 'sturgeon', 'pufferfish', 'legend', 'crimsonfish', 'glacierfish', 'angler', 'mutant_carp'];
    for (const f of fish) {
      ctx.items.push({ name: f, type: 'material', sell_price: 30 + fish.indexOf(f) * 20, rarity: fish.indexOf(f) >= 5 ? 'legendary' : 'common' });
    }
    ctx.systems.push({ type: 'fishing', config: { difficulty_scaling: true, treasure_chests: true } });
  },

  cooking(ctx) {
    const recipes = [
      { name: 'fried_egg', ingredients: { egg: 1 }, heal: 20 },
      { name: 'pancakes', ingredients: { egg: 1, wheat_flour: 1 }, heal: 40 },
      { name: 'complete_breakfast', ingredients: { fried_egg: 1, pancakes: 1, milk: 1 }, heal: 80 },
      { name: 'lucky_lunch', ingredients: { sea_cucumber: 1, tortilla: 1 }, heal: 60, stats: { luck: 3 } },
    ];
    for (const r of recipes) {
      ctx.items.push({ name: r.name, type: 'food', heal_amount: r.heal, recipe: r.ingredients, stats: r.stats, rarity: 'uncommon' });
    }
    ctx.systems.push({ type: 'cooking', config: { kitchen_required: true } });
  },

  // ──────── ROGUELITE LAYERS ──────────────

  characters_rl(ctx) {
    for (const c of ['knight', 'huntress', 'mage', 'rogue', 'berserker']) {
      ctx.items.push({ name: `${c}_class`, type: 'quest', rarity: 'epic', description: `Playable character: ${c}` });
    }
  },

  weapons_rl(ctx) {
    for (const w of ['starter_blade', 'flame_whip', 'frost_bow', 'lightning_spear', 'chaos_staff', 'void_gauntlets']) {
      ctx.items.push({ name: w, type: 'weapon', damage: 10 + Math.floor(Math.random() * 50), rarity: 'uncommon' });
    }
  },

  floors(ctx) {
    for (let i = 1; i <= 10; i++) {
      ctx.scenes.push({ name: `floor_${i}`, size: [40 + i * 5, 30 + i * 4], tile_size: 16, lighting: 'cave', spawn_point: [5, 15], entities: [{ entity: 'hero', at: [5, 15] }] });
    }
  },

  bosses_rl(ctx) {
    for (const b of [{ name: 'slime_king', hp: 200 }, { name: 'bone_hydra', hp: 500 }, { name: 'final_boss', hp: 1000 }]) {
      ctx.entities.push({ name: b.name, sprite: 'boss', speed: 35, size: [24, 24], tags: ['enemy', 'boss'], health: b.hp, ai: 'chase' });
    }
  },

  upgrades_rl(ctx) {
    for (const u of ['extra_dash', 'health_up', 'damage_up', 'crit_chance', 'lifesteal', 'double_shot']) {
      ctx.items.push({ name: u, type: 'equipment', rarity: 'rare', description: `Passive upgrade: ${u.replace(/_/g, ' ')}` });
    }
    ctx.vars.meta_currency = 0;
    ctx.systems.push({ type: 'prestige', config: { permanent_upgrades: true } });
  },

  meta_progression(ctx) {
    ctx.vars.total_runs = 0;
    ctx.vars.best_floor = 0;
    ctx.vars.total_kills = 0;
  },

  // ──────── STRATEGY / CITY BUILDER LAYERS ──────────────

  buildings_city(ctx) {
    for (const b of ['house', 'farm_plot', 'barracks', 'market', 'blacksmith', 'church', 'wall', 'tower', 'castle', 'wonder']) {
      ctx.items.push({ name: b, type: 'building', rarity: 'common', description: `Building: ${b.replace(/_/g, ' ')}` });
    }
    ctx.systems.push({ type: 'building', config: { grid: true, population_cap: true } });
  },

  resources_city(ctx) {
    for (const r of ['food', 'wood', 'stone', 'iron', 'gold_ore', 'gems']) {
      ctx.items.push({ name: r, type: 'material', stackable: true });
    }
    ctx.vars.population = 10;
    ctx.vars.happiness = 50;
    ctx.vars.tax_rate = 10;
  },

  population(ctx) {
    ctx.vars.workers = 5;
    ctx.vars.soldiers = 0;
    ctx.vars.farmers = 3;
    ctx.vars.builders = 2;
  },

  tech_tree(ctx) {
    const techs = ['agriculture', 'bronze_working', 'masonry', 'archery', 'engineering', 'gunpowder', 'industrialization'];
    for (const t of techs) ctx.items.push({ name: `tech_${t}`, type: 'quest', rarity: 'uncommon', description: `Technology: ${t.replace(/_/g, ' ')}` });
    ctx.vars.tech_level = 0;
  },

  military(ctx) {
    for (const u of ['militia', 'archer', 'cavalry', 'siege_engine', 'catapult']) {
      ctx.entities.push({ name: u, sprite: u, speed: 30, size: [14, 14], tags: ['npc'], ai: 'patrol', props: { damage: 10, unit_type: 'military' } });
    }
  },

  // ──────── HORROR LAYERS ──────────────

  weapons_horror(ctx) {
    for (const w of ['knife', 'pistol_9mm', 'shotgun_pump', 'molotov', 'flashlight']) {
      ctx.items.push({ name: w, type: w === 'flashlight' ? 'tool' : 'weapon', damage: w === 'flashlight' ? 0 : 15 + Math.floor(Math.random() * 30), rarity: 'common' });
    }
  },

  enemies_horror(ctx) {
    for (const e of [{ name: 'shambler', hp: 40 }, { name: 'crawler', hp: 25 }, { name: 'screamer', hp: 60 }, { name: 'the_thing', hp: 200 }]) {
      ctx.entities.push({ name: e.name, sprite: 'horror_enemy', speed: 20 + Math.random() * 30, size: [14, 14], tags: ['enemy'], health: e.hp, ai: 'chase' });
    }
  },

  zones_horror(ctx) {
    for (const z of ['mansion_entrance', 'basement', 'laboratory', 'attic', 'courtyard']) {
      ctx.scenes.push({ name: z, size: [50, 40], tile_size: 16, lighting: 'night', spawn_point: [5, 20], entities: [{ entity: 'hero', at: [5, 20] }] });
    }
  },

  puzzles_horror(ctx) {
    for (const k of ['red_key', 'blue_key', 'master_key', 'fuse', 'valve_handle']) {
      ctx.items.push({ name: k, type: 'key', rarity: 'uncommon', description: `Puzzle item: ${k.replace(/_/g, ' ')}` });
    }
  },

  resources_horror(ctx) {
    ctx.items.push({ name: 'ammo_9mm', type: 'material', stackable: true, description: 'Pistol ammunition' });
    ctx.items.push({ name: 'shotgun_shells', type: 'material', stackable: true, description: 'Shotgun ammunition' });
    ctx.items.push({ name: 'first_aid_spray', type: 'potion', heal_amount: 100 });
    ctx.items.push({ name: 'herb_green', type: 'material', description: 'Combine with red herb' });
    ctx.vars.sanity = 100;
    ctx.vars.ammo_count = 12;
  },

  // ──────── TOWER DEFENSE LAYERS ──────────────

  towers(ctx) {
    for (const t of ['arrow_tower', 'cannon_tower', 'frost_tower', 'flame_tower', 'tesla_tower', 'sniper_tower']) {
      ctx.items.push({ name: t, type: 'building', buy_price: 100, rarity: 'uncommon' });
    }
  },

  enemies_td(ctx) {
    for (const e of [{ name: 'grunt', hp: 50 }, { name: 'runner', hp: 30 }, { name: 'tank', hp: 200 }, { name: 'flying', hp: 40 }, { name: 'boss_golem', hp: 500 }]) {
      ctx.entities.push({ name: `td_${e.name}`, sprite: e.name, speed: e.name === 'runner' ? 60 : 30, size: [14, 14], tags: ['enemy'], health: e.hp, ai: 'patrol' });
    }
  },

  waves(ctx) {
    ctx.vars.wave = 1;
    ctx.vars.max_waves = 50;
    ctx.vars.lives = 20;
    ctx.vars.tower_currency = 500;
  },

  upgrades_td(ctx) {
    for (const u of ['range_up', 'speed_up', 'damage_up', 'multi_shot', 'slow_effect']) {
      ctx.items.push({ name: `upgrade_${u}`, type: 'material', rarity: 'rare' });
    }
  },

  maps_td(ctx) {
    for (const m of ['grasslands', 'desert_path', 'mountain_pass', 'castle_siege', 'final_stand']) {
      ctx.scenes.push({ name: m, size: [60, 40], tile_size: 16, lighting: 'day', spawn_point: [30, 20], entities: [{ entity: 'hero', at: [30, 20] }] });
    }
  },
};


// ─── Prompt Decomposition ──────────────────────────────────────
// Detect the archetype from a prompt and expand it into full game content.

export function expandPrompt(userPrompt) {
  const prompt = userPrompt.toLowerCase().trim();

  // 1. Match against archetypes
  let matched = null;
  let matchedKey = null;
  for (const [key, arch] of Object.entries(ARCHETYPES)) {
    if (arch.match.test(prompt)) {
      matched = arch;
      matchedKey = key;
      break;
    }
  }

  // 2. If no archetype matches, check for size/complexity hints
  if (!matched) {
    // Exclude prompts that are clearly small/specific games (farm, simple scene descriptions)
    const smallGameExclude = /farm|crop|chicken|plant|harvest|beach|sunset|mountain|forest|cave|crystal|island|volcano|snow|simple|small|tiny|mini|basic/i;
    if (!smallGameExclude.test(prompt)) {
      // Check if prompt implies a large-scale game
      const bigGameWords = /\brpg\s*game\b|adventure\s*game|quest\s*game|open.world|epic\s*(?:rpg|game)|massive\s*(?:rpg|game)|class\s*system|faction\s*system|guild\s*system|\braid\s*game|mmorpg/i;
      if (bigGameWords.test(prompt)) {
        matched = ARCHETYPES.openWorldRPG;
        matchedKey = 'openWorldRPG';
      }
    }
  }

  if (!matched) return null; // Let existing generators handle it

  // 3. Build game context
  const ctx = {
    entities: [],
    items: [],
    scenes: [],
    events: {},
    systems: [],
    vars: {},
    archetype: matchedKey,
    label: matched.label,
    genre: matched.genre,
    render: matched.render,
  };

  // Always add the hero
  ctx.entities.push({
    name: 'hero', sprite: 'hero', position: [160, 120], speed: 90,
    size: [14, 16], tags: ['player'], body: 'dynamic', health: 100,
    inventory: { slots: 20, starting_items: [{ item: 'health_potion', count: 3 }] },
    props: { level: 1, xp: 0, xp_to_level: 100, attack: 10, defense: 5 },
  });

  // 4. Execute each content layer
  for (const layerName of matched.layers) {
    if (LAYERS[layerName]) {
      LAYERS[layerName](ctx);
    }
  }

  // 5. Add standard events
  if (!ctx.events.game_start) {
    ctx.events.game_start = [
      { action: 'dialog', speaker: 'System', text: `Welcome to ${userPrompt}! Your adventure begins.` },
      { action: 'sfx', sound: 'epic_intro' },
    ];
  }
  if (!ctx.events.enemy_killed) {
    ctx.events.enemy_killed = [
      { action: 'add', var: 'hero.xp', amount: 15 },
      { action: 'sfx', sound: 'enemy_death' },
      { action: 'if', condition: 'hero.xp >= hero.xp_to_level', then: [{ action: 'emit', event: 'level_up' }] },
    ];
  }
  if (!ctx.events.level_up) {
    ctx.events.level_up = [
      { action: 'sfx', sound: 'level_up' },
      { action: 'add', var: 'hero.level', amount: 1 },
      { action: 'add', var: 'hero.health', amount: 10 },
      { action: 'add', var: 'hero.attack', amount: 3 },
      { action: 'add', var: 'hero.defense', amount: 2 },
      { action: 'dialog', speaker: 'System', text: 'Level up! Your stats have increased.' },
    ];
  }

  // 6. Deduplicate items by name
  const seenItems = new Set();
  ctx.items = ctx.items.filter(i => {
    if (seenItems.has(i.name)) return false;
    seenItems.add(i.name);
    return true;
  });

  // 7. Ensure start scene exists
  if (ctx.scenes.length > 0) {
    ctx.startScene = ctx.scenes[0].name;
  } else {
    ctx.startScene = 'main';
    ctx.scenes.push({ name: 'main', size: [80, 60], tile_size: 16, spawn_point: [40, 30], entities: [{ entity: 'hero', at: [40, 30] }] });
  }

  // 8. Standard variables
  ctx.vars.level = ctx.vars.level || 1;
  ctx.vars.health = ctx.vars.health || 100;

  return ctx;
}

// ─── Convert expanded context to YAML object ───────────────────
export function contextToYAML(ctx, gameName) {
  return {
    game: {
      name: gameName,
      genre: ctx.genre,
      resolution: ctx.render === '3d' ? [1280, 720] : [320, 240],
      scale: ctx.render === '3d' ? 1 : 4,
      fps: 60,
      gravity: ctx.genre === 'platformer' ? 800 : 0,
      start_scene: ctx.startScene,
    },
    entities: ctx.entities,
    items: ctx.items,
    scenes: ctx.scenes,
    systems: ctx.systems.length > 0 ? ctx.systems : undefined,
    variables: ctx.vars,
    events: ctx.events,
  };
}

// ─── Stats for signal logging ──────────────────────────────────
export function expandedStats(ctx) {
  return {
    archetype: ctx.archetype,
    label: ctx.label,
    entities: ctx.entities.length,
    items: ctx.items.length,
    scenes: ctx.scenes.length,
    systems: ctx.systems.length,
    events: Object.keys(ctx.events).length,
    variables: Object.keys(ctx.vars).length,
  };
}
