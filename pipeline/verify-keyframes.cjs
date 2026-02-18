/**
 * NWG Trailer — Auto-Verification Pipeline
 * 
 * Analyzes each keyframe image against character bible + scene requirements.
 * Uses vision AI to detect: art style, character accuracy, scene elements.
 * Outputs a verification report with PASS/FAIL per check + fix suggestions.
 * 
 * Usage: node pipeline/verify-keyframes.cjs
 * Output: public/trailer/verification-report.json
 */

// Character DNA rules — single source of truth for visual checks
const CHARACTER_DNA = {
  reggina: {
    name: "RegginA",
    skin: { tone: "DARK BROWN", hex: "#6B4226", description: "Dark brown melanated skin, NOT fair, NOT pale, NOT tanned — DARK", minDarkness: 7 },
    hair: { color: "golden blonde", style: "long flowing" },
    headband: { 
      type: "Explorer Ice/Light headband",
      description: "Thin BLACK headband with TWO sharp angular wing/leaf-shaped prongs rising upward at angles — like butterfly wings or feather fins. Dark navy-black color. The prongs are the KEY identifying feature — they must be prominent, pointed, and angular.",
      color: "dark navy-black / matte black",
      criticalNote: "This is the #1 most-flagged item. The prongs must be LARGE, SHARP, and VISIBLE. Not small bumps. Not a bow. Not horns. Two angular wing shapes."
    },
    outfit: { description: "White fur wrap coat, dark brown boots" },
    weapon: "Golden war hammer",
    scenes: ["03", "05", "06", "09", "10", "11"]
  },
  reggino: {
    name: "RegginO",
    skin: { tone: "DARK BROWN", hex: "#5C3A1E", description: "Dark brown melanated skin with cool undertones, NOT fair — DARK", minDarkness: 8 },
    hair: { color: "vibrant pink-magenta with lavender highlights", style: "very long flowing past waist" },
    headwear: { type: "Floral crown", description: "Delicate flower crown with pink and white blossoms, green vines" },
    outfit: { description: "Dark navy tunic with gold and teal accents" },
    weapon: "Glowing teal magic orb",
    scenes: ["08", "09", "10", "11"]
  },
  natehouoho: {
    name: "Natehouoho",
    skin: { tone: "fair", description: "Fair/light skin" },
    hair: { color: "hidden under beanie" },
    headwear: { type: "Grey knitted beanie hat" },
    wings: { description: "MASSIVE teal-cyan and purple butterfly wings with swirl patterns" },
    outfit: { description: "Dark tactical jacket with red accent stripes" },
    weapon: "Dual swords on back / TCG card deck",
    scenes: ["04", "09", "11", "12"]
  },
  cia: {
    name: "CIA",
    species: "French Bulldog",
    appearance: "Black and tan coat, bat ears, stocky build",
    accessory: "Tactical vest with 'CIA' text visible",
    scenes: ["03", "05", "09", "11"]
  },
  panthera: {
    name: "Panthera",
    skin: { tone: "pale porcelain", description: "Very pale/porcelain skin" },
    hair: { color: "vivid crimson red" },
    wings: { description: "DARK NAVY-BLUE/PURPLE large feathered wings — NOT gold, NOT white. Dark colored. Golden mechanical shoulder guards ONLY at wing base." },
    outfit: { description: "Red and gold ceremonial armor" },
    weapon: "Glowing holy orb",
    scenes: ["07", "10", "11"]
  },
  santaboy: {
    name: "Santaboy",
    headwear: { type: "Red Santa hat" },
    face: { description: "Rectangular glasses, red rose in mouth" },
    wings: { description: "GOLDEN angel wings (contrast with Panthera's DARK wings)" },
    outfit: { description: "Full red Santa outfit" },
    weapon: "Candy cane weapon with yellow ribbon",
    scenes: ["07", "11"]
  },
  sweetiez: {
    name: "Sweetiez",
    hair: { color: "golden blonde", style: "extremely long twin-tail pigtails past waist" },
    build: "Petite",
    outfit: { description: "Dark purple combat dress" },
    weapon: "Mystical ornate staff",
    scenes: ["08", "11"]
  },
  harpsealZakum: {
    name: "Harpseal Zakum RegginA",
    species: "Chubby baby harp seal",
    headwear: { type: "Oversized golden Zakum helmet with sun-ray crest and circular emblem" },
    accessories: ["White shutter shades sunglasses", "Small white beard", "Golden flipper armor pauldrons"],
    weapon: "Comically huge golden war hammer",
    aura: "Cyan-turquoise boss glow",
    scenes: ["12"]
  }
};

