// =====================================================
// NUMBAHWAN ARCADE - PREMIUM GAME SYSTEM
// Uses NW_WALLET for secure, persistent storage
// =====================================================

// Currency metadata
const CURRENCY_DATA = {
    diamond: { icon: '◆', name: 'Diamond', tier: 0, color: '#00d4ff', rarity: 'common' },
    gold: { icon: '●', name: 'Gold', tier: 1, color: '#ffd700', rarity: 'uncommon' },
    iron: { icon: '⬡', name: 'Iron', tier: 2, color: '#94a3b8', rarity: 'rare' },
    stone: { icon: '▣', name: 'Black Jade', tier: 3, color: '#00ff88', rarity: 'epic' },
    wood: { icon: '⧫', name: 'Sacred Log', tier: 4, color: '#c97f3d', rarity: 'mythic' }
};

// ═══════════════════════════════════════════════════════════════
// IMPROVED EXCHANGE RATES - "Almost There" Progression Design
// Lower upgrade rates = faster progress = more dopamine hits
// Sacred Log remains special with intentional bottleneck
// ═══════════════════════════════════════════════════════════════
const EXCHANGE_RATES = {
    // UPGRADE PATH (easier progression - feels achievable!)
    'diamond->gold': 10,      // Was 100 - Now 10:1 feels quick
    'gold->iron': 5,          // Was 50 - Now 5:1 smooth progress  
    'iron->stone': 5,         // Was 25 - Now 5:1 consistent ladder
    'stone->wood': 50,        // SACRED LOG BOTTLENECK - keeps it SPECIAL
    
    // DOWNGRADE PATH (20% value loss - encourages forward progress)
    'gold->diamond': 8,       // Get 8 per 1 (20% loss)
    'iron->gold': 4,          // Get 4 per 1 (20% loss)
    'stone->iron': 4,         // Get 4 per 1 (20% loss)
    'wood->stone': 40         // Get 40 per 1 (20% loss) - DON'T WASTE LOGS!
};

// "Almost There" milestone thresholds for engagement messages
const MILESTONES = {
    diamond: [100, 500, 1000, 5000],
    gold: [50, 100, 500, 1000],
    iron: [25, 50, 100, 500],
    stone: [10, 25, 50, 100],  // Black Jade milestones
    wood: [1, 5, 10, 25, 50]   // Sacred Log - every one is precious!
};

// Wait for wallet to be ready
let walletReady = false;

window.addEventListener('nw-wallet-ready', (e) => {
    walletReady = true;
    updateUI();
    showWalletInfo();
    showGMStatus();
});

function showWalletInfo() {
    const info = NW_WALLET.getWalletInfo();
    if (info) {
        //console.log('[ARCADE] Wallet loaded:', info.guestId);
        // Show guest ID in UI
        const guestIdEl = document.getElementById('guestId');
        if (guestIdEl) guestIdEl.textContent = info.guestId;
    }
}

function showGMStatus() {
    if (NW_WALLET.isGMMode()) {
        // Add GM badge to wallet ID area
        const walletIdEl = document.querySelector('.wallet-id');
        if (walletIdEl && !document.getElementById('gmIndicator')) {
            const gmBadge = document.createElement('span');
            gmBadge.id = 'gmIndicator';
            gmBadge.innerHTML = '👑 GM';
            gmBadge.style.cssText = `
                background: linear-gradient(135deg, rgba(255,215,0,0.3), rgba(255,107,0,0.2));
                border: 2px solid #ffd700;
                color: #ffd700;
                padding: 4px 10px;
                border-radius: 6px;
                font-family: 'Orbitron', sans-serif;
                font-size: 11px;
                font-weight: 800;
                letter-spacing: 1px;
                animation: gmPulse 2s infinite;
                margin-left: 10px;
            `;
            walletIdEl.appendChild(gmBadge);
            
            // Add GM pulse animation if not exists
            if (!document.getElementById('gmPulseStyle')) {
                const style = document.createElement('style');
                style.id = 'gmPulseStyle';
                style.textContent = `
                    @keyframes gmPulse {
                        0%, 100% { box-shadow: 0 0 10px rgba(255,215,0,0.3); }
                        50% { box-shadow: 0 0 25px rgba(255,215,0,0.6); }
                    }
                `;
                document.head.appendChild(style);
            }
        }
        
        //console.log('%c[ARCADE] 👑 GM MODE ACTIVE - Infinite resources!', 
            'background: linear-gradient(90deg, #ffd700, #ff6b00); color: black; font-weight: bold; padding: 8px;');
    }
}

