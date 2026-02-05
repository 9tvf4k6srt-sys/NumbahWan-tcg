#!/usr/bin/env node
/**
 * NumbahWan TCG - Physical Card QR Code Generator
 * 
 * Generates unique claim codes and QR images for physical cards
 * 
 * Usage:
 *   node scripts/generate-qr-codes.js --count 100 --set origins-v1 --preview
 *   node scripts/generate-qr-codes.js --all --output ./qr-codes
 * 
 * Dependencies: npm install qrcode crypto
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Try to load QRCode, fall back to code generation only
let QRCode;
try {
  QRCode = require('qrcode');
} catch (e) {
  console.log('⚠️  QRCode library not installed. Run: npm install qrcode');
  console.log('   Generating codes only (no images)...\n');
}

// Load Origins set data
const ORIGINS_SET_PATH = path.join(__dirname, '../public/static/data/physical-origins-set.json');

// Configuration
const CONFIG = {
  baseUrl: 'https://nwg.gg/claim',  // Production claim URL
  devUrl: 'http://localhost:3000/claim.html',  // Dev claim URL
  outputDir: './qr-codes',
  codeLength: 12,  // Total code length
};

// Rarity codes for compact URLs
const RARITY_CODES = {
  mythic: 'MY',
  legendary: 'LG',
  epic: 'EP',
  rare: 'RA',
  uncommon: 'UC',
  common: 'CO'
};

/**
 * Generate CRC16 checksum for anti-counterfeiting
 */
function crc16(str) {
  let crc = 0xFFFF;
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i);
    for (let j = 0; j < 8; j++) {
      crc = (crc & 1) ? ((crc >> 1) ^ 0xA001) : (crc >> 1);
    }
  }
  return crc;
}

/**
 * Generate unique claim code
 * Format: {SET_PREFIX}{PRINT_NUM}{RARITY_CODE}{CHECKSUM}
 * Example: OG047MYA7B2
 */
function generateClaimCode(setPrefix, printNumber, rarity) {
  const rarityCode = RARITY_CODES[rarity] || 'XX';
  const base = `${setPrefix}${String(printNumber).padStart(4, '0')}${rarityCode}`;
  
  // Add random salt for uniqueness
  const salt = crypto.randomBytes(2).toString('hex').toUpperCase().slice(0, 4);
  const withSalt = base + salt;
  
  // Calculate checksum
  const checksum = crc16(withSalt).toString(16).toUpperCase().padStart(4, '0');
  
  return `${withSalt}${checksum}`;
}

/**
 * Validate a claim code
 */
function validateCode(code) {
  if (code.length !== 16) return { valid: false, error: 'Invalid length' };
  
  const content = code.slice(0, 12);
  const providedChecksum = code.slice(12, 16);
  const expectedChecksum = crc16(content).toString(16).toUpperCase().padStart(4, '0');
  
  if (providedChecksum !== expectedChecksum) {
    return { valid: false, error: 'Checksum mismatch' };
  }
  
  return { 
    valid: true,
    setPrefix: code.slice(0, 2),
    printNumber: parseInt(code.slice(2, 6), 10),
    rarityCode: code.slice(6, 8),
    salt: code.slice(8, 12),
    checksum: providedChecksum
  };
}

/**
 * Generate QR code image (if QRCode library available)
 */
async function generateQRImage(claimUrl, outputPath, options = {}) {
  if (!QRCode) return null;
  
  const qrOptions = {
    errorCorrectionLevel: 'M',  // 15% error correction
    margin: 2,
    width: 300,  // 300px = 1 inch at 300 DPI
    color: {
      dark: '#000000',
      light: '#FFFFFF'
    },
    ...options
  };
  
  await QRCode.toFile(outputPath, claimUrl, qrOptions);
  return outputPath;
}

/**
 * Generate all codes for the Origins set
 */
