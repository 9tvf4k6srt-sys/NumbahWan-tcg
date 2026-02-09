/**
 * NUMBAHWAN SEAMLESS LOOPS v1.0
 * Friction-Free Flow State Maintenance
 * 
 * Key Principle: Every action ends with a clear, enticing next action.
 * The user should NEVER reach a dead end or have to think "what now?"
 * 
 * This creates the "just one more" effect.
 */

const NW_LOOPS = {
    version: '1.0.0',
    
    // =========================================
    // LOOP CONFIGURATIONS PER PAGE
    // =========================================
    pageLoops: {
        // FORGE: Pull cards → See results → Pull more OR build deck
        'forge': {
            triggers: ['pack-opened', 'card-revealed'],
            actions: [
                { weight: 50, type: 'continue', text: 'Pull Again! ', href: null, action: 'pullAgain' },
                { weight: 25, type: 'link', text: 'Build a Deck →', href: '/deckbuilder' },
                { weight: 15, type: 'link', text: 'See All Cards', href: '/collection' },
                { weight: 10, type: 'link', text: 'Battle Now! ', href: '/battle' }
            ],
            postReveal: {
                delay: 1500,
                message: 'Your luck is building...',
                showStats: true
            }
        },
        
        // BATTLE: Fight → Results → Fight again OR upgrade
        'battle': {
            triggers: ['battle-end', 'victory', 'defeat'],
            actions: [
                { weight: 60, type: 'continue', text: 'Battle Again! ', href: null, action: 'rematch' },
                { weight: 20, type: 'link', text: 'Upgrade Deck ', href: '/deckbuilder' },
                { weight: 15, type: 'link', text: 'Get More Cards ', href: '/forge' },
                { weight: 5, type: 'link', text: 'View Stats', href: '/profile' }
            ],
            postBattle: {
                victoryBonus: { chance: 0.25, msg: 'STREAK BONUS! +5 Gold ' },
                defeatEncourage: [
                    'Almost had them! Try a different strategy?',
                    'So close! One more round?',
                    'The cards favor the persistent...',
                    'Your deck is stronger than that result!'
                ]
            }
        },
        
        // COLLECTION: Browse → Find card you want → Go get it
        'collection': {
            triggers: ['card-viewed', 'filter-applied'],
            actions: [
                { weight: 40, type: 'link', text: 'Hunt for More ', href: '/forge' },
                { weight: 30, type: 'link', text: 'Build Deck →', href: '/deckbuilder' },
                { weight: 20, type: 'link', text: 'Test in Battle ', href: '/battle' },
                { weight: 10, type: 'link', text: 'Check Market ', href: '/market' }
            ],
            missingCardPrompt: {
                text: 'Missing this card? Hunt it at the Forge!',
                cta: 'Open Packs →'
            }
        },
        
        // DECKBUILDER: Build → Test → Refine
        'deckbuilder': {
            triggers: ['deck-saved', 'card-added'],
            actions: [
                { weight: 50, type: 'link', text: 'Test Your Deck! ', href: '/battle' },
                { weight: 25, type: 'link', text: 'Need More Cards?', href: '/forge' },
                { weight: 25, type: 'link', text: 'Check Collection', href: '/collection' }
            ]
        },
        
        // MARKET: Browse → Buy/Sell → More browsing
        'market': {
            triggers: ['purchase', 'sale', 'item-viewed'],
            actions: [
                { weight: 40, type: 'continue', text: 'Keep Browsing ', href: null, action: 'refresh' },
                { weight: 30, type: 'link', text: 'Open Packs ', href: '/forge' },
                { weight: 20, type: 'link', text: 'Check Wallet ', href: '/wallet' },
                { weight: 10, type: 'link', text: 'Battle & Earn ', href: '/battle' }
            ]
        },
        
        // ARCADE: Play → Score → Play more
        'arcade': {
            triggers: ['game-end', 'score-submitted'],
            actions: [
                { weight: 60, type: 'continue', text: 'Play Again! ', href: null, action: 'replay' },
                { weight: 20, type: 'link', text: 'Try Another Game', href: '/arcade' },
                { weight: 15, type: 'link', text: 'Spend Winnings ', href: '/forge' },
                { weight: 5, type: 'link', text: 'View Leaderboard', href: '/arcade#leaderboard' }
            ]
        },
        
        // WALLET: Check balance → Spend it
        'wallet': {
            triggers: ['balance-viewed'],
            actions: [
                { weight: 40, type: 'link', text: 'Open Packs ', href: '/forge' },
                { weight: 30, type: 'link', text: 'Trade on Market ', href: '/market' },
                { weight: 20, type: 'link', text: 'Earn More! ', href: '/battle' },
                { weight: 10, type: 'link', text: 'Play Arcade ', href: '/arcade' }
            ]
        },
        
        // D&D TABLETOP: Read rules → Play
        'tabletop': {
            triggers: ['rule-read', 'section-viewed'],
            actions: [
                { weight: 35, type: 'link', text: 'Read Rulebook ', href: '/tabletop/rulebook' },
                { weight: 35, type: 'link', text: 'Create Character', href: '/tabletop/character-sheets' },
                { weight: 20, type: 'link', text: 'Get Cards First ', href: '/forge' },
                { weight: 10, type: 'link', text: 'Start Campaign', href: '/tabletop/campaigns' }
            ]
        },
        
        // LORE/ABYSS: Explore story → Keep exploring
        'lore': {
            triggers: ['story-read', 'page-viewed'],
            actions: [
                { weight: 40, type: 'continue', text: 'More Stories ', href: null, action: 'nextStory' },
                { weight: 25, type: 'link', text: 'Meet the Characters ', href: '/cards' },
                { weight: 20, type: 'link', text: 'Explore The Abyss', href: '/lore' },
                { weight: 15, type: 'link', text: 'Battle Their Cards ', href: '/battle' }
            ]
        }
    },
    
    // =========================================
    // MOTIVATIONAL MESSAGES
    // =========================================
    motivationalMessages: {
        lowActivity: [
            "The cards are calling...",
            "Your collection awaits!",
            "A legendary card could be next...",
            "The Forge is warm and ready."
        ],
        streak: [
            "You're on fire! ",
            "Keep the momentum going!",
            "The cards favor you today!",
            "Legendary vibes detected!"
        ],
        returning: [
            "Welcome back, Champion!",
            "Your cards missed you!",
            "Ready for another adventure?",
            "The guild awaits your return!"
        ],
        milestone: [
            "Achievement unlocked! Keep going!",
            "You're making great progress!",
            "The legends speak of players like you...",
            "Your collection grows stronger!"
        ]
    },
    
    // =========================================
    // STATE
    // =========================================
    state: {
        currentPage: null,
        actionsThisSession: 0,
        loopPromptShown: false,
        lastPromptTime: 0
    },
    
    // =========================================
    // INITIALIZATION
    // =========================================
    init() {
        this.state.currentPage = this.detectPage();
        this.bindPageTriggers();
        this.setupIdleDetection();
        this.injectStyles();
        
        console.log(`NW_LOOPS v${this.version} initialized on: ${this.state.currentPage}`);
    },
    
    detectPage() {
        const path = location.pathname.replace(/^\/|\.html$/g, '') || 'index';
        // Check for lore subpages
        if (path.includes('lore') || path.includes('reggina') || path.includes('zakum')) {
            return 'lore';
        }
        return path;
    },
    
    // =========================================
    // TRIGGER BINDING
    // =========================================
    bindPageTriggers() {
        const pageConfig = this.pageLoops[this.state.currentPage];
        if (!pageConfig) return;
        
        // Listen for custom events
        pageConfig.triggers.forEach(trigger => {
            document.addEventListener(trigger, (e) => {
                this.onTrigger(trigger, e.detail);
            });
        });
        
        // Auto-detect common actions
        this.bindCommonTriggers();
    },
    
    bindCommonTriggers() {
        // Detect pack opening completion
        if (this.state.currentPage === 'forge') {
            const observer = new MutationObserver((mutations) => {
                mutations.forEach(m => {
                    if (m.target.classList?.contains('card-revealed') || 
                        m.target.classList?.contains('pack-opened')) {
                        this.onTrigger('card-revealed');
                    }
                });
            });
            
            const packArea = document.querySelector('.pack-container, .forge-area, #forge-area');
            if (packArea) {
                observer.observe(packArea, { 
                    subtree: true, 
                    attributes: true, 
                    attributeFilter: ['class'] 
                });
            }
        }
        
        // Detect battle end
        if (this.state.currentPage === 'battle') {
            const observer = new MutationObserver((mutations) => {
                mutations.forEach(m => {
                    const target = m.target;
                    if (target.classList?.contains('battle-result') ||
                        target.classList?.contains('victory') ||
                        target.classList?.contains('defeat')) {
                        const isVictory = target.classList?.contains('victory');
                        this.onTrigger('battle-end', { victory: isVictory });
                    }
                });
            });
            
            const battleArea = document.querySelector('.battle-container, #battle-area, .arena');
            if (battleArea) {
                observer.observe(battleArea, { 
                    subtree: true, 
                    attributes: true,
                    childList: true
                });
            }
        }
    },
    
    // =========================================
    // TRIGGER HANDLER
    // =========================================
    onTrigger(trigger, data = {}) {
        this.state.actionsThisSession++;
        
        // Notify zone system
        if (typeof NW_ZONE !== 'undefined') {
            NW_ZONE.action(trigger);
        }
        
        // Show loop prompt after a small delay
        const timeSinceLastPrompt = Date.now() - this.state.lastPromptTime;
        if (timeSinceLastPrompt > 3000) {
            setTimeout(() => {
                this.showLoopPrompt(data);
            }, this.getPromptDelay());
        }
    },
    
    getPromptDelay() {
        const pageConfig = this.pageLoops[this.state.currentPage];
        return pageConfig?.postReveal?.delay || 1500;
    },
    
    // =========================================
    // LOOP PROMPT UI
    // =========================================
    showLoopPrompt(data = {}) {
        // Remove any existing prompts
        document.querySelectorAll('.nw-loop-prompt').forEach(el => el.remove());
        
        const pageConfig = this.pageLoops[this.state.currentPage];
        if (!pageConfig) return;
        
        // Select action based on weights
        const action = this.selectWeightedAction(pageConfig.actions);
        
        // Build prompt
        const prompt = document.createElement('div');
        prompt.className = 'nw-loop-prompt';
        
        // Add contextual message
        let contextMsg = '';
        if (data.victory) {
            contextMsg = '<div class="nw-loop-victory">Victory! Keep the streak going!</div>';
        } else if (data.victory === false) {
            const encourageMsg = pageConfig.postBattle?.defeatEncourage || this.motivationalMessages.streak;
            contextMsg = `<div class="nw-loop-encourage">${encourageMsg[Math.floor(Math.random() * encourageMsg.length)]}</div>`;
        }
        
        prompt.innerHTML = `
            ${contextMsg}
            <div class="nw-loop-actions">
                ${this.generateActionButtons(pageConfig.actions)}
            </div>
            <button class="nw-loop-dismiss" onclick="this.parentElement.remove()">×</button>
        `;
        
        document.body.appendChild(prompt);
        
        // Animate in
        requestAnimationFrame(() => {
            prompt.classList.add('show');
        });
        
        this.state.lastPromptTime = Date.now();
        
        // Auto-remove after 15 seconds if not interacted
        setTimeout(() => {
            if (prompt.parentElement) {
                prompt.classList.remove('show');
                setTimeout(() => prompt.remove(), 300);
            }
        }, 15000);
    },
    
    selectWeightedAction(actions) {
        const totalWeight = actions.reduce((sum, a) => sum + a.weight, 0);
        let random = Math.random() * totalWeight;
        
        for (const action of actions) {
            random -= action.weight;
            if (random <= 0) return action;
        }
        return actions[0];
    },
    
    generateActionButtons(actions) {
        // Show top 2-3 actions
        const topActions = actions
            .sort((a, b) => b.weight - a.weight)
            .slice(0, 3);
        
        return topActions.map((action, i) => {
            const isPrimary = i === 0;
            const classes = isPrimary ? 'nw-loop-btn primary' : 'nw-loop-btn';
            
            if (action.type === 'link') {
                return `<a href="${action.href}" class="${classes}">${action.text}</a>`;
            } else {
                return `<button class="${classes}" onclick="NW_LOOPS.executeAction('${action.action}')">${action.text}</button>`;
            }
        }).join('');
    },
    
    executeAction(actionName) {
        // Remove prompt
        document.querySelectorAll('.nw-loop-prompt').forEach(el => el.remove());
        
        // Execute action
        switch (actionName) {
            case 'pullAgain':
                // Trigger pack pull if function exists
                if (typeof openPack === 'function') openPack();
                else if (typeof pullCard === 'function') pullCard();
                else if (typeof NW_FORGE !== 'undefined') NW_FORGE.pull();
                break;
                
            case 'rematch':
                // Start new battle
                if (typeof startBattle === 'function') startBattle();
                else if (typeof NW_BATTLE !== 'undefined') NW_BATTLE.start();
                else location.reload();
                break;
                
            case 'replay':
                // Replay arcade game
                if (typeof startGame === 'function') startGame();
                else if (typeof NW_ARCADE !== 'undefined') NW_ARCADE.start();
                else location.reload();
                break;
                
            case 'refresh':
                location.reload();
                break;
                
            case 'nextStory':
                // Navigate to next lore page
                this.navigateToNextLore();
                break;
        }
    },
    
    navigateToNextLore() {
        const lorePages = [
            '/lore', '/lore/reggina-origin.html', '/lore/sacred-log.html',
            '/lore/whale-wars.html', '/lore/conspiracy-board.html',
            '/lore/afk-incident.html', '/zakum.html', '/lore/drama-timeline.html'
        ];
        
        const currentIndex = lorePages.findIndex(p => location.pathname.includes(p.replace('.html', '')));
        const nextIndex = (currentIndex + 1) % lorePages.length;
        location.href = lorePages[nextIndex];
    },
    
    // =========================================
    // IDLE DETECTION - Bring them back
    // =========================================
    setupIdleDetection() {
        let idleTime = 0;
        const idleThreshold = 30000; // 30 seconds
        
        // Reset on activity
        const resetIdle = () => {
            idleTime = 0;
        };
        
        document.addEventListener('mousemove', resetIdle);
        document.addEventListener('keydown', resetIdle);
        document.addEventListener('click', resetIdle);
        document.addEventListener('scroll', resetIdle);
        document.addEventListener('touchstart', resetIdle);
        
        // Check idle every 5 seconds
        setInterval(() => {
            idleTime += 5000;
            
            if (idleTime >= idleThreshold && !this.state.loopPromptShown) {
                this.showIdlePrompt();
                this.state.loopPromptShown = true;
            }
        }, 5000);
    },
    
    showIdlePrompt() {
        const messages = this.motivationalMessages.lowActivity;
        const msg = messages[Math.floor(Math.random() * messages.length)];
        
        // Remove any existing
        document.querySelectorAll('.nw-idle-prompt').forEach(el => el.remove());
        
        const prompt = document.createElement('div');
        prompt.className = 'nw-idle-prompt';
        prompt.innerHTML = `
            <div class="nw-idle-content">
                <span class="nw-idle-icon"></span>
                <span class="nw-idle-text">${msg}</span>
            </div>
            <div class="nw-idle-actions">
                <a href="/forge" class="nw-idle-btn primary">Open Packs </a>
                <a href="/battle" class="nw-idle-btn">Battle </a>
            </div>
        `;
        
        document.body.appendChild(prompt);
        requestAnimationFrame(() => prompt.classList.add('show'));
        
        // Remove on any interaction
        const removePrompt = () => {
            prompt.classList.remove('show');
            setTimeout(() => prompt.remove(), 300);
            this.state.loopPromptShown = false;
        };
        
        document.addEventListener('click', removePrompt, { once: true });
        document.addEventListener('keydown', removePrompt, { once: true });
        
        // Auto-remove after 20 seconds
        setTimeout(() => {
            if (prompt.parentElement) {
                removePrompt();
            }
        }, 20000);
    },
    
    // =========================================
    // STYLES
    // =========================================
    injectStyles() {
        if (document.getElementById('nw-loops-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'nw-loops-styles';
        style.textContent = `
            /* ==========================================
             * NW_LOOPS STYLES - Seamless Flow
             * ========================================== */
            
            /* ----- LOOP PROMPT ----- */
            .nw-loop-prompt {
                position: fixed;
                bottom: 100px;
                left: 50%;
                transform: translateX(-50%) translateY(30px);
                z-index: 700;
                background: linear-gradient(145deg, rgba(20, 20, 35, 0.98), rgba(10, 10, 20, 0.98));
                border: 1px solid rgba(255, 107, 0, 0.4);
                border-radius: 16px;
                padding: 20px 28px;
                box-shadow: 0 8px 40px rgba(0, 0, 0, 0.5), 0 0 40px rgba(255, 107, 0, 0.15);
                backdrop-filter: blur(12px);
                opacity: 0;
                transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                max-width: 90vw;
            }
            .nw-loop-prompt.show {
                opacity: 1;
                transform: translateX(-50%) translateY(0);
            }
            
            .nw-loop-victory {
                text-align: center;
                font-size: 1.1rem;
                font-weight: 700;
                color: #ffd700;
                margin-bottom: 16px;
                text-shadow: 0 0 20px rgba(255, 215, 0, 0.5);
            }
            .nw-loop-encourage {
                text-align: center;
                color: rgba(255, 255, 255, 0.8);
                margin-bottom: 16px;
                font-size: 0.95rem;
            }
            
            .nw-loop-actions {
                display: flex;
                gap: 10px;
                justify-content: center;
                flex-wrap: wrap;
            }
            
            .nw-loop-btn {
                padding: 10px 20px;
                border-radius: 10px;
                font-weight: 600;
                font-size: 0.9rem;
                text-decoration: none;
                transition: all 0.2s ease;
                border: none;
                cursor: pointer;
                background: rgba(255, 255, 255, 0.1);
                color: rgba(255, 255, 255, 0.8);
            }
            .nw-loop-btn:hover {
                background: rgba(255, 255, 255, 0.2);
                color: white;
                transform: scale(1.02);
            }
            .nw-loop-btn.primary {
                background: linear-gradient(135deg, #ff6b00, #ff9500);
                color: white;
                box-shadow: 0 4px 15px rgba(255, 107, 0, 0.4);
            }
            .nw-loop-btn.primary:hover {
                box-shadow: 0 6px 25px rgba(255, 107, 0, 0.5);
                transform: scale(1.05);
            }
            
            .nw-loop-dismiss {
                position: absolute;
                top: 8px;
                right: 10px;
                background: none;
                border: none;
                color: rgba(255, 255, 255, 0.4);
                font-size: 18px;
                cursor: pointer;
                padding: 4px 8px;
                line-height: 1;
            }
            .nw-loop-dismiss:hover {
                color: rgba(255, 255, 255, 0.8);
            }
            
            /* ----- IDLE PROMPT ----- */
            .nw-idle-prompt {
                position: fixed;
                bottom: 50%;
                left: 50%;
                transform: translate(-50%, 50%) scale(0.9);
                z-index: 800;
                background: linear-gradient(145deg, rgba(30, 20, 50, 0.98), rgba(15, 10, 25, 0.98));
                border: 2px solid rgba(255, 107, 0, 0.5);
                border-radius: 20px;
                padding: 32px 40px;
                text-align: center;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6), 0 0 60px rgba(255, 107, 0, 0.2);
                opacity: 0;
                transition: all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            }
            .nw-idle-prompt.show {
                opacity: 1;
                transform: translate(-50%, 50%) scale(1);
            }
            
            .nw-idle-content {
                margin-bottom: 24px;
            }
            .nw-idle-icon {
                font-size: 40px;
                display: block;
                margin-bottom: 12px;
                animation: idlePulse 2s ease-in-out infinite;
            }
            @keyframes idlePulse {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.1); }
            }
            .nw-idle-text {
                font-size: 1.2rem;
                color: rgba(255, 255, 255, 0.9);
                font-weight: 500;
            }
            
            .nw-idle-actions {
                display: flex;
                gap: 12px;
                justify-content: center;
            }
            .nw-idle-btn {
                padding: 12px 24px;
                border-radius: 12px;
                font-weight: 600;
                text-decoration: none;
                transition: all 0.2s ease;
                background: rgba(255, 255, 255, 0.1);
                color: rgba(255, 255, 255, 0.8);
            }
            .nw-idle-btn:hover {
                background: rgba(255, 255, 255, 0.2);
                color: white;
            }
            .nw-idle-btn.primary {
                background: linear-gradient(135deg, #ff6b00, #ff9500);
                color: white;
                box-shadow: 0 4px 20px rgba(255, 107, 0, 0.4);
            }
            .nw-idle-btn.primary:hover {
                transform: scale(1.05);
                box-shadow: 0 6px 30px rgba(255, 107, 0, 0.5);
            }
            
            /* ----- RESPONSIVE ----- */
            @media (max-width: 480px) {
                .nw-loop-prompt {
                    bottom: 80px;
                    padding: 16px 20px;
                }
                .nw-loop-btn {
                    padding: 8px 16px;
                    font-size: 0.85rem;
                }
                .nw-idle-prompt {
                    padding: 24px;
                    width: 90vw;
                }
                .nw-idle-actions {
                    flex-direction: column;
                }
            }
        `;
        document.head.appendChild(style);
    },
    
    // =========================================
    // PUBLIC API
    // =========================================
    
    // Manually trigger a loop prompt (for custom integrations)
    trigger(eventName, data = {}) {
        this.onTrigger(eventName, data);
    },
    
    // Show a custom prompt
    showPrompt(message, actions = []) {
        document.querySelectorAll('.nw-loop-prompt').forEach(el => el.remove());
        
        const prompt = document.createElement('div');
        prompt.className = 'nw-loop-prompt';
        
        const actionsHtml = actions.map((a, i) => {
            const cls = i === 0 ? 'nw-loop-btn primary' : 'nw-loop-btn';
            return `<a href="${a.href}" class="${cls}">${a.text}</a>`;
        }).join('');
        
        prompt.innerHTML = `
            <div class="nw-loop-encourage">${message}</div>
            <div class="nw-loop-actions">${actionsHtml}</div>
            <button class="nw-loop-dismiss" onclick="this.parentElement.remove()">×</button>
        `;
        
        document.body.appendChild(prompt);
        requestAnimationFrame(() => prompt.classList.add('show'));
        
        return prompt;
    }
};

// Auto-initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => NW_LOOPS.init());
} else {
    NW_LOOPS.init();
}

// Expose globally
window.NW_LOOPS = NW_LOOPS;

console.log('NW_LOOPS module loaded - Seamless Loop Engineering Active');