function getBalance(currency) {
    if (!walletReady) return 0;
    return NW_WALLET.getBalance(currency);
}

function updateUI() {
    if (!walletReady) return;
    
    const balances = NW_WALLET.getAllBalances();
    
    // Wallet bar
    document.getElementById('diamonds').textContent = formatNum(balances.diamond || 0);
    document.getElementById('gold').textContent = formatNum(balances.gold || 0);
    document.getElementById('iron').textContent = formatNum(balances.iron || 0);
    document.getElementById('stone').textContent = formatNum(balances.stone || 0);
    document.getElementById('wood').textContent = formatNum(balances.wood || 0);
    document.getElementById('log-balance').textContent = formatNum(balances.wood || 0);
    
    // Exchange section
    document.getElementById('ex-diamond').textContent = formatNum(balances.diamond || 0);
    document.getElementById('ex-gold').textContent = formatNum(balances.gold || 0);
    document.getElementById('ex-iron').textContent = formatNum(balances.iron || 0);
    document.getElementById('ex-stone').textContent = formatNum(balances.stone || 0);
    document.getElementById('ex-wood').textContent = formatNum(balances.wood || 0);
    
    // Update progression bar
    updateProgression();
}

function formatNum(n) {
    if (n >= 1000000) return (n/1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n/1000).toFixed(1) + 'K';
    return n.toString();
}

// Currency helpers - using secure wallet
function spend(type, amount, purpose = 'GAME') {
    if (!walletReady) {
        toast('Wallet not ready!', 'error');
        return false;
    }
    
    if (NW_WALLET.spend(type, amount, purpose)) {
        updateUI();
        return true;
    }
    
    toast('Not enough ' + CURRENCY_DATA[type].name + '!', 'error');
    return false;
}

function earn(type, amount, source = 'GAME_WIN') {
    if (!walletReady) return false;
    
    NW_WALLET.earn(type, amount, source);
    updateUI();
    return true;
}

// Toast
function toast(msg, type = 'success') {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.className = 'toast show ' + type;
    setTimeout(() => t.className = 'toast', 3000);
}

// Modal
let currentGame = null;

function openGame(game) {
    currentGame = game;
    const modal = document.getElementById('modalOverlay');
    const title = document.getElementById('modalTitle');
    const cost = document.getElementById('modalCost');
    const content = document.getElementById('modalContent');
    
    const games = {
        slots: { title: '🎰 GOLDEN REELS', cost: 10, render: renderSlots },
        scratch: { title: '🎫 FORTUNE SCRATCHER', cost: 15, render: renderScratch },
        coinflip: { title: '● FATE\'S COIN', cost: 20, render: renderCoinflip },
        guess: { title: '🔮 ORACLE\'S GAMBIT', cost: 25, render: renderGuess },
        dice: { title: '🎲 DRAGON\'S DICE', cost: 30, render: renderDice },
        treasure: { title: '🏛️ ANCIENT VAULT', cost: 50, render: renderTreasure }
    };
    
    const g = games[game];
    title.textContent = g.title;
    // Use NW_CURRENCY for premium icon display
    if (typeof NW_CURRENCY !== 'undefined') {
        cost.innerHTML = 'Cost: ' + NW_CURRENCY.format('diamond', g.cost);
    } else {
        cost.textContent = 'Cost: ' + g.cost + ' Diamonds';
    }
    content.innerHTML = g.render();
    
    modal.classList.add('active');
    
    // Init game-specific logic
    if (game === 'scratch') initScratch();
}

