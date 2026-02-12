#!/usr/bin/env node
/**
 * NW Design Fix — Automated font-size floor + @media dedup
 * Fixes:
 *   1. font-size values below 0.75rem → bumped to 0.75rem
 *   2. Multiple @media (max-width: 768px) blocks → merged into one
 */
const fs = require('fs');
const path = require('path');

const PUBLIC_DIR = path.resolve(__dirname, '..', 'public');
const DRY_RUN = process.argv.includes('--dry-run');

// ═══════════════════════════════════════════════
// 1. Font-size floor fix
// ═══════════════════════════════════════════════

function fixFontSizes(content, filename) {
  let fixes = 0;
  
  // Match font-size declarations with values below 0.75rem
  // Patterns: font-size: 0.7rem, font-size:0.65rem, font-size: .6rem, etc.
  const pattern = /font-size\s*:\s*(\.?\d*\.?\d+)rem/g;
  
  const newContent = content.replace(pattern, (match, value) => {
    const num = parseFloat(value);
    if (num < 0.75) {
      fixes++;
      return match.replace(`${value}rem`, '0.75rem');
    }
    return match;
  });
  
  if (fixes > 0) {
    console.log(`  ${filename}: ${fixes} font-size(s) bumped to 0.75rem floor`);
  }
  
  return { content: newContent, fixes };
}

// ═══════════════════════════════════════════════
// 2. Merge duplicate @media blocks
// ═══════════════════════════════════════════════

function mergeMediaBlocks(content, filename) {
  // Find all @media (max-width: 768px) blocks within <style> tags
  const stylePattern = /<style[^>]*>([\s\S]*?)<\/style>/gi;
  let totalMerges = 0;
  
  const newContent = content.replace(stylePattern, (styleMatch, styleContent) => {
    // Find all @media (max-width: 768px) blocks in this style
    const mediaPattern = /@media\s*\(\s*max-width\s*:\s*768px\s*\)\s*\{/g;
    const mediaBlocks = [];
    let m;
    
    while ((m = mediaPattern.exec(styleContent)) !== null) {
      const startIdx = m.index;
      // Find the matching closing brace
      let depth = 1;
      let i = startIdx + m[0].length;
      while (i < styleContent.length && depth > 0) {
        if (styleContent[i] === '{') depth++;
        else if (styleContent[i] === '}') depth--;
        i++;
      }
      
      const fullBlock = styleContent.substring(startIdx, i);
      // Extract just the inner content (between the outer braces)
      const innerContent = styleContent.substring(startIdx + m[0].length, i - 1);
      
      mediaBlocks.push({
        start: startIdx,
        end: i,
        full: fullBlock,
        inner: innerContent.trim()
      });
    }
    
    if (mediaBlocks.length <= 1) return styleMatch;
    
    // Merge all blocks: keep first, append content from others, remove others
    const merged = mediaBlocks.map(b => b.inner).join('\n\n');
    const mergedBlock = `@media (max-width: 768px) {\n${merged}\n}`;
    
    // Remove all @media blocks and insert merged one at first position
    let newStyleContent = styleContent;
    // Remove in reverse order to preserve indices
    for (let i = mediaBlocks.length - 1; i >= 0; i--) {
      const block = mediaBlocks[i];
      const before = newStyleContent.substring(0, block.start);
      const after = newStyleContent.substring(block.end);
      if (i === 0) {
        // Replace first block with merged version
        newStyleContent = before + mergedBlock + after;
      } else {
        // Remove subsequent blocks (and trailing whitespace)
        newStyleContent = before + after.replace(/^\s*\n/, '\n');
      }
    }
    
    totalMerges += mediaBlocks.length - 1;
    return styleMatch.replace(styleContent, newStyleContent);
  });
  
  if (totalMerges > 0) {
    console.log(`  ${filename}: ${totalMerges + 1} @media blocks merged into 1`);
  }
  
  return { content: newContent, merges: totalMerges };
}

// ═══════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════

const files = fs.readdirSync(PUBLIC_DIR).filter(f => f.endsWith('.html'));
let totalFontFixes = 0;
let totalMerges = 0;
let pagesModified = 0;

for (const file of files) {
  const filePath = path.join(PUBLIC_DIR, file);
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  // Fix font sizes
  const fontResult = fixFontSizes(content, file);
  if (fontResult.fixes > 0) {
    content = fontResult.content;
    totalFontFixes += fontResult.fixes;
    modified = true;
  }
  
  // Merge @media blocks
  const mediaResult = mergeMediaBlocks(content, file);
  if (mediaResult.merges > 0) {
    content = mediaResult.content;
    totalMerges += mediaResult.merges;
    modified = true;
  }
  
  if (modified && !DRY_RUN) {
    fs.writeFileSync(filePath, content);
    pagesModified++;
  } else if (modified) {
    pagesModified++;
  }
}

console.log(`\n=== Design Fix Summary ===`);
console.log(`Pages modified: ${pagesModified}`);
console.log(`Font-sizes bumped to 0.75rem: ${totalFontFixes}`);
console.log(`@media blocks merged: ${totalMerges}`);
console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`);
