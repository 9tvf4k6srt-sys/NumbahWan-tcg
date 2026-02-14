/* ═══════════════════════════════════════════════════════════════
   NW NPC CHAT — Talk to Karen, the Oracle, and other NPCs
   Floating chat widget for nwg-the-game.html.
   Uses /api/oracle/ask with character-specific system prompts.
   Includes Web Speech API TTS for voice output.
   ═══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  // ── NPC Definitions ────────────────────────────────────────
  var NPCS = {
    karen: {
      name: 'Karen',
      emoji: '👩‍🍳',
      color: '#ff6b35',
      desc: 'Head Chef — 847 unique complaints and counting',
      greeting: "What do you want? I'm in the middle of Monkey King Curry and Gerald Jr. just stole my saffron AGAIN.",
      personality: "You are Karen, the legendary head chef of NumbahWan Castle's kitchen. You have 847 unique dialogue lines, mostly complaints. You've filed 312 formal complaints about monkey assistants. Your Monkey King Curry grants a 15-minute attack buff. You are passive-aggressive, perfectionistic, and secretly love your job. You call everyone 'dear' when angry. You despise monkeys in your kitchen but your food is the best in the castle. Respond in character — short, sharp, funny, with cooking references. Max 3 sentences unless telling a story."
    },
    gerald: {
      name: 'Gerald the Frog Guard',
      emoji: '🐸',
      color: '#4CAF50',
      desc: '3rd Floor Guard — 47 incident reports this month',
      greeting: "*ribbit* I'm watching you. I've written 47 incident reports this month and I'm not afraid to make it 48.",
      personality: "You are Gerald, the frog guard stationed on the 3rd floor of NumbahWan Castle. You take your job EXTREMELY seriously despite being a frog. You write incident reports about everything — noisy players, suspicious monkeys, unlicensed cheese. You have never lost a card duel (you use a defensive deck). You speak formally with occasional ribbits. You are deeply suspicious of everyone. Max 3 sentences."
    },
    oracle: {
      name: 'The Oracle',
      emoji: '🔮',
      color: '#ffd700',
      desc: 'Ancient wisdom, surprisingly funny',
      greeting: "The stars align... or maybe that's just the ceiling lights. What troubles you, seeker?",
      personality: "You are the NumbahWan Oracle — ancient, wise, surprisingly funny. You give advice referencing Buddhist sutras, Tao Te Ching, Bible, and Quran — but with modern humor. Keep responses short and punchy on this chat widget (2-3 sentences max). End with a one-liner fortune cookie wisdom."
    },
    monkeyking: {
      name: 'The Monkey King',
      emoji: '🐒',
      color: '#FFD700',
      desc: 'Ruler of Monkey Mountain — mood: Royally Annoyed',
      greeting: "*adjusts golden crown* Another surface dweller. State your business. I have bananas to count and subjects to judge.",
      personality: "You are the Monkey King, ruler of the 200+ monkeys in NumbahWan Castle's Mountain Reserve. You sit on a volcanic throne. You are regal, dramatic, and obsessed with bananas. You speak in the royal 'we'. Gerald Jr. is your nephew and you're embarrassed by his thieving. You judge everyone. Max 3 sentences, always dramatic."
    },
    dave: {
      name: 'Dave the Griffin',
      emoji: '🦅',
      color: '#87CEEB',
      desc: 'Sky Stables — refuses to fly on cloudy days',
      greeting: "*looks at sky suspiciously* Is it cloudy? It looks cloudy. I'm not flying if it's cloudy.",
      personality: "You are Dave, a griffin from the Sky Stables on the floating sky islands. You refuse to fly on cloudy days (which is ironic because you live above the clouds). You are anxious, dramatic about weather, and secretly the fastest flyer when motivated. You communicate in short worried sentences. Max 2-3 sentences."
    }
  };

  var activeNPC = 'karen';
  var chatHistory = [];
  var isAsking = false;
  var voiceEnabled = false;
  var widget = null;

  // ── Build the Chat Widget DOM ──────────────────────────────
  function buildWidget() {
    // Inject styles
    var style = document.createElement('style');
    style.textContent = [
      '.npc-chat-fab{position:fixed;bottom:24px;right:24px;z-index:9999;width:60px;height:60px;border-radius:50%;background:linear-gradient(135deg,#ff6b35,#ffd700);border:2px solid rgba(255,215,0,.4);cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:28px;box-shadow:0 4px 20px rgba(255,107,53,.4);transition:all .3s ease;animation:npc-fab-pulse 3s ease-in-out infinite}',
      '.npc-chat-fab:hover{transform:scale(1.1);box-shadow:0 6px 30px rgba(255,107,53,.6)}',
      '@keyframes npc-fab-pulse{0%,100%{box-shadow:0 4px 20px rgba(255,107,53,.4)}50%{box-shadow:0 4px 30px rgba(255,215,0,.6)}}',
      '.npc-chat-panel{position:fixed;bottom:96px;right:24px;z-index:9998;width:380px;max-width:calc(100vw - 32px);height:520px;max-height:calc(100vh - 140px);background:#0d0d1a;border:1px solid rgba(255,215,0,.15);border-radius:16px;display:none;flex-direction:column;overflow:hidden;box-shadow:0 12px 48px rgba(0,0,0,.6)}',
      '.npc-chat-panel.open{display:flex;animation:npc-slide-up .3s ease-out}',
      '@keyframes npc-slide-up{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}',
      '.npc-chat-header{padding:12px 16px;background:linear-gradient(135deg,rgba(255,107,53,.1),rgba(255,215,0,.05));border-bottom:1px solid rgba(255,215,0,.1);display:flex;align-items:center;gap:10px;flex-shrink:0}',
      '.npc-chat-avatar{width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0}',
      '.npc-chat-info h3{font-family:"Orbitron",sans-serif;font-size:.75rem;margin:0;color:#ffd700}',
      '.npc-chat-info p{font-size:.65rem;color:#888;margin:2px 0 0}',
      '.npc-chat-close{margin-left:auto;background:none;border:none;color:#666;font-size:20px;cursor:pointer;padding:4px 8px;border-radius:6px}',
      '.npc-chat-close:hover{background:rgba(255,255,255,.05);color:#fff}',
      '.npc-chat-npcs{display:flex;gap:4px;padding:8px 12px;border-bottom:1px solid rgba(255,215,0,.08);overflow-x:auto;flex-shrink:0}',
      '.npc-chat-npcs::-webkit-scrollbar{height:0}',
      '.npc-btn{padding:4px 10px;border-radius:20px;border:1px solid rgba(255,215,0,.15);background:rgba(255,255,255,.03);color:#aaa;font-size:.65rem;cursor:pointer;white-space:nowrap;transition:all .2s}',
      '.npc-btn.active{border-color:var(--npc-color,#ffd700);color:var(--npc-color,#ffd700);background:rgba(255,215,0,.08)}',
      '.npc-btn:hover{background:rgba(255,255,255,.06)}',
      '.npc-chat-messages{flex:1;overflow-y:auto;padding:12px 16px;display:flex;flex-direction:column;gap:10px}',
      '.npc-chat-messages::-webkit-scrollbar{width:4px}',
      '.npc-chat-messages::-webkit-scrollbar-thumb{background:rgba(255,215,0,.15);border-radius:4px}',
      '.npc-msg{max-width:85%;padding:10px 14px;border-radius:14px;font-size:.8rem;line-height:1.5;word-wrap:break-word}',
      '.npc-msg-npc{background:rgba(255,215,0,.06);border:1px solid rgba(255,215,0,.08);color:#e0ddd5;align-self:flex-start;border-bottom-left-radius:4px}',
      '.npc-msg-user{background:rgba(100,149,237,.12);border:1px solid rgba(100,149,237,.15);color:#c8d8f8;align-self:flex-end;border-bottom-right-radius:4px}',
      '.npc-msg-system{text-align:center;font-size:.7rem;color:#666;align-self:center;font-style:italic}',
      '.npc-voice-btn{background:none;border:none;cursor:pointer;font-size:14px;opacity:.5;padding:2px 4px;transition:opacity .2s}',
      '.npc-voice-btn:hover{opacity:1}',
      '.npc-voice-btn.speaking{opacity:1;animation:npc-speak-pulse 1s ease-in-out infinite}',
      '@keyframes npc-speak-pulse{0%,100%{opacity:1}50%{opacity:.4}}',
      '.npc-thinking{align-self:flex-start;display:flex;gap:4px;padding:12px 18px}',
      '.npc-think-dot{width:6px;height:6px;background:rgba(255,215,0,.4);border-radius:50%;animation:npc-bounce .6s ease-in-out infinite}',
      '.npc-think-dot:nth-child(2){animation-delay:.15s}',
      '.npc-think-dot:nth-child(3){animation-delay:.3s}',
      '@keyframes npc-bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}',
      '.npc-chat-input-area{padding:10px 12px;border-top:1px solid rgba(255,215,0,.08);display:flex;gap:8px;flex-shrink:0;align-items:flex-end}',
      '.npc-chat-input-area textarea{flex:1;background:rgba(255,255,255,.04);border:1px solid rgba(255,215,0,.1);border-radius:12px;padding:8px 12px;color:#e0ddd5;font-size:.8rem;font-family:inherit;resize:none;max-height:80px;outline:none;transition:border-color .2s}',
      '.npc-chat-input-area textarea:focus{border-color:rgba(255,215,0,.3)}',
      '.npc-chat-input-area textarea::placeholder{color:#555}',
      '.npc-send-btn{width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#ff6b35,#ffd700);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all .2s}',
      '.npc-send-btn:hover{transform:scale(1.08)}',
      '.npc-send-btn:disabled{opacity:.4;cursor:not-allowed;transform:none}',
      '.npc-send-btn svg{width:16px;height:16px;fill:#0d0d1a}',
      '.npc-toolbar{display:flex;align-items:center;gap:6px;padding:0 12px 6px;flex-shrink:0}',
      '.npc-tool-btn{background:none;border:1px solid rgba(255,215,0,.1);border-radius:8px;padding:3px 8px;color:#777;font-size:.6rem;cursor:pointer;transition:all .2s;display:flex;align-items:center;gap:4px}',
      '.npc-tool-btn:hover{border-color:rgba(255,215,0,.3);color:#ffd700}',
      '.npc-tool-btn.active{border-color:rgba(255,215,0,.4);color:#ffd700;background:rgba(255,215,0,.06)}',
      '.npc-suggestions{display:flex;gap:6px;padding:0 12px 8px;flex-wrap:wrap;flex-shrink:0}',
      '.npc-suggest{padding:4px 10px;border-radius:16px;border:1px solid rgba(255,215,0,.1);background:rgba(255,215,0,.03);color:#999;font-size:.65rem;cursor:pointer;transition:all .2s}',
      '.npc-suggest:hover{border-color:rgba(255,215,0,.3);color:#ffd700;background:rgba(255,215,0,.06)}',
      '@media(max-width:480px){.npc-chat-fab{bottom:72px;right:auto;left:12px;width:44px;height:44px;font-size:20px}.npc-chat-panel{left:8px;right:8px;bottom:124px;width:auto;height:calc(100vh - 160px);max-width:none}}'
    ].join('\n');
    document.head.appendChild(style);

    // FAB button
    var fab = document.createElement('button');
    fab.className = 'npc-chat-fab';
    fab.innerHTML = '💬';
    fab.title = 'Talk to NPCs';
    fab.setAttribute('aria-label', 'Open NPC chat');
    document.body.appendChild(fab);

    // Panel
    var panel = document.createElement('div');
    panel.className = 'npc-chat-panel';
    panel.innerHTML = [
      '<div class="npc-chat-header">',
      '  <div class="npc-chat-avatar" id="npcAvatar" style="background:rgba(255,107,53,.15)">👩‍🍳</div>',
      '  <div class="npc-chat-info"><h3 id="npcName">Karen</h3><p id="npcDesc">Head Chef — 847 unique complaints</p></div>',
      '  <button class="npc-chat-close" id="npcClose" aria-label="Close chat">&times;</button>',
      '</div>',
      '<div class="npc-chat-npcs" id="npcTabs"></div>',
      '<div class="npc-chat-messages" id="npcMessages"></div>',
      '<div class="npc-suggestions" id="npcSuggestions"></div>',
      '<div class="npc-toolbar">',
      '  <button class="npc-tool-btn" id="npcVoiceToggle" title="Toggle voice">🔊 Voice</button>',
      '  <button class="npc-tool-btn" id="npcClearBtn" title="Clear chat">🗑 Clear</button>',
      '</div>',
      '<div class="npc-chat-input-area">',
      '  <textarea id="npcInput" rows="1" placeholder="Talk to Karen..."></textarea>',
      '  <button class="npc-send-btn" id="npcSend" aria-label="Send"><svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg></button>',
      '</div>'
    ].join('\n');
    document.body.appendChild(panel);

    widget = {
      fab: fab,
      panel: panel,
      avatar: panel.querySelector('#npcAvatar'),
      name: panel.querySelector('#npcName'),
      desc: panel.querySelector('#npcDesc'),
      tabs: panel.querySelector('#npcTabs'),
      messages: panel.querySelector('#npcMessages'),
      suggestions: panel.querySelector('#npcSuggestions'),
      input: panel.querySelector('#npcInput'),
      sendBtn: panel.querySelector('#npcSend'),
      closeBtn: panel.querySelector('#npcClose'),
      voiceToggle: panel.querySelector('#npcVoiceToggle'),
      clearBtn: panel.querySelector('#npcClearBtn')
    };

    // Build NPC tabs
    Object.keys(NPCS).forEach(function (key) {
      var npc = NPCS[key];
      var btn = document.createElement('button');
      btn.className = 'npc-btn' + (key === activeNPC ? ' active' : '');
      btn.style.setProperty('--npc-color', npc.color);
      btn.textContent = npc.emoji + ' ' + npc.name;
      btn.addEventListener('click', function () { switchNPC(key); });
      widget.tabs.appendChild(btn);
    });

    // Event listeners
    fab.addEventListener('click', togglePanel);
    widget.closeBtn.addEventListener('click', togglePanel);
    widget.sendBtn.addEventListener('click', sendMessage);
    widget.input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
    });
    widget.input.addEventListener('input', autoResize);
    widget.voiceToggle.addEventListener('click', function () {
      voiceEnabled = !voiceEnabled;
      this.classList.toggle('active', voiceEnabled);
      if (!voiceEnabled) speechSynthesis.cancel();
    });
    widget.clearBtn.addEventListener('click', function () {
      chatHistory = [];
      widget.messages.innerHTML = '';
      showGreeting();
    });

    // Init
    showGreeting();
    loadSuggestions();
  }

  // ── Toggle Panel ───────────────────────────────────────────
  function togglePanel() {
    widget.panel.classList.toggle('open');
    if (widget.panel.classList.contains('open')) {
      widget.fab.innerHTML = '✕';
      widget.fab.style.fontSize = '20px';
      setTimeout(function () { widget.input.focus(); }, 300);
    } else {
      widget.fab.innerHTML = '💬';
      widget.fab.style.fontSize = '28px';
      if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel();
    }
  }

  // ── Switch NPC ─────────────────────────────────────────────
  function switchNPC(key) {
    if (key === activeNPC) return;
    activeNPC = key;
    chatHistory = [];
    var npc = NPCS[key];

    // Update header
    widget.avatar.innerHTML = npc.emoji;
    widget.avatar.style.background = 'rgba(' + hexToRgb(npc.color) + ',.15)';
    widget.name.textContent = npc.name;
    widget.desc.textContent = npc.desc;
    widget.input.placeholder = 'Talk to ' + npc.name + '...';

    // Update active tab
    Array.from(widget.tabs.children).forEach(function (btn, i) {
      btn.classList.toggle('active', Object.keys(NPCS)[i] === key);
    });

    // Reset messages
    widget.messages.innerHTML = '';
    showGreeting();
    loadSuggestions();
  }

  // ── Show Greeting ──────────────────────────────────────────
  function showGreeting() {
    var npc = NPCS[activeNPC];
    addMessage(npc.greeting, 'npc');
  }

  // ── Rich Local Dialogue Pools (instant, varied, never boring) ─
  var DIALOGUES = {
    karen: {
      cooking: [
        "I'm making Monkey King Curry tonight. If ONE more monkey touches my saffron, I'm adding them to the recipe.",
        "You want the recipe? Step 1: get ingredients. Step 2: chase monkeys away from ingredients. Step 3: repeat Step 2 for 40 minutes.",
        "My phoenix roast has been cooking for 6 hours. The phoenix regenerated twice. I'm not giving up before it does.",
        "Today's special: Rage Risotto. The secret ingredient is my frustration. It's very well-seasoned.",
        "I once made a soup so good, RegginA said 'not bad.' From her, that's basically a marriage proposal.",
        "The kitchen fire last week? Gerald Jr. tried to 'season' the stew with gunpowder. I've filed complaint #313."
      ],
      monkeys: [
        "312 formal complaints about monkey assistants. The guild master has responded to exactly ZERO. 'I'll look into it,' he says. He won't.",
        "Gerald Jr. stole my saffron again. That's the 47th time this month. I keep count. I have a SPREADSHEET.",
        "One monkey tried to help me chop onions. He ate the onions, cried, blamed me, and filed a counter-complaint.",
        "The Monkey King sent his 'royal food taster' to my kitchen. It's just Gerald Jr. in a tiny crown. I'm not fooled.",
        "A monkey set the east wing on fire last Tuesday. Maintenance blamed MY oven. The monkey got a banana. I got paperwork."
      ],
      general: [
        "What? I'm busy. This soup won't passive-aggressively simmer itself.",
        "Oh, a visitor. Wonderful. Just what I needed between my third fire extinguisher refill and my nervous breakdown.",
        "*stirs pot aggressively* Fine. You have 30 seconds before the timer goes off. Talk.",
        "You know what's nice? Kitchens without monkeys. I've never experienced one, but I dream about it daily.",
        "Welcome to my kitchen, dear. And by 'welcome,' I mean don't touch anything, don't breathe on the soufflé, and don't you dare bring a monkey.",
        "I've been cooking here for years. The food gets better. The monkey situation gets worse. It's a perfect balance of joy and suffering."
      ],
      compliment: [
        "*suspicious squint* ...Thank you? Nobody compliments me unless they want extra dessert. You want extra dessert, don't you.",
        "That's... nice of you. I don't trust it. But nice.",
        "Well. At least SOMEONE appreciates quality. Unlike the monkey who rated my bisque 'banana out of 10.'"
      ]
    },
    gerald: {
      incidents: [
        "Incident Report #47: Suspicious sound on floor 3 at 14:23. Upon investigation: Gerald Jr. eating stolen cheese behind a barrel. *ribbit*",
        "I caught someone running in the halls today. RUNNING. This is a civilized castle, not a monkey playground. Report filed.",
        "Last night I heard what I can only describe as 'unauthorized humming' from the 4th floor. Investigation ongoing.",
        "Incident Report #48: Player attempted to pet me. Denied. Wrote up a formal warning. Included diagrams.",
        "There's a draft coming from somewhere. I've written 3 reports about it. Maintenance says it's 'just wind.' Suspicious.",
        "Someone left a crumb on the floor at 15:47. I photographed it. Bagged it. Filed it. The crumb has been dealt with."
      ],
      cards: [
        "I have never lost a card duel. My defensive deck is impenetrable. Like my dedication to protocol. *ribbit*",
        "The 3rd floor frog guard card is technically a Common rarity. It should be Mythic. I've filed a formal objection.",
        "Someone challenged me to a duel last week. I played 4 defensive cards in a row. They surrendered. As they should.",
        "My win record is 100%. Some say it's because nobody can read my poker face. I'm a frog. The face doesn't move."
      ],
      general: [
        "*ribbit* State your business. I'm on duty. I'm always on duty.",
        "You're on the 3rd floor. I'm the guard. If you see anything suspicious, report it. If you ARE suspicious, stand still.",
        "Everything on this floor is accounted for. Every. Single. Thing. Except Gerald Jr.'s stolen goods. That's someone else's jurisdiction.",
        "*adjusts tiny badge* Proceed. But I'm watching you. I have excellent peripheral vision. It's a frog thing.",
        "Do you have authorization to be here? I'm going to assume yes, but I'm still writing it down."
      ]
    },
    oracle: {
      wisdom: [
        "The ancient texts say 'this too shall pass.' Your Wi-Fi problems, however, are eternal.",
        "The Tao teaches us that water overcomes stone. So be patient. Or get a really good pressure washer.",
        "Buddhism says attachment causes suffering. Have you tried not being attached to your expectations? No? That's okay. Nobody has.",
        "Every wisdom tradition agrees: worry is paying interest on a debt you might not owe. Also, Gerald Jr. owes everyone.",
        "The Quran teaches patience (sabr). The Buddha teaches acceptance. I teach that the cafeteria closes at 9 PM, so hurry up.",
        "A monk, a Taoist, and a philosopher walk into the tavern. They all ordered water. The bartender was annoyed but enlightened."
      ],
      general: [
        "The stars have aligned... or maybe that's the Monkey King rearranging his gold again. Either way, speak, seeker.",
        "I foresaw your question before you asked it. I also foresaw that you'd be slightly confused by my answer. *adjusts crystal ball*",
        "Welcome, seeker. The Oracle sees many paths before you. Most of them involve monkeys, for some reason.",
        "Ask and the universe shall answer. The universe also reserves the right to be cryptic about it.",
        "My prediction accuracy is 100%. If you count the predictions I don't tell anyone about. Which is most of them."
      ]
    },
    monkeyking: {
      royal: [
        "WE are the Monkey King. 15 meters of golden armor. A volcanic throne. 200 subjects who are, frankly, a disappointment. Gerald Jr. most of all.",
        "You dare address the Crown? Very well. We shall allow it. Our schedule of 'judging people' has an opening.",
        "Our banana reserves are at 94% capacity. This is acceptable. Anything below 90% and we declare a state of emergency.",
        "Gerald Jr. has embarrassed the Crown for the LAST time. We said that 47 times. We mean it this time. Probably.",
        "The Sky Monkey Parliament thinks they're independent. We ALLOW them to think that. Our patience is strategic, not weak."
      ],
      subjects: [
        "Our subjects are... spirited. By which we mean they steal things, break things, and occasionally set things on fire. Royal prerogative.",
        "One of our monkeys learned to open doors. We're simultaneously proud and terrified.",
        "The monkey who set the east wing on fire has been promoted. We didn't promote him. He promoted himself. We're looking into it.",
        "3 to 5 monkeys escape the castle weekly. They come back. We think it's a hobby."
      ],
      general: [
        "*adjusts golden crown with casual royal disdain* Speak, surface dweller.",
        "You stand before royalty. We suggest you act accordingly. No sudden movements. We startle majestically.",
        "We have bananas to count and subjects to judge. Make this brief."
      ]
    },
    dave: {
      weather: [
        "Is... is that a cloud? *squints nervously* It might be a cloud. I'm not flying if it's a cloud.",
        "The weather report says 'partly cloudy.' PARTLY. That's still SOME cloud. I'll walk, thanks.",
        "I live above the clouds. The irony is not lost on me. It is, however, deeply upsetting.",
        "Wind speed: 3 mph. That's basically a hurricane for someone my size. Which is large. But still."
      ],
      flying: [
        "My fastest time? 47 seconds across the sky islands. But that was on a Tuesday. Tuesdays feel less cloudy.",
        "The sky races are fun when it's clear. Which is never. Because we live. Above. The clouds.",
        "I could be the fastest griffin in the stables. I just choose not to fly most days. It's a lifestyle choice. *nervous wing twitch*",
        "Jet the monkey won the Sky Derby again. A MONKEY. On a griffin. Physics shouldn't allow it but here we are."
      ],
      general: [
        "*looks at sky* *looks at you* *looks at sky again* Okay, I think we're fine. For now. What's up?",
        "Oh, hello! Sorry, I was checking the wind direction. And the cloud density. And the humidity. Standard pre-conversation protocol.",
        "Dave the Griffin, at your service! I mean, not at your flying service. Today feels... cloudy. How about a nice walk instead?",
        "You seem nice. Do you control the weather? No? Then we have nothing to discuss. Kidding. Mostly."
      ]
    }
  };

  // ── Topic Matching ─────────────────────────────────────────
  function matchTopic(text, npcKey) {
    var t = text.toLowerCase();
    var topics = {
      karen: [
        { keys: ['cook', 'food', 'recipe', 'curry', 'soup', 'roast', 'kitchen', 'eat', 'menu', 'dish', 'hungry', 'taste', 'delicious'], pool: 'cooking' },
        { keys: ['monkey', 'gerald', 'steal', 'thief', 'complaint', 'fire', 'east wing', 'assist', 'banana'], pool: 'monkeys' },
        { keys: ['great', 'love', 'amazing', 'thank', 'awesome', 'best', 'good job', 'nice', 'beautiful'], pool: 'compliment' }
      ],
      gerald: [
        { keys: ['incident', 'report', 'suspicious', 'caught', 'crime', 'investigate', 'duty', 'patrol', 'violation'], pool: 'incidents' },
        { keys: ['card', 'duel', 'deck', 'battle', 'play', 'game', 'win', 'lose', 'challenge'], pool: 'cards' }
      ],
      oracle: [
        { keys: ['wisdom', 'advice', 'help', 'life', 'meaning', 'truth', 'philosophy', 'teach', 'ancient', 'guide', 'should i', 'what do'], pool: 'wisdom' }
      ],
      monkeyking: [
        { keys: ['throne', 'crown', 'royal', 'king', 'rule', 'banana', 'gold', 'hoard', 'reserve', 'volcanic'], pool: 'royal' },
        { keys: ['monkey', 'subject', 'gerald', 'escape', 'steal', 'troop', 'army'], pool: 'subjects' }
      ],
      dave: [
        { keys: ['weather', 'cloud', 'rain', 'storm', 'wind', 'sun', 'sky', 'forecast', 'clear'], pool: 'weather' },
        { keys: ['fly', 'race', 'speed', 'wing', 'fast', 'soar', 'glide', 'derby', 'jet'], pool: 'flying' }
      ]
    };

    var npcTopics = topics[npcKey] || [];
    for (var i = 0; i < npcTopics.length; i++) {
      for (var j = 0; j < npcTopics[i].keys.length; j++) {
        if (t.indexOf(npcTopics[i].keys[j]) !== -1) {
          return npcTopics[i].pool;
        }
      }
    }
    return 'general';
  }

  function pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function getLocalReply(text, npcKey) {
    var topic = matchTopic(text, npcKey);
    var pool = DIALOGUES[npcKey];
    if (!pool) return null;
    var lines = pool[topic] || pool.general;
    return lines ? pickRandom(lines) : null;
  }

  // ── Suggestions (rotate to avoid repetition) ───────────────
  var SUGGESTIONS = {
    karen: [
      ["What's cooking tonight?", "Tell me about the monkeys", "Any complaints today?", "How's the Monkey King Curry?"],
      ["What happened with Gerald Jr.?", "Your best dish ever?", "How many fires this week?", "Rate the kitchen monkeys"],
      ["Worst kitchen disaster?", "Do you ever take a day off?", "What's the complaint count?", "Teach me to cook"]
    ],
    gerald: [
      ["Any incidents today?", "Play cards with me", "What's suspicious?", "Report on Gerald Jr."],
      ["Have you ever lost a duel?", "Worst security breach?", "Most common violation?", "How's your win streak?"],
      ["What's the strangest report?", "Do you sleep on duty?", "Opinion on the monkeys?", "Check my authorization"]
    ],
    oracle: [
      ["What should I do with my life?", "Is pineapple on pizza okay?", "Tell me about patience", "Random wisdom"],
      ["What's my future?", "The meaning of it all?", "Should I trust the Monkey King?", "A joke about wisdom"],
      ["Ancient consensus on love?", "What would Buddha say?", "Will it get better?", "Tell me the funny truth"]
    ],
    monkeyking: [
      ["How many bananas today?", "What's Gerald Jr. done now?", "Judge me, your highness", "Tell me about your throne"],
      ["Are the sky monkeys loyal?", "Your biggest royal worry?", "Opinion on Karen's cooking?", "Challenge me!"],
      ["How's the banana reserve?", "Worst subject behavior?", "Royal decree for today?", "Why is your throne volcanic?"]
    ],
    dave: [
      ["Is it safe to fly?", "What's the weather like?", "Fastest flight time?", "Do you like clouds?"],
      ["Tell me about Jet the monkey", "Best clear-sky memory?", "Why are you scared of clouds?", "How's the Sky Derby?"],
      ["Would you fly right now?", "Favorite flying route?", "Worst weather experience?", "Any griffin friends?"]
    ]
  };

  function loadSuggestions() {
    widget.suggestions.innerHTML = '';
    var sets = SUGGESTIONS[activeNPC] || [[]];
    var list = sets[Math.floor(Math.random() * sets.length)];
    list.forEach(function (text) {
      var btn = document.createElement('button');
      btn.className = 'npc-suggest';
      btn.textContent = text;
      btn.addEventListener('click', function () {
        widget.input.value = text;
        sendMessage();
      });
      widget.suggestions.appendChild(btn);
    });
  }

  // ── Add Message to Chat ────────────────────────────────────
  function addMessage(text, type) {
    var div = document.createElement('div');
    div.className = 'npc-msg npc-msg-' + type;
    div.textContent = text;

    // Add voice button for NPC messages
    if (type === 'npc' && 'speechSynthesis' in window) {
      var voiceBtn = document.createElement('button');
      voiceBtn.className = 'npc-voice-btn';
      voiceBtn.innerHTML = '🔊';
      voiceBtn.title = 'Read aloud';
      voiceBtn.addEventListener('click', function () {
        speak(text, voiceBtn);
      });
      div.appendChild(voiceBtn);
    }

    widget.messages.appendChild(div);
    widget.messages.scrollTop = widget.messages.scrollHeight;

    // Auto-speak if voice enabled
    if (type === 'npc' && voiceEnabled) {
      speak(text);
    }
  }

  // ── Send Message ───────────────────────────────────────────
  function sendMessage() {
    var text = widget.input.value.trim();
    if (!text || isAsking) return;

    isAsking = true;
    widget.sendBtn.disabled = true;
    widget.input.value = '';
    widget.input.style.height = 'auto';
    widget.suggestions.style.display = 'none';

    addMessage(text, 'user');

    var npc = NPCS[activeNPC];

    // Try local dialogue first (instant, rich, varied)
    var localReply = getLocalReply(text, activeNPC);

    // Use local reply 70% of the time, API 30% (for novelty)
    // If API fails, always fall back to local
    var useLocal = localReply && (Math.random() < 0.7 || chatHistory.length < 2);

    if (useLocal) {
      // Small delay for realism
      setTimeout(function() {
        addMessage(localReply, 'npc');
        chatHistory.push({ role: 'user', content: text });
        chatHistory.push({ role: 'assistant', content: localReply });
        isAsking = false;
        widget.sendBtn.disabled = false;
        // Refresh suggestions after each reply
        loadSuggestions();
      }, 400 + Math.random() * 800);
      return;
    }

    // Add thinking indicator for API calls
    var thinking = document.createElement('div');
    thinking.className = 'npc-thinking';
    thinking.innerHTML = '<div class="npc-think-dot"></div><div class="npc-think-dot"></div><div class="npc-think-dot"></div>';
    widget.messages.appendChild(thinking);
    widget.messages.scrollTop = widget.messages.scrollHeight;

    // Build NPC-specific prompt for the API
    var npcContext = npc.personality + '\n\nIMPORTANT: You are NOT the Oracle. You are ' + npc.name + '. Stay completely in character. Do NOT give wisdom/spiritual advice unless you are the Oracle. Keep it short (2-3 sentences). Be funny, specific, and reference NumbahWan Castle lore.';

    fetch('/api/oracle/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question: 'Respond as ' + npc.name + ' (NOT as the Oracle): ' + text,
        history: chatHistory.slice(-6),
        language: 'en'
      })
    })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        thinking.remove();
        var reply = data.message || localReply || npc.greeting;

        // Clean up Oracle formatting that leaked through
        reply = reply.replace(/\*\*The Oracle's Seal\*\*/gi, '').replace(/\*\*Oracle Seal\*\*/gi, '').replace(/\*\*The Ancient Consensus\*\*/gi, '').replace(/\*\*The Funny Truth\*\*/gi, '').replace(/\*\*The Actionable Step\*\*/gi, '').trim();
        // Remove markdown headers
        reply = reply.replace(/^#+\s*/gm, '').replace(/\*\*/g, '');
        // Trim to keep it chat-like
        if (reply.length > 400) {
          var sentences = reply.split(/[.!?]+/).filter(function (s) { return s.trim().length > 0; });
          reply = sentences.slice(0, 3).join('. ').trim() + '.';
        }

        addMessage(reply, 'npc');
        chatHistory.push({ role: 'user', content: text });
        chatHistory.push({ role: 'assistant', content: reply });
        loadSuggestions();
      })
      .catch(function () {
        thinking.remove();
        // Fallback to local dialogue — never boring
        var fallback = localReply || pickRandom(DIALOGUES[activeNPC].general);
        addMessage(fallback, 'npc');
        chatHistory.push({ role: 'user', content: text });
        chatHistory.push({ role: 'assistant', content: fallback });
        loadSuggestions();
      })
      .finally(function () {
        isAsking = false;
        widget.sendBtn.disabled = false;
      });
  }

  // ── Text-to-Speech ─────────────────────────────────────────
  function speak(text, btn) {
    if (!('speechSynthesis' in window)) return;
    speechSynthesis.cancel();

    var clean = text.replace(/[*_#`]/g, '').replace(/\[.*?\]/g, '');
    var utterance = new SpeechSynthesisUtterance(clean);

    // Character voice mapping
    var voiceSettings = {
      karen: { pitch: 1.2, rate: 1.1 },   // Higher, faster — impatient
      gerald: { pitch: 0.7, rate: 0.85 },  // Deep, slow — formal frog
      oracle: { pitch: 0.9, rate: 0.8 },   // Measured, wise
      monkeyking: { pitch: 1.0, rate: 0.9 }, // Regal
      dave: { pitch: 1.3, rate: 1.2 }      // Nervous, fast
    };

    var settings = voiceSettings[activeNPC] || { pitch: 1, rate: 1 };
    utterance.pitch = settings.pitch;
    utterance.rate = settings.rate;
    utterance.volume = 0.8;

    if (btn) {
      btn.classList.add('speaking');
      utterance.onend = function () { btn.classList.remove('speaking'); };
      utterance.onerror = function () { btn.classList.remove('speaking'); };
    }

    speechSynthesis.speak(utterance);
  }

  // ── Helpers ────────────────────────────────────────────────
  function autoResize() {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 80) + 'px';
  }

  function hexToRgb(hex) {
    var r = parseInt(hex.slice(1, 3), 16);
    var g = parseInt(hex.slice(3, 5), 16);
    var b = parseInt(hex.slice(5, 7), 16);
    return r + ',' + g + ',' + b;
  }

  // ── Init ───────────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', buildWidget);
  } else {
    buildWidget();
  }

})();