function closeGame() {
    document.getElementById('modalOverlay').classList.remove('active');
    currentGame = null;
}

// ==================== SLOTS ====================
const SLOT_SYMBOLS = ['🍒', '🍋', '🍊', '🍇', '⭐', '◆', '7️⃣', '⧫'];
let slotsSpinning = false;

function renderSlots() {
    return `
        <div class="slots-machine">
            <div class="slots-display">
                <div class="slot-reel" id="reel1"><div class="slot-strip" id="strip1"></div></div>
                <div class="slot-reel" id="reel2"><div class="slot-strip" id="strip2"></div></div>
                <div class="slot-reel" id="reel3"><div class="slot-strip" id="strip3"></div></div>
            </div>
            <div class="slots-lever">
                <button class="spin-btn" id="spinBtn" onclick="spinSlots()">SPIN!</button>
            </div>
        </div>
        <div id="slotsResult"></div>
    `;
}

function spinSlots() {
    if (slotsSpinning) return;
    if (!spend('diamond', 10)) return;
    
    slotsSpinning = true;
    document.getElementById('spinBtn').disabled = true;
    document.getElementById('slotsResult').innerHTML = '';
    
    // Generate results
    const results = [
        SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)],
        SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)],
        SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)]
    ];
    
    // Animate reels
    [1, 2, 3].forEach((n, i) => {
        const strip = document.getElementById('strip' + n);
        let items = '';
        for (let j = 0; j < 20; j++) {
            items += `<div class="slot-item">${SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)]}</div>`;
        }
        items += `<div class="slot-item">${results[i]}</div>`;
        strip.innerHTML = items;
        strip.style.transform = 'translateY(0)';
        
        setTimeout(() => {
            strip.style.transition = 'transform ' + (1.5 + i * 0.3) + 's cubic-bezier(0.15, 0.85, 0.35, 1)';
            strip.style.transform = 'translateY(-2000px)';
        }, 50);
    });
    
    // Show result
    setTimeout(() => {
        slotsSpinning = false;
        document.getElementById('spinBtn').disabled = false;
        
        let win = 0;
        let currency = 'gold';
        
        if (results[0] === results[1] && results[1] === results[2]) {
            // Jackpot!
            if (results[0] === '⧫') { win = 5; currency = 'wood'; }
            else if (results[0] === '◆') { win = 100; currency = 'diamond'; }
            else if (results[0] === '7️⃣') { win = 200; currency = 'gold'; }
            else { win = 50; currency = 'gold'; }
        } else if (results[0] === results[1] || results[1] === results[2]) {
            win = 15; currency = 'gold';
        }
        
        if (win > 0) {
            earn(currency, win);
            const icon = currency === 'wood' ? '⧫' : currency === 'diamond' ? '◆' : '●';
            document.getElementById('slotsResult').innerHTML = `
                <div class="result-display win">
                    <div class="result-text win">🎉 WINNER!</div>
                    <div class="result-amount">+${win} ${icon}</div>
                </div>
            `;
            toast(`Won ${win} ${currency}!`, 'success');
        } else {
            document.getElementById('slotsResult').innerHTML = `
                <div class="result-display lose">
                    <div class="result-text lose">No Match</div>
                    <div class="result-amount">Try again!</div>
                </div>
            `;
        }
    }, 2500);
}

// ==================== SCRATCH CARD ====================
let scratchCtx = null;
let scratchRevealed = false;
let scratchPrize = null;

