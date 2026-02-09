#!/usr/bin/env node
/**
 * NW ROSTER UPDATE PIPELINE v2.0
 * ONE-SHOT roster updater: reads roster.json -> updates ALL sections of index.html
 * 
 * Usage:
 *   node scripts/update-roster.cjs
 *   node scripts/update-roster.cjs --dry-run
 * 
 * What it does:
 *   1. Reads src/data/roster.json (source of truth)
 *   2. Sorts members by CP descending
 *   3. Generates 14 member deck cards HTML
 *   4. Generates navigation dots HTML
 *   5. Updates About section stats (members, highest level, billion+ CP)
 *   6. Updates Guild Master section (level, CP)
 *   7. Updates CP Race stats bar (MVP, growth, slacker)
 *   8. Updates Progress bars (guild CP, members, raids, ranking)
 *   9. Updates Milestones
 *   10. Updates memberBgTexts JS array
 *   11. Writes updated files (index.html, dist/index.html, dist roster.json)
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const ROSTER_PATH = path.join(ROOT, 'src/data/roster.json');
const INDEX_PATH = path.join(ROOT, 'public/index.html');
const DIST_INDEX = path.join(ROOT, 'dist/index.html');
const DIST_ROSTER = path.join(ROOT, 'dist/static/data/roster.json');

const DRY_RUN = process.argv.includes('--dry-run');

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

function formatCP(value) {
  const abs = Math.abs(value);
  if (abs >= 1e9) return (value / 1e9).toFixed(1) + 'B';
  if (abs >= 1e6) return (value / 1e6).toFixed(0) + 'M';
  if (abs >= 1e3) return (value / 1e3).toFixed(0) + 'K';
  return value.toString();
}

function getRoleClass(role) {
  if (role === 'Master') return 'role-master';
  if (role === 'Vice Master') return 'role-vice';
  if (role === '領導') return 'role-leader';
  if (role === '小可愛') return 'role-inactive';
  return 'role-member';
}

function getRoleI18n(role) {
  if (role === 'Master') return ' data-i18n="master"';
  if (role === 'Vice Master') return ' data-i18n="viceMaster"';
  if (role === 'Guild Member') return ' data-i18n="guildMember"';
  return '';
}

function getNameInitial(name) {
  if (/^[a-zA-Z]/.test(name)) return name[0].toUpperCase();
  return name[0];
}

function getBgText(name) {
  if (/^[a-zA-Z]/.test(name)) return name.toUpperCase().substring(0, 10);
  return name.substring(0, 2);
}

// Safe regex replace with logging
function safeReplace(html, pattern, replacement, label) {
  const hasMatch = pattern.test ? pattern.test(html) : html.match(pattern);
  // Reset lastIndex for global patterns
  if (pattern.global) pattern.lastIndex = 0;
  const newHtml = html.replace(pattern, replacement);
  if (newHtml === html) {
    if (hasMatch) {
      console.log(`  [OK] ${label} (already correct)`);
    } else {
      console.warn(`  [WARN] No match for: ${label}`);
    }
  } else {
    console.log(`  [OK] ${label}`);
  }
  return newHtml;
}

// ═══════════════════════════════════════════════════════════════
// GENERATE MEMBER DECK CARD HTML
// ═══════════════════════════════════════════════════════════════

function generateMemberCard(member, index) {
  const isOnline = member.online;
  const hasAvatar = member.avatar !== null;
  const initial = getNameInitial(member.name);
  const roleClass = getRoleClass(member.role);
  const roleI18n = getRoleI18n(member.role);
  const roleDisplay = member.role;
  const contribFormatted = member.contribution > 0 ? member.contribution.toLocaleString() : '0';
  
  const crownHtml = index === 0 
    ? `\n                        <div class="absolute top-3 right-3 text-2xl" style="filter: drop-shadow(0 0 5px gold)"></div>` 
    : '';
  
  const onlineHtml = isOnline ? '\n                            <span class="member-online-indicator"></span>' : '';
  
  const avatarHtml = hasAvatar
    ? `<img loading="lazy" decoding="async" src="${member.avatar}" alt="${member.name}" class="member-avatar-img" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />
                            <div class="member-avatar-fallback" style="display:none;">${initial}</div>`
    : `<div class="member-avatar-fallback">${initial}</div>`;
  
  const nameStyle = member.name.length > 12 ? ' style="font-size:0.85rem"' : '';

  return `
                    <!-- #${index + 1} ${member.name} - ${member.cp} CP -->
                    <div class="deck-card" data-index="${index}" data-position="${index}">
                        <div class="card-overlay"></div>
                        <div class="card-index">${index + 1}</div>${crownHtml}
                        <div class="member-avatar-container">
                            <div class="member-avatar-glow"></div>
                            ${avatarHtml}${onlineHtml}
                        </div>
                        <div class="card-content" style="padding-top: 140px;">
                            <h3 class="card-title text-center text-lg mb-0"${nameStyle}>${member.name}</h3>
                            <p class="text-center text-orange-300 text-sm mb-3">Lv. ${member.level}</p>
                            <div class="space-y-2 text-xs">
                                <div class="flex justify-between px-2 py-1 bg-black/30 rounded">
                                    <span class="text-gray-400">CP</span>
                                    <span class="text-orange-400 font-bold">${member.cp}</span>
                                </div>
                                <div class="flex justify-between px-2 py-1">
                                    <span class="text-gray-400">Contrib</span>
                                    <span class="text-orange-300">${contribFormatted}</span>
                                </div>
                            </div>
                            <div class="mt-3 flex justify-center">
                                <span class="px-3 py-1 rounded-full text-xs font-bold ${roleClass}"${roleI18n}>${roleDisplay}</span>
                            </div>
                        </div>
                    </div>`;
}

function generateDots(count) {
  let html = '';
  for (let i = 0; i < count; i++) {
    const active = i === 0 ? ' active' : '';
    html += `\n                <div class="deck-dot${active}" data-index="${i}" onclick="goToMemberCard(${i})"></div>`;
  }
  return html;
}

// ═══════════════════════════════════════════════════════════════
// MAIN PIPELINE
// ═══════════════════════════════════════════════════════════════

function run() {
  console.log('═══════════════════════════════════════════════');
  console.log('[ROSTER PIPELINE v2.0] Starting...');
  console.log('═══════════════════════════════════════════════');
  
  // 1. Load roster
  const roster = JSON.parse(fs.readFileSync(ROSTER_PATH, 'utf8'));
  const { members, previousCP, lastUpdated, guildStats } = roster;
  
  // 2. Sort by CP descending
  const sorted = [...members].sort((a, b) => b.cpValue - a.cpValue);
  console.log(`\n[ROSTER] ${sorted.length} members loaded, sorted by CP:`);
  sorted.forEach((m, i) => console.log(`  #${i+1} ${m.name} Lv.${m.level} ${m.cp} (${m.role}) ${m.avatar ? '🖼️' : '⬜'}`));
  
  // 3. Compute stats
  const totalMembers = sorted.length;
  const highestLevel = Math.max(...sorted.map(m => m.level));
  const billionPlusCount = sorted.filter(m => m.cpValue >= 1e9).length;
  const totalCPValue = sorted.reduce((sum, m) => sum + m.cpValue, 0);
  
  // CP gains
  let totalGain = 0;
  let biggestJumper = { name: '--', gain: 0, pct: 0 };
  sorted.forEach(m => {
    const prev = previousCP[m.name] || 0;
    const gain = m.cpValue - prev;
    totalGain += gain > 0 ? gain : 0;
    const pct = prev > 0 ? (gain / prev * 100) : (gain > 0 ? 999 : 0);
    if (gain > biggestJumper.gain) {
      biggestJumper = { name: m.name, gain, pct };
    }
  });
  
  let slacker = { name: '--', gainPct: Infinity };
  sorted.forEach(m => {
    const prev = previousCP[m.name] || 0;
    if (prev <= 0) return;
    const gain = m.cpValue - prev;
    const pct = (gain / prev * 100);
    if (pct < slacker.gainPct) {
      slacker = { name: m.name, gainPct: pct };
    }
  });
  
  const prevTotal = Object.values(previousCP).reduce((s, v) => s + v, 0);
  const growthPct = prevTotal > 0 ? ((totalCPValue - prevTotal) / prevTotal * 100).toFixed(1) : '0';
  
  console.log(`\n[STATS]`);
  console.log(`  Members: ${totalMembers}`);
  console.log(`  Highest Level: ${highestLevel}`);
  console.log(`  Billion+ CP: ${billionPlusCount}`);
  console.log(`  Total CP: ${formatCP(totalCPValue)} (${totalCPValue.toLocaleString()})`);
  console.log(`  Total Gain: +${formatCP(totalGain)}`);
  console.log(`  Growth: +${growthPct}%`);
  console.log(`  Biggest Jumper: ${biggestJumper.name} (+${formatCP(biggestJumper.gain)}, +${biggestJumper.pct.toFixed(1)}%)`);
  console.log(`  Slacker: ${slacker.name} (+${slacker.gainPct.toFixed(1)}%)`);
  
  // GM data
  const gm = sorted.find(m => m.role === 'Master') || sorted[0];
  console.log(`  GM: ${gm.name} Lv.${gm.level} ${gm.cp}`);
  
  // 4. Generate HTML
  const cardsHtml = sorted.map((m, i) => generateMemberCard(m, i)).join('\n');
  const dotsHtml = generateDots(sorted.length);
  const bgTexts = sorted.map(m => getBgText(m.name));
  const bgTextsJs = `const memberBgTexts = [${bgTexts.map(t => `'${t}'`).join(', ')}];`;
  
  // 5. Read index.html
  let html = fs.readFileSync(INDEX_PATH, 'utf8');
  console.log(`\n[UPDATES]`);
  
  // ═══════════════════════════════════════════════════════════════
  // 6. Replace member deck (the big one)
  // ═══════════════════════════════════════════════════════════════
  const deckStart = '<!-- Stacked Deck - Member Cards';
  const deckEnd = '<p class="swipe-hint"';
  const deckStartIdx = html.indexOf(deckStart);
  const deckEndIdx = html.indexOf(deckEnd, deckStartIdx);
  
  if (deckStartIdx === -1 || deckEndIdx === -1) {
    console.error('[FATAL] Could not find deck markers in index.html');
    process.exit(1);
  }
  
  const newDeck = `<!-- Stacked Deck - Member Cards (auto-generated ${lastUpdated}, ${totalMembers} members) -->
            <div class="card-deck" id="member-deck">${cardsHtml}
                
            </div>
            
            <!-- Navigation Dots -->
            <div class="deck-nav" id="member-deck-nav">${dotsHtml}
            </div>
            `;
  
  html = html.substring(0, deckStartIdx) + newDeck + html.substring(deckEndIdx);
  console.log(`  [OK] Member deck replaced (${totalMembers} cards + ${totalMembers} dots)`);
  
  // ═══════════════════════════════════════════════════════════════
  // 7. Update memberBgTexts JS array
  // ═══════════════════════════════════════════════════════════════
  html = safeReplace(html,
    /const memberBgTexts = \[.*?\];/,
    bgTextsJs,
    'memberBgTexts'
  );
  
  // ═══════════════════════════════════════════════════════════════
  // 8. Update About section stats
  // ═══════════════════════════════════════════════════════════════
  html = safeReplace(html,
    /(data-nw-counter=")[^"]+(">[^<]*<\/div>\s*<p[^>]*data-i18n="familyMembers")/s,
    `$1${totalMembers}$2`,
    `Family Members counter -> ${totalMembers}`
  );
  html = safeReplace(html,
    /(data-nw-counter=")[^"]+(">[^<]*<\/div>\s*<p[^>]*data-i18n="highestLevel")/s,
    `$1${highestLevel}$2`,
    `Highest Level counter -> ${highestLevel}`
  );
  html = safeReplace(html,
    /(data-nw-counter=")[^"]+(">[^<]*<\/div>\s*<p[^>]*data-i18n="billionCP")/s,
    `$1${billionPlusCount}$2`,
    `Billion+ CP counter -> ${billionPlusCount}`
  );
  
  // ═══════════════════════════════════════════════════════════════
  // 9. Update Guild Master section
  // ═══════════════════════════════════════════════════════════════
  html = safeReplace(html,
    /(data-i18n="level)\w+(">)Level \d+ . CP: [^<]+/,
    `$1${gm.level}Cp${gm.cp.replace(/ /g,'')}$2Level ${gm.level} \u2022 CP: ${gm.cp}`,
    `GM Level/CP -> Level ${gm.level} CP: ${gm.cp}`
  );
  
  // ═══════════════════════════════════════════════════════════════
  // 10. Update CP Race stats bar
  // ═══════════════════════════════════════════════════════════════
  
  // Weekly MVP name (in the yellow text line)
  html = safeReplace(html,
    /(<p class="font-bold text-yellow-400" data-i18n="natehouoho2">)[^<]+(<\/p>)/,
    `$1${biggestJumper.name}$2`,
    `MVP name -> ${biggestJumper.name}`
  );
  
  // Weekly MVP gain line (the green text right after the yellow MVP name)
  html = safeReplace(html,
    /(data-i18n="natehouoho2">[^<]+<\/p>\s*<p class="text-green-400 text-xs">)[^<]+/,
    `$1+${formatCP(biggestJumper.gain)} (+${biggestJumper.pct.toFixed(1)}%)`,
    `MVP gain -> +${formatCP(biggestJumper.gain)}`
  );
  
  // Guild growth amount
  html = safeReplace(html,
    /(<p class="font-bold text-orange-400">)[^<]+(<\/p>[\s\S]*?<p class="text-green-400 text-xs">)[^<]+(<\/p>[\s\S]*?data-i18n="slackerAward")/,
    `$1+${formatCP(totalGain)}$2+${growthPct}%$3`,
    `Growth -> +${formatCP(totalGain)} (+${growthPct}%)`
  );
  
  // Slacker name
  html = safeReplace(html,
    /(data-i18n="slackerAward">[^<]+<\/p>\s*<p class="font-bold text-gray-400">)[^<]+/,
    `$1${slacker.name}`,
    `Slacker -> ${slacker.name}`
  );
  
  // ═══════════════════════════════════════════════════════════════
  // 11. Update Progress section
  // ═══════════════════════════════════════════════════════════════
  
  // Total Guild CP text
  {
    const cpPct = Math.min(99, Math.round(totalCPValue / 150e9 * 100));
    html = safeReplace(html,
      /(data-i18n="totalCP">Total Guild CP<\/span><\/span>\s*<span class="text-orange-400">)[^<]+/,
      `$1${formatCP(totalCPValue)} / 150B`,
      `Total CP display -> ${formatCP(totalCPValue)} / 150B`
    );
    // CP progress bar - find the Total Guild CP comment and update nearby bar
    html = safeReplace(html,
      /(<!-- Total Guild CP -->[\s\S]*?<div class="progress-bar" style="width: )\d+(%">[\s\S]*?<span[^>]*>)\d+%/,
      `$1${cpPct}$2${cpPct}%`,
      `CP progress bar -> ${cpPct}%`
    );
  }
  
  // Members count
  {
    const memPct = Math.round(totalMembers / guildStats.maxMembers * 100);
    html = safeReplace(html,
      /(data-i18n="members">Members<\/span><\/span>\s*<span class="text-orange-400">)[^<]+/,
      `$1${totalMembers} / ${guildStats.maxMembers}`,
      `Members display -> ${totalMembers} / ${guildStats.maxMembers}`
    );
    html = safeReplace(html,
      /(<!-- Member Capacity -->[\s\S]*?<div class="progress-bar" style="width: )\d+(%">[\s\S]*?<span[^>]*>)\d+%/,
      `$1${memPct}$2${memPct}%`,
      `Members progress bar -> ${memPct}%`
    );
  }
  
  // Boss raids
  {
    const raidPct = Math.round(guildStats.bossRaidsWeekly / guildStats.bossRaidsMax * 100);
    html = safeReplace(html,
      /(data-i18n="bossRaids">[^<]+<\/span><\/span>\s*<span class="text-orange-400">)[^<]+/,
      `$1${guildStats.bossRaidsWeekly} / ${guildStats.bossRaidsMax}`,
      `Boss raids display -> ${guildStats.bossRaidsWeekly} / ${guildStats.bossRaidsMax}`
    );
    html = safeReplace(html,
      /(<!-- Boss Raids Completed -->[\s\S]*?<div class="progress-bar" style="width: )\d+(%">\s*<span[^>]*>)\d+%/,
      `$1${raidPct}$2${raidPct}%`,
      `Boss raids progress bar -> ${raidPct}%`
    );
  }
  
  // Server ranking
  html = safeReplace(html,
    /#\d+ → #1/,
    `#${guildStats.serverRanking} → #1`,
    `Server ranking -> #${guildStats.serverRanking}`
  );
  
  // ═══════════════════════════════════════════════════════════════
  // 12. Update milestones
  // ═══════════════════════════════════════════════════════════════
  const topMember = sorted[0];
  const topCPFormatted = formatCP(topMember.cpValue).replace(/\.\d+/, '');
  
  html = safeReplace(html,
    /(data-i18n="first)\w+(">[^<]*First )\d+B CP Member/,
    `$1${topCPFormatted.toLowerCase()}CpMember$2${topCPFormatted} CP Member`,
    `First milestone -> ${topCPFormatted} CP Member`
  );
  
  html = safeReplace(html,
    /(<p class="text-gray-400 text-sm">)(Natehouoho|[^<]+) (EXPLODED to|reached) [^<]+/,
    `$1${topMember.name} EXPLODED to ${topMember.cp} CP (Feb 2026)`,
    `Milestone detail -> ${topMember.name} ${topMember.cp}`
  );
  
  html = safeReplace(html,
    /(data-i18n=")\w+(">\d+ Members Strong)/,
    `$1${totalMembers.toString().replace(/\s/g,'')}MembersStrong$2`,
    'Members milestone i18n key'
  );
  html = safeReplace(html,
    /\d+ Members Strong/,
    `${totalMembers} Members Strong`,
    `Members milestone -> ${totalMembers} Members Strong`
  );
  
  // ═══════════════════════════════════════════════════════════════
  // 13. Also update i18n translation keys for MVP name in all locale blocks
  // ═══════════════════════════════════════════════════════════════
  // These are in the embedded translation objects at the bottom
  // Update all i18n translation blocks for MVP name
  const mvpPattern = /natehouoho2: '[^']+'/g;
  const mvpReplacement = `natehouoho2: '${biggestJumper.name}'`;
  const mvpCount = (html.match(mvpPattern) || []).length;
  if (mvpCount > 0) {
    html = html.replace(mvpPattern, mvpReplacement);
    console.log(`  [OK] i18n MVP translations (${mvpCount} occurrences)`);
  } else {
    console.warn('  [WARN] No i18n MVP translations found');
  }
  
  // ═══════════════════════════════════════════════════════════════
  // 14. WRITE FILES
  // ═══════════════════════════════════════════════════════════════
  
  if (DRY_RUN) {
    console.log('\n[DRY RUN] Would write to:');
    console.log(`  ${INDEX_PATH}`);
    console.log(`  ${DIST_INDEX}`);
    console.log(`  ${DIST_ROSTER}`);
    console.log('\n[DRY RUN] No files modified.');
    return;
  }
  
  fs.writeFileSync(INDEX_PATH, html, 'utf8');
  console.log(`\n[WRITE] ${INDEX_PATH}`);
  
  if (fs.existsSync(path.dirname(DIST_INDEX))) {
    fs.writeFileSync(DIST_INDEX, html, 'utf8');
    console.log(`[WRITE] ${DIST_INDEX}`);
  }
  
  if (fs.existsSync(path.dirname(DIST_ROSTER))) {
    fs.copyFileSync(ROSTER_PATH, DIST_ROSTER);
    console.log(`[WRITE] ${DIST_ROSTER}`);
  }
  
  console.log(`\n═══════════════════════════════════════════════`);
  console.log(`[ROSTER PIPELINE] DONE! ${totalMembers} members updated.`);
  console.log(`[NEXT] Run: npm run build && restart server`);
  console.log(`═══════════════════════════════════════════════`);
}

run();
