/**
 * NumbahWan TCG - Unified Season Generator
 * Generates all card JSON files from templates (S3-S10)
 * 
 * Usage: node scripts/generate-all-seasons.js
 */

const fs = require('fs');
const path = require('path');

// Import all templates
const { SEASON_3, SEASON_4, RARITY_STATS, generateStats } = require('./season-templates.cjs');
const { SEASON_5, SEASON_6 } = require('./season-templates-5-10.cjs');
const { SEASON_7, SEASON_8, SEASON_9, SEASON_10 } = require('./season-templates-7-10.cjs');

// All seasons collection
const ALL_SEASONS = {
  3: SEASON_3,
  4: SEASON_4,
  5: SEASON_5,
  6: SEASON_6,
  7: SEASON_7,
  8: SEASON_8,
  9: SEASON_9,
  10: SEASON_10
};

// Stats generator with seeding for consistency
function randomBetween(min, max, seed) {
  const x = Math.sin(seed) * 10000;
  return Math.floor((x - Math.floor(x)) * (max - min + 1)) + min;
}

function generateCardStats(rarity, cardId) {
  const r = RARITY_STATS[rarity];
  if (!r) {
    console.warn(`Unknown rarity: ${rarity}, using common stats`);
    return { atk: 2, hp: 3, cost: 1, spd: 5, crit: 5, dodge: 5 };
  }
  return {
    atk: randomBetween(r.atk[0], r.atk[1], cardId),
    hp: randomBetween(r.hp[0], r.hp[1], cardId + 1),
    cost: randomBetween(r.cost[0], r.cost[1], cardId + 2),
    spd: randomBetween(r.spd[0], r.spd[1], cardId + 3),
    crit: randomBetween(r.crit[0], r.crit[1], cardId + 4),
    dodge: randomBetween(r.dodge[0], r.dodge[1], cardId + 5)
  };
}

// Generate JSON for a single season
function generateSeasonJSON(seasonNum) {
  const season = ALL_SEASONS[seasonNum];
  if (!season) {
    console.log(`❌ Season ${seasonNum} not defined`);
    return null;
  }
  
  const baseId = seasonNum * 1000;
  const timestamp = new Date().toISOString().split('T')[0] + "T00:00:00Z";
  
  // Prepare mechanics object from season
  const mechanicsObj = {};
  if (season.mechanics) {
    Object.entries(season.mechanics).forEach(([key, value]) => {
      mechanicsObj[key] = typeof value === 'string' ? { desc: value } : value;
    });
  }
  
  const json = {
    version: "1.0.0",
    season: seasonNum,
    seasonName: season.name,
    seasonSubtitle: season.subtitle,
    lastUpdated: timestamp,
    totalCards: season.cards.length,
    lore: season.lore,
    newMechanics: mechanicsObj,
    categories: season.categories,
    cards: season.cards.map((card, idx) => {
      const cardId = baseId + idx + 1;
      return {
        id: cardId,
        name: card.name,
        rarity: card.rarity,
        category: card.category,
        set: season.theme,
        img: `s${seasonNum}/placeholder-${card.rarity}.webp`,
        description: card.desc,
        hasArt: false, // Coming soon - no art yet
        gameStats: generateCardStats(card.rarity, cardId),
        abilities: card.abilities || [],
        special: card.special || null
      };
    })
  };
  
  // Calculate rarity breakdown
  const rarityCount = {
    mythic: 0,
    legendary: 0,
    epic: 0,
    rare: 0,
    uncommon: 0,
    common: 0
  };
  json.cards.forEach(c => {
    if (rarityCount[c.rarity] !== undefined) {
      rarityCount[c.rarity]++;
    }
  });
  json.rarityBreakdown = rarityCount;
  
  return json;
}

// Main function
function generateAllSeasons() {
  const outputDir = path.join(__dirname, '../public/static/data');
  
  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  console.log('🎴 NumbahWan TCG Season Generator\n');
  console.log('=' .repeat(50));
  
  let totalCards = 0;
  
  for (const seasonNum of Object.keys(ALL_SEASONS).sort((a, b) => a - b)) {
    const json = generateSeasonJSON(parseInt(seasonNum));
    if (json) {
      const filename = `cards-s${seasonNum}.json`;
      const filepath = path.join(outputDir, filename);
      fs.writeFileSync(filepath, JSON.stringify(json, null, 2));
      
      totalCards += json.totalCards;
      
      console.log(`\n✅ Season ${seasonNum}: ${json.seasonName}`);
      console.log(`   📁 ${filename} (${json.totalCards} cards)`);
      console.log(`   🎯 Theme: ${json.cards[0]?.set || 'N/A'}`);
      console.log(`   📊 Breakdown: ${json.rarityBreakdown.mythic}M / ${json.rarityBreakdown.legendary}L / ${json.rarityBreakdown.epic}E / ${json.rarityBreakdown.rare}R / ${json.rarityBreakdown.uncommon}U / ${json.rarityBreakdown.common}C`);
    }
  }
  
  console.log('\n' + '=' .repeat(50));
  console.log(`🎉 Generated ${Object.keys(ALL_SEASONS).length} seasons with ${totalCards} total cards!`);
  console.log('\n📌 Note: All cards use placeholder images. Update seasons.json to enable seasons.');
}

// Run
generateAllSeasons();