function renderScratch() {
    // Determine prize
    const roll = Math.random();
    if (roll < 0.01) { scratchPrize = { icon: '⧫', amount: 3, type: 'wood' }; }
    else if (roll < 0.05) { scratchPrize = { icon: '●', amount: 50, type: 'gold' }; }
    else if (roll < 0.20) { scratchPrize = { icon: '●', amount: 25, type: 'gold' }; }
    else if (roll < 0.50) { scratchPrize = { icon: '⬡', amount: 20, type: 'iron' }; }
    else { scratchPrize = { icon: '▣', amount: 15, type: 'stone' }; }
    
    return `
        <div class="scratch-container">
            <div class="scratch-card" id="scratchCard">
                <div class="scratch-prize">
                    <span class="scratch-prize-icon">${scratchPrize.icon}</span>
                    <span class="scratch-prize-text">+${scratchPrize.amount}</span>
                </div>
                <canvas class="scratch-canvas" id="scratchCanvas" width="260" height="180"></canvas>
            </div>
            <p class="scratch-hint">Scratch to reveal your prize!</p>
            <button class="play-btn" id="scratchBtn" onclick="buyScratch()" style="margin-top:16px;">BUY CARD (◆ 15)</button>
        </div>
        <div id="scratchResult"></div>
    `;
}

function initScratch() {
    const canvas = document.getElementById('scratchCanvas');
    scratchCtx = canvas.getContext('2d');
    scratchRevealed = false;
    
    // Draw scratch surface
    const gradient = scratchCtx.createLinearGradient(0, 0, 260, 180);
    gradient.addColorStop(0, '#c0c0c0');
    gradient.addColorStop(0.5, '#e0e0e0');
    gradient.addColorStop(1, '#c0c0c0');
    scratchCtx.fillStyle = gradient;
    scratchCtx.fillRect(0, 0, 260, 180);
    
    // Add text
    scratchCtx.fillStyle = '#888';
    scratchCtx.font = 'bold 16px Orbitron';
    scratchCtx.textAlign = 'center';
    scratchCtx.fillText('SCRATCH HERE', 130, 95);
    
    canvas.style.pointerEvents = 'none';
}

function buyScratch() {
    if (!spend('diamond', 15)) return;
    document.getElementById('scratchBtn').style.display = 'none';
    document.getElementById('scratchCanvas').style.pointerEvents = 'auto';
    
    const canvas = document.getElementById('scratchCanvas');
    let isDrawing = false;
    let scratched = 0;
    
    function scratch(x, y) {
        scratchCtx.globalCompositeOperation = 'destination-out';
        scratchCtx.beginPath();
        scratchCtx.arc(x, y, 25, 0, Math.PI * 2);
        scratchCtx.fill();
        scratched++;
        
        if (scratched > 30 && !scratchRevealed) {
            scratchRevealed = true;
            canvas.style.display = 'none';
            earn(scratchPrize.type, scratchPrize.amount);
            document.getElementById('scratchResult').innerHTML = `
                <div class="result-display win">
                    <div class="result-text win">🎉 YOU WON!</div>
                    <div class="result-amount">+${scratchPrize.amount} ${scratchPrize.icon}</div>
                </div>
            `;
            toast(`Won ${scratchPrize.amount} ${scratchPrize.type}!`, 'success');
        }
    }
    
    canvas.onmousedown = () => isDrawing = true;
    canvas.onmouseup = () => isDrawing = false;
    canvas.onmousemove = (e) => {
        if (!isDrawing) return;
        const rect = canvas.getBoundingClientRect();
        scratch(e.clientX - rect.left, e.clientY - rect.top);
    };
    canvas.ontouchstart = (e) => { e.preventDefault(); isDrawing = true; };
    canvas.ontouchend = () => isDrawing = false;
    canvas.ontouchmove = (e) => {
        e.preventDefault();
        if (!isDrawing) return;
        const rect = canvas.getBoundingClientRect();
        const touch = e.touches[0];
        scratch(touch.clientX - rect.left, touch.clientY - rect.top);
    };
}

// ==================== COIN FLIP ====================
let coinChoice = null;

function renderCoinflip() {
    coinChoice = null;
    return `
        <div class="coinflip-container">
            <div class="coin-stage">
                <div class="coin" id="coin">
                    <div class="coin-face coin-heads">👑</div>
                    <div class="coin-face coin-tails">🦅</div>
                </div>
            </div>
            <div class="coin-choice">
                <button class="choice-btn" id="choiceHeads" onclick="chooseCoin('heads')">👑 HEADS</button>
                <button class="choice-btn" id="choiceTails" onclick="chooseCoin('tails')">🦅 TAILS</button>
            </div>
            <button class="play-btn" id="flipBtn" onclick="flipCoin()" disabled>FLIP COIN (◆ 20)</button>
        </div>
        <div id="coinResult"></div>
    `;
}

