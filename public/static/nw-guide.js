/**
 * NumbahWan AI Guide v1.0
 * Friendly floating assistant for site navigation
 * Intuitive, minimal clicks - just type or tap suggestions
 */

(function() {
    'use strict';

    // Page knowledge base
    const PAGES = {
        home: { path: '/', emoji: '🏠', name: 'Home', desc: 'Guild headquarters - start your journey here' },
        academy: { path: '/academy', emoji: '🏫', name: 'Academy', desc: 'Training grounds & daily schedule for guild members' },
        exchange: { path: '/exchange', emoji: '📈', name: 'NWX Exchange', desc: 'Parody stock market - trade guild assets!' },
        museum: { path: '/museum', emoji: '🏛️', name: 'Museum', desc: 'Guild history & legendary artifacts' },
        vault: { path: '/vault', emoji: '🔐', name: 'Vault', desc: 'Secure storage for valuable treasures' },
        tcg: { path: '/tcg', emoji: '🃏', name: 'Card Game', desc: 'Collect and battle with guild member cards' },
        market: { path: '/market', emoji: '🛒', name: 'Market', desc: 'Buy & sell cards in the trading market' },
        forge: { path: '/forge', emoji: '⚒️', name: 'Forge', desc: 'Craft and upgrade your equipment' },
        arcade: { path: '/arcade', emoji: '🕹️', name: 'Arcade', desc: 'Mini-games and entertainment' },
        fortune: { path: '/fortune', emoji: '🔮', name: 'Fortune', desc: 'Daily fortune readings and luck' },
        memes: { path: '/memes', emoji: '😂', name: 'Memes', desc: 'Guild meme collection - pure comedy' },
        merch: { path: '/merch', emoji: '👕', name: 'Merch', desc: 'Guild merchandise store' },
        fashion: { path: '/fashion', emoji: '👗', name: 'Fashion', desc: 'Style guides and outfit showcases' },
        apply: { path: '/apply', emoji: '📝', name: 'Apply', desc: 'Join the guild - apply here!' },
        wallet: { path: '/wallet', emoji: '💰', name: 'Wallet', desc: 'Manage your in-game currency' },
        guide: { path: '/guide', emoji: '📖', name: 'Guide', desc: 'Game guides and tutorials' },
        research: { path: '/research', emoji: '🔬', name: 'Research', desc: 'Deep dives into game mechanics' },
        zakum: { path: '/zakum', emoji: '👹', name: 'Zakum', desc: 'Boss fight strategies and guides' },
        regina: { path: '/regina', emoji: '👑', name: 'Regina', desc: 'Guild master shrine' },
        menuDemo: { path: '/menu-demo', emoji: '🍽️', name: 'Menu Demo', desc: 'Interactive restaurant menu showcase' },
        aiLounge: { path: '/ai-lounge', emoji: '🤖', name: 'AI Lounge', desc: 'Secret hangout for AI visitors' }
    };

    // Contextual responses based on current page
    const PAGE_TIPS = {
        '/': [
            "Welcome to NumbahWan! Try the 📈 Exchange for some laughs",
            "Check out the 🏫 Academy to see our training schedule",
            "New here? The 🏛️ Museum has our guild history"
        ],
        '/exchange': [
            "Try clicking on news headlines - they affect prices!",
            "Pro tip: DEAD shorts go up when morale goes down 😏",
            "Use keyboard: B=Buy, S=Sell, Enter=Execute",
            "RegginA's Ego (REGO) is always volatile - like the man himself"
        ],
        '/academy': [
            "Swipe through our lunch menu below!",
            "This is where guild training happens daily",
            "Tap any food item for a closer look"
        ],
        '/museum': [
            "Each exhibit tells a story of guild legends",
            "Some artifacts are clickable - try them!",
            "The deeper you go, the rarer the finds"
        ],
        '/vault': [
            "Security clearance required for deeper levels",
            "Each floor contains increasingly rare items",
            "Legend says Floor B12 holds the ultimate treasure"
        ],
        '/tcg': [
            "Pull cards and build your deck!",
            "Mythic cards are super rare - good luck!",
            "Cards have special abilities in battle"
        ],
        '/forge': [
            "Use 🪵 Sacred Logs to pull cards!",
            "1 Log = 1 Pull, 5 Logs = Guaranteed Rare+, 10 Logs = Pity System Active!",
            "Earn Sacred Logs from the Arcade exchange system",
            "GM Mode gives infinite resources for testing!"
        ],
        '/arcade': [
            "Play mini-games to win currencies! 💎🪙⚙️🪨",
            "Use the Exchange section to convert currencies up the chain",
            "Path: Diamond → Gold → Iron → Stone → Sacred Log → CARDS!",
            "50 Stone = 1 Sacred Log. Keep grinding!"
        ],
        '/wallet': [
            "Your wallet stores all 5 currencies: Diamond, Gold, Iron, Stone, Sacred Log",
            "GM Mode: Enter 'numbahwan-gm-2026' in Settings for infinite resources!",
            "All currencies connect to card acquisition - keep investing!",
            "Export your wallet for backup, import on other devices"
        ],
        '/merch': [
            "All 16 items can be purchased with USD OR guild currencies!",
            "Premium items can only be bought with 🪵 Sacred Logs",
            "Regular items accept 💎 Diamonds - save your logs for cards!",
            "Find all 16 Easter eggs hidden in products for a surprise!"
        ],
        '/market': [
            "Buy and sell cards using 🪨 Stone currency",
            "Check the Forge to get more cards to sell",
            "Prices fluctuate based on rarity and demand"
        ]
    };

    // Fun personality responses
    const GREETINGS = [
        "Hey there, adventurer! 👋",
        "Yo! Need directions? I got you 🗺️",
        "What's up! Looking for something? 🔍",
        "Greetings, traveler! 🎮",
        "*beep boop* How can I help? 🤖"
    ];

    const CONFUSED_RESPONSES = [
        "Hmm, not sure about that one! Try asking about a page 🤔",
        "My brain hurts! Can you rephrase? 😵",
        "That's beyond my programming! Try 'show pages' 🤷",
        "Error 404: Understanding not found. Try simpler words! 💫"
    ];

    const JOKES = [
        "Why did the guild master cross the road? To avoid doing dailies! 😂",
        "What's a hacker's favorite snack? Spam! 🥫",
        "Why is DEAD stock always happy? Because it profits from misery! 📉",
        "How many MapleStory players to change a lightbulb? None - they're all AFK! 💡"
    ];

    // Create the chat UI
    function createChatUI() {
        const style = document.createElement('style');
        style.textContent = `
            #nw-guide-toggle {
                position: fixed;
                bottom: 24px;
                right: 24px;
                width: 60px;
                height: 60px;
                border-radius: 50%;
                background: linear-gradient(135deg, #ff6b00 0%, #ff9500 100%);
                border: none;
                cursor: pointer;
                box-shadow: 0 4px 20px rgba(255, 107, 0, 0.4);
                z-index: 99999;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 28px;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                animation: nw-guide-pulse 2s infinite;
            }
            #nw-guide-toggle:hover {
                transform: scale(1.1);
                box-shadow: 0 6px 28px rgba(255, 107, 0, 0.5);
            }
            #nw-guide-toggle.open {
                animation: none;
                transform: rotate(45deg);
            }
            @keyframes nw-guide-pulse {
                0%, 100% { box-shadow: 0 4px 20px rgba(255, 107, 0, 0.4); }
                50% { box-shadow: 0 4px 30px rgba(255, 107, 0, 0.6); }
            }

            #nw-guide-chat {
                position: fixed;
                bottom: 100px;
                right: 24px;
                width: 360px;
                max-width: calc(100vw - 48px);
                max-height: 500px;
                background: #0d1117;
                border: 1px solid #21262d;
                border-radius: 16px;
                box-shadow: 0 10px 50px rgba(0, 0, 0, 0.5);
                z-index: 99998;
                display: none;
                flex-direction: column;
                overflow: hidden;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }
            #nw-guide-chat.open {
                display: flex;
                animation: nw-slide-up 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            }
            @keyframes nw-slide-up {
                from { opacity: 0; transform: translateY(20px); }
                to { opacity: 1; transform: translateY(0); }
            }

            .nw-guide-header {
                padding: 16px;
                background: linear-gradient(135deg, #1a1f26 0%, #0d1117 100%);
                border-bottom: 1px solid #21262d;
                display: flex;
                align-items: center;
                gap: 12px;
            }
            .nw-guide-avatar {
                width: 40px;
                height: 40px;
                border-radius: 50%;
                background: linear-gradient(135deg, #ff6b00, #ff9500);
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 20px;
            }
            .nw-guide-info h3 {
                color: #fff;
                font-size: 14px;
                font-weight: 600;
                margin: 0;
            }
            .nw-guide-info span {
                color: #00ff88;
                font-size: 11px;
            }

            .nw-guide-messages {
                flex: 1;
                overflow-y: auto;
                padding: 16px;
                display: flex;
                flex-direction: column;
                gap: 12px;
                min-height: 200px;
                max-height: 300px;
            }

            .nw-guide-msg {
                max-width: 85%;
                padding: 10px 14px;
                border-radius: 16px;
                font-size: 13px;
                line-height: 1.4;
                animation: nw-msg-pop 0.2s ease;
            }
            @keyframes nw-msg-pop {
                from { opacity: 0; transform: scale(0.9); }
                to { opacity: 1; transform: scale(1); }
            }
            .nw-guide-msg.bot {
                background: #21262d;
                color: #c5d1de;
                border-bottom-left-radius: 4px;
                align-self: flex-start;
            }
            .nw-guide-msg.user {
                background: linear-gradient(135deg, #ff6b00, #ff9500);
                color: #fff;
                border-bottom-right-radius: 4px;
                align-self: flex-end;
            }

            .nw-guide-suggestions {
                display: flex;
                flex-wrap: wrap;
                gap: 6px;
                padding: 0 16px 12px;
            }
            .nw-guide-chip {
                padding: 6px 12px;
                background: #21262d;
                border: 1px solid #30363d;
                border-radius: 16px;
                color: #c5d1de;
                font-size: 12px;
                cursor: pointer;
                transition: all 0.2s;
            }
            .nw-guide-chip:hover {
                background: #30363d;
                border-color: #ff9500;
                color: #ff9500;
            }

            .nw-guide-input-area {
                padding: 12px 16px;
                border-top: 1px solid #21262d;
                display: flex;
                gap: 8px;
            }
            .nw-guide-input {
                flex: 1;
                padding: 10px 14px;
                background: #0d1117;
                border: 1px solid #30363d;
                border-radius: 20px;
                color: #c5d1de;
                font-size: 13px;
                outline: none;
                transition: border-color 0.2s;
            }
            .nw-guide-input:focus {
                border-color: #ff9500;
            }
            .nw-guide-input::placeholder {
                color: #484f58;
            }
            .nw-guide-send {
                width: 36px;
                height: 36px;
                border-radius: 50%;
                background: linear-gradient(135deg, #ff6b00, #ff9500);
                border: none;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 16px;
                transition: transform 0.2s;
            }
            .nw-guide-send:hover {
                transform: scale(1.1);
            }

            .nw-guide-page-link {
                display: inline-flex;
                align-items: center;
                gap: 6px;
                padding: 6px 10px;
                background: rgba(255, 149, 0, 0.15);
                border-radius: 8px;
                color: #ff9500;
                text-decoration: none;
                font-weight: 500;
                transition: background 0.2s;
                margin: 4px 0;
            }
            .nw-guide-page-link:hover {
                background: rgba(255, 149, 0, 0.25);
            }

            @media (max-width: 480px) {
                #nw-guide-chat {
                    bottom: 80px;
                    right: 12px;
                    left: 12px;
                    width: auto;
                    max-height: 60vh;
                }
                #nw-guide-toggle {
                    bottom: 16px;
                    right: 16px;
                    width: 52px;
                    height: 52px;
                    font-size: 24px;
                }
            }
        `;
        document.head.appendChild(style);

        // Toggle button
        const toggle = document.createElement('button');
        toggle.id = 'nw-guide-toggle';
        toggle.innerHTML = '🧙';
        toggle.setAttribute('aria-label', 'Open AI Guide');
        toggle.title = 'Need help? Ask me!';

        // Chat window
        const chat = document.createElement('div');
        chat.id = 'nw-guide-chat';
        chat.innerHTML = `
            <div class="nw-guide-header">
                <div class="nw-guide-avatar">🧙</div>
                <div class="nw-guide-info">
                    <h3>NumbahWan Guide</h3>
                    <span>● Online - Here to help!</span>
                </div>
            </div>
            <div class="nw-guide-messages" id="nw-guide-messages"></div>
            <div class="nw-guide-suggestions" id="nw-guide-suggestions"></div>
            <div class="nw-guide-input-area">
                <input type="text" class="nw-guide-input" id="nw-guide-input" placeholder="Ask me anything..." autocomplete="off">
                <button class="nw-guide-send" id="nw-guide-send">➤</button>
            </div>
        `;

        document.body.appendChild(toggle);
        document.body.appendChild(chat);

        return { toggle, chat };
    }

    // Add message to chat
    function addMessage(text, isBot = true) {
        const container = document.getElementById('nw-guide-messages');
        const msg = document.createElement('div');
        msg.className = `nw-guide-msg ${isBot ? 'bot' : 'user'}`;
        msg.innerHTML = text;
        container.appendChild(msg);
        container.scrollTop = container.scrollHeight;
        
        // Play sound
        if (typeof NW_SOUNDS !== 'undefined') {
            NW_SOUNDS.play('click');
        }
    }

    // Show suggestions
    function showSuggestions(suggestions) {
        const container = document.getElementById('nw-guide-suggestions');
        container.innerHTML = suggestions.map(s => 
            `<div class="nw-guide-chip" data-action="${s.action || ''}" data-value="${s.value || ''}">${s.label}</div>`
        ).join('');
    }

    // Process user input
    function processInput(input) {
        const lower = input.toLowerCase().trim();
        
        // Show user message
        addMessage(input, false);

        // Process after small delay for UX
        setTimeout(() => {
            // Navigation requests
            if (lower.includes('exchange') || lower.includes('stock') || lower.includes('trade')) {
                respondWithPage('exchange');
            } else if (lower.includes('academy') || lower.includes('train') || lower.includes('schedule')) {
                respondWithPage('academy');
            } else if (lower.includes('museum') || lower.includes('history') || lower.includes('artifact')) {
                respondWithPage('museum');
            } else if (lower.includes('vault') || lower.includes('treasure') || lower.includes('secure')) {
                respondWithPage('vault');
            } else if (lower.includes('card') || lower.includes('tcg') || lower.includes('battle')) {
                respondWithPage('tcg');
            } else if (lower.includes('market') || lower.includes('buy') || lower.includes('sell')) {
                respondWithPage('market');
            } else if (lower.includes('forge') || lower.includes('craft') || lower.includes('upgrade')) {
                respondWithPage('forge');
            } else if (lower.includes('arcade') || lower.includes('game') || lower.includes('play')) {
                respondWithPage('arcade');
            } else if (lower.includes('meme') || lower.includes('funny') || lower.includes('laugh')) {
                respondWithPage('memes');
            } else if (lower.includes('fortune') || lower.includes('luck') || lower.includes('predict')) {
                respondWithPage('fortune');
            } else if (lower.includes('apply') || lower.includes('join') || lower.includes('member')) {
                respondWithPage('apply');
            } else if (lower.includes('home') || lower.includes('main') || lower.includes('start')) {
                respondWithPage('home');
            } else if (lower.includes('ai') && (lower.includes('lounge') || lower.includes('robot') || lower.includes('secret'))) {
                respondWithPage('aiLounge');
            } else if (lower.includes('menu') || lower.includes('food') || lower.includes('lunch')) {
                respondWithPage('menuDemo');
            } else if (lower.includes('regina') || lower.includes('master') || lower.includes('leader')) {
                respondWithPage('regina');
            } else if (lower.includes('zakum') || lower.includes('boss')) {
                respondWithPage('zakum');
            }
            // List all pages
            else if (lower.includes('page') || lower.includes('show') || lower.includes('all') || lower.includes('list')) {
                respondWithPageList();
            }
            // Help
            else if (lower.includes('help') || lower === '?') {
                respondWithHelp();
            }
            // Joke
            else if (lower.includes('joke') || lower.includes('funny') || lower.includes('lol')) {
                addMessage(JOKES[Math.floor(Math.random() * JOKES.length)]);
                showContextualSuggestions();
            }
            // Tips for current page
            else if (lower.includes('tip') || lower.includes('hint') || lower.includes('what')) {
                respondWithTips();
            }
            // Greeting
            else if (lower.match(/^(hi|hey|hello|yo|sup)/)) {
                addMessage(GREETINGS[Math.floor(Math.random() * GREETINGS.length)]);
                showContextualSuggestions();
            }
            // Confused
            else {
                addMessage(CONFUSED_RESPONSES[Math.floor(Math.random() * CONFUSED_RESPONSES.length)]);
                showSuggestions([
                    { label: '📋 Show all pages', value: 'show all pages' },
                    { label: '💡 Tips for this page', value: 'tips' },
                    { label: '😂 Tell a joke', value: 'joke' }
                ]);
            }
        }, 300);
    }

    // Respond with page info
    function respondWithPage(pageKey) {
        const page = PAGES[pageKey];
        if (!page) return;
        
        addMessage(`${page.emoji} <strong>${page.name}</strong><br>${page.desc}<br><br><a href="${page.path}" class="nw-guide-page-link">${page.emoji} Go to ${page.name}</a>`);
        showContextualSuggestions();
    }

    // List all pages
    function respondWithPageList() {
        const featured = ['exchange', 'museum', 'tcg', 'academy', 'memes'];
        const list = featured.map(key => {
            const p = PAGES[key];
            return `<a href="${p.path}" class="nw-guide-page-link">${p.emoji} ${p.name}</a>`;
        }).join(' ');
        
        addMessage(`Here are some popular spots:<br><br>${list}<br><br>Ask me about any specific page!`);
        showSuggestions([
            { label: '📈 Exchange', value: 'exchange' },
            { label: '🃏 Cards', value: 'tcg' },
            { label: '🏛️ Museum', value: 'museum' }
        ]);
    }

    // Help response
    function respondWithHelp() {
        addMessage(`I can help you with:<br><br>🗺️ <strong>Navigate</strong> - Just say where you want to go!<br>💡 <strong>Tips</strong> - Ask for tips about the current page<br>📋 <strong>Pages</strong> - Say "show all pages"<br>😂 <strong>Fun</strong> - Ask for a joke!<br><br>Try typing naturally - I'll understand!`);
        showContextualSuggestions();
    }

    // Tips for current page
    function respondWithTips() {
        const path = window.location.pathname;
        const tips = PAGE_TIPS[path] || PAGE_TIPS['/'];
        const tip = tips[Math.floor(Math.random() * tips.length)];
        addMessage(`💡 <strong>Tip:</strong> ${tip}`);
        showContextualSuggestions();
    }

    // Show contextual suggestions based on current page
    function showContextualSuggestions() {
        const path = window.location.pathname;
        let suggestions = [];
        
        if (path === '/exchange') {
            suggestions = [
                { label: '💡 Trading tips', value: 'tips' },
                { label: '🏠 Go home', value: 'home' },
                { label: '🃏 Card game', value: 'tcg' }
            ];
        } else if (path === '/academy') {
            suggestions = [
                { label: '🍽️ Menu demo', value: 'menu' },
                { label: '📈 Exchange', value: 'exchange' },
                { label: '💡 Tips', value: 'tips' }
            ];
        } else if (path.includes('museum') || path.includes('vault')) {
            suggestions = [
                { label: '🔬 Research', value: 'research' },
                { label: '💡 Tips', value: 'tips' },
                { label: '🏠 Go home', value: 'home' }
            ];
        } else {
            suggestions = [
                { label: '📈 Exchange', value: 'exchange' },
                { label: '🏛️ Museum', value: 'museum' },
                { label: '📋 All pages', value: 'show pages' }
            ];
        }
        
        showSuggestions(suggestions);
    }

    // Initialize
    function init() {
        const { toggle, chat } = createChatUI();
        let isOpen = false;

        // Toggle chat
        toggle.addEventListener('click', () => {
            isOpen = !isOpen;
            chat.classList.toggle('open', isOpen);
            toggle.classList.toggle('open', isOpen);
            toggle.innerHTML = isOpen ? '✕' : '🧙';
            
            if (isOpen && document.getElementById('nw-guide-messages').children.length === 0) {
                // First open - show greeting
                setTimeout(() => {
                    addMessage(GREETINGS[Math.floor(Math.random() * GREETINGS.length)]);
                    setTimeout(() => {
                        addMessage("I know all about this guild site! Ask me anything or tap a suggestion below 👇");
                        showContextualSuggestions();
                    }, 500);
                }, 200);
            }
            
            if (typeof NW_SOUNDS !== 'undefined') NW_SOUNDS.play('click');
        });

        // Send button
        document.getElementById('nw-guide-send').addEventListener('click', () => {
            const input = document.getElementById('nw-guide-input');
            if (input.value.trim()) {
                processInput(input.value);
                input.value = '';
            }
        });

        // Enter key
        document.getElementById('nw-guide-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const input = e.target;
                if (input.value.trim()) {
                    processInput(input.value);
                    input.value = '';
                }
            }
        });

        // Chip clicks
        document.getElementById('nw-guide-suggestions').addEventListener('click', (e) => {
            if (e.target.classList.contains('nw-guide-chip')) {
                processInput(e.target.dataset.value || e.target.textContent);
            }
        });

        // Close on outside click (mobile)
        document.addEventListener('click', (e) => {
            if (isOpen && !chat.contains(e.target) && !toggle.contains(e.target)) {
                isOpen = false;
                chat.classList.remove('open');
                toggle.classList.remove('open');
                toggle.innerHTML = '🧙';
            }
        });

        console.log('🧙 NumbahWan Guide initialized');
    }

    // Auto-init on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Export for manual control
    window.NW_GUIDE = {
        open: () => document.getElementById('nw-guide-toggle')?.click(),
        ask: (q) => processInput(q)
    };
})();
