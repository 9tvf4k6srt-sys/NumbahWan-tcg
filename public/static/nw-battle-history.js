// ═══════════════════════════════════════════════════════════════════════
// NUMBAHWAN TCG — BATTLE HISTORY (Stats + Match Log)
// Loads AFTER nw-battle-v7.js — reads via window.NW_BATTLE API only
// Constraint: mobile 320px safe, flex-wrap, no overflow:hidden clipping
// Constraint: never blocks rewards (NW_WALLET.recordBattle stays in v7)
// Constraint: single localStorage writer per key (nw_battle_history)
// ═══════════════════════════════════════════════════════════════════════

(function() {
'use strict';

const STORAGE_KEY = 'nw_battle_history';
const MAX_MATCHES = 50; // keep last 50 matches

// ═══ DATA LAYER ═══
function loadHistory() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return defaultHistory();
        const h = JSON.parse(raw);
        // Migrate: ensure all fields exist
        return {
            wins: h.wins || 0,
            losses: h.losses || 0,
            streak: h.streak || 0,
            bestStreak: h.bestStreak || 0,
            totalDamage: h.totalDamage || 0,
            totalCrits: h.totalCrits || 0,
            totalSynergies: h.totalSynergies || 0,
            matches: Array.isArray(h.matches) ? h.matches.slice(-MAX_MATCHES) : []
        };
    } catch (e) {
        console.warn('[BattleHistory] Load error, resetting:', e);
        return defaultHistory();
    }
}

function defaultHistory() {
    return { wins: 0, losses: 0, streak: 0, bestStreak: 0,
             totalDamage: 0, totalCrits: 0, totalSynergies: 0, matches: [] };
}

function saveHistory(h) {
    try {
        h.matches = h.matches.slice(-MAX_MATCHES);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(h));
    } catch (e) {
        console.warn('[BattleHistory] Save error:', e);
    }
}

// ═══ RECORD MATCH — called from endGame hook ═══
function recordMatch(won, stats, difficulty, turns) {
    const h = loadHistory();

    if (won) {
        h.wins++;
        h.streak = (h.streak > 0 ? h.streak : 0) + 1;
        if (h.streak > h.bestStreak) h.bestStreak = h.streak;
    } else {
        h.losses++;
        h.streak = (h.streak < 0 ? h.streak : 0) - 1;
    }

    h.totalDamage += (stats.damageDealt || 0);
    h.totalCrits += (stats.critsLanded || 0);
    h.totalSynergies += (stats.synergiesActivated || 0);

    h.matches.push({
        ts: Date.now(),
        won: won,
        diff: difficulty || 'casual',
        turns: turns || 0,
        dmg: stats.damageDealt || 0,
        crits: stats.critsLanded || 0,
        synergies: stats.synergiesActivated || 0,
        combo: stats.maxCombo || 0,
        face: stats.faceDamage || 0
    });

    saveHistory(h);
    renderHistoryBar(h);
    renderRecentMatches(h);
    return h;
}

// ═══ RENDER: Stats bar (top of start screen) ═══
function renderHistoryBar(h) {
    h = h || loadHistory();
    const bar = document.getElementById('battleHistoryBar');
    if (!bar) return;

    const total = h.wins + h.losses;
    const winRate = total > 0 ? Math.round((h.wins / total) * 100) : 0;
    const streakText = h.streak > 0 ? `${h.streak}W` : h.streak < 0 ? `${Math.abs(h.streak)}L` : '-';
    const streakColor = h.streak > 0 ? '#66bb6a' : h.streak < 0 ? '#ef5350' : '#888';

    bar.innerHTML = `
        <div class="bh-stat">
            <div class="bh-val">${h.wins}</div>
            <div class="bh-label">WINS</div>
        </div>
        <div class="bh-stat">
            <div class="bh-val" style="color:#ef5350">${h.losses}</div>
            <div class="bh-label">LOSSES</div>
        </div>
        <div class="bh-stat">
            <div class="bh-val" style="color:#42a5f5">${winRate}%</div>
            <div class="bh-label">WIN RATE</div>
        </div>
        <div class="bh-stat">
            <div class="bh-val" style="color:${streakColor}">${streakText}</div>
            <div class="bh-label">STREAK</div>
        </div>
        <div class="bh-stat">
            <div class="bh-val" style="color:#ffd700">${h.bestStreak}</div>
            <div class="bh-label">BEST</div>
        </div>`;
    bar.classList.remove('hidden');
}

