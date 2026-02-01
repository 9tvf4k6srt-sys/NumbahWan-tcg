#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * NumbahWan Smart Icon Cropper
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Automatically crops images to create premium game icons.
 * Uses predefined crop profiles for common icon types.
 * 
 * Usage:
 *   node scripts/smart-icon-crop.cjs <input> <output-name> [profile]
 * 
 * Profiles:
 *   center   - Standard center crop (default)
 *   currency - Optimized for currency icons (tighter crop)
 *   card     - Card art extraction (wider crop)
 *   character - Character/avatar focus
 * 
 * Examples:
 *   node scripts/smart-icon-crop.cjs source.png my-icon
 *   node scripts/smart-icon-crop.cjs card-art.webp gold-coin currency
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Configuration
const ICON_DIR = 'public/static/icons';
const SIZES = [64, 128, 256];

// Crop profiles - defines how to extract the main subject
const PROFILES = {
    center: {
        description: 'Standard center crop',
        cropPercent: 80, // Use 80% of image, centered
        gravity: 'center',
        offsetY: 0
    },
    currency: {
        description: 'Currency icon - tighter focus on subject',
        cropPercent: 60,  // Tighter crop
        gravity: 'center',
        offsetY: 5  // Slight offset down (currencies often in lower center)
    },
    card: {
        description: 'Card art extraction - wider crop',
        cropPercent: 90,
        gravity: 'center',
        offsetY: 0
    },
    character: {
        description: 'Character/avatar - upper focus',
        cropPercent: 70,
        gravity: 'north',
        offsetY: -10  // Offset up for faces
    },
    item: {
        description: 'Game item - centered tight',
        cropPercent: 55,
        gravity: 'center',
        offsetY: 0
    }
};

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    cyan: '\x1b[36m',
    bold: '\x1b[1m'
};

function log(color, message) {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function getImageDimensions(imagePath) {
    const output = execSync(`identify -format "%wx%h" "${imagePath}"`).toString().trim();
    const [width, height] = output.split('x').map(Number);
    return { width, height };
}

function cropAndResize(input, outputName, profile = 'center') {
    const profileConfig = PROFILES[profile];
    if (!profileConfig) {
        log('red', `Unknown profile: ${profile}`);
        log('yellow', `Available profiles: ${Object.keys(PROFILES).join(', ')}`);
        process.exit(1);
    }

    log('cyan', '═══════════════════════════════════════════════════════════════');
    log('cyan', '  NumbahWan Smart Icon Cropper');
    log('cyan', '═══════════════════════════════════════════════════════════════');
    
    // Get source dimensions
    const { width, height } = getImageDimensions(input);
    log('green', `Input: ${input} (${width}x${height})`);
    log('green', `Profile: ${profile} - ${profileConfig.description}`);
    log('green', `Output: ${outputName}`);
    
    // Calculate crop dimensions
    const cropPercent = profileConfig.cropPercent / 100;
    const cropSize = Math.min(width, height) * cropPercent;
    const offsetY = Math.round(profileConfig.offsetY * (height / 100));
    
    // Build ImageMagick command
    const tempFile = `/tmp/${outputName}-temp.png`;
    
    let cropCmd = `convert "${input}" `;
    cropCmd += `-gravity ${profileConfig.gravity} `;
    cropCmd += `-crop ${Math.round(cropSize)}x${Math.round(cropSize)}+0+${offsetY} +repage `;
    cropCmd += `-resize 512x512 `;  // Normalize to 512 first for quality
    cropCmd += `"${tempFile}"`;
    
    log('yellow', `\nCropping: ${Math.round(cropSize)}x${Math.round(cropSize)} (${profileConfig.cropPercent}%)`);
    execSync(cropCmd);
    
    // Generate icon sizes
    log('cyan', '\nGenerating icon sizes...');
    
    const outputs = [];
    for (const size of SIZES) {
        const webpOutput = path.join(ICON_DIR, `${outputName}-${size}.webp`);
        execSync(`convert "${tempFile}" -resize ${size}x${size} -quality 90 "${webpOutput}"`);
        const fileSize = fs.statSync(webpOutput).size;
        const fileSizeKB = (fileSize / 1024).toFixed(1);
        log('green', `  ✓ ${outputName}-${size}.webp (${fileSizeKB} KB)`);
        outputs.push(webpOutput);
    }
    
    // Also create PNG for compatibility
    const pngOutput = path.join(ICON_DIR, `${outputName}-256.png`);
    execSync(`convert "${tempFile}" -resize 256x256 "${pngOutput}"`);
    const pngSize = (fs.statSync(pngOutput).size / 1024).toFixed(1);
    log('green', `  ✓ ${outputName}-256.png (${pngSize} KB)`);
    
    // Cleanup
    fs.unlinkSync(tempFile);
    
    log('green', '\n═══════════════════════════════════════════════════════════════');
    log('green', `  Done! Icons saved to ${ICON_DIR}/`);
    log('green', '═══════════════════════════════════════════════════════════════');
    
    // Usage hint
    log('cyan', '\nTo use in HTML:');
    console.log(`  <img src="/static/icons/${outputName}-64.webp" width="64" height="64">`);
    
    return outputs;
}

// CLI
const args = process.argv.slice(2);

if (args.length < 2) {
    log('yellow', 'NumbahWan Smart Icon Cropper');
    log('reset', '\nUsage: node scripts/smart-icon-crop.cjs <input> <output-name> [profile]');
    log('reset', '\nProfiles:');
    for (const [name, config] of Object.entries(PROFILES)) {
        console.log(`  ${name.padEnd(12)} - ${config.description} (${config.cropPercent}% crop)`);
    }
    log('reset', '\nExamples:');
    console.log('  node scripts/smart-icon-crop.cjs source.png my-icon');
    console.log('  node scripts/smart-icon-crop.cjs card-art.webp gold-coin currency');
    process.exit(0);
}

const [input, outputName, profile = 'center'] = args;

if (!fs.existsSync(input)) {
    log('red', `Error: Input file not found: ${input}`);
    process.exit(1);
}

// Ensure output directory exists
if (!fs.existsSync(ICON_DIR)) {
    fs.mkdirSync(ICON_DIR, { recursive: true });
}

cropAndResize(input, outputName, profile);