function chooseCoin(choice) {
    coinChoice = choice;
    document.getElementById('choiceHeads').classList.toggle('selected', choice === 'heads');
    document.getElementById('choiceTails').classList.toggle('selected', choice === 'tails');
    document.getElementById('flipBtn').disabled = false;
}

function flipCoin() {
    if (!coinChoice) return;
    if (!spend('diamond', 20)) return;
    
    const coin = document.getElementById('coin');
    const btn = document.getElementById('flipBtn');
    btn.disabled = true;
    
    coin.classList.add('flipping');
    
    const result = Math.random() < 0.5 ? 'heads' : 'tails';
    
    setTimeout(() => {
        coin.classList.remove('flipping');
        coin.style.transform = result === 'heads' ? 'rotateY(0deg)' : 'rotateY(180deg)';
        
        if (result === coinChoice) {
            earn('gold', 40);
            document.getElementById('coinResult').innerHTML = `
                <div class="result-display win">
                    <div class="result-text win">🎉 CORRECT!</div>
                    <div class="result-amount">+40 ● Gold</div>
                </div>
            `;
            toast('Won 40 gold!', 'success');
        } else {
            document.getElementById('coinResult').innerHTML = `
                <div class="result-display lose">
                    <div class="result-text lose">Wrong call!</div>
                    <div class="result-amount">It was ${result === 'heads' ? '👑 Heads' : '🦅 Tails'}</div>
                </div>
            `;
        }
        
        setTimeout(() => {
            coinChoice = null;
            document.getElementById('choiceHeads').classList.remove('selected');
            document.getElementById('choiceTails').classList.remove('selected');
            btn.disabled = false;
        }, 1500);
    }, 2000);
}

// ==================== NUMBER GUESS ====================
let guessNum = null;

function renderGuess() {
    guessNum = null;
    return `
        <div class="guess-container">
            <div class="guess-display" id="guessDisplay">?</div>
            <div class="guess-numbers">
                ${[1,2,3,4,5,6,7,8,9,10].map(n => `
                    <button class="guess-num" id="guess${n}" onclick="selectGuess(${n})">${n}</button>
                `).join('')}
            </div>
            <button class="play-btn" id="guessBtn" onclick="makeGuess()" disabled>REVEAL (◆ 25)</button>
        </div>
        <div id="guessResult"></div>
    `;
}

function selectGuess(n) {
    guessNum = n;
    for (let i = 1; i <= 10; i++) {
        document.getElementById('guess' + i).classList.toggle('selected', i === n);
    }
    document.getElementById('guessBtn').disabled = false;
}

function makeGuess() {
    if (!guessNum) return;
    if (!spend('diamond', 25)) return;
    
    const btn = document.getElementById('guessBtn');
    btn.disabled = true;
    
    const answer = Math.floor(Math.random() * 10) + 1;
    const display = document.getElementById('guessDisplay');
    
    // Dramatic reveal
    let count = 0;
    const interval = setInterval(() => {
        display.textContent = Math.floor(Math.random() * 10) + 1;
        count++;
        if (count > 15) {
            clearInterval(interval);
            display.textContent = answer;
            
            if (answer === guessNum) {
                earn('gold', 250);
                document.getElementById('guessResult').innerHTML = `
                    <div class="result-display win">
                        <div class="result-text win">🎯 PERFECT!</div>
                        <div class="result-amount">+250 ● Gold (10x!)</div>
                    </div>
                `;
                toast('JACKPOT! Won 250 gold!', 'success');
            } else {
                document.getElementById('guessResult').innerHTML = `
                    <div class="result-display lose">
                        <div class="result-text lose">Not quite!</div>
                        <div class="result-amount">The number was ${answer}</div>
                    </div>
                `;
            }
            
            setTimeout(() => {
                guessNum = null;
                for (let i = 1; i <= 10; i++) {
                    document.getElementById('guess' + i).classList.remove('selected');
                }
                display.textContent = '?';
                btn.disabled = false;
            }, 2000);
        }
    }, 80);
}

