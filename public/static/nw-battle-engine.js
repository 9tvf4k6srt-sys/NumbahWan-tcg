// ═══════════════════════════════════════════════════════════════════════════
// ORIENTATION CHECK - DISABLED FOR NOW (was blocking game on some devices)
// Game works in both portrait and landscape - landscape recommended
// ═══════════════════════════════════════════════════════════════════════════
(function() {
    'use strict';
    // Orientation check disabled - let users play in any orientation
    // The game layout adapts to both portrait and landscape
    console.log('[Battle Arena] Orientation check disabled - works in both modes');
})();

// ═══════════════════════════════════════════════════════════════════════════
// NUMBAHWAN TCG - BATTLE ARENA v2.0
// Marvel Snap-Inspired Premium Battle Experience
// ═══════════════════════════════════════════════════════════════════════════

(function() {
    'use strict';
    
    // ═══════════════════════════════════════════════════════════════════
    // NW HELPER INTEGRATION - Use helpers when available
    // ═══════════════════════════════════════════════════════════════════
    
    // Audio mapping for NW_AUDIO integration
    const NW_AUDIO_MAP = {
        cardSlam: 'slam',
        attack: 'attack',
        hit: 'attack',
        crit: 'crit',
        death: 'death',
        select: 'select',
        turnEnd: 'turnEnd',
        victory: 'victory',
        defeat: 'defeat',
        countdown: 'tick',
        fight: 'fightStart',
        energy: 'energy',
        draw: 'draw'
    };
    
    // Play sound using NW_AUDIO if available, fallback to inline Audio
    function playSound(type) {
        // Try NW_AUDIO first
        if (typeof NW_AUDIO !== 'undefined' && NW_AUDIO.play) {
            const mappedType = NW_AUDIO_MAP[type] || type;
            NW_AUDIO.play(mappedType);
            return;
        }
        // Fallback to inline Audio
        if (typeof Audio !== 'undefined' && Audio.play) {
            Audio.play(type);
        }
    }
    
    // Show toast using NW_UI if available
    function showToast(message, type = 'info') {
        if (typeof NW_UI !== 'undefined' && NW_UI.toast) {
            NW_UI.toast(message, { type });
            return;
        }
        // Fallback to console
        console.log(`[${type.toUpperCase()}]`, message);
    }
    
    // Animate using NW_ANIM if available
    function animateElement(el, animation, options = {}) {
        if (typeof NW_ANIM !== 'undefined' && NW_ANIM[animation]) {
            return NW_ANIM[animation](el, options);
        }
        // Fallback - just add class
        el.classList.add(animation);
        setTimeout(() => el.classList.remove(animation), options.duration || 500);
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // CONFIGURATION
    // ═══════════════════════════════════════════════════════════════════
    const CONFIG = {
        MAX_GUILD_HP: 30,
        MAX_BOARD: 5,
        MAX_HAND: 7,
        STARTING_HAND: 4,
        MAX_ENERGY: 10,
        
        // Animation timings (ms)
        CARD_SLAM_DURATION: 500,
        ATTACK_DURATION: 600,
        HIT_DURATION: 400,
        DEATH_DURATION: 800,
        
        // Audio
        MASTER_VOLUME: 0.7
    };
    
    // ═══════════════════════════════════════════════════════════════════
    // GAME STATE
    // ═══════════════════════════════════════════════════════════════════
    const gameState = {
        playerHP: CONFIG.MAX_GUILD_HP,
        enemyHP: CONFIG.MAX_GUILD_HP,
        energy: 1,
        maxEnergy: 1,
        turn: 1,
        isPlayerTurn: true,
        
        playerHand: [],
        playerBoard: [null, null, null, null, null],
        enemyHand: [],
        enemyBoard: [null, null, null, null, null],
        
        playerDeck: [],
        enemyDeck: [],
        
        selectedCard: null,
        isAnimating: false,
        
        stats: {
            cardsPlayed: 0,
            damageDealt: 0,
            cardsKilled: 0
        }
    };
    
    // Card pool
    let CARDS = [];
    
    // ═══════════════════════════════════════════════════════════════════
    // AUDIO SYSTEM - Web Audio API for INSTANT playback (zero latency)
    // ═══════════════════════════════════════════════════════════════════
    const Audio = {
        ctx: null,
        buffers: {},
        volume: 0.8,
        muted: false,
        
        // Sound file mapping - Premium audio assets
        files: {
            // Battle core sounds
            cardSlam: '/static/audio/card-slam-heavy.mp3',
            attack: '/static/audio/attack-slash.mp3',
            hit: '/static/audio/attack-slash.mp3',
            crit: '/static/audio/critical-hit.mp3',
            death: '/static/audio/card-death.mp3',
            select: '/static/audio/ui-select.mp3',
            turnEnd: '/static/audio/turn-end.mp3',
            victory: '/static/audio/victory.mp3',
            defeat: '/static/audio/defeat.mp3',
            countdown: '/static/audio/countdown-tick.mp3',
            fight: '/static/audio/fight-start.mp3',
            energy: '/static/audio/energy-gain.mp3',
            draw: '/static/audio/card-draw.mp3',
            
            // Gacha pull sounds (addictive!)
            gachaAnticipation: '/static/audio/gacha-anticipation.mp3',
            gachaFlip: '/static/audio/gacha-flip.mp3',
            gachaCommon: '/static/audio/gacha-common.mp3',
            gachaRare: '/static/audio/gacha-rare.mp3',
            gachaEpic: '/static/audio/gacha-epic.mp3',
            gachaLegendary: '/static/audio/gacha-legendary.mp3',
            gachaMythic: '/static/audio/gacha-mythic.mp3'
        },
        
        // Initialize Web Audio context and preload all buffers
        async init() {
            try {
                this.ctx = new (window.AudioContext || window.webkitAudioContext)();
                
                // Load all sounds in parallel
                const loadPromises = Object.entries(this.files).map(async ([name, path]) => {
                    try {
                        const response = await fetch(path);
                        const arrayBuffer = await response.arrayBuffer();
                        const audioBuffer = await this.ctx.decodeAudioData(arrayBuffer);
                        this.buffers[name] = audioBuffer;
                    } catch (e) {
                        console.warn('[AUDIO] Failed to load:', name);
                    }
                });
                
                await Promise.all(loadPromises);
                console.log('[AUDIO] Loaded:', Object.keys(this.buffers).join(', '));
            } catch (e) {
                console.warn('[AUDIO] Web Audio not supported');
            }
        },
        
        // Play sound INSTANTLY using pre-decoded buffer
        play(type) {
            if (this.muted || !this.ctx) return;
            
            const buffer = this.buffers[type];
            if (!buffer) return;
            
            try {
                // Resume context if suspended (required for mobile)
                if (this.ctx.state === 'suspended') this.ctx.resume();
                
                // Create source and gain nodes
                const source = this.ctx.createBufferSource();
                const gainNode = this.ctx.createGain();
                
                source.buffer = buffer;
                gainNode.gain.value = this.volume;
                
                source.connect(gainNode);
                gainNode.connect(this.ctx.destination);
                
                // Play IMMEDIATELY - no delay!
                source.start(0);
            } catch (e) {
                // Fail silently
            }
        },
        
        // Set volume (0-1)
        setVolume(v) {
            this.volume = Math.max(0, Math.min(1, v));
        },
        
        // Mute/unmute
        mute() { this.muted = true; },
        unmute() { this.muted = false; },
        toggle() { 
            this.muted = !this.muted; 
            return !this.muted;
        }
    };
    
    // ═══════════════════════════════════════════════════════════════════
    // VISUAL EFFECTS
    // ═══════════════════════════════════════════════════════════════════
    const Effects = {
        screenShake(intensity = 'normal') {
            const container = document.getElementById('arenaContainer');
            container.classList.remove('shaking', 'shaking-heavy');
            void container.offsetWidth; // Force reflow
            container.classList.add(intensity === 'heavy' ? 'shaking-heavy' : 'shaking');
            setTimeout(() => container.classList.remove('shaking', 'shaking-heavy'), 500);
        },
        
        screenFlash(color = '#fff') {
            const flash = document.getElementById('screenFlash');
            flash.style.background = color;
            flash.classList.remove('active');
            void flash.offsetWidth;
            flash.classList.add('active');
            setTimeout(() => flash.classList.remove('active'), 300);
        },
        
        impactRing(x, y, color = '#ffd700') {
            const ring = document.createElement('div');
            ring.className = 'impact-ring';
            ring.style.cssText = `left:${x}px;top:${y}px;width:50px;height:50px;border-color:${color}`;
            document.body.appendChild(ring);
            setTimeout(() => ring.remove(), 500);
        },
        
        showDamage(element, value, isCrit = false, isHeal = false) {
            const rect = element.getBoundingClientRect();
            const dmg = document.createElement('div');
            dmg.className = `damage-number${isCrit ? ' crit' : ''}${isHeal ? ' heal' : ''}`;
            dmg.textContent = isHeal ? `+${value}` : `-${value}`;
            dmg.style.left = rect.left + rect.width/2 + (Math.random() - 0.5) * 30 + 'px';
            dmg.style.top = rect.top + rect.height/3 + 'px';
            document.body.appendChild(dmg);
            setTimeout(() => dmg.remove(), 1200);
        },
        
        showMiss(element) {
            const rect = element.getBoundingClientRect();
            const miss = document.createElement('div');
            miss.className = 'damage-number miss';
            miss.textContent = 'DODGE!';
            miss.style.left = rect.left + rect.width/2 + 'px';
            miss.style.top = rect.top + rect.height/3 + 'px';
            document.body.appendChild(miss);
            setTimeout(() => miss.remove(), 1200);
        },
        
        createParticles() {
            const container = document.getElementById('arenaParticles');
            for (let i = 0; i < 30; i++) {
                const p = document.createElement('div');
                p.className = 'particle';
                p.style.left = Math.random() * 100 + '%';
                p.style.animationDelay = Math.random() * 20 + 's';
                p.style.animationDuration = (15 + Math.random() * 10) + 's';
                const colors = ['#ffd700', '#ff6b00', '#a855f7', '#00ffff'];
                p.style.background = colors[Math.floor(Math.random() * colors.length)];
                p.style.width = (2 + Math.random() * 4) + 'px';
                p.style.height = p.style.width;
                container.appendChild(p);
            }
        }
    };
    
    // ═══════════════════════════════════════════════════════════════════
    // RENDERING
    // ═══════════════════════════════════════════════════════════════════
    
    function renderHP() {
        const playerPct = Math.max(0, gameState.playerHP / CONFIG.MAX_GUILD_HP * 100);
        const enemyPct = Math.max(0, gameState.enemyHP / CONFIG.MAX_GUILD_HP * 100);
        
        document.getElementById('playerHpFill').style.width = playerPct + '%';
        document.getElementById('enemyHpFill').style.width = enemyPct + '%';
        
        document.getElementById('playerHpValue').textContent = Math.max(0, gameState.playerHP);
        document.getElementById('enemyHpValue').textContent = Math.max(0, gameState.enemyHP);
        
        // Update colors
        const playerVal = document.getElementById('playerHpValue');
        const enemyVal = document.getElementById('enemyHpValue');
        const playerFill = document.getElementById('playerHpFill');
        const enemyFill = document.getElementById('enemyHpFill');
        
        playerVal.classList.toggle('low', playerPct <= 30);
        playerVal.classList.toggle('mid', playerPct > 30 && playerPct <= 60);
        enemyVal.classList.toggle('low', enemyPct <= 30);
        enemyVal.classList.toggle('mid', enemyPct > 30 && enemyPct <= 60);
        
        playerFill.classList.toggle('low', playerPct <= 30);
        playerFill.classList.toggle('mid', playerPct > 30 && playerPct <= 60);
        enemyFill.classList.toggle('low', enemyPct <= 30);
        enemyFill.classList.toggle('mid', enemyPct > 30 && enemyPct <= 60);
    }
    
    function renderEnergy() {
        const container = document.getElementById('energyCrystals');
        container.innerHTML = '';
        
        for (let i = 0; i < gameState.maxEnergy; i++) {
            const crystal = document.createElement('div');
            crystal.className = 'energy-crystal' + (i >= gameState.energy ? ' spent' : '');
            container.appendChild(crystal);
        }
    }
    
    function renderTurnIndicator() {
        const indicator = document.getElementById('turnIndicator');
        indicator.textContent = gameState.isPlayerTurn ? 'YOUR TURN' : 'ENEMY TURN';
        indicator.className = 'turn-indicator ' + (gameState.isPlayerTurn ? 'your-turn' : 'enemy-turn');
    }
    
    function renderHand() {
        const container = document.getElementById('playerHand');
        container.innerHTML = '';
        
        gameState.playerHand.forEach((card, idx) => {
            const canPlay = card.gameStats.cost <= gameState.energy && gameState.isPlayerTurn;
            
            const cardEl = document.createElement('div');
            cardEl.className = `hand-card ${card.rarity || ''}${canPlay ? '' : ' unplayable'}${gameState.selectedCard === idx ? ' selected' : ''}`;
            cardEl.dataset.idx = idx;
            
            // Simple flat card - just image + stats overlay + cost badge
            // Use placeholder as default since many card images don't exist yet
            const imgFile = card.img || 'placeholder.webp';
            cardEl.innerHTML = `
                <img class="hand-card-art" 
                     src="/static/images/cards/thumbs/${imgFile}" 
                     onerror="this.onerror=null; this.src='/static/images/cards/placeholder.webp';"
                     alt="${card.name}"
                     draggable="false">
                <div class="hand-card-stats">
                    <span class="hand-stat atk">⚔${card.gameStats.atk}</span>
                    <span class="hand-stat hp">❤${card.gameStats.hp}</span>
                </div>
                <div class="cost-badge">${card.gameStats.cost}</div>
            `;
            
            // ═══════════════════════════════════════════════════════════════
            // TOUCH/MOUSE HANDLING
            // Tap = view details | Drag = pick up and place
            // ═══════════════════════════════════════════════════════════════
            
            let touchStartTime = 0;
            let touchStartPos = { x: 0, y: 0 };
            let hasMoved = false;
            
            // TOUCH: Start
            cardEl.addEventListener('touchstart', (e) => {
                touchStartTime = Date.now();
                touchStartPos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
                hasMoved = false;
                
                // Start drag immediately if playable
                if (canPlay) {
                    DragDrop.start(cardEl, card, idx, e);
                }
            }, { passive: false });
            
            // TOUCH: Move - track if actually moved
            cardEl.addEventListener('touchmove', (e) => {
                if (!hasMoved && canPlay) {
                    const dx = Math.abs(e.touches[0].clientX - touchStartPos.x);
                    const dy = Math.abs(e.touches[0].clientY - touchStartPos.y);
                    if (dx > 10 || dy > 10) {
                        hasMoved = true;
                    }
                }
            }, { passive: true });
            
            // TOUCH: End - if quick tap without moving, show modal
            cardEl.addEventListener('touchend', (e) => {
                const duration = Date.now() - touchStartTime;
                // Quick tap (< 150ms) without significant movement = view card
                if (duration < 150 && !hasMoved && !DragDrop.isDragging) {
                    e.preventDefault();
                    showCardDetailModal(card, idx, 'hand');
                }
            });
            
            // MOUSE: Click to select (desktop)
            cardEl.addEventListener('click', (e) => {
                if (DragDrop.isDragging) return;
                // On desktop, clicking selects the card
                if (!isMobileOrTablet() && canPlay) {
                    selectHandCard(idx);
                }
            });
            
            // MOUSE: Drag start
            cardEl.addEventListener('mousedown', (e) => {
                if (e.button !== 0 || !canPlay) return;
                DragDrop.start(cardEl, card, idx, e);
            });
            
            // MOUSE: Hover tooltip (desktop only)
            cardEl.addEventListener('mouseenter', (e) => {
                if (!DragDrop.isDragging && !isMobileOrTablet()) showTooltip(card, e);
            });
            cardEl.addEventListener('mouseleave', hideTooltip);
            
            container.appendChild(cardEl);
        });
        
        document.getElementById('handCount').textContent = `${gameState.playerHand.length}/${CONFIG.MAX_HAND}`;
    }
    
    function renderBoards() {
        // Player board
        const playerBoardEl = document.getElementById('playerBoard');
        playerBoardEl.querySelectorAll('.board-slot').forEach((slot, idx) => {
            renderBoardSlot(slot, gameState.playerBoard[idx], idx, false);
        });
        
        // Enemy board
        const enemyBoardEl = document.getElementById('enemyBoard');
        enemyBoardEl.querySelectorAll('.board-slot').forEach((slot, idx) => {
            renderBoardSlot(slot, gameState.enemyBoard[idx], idx, true);
        });
    }
    
    function renderBoardSlot(slot, card, idx, isEnemy) {
        slot.classList.toggle('has-card', !!card);
        
        if (card) {
            slot.innerHTML = `
                <div class="board-card ${card.rarity}" data-instance="${card.instanceId}">
                    <div class="board-card-inner">
                        <img class="board-card-art" src="/static/images/cards/thumbs/${card.img || 'placeholder.webp'}" 
                             onerror="this.onerror=null; this.src='/static/images/cards/placeholder.webp';" alt="${card.name}">
                        <div class="board-card-stats">
                            <div class="stat-box stat-atk">⚔${card.currentAtk}</div>
                            <div class="stat-box stat-hp">❤${card.currentHp}</div>
                        </div>
                    </div>
                    ${card.abilities?.length ? `<div class="ability-badge">${card.abilities[0]}</div>` : ''}
                </div>
            `;
            
            const cardEl = slot.querySelector('.board-card');
            cardEl.onmouseenter = (e) => showTooltip(card, e);
            cardEl.onmouseleave = hideTooltip;
            
            // Mobile: tap on card shows detail modal
            // Desktop: clicking enemy card attacks, hovering shows tooltip
            if (isEnemy) {
                slot.onclick = (e) => {
                    if (isMobileOrTablet()) {
                        e.preventDefault();
                        showCardDetailModal(card, idx, 'board-enemy');
                    } else {
                        attackTarget(idx);
                    }
                };
            } else {
                // Player board card - show details on mobile
                cardEl.onclick = (e) => {
                    if (isMobileOrTablet()) {
                        e.preventDefault();
                        e.stopPropagation();
                        showCardDetailModal(card, idx, 'board-player');
                    }
                };
            }
        } else {
            slot.innerHTML = '';
            // Empty slots - play card to slot (for player board only)
            slot.onclick = isEnemy ? null : () => playCardToSlot(idx);
        }
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // TOOLTIP (Desktop) & CARD DETAIL MODAL (Mobile)
    // ═══════════════════════════════════════════════════════════════════
    
    // Detect mobile/tablet
    const isMobileOrTablet = () => window.innerWidth <= 768 || 'ontouchstart' in window;
    
    // Current card being shown in modal (for action buttons)
    let modalCard = null;
    let modalCardIndex = null;
    let modalCardSource = null; // 'hand' or 'board'
    
    function showTooltip(card, event) {
        // On mobile, tooltips are hidden via CSS - this won't show
        const tooltip = document.getElementById('cardTooltip');
        
        document.getElementById('tooltipName').textContent = card.name;
        document.getElementById('tooltipRarity').textContent = card.rarity.toUpperCase();
        document.getElementById('tooltipRarity').className = `tooltip-rarity ${card.rarity}`;
        document.getElementById('tooltipAtk').textContent = card.currentAtk || card.gameStats.atk;
        document.getElementById('tooltipHp').textContent = card.currentHp || card.gameStats.hp;
        document.getElementById('tooltipCost').textContent = card.gameStats.cost;
        
        const abilitiesEl = document.getElementById('tooltipAbilities');
        if (card.abilities?.length) {
            abilitiesEl.innerHTML = card.abilities.map(a => 
                `<span class="tooltip-ability">${a}</span>`
            ).join('');
        } else {
            abilitiesEl.innerHTML = '<em style="opacity:0.5">No abilities</em>';
        }
        
        const rect = event.target.getBoundingClientRect();
        let left = rect.right + 10;
        let top = rect.top;
        
        if (left + 280 > window.innerWidth) {
            left = rect.left - 290;
        }
        if (top + 200 > window.innerHeight) {
            top = window.innerHeight - 210;
        }
        
        tooltip.style.left = left + 'px';
        tooltip.style.top = top + 'px';
        tooltip.classList.add('show');
    }
    
    function hideTooltip() {
        document.getElementById('cardTooltip').classList.remove('show');
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // MOBILE CARD DETAIL MODAL
    // ═══════════════════════════════════════════════════════════════════
    
    function showCardDetailModal(card, index, source) {
        modalCard = card;
        modalCardIndex = index;
        modalCardSource = source;
        
        const modal = document.getElementById('cardDetailModal');
        const imgContainer = document.getElementById('cardDetailImage');
        const img = document.getElementById('cardDetailImg');
        const nameEl = document.getElementById('cardDetailName');
        const rarityEl = document.getElementById('cardDetailRarity');
        const atkEl = document.getElementById('cardDetailAtk');
        const hpEl = document.getElementById('cardDetailHp');
        const costEl = document.getElementById('cardDetailCost');
        const abilitiesEl = document.getElementById('cardDetailAbilities');
        const actionsEl = document.getElementById('cardDetailActions');
        const selectBtn = document.getElementById('cardDetailSelect');
        
        // Set card image
        const imgFile = card.img?.replace(/\\.(png|jpg)$/i, '.webp') || 'placeholder.webp';
        img.src = `/static/images/cards/${imgFile}`;
        img.onerror = () => { img.src = '/static/images/cards/placeholder.webp'; };
        img.alt = card.name;
        
        // Set rarity glow on image container
        imgContainer.className = 'card-detail-image ' + (card.rarity || 'common');
        
        // Set card info
        nameEl.textContent = card.name;
        rarityEl.textContent = (card.rarity || 'common').toUpperCase();
        rarityEl.className = 'card-detail-rarity ' + (card.rarity || 'common');
        
        // Set stats (use current values if on board, otherwise base stats)
        atkEl.textContent = card.currentAtk ?? card.gameStats?.atk ?? '?';
        hpEl.textContent = card.currentHp ?? card.gameStats?.hp ?? '?';
        costEl.textContent = card.gameStats?.cost ?? '?';
        
        // Set abilities
        if (card.abilities?.length) {
            abilitiesEl.innerHTML = card.abilities.map(a => 
                `<span class="card-detail-ability">${a}</span>`
            ).join('');
        } else {
            abilitiesEl.innerHTML = '<span style="opacity: 0.5; font-style: italic;">No special abilities</span>';
        }
        
        // Configure action buttons based on source
        if (source === 'hand') {
            actionsEl.style.display = 'flex';
            const canPlay = card.gameStats?.cost <= gameState.energy && gameState.isPlayerTurn && !gameState.isAnimating;
            selectBtn.disabled = !canPlay;
            selectBtn.textContent = canPlay ? '✨ SELECT TO PLAY' : 
                (card.gameStats?.cost > gameState.energy ? '◆ NOT ENOUGH ENERGY' : '⏳ NOT YOUR TURN');
        } else if (source === 'board-player') {
            actionsEl.style.display = 'flex';
            const canAttack = card.canAttackThisTurn && !card.hasAttacked && gameState.isPlayerTurn && !gameState.isAnimating;
            selectBtn.disabled = !canAttack;
            selectBtn.textContent = canAttack ? '⚔️ READY TO ATTACK' : 
                (card.hasAttacked ? '😴 ALREADY ATTACKED' : '⏳ CANNOT ATTACK YET');
        } else {
            // Enemy board card - just viewing
            actionsEl.style.display = 'none';
        }
        
        // Show modal with animation
        modal.classList.add('show');
        Audio.play('select');
        
        // Prevent body scroll
        document.body.style.overflow = 'hidden';
    }
    
    function hideCardDetailModal() {
        const modal = document.getElementById('cardDetailModal');
        modal.classList.remove('show');
        modal.classList.remove('compact-mode'); // Exit compact mode
        modalCard = null;
        modalCardIndex = null;
        modalCardSource = null;
        
        // Reset to actions view (hide slot selection)
        const actionsEl = document.getElementById('cardDetailActions');
        const slotsEl = document.getElementById('cardDetailSlots');
        const hintEl = document.getElementById('cardDetailHint');
        if (actionsEl) actionsEl.style.display = 'flex';
        if (slotsEl) slotsEl.style.display = 'none';
        if (hintEl) hintEl.textContent = 'Tap outside or close button to dismiss';
        
        // Restore body scroll
        document.body.style.overflow = '';
    }
    
    // Modal event listeners
    function initCardDetailModal() {
        const modal = document.getElementById('cardDetailModal');
        const closeBtn = document.getElementById('cardDetailClose');
        const cancelBtn = document.getElementById('cardDetailCancel');
        const selectBtn = document.getElementById('cardDetailSelect');
        const backBtn = document.getElementById('cardDetailBack');
        const actionsEl = document.getElementById('cardDetailActions');
        const slotsEl = document.getElementById('cardDetailSlots');
        const slotButtonsEl = document.getElementById('slotButtons');
        const hintEl = document.getElementById('cardDetailHint');
        
        // Close on X button
        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            hideCardDetailModal();
        });
        
        // Close on cancel button
        cancelBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            hideCardDetailModal();
        });
        
        // Close on backdrop click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                hideCardDetailModal();
            }
        });
        
        // SELECT button - show slot selection
        selectBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (modalCardSource === 'hand' && modalCardIndex !== null) {
                // Show slot selection instead of closing
                showSlotSelection();
            }
        });
        
        // BACK button - return to card actions
        backBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            hideSlotSelection();
        });
        
        // Close on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal.classList.contains('show')) {
                hideCardDetailModal();
            }
        });
    }
    
    // Show slot selection buttons - COMPACT MODE so you can see board!
    function showSlotSelection() {
        const modal = document.getElementById('cardDetailModal');
        const actionsEl = document.getElementById('cardDetailActions');
        const slotsEl = document.getElementById('cardDetailSlots');
        const slotButtonsEl = document.getElementById('slotButtons');
        const hintEl = document.getElementById('cardDetailHint');
        
        // Switch to compact mode - modal moves to bottom, you can see the board!
        modal.classList.add('compact-mode');
        
        // Update compact header with card info
        if (modalCard) {
            const imgFile = modalCard.img?.replace(/\.(png|jpg)$/i, '.webp') || 'placeholder.webp';
            const compactImg = document.getElementById('cardDetailImgCompact');
            const compactImgContainer = document.getElementById('cardDetailImageCompact');
            compactImg.src = `/static/images/cards/${imgFile}`;
            compactImg.onerror = () => { compactImg.src = '/static/images/cards/placeholder.webp'; };
            compactImgContainer.className = 'card-detail-image ' + (modalCard.rarity || 'common');
            
            document.getElementById('cardDetailNameCompact').textContent = modalCard.name;
            document.getElementById('compactAtk').textContent = modalCard.gameStats?.atk || '?';
            document.getElementById('compactHp').textContent = modalCard.gameStats?.hp || '?';
            document.getElementById('compactCost').textContent = modalCard.gameStats?.cost || '?';
        }
        
        // Generate slot buttons
        slotButtonsEl.innerHTML = '';
        for (let i = 0; i < CONFIG.MAX_BOARD; i++) {
            const isOccupied = gameState.playerBoard[i] !== null;
            const btn = document.createElement('button');
            btn.className = `slot-btn ${isOccupied ? 'occupied' : ''}`;
            btn.textContent = isOccupied ? '✗' : (i + 1);
            btn.disabled = isOccupied;
            
            if (!isOccupied) {
                btn.onclick = (e) => {
                    e.stopPropagation();
                    playCardToSlotFromModal(i);
                };
            }
            
            slotButtonsEl.appendChild(btn);
        }
        
        // Switch views
        actionsEl.style.display = 'none';
        slotsEl.style.display = 'block';
        hintEl.textContent = 'You can see the board above! Tap a slot.';
        
        Audio.play('select');
    }
    
    // Hide slot selection, show actions, exit compact mode
    function hideSlotSelection() {
        const modal = document.getElementById('cardDetailModal');
        const actionsEl = document.getElementById('cardDetailActions');
        const slotsEl = document.getElementById('cardDetailSlots');
        const hintEl = document.getElementById('cardDetailHint');
        
        modal.classList.remove('compact-mode');
        actionsEl.style.display = 'flex';
        slotsEl.style.display = 'none';
        hintEl.textContent = 'Tap outside or close button to dismiss';
    }
    
    // Play card directly from modal
    async function playCardToSlotFromModal(slotIdx) {
        if (modalCardIndex === null || gameState.playerBoard[slotIdx] || gameState.isAnimating) return;
        
        const card = gameState.playerHand[modalCardIndex];
        if (!card || card.gameStats.cost > gameState.energy) return;
        
        // Close modal first
        hideCardDetailModal();
        
        // Small delay for visual feedback
        await new Promise(r => setTimeout(r, 100));
        
        // Select the card
        gameState.selectedCard = modalCardIndex;
        
        // Play to slot
        await playCardToSlot(slotIdx);
    }
    
    // Handle card tap/click - shows modal on mobile, normal behavior on desktop
    function handleCardInteraction(card, index, source, event) {
        if (isMobileOrTablet()) {
            event.preventDefault();
            event.stopPropagation();
            showCardDetailModal(card, index, source);
        } else if (source === 'hand') {
            selectHandCard(index);
        }
        // Board cards on desktop: handled by their own click handlers
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // GAME LOGIC
    // ═══════════════════════════════════════════════════════════════════
    
    function selectHandCard(idx) {
        const card = gameState.playerHand[idx];
        if (!card || card.gameStats.cost > gameState.energy || !gameState.isPlayerTurn || gameState.isAnimating) return;
        
        gameState.selectedCard = gameState.selectedCard === idx ? null : idx;
        Audio.play('select');
        renderHand();
    }
    
    async function playCardToSlot(slotIdx) {
        if (gameState.selectedCard === null || gameState.playerBoard[slotIdx] || gameState.isAnimating) return;
        
        const card = gameState.playerHand[gameState.selectedCard];
        if (card.gameStats.cost > gameState.energy) return;
        
        gameState.isAnimating = true;
        
        // Pay cost
        gameState.energy -= card.gameStats.cost;
        
        // Prepare card for board
        const boardCard = {
            ...card,
            instanceId: Date.now() + Math.random(),
            currentAtk: card.gameStats.atk,
            currentHp: card.gameStats.hp,
            maxHp: card.gameStats.hp,
            canAttackThisTurn: card.abilities?.includes('RUSH'),
            hasAttacked: false
        };
        
        gameState.playerBoard[slotIdx] = boardCard;
        gameState.playerHand.splice(gameState.selectedCard, 1);
        gameState.selectedCard = null;
        gameState.stats.cardsPlayed++;
        
        // Render immediately
        renderHand();
        renderEnergy();
        renderBoards();
        
        // Animate slam
        const slot = document.querySelector(`#playerBoard .board-slot[data-slot="${slotIdx}"]`);
        const cardEl = slot.querySelector('.board-card');
        
        if (cardEl) {
            cardEl.classList.add('slamming');
            Audio.play('cardSlam');
            Effects.screenShake('normal');
            
            // Impact effect
            const rect = slot.getBoundingClientRect();
            Effects.impactRing(rect.left + rect.width/2, rect.top + rect.height/2);
            
            await sleep(CONFIG.CARD_SLAM_DURATION);
            cardEl.classList.remove('slamming');
        }
        
        // Battlecry
        handleBattlecry(boardCard, false, slotIdx);
        
        addLog(`You summon <span style="color:var(--gold)">${boardCard.name}</span>!`, 'summon');
        
        updateAttackButton();
        gameState.isAnimating = false;
    }
    
    async function attackTarget(targetIdx) {
        if (!gameState.isPlayerTurn || gameState.isAnimating) return;
        
        // Find attacker
        const attackerIdx = gameState.playerBoard.findIndex(c => 
            c && c.canAttackThisTurn && !c.hasAttacked
        );
        
        if (attackerIdx === -1) return;
        
        const attacker = gameState.playerBoard[attackerIdx];
        const target = gameState.enemyBoard[targetIdx];
        
        // Check taunt
        const hasTaunt = gameState.enemyBoard.some(c => c && c.abilities?.includes('TAUNT'));
        if (hasTaunt && (!target || !target.abilities?.includes('TAUNT'))) {
            addLog('Must attack TAUNT first!', 'ability');
            return;
        }
        
        gameState.isAnimating = true;
        
        // Calculate damage
        let damage = attacker.currentAtk;
        let isCrit = false;
        
        const critChance = attacker.gameStats?.crit || 0;
        if (Math.random() * 100 < critChance) {
            damage *= 2;
            isCrit = true;
        }
        
        // Get elements
        const attackerSlot = document.querySelector(`#playerBoard .board-slot[data-slot="${attackerIdx}"]`);
        const attackerCard = attackerSlot?.querySelector('.board-card');
        
        // Attack animation
        if (attackerCard) {
            attackerCard.classList.add('attacking');
            Audio.play('attack');
        }
        
        await sleep(CONFIG.ATTACK_DURATION * 0.4);
        
        if (target) {
            // Attack card
            const targetSlot = document.querySelector(`#enemyBoard .board-slot[data-slot="${targetIdx}"]`);
            const targetCard = targetSlot?.querySelector('.board-card');
            
            // Check dodge
            const dodgeChance = target.gameStats?.dodge || 0;
            if (Math.random() * 100 < dodgeChance) {
                Audio.play('select');
                if (targetCard) Effects.showMiss(targetCard);
                addLog(`${target.name} dodges!`, 'ability');
            } else {
                // Deal damage
                target.currentHp -= damage;
                gameState.stats.damageDealt += damage;
                
                Audio.play(isCrit ? 'crit' : 'hit');
                Effects.screenShake(isCrit ? 'heavy' : 'normal');
                if (isCrit) Effects.screenFlash('#ffd700');
                
                if (targetCard) {
                    targetCard.classList.add('hit');
                    Effects.showDamage(targetCard, damage, isCrit);
                    
                    const rect = targetSlot.getBoundingClientRect();
                    Effects.impactRing(rect.left + rect.width/2, rect.top + rect.height/2, isCrit ? '#ffd700' : '#ff4444');
                }
                
                addLog(`${attacker.name} deals ${damage}${isCrit ? ' CRIT' : ''} to ${target.name}!`, isCrit ? 'crit' : 'damage');
                
                await sleep(CONFIG.HIT_DURATION);
                if (targetCard) targetCard.classList.remove('hit');
                
                // Check death
                if (target.currentHp <= 0) {
                    await handleDeath(target, targetIdx, true);
                }
            }
        } else {
            // Attack face
            gameState.enemyHP -= damage;
            gameState.stats.damageDealt += damage;
            
            Audio.play(isCrit ? 'crit' : 'hit');
            Effects.screenShake('heavy');
            Effects.screenFlash(isCrit ? '#ffd700' : '#ff4444');
            
            const hpBar = document.getElementById('enemyHpBar');
            hpBar.classList.add('damaged');
            setTimeout(() => hpBar.classList.remove('damaged'), 300);
            
            addLog(`${attacker.name} deals ${damage}${isCrit ? ' CRIT' : ''} to ENEMY GUILD!`, isCrit ? 'crit' : 'damage');
            
            renderHP();
            checkGameOver();
        }
        
        await sleep(200);
        if (attackerCard) attackerCard.classList.remove('attacking');
        
        attacker.hasAttacked = true;
        renderBoards();
        updateAttackButton();
        
        gameState.isAnimating = false;
    }
    
    async function handleDeath(card, slot, isOnEnemyBoard) {
        Audio.play('death');
        Effects.screenShake('normal');
        
        const boardEl = isOnEnemyBoard ? document.getElementById('enemyBoard') : document.getElementById('playerBoard');
        const slotEl = boardEl.querySelector(`[data-slot="${slot}"]`);
        const cardEl = slotEl?.querySelector('.board-card');
        
        if (cardEl) {
            cardEl.classList.add('dying');
            await sleep(CONFIG.DEATH_DURATION);
        }
        
        const board = isOnEnemyBoard ? gameState.enemyBoard : gameState.playerBoard;
        board[slot] = null;
        
        gameState.stats.cardsKilled++;
        addLog(`${card.name} is destroyed!`, 'damage');
        
        renderBoards();
    }
    
    function handleBattlecry(card, isEnemy, slotIdx) {
        if (!card.abilities) return;
        
        if (card.abilities.includes('BUFF')) {
            const board = isEnemy ? gameState.enemyBoard : gameState.playerBoard;
            const allies = board.filter((c, i) => c && i !== slotIdx);
            if (allies.length > 0) {
                const target = allies[Math.floor(Math.random() * allies.length)];
                target.currentAtk += 2;
                target.currentHp += 2;
                target.maxHp += 2;
                addLog(`${card.name} buffs ${target.name} +2/+2!`, 'ability');
            }
        }
        
        // Add more battlecry effects as needed
    }
    
    function updateAttackButton() {
        const canAttack = gameState.playerBoard.some(c => 
            c && c.canAttackThisTurn && !c.hasAttacked
        );
        document.getElementById('attackBtn').disabled = !canAttack || !gameState.isPlayerTurn;
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // TURN MANAGEMENT
    // ═══════════════════════════════════════════════════════════════════
    
    async function endTurn() {
        if (!gameState.isPlayerTurn || gameState.isAnimating) return;
        
        Audio.play('turnEnd');
        gameState.isPlayerTurn = false;
        renderTurnIndicator();
        
        // Enemy turn
        await sleep(500);
        await enemyTurn();
        
        // New turn
        startNewTurn();
    }
    
    async function enemyTurn() {
        addLog('--- ENEMY TURN ---', '');
        
        // Draw card (simplified)
        if (gameState.enemyDeck.length > 0 && gameState.enemyHand.length < CONFIG.MAX_HAND) {
            gameState.enemyHand.push(gameState.enemyDeck.pop());
        }
        
        // Play cards
        const enemyEnergy = Math.min(gameState.turn, CONFIG.MAX_ENERGY);
        let spent = 0;
        
        for (let i = gameState.enemyHand.length - 1; i >= 0; i--) {
            const card = gameState.enemyHand[i];
            if (card.gameStats.cost <= enemyEnergy - spent) {
                const emptySlot = gameState.enemyBoard.findIndex(s => s === null);
                if (emptySlot !== -1) {
                    spent += card.gameStats.cost;
                    
                    const boardCard = {
                        ...card,
                        instanceId: Date.now() + Math.random(),
                        currentAtk: card.gameStats.atk,
                        currentHp: card.gameStats.hp,
                        maxHp: card.gameStats.hp,
                        canAttackThisTurn: false,
                        hasAttacked: false
                    };
                    
                    gameState.enemyBoard[emptySlot] = boardCard;
                    gameState.enemyHand.splice(i, 1);
                    
                    renderBoards();
                    
                    const slot = document.querySelector(`#enemyBoard .board-slot[data-slot="${emptySlot}"]`);
                    const cardEl = slot?.querySelector('.board-card');
                    if (cardEl) {
                        cardEl.classList.add('slamming');
                        Audio.play('cardSlam');
                        Effects.screenShake('normal');
                    }
                    
                    addLog(`Enemy summons ${boardCard.name}!`, 'summon');
                    await sleep(600);
                    if (cardEl) cardEl.classList.remove('slamming');
                }
            }
        }
        
        await sleep(300);
        
        // Attack with cards that can attack
        for (let i = 0; i < gameState.enemyBoard.length; i++) {
            const attacker = gameState.enemyBoard[i];
            if (attacker && attacker.canAttackThisTurn && !attacker.hasAttacked) {
                // Find target
                const playerCards = gameState.playerBoard.filter(c => c);
                const tauntCards = playerCards.filter(c => c.abilities?.includes('TAUNT'));
                
                let targetIdx = -1;
                
                if (tauntCards.length > 0) {
                    // Must attack taunt
                    targetIdx = gameState.playerBoard.findIndex(c => c && c.abilities?.includes('TAUNT'));
                } else if (playerCards.length > 0) {
                    // Attack random card
                    const validTargets = gameState.playerBoard.map((c, idx) => c ? idx : -1).filter(idx => idx !== -1);
                    targetIdx = validTargets[Math.floor(Math.random() * validTargets.length)];
                }
                
                await enemyAttack(i, targetIdx);
                attacker.hasAttacked = true;
            }
        }
    }
    
    async function enemyAttack(attackerIdx, targetIdx) {
        const attacker = gameState.enemyBoard[attackerIdx];
        const target = targetIdx >= 0 ? gameState.playerBoard[targetIdx] : null;
        
        let damage = attacker.currentAtk;
        let isCrit = Math.random() < 0.1;
        if (isCrit) damage *= 2;
        
        const attackerSlot = document.querySelector(`#enemyBoard .board-slot[data-slot="${attackerIdx}"]`);
        const attackerCard = attackerSlot?.querySelector('.board-card');
        
        if (attackerCard) {
            attackerCard.classList.add('attacking');
            Audio.play('attack');
        }
        
        await sleep(CONFIG.ATTACK_DURATION * 0.4);
        
        if (target) {
            target.currentHp -= damage;
            
            const targetSlot = document.querySelector(`#playerBoard .board-slot[data-slot="${targetIdx}"]`);
            const targetCard = targetSlot?.querySelector('.board-card');
            
            Audio.play(isCrit ? 'crit' : 'hit');
            Effects.screenShake(isCrit ? 'heavy' : 'normal');
            
            if (targetCard) {
                targetCard.classList.add('hit');
                Effects.showDamage(targetCard, damage, isCrit);
            }
            
            addLog(`${attacker.name} deals ${damage}${isCrit ? ' CRIT' : ''} to ${target.name}!`, isCrit ? 'crit' : 'damage');
            
            await sleep(CONFIG.HIT_DURATION);
            if (targetCard) targetCard.classList.remove('hit');
            
            if (target.currentHp <= 0) {
                await handleDeath(target, targetIdx, false);
            }
        } else {
            // Attack face
            gameState.playerHP -= damage;
            
            Audio.play(isCrit ? 'crit' : 'hit');
            Effects.screenShake('heavy');
            Effects.screenFlash('#ff4444');
            
            const hpBar = document.getElementById('playerHpBar');
            hpBar.classList.add('damaged');
            setTimeout(() => hpBar.classList.remove('damaged'), 300);
            
            addLog(`${attacker.name} deals ${damage}${isCrit ? ' CRIT' : ''} to YOUR GUILD!`, isCrit ? 'crit' : 'damage');
            
            renderHP();
            checkGameOver();
        }
        
        await sleep(200);
        if (attackerCard) attackerCard.classList.remove('attacking');
        
        renderBoards();
    }
    
    function startNewTurn() {
        gameState.turn++;
        gameState.maxEnergy = Math.min(gameState.turn, CONFIG.MAX_ENERGY);
        gameState.energy = gameState.maxEnergy;
        gameState.isPlayerTurn = true;
        
        // Reset attack status for all cards
        gameState.playerBoard.forEach(c => {
            if (c) {
                c.canAttackThisTurn = true;
                c.hasAttacked = false;
            }
        });
        gameState.enemyBoard.forEach(c => {
            if (c) {
                c.canAttackThisTurn = true;
                c.hasAttacked = false;
            }
        });
        
        // Draw card
        if (gameState.playerDeck.length > 0 && gameState.playerHand.length < CONFIG.MAX_HAND) {
            gameState.playerHand.push(gameState.playerDeck.pop());
            Audio.play('draw');
        }
        
        addLog(`--- TURN ${gameState.turn} ---`, '');
        
        renderAll();
    }
    
    function checkGameOver() {
        if (gameState.playerHP <= 0) {
            Audio.play('defeat');
            showGameOver(false);
        } else if (gameState.enemyHP <= 0) {
            Audio.play('victory');
            showGameOver(true);
        }
    }
    
    function showGameOver(victory) {
        const overlay = document.getElementById('gameOverOverlay');
        const text = document.getElementById('gameOverText');
        const stats = document.getElementById('gameOverStats');
        
        text.textContent = victory ? 'VICTORY!' : 'DEFEAT';
        text.className = 'game-over-text ' + (victory ? 'victory' : 'defeat');
        
        stats.innerHTML = `
            <p>Turns: ${gameState.turn}</p>
            <p>Cards Played: ${gameState.stats.cardsPlayed}</p>
            <p>Damage Dealt: ${gameState.stats.damageDealt}</p>
            <p>Cards Destroyed: ${gameState.stats.cardsKilled}</p>
        `;
        
        overlay.classList.add('show');
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // BATTLE LOG
    // ═══════════════════════════════════════════════════════════════════
    
    function addLog(message, type = '') {
        const log = document.getElementById('battleLog');
        const entry = document.createElement('div');
        entry.className = 'log-entry ' + type;
        entry.innerHTML = message;
        log.insertBefore(entry, log.firstChild);
        
        // Limit entries
        while (log.children.length > 30) {
            log.removeChild(log.lastChild);
        }
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // DRAG AND DROP SYSTEM
    // ═══════════════════════════════════════════════════════════════════
    
    // ═══════════════════════════════════════════════════════════════════
    // SIMPLIFIED DRAG SYSTEM - THE ACTUAL CARD FOLLOWS YOUR FINGER
    // No ghost element - cleaner, more intuitive
    // ═══════════════════════════════════════════════════════════════════
    
    const DragDrop = {
        isDragging: false,
        dragCard: null,        // Card data
        dragCardIndex: null,
        dragGhost: null,       // The floating card that follows finger
        currentPos: { x: 0, y: 0 },
        hoveredSlot: null,
        
        // Start dragging - create a ghost that sticks to finger
        start(cardEl, card, index, e) {
            if (!gameState.isPlayerTurn || gameState.isAnimating) return;
            if (card.gameStats.cost > gameState.energy) return;
            
            e.preventDefault();
            
            // Get touch position FIRST
            const touch = e.touches ? e.touches[0] : e;
            const x = touch.clientX;
            const y = touch.clientY;
            
            this.isDragging = true;
            this.dragCard = card;
            this.dragCardIndex = index;
            this.currentPos = { x, y };
            
            // Hide the original card
            cardEl.style.opacity = '0.3';
            cardEl.style.transform = 'scale(0.9)';
            
            // Create ghost card that will follow finger
            this.createGhost(card, x, y);
            
            // Sound
            try { Audio.play('select'); } catch(err) {}
            
            // Add listeners
            document.addEventListener('mousemove', this.moveHandler);
            document.addEventListener('mouseup', this.endHandler);
            document.addEventListener('touchmove', this.moveHandler, { passive: false });
            document.addEventListener('touchend', this.endHandler);
            document.addEventListener('touchcancel', this.endHandler);
        },
        
        // Create floating ghost card
        createGhost(card, x, y) {
            const ghost = document.createElement('div');
            ghost.id = 'dragGhost';
            ghost.style.cssText = `
                position: fixed;
                z-index: 99999;
                width: 100px;
                height: 140px;
                border-radius: 10px;
                overflow: hidden;
                pointer-events: none;
                border: 3px solid #ffd700;
                box-shadow: 0 20px 50px rgba(0,0,0,0.8), 0 0 30px rgba(255,215,0,0.6);
                transform: scale(1.1) rotate(-3deg);
                background: #1a1a2e;
            `;
            
            // Add card image
            const img = document.createElement('img');
            img.src = '/static/images/cards/thumbs/' + (card.img || 'placeholder.webp');
            img.onerror = () => { img.src = '/static/images/cards/placeholder.webp'; };
            img.style.cssText = 'width:100%; height:100%; object-fit:cover;';
            ghost.appendChild(img);
            
            // Add cost badge
            const cost = document.createElement('div');
            cost.textContent = card.gameStats.cost;
            cost.style.cssText = `
                position: absolute;
                top: -8px;
                left: -8px;
                width: 28px;
                height: 28px;
                background: linear-gradient(135deg, #00ffff, #3b82f6);
                border: 2px solid white;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-family: 'Orbitron', sans-serif;
                font-size: 14px;
                font-weight: bold;
                color: white;
            `;
            ghost.appendChild(cost);
            
            document.body.appendChild(ghost);
            this.dragGhost = ghost;
            
            // Position immediately at finger
            this.updateGhostPosition(x, y);
        },
        
        // Update ghost position - DIRECTLY at finger
        updateGhostPosition(x, y) {
            if (!this.dragGhost) return;
            // Center horizontally, position above finger vertically
            this.dragGhost.style.left = (x - 50) + 'px';  // 50 = half of 100px width
            this.dragGhost.style.top = (y - 90) + 'px';   // Above finger so you can see it
        },
        
        // Handle movement
        moveHandler: function(e) {
            DragDrop.move(e);
        },
        
        move(e) {
            if (!this.isDragging) return;
            e.preventDefault();
            
            const touch = e.touches ? e.touches[0] : e;
            const x = touch.clientX;
            const y = touch.clientY;
            this.currentPos = { x, y };
            
            // Move ghost to follow finger
            this.updateGhostPosition(x, y);
            
            // Check which slot we're hovering
            this.checkSlotHover(x, y);
        },
        
        // Check slot hover
        checkSlotHover(x, y) {
            // Clear all hover states
            document.querySelectorAll('.board-slot').forEach(slot => {
                slot.classList.remove('drag-hover', 'drag-invalid');
            });
            this.hoveredSlot = null;
            
            // Check player board slots
            const playerBoard = document.getElementById('playerBoard');
            const slots = playerBoard.querySelectorAll('.board-slot');
            
            slots.forEach((slot, idx) => {
                const rect = slot.getBoundingClientRect();
                // Expand hit area slightly for easier targeting
                const padding = 10;
                if (x >= rect.left - padding && x <= rect.right + padding && 
                    y >= rect.top - padding && y <= rect.bottom + padding) {
                    
                    if (gameState.playerBoard[idx] !== null) {
                        slot.classList.add('drag-invalid');
                    } else {
                        slot.classList.add('drag-hover');
                        this.hoveredSlot = { slot, idx };
                    }
                }
            });
        },
        
        // Find closest empty slot
        findClosestSlot() {
            const playerBoard = document.getElementById('playerBoard');
            const slots = playerBoard.querySelectorAll('.board-slot');
            const boardRect = playerBoard.getBoundingClientRect();
            
            // Only snap if finger is in the board area (with generous margin)
            if (this.currentPos.y > boardRect.bottom + 150 || this.currentPos.y < boardRect.top - 50) {
                return null;
            }
            
            let closest = null;
            let closestDist = 150; // Maximum snap distance
            
            slots.forEach((slot, idx) => {
                if (gameState.playerBoard[idx] !== null) return;
                
                const rect = slot.getBoundingClientRect();
                const cx = rect.left + rect.width / 2;
                const cy = rect.top + rect.height / 2;
                const dist = Math.hypot(this.currentPos.x - cx, this.currentPos.y - cy);
                
                if (dist < closestDist) {
                    closestDist = dist;
                    closest = { slot, idx };
                }
            });
            
            return closest;
        },
        
        // End handler
        endHandler: function(e) {
            DragDrop.end(e);
        },
        
        async end(e) {
            if (!this.isDragging) return;
            
            // Remove listeners
            document.removeEventListener('mousemove', this.moveHandler);
            document.removeEventListener('mouseup', this.endHandler);
            document.removeEventListener('touchmove', this.moveHandler);
            document.removeEventListener('touchend', this.endHandler);
            document.removeEventListener('touchcancel', this.endHandler);
            
            // Clear hover states
            document.querySelectorAll('.board-slot').forEach(slot => {
                slot.classList.remove('drag-hover', 'drag-invalid');
            });
            
            // Find target slot
            let targetSlot = this.hoveredSlot || this.findClosestSlot();
            
            // Remove ghost
            if (this.dragGhost) {
                this.dragGhost.remove();
                this.dragGhost = null;
            }
            
            if (targetSlot && this.dragCard && this.dragCardIndex !== null) {
                // SUCCESS - play card to slot!
                gameState.selectedCard = this.dragCardIndex;
                await playCardToSlot(targetSlot.idx);
                
                // Snap animation on the new board card
                setTimeout(() => {
                    const newCard = targetSlot.slot.querySelector('.board-card');
                    if (newCard) {
                        newCard.classList.add('snapping');
                        setTimeout(() => newCard.classList.remove('snapping'), 400);
                    }
                }, 50);
                
            } else {
                // CANCELLED - just re-render hand
                renderHand();
                try { Audio.play('select'); } catch(err) {}
            }
            
            // Reset state
            this.isDragging = false;
            this.dragCard = null;
            this.dragCardIndex = null;
            this.hoveredSlot = null;
        }
    };
    
    // ═══════════════════════════════════════════════════════════════════
    // UTILITIES
    // ═══════════════════════════════════════════════════════════════════
    
    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    function renderAll() {
        renderHP();
        renderEnergy();
        renderTurnIndicator();
        renderHand();
        renderBoards();
        updateAttackButton();
    }
    
    function createDeck(usePlayerDeck = false) {
        console.log('[createDeck] CARDS available:', CARDS.length);
        if (!CARDS.length) {
            console.error('[createDeck] No cards available!');
            return [];
        }
        
        const deck = [];
        
        // Try to load player's saved deck
        if (usePlayerDeck) {
            try {
                const savedDecks = JSON.parse(localStorage.getItem('nw_decks') || '[]');
                if (savedDecks.length > 0) {
                    const lastDeck = savedDecks[savedDecks.length - 1];
                    console.log('[createDeck] Loading saved deck:', lastDeck.name);
                    
                    lastDeck.cards.forEach(c => {
                        const card = CARDS.find(ac => ac.id === c.id);
                        if (card && card.gameStats) {
                            for (let i = 0; i < c.count; i++) {
                                deck.push({...card});
                            }
                        }
                    });
                    
                    if (deck.length >= 10) {
                        for (let i = deck.length - 1; i > 0; i--) {
                            const j = Math.floor(Math.random() * (i + 1));
                            [deck[i], deck[j]] = [deck[j], deck[i]];
                        }
                        console.log('[createDeck] Using saved deck with', deck.length, 'cards');
                        return deck;
                    }
                    console.log('[createDeck] Saved deck too small, using random deck');
                }
            } catch (e) {
                console.warn('[createDeck] Error loading saved deck:', e);
            }
        }
        
        // Fallback: pick 15 random cards - CARDS already filtered for gameStats
        // But let's be extra safe and handle cards without gameStats
        const validCards = CARDS.filter(c => c && c.gameStats && c.gameStats.cost !== undefined);
        console.log('[createDeck] Valid cards with gameStats:', validCards.length);
        
        if (validCards.length === 0) {
            console.error('[createDeck] No valid cards! Using all cards as fallback');
            // Ultimate fallback: use cards even without full gameStats, add defaults
            CARDS.slice(0, 15).forEach(c => {
                deck.push({
                    ...c,
                    gameStats: c.gameStats || { atk: 3, hp: 5, cost: 2, spd: 3, crit: 5, dodge: 5 }
                });
            });
            return deck;
        }
        
        for (let i = 0; i < 15; i++) {
            const card = validCards[Math.floor(Math.random() * validCards.length)];
            deck.push({...card});
        }
        
        // Shuffle
        for (let i = deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [deck[i], deck[j]] = [deck[j], deck[i]];
        }
        
        console.log('[createDeck] Created random deck with', deck.length, 'cards');
        return deck;
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // EPIC START SCREEN
    // ═══════════════════════════════════════════════════════════════════
    
    function initStartScreen() {
        const overlay = document.getElementById('startOverlay');
        const startBtn = document.getElementById('startBtn');
        const particles = document.getElementById('startParticles');
        
        // Create floating particles
        for (let i = 0; i < 30; i++) {
            const p = document.createElement('div');
            p.className = 'start-particle';
            p.style.left = Math.random() * 100 + '%';
            p.style.animationDelay = Math.random() * 3 + 's';
            p.style.animationDuration = (2 + Math.random() * 2) + 's';
            particles.appendChild(p);
        }
        
        // Start button click
        startBtn.onclick = async () => {
            try {
                startBtn.disabled = true;
                startBtn.textContent = '⏳ GET READY...';
                
                // Initialize audio - prefer NW_AUDIO, fallback to inline Audio
                try {
                    if (typeof NW_AUDIO !== 'undefined' && NW_AUDIO.loadAll) {
                        await NW_AUDIO.loadAll();
                        console.log('[AUDIO] NW_AUDIO initialized');
                    } else {
                        Audio.init();
                    }
                } catch(e) { console.log('Audio init skipped:', e); }
                
                // Countdown with proper timing (animation is 0.8s)
                const countdown = document.getElementById('startCountdown');
                const fightText = document.getElementById('fightText');
                
                console.log('[Countdown] Starting 3-2-1-FIGHT!');
                
                // 3
                countdown.textContent = '3';
                countdown.classList.add('show');
                try { Audio.play('select'); } catch(e) {}
                console.log('[Countdown] 3');
                await sleep(850); // Wait for full animation
                countdown.classList.remove('show');
                await sleep(150);
                
                // 2
                countdown.textContent = '2';
                countdown.classList.add('show');
                try { Audio.play('select'); } catch(e) {}
                console.log('[Countdown] 2');
                await sleep(850);
                countdown.classList.remove('show');
                await sleep(150);
                
                // 1
                countdown.textContent = '1';
                countdown.classList.add('show');
                try { Audio.play('select'); } catch(e) {}
                console.log('[Countdown] 1');
                await sleep(850);
                countdown.classList.remove('show');
                await sleep(150);
                
                // FIGHT!
                fightText.classList.add('show');
                try { 
                    Audio.play('cardSlam'); 
                    Effects.screenShake('heavy');
                } catch(e) {}
                console.log('[Countdown] FIGHT!');
                await sleep(1000);
                
                // Fade out start screen
                overlay.classList.add('fade-out');
                await sleep(500);
                overlay.classList.add('hidden');
                
                // Start the actual game
                console.log('[Countdown] Starting game...');
                startGame();
                
            } catch (error) {
                console.error('Start error:', error);
                // Failsafe - just start the game
                overlay.classList.add('hidden');
                startGame();
            }
        };
    }
    
    async function playCountdown() {
        const countdown = document.getElementById('startCountdown');
        const fightText = document.getElementById('fightText');
        
        const safePlay = (sound) => { try { Audio.play(sound); } catch(e) { console.log('Audio error:', e); } };
        const safeHaptic = (type) => { try { if (typeof NW_JUICE !== 'undefined') NW_JUICE.haptic(type); } catch(e) {} };
        
        try {
            // 3
            countdown.textContent = '3';
            countdown.classList.add('show');
            safePlay('select');
            safeHaptic('medium');
            await sleep(800);
            countdown.classList.remove('show');
            
            await sleep(200);
            
            // 2
            countdown.textContent = '2';
            countdown.classList.add('show');
            safePlay('select');
            safeHaptic('medium');
            await sleep(800);
            countdown.classList.remove('show');
            
            await sleep(200);
            
            // 1
            countdown.textContent = '1';
            countdown.classList.add('show');
            safePlay('select');
            safeHaptic('medium');
            await sleep(800);
            countdown.classList.remove('show');
            
            await sleep(200);
            
            // FIGHT!
            fightText.classList.add('show');
            safePlay('cardSlam');
            safeHaptic('heavy');
            try { Effects.screenShake('heavy'); } catch(e) {}
            await sleep(1000);
        } catch (error) {
            console.error('Countdown error:', error);
        }
    }
    
    function startGame() {
        console.log('[Battle Arena] Starting game...');
        console.log('[Battle Arena] Player hand:', gameState.playerHand.length, 'cards');
        console.log('[Battle Arena] Player deck:', gameState.playerDeck.length, 'cards');
        
        // Setup UI
        try { Effects.createParticles(); } catch(e) { console.log('Particles error:', e); }
        
        console.log('[Battle Arena] Rendering...');
        renderAll();
        
        // Event listeners
        document.getElementById('endTurnBtn').onclick = endTurn;
        document.getElementById('attackBtn').onclick = () => {
            const targetIdx = gameState.enemyBoard.findIndex(c => c);
            if (targetIdx !== -1) {
                attackTarget(targetIdx);
            } else {
                attackTarget(0);
            }
        };
        
        addLog('⚔️ BATTLE START!', 'ability');
        addLog(`Your deck: ${gameState.playerDeck.length + gameState.playerHand.length} cards`, '');
        
        console.log('[Battle Arena v2.0] Game started! Hand has', gameState.playerHand.length, 'cards');
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // INITIALIZATION
    // ═══════════════════════════════════════════════════════════════════
    
    // Debug helper - shows errors on screen for mobile debugging
    function showError(msg) {
        console.error(msg);
        
        // Try NW_UI toast first for cleaner UX
        if (typeof NW_UI !== 'undefined' && NW_UI.error) {
            NW_UI.error(msg.substring(0, 100)); // Truncate for toast
        }
        
        // Also show debug div for detailed errors
        let errorDiv = document.getElementById('debugError');
        if (!errorDiv) {
            errorDiv = document.createElement('div');
            errorDiv.id = 'debugError';
            errorDiv.style.cssText = 'position:fixed;top:10px;left:10px;right:10px;background:red;color:white;padding:10px;z-index:99999;font-size:12px;border-radius:8px;max-height:200px;overflow:auto;';
            document.body.appendChild(errorDiv);
        }
        errorDiv.innerHTML += msg + '<br>';
    }
    
    async function init() {
        try {
            console.log('[Battle Arena] Init starting...');
            
            // Load cards - wait for NW_CARDS to init, or load directly
            try {
                if (typeof NW_CARDS !== 'undefined') {
                    await NW_CARDS.init();
                    CARDS = NW_CARDS.getAll().filter(c => c.gameStats);
                }
                
                if (!CARDS.length) {
                    const res = await fetch('/static/data/cards-v2.json');
                    const data = await res.json();
                    const cardArray = data.cards || data;
                    CARDS = cardArray.filter(c => c.gameStats);
                }
            } catch (e) {
                console.error('Failed to load cards:', e);
                try {
                    const res = await fetch('/static/data/cards-v2.json');
                    const data = await res.json();
                    const cardArray = data.cards || data;
                    CARDS = cardArray.filter(c => c.gameStats);
                } catch (e2) {
                    showError('Card loading failed: ' + e2.message);
                }
            }
            
            console.log(`[Battle Arena] Loaded ${CARDS.length} cards`);
            console.log('[Battle Arena] Sample card:', CARDS[0]);
            
            if (CARDS.length === 0) {
                showError('No cards loaded! Check network.');
                return;
            }
            
            // Create decks - player uses saved deck, enemy uses random
            gameState.playerDeck = createDeck(true);  // true = try to use saved deck
            gameState.enemyDeck = createDeck(false);  // false = random deck
            
            console.log(`[Battle Arena] Player deck: ${gameState.playerDeck.length} cards`);
            console.log(`[Battle Arena] Enemy deck: ${gameState.enemyDeck.length} cards`);
            
            // FAILSAFE: If deck creation failed, create emergency deck
            if (gameState.playerDeck.length === 0) {
                console.warn('[Battle Arena] Deck empty! Creating emergency deck...');
                for (let i = 0; i < 15 && i < CARDS.length; i++) {
                    gameState.playerDeck.push({...CARDS[i]});
                }
                console.log(`[Battle Arena] Emergency deck: ${gameState.playerDeck.length} cards`);
            }
            if (gameState.enemyDeck.length === 0) {
                for (let i = 0; i < 15 && i < CARDS.length; i++) {
                    gameState.enemyDeck.push({...CARDS[i]});
                }
            }
            
            // Draw starting hands
            for (let i = 0; i < CONFIG.STARTING_HAND; i++) {
                if (gameState.playerDeck.length > 0) {
                    gameState.playerHand.push(gameState.playerDeck.pop());
                }
                if (gameState.enemyDeck.length > 0) {
                    gameState.enemyHand.push(gameState.enemyDeck.pop());
                }
            }
            
            console.log(`[Battle Arena] Drew ${gameState.playerHand.length} cards to hand`);
            console.log('[Battle Arena] Hand contents:', gameState.playerHand.map(c => c.name));
            
            // Initialize mobile card detail modal
            initCardDetailModal();
            
            // Initialize premium audio system - MUST await to ensure sounds are loaded!
            await Audio.init();
            console.log('[Battle Arena] Audio system ready');
            
            // Auto-start immediately - hide overlay and start game
            console.log('[Battle Arena] Auto-starting game...');
            document.getElementById('startOverlay').classList.add('hidden');
            startGame();
            
            // Log the hand for debugging
            console.log('[Battle Arena] Final hand check:', gameState.playerHand);
            if (gameState.playerHand.length === 0) {
                showError('Hand is empty! Deck creation may have failed.');
            }
        } catch (error) {
            showError('Init failed: ' + error.message + ' at ' + error.stack);
        }
    }
    
    // Start
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
})();