// Scene requirements
const SCENE_REQUIREMENTS = {
  "scene-01": {
    name: "BIRTH — Castle Reveal",
    requiredChars: [],
    artStyle: "UE5 photorealistic",
    environment: ["castle", "golden hour", "cherry blossoms", "beacon tower"],
    checks: ["No characters needed — landscape only", "Castle must have multi-tiered stone fortress", "Beacon tower with flame"]
  },
  "scene-02": {
    name: "THE LIVING WORLD — 8 Biomes",
    requiredChars: [],
    artStyle: "UE5 photorealistic",
    environment: ["castle", "mushroom forest", "biomes", "aerial view"],
    checks: ["Same castle as scene-01", "Multiple biomes visible", "Bioluminescent mushrooms"]
  },
  "scene-03": {
    name: "COMPANIONS — RegginA Meets CIA",
    requiredChars: ["reggina", "cia"],
    artStyle: "UE5 photorealistic",
    environment: ["enchanted forest", "clearing"],
    checks: ["RegginA kneeling or interacting with CIA", "CIA French Bulldog with vest", "TRUST meter UI element", "Forest setting"]
  },
  "scene-04": {
    name: "CARDS & COMBAT — Card Deck Check",
    requiredChars: ["natehouoho"],
    artStyle: "UE5 photorealistic",
    environment: ["volcanic colosseum arena", "lava", "torches"],
    checks: ["Natehouoho holding/fanning TCG cards", "Butterfly wings visible", "Arena setting"]
  },
  "scene-05": {
    name: "CASTLE LIFE — Tavern Strategy",
    requiredChars: ["reggina", "cia"],
    artStyle: "UE5 photorealistic",
    environment: ["tavern", "fireplace", "holographic war table"],
    checks: ["RegginA at war table", "CIA at her feet", "Cozy tavern atmosphere"]
  },
  "scene-06": {
    name: "DLC 1: THE ABYSS — Frost Wyrm",
    requiredChars: ["reggina"],
    artStyle: "UE5 photorealistic",
    environment: ["ice crystal cavern", "bioluminescent crystals"],
    checks: ["RegginA fighting with golden hammer", "Frost Wyrm CHUBBY/fat/cute", "Ice cavern setting"]
  },
  "scene-07": {
    name: "DLC 2&3: Sky Islands",
    requiredChars: ["panthera", "santaboy"],
    artStyle: "UE5 photorealistic",
    environment: ["sky islands", "floating platforms", "sunset clouds"],
    checks: ["Panthera with DARK wings (not gold)", "Santaboy with GOLDEN wings", "Wing color contrast between them", "Griffins or airship in background"]
  },
  "scene-08": {
    name: "DLC 4: THE FORGOTTEN FLOOR",
    requiredChars: ["reggino", "sweetiez"],
    artStyle: "UE5 photorealistic",
    environment: ["underground cavern", "bioluminescent mushrooms", "clockwork ruins"],
    checks: ["RegginO DARK skin with pink hair", "Sweetiez twin-tails", "Giant mushrooms", "Clockwork/gear elements"]
  },
  "scene-09": {
    name: "DLC 5: R.M.S. REGINA",
    requiredChars: ["reggina", "natehouoho", "reggino", "cia"],
    artStyle: "UE5 photorealistic",
    environment: ["cruise ship deck", "pool", "water slides", "golden hour"],
    checks: ["RegginA DARK skin", "RegginO DARK skin", "Natehouoho butterfly wings in OPEN AIR", "CIA on deck", "Modern mega-cruise ship"]
  },
  "scene-10": {
    name: "SAMSARA — Wheel of Reincarnation",
    requiredChars: ["reggina", "panthera", "reggino"],
    artStyle: "UE5 photorealistic",
    environment: ["dharma wheel", "hellfire LEFT", "cherry blossoms RIGHT", "duality split"],
    checks: ["Dharma Wheel with yin-yang center", "Duality composition (hell vs paradise)", "Panthera DARK wings on hell side", "RegginA at center with headband"]
  },
  "scene-11": {
    name: "GUILD ASSEMBLES — All 7",
    requiredChars: ["reggina", "natehouoho", "reggino", "sweetiez", "panthera", "santaboy", "cia"],
    artStyle: "UE5 photorealistic",
    environment: ["guild hall", "war table", "tapestries"],
    checks: ["All 7 characters visible", "Grand hall setting", "Holographic war table"]
  },
  "scene-12": {
    name: "RAID BOSS — Harpseal Zakum",
    requiredChars: ["harpsealZakum", "reggina", "natehouoho"],
    artStyle: "UE5 photorealistic",
    environment: ["underground boss arena", "magical runes"],
    checks: ["Chubby seal body (not just a helmet)", "Zakum golden helmet", "T-bone steaks on floor", "Hammer Flop energy VFX", "Boss arena scale"]
  }
};