// ==================== DICE ====================
function renderDice() {
    return `
        <div class="dice-container">
            <div class="dice-arena">
                <div class="dice-player">
                    <div class="dice-label">YOUR ROLL</div>
                    <div class="dice" id="playerDice">?</div>
                </div>
                <div class="dice-vs">VS</div>
                <div class="dice-player">
                    <div class="dice-label">DEALER</div>
                    <div class="dice dealer" id="dealerDice">?</div>
                </div>
            </div>
            <button class="play-btn" onclick="rollDice()">ROLL DICE (◆ 30)</button>
        </div>
        <div id="diceResult"></div>
    `;
}

function rollDice() {
    if (!spend('diamond', 30)) return;
    
    const playerDice = document.getElementById('playerDice');
    const dealerDice = document.getElementById('dealerDice');
    
    playerDice.classList.add('rolling');
    dealerDice.classList.add('rolling');
    
    const playerRoll = Math.floor(Math.random() * 6) + 1;
    const dealerRoll = Math.floor(Math.random() * 6) + 1;
    
    // Animate
    let count = 0;
    const interval = setInterval(() => {
        playerDice.textContent = Math.floor(Math.random() * 6) + 1;
        dealerDice.textContent = Math.floor(Math.random() * 6) + 1;
        count++;
        if (count > 20) {
            clearInterval(interval);
            playerDice.classList.remove('rolling');
            dealerDice.classList.remove('rolling');
            playerDice.textContent = playerRoll;
            dealerDice.textContent = dealerRoll;
            
            if (playerRoll >= dealerRoll) {
                const prize = playerRoll === 6 ? 100 : 60;
                earn('gold', prize);
                document.getElementById('diceResult').innerHTML = `
                    <div class="result-display win">
                        <div class="result-text win">🎉 YOU WIN!</div>
                        <div class="result-amount">+${prize} ● Gold</div>
                    </div>
                `;
                toast(`Won ${prize} gold!`, 'success');
            } else {
                document.getElementById('diceResult').innerHTML = `
                    <div class="result-display lose">
                        <div class="result-text lose">Dealer wins!</div>
                        <div class="result-amount">${dealerRoll} beats ${playerRoll}</div>
                    </div>
                `;
            }
        }
    }, 60);
}

// ==================== TREASURE ====================
function renderTreasure() {
    return `
        <div class="treasure-container">
            <p style="text-align:center;color:rgba(255,255,255,0.6);margin-bottom:16px;">Choose a chest wisely...</p>
            <div class="treasure-boxes">
                <div class="treasure-box" id="chest1" onclick="openChest(1)">📦</div>
                <div class="treasure-box" id="chest2" onclick="openChest(2)">📦</div>
                <div class="treasure-box" id="chest3" onclick="openChest(3)">📦</div>
            </div>
            <button class="play-btn" id="treasureBtn" onclick="buyTreasure()">PAY TO PLAY (◆ 50)</button>
        </div>
        <div id="treasureResult"></div>
    `;
}

let treasurePaid = false;
let treasurePrizes = [];
let treasureWinner = 0;

function buyTreasure() {
    if (!spend('diamond', 50)) return;
    treasurePaid = true;
    document.getElementById('treasureBtn').style.display = 'none';
    
    // Generate prizes
    treasureWinner = Math.floor(Math.random() * 3) + 1;
    const prizes = [
        { icon: '▣', amount: 30, type: 'stone' },
        { icon: '⬡', amount: 40, type: 'iron' },
        { icon: '●', amount: 75, type: 'gold' }
    ];
    
    // Shuffle and assign winner
    treasurePrizes = prizes.sort(() => Math.random() - 0.5);
    // Make winner chest have gold or better
    const goodPrize = Math.random() < 0.1 
        ? { icon: '⧫', amount: 5, type: 'wood' }
        : { icon: '●', amount: 100, type: 'gold' };
    treasurePrizes[treasureWinner - 1] = goodPrize;
}