async function generateOriginsSetCodes(options = {}) {
  const { preview = false, outputDir = CONFIG.outputDir, useDev = false } = options;
  
  // Load set data
  const setData = JSON.parse(fs.readFileSync(ORIGINS_SET_PATH, 'utf8'));
  const { cards, rarityDistribution, setId } = setData;
  
  console.log(`\n📦 Generating QR codes for: ${setData.setName}`);
  console.log(`   Set ID: ${setId}`);
  console.log(`   Total unique cards: ${cards.length}`);
  console.log(`   Preview mode: ${preview ? 'YES (10 codes per card)' : 'NO (full run)'}\n`);
  
  const baseUrl = useDev ? CONFIG.devUrl : CONFIG.baseUrl;
  const allCodes = [];
  const codesByRarity = {};
  
  // Create output directories
  const codesDir = path.join(outputDir, 'codes');
  const imagesDir = path.join(outputDir, 'images');
  
  if (!preview) {
    fs.mkdirSync(codesDir, { recursive: true });
    fs.mkdirSync(imagesDir, { recursive: true });
    
    // Create subdirs by rarity
    Object.keys(RARITY_CODES).forEach(rarity => {
      fs.mkdirSync(path.join(imagesDir, rarity), { recursive: true });
    });
  }
  
  // Generate codes for each card
  for (const card of cards) {
    const { cardId, rarity, setNumber, name, nwgValue, dailyYield } = card;
    const printCount = preview ? 10 : rarityDistribution[rarity].printPerCard;
    
    console.log(`🎴 ${setNumber} - ${name} (${rarity}): ${printCount} codes`);
    
    if (!codesByRarity[rarity]) {
      codesByRarity[rarity] = [];
    }
    
    for (let printNum = 1; printNum <= printCount; printNum++) {
      const code = generateClaimCode('OG', printNum, rarity);
      const claimUrl = `${baseUrl}?code=${code}`;
      
      const codeData = {
        code,
        claimUrl,
        setId,
        setNumber,
        cardId,
        cardName: name,
        rarity,
        printNumber: printNum,
        totalPrint: printCount,
        nwgValue,
        dailyYield,
        isFirstEdition: true,
        createdAt: new Date().toISOString()
      };
      
      allCodes.push(codeData);
      codesByRarity[rarity].push(codeData);
      
      // Generate QR image (skip in preview mode to save time)
      if (!preview && QRCode) {
        const imagePath = path.join(imagesDir, rarity, `${setNumber}-${printNum}.png`);
        try {
          await generateQRImage(claimUrl, imagePath);
        } catch (e) {
          console.error(`   ⚠️ Failed to generate QR for ${code}: ${e.message}`);
        }
      }
    }
  }
  
  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 GENERATION SUMMARY');
  console.log('='.repeat(50));
  
  let totalCodes = 0;
  Object.entries(codesByRarity).forEach(([rarity, codes]) => {
    console.log(`   ${rarity.toUpperCase()}: ${codes.length.toLocaleString()} codes`);
    totalCodes += codes.length;
  });
  console.log('   ' + '-'.repeat(30));
  console.log(`   TOTAL: ${totalCodes.toLocaleString()} codes\n`);
  
  // Export data
  if (!preview) {
    // JSON export (for database seeding)
    const jsonPath = path.join(codesDir, 'all-codes.json');
    fs.writeFileSync(jsonPath, JSON.stringify(allCodes, null, 2));
    console.log(`💾 Saved: ${jsonPath}`);
    
    // CSV export (for spreadsheet/printer)
    const csvPath = path.join(codesDir, 'all-codes.csv');
    const csvHeader = 'code,claim_url,set_id,set_number,card_id,card_name,rarity,print_number,total_print,nwg_value,is_first_edition\n';
    const csvRows = allCodes.map(c => 
      `${c.code},${c.claimUrl},${c.setId},${c.setNumber},${c.cardId},"${c.cardName}",${c.rarity},${c.printNumber},${c.totalPrint},${c.nwgValue},${c.isFirstEdition}`
    ).join('\n');
    fs.writeFileSync(csvPath, csvHeader + csvRows);
    console.log(`💾 Saved: ${csvPath}`);
    
    // SQL export (for D1 database)
    const sqlPath = path.join(codesDir, 'seed-codes.sql');
    const sqlStatements = allCodes.map(c => 
      `INSERT INTO physical_claim_codes (code, set_id, set_number, card_id, rarity, print_number, total_print, is_first_edition, nwg_granted, bonus_multiplier) VALUES ('${c.code}', '${c.setId}', '${c.setNumber}', ${c.cardId}, '${c.rarity}', ${c.printNumber}, ${c.totalPrint}, ${c.isFirstEdition ? 1 : 0}, ${c.nwgValue}, 1.5);`
    ).join('\n');
    fs.writeFileSync(sqlPath, `-- NumbahWan Origins Set - Claim Code Seed Data\n-- Generated: ${new Date().toISOString()}\n-- Total Codes: ${totalCodes}\n\n${sqlStatements}`);
    console.log(`💾 Saved: ${sqlPath}`);
    
    // Export by rarity
    Object.entries(codesByRarity).forEach(([rarity, codes]) => {
      const rarityPath = path.join(codesDir, `${rarity}-codes.json`);
      fs.writeFileSync(rarityPath, JSON.stringify(codes, null, 2));
    });
    
    console.log(`\n📁 QR images saved to: ${imagesDir}`);
  } else {
    // Preview mode - just show sample codes
    console.log('📋 Sample codes (first 3 of each rarity):');
    Object.entries(codesByRarity).forEach(([rarity, codes]) => {
      console.log(`\n   ${rarity.toUpperCase()}:`);
      codes.slice(0, 3).forEach(c => {
        console.log(`     ${c.setNumber}-${c.printNumber}: ${c.code}`);
        console.log(`       URL: ${c.claimUrl}`);
      });
    });
  }
  
  return {
    totalCodes,
    codesByRarity,
    outputDir: preview ? null : outputDir
  };
}

