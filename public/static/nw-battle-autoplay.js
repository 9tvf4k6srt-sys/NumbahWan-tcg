/**
 * NW-BATTLE-AUTOPLAY v2.0 — Visual Fighting Auto-Battle
 * 
 * Cards PHYSICALLY fight each other. Not text — ANIMATION.
 * 
 * What happens when you hit AUTO:
 *   1. Card art FLIES from your board to the enemy card and SLAMS into it
 *   2. Impact explosion with particles matching card rarity color
 *   3. HP bars drain in real-time with screen shake on big hits
 *   4. Kill streak combos with escalating screen effects
 *   5. Camera zoom on lethal moments
 *   6. Card summons slam down from above with dust cloud
 *   7. Death = card shatters into fragments that scatter
 *
 * PRELOAD GATE: Before battle starts, ALL card images + ALL battle sounds
 * are fetched and cached. Nothing loads mid-fight.
 *
 * Mobile-first: GPU-composited transforms only (translate3d, scale, opacity).
 * No layout thrashing. requestAnimationFrame for all motion. 60fps on iPhone SE.
 */
(function() {
    'use strict';

    // ─── State ──────────────────────────────────────────────────
    let isAutoPlaying = false;
    let autoSpeed = 1;       // 1x, 2x, 4x
    let killStreak = 0;
    let stopRequested = false;
    let commentary = null;
    let speedBadge = null;
    let canvas = null;
    let ctx = null;
    let particles = [];
    let animFrameId = null;

    // ─── Preload Gate ───────────────────────────────────────────
    // Load EVERYTHING before battle starts. Zero mid-fight loading.
    const preloadedImages = new Map();
    const BATTLE_SOUNDS = [
        'attack', 'critical', 'death', 'fightStart', 'draw', 'slam',
        'turnEnd', 'victory', 'defeat'
    ];

    async function preloadAllAssets() {
        const promises = [];

        // Preload all card images that exist in both decks
        if (window.NW_CARDS) {
            const allCards = NW_CARDS.getAll ? NW_CARDS.getAll() : [];
            for (const card of allCards) {
                if (card.img) {
                    const src = `/static/images/cards/thumbs/${card.img}`;
                    if (!preloadedImages.has(src)) {
                        const p = new Promise(resolve => {
                            const img = new Image();
                            img.onload = () => { preloadedImages.set(src, img); resolve(); };
                            img.onerror = () => resolve(); // don't block on missing
                            img.src = src;
                        });
                        promises.push(p);
                    }
                }
            }
        }

        // Preload all battle sounds via NW_SOUNDS
        if (window.NW_SOUNDS) {
            if (!NW_SOUNDS.audioContext) NW_SOUNDS.initWebAudio?.();
            if (NW_SOUNDS.preloadWebAudio) {
                promises.push(NW_SOUNDS.preloadWebAudio(BATTLE_SOUNDS));
            }
            if (NW_SOUNDS.preload) {
                NW_SOUNDS.preload(BATTLE_SOUNDS);
            }
        }

        // Preload placeholder
        const ph = new Image();
        ph.src = '/static/images/cards/placeholder.webp';
        promises.push(new Promise(r => { ph.onload = r; ph.onerror = r; }));

        await Promise.all(promises);
    }

    // ─── Sound helper ───────────────────────────────────────────
    function sfx(name) {
        if (window.NW_SOUNDS && NW_SOUNDS.play) {
            try { NW_SOUNDS.play(name); } catch(e) {}
        }
    }

    // ─── Particle Canvas (GPU composited overlay) ───────────────
    function createCanvas() {
        if (canvas) return;
        canvas = document.createElement('canvas');
        canvas.id = 'autoplay-fx-canvas';
        canvas.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            pointer-events: none; z-index: 150;
        `;
        document.body.appendChild(canvas);
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
    }

    function resizeCanvas() {
        if (!canvas) return;
        canvas.width = window.innerWidth * (window.devicePixelRatio || 1);
        canvas.height = window.innerHeight * (window.devicePixelRatio || 1);
        ctx = canvas.getContext('2d');
        ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
    }

    function destroyCanvas() {
        cancelAnimationFrame(animFrameId);
        particles = [];
        if (canvas) { canvas.remove(); canvas = null; ctx = null; }
        window.removeEventListener('resize', resizeCanvas);
    }

    // ─── Particle System ────────────────────────────────────────
    const RARITY_COLORS = {
        mythic: ['#ff6b00', '#ff9100', '#ffab40'],
        legendary: ['#ffd700', '#ffea00', '#fff176'],
        epic: ['#9c27b0', '#ce93d8', '#e040fb'],
        rare: ['#2196f3', '#64b5f6', '#42a5f5'],
        common: ['#78909c', '#b0bec5', '#90a4ae']
    };

    function spawnParticles(x, y, count, colors, spread, life) {
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 * i / count) + (Math.random() - 0.5) * 0.8;
            const speed = spread * (0.5 + Math.random() * 0.7);
            particles.push({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 1,
                life: life || 40,
                maxLife: life || 40,
                size: 2 + Math.random() * 4,
                color: colors[Math.floor(Math.random() * colors.length)],
                gravity: 0.15
            });
        }
    }

    function spawnSparks(x, y, count, color) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 2 + Math.random() * 6;
            particles.push({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 15 + Math.random() * 15,
                maxLife: 30,
                size: 1 + Math.random() * 2,
                color: color,
                gravity: 0.05,
                isSpark: true
            });
        }
    }

    function spawnShatterFragments(x, y, imgSrc, rarity) {
        const colors = RARITY_COLORS[rarity] || RARITY_COLORS.common;
        // Shatter = lots of small fragments scattering
        for (let i = 0; i < 16; i++) {
            const angle = (Math.PI * 2 * i / 16) + (Math.random() - 0.5) * 0.4;
            const speed = 3 + Math.random() * 5;
            particles.push({
                x: x + (Math.random() - 0.5) * 30,
                y: y + (Math.random() - 0.5) * 30,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 2,
                life: 35 + Math.random() * 20,
                maxLife: 55,
                size: 3 + Math.random() * 6,
                color: colors[Math.floor(Math.random() * colors.length)],
                gravity: 0.2,
                rotation: Math.random() * 360,
                rotSpeed: (Math.random() - 0.5) * 15,
                isFragment: true
            });
        }
    }

    function tickParticles() {
        if (!ctx || !canvas) return;
        ctx.clearRect(0, 0, canvas.width / (window.devicePixelRatio || 1), canvas.height / (window.devicePixelRatio || 1));

        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vy += p.gravity;
            p.vx *= 0.98;
            p.life--;

            if (p.life <= 0) { particles.splice(i, 1); continue; }

            const alpha = Math.max(0, p.life / p.maxLife);
            ctx.globalAlpha = alpha;

            if (p.isFragment) {
                ctx.save();
                ctx.translate(p.x, p.y);
                p.rotation += p.rotSpeed;
                ctx.rotate(p.rotation * Math.PI / 180);
                ctx.fillStyle = p.color;
                ctx.fillRect(-p.size/2, -p.size/2, p.size, p.size);
                ctx.restore();
            } else if (p.isSpark) {
                ctx.beginPath();
                ctx.strokeStyle = p.color;
                ctx.lineWidth = p.size;
                ctx.moveTo(p.x, p.y);
                ctx.lineTo(p.x - p.vx * 2, p.y - p.vy * 2);
                ctx.stroke();
            } else {
                ctx.beginPath();
                ctx.fillStyle = p.color;
                ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        ctx.globalAlpha = 1;

        if (isAutoPlaying || particles.length > 0) {
            animFrameId = requestAnimationFrame(tickParticles);
        }
    }

    // ─── Auto-sleep with speed ──────────────────────────────────
    function autoSleep(ms) {
        if (stopRequested) return Promise.resolve();
        return new Promise(r => setTimeout(r, Math.max(30, ms / autoSpeed)));
    }

    // ─── Get element center in viewport coords ─────────────────
    function getCenter(el) {
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    }

    function getCardEl(boardId, slotIdx) {
        return document.querySelector(`#${boardId} .board-slot[data-slot="${slotIdx}"] .board-card`);
    }

    // ─── Visual: Card flies and SLAMS into target ───────────────
    async function animateCardAttack(attackerEl, targetEl, isCrit, rarity) {
        if (!attackerEl || !targetEl) return;

        const aRect = attackerEl.getBoundingClientRect();
        const tRect = targetEl.getBoundingClientRect();

        // Create a flying clone of the attacker card art
        const artImg = attackerEl.querySelector('.bc-art');
        const clone = document.createElement('div');
        clone.className = 'auto-flying-card';
        const imgSrc = artImg ? artImg.src : '/static/images/cards/placeholder.webp';
        clone.innerHTML = `<img src="${imgSrc}" style="width:100%;height:100%;object-fit:cover;border-radius:6px;">`;
        clone.style.cssText = `
            position: fixed; z-index: 200; pointer-events: none;
            width: ${aRect.width}px; height: ${aRect.height}px;
            left: ${aRect.left}px; top: ${aRect.top}px;
            border-radius: 6px; overflow: hidden;
            transition: none;
            box-shadow: 0 0 20px rgba(255,215,0,0.6);
            will-change: transform;
        `;
        document.body.appendChild(clone);

        // Wind-up: pull back slightly
        const dx = tRect.left - aRect.left;
        const dy = tRect.top - aRect.top;
        const pullAngle = Math.atan2(dy, dx);
        const pullDist = 15;

        clone.style.transition = `transform 0.12s ease-out`;
        clone.style.transform = `translate3d(${-Math.cos(pullAngle) * pullDist}px, ${-Math.sin(pullAngle) * pullDist}px, 0) scale(1.1)`;
        await autoSleep(120);

        // FLY to target
        sfx(isCrit ? 'critical' : 'attack');
        clone.style.transition = `transform 0.2s cubic-bezier(0.22, 1, 0.36, 1)`;
        clone.style.transform = `translate3d(${dx}px, ${dy}px, 0) scale(${isCrit ? 1.3 : 1.05})`;
        await autoSleep(200);

        // IMPACT
        const impactCenter = getCenter(targetEl);
        if (impactCenter) {
            const colors = RARITY_COLORS[rarity] || RARITY_COLORS.common;
            const impactCount = isCrit ? 24 : 12;
            spawnParticles(impactCenter.x, impactCenter.y, impactCount, colors, isCrit ? 8 : 5, isCrit ? 45 : 30);
            if (isCrit) {
                spawnSparks(impactCenter.x, impactCenter.y, 15, '#ffd700');
                screenFlashFX(isCrit ? 'rgba(255,215,0,0.25)' : 'rgba(255,68,68,0.15)');
            }
        }

        // Target recoil
        targetEl.style.transition = 'transform 0.1s ease-out';
        targetEl.style.transform = `translate3d(${Math.cos(pullAngle) * 8}px, ${Math.sin(pullAngle) * 8}px, 0) scale(0.92)`;
        await autoSleep(100);
        targetEl.style.transition = 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)';
        targetEl.style.transform = 'translate3d(0,0,0) scale(1)';

        // Remove clone
        clone.style.transition = 'opacity 0.15s';
        clone.style.opacity = '0';
        setTimeout(() => clone.remove(), 150);

        // Screen shake
        const arena = document.getElementById('arena');
        if (arena) {
            const shakeIntensity = isCrit ? 6 : 3;
            arena.style.transition = 'none';
            arena.style.transform = `translate3d(${(Math.random()-0.5)*shakeIntensity}px, ${(Math.random()-0.5)*shakeIntensity}px, 0)`;
            await autoSleep(50);
            arena.style.transform = `translate3d(${(Math.random()-0.5)*shakeIntensity*0.5}px, ${(Math.random()-0.5)*shakeIntensity*0.5}px, 0)`;
            await autoSleep(50);
            arena.style.transition = 'transform 0.2s ease-out';
            arena.style.transform = 'translate3d(0,0,0)';
        }
    }

    // ─── Visual: Card slams down from above when summoned ───────
    async function animateCardSummon(boardId, slotIdx, rarity) {
        await autoSleep(100); // let DOM render
        const el = getCardEl(boardId, slotIdx);
        if (!el) return;

        sfx('slam');
        el.style.transition = 'none';
        el.style.transform = 'translate3d(0, -80px, 0) scale(0.6)';
        el.style.opacity = '0.3';
        await autoSleep(30);
        el.style.transition = 'transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.15s';
        el.style.transform = 'translate3d(0, 0, 0) scale(1)';
        el.style.opacity = '1';

        // Dust cloud
        const center = getCenter(el);
        if (center) {
            const colors = RARITY_COLORS[rarity] || RARITY_COLORS.common;
            spawnParticles(center.x, center.y + 20, 8, [...colors, '#ffffff44'], 3, 25);
        }
        await autoSleep(250);

        // Reset inline styles
        el.style.transition = '';
        el.style.transform = '';
        el.style.opacity = '';
    }

    // ─── Visual: Card shatters on death ─────────────────────────
    async function animateCardDeath(boardId, slotIdx, rarity) {
        const el = getCardEl(boardId, slotIdx);
        if (!el) return;

        sfx('death');
        const center = getCenter(el);

        // Shake violently
        el.style.transition = 'none';
        for (let i = 0; i < 4; i++) {
            el.style.transform = `translate3d(${(Math.random()-0.5)*8}px, ${(Math.random()-0.5)*8}px, 0)`;
            await autoSleep(40);
        }

        // Shatter
        if (center) {
            const artImg = el.querySelector('.bc-art');
            spawnShatterFragments(center.x, center.y, artImg?.src, rarity);
        }

        // Shrink + fade
        el.style.transition = 'transform 0.3s ease-in, opacity 0.3s';
        el.style.transform = 'scale(0.2) rotate(15deg)';
        el.style.opacity = '0';
        await autoSleep(300);
    }

    // ─── Visual: Face attack — energy blast toward HP bar ────────
    async function animateGoFace(attackerEl, isPlayerAttacking) {
        if (!attackerEl) return;
        sfx('attack');

        const aCenter = getCenter(attackerEl);
        const hpBar = document.querySelector(isPlayerAttacking ? '.enemy-zone .hp-bar-fill, #enemyHpBar' : '.your-zone .hp-bar-fill, #playerHpBar');
        const tCenter = hpBar ? getCenter(hpBar) : { x: window.innerWidth / 2, y: isPlayerAttacking ? 40 : window.innerHeight - 40 };

        if (aCenter && tCenter) {
            // Fire energy bolt
            const bolt = document.createElement('div');
            bolt.className = 'auto-energy-bolt';
            bolt.style.cssText = `
                position: fixed; z-index: 200; pointer-events: none;
                left: ${aCenter.x}px; top: ${aCenter.y}px;
                width: 12px; height: 12px; border-radius: 50%;
                background: radial-gradient(circle, #ffd700, #ff6b00);
                box-shadow: 0 0 15px #ffd700, 0 0 30px #ff6b00;
                will-change: transform;
                transition: all 0.25s cubic-bezier(0.22, 1, 0.36, 1);
            `;
            document.body.appendChild(bolt);
            await autoSleep(30);
            bolt.style.left = tCenter.x + 'px';
            bolt.style.top = tCenter.y + 'px';
            bolt.style.transform = 'scale(2)';
            await autoSleep(250);

            // Impact on HP bar
            spawnSparks(tCenter.x, tCenter.y, 10, '#ff4444');
            bolt.remove();

            // Flash HP zone
            const zone = document.querySelector(isPlayerAttacking ? '.enemy-zone' : '.your-zone');
            if (zone) {
                zone.style.transition = 'none';
                zone.style.filter = 'brightness(2)';
                await autoSleep(80);
                zone.style.transition = 'filter 0.3s';
                zone.style.filter = '';
            }
        }
    }

    // ─── Visual: Screen flash ───────────────────────────────────
    function screenFlashFX(color) {
        const flash = document.createElement('div');
        flash.style.cssText = `
            position: fixed; inset: 0; z-index: 140;
            background: ${color}; pointer-events: none;
            animation: autoFlashFade 0.3s forwards;
        `;
        document.body.appendChild(flash);
        setTimeout(() => flash.remove(), 300);
    }

    // ─── Visual: Camera zoom on lethal moments ──────────────────
    async function dramaticZoom(targetEl) {
        const arena = document.getElementById('arena');
        if (!arena || !targetEl) return;
        const r = targetEl.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        const ox = (cx / window.innerWidth - 0.5) * -40;
        const oy = (cy / window.innerHeight - 0.5) * -40;
        arena.style.transition = 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)';
        arena.style.transform = `scale(1.08) translate3d(${ox}px, ${oy}px, 0)`;
        await autoSleep(600);
        arena.style.transition = 'transform 0.4s ease-out';
        arena.style.transform = 'translate3d(0,0,0) scale(1)';
    }

    // ─── Commentary (minimal — visuals do the talking) ───────────
    const COMMENTARY = {
        streak: ['DOUBLE KILL!', 'TRIPLE KILL!', 'ULTRA KILL!', 'RAMPAGE!', 'GODLIKE!'],
        lowHP: ['FINAL BLOW INCOMING...', 'ONE MORE HIT...', 'FINISH THEM!'],
        victory: ['VICTORY!', 'FLAWLESS!', 'DOMINATED!'],
        defeat: ['DEFEATED...', 'NEXT TIME...']
    };
    function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

    function showCommentary(text, type) {
        if (!commentary) return;
        commentary.textContent = text;
        commentary.className = 'auto-commentary show ' + (type || '');
        clearTimeout(commentary._timer);
        commentary._timer = setTimeout(() => commentary.classList.remove('show'), 1400 / autoSpeed);
    }

    function showKillStreakBanner(count) {
        if (count < 2) return;
        const text = COMMENTARY.streak[Math.min(count - 2, COMMENTARY.streak.length - 1)];
        const banner = document.createElement('div');
        banner.className = 'auto-streak-banner';
        banner.textContent = text;
        const scale = 1 + (count - 2) * 0.15;
        const color = count >= 5 ? '#ff0044' : count >= 4 ? '#ff6b00' : count >= 3 ? '#ffd700' : '#4fc3f7';
        banner.style.cssText = `--streak-scale:${scale};--streak-color:${color};`;
        document.body.appendChild(banner);
        screenFlashFX(count >= 4 ? 'rgba(255,107,0,0.2)' : 'rgba(255,215,0,0.15)');
        setTimeout(() => banner.remove(), 1200);
    }

    // ─── AI Decision Engine ─────────────────────────────────────
    function pickBestCard(hand, energy) {
        const playable = hand
            .map((c, i) => ({ card: c, idx: i }))
            .filter(x => x.card.gameStats && x.card.gameStats.cost <= energy);
        if (!playable.length) return null;
        // Prefer cards with abilities (more visual), then highest cost
        playable.sort((a, b) => {
            const aa = (a.card.gameStats.abilities || []).length;
            const ba = (b.card.gameStats.abilities || []).length;
            if (aa !== ba) return ba - aa;
            return b.card.gameStats.cost - a.card.gameStats.cost;
        });
        return playable[0];
    }

    function pickAttackTarget(attacker, enemyBoard) {
        const alive = [];
        enemyBoard.forEach((c, i) => {
            if (c && c.currentHp > 0 && c.stealthTurns <= 0) alive.push({ card: c, idx: i });
        });
        const taunts = alive.filter(x => x.card.hasTaunt);
        if (taunts.length) return taunts[0].idx;
        if (!alive.length) return -1; // go face
        const atk = attacker.currentAtk + (attacker.synergyAtkBonus || 0);
        const killable = alive.filter(x => x.card.currentHp <= atk);
        if (killable.length) {
            killable.sort((a, b) => (b.card.currentAtk || 0) - (a.card.currentAtk || 0));
            return killable[0].idx;
        }
        alive.sort((a, b) => a.card.currentHp - b.card.currentHp);
        return alive[0].idx;
    }

    // ─── Main Auto-Play Loop ────────────────────────────────────
    async function autoPlayTurn() {
        const B = window.NW_BATTLE;
        if (!B || stopRequested) return;

        const state = B.getState();
        if (!state.isPlayerTurn || state.isAnimating) {
            await autoSleep(150);
            return;
        }

        // Phase 1: SUMMON cards — each one slams down
        let energy = state.energy;
        for (let attempt = 0; attempt < 6; attempt++) {
            if (stopRequested) return;
            const fresh = B.getState();
            energy = fresh.energy;
            const best = pickBestCard(fresh.playerHand, energy);
            if (!best) break;
            const emptySlot = fresh.playerBoard.findIndex(s => s === null);
            if (emptySlot === -1) break;

            B.selectCard(best.idx);
            await autoSleep(150);
            B.playToSlot(emptySlot);
            await animateCardSummon('playerBoard', emptySlot, best.card.rarity);
            energy -= best.card.gameStats.cost;
        }

        await autoSleep(200);

        // Phase 2: ATTACK — cards physically fly at targets
        for (let i = 0; i < 5; i++) {
            if (stopRequested) return;
            const fresh = B.getState();
            if (!fresh.isPlayerTurn) break;

            const card = fresh.playerBoard[i];
            if (!card || card.hasAttacked || !card.canAttackThisTurn || card.stealthTurns > 0) continue;

            while (B.getState().isAnimating) await autoSleep(80);

            const targetIdx = pickAttackTarget(card, fresh.enemyBoard);
            const target = targetIdx >= 0 ? fresh.enemyBoard[targetIdx] : null;
            const isCrit = Math.random() * 100 < ((card.baseCrit || 0) * 100 + (card.hasCritBoost ? 15 : 0));
            const isLethal = target && (card.currentAtk + (card.synergyAtkBonus || 0)) >= target.currentHp;

            // Dramatic zoom on potential kills
            if (isLethal && targetIdx >= 0) {
                const tEl = getCardEl('enemyBoard', targetIdx);
                if (tEl) await dramaticZoom(tEl);
            }

            const attackerEl = getCardEl('playerBoard', i);

            B.selectAttacker(i);
            await autoSleep(80);

            if (targetIdx === -1) {
                // Go face — energy bolt
                B.attackFace();
                await animateGoFace(attackerEl, true);
            } else {
                const targetEl = getCardEl('enemyBoard', targetIdx);
                // Card-on-card clash
                await animateCardAttack(attackerEl, targetEl, isCrit, card.rarity);
                B.attackTarget(targetIdx);
            }

            await autoSleep(300);

            // Check kill
            if (targetIdx >= 0) {
                const afterState = B.getState();
                const targetAfter = afterState.enemyBoard[targetIdx];
                if (!targetAfter || (targetAfter.currentHp !== undefined && targetAfter.currentHp <= 0)) {
                    killStreak++;
                    await animateCardDeath('enemyBoard', targetIdx, target?.rarity);
                    showKillStreakBanner(killStreak);
                    await autoSleep(200);
                }
            }
        }

        // Phase 3: End turn
        if (stopRequested) return;
        while (B.getState().isAnimating) await autoSleep(80);

        const endState = B.getState();
        if (endState.enemyHP > 0 && endState.enemyHP <= 8) {
            showCommentary(pick(COMMENTARY.lowHP), 'tension');
            await autoSleep(400);
        }

        B.endTurn();
        killStreak = 0;
        await autoSleep(300);

        // Wait for enemy turn
        let waitCount = 0;
        while (waitCount < 200) {
            const s = B.getState();
            if (s.isPlayerTurn && !s.isAnimating) break;
            if (s.playerHP <= 0 || s.enemyHP <= 0) break;
            await autoSleep(80);
            waitCount++;
        }
    }

    async function autoPlayLoop() {
        window._nwAutoPlaying = true;
        stopRequested = false;
        createCanvas();
        animFrameId = requestAnimationFrame(tickParticles);

        while (isAutoPlaying && !stopRequested) {
            const B = window.NW_BATTLE;
            if (!B) break;
            const state = B.getState();
            if (state.playerHP <= 0) {
                showCommentary(pick(COMMENTARY.defeat), 'defeat');
                screenFlashFX('rgba(255,0,0,0.2)');
                break;
            }
            if (state.enemyHP <= 0) {
                showCommentary(pick(COMMENTARY.victory), 'victory');
                screenFlashFX('rgba(255,215,0,0.2)');
                sfx('victory');
                break;
            }
            if (state.isPlayerTurn && !state.isAnimating) {
                await autoPlayTurn();
            } else {
                await autoSleep(150);
            }
        }

        window._nwAutoPlaying = false;
        isAutoPlaying = false;
        const btn = document.getElementById('autoPlayBtn');
        if (btn) { btn.classList.remove('active'); btn.innerHTML = '<span class="auto-icon">&#9654;&#9654;</span> AUTO'; }
        if (speedBadge) { speedBadge.remove(); speedBadge = null; }

        // Let remaining particles finish
        setTimeout(() => { if (!isAutoPlaying) destroyCanvas(); }, 2000);
    }

    // ─── UI ─────────────────────────────────────────────────────
    function createUI() {
        const attackBtn = document.getElementById('attackBtn');
        if (!attackBtn) return;

        const btn = document.createElement('button');
        btn.id = 'autoPlayBtn';
        btn.className = 'auto-play-btn';
        btn.innerHTML = '<span class="auto-icon">&#9654;&#9654;</span> AUTO';
        btn.addEventListener('click', () => isAutoPlaying ? stopAutoPlay() : startAutoPlay());
        attackBtn.parentNode.insertBefore(btn, attackBtn.nextSibling);

        commentary = document.createElement('div');
        commentary.className = 'auto-commentary';
        commentary.id = 'autoCommentary';
        const arena = document.getElementById('arena');
        if (arena) arena.appendChild(commentary);
    }

    async function startAutoPlay() {
        // Preload gate — ensure everything is ready
        const btn = document.getElementById('autoPlayBtn');
        if (btn) btn.innerHTML = '<span class="auto-icon">&#9203;</span> LOADING...';
        await preloadAllAssets();

        isAutoPlaying = true;
        autoSpeed = 1;
        killStreak = 0;

        if (btn) { btn.classList.add('active'); btn.innerHTML = '<span class="auto-icon">&#9724;</span> STOP'; }

        speedBadge = document.createElement('div');
        speedBadge.className = 'auto-speed-badge';
        speedBadge.textContent = '1x';
        speedBadge.addEventListener('click', (e) => {
            e.stopPropagation();
            autoSpeed = autoSpeed === 1 ? 2 : autoSpeed === 2 ? 4 : 1;
            speedBadge.textContent = autoSpeed + 'x';
            speedBadge.classList.add('pulse');
            setTimeout(() => speedBadge.classList.remove('pulse'), 200);
        });
        document.body.appendChild(speedBadge);

        sfx('fightStart');
        autoPlayLoop();
    }

    function stopAutoPlay() {
        stopRequested = true;
        isAutoPlaying = false;
        window._nwAutoPlaying = false;
        const btn = document.getElementById('autoPlayBtn');
        if (btn) { btn.classList.remove('active'); btn.innerHTML = '<span class="auto-icon">&#9654;&#9654;</span> AUTO'; }
        if (speedBadge) { speedBadge.remove(); speedBadge = null; }
    }

    // ─── CSS ────────────────────────────────────────────────────
    function injectStyles() {
        const style = document.createElement('style');
        style.textContent = `
/* AUTO-PLAY BUTTON */
.auto-play-btn {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 10px 18px; margin-left: 8px;
    background: linear-gradient(135deg, #1a237e, #283593);
    border: 2px solid rgba(255,215,0,0.3);
    border-radius: 12px; color: #fff;
    font-family: 'Orbitron', sans-serif; font-size: 13px; font-weight: 700;
    cursor: pointer; transition: all 0.2s;
    text-transform: uppercase; letter-spacing: 1px;
    -webkit-tap-highlight-color: transparent;
}
.auto-play-btn:active { transform: scale(0.95); }
.auto-play-btn.active {
    background: linear-gradient(135deg, #b71c1c, #c62828);
    border-color: rgba(255,68,68,0.5);
    animation: autoPulse 2s infinite;
}
.auto-icon { font-size: 11px; }
@keyframes autoPulse {
    0%,100% { box-shadow: 0 0 8px rgba(255,68,68,0.3); }
    50% { box-shadow: 0 0 20px rgba(255,68,68,0.6); }
}

/* COMMENTARY — minimal, short bursts */
.auto-commentary {
    position: absolute; bottom: 12%; left: 50%;
    transform: translate(-50%, 0) scale(0.8);
    padding: 6px 16px; border-radius: 16px;
    background: rgba(0,0,0,0.85);
    color: #fff; font-family: 'Orbitron', sans-serif;
    font-size: 12px; font-weight: 700; text-align: center;
    pointer-events: none; z-index: 80;
    opacity: 0; transition: all 0.2s cubic-bezier(0.34,1.56,0.64,1);
    white-space: nowrap; max-width: 85vw;
    text-shadow: 0 0 8px rgba(255,215,0,0.3);
    border: 1px solid rgba(255,215,0,0.2);
}
.auto-commentary.show { opacity: 1; transform: translate(-50%, 0) scale(1); }
.auto-commentary.tension { color: #ff4444; border-color: rgba(255,68,68,0.4); font-size: 14px; }
.auto-commentary.victory { color: #ffd700; font-size: 18px; border-color: rgba(255,215,0,0.5); }
.auto-commentary.defeat { color: #ef5350; font-size: 16px; }

/* SPEED BADGE */
.auto-speed-badge {
    position: fixed; top: 12px; right: 12px;
    width: 44px; height: 44px;
    background: rgba(0,0,0,0.85); border: 2px solid rgba(255,215,0,0.4);
    border-radius: 50%; color: #ffd700;
    font-family: 'Orbitron', sans-serif; font-size: 14px; font-weight: 900;
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; z-index: 200;
    transition: transform 0.15s;
    -webkit-tap-highlight-color: transparent;
}
.auto-speed-badge:active { transform: scale(0.9); }
.auto-speed-badge.pulse { transform: scale(1.15); }

/* STREAK BANNER */
.auto-streak-banner {
    position: fixed; top: 30%; left: 50%;
    transform: translate(-50%, -50%) scale(var(--streak-scale, 1));
    color: var(--streak-color, #ffd700);
    font-family: 'Orbitron', sans-serif;
    font-size: 28px; font-weight: 900;
    text-shadow: 0 0 20px currentColor, 0 2px 6px rgba(0,0,0,0.9);
    pointer-events: none; z-index: 160;
    animation: streakBanner 1.2s forwards;
    letter-spacing: 3px;
}
@keyframes streakBanner {
    0% { opacity: 0; transform: translate(-50%, -50%) scale(0.3) rotate(-5deg); }
    15% { opacity: 1; transform: translate(-50%, -50%) scale(var(--streak-scale, 1.2)) rotate(0deg); }
    80% { opacity: 1; }
    100% { opacity: 0; transform: translate(-50%, -60%) scale(var(--streak-scale, 1.2)); }
}

/* SCREEN FLASH */
@keyframes autoFlashFade {
    0% { opacity: 1; }
    100% { opacity: 0; }
}

/* FLYING CARD — no extra styles needed, all inline */

/* MOBILE */
@media (max-width: 375px) {
    .auto-play-btn { padding: 8px 12px; font-size: 11px; margin-left: 4px; }
    .auto-commentary { font-size: 10px; padding: 5px 12px; }
    .auto-streak-banner { font-size: 20px; }
    .auto-speed-badge { width: 38px; height: 38px; font-size: 12px; top: 8px; right: 8px; }
}
@media (max-width: 320px) {
    .auto-play-btn { padding: 6px 10px; font-size: 10px; }
    .auto-commentary { font-size: 9px; }
    .auto-streak-banner { font-size: 16px; }
}
        `;
        document.head.appendChild(style);
    }

    // ─── Init ───────────────────────────────────────────────────
    function init() {
        if (!document.getElementById('arena') || !window.NW_BATTLE) return;
        injectStyles();
        createUI();
        console.log('[NW-AUTOPLAY v2.0] Visual fighting system ready');
    }

    window.NW_AUTOPLAY = {
        start: startAutoPlay,
        stop: stopAutoPlay,
        setSpeed: (s) => { autoSpeed = Math.max(1, Math.min(4, s)); if (speedBadge) speedBadge.textContent = autoSpeed + 'x'; },
        isActive: () => isAutoPlaying,
        preload: preloadAllAssets
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