function openChest(n) {
    if (!treasurePaid) {
        toast('Pay first!', 'error');
        return;
    }
    
    const chest = document.getElementById('chest' + n);
    if (chest.classList.contains('opened')) return;
    
    // Disable all chests
    [1, 2, 3].forEach(i => {
        const c = document.getElementById('chest' + i);
        c.classList.add('opened');
        c.style.pointerEvents = 'none';
    });
    
    const prize = treasurePrizes[n - 1];
    chest.textContent = prize.icon;
    chest.classList.add('winner');
    
    earn(prize.type, prize.amount);
    
    // Show what was in other chests
    setTimeout(() => {
        [1, 2, 3].forEach(i => {
            if (i !== n) {
                document.getElementById('chest' + i).textContent = treasurePrizes[i - 1].icon;
            }
        });
    }, 500);
    
    document.getElementById('treasureResult').innerHTML = `
        <div class="result-display win">
            <div class="result-text win">🎉 TREASURE!</div>
            <div class="result-amount">+${prize.amount} ${prize.icon}</div>
        </div>
    `;
    toast(`Found ${prize.amount} ${prize.type}!`, 'success');
    
    treasurePaid = false;
}

// =====================================================
// CURRENCY EXCHANGE SYSTEM
// =====================================================

let exchangeFrom = null;
let exchangeTo = null;

function openExchange(from, to) {
    if (!walletReady) {
        toast('Wallet not ready!', 'error');
        return;
    }
    
    exchangeFrom = from;
    exchangeTo = to;
    
    const fromData = CURRENCY_DATA[from];
    const toData = CURRENCY_DATA[to];
    const isUpgrade = toData.tier > fromData.tier;
    const rateKey = `${from}->${to}`;
    const rate = EXCHANGE_RATES[rateKey];
    const currentBalance = NW_WALLET.getBalance(from);
    
    // Update modal UI
    document.getElementById('exTitle').textContent = isUpgrade ? '▲ UPGRADE' : '▼ CONVERT';
    document.getElementById('exSubtitle').textContent = isUpgrade 
        ? `Trade ${fromData.name} for ${toData.name} (${rate}:1 rate)`
        : `Convert ${fromData.name} to ${toData.name} (1:${rate} rate)`;
    
    // Use NW_CURRENCY for premium icons
    if (typeof NW_CURRENCY !== 'undefined') {
        document.getElementById('exFromIcon').innerHTML = NW_CURRENCY.icon(from, { size: 32 });
        document.getElementById('exToIcon').innerHTML = NW_CURRENCY.icon(to, { size: 32 });
    } else {
        document.getElementById('exFromIcon').textContent = fromData.icon;
        document.getElementById('exToIcon').textContent = toData.icon;
    }
    document.getElementById('exFromName').textContent = fromData.name;
    document.getElementById('exFromBal').textContent = formatNum(currentBalance);
    document.getElementById('exToName').textContent = toData.name;
    
    document.getElementById('exAmount').value = isUpgrade ? rate : 1;
    document.getElementById('exAmount').max = currentBalance;
    
    updateExchangePreview();
    document.getElementById('exchangeModal').classList.add('active');
}

function closeExchange() {
    document.getElementById('exchangeModal').classList.remove('active');
    exchangeFrom = null;
    exchangeTo = null;
}

function setMaxExchange() {
    if (!walletReady) return;
    const max = NW_WALLET.getBalance(exchangeFrom);
    document.getElementById('exAmount').value = max;
    updateExchangePreview();
}