/**
 * Validate a batch of codes
 */
function validateBatch(codes) {
  const results = {
    valid: [],
    invalid: []
  };
  
  codes.forEach(code => {
    const result = validateCode(code);
    if (result.valid) {
      results.valid.push({ code, ...result });
    } else {
      results.invalid.push({ code, error: result.error });
    }
  });
  
  return results;
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
NumbahWan TCG - Physical Card QR Code Generator

Usage:
  node generate-qr-codes.js [options]

Options:
  --preview       Generate 10 codes per card (for testing)
  --all           Generate all codes for full print run
  --dev           Use localhost URLs instead of production
  --output DIR    Output directory (default: ./qr-codes)
  --validate CODE Validate a single code
  --help          Show this help message

Examples:
  # Preview mode (quick test)
  node generate-qr-codes.js --preview
  
  # Full production run
  node generate-qr-codes.js --all --output ./print-ready-codes
  
  # Validate a code
  node generate-qr-codes.js --validate OG0001MYA7B23F4D
`);
    return;
  }
  
  if (args.includes('--validate')) {
    const codeIndex = args.indexOf('--validate') + 1;
    const code = args[codeIndex];
    if (code) {
      console.log(`\nValidating code: ${code}`);
      const result = validateCode(code);
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.error('Please provide a code to validate');
    }
    return;
  }
  
  const options = {
    preview: args.includes('--preview'),
    useDev: args.includes('--dev'),
    outputDir: args.includes('--output') 
      ? args[args.indexOf('--output') + 1] 
      : CONFIG.outputDir
  };
  
  await generateOriginsSetCodes(options);
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { 
  generateClaimCode, 
  validateCode, 
  generateQRImage, 
  generateOriginsSetCodes,
  RARITY_CODES 
};
