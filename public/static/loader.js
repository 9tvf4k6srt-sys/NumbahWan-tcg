/**
 * NumbahWan Guild - Addictive Loading Screen
 * A mesmerizing loading experience that users actually enjoy watching
 */

(function() {
  'use strict';

  // Loading messages with multilingual support
  const loadingMessages = {
    en: [
      "Gathering the family...",
      "Charging up CP...",
      "RegginA is putting on makeup...",
      "Polishing the guild emblem...",
      "Recruiting new legends...",
      "Counting billions of CP...",
      "Loading fashion disasters...",
      "Preparing boss raid strategies...",
      "Syncing guild shenanigans...",
      "Making sure RegginO is awake...",
      "Buffing the warriors...",
      "Feeding the guild mascot...",
      "Calculating contribution points...",
      "Loading memes at maximum speed...",
      "Almost there, champion!"
    ],
    zh: [
      "召集家人們中...",
      "充能戰力中...",
      "RegginA正在化妝...",
      "擦亮公會徽章中...",
      "招募新傳奇中...",
      "計算數十億戰力...",
      "載入時尚災難...",
      "準備打王策略...",
      "同步公會趣事...",
      "確認RegginO有沒有醒著...",
      "給戰士們加Buff...",
      "餵食公會吉祥物...",
      "計算貢獻點數...",
      "以最高速度載入迷因...",
      "快好了，冠軍！"
    ],
    th: [
      "รวบรวมครอบครัว...",
      "ชาร์จ CP...",
      "RegginA กำลังแต่งหน้า...",
      "ขัดตราสัญลักษณ์กิลด์...",
      "รับสมัครตำนานใหม่...",
      "นับ CP หลายพันล้าน...",
      "โหลดหายนะแฟชั่น...",
      "เตรียมกลยุทธ์บุกบอส...",
      "ซิงค์เรื่องสนุกๆ กิลด์...",
      "ตรวจสอบว่า RegginO ตื่นหรือยัง...",
      "บัฟนักรบ...",
      "ให้อาหารมาสคอตกิลด์...",
      "คำนวณแต้มสนับสนุน...",
      "โหลดมีมด้วยความเร็วสูงสุด...",
      "เกือบเสร็จแล้ว แชมป์!"
    ]
  };

  // Create loader HTML
  function createLoader() {
    const loader = document.createElement('div');
    loader.id = 'numbahwan-loader';
    loader.innerHTML = `
      <style>
        #numbahwan-loader {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 50%, #0a0a0f 100%);
          z-index: 99999;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          transition: opacity 0.5s ease, visibility 0.5s ease;
          overflow: hidden;
        }
        
        #numbahwan-loader.hidden {
          opacity: 0;
          visibility: hidden;
          pointer-events: none;
        }
        
        /* Aurora background effect */
        .loader-aurora {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: 
            radial-gradient(ellipse at 20% 20%, rgba(255, 107, 0, 0.2) 0%, transparent 50%),
            radial-gradient(ellipse at 80% 80%, rgba(255, 157, 77, 0.15) 0%, transparent 50%),
            radial-gradient(ellipse at 50% 50%, rgba(139, 69, 19, 0.1) 0%, transparent 70%);
          animation: auroraShift 8s ease-in-out infinite;
        }
        
        @keyframes auroraShift {
          0%, 100% { transform: scale(1) rotate(0deg); filter: hue-rotate(0deg); }
          50% { transform: scale(1.2) rotate(10deg); filter: hue-rotate(30deg); }
        }
        
        /* Particle container */
        .loader-particles {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          overflow: hidden;
          pointer-events: none;
        }
        
        .loader-particle {
          position: absolute;
          width: 6px;
          height: 6px;
          background: #ff6b00;
          border-radius: 50%;
          animation: particleFloat 6s infinite;
          box-shadow: 0 0 10px #ff6b00, 0 0 20px rgba(255, 107, 0, 0.5);
        }
        
        .loader-particle:nth-child(odd) {
          background: #ffd700;
          box-shadow: 0 0 10px #ffd700, 0 0 20px rgba(255, 215, 0, 0.5);
        }
        
        @keyframes particleFloat {
          0% { transform: translateY(100vh) rotate(0deg) scale(0); opacity: 0; }
          10% { opacity: 1; transform: translateY(90vh) rotate(36deg) scale(1); }
          90% { opacity: 1; }
          100% { transform: translateY(-10vh) rotate(360deg) scale(0); opacity: 0; }
        }
        
        /* Main content container */
        .loader-content {
          position: relative;
          z-index: 10;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding: 20px;
        }
        
        /* Animated N Emblem */
        .loader-emblem-container {
          position: relative;
          width: 150px;
          height: 150px;
          margin-bottom: 30px;
        }
        
        .loader-emblem {
          width: 100%;
          height: 100%;
          animation: emblemPulse 2s ease-in-out infinite, emblemRotate 20s linear infinite;
          filter: drop-shadow(0 0 20px rgba(255, 107, 0, 0.8)) drop-shadow(0 0 40px rgba(255, 107, 0, 0.4));
        }
        
        @keyframes emblemPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
        
        @keyframes emblemRotate {
          0% { filter: drop-shadow(0 0 20px rgba(255, 107, 0, 0.8)) drop-shadow(0 0 40px rgba(255, 107, 0, 0.4)) hue-rotate(0deg); }
          100% { filter: drop-shadow(0 0 20px rgba(255, 107, 0, 0.8)) drop-shadow(0 0 40px rgba(255, 107, 0, 0.4)) hue-rotate(360deg); }
        }
        
        /* Orbiting rings */
        .loader-ring {
          position: absolute;
          border: 2px solid transparent;
          border-radius: 50%;
          border-top-color: #ff6b00;
          border-right-color: #ffd700;
        }
        
        .loader-ring-1 {
          width: 180px;
          height: 180px;
          top: -15px;
          left: -15px;
          animation: ringRotate 3s linear infinite;
        }
        
        .loader-ring-2 {
          width: 200px;
          height: 200px;
          top: -25px;
          left: -25px;
          animation: ringRotate 4s linear infinite reverse;
          border-top-color: #ffd700;
          border-right-color: #ff6b00;
        }
        
        .loader-ring-3 {
          width: 220px;
          height: 220px;
          top: -35px;
          left: -35px;
          animation: ringRotate 5s linear infinite;
          opacity: 0.5;
        }
        
        @keyframes ringRotate {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        /* Orbiting dots */
        .orbit-dot {
          position: absolute;
          width: 8px;
          height: 8px;
          background: #ffd700;
          border-radius: 50%;
          box-shadow: 0 0 10px #ffd700, 0 0 20px #ffd700;
        }
        
        .orbit-dot-1 {
          animation: orbitDot1 3s linear infinite;
        }
        
        .orbit-dot-2 {
          animation: orbitDot2 4s linear infinite;
          background: #ff6b00;
          box-shadow: 0 0 10px #ff6b00, 0 0 20px #ff6b00;
        }
        
        @keyframes orbitDot1 {
          0% { transform: rotate(0deg) translateX(90px) rotate(0deg); }
          100% { transform: rotate(360deg) translateX(90px) rotate(-360deg); }
        }
        
        @keyframes orbitDot2 {
          0% { transform: rotate(180deg) translateX(100px) rotate(-180deg); }
          100% { transform: rotate(540deg) translateX(100px) rotate(-540deg); }
        }
        
        /* Guild name */
        .loader-title {
          font-family: 'Press Start 2P', 'Courier New', monospace;
          font-size: clamp(1.5rem, 5vw, 2.5rem);
          background: linear-gradient(180deg, #ffcc70 0%, #ff9500 30%, #ff6b00 60%, #cc4400 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin-bottom: 15px;
          animation: titleGlow 2s ease-in-out infinite;
        }
        
        @keyframes titleGlow {
          0%, 100% { filter: drop-shadow(0 0 10px rgba(255, 107, 0, 0.8)); }
          50% { filter: drop-shadow(0 0 20px rgba(255, 215, 0, 1)); }
        }
        
        /* Loading message */
        .loader-message {
          font-family: 'Orbitron', sans-serif;
          font-size: clamp(0.8rem, 2.5vw, 1rem);
          color: #ff9d4d;
          margin-bottom: 25px;
          min-height: 1.5em;
          animation: messageFade 0.5s ease;
        }
        
        @keyframes messageFade {
          0% { opacity: 0; transform: translateY(10px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        
        /* Progress bar */
        .loader-progress-container {
          width: min(300px, 80vw);
          height: 8px;
          background: rgba(255, 107, 0, 0.2);
          border-radius: 10px;
          overflow: hidden;
          position: relative;
          border: 1px solid rgba(255, 107, 0, 0.3);
        }
        
        .loader-progress-bar {
          height: 100%;
          background: linear-gradient(90deg, #cc5500, #ff6b00, #ffd700, #ff6b00, #cc5500);
          background-size: 200% 100%;
          border-radius: 10px;
          width: 0%;
          transition: width 0.3s ease;
          animation: progressShimmer 2s linear infinite;
          box-shadow: 0 0 10px #ff6b00;
        }
        
        @keyframes progressShimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        
        /* Loading percentage */
        .loader-percentage {
          font-family: 'Orbitron', sans-serif;
          font-size: 0.9rem;
          color: #ffd700;
          margin-top: 10px;
          font-weight: bold;
        }
        
        /* Fun fact section */
        .loader-funfact {
          margin-top: 30px;
          padding: 15px 25px;
          background: rgba(255, 107, 0, 0.1);
          border: 1px solid rgba(255, 107, 0, 0.3);
          border-radius: 12px;
          max-width: min(400px, 90vw);
        }
        
        .loader-funfact-label {
          font-family: 'Press Start 2P', monospace;
          font-size: 0.6rem;
          color: #ff6b00;
          text-transform: uppercase;
          letter-spacing: 2px;
          margin-bottom: 8px;
        }
        
        .loader-funfact-text {
          font-family: 'Orbitron', sans-serif;
          font-size: 0.85rem;
          color: #ccc;
          line-height: 1.5;
        }
        
        /* Skip hint */
        .loader-skip {
          position: absolute;
          bottom: 20px;
          font-family: 'Orbitron', sans-serif;
          font-size: 0.7rem;
          color: rgba(255, 157, 77, 0.5);
          animation: skipPulse 2s ease-in-out infinite;
        }
        
        @keyframes skipPulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.7; }
        }
        
        /* Click ripple effect */
        .loader-ripple {
          position: absolute;
          border-radius: 50%;
          background: rgba(255, 107, 0, 0.3);
          transform: scale(0);
          animation: ripple 0.6s ease-out;
          pointer-events: none;
        }
        
        @keyframes ripple {
          to { transform: scale(4); opacity: 0; }
        }
      </style>
      
      <div class="loader-aurora"></div>
      <div class="loader-particles" id="loader-particles"></div>
      
      <div class="loader-content">
        <div class="loader-emblem-container">
          <div class="loader-ring loader-ring-1"></div>
          <div class="loader-ring loader-ring-2"></div>
          <div class="loader-ring loader-ring-3"></div>
          <div class="orbit-dot orbit-dot-1"></div>
          <div class="orbit-dot orbit-dot-2"></div>
          <svg class="loader-emblem" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="loaderNGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stop-color="#ffcc70"/>
                <stop offset="30%" stop-color="#ff9500"/>
                <stop offset="60%" stop-color="#ff6b00"/>
                <stop offset="100%" stop-color="#8B4513"/>
              </linearGradient>
            </defs>
            <rect x="10" y="8" width="24" height="84" rx="3" fill="url(#loaderNGrad)"/>
            <rect x="66" y="8" width="24" height="84" rx="3" fill="url(#loaderNGrad)"/>
            <polygon points="10,8 34,8 90,92 66,92" fill="url(#loaderNGrad)"/>
          </svg>
        </div>
        
        <div class="loader-title">NumbahWan</div>
        <div class="loader-message" id="loader-message">Loading...</div>
        
        <div class="loader-progress-container">
          <div class="loader-progress-bar" id="loader-progress"></div>
        </div>
        <div class="loader-percentage" id="loader-percentage">0%</div>
        
        <div class="loader-funfact">
          <div class="loader-funfact-label" id="funfact-label">💡 Did you know?</div>
          <div class="loader-funfact-text" id="funfact-text">RegginA has over 2 billion CP!</div>
        </div>
      </div>
      
      <div class="loader-skip" id="loader-skip">Click anywhere to skip</div>
    `;
    
    document.body.insertBefore(loader, document.body.firstChild);
    return loader;
  }

  // Fun facts with translations
  const funFacts = {
    en: [
      { label: "💡 Did you know?", text: "RegginA has over 2 billion CP!" },
      { label: "🏆 Guild Fact", text: "NumbahWan is ranked #47 on the server!" },
      { label: "👨‍👩‍👧‍👦 Family Size", text: "We have 12 amazing family members!" },
      { label: "⚔️ PvP Legend", text: "RegginA is Grandmaster 5 in Arena!" },
      { label: "😂 Fashion Tip", text: "Never let RegginA dress themselves..." },
      { label: "🎮 Pro Tip", text: "Join us and become part of the family!" },
      { label: "🐉 Boss Raids", text: "We complete 24+ boss raids per week!" },
      { label: "💪 Strongest", text: "Our top member has 2B 382M CP!" },
      { label: "🌟 Origins", text: "NumbahWan means Number One!" },
      { label: "👑 Leadership", text: "RegginA leads by example!" }
    ],
    zh: [
      { label: "💡 你知道嗎？", text: "RegginA擁有超過20億戰力！" },
      { label: "🏆 公會事實", text: "NumbahWan在伺服器排名第47！" },
      { label: "👨‍👩‍👧‍👦 家族規模", text: "我們有12位優秀的家人！" },
      { label: "⚔️ PvP傳奇", text: "RegginA是競技場大師5！" },
      { label: "😂 時尚小提示", text: "永遠不要讓RegginA自己穿衣服..." },
      { label: "🎮 專業提示", text: "加入我們，成為家人的一員！" },
      { label: "🐉 打王", text: "我們每週完成24次以上打王！" },
      { label: "💪 最強", text: "我們最強成員有2B 382M戰力！" },
      { label: "🌟 起源", text: "NumbahWan意思是第一名！" },
      { label: "👑 領導力", text: "RegginA以身作則！" }
    ],
    th: [
      { label: "💡 รู้หรือไม่?", text: "RegginA มี CP มากกว่า 2 พันล้าน!" },
      { label: "🏆 ข้อเท็จจริงกิลด์", text: "NumbahWan อันดับ #47 บนเซิร์ฟเวอร์!" },
      { label: "👨‍👩‍👧‍👦 ขนาดครอบครัว", text: "เรามีสมาชิกครอบครัว 12 คน!" },
      { label: "⚔️ ตำนาน PvP", text: "RegginA เป็น Grandmaster 5 ในอารีน่า!" },
      { label: "😂 เคล็ดลับแฟชั่น", text: "อย่าให้ RegginA แต่งตัวเอง..." },
      { label: "🎮 เคล็ดลับโปร", text: "เข้าร่วมและเป็นส่วนหนึ่งของครอบครัว!" },
      { label: "🐉 บุกบอส", text: "เราทำบุกบอส 24+ ครั้งต่อสัปดาห์!" },
      { label: "💪 แข็งแกร่งที่สุด", text: "สมาชิกท็อปของเรามี 2B 382M CP!" },
      { label: "🌟 ต้นกำเนิด", text: "NumbahWan แปลว่า อันดับหนึ่ง!" },
      { label: "👑 ความเป็นผู้นำ", text: "RegginA เป็นตัวอย่างที่ดี!" }
    ]
  };

  // Get current language
  function getCurrentLang() {
    return localStorage.getItem('lang') || 'en';
  }

  // Create particles
  function createParticles(container) {
    const particleCount = 30;
    for (let i = 0; i < particleCount; i++) {
      const particle = document.createElement('div');
      particle.className = 'loader-particle';
      particle.style.left = Math.random() * 100 + '%';
      particle.style.animationDelay = Math.random() * 6 + 's';
      particle.style.animationDuration = (4 + Math.random() * 4) + 's';
      container.appendChild(particle);
    }
  }

  // Update loading message
  function updateMessage(messageEl, lang) {
    const messages = loadingMessages[lang] || loadingMessages.en;
    const randomMessage = messages[Math.floor(Math.random() * messages.length)];
    messageEl.style.animation = 'none';
    messageEl.offsetHeight; // Trigger reflow
    messageEl.style.animation = 'messageFade 0.5s ease';
    messageEl.textContent = randomMessage;
  }

  // Update fun fact
  function updateFunFact(labelEl, textEl, lang) {
    const facts = funFacts[lang] || funFacts.en;
    const randomFact = facts[Math.floor(Math.random() * facts.length)];
    labelEl.textContent = randomFact.label;
    textEl.textContent = randomFact.text;
  }

  // Simulate loading progress
  function simulateProgress(progressBar, percentageEl, callback) {
    let progress = 0;
    const increment = () => {
      // Non-linear progress for more realistic feel
      const remaining = 100 - progress;
      const step = Math.random() * Math.min(remaining * 0.3, 15);
      progress = Math.min(progress + step, 100);
      
      progressBar.style.width = progress + '%';
      percentageEl.textContent = Math.round(progress) + '%';
      
      if (progress < 100) {
        setTimeout(increment, 100 + Math.random() * 200);
      } else {
        setTimeout(callback, 300);
      }
    };
    increment();
  }

  // Hide loader
  function hideLoader(loader) {
    loader.classList.add('hidden');
    setTimeout(() => {
      if (loader.parentNode) {
        loader.parentNode.removeChild(loader);
      }
    }, 500);
  }

  // Add click ripple effect
  function addRipple(e, loader) {
    const ripple = document.createElement('div');
    ripple.className = 'loader-ripple';
    ripple.style.left = e.clientX - 50 + 'px';
    ripple.style.top = e.clientY - 50 + 'px';
    ripple.style.width = '100px';
    ripple.style.height = '100px';
    loader.appendChild(ripple);
    
    setTimeout(() => {
      if (ripple.parentNode) {
        ripple.parentNode.removeChild(ripple);
      }
    }, 600);
  }

  // Initialize loader
  function initLoader() {
    // Don't show loader if page is already loaded from cache
    if (document.readyState === 'complete') {
      return;
    }

    const loader = createLoader();
    const lang = getCurrentLang();
    
    const messageEl = document.getElementById('loader-message');
    const progressBar = document.getElementById('loader-progress');
    const percentageEl = document.getElementById('loader-percentage');
    const funfactLabelEl = document.getElementById('funfact-label');
    const funfactTextEl = document.getElementById('funfact-text');
    const particlesContainer = document.getElementById('loader-particles');
    const skipHint = document.getElementById('loader-skip');
    
    // Create particles
    createParticles(particlesContainer);
    
    // Update fun fact initially
    updateFunFact(funfactLabelEl, funfactTextEl, lang);
    
    // Cycle through messages
    updateMessage(messageEl, lang);
    const messageInterval = setInterval(() => {
      updateMessage(messageEl, lang);
    }, 2000);
    
    // Cycle through fun facts
    const factInterval = setInterval(() => {
      updateFunFact(funfactLabelEl, funfactTextEl, lang);
    }, 4000);
    
    // Skip hint localization
    const skipTexts = {
      en: "Click anywhere to skip",
      zh: "點擊任意位置跳過",
      th: "คลิกที่ใดก็ได้เพื่อข้าม"
    };
    skipHint.textContent = skipTexts[lang] || skipTexts.en;
    
    // Click to skip
    let canSkip = false;
    setTimeout(() => { canSkip = true; }, 500); // Prevent accidental immediate skip
    
    loader.addEventListener('click', (e) => {
      if (!canSkip) return;
      addRipple(e, loader);
      clearInterval(messageInterval);
      clearInterval(factInterval);
      hideLoader(loader);
    });
    
    // Simulate progress
    simulateProgress(progressBar, percentageEl, () => {
      clearInterval(messageInterval);
      clearInterval(factInterval);
      hideLoader(loader);
    });
    
    // Also hide when page is fully loaded
    window.addEventListener('load', () => {
      setTimeout(() => {
        clearInterval(messageInterval);
        clearInterval(factInterval);
        hideLoader(loader);
      }, 500);
    });
  }

  // Start when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLoader);
  } else {
    initLoader();
  }
})();