// Build verification prompts for vision AI
function buildVerificationPrompt(sceneId) {
  const scene = SCENE_REQUIREMENTS[sceneId];
  if (!scene) return null;

  let prompt = `STRICT VISUAL VERIFICATION of game trailer keyframe "${scene.name}".\n\n`;
  prompt += `Rate each check as PASS (clearly present and correct) or FAIL (missing, wrong, or unclear).\n\n`;

  // Art style check
  prompt += `## ART STYLE CHECK\n`;
  prompt += `Required: ${scene.artStyle} — photorealistic 3D rendering like Unreal Engine 5.\n`;
  prompt += `FAIL if: pixel art, anime/cartoon style, 2D illustration, low-poly, or painterly style.\n\n`;

  // Character checks
  if (scene.requiredChars.length > 0) {
    prompt += `## CHARACTER CHECKS\n`;
    for (const charId of scene.requiredChars) {
      const char = CHARACTER_DNA[charId];
      if (!char) continue;
      prompt += `\n### ${char.name}\n`;
      prompt += `Must be present in the image.\n`;
      
      if (char.skin) {
        prompt += `- SKIN: ${char.skin.description}\n`;
      }
      if (char.hair) {
        prompt += `- HAIR: ${char.hair.color}${char.hair.style ? ', ' + char.hair.style : ''}\n`;
      }
      if (char.headband) {
        prompt += `- HEADBAND (CRITICAL): ${char.headband.description}\n`;
        prompt += `  ${char.headband.criticalNote || ''}\n`;
      }
      if (char.headwear) {
        prompt += `- HEADWEAR: ${char.headwear.description || char.headwear.type}\n`;
      }
      if (char.wings) {
        prompt += `- WINGS: ${char.wings.description}\n`;
      }
      if (char.outfit) {
        prompt += `- OUTFIT: ${char.outfit.description || char.outfit}\n`;
      }
      if (char.species) {
        prompt += `- SPECIES: ${char.species}\n`;
        prompt += `- APPEARANCE: ${char.appearance || ''}\n`;
      }
      if (char.accessory) {
        prompt += `- ACCESSORY: ${char.accessory}\n`;
      }
      if (char.weapon) {
        prompt += `- WEAPON: ${char.weapon}\n`;
      }
    }
  }

  // Environment checks
  prompt += `\n## ENVIRONMENT CHECKS\n`;
  prompt += `Required elements: ${scene.environment.join(', ')}\n`;

  // Scene-specific checks
  prompt += `\n## SCENE-SPECIFIC CHECKS\n`;
  for (const check of scene.checks) {
    prompt += `- ${check}\n`;
  }

  prompt += `\n## OUTPUT FORMAT\n`;
  prompt += `Return a JSON object with this exact structure:\n`;
  prompt += `{\n`;
  prompt += `  "artStyle": { "status": "PASS|FAIL", "note": "brief explanation" },\n`;
  prompt += `  "characters": {\n`;
  prompt += `    "<charName>": {\n`;
  prompt += `      "present": true/false,\n`;
  prompt += `      "skin": { "status": "PASS|FAIL|N/A", "note": "..." },\n`;
  prompt += `      "headband": { "status": "PASS|FAIL|N/A", "note": "..." },\n`;
  prompt += `      "hair": { "status": "PASS|FAIL|N/A", "note": "..." },\n`;
  prompt += `      "wings": { "status": "PASS|FAIL|N/A", "note": "..." },\n`;
  prompt += `      "outfit": { "status": "PASS|FAIL|N/A", "note": "..." },\n`;
  prompt += `      "overall": "PASS|FAIL"\n`;
  prompt += `    }\n`;
  prompt += `  },\n`;
  prompt += `  "environment": { "status": "PASS|FAIL", "note": "..." },\n`;
  prompt += `  "sceneChecks": [{ "check": "...", "status": "PASS|FAIL", "note": "..." }],\n`;
  prompt += `  "overallVerdict": "PASS|FAIL",\n`;
  prompt += `  "failReasons": ["list of things that failed"],\n`;
  prompt += `  "fixSuggestions": ["specific prompt modifications to fix failures"]\n`;
  prompt += `}\n`;

  return prompt;
}

// Export for use
module.exports = { CHARACTER_DNA, SCENE_REQUIREMENTS, buildVerificationPrompt };

// If run directly, output all prompts
if (require.main === module) {
  const fs = require('fs');
  const prompts = {};
  for (const sid of Object.keys(SCENE_REQUIREMENTS)) {
    prompts[sid] = buildVerificationPrompt(sid);
  }
  // Write prompts for reference
  fs.writeFileSync('pipeline/verification/verify-prompts.json', JSON.stringify(prompts, null, 2));
  console.log(`Generated verification prompts for ${Object.keys(prompts).length} scenes`);
  console.log('Output: pipeline/verification/verify-prompts.json');
  
  // Also output the character DNA as standalone reference
  fs.writeFileSync('pipeline/verification/character-dna.json', JSON.stringify(CHARACTER_DNA, null, 2));
  console.log('Output: pipeline/verification/character-dna.json');
}