function updateExchangePreview() {
    const amount = parseInt(document.getElementById('exAmount').value) || 0;
    const fromData = CURRENCY_DATA[exchangeFrom];
    const toData = CURRENCY_DATA[exchangeTo];
    const isUpgrade = toData.tier > fromData.tier;
    const rateKey = `${exchangeFrom}->${exchangeTo}`;
    const rate = EXCHANGE_RATES[rateKey];
    
    let output = 0;
    if (isUpgrade) {
        output = Math.floor(amount / rate);
    } else {
        output = amount * rate;
    }
    
    document.getElementById('exToBal').textContent = `+${formatNum(output)}`;
    document.getElementById('exPreview').textContent = `+${formatNum(output)} ${toData.icon}`;
    
    // Enable/disable confirm button
    const currentBalance = walletReady ? NW_WALLET.getBalance(exchangeFrom) : 0;
    const canExchange = amount > 0 && amount <= currentBalance && output > 0;
    document.getElementById('exConfirm').disabled = !canExchange;
}

function confirmExchange() {
    if (!walletReady) {
        toast('Wallet not ready!', 'error');
        return;
    }
    
    const amount = parseInt(document.getElementById('exAmount').value) || 0;
    const fromData = CURRENCY_DATA[exchangeFrom];
    const toData = CURRENCY_DATA[exchangeTo];
    const isUpgrade = toData.tier > fromData.tier;
    const rateKey = `${exchangeFrom}->${exchangeTo}`;
    const rate = EXCHANGE_RATES[rateKey];
    
    let cost, output;
    if (isUpgrade) {
        output = Math.floor(amount / rate);
        cost = output * rate;
    } else {
        cost = amount;
        output = amount * rate;
    }
    
    const currentBalance = NW_WALLET.getBalance(exchangeFrom);
    if (cost > currentBalance) {
        toast('Not enough ' + fromData.name + '!', 'error');
        return;
    }
    
    if (output <= 0) {
        toast('Invalid exchange amount!', 'error');
        return;
    }
    
    // Execute exchange using secure wallet
    if (NW_WALLET.exchange(exchangeFrom, exchangeTo, cost, output)) {
        updateUI();
        closeExchange();
        
        // Success feedback
        toast(`Exchanged ${cost} ${fromData.icon} → ${output} ${toData.icon}`, 'success');
        
        // Special celebration for getting Logs
        if (exchangeTo === 'wood') {
            celebrateLogs(output);
        }
    } else {
        toast('Exchange failed!', 'error');
    }
}

function celebrateLogs(amount) {
    // Extra celebration for getting logs (the rarest currency)
    const el = document.getElementById('ex-wood');
    el.style.animation = 'none';
    el.offsetHeight; // Reflow
    el.style.animation = 'logCelebrate 0.6s ease-out';
}

function updateProgression() {
    if (!walletReady) return;
    
    const balances = NW_WALLET.getAllBalances();
    
    // Calculate total "value" in terms of diamond equivalent
    const values = {
        diamond: 1,
        gold: 100,
        iron: 5000,      // 100 * 50
        stone: 125000,   // 100 * 50 * 25
        wood: 12500000   // 100 * 50 * 25 * 100
    };
    
    const total = 
        (balances.diamond || 0) * values.diamond +
        (balances.gold || 0) * values.gold +
        (balances.iron || 0) * values.iron +
        (balances.stone || 0) * values.stone +
        (balances.wood || 0) * values.wood;
    
    // Max is having 100 logs worth
    const maxValue = 100 * values.wood;
    const percentage = Math.min(100, (total / maxValue) * 100);
    
    document.getElementById('progFill').style.width = percentage + '%';
    document.getElementById('progValue').textContent = percentage.toFixed(1) + '%';
}

// Init - Wallet initializes itself via nw-wallet.js
// We listen for 'nw-wallet-ready' event above

// Close modal on overlay click
document.getElementById('modalOverlay').addEventListener('click', (e) => {
    if (e.target.id === 'modalOverlay') closeGame();
});

document.getElementById('exchangeModal').addEventListener('click', (e) => {
    if (e.target.id === 'exchangeModal') closeExchange();
});

// Add CSS animation for log celebration
const style = document.createElement('style');
style.textContent = `
    @keyframes logCelebrate {
        0% { transform: scale(1); }
        25% { transform: scale(1.3); color: #ff00ff; }
        50% { transform: scale(1.1); }
        75% { transform: scale(1.2); }
        100% { transform: scale(1); }
    }
`;
document.head.appendChild(style);