// ═══ RENDER: Recent matches (collapsible log below start screen) ═══
function renderRecentMatches(h) {
    h = h || loadHistory();
    const container = document.getElementById('battleRecentMatches');
    if (!container) return;
    if (!h.matches.length) { container.innerHTML = ''; return; }

    const recent = h.matches.slice(-10).reverse();
    const rows = recent.map(m => {
        const date = new Date(m.ts);
        const timeStr = `${date.getMonth()+1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2,'0')}`;
        const icon = m.won ? '<span style="color:#66bb6a">W</span>' : '<span style="color:#ef5350">L</span>';
        const diffLabel = m.diff === 'boss' ? 'BOSS' : m.diff === 'ranked' ? 'RNK' : 'CAS';
        return `<div class="bh-match-row">
            ${icon}
            <span class="bh-match-diff">${diffLabel}</span>
            <span class="bh-match-detail">T${m.turns} | ${m.dmg}dmg | ${m.crits}crit</span>
            <span class="bh-match-time">${timeStr}</span>
        </div>`;
    }).join('');

    container.innerHTML = `
        <div class="bh-recent-header" id="bhToggle">RECENT MATCHES <span class="bh-toggle-arrow">&#x25BC;</span></div>
        <div class="bh-recent-list" id="bhList">${rows}</div>`;
    container.classList.remove('hidden');

    // Toggle collapse
    const toggle = document.getElementById('bhToggle');
    const list = document.getElementById('bhList');
    if (toggle && list) {
        toggle.addEventListener('click', () => {
            list.classList.toggle('collapsed');
            toggle.querySelector('.bh-toggle-arrow').textContent = list.classList.contains('collapsed') ? '\u25B6' : '\u25BC';
        });
    }
}

// ═══ RENDER: Lifetime stats (in game over screen) ═══
function renderLifetimeStats(h) {
    h = h || loadHistory();
    const el = document.getElementById('battleLifetimeStats');
    if (!el) return;

    const total = h.wins + h.losses;
    const avgDmg = total > 0 ? Math.round(h.totalDamage / total) : 0;

    el.innerHTML = `
        <div class="bh-lifetime-title">LIFETIME STATS</div>
        <div class="bh-lifetime-grid">
            <div>${total} battles</div>
            <div>${avgDmg} avg dmg</div>
            <div>${h.totalCrits} crits</div>
            <div>${h.totalSynergies} synergies</div>
        </div>`;
    el.classList.remove('hidden');
}

// ═══ HOOK: Intercept endGame via MutationObserver on #gameOver ═══
// We watch for the game-over overlay becoming visible.
// This avoids modifying nw-battle-v7.js — we read state via NW_BATTLE API.
function setupHook() {
    const gameOverEl = document.getElementById('gameOver');
    if (!gameOverEl) {
        console.warn('[BattleHistory] #gameOver not found, retrying...');
        setTimeout(setupHook, 500);
        return;
    }

    let lastRecordedTurn = 0; // prevent double-recording

    const observer = new MutationObserver((mutations) => {
        for (const m of mutations) {
            if (m.type === 'attributes' && m.attributeName === 'class') {
                const isVisible = !gameOverEl.classList.contains('hidden');
                if (isVisible) {
                    try {
                        const state = window.NW_BATTLE ? window.NW_BATTLE.getState() : null;
                        if (!state) return;

                        // Prevent double-fire
                        if (state.turn === lastRecordedTurn && lastRecordedTurn > 0) return;
                        lastRecordedTurn = state.turn;

                        const won = state.enemyHP <= 0;
                        // Read stats from the game-over screen (they're rendered there)
                        const statsEl = document.getElementById('gameOverStats');
                        const stats = parseStatsFromDOM(statsEl);

                        const h = recordMatch(won, stats, state.difficulty, state.turn);
                        renderLifetimeStats(h);
                    } catch (e) {
                        console.warn('[BattleHistory] Record error:', e);
                    }
                }
            }
        }
    });

    observer.observe(gameOverEl, { attributes: true, attributeFilter: ['class'] });
    console.log('[BattleHistory] Hook active on #gameOver');
}

// Parse stats from the game-over stats div
function parseStatsFromDOM(el) {
    const defaults = { damageDealt:0, faceDamage:0, cardsPlayed:0, critsLanded:0,
                       abilitiesFired:0, synergiesActivated:0, maxCombo:0 };
    if (!el) return defaults;
    const text = el.textContent || '';
    const num = (label) => {
        const match = text.match(new RegExp(label + ':\\s*(\\d+)'));
        return match ? parseInt(match[1], 10) : 0;
    };
    return {
        damageDealt: num('Damage Dealt'),
        faceDamage: num('Face Damage'),
        cardsPlayed: num('Cards Played'),
        critsLanded: num('Crits'),
        abilitiesFired: num('Abilities'),
        synergiesActivated: num('Synergies'),
        maxCombo: num('Max Combo')
    };
}

// ═══ INIT ═══
function initHistory() {
    renderHistoryBar();
    renderRecentMatches();
    setupHook();
}

// Wait for DOM
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initHistory);
} else {
    initHistory();
}

// ═══ PUBLIC API — for other modules to read history ═══
window.NW_BATTLE_HISTORY = {
    getHistory: loadHistory,
    getWinRate: () => {
        const h = loadHistory();
        const total = h.wins + h.losses;
        return total > 0 ? Math.round((h.wins / total) * 100) : 0;
    },
    getStreak: () => loadHistory().streak,
    getBestStreak: () => loadHistory().bestStreak,
    getMatches: () => loadHistory().matches
};

})();
