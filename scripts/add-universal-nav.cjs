const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, '../public');

// Page ID mapping (file name without .html -> nav page id)
const pageIdMap = {
  'index': 'index',
  'apply': 'apply',
  'arcade': 'arcade',
  'battle': 'battle',
  'battle-old': 'battle',
  'cards': 'cards',
  'collection': 'collection',
  'deckbuilder': 'deckbuilder',
  'fashion': 'fashion',
  'forge': 'forge',
  'fortune': 'fortune',
  'guide': 'guide',
  'market': 'market',
  'memes': 'memes',
  'merch': 'merch',
  'pvp': 'pvp',
  'regina': 'regina',
  'tcg': 'tcg',
  'tournament': 'tournament',
  'wallet': 'wallet',
  'zakum': 'zakum'
};

// Test/demo pages to skip
const skipPages = ['test-card', 'test-forge', 'test-pull', 'test-render', 'card-frames-demo'];

// Get all HTML files
const htmlFiles = fs.readdirSync(publicDir)
  .filter(f => f.endsWith('.html'))
  .filter(f => !skipPages.includes(f.replace('.html', '')));

let updated = 0;
let skipped = 0;

htmlFiles.forEach(file => {
  const filePath = path.join(publicDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  const pageName = file.replace('.html', '');
  const pageId = pageIdMap[pageName] || pageName;
  
  let modified = false;
  
  // 1. Add data-page-id to body if missing
  if (!content.includes('data-page-id=')) {
    content = content.replace(/<body([^>]*)>/, `<body$1 data-page-id="${pageId}">`);
    modified = true;
    console.log(`  + Added data-page-id="${pageId}" to ${file}`);
  }
  
  // 2. Add nw-nav.js if missing
  if (!content.includes('nw-nav.js')) {
    // Find a good place to insert - after nw-core.css or before </head>
    if (content.includes('nw-core.css')) {
      content = content.replace(
        /(<link[^>]*nw-core\.css[^>]*>)/,
        '$1\n    <script src="/static/nw-nav.js" defer></script>'
      );
    } else if (content.includes('</head>')) {
      content = content.replace(
        '</head>',
        '    <script src="/static/nw-nav.js" defer></script>\n</head>'
      );
    }
    modified = true;
    console.log(`  + Added nw-nav.js to ${file}`);
  }
  
  if (modified) {
    fs.writeFileSync(filePath, content);
    updated++;
  } else {
    skipped++;
  }
});

console.log(`\nDone! Updated ${updated} files, skipped ${skipped} files (already had nav).`);
