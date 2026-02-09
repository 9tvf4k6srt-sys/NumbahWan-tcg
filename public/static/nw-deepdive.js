/**
 * NumbahWan Deep Dive Engine v1.0
 * ================================
 * Scalable, efficient, endlessly expandable lore system
 * 
 * PHILOSOPHY:
 * 1. Build once, use forever (templates)
 * 2. Data-driven content (JSON, not hardcoded)
 * 3. Progressive enhancement (works without JS, better with)
 * 4. Continuous improvement (analytics, feedback loops)
 * 
 * ARCHITECTURE:
 * ┌─────────────────────────────────────────────────────────────┐
 * │  Deep Dive Engine                                          │
 * │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
 * │  │  Renderer   │  │ Interactor  │  │  Analytics  │        │
 * │  │  (display)  │  │  (engage)   │  │  (improve)  │        │
 * │  └─────────────┘  └─────────────┘  └─────────────┘        │
 * │         ↑               ↑               ↑                  │
 * │         └───────────────┴───────────────┘                  │
 * │                         │                                  │
 * │              ┌──────────┴──────────┐                       │
 * │              │    Content Data     │                       │
 * │              │  (JSON/Markdown)    │                       │
 * │              └─────────────────────┘                       │
 * └─────────────────────────────────────────────────────────────┘
 */

const NW_DEEPDIVE = {
    VERSION: '1.0.0',
    
    // ═══════════════════════════════════════════════════════════════
    // CONFIGURATION
    // ═══════════════════════════════════════════════════════════════
    
    config: {
        animationSpeed: 300,
        scrollRevealOffset: 100,
        easterEggChance: 0.1, // 10% chance of random Easter egg
        typingSpeed: 30, // ms per character for typewriter effect
    },
    
    // Track user engagement for continuous improvement
    analytics: {
        sectionsViewed: [],
        secretsFound: [],
        timeSpent: 0,
        scrollDepth: 0,
        clicks: 0,
        startTime: null
    },
    
    // ═══════════════════════════════════════════════════════════════
    // SECTION TYPES (Modular, Reusable)
    // ═══════════════════════════════════════════════════════════════
    
    sectionTypes: {
        // Hero section with parallax
        hero: (data) => `
            <section class="dd-hero" data-parallax="0.5">
                <div class="dd-hero-bg" style="background-image: url('${data.bgImage}')"></div>
                <div class="dd-hero-overlay"></div>
                <div class="dd-hero-content">
                    <span class="dd-hero-label">${data.label || 'DEEP DIVE'}</span>
                    <h1 class="dd-hero-title">${data.title}</h1>
                    <p class="dd-hero-subtitle">${data.subtitle}</p>
                    <div class="dd-scroll-hint">
                        <span>Scroll to discover</span>
                        <div class="dd-scroll-arrow">↓</div>
                    </div>
                </div>
            </section>
        `,
        
        // Text with floating image
        textImage: (data) => `
            <section class="dd-section dd-text-image ${data.imagePosition || 'right'}" data-reveal>
                <div class="dd-text-content">
                    <h2 class="dd-section-title">${data.title}</h2>
                    <div class="dd-section-body">${data.content}</div>
                    ${data.secret ? `<div class="dd-secret" data-secret="${data.secretId}">${data.secret}</div>` : ''}
                </div>
                <div class="dd-image-float">
                    <img src="${data.image}" alt="${data.imageAlt || ''}" loading="lazy">
                    ${data.imageCaption ? `<span class="dd-image-caption">${data.imageCaption}</span>` : ''}
                </div>
            </section>
        `,
        
        // Quote/callout
        quote: (data) => `
            <section class="dd-section dd-quote" data-reveal>
                <blockquote class="dd-quote-text">"${data.text}"</blockquote>
                <cite class="dd-quote-author">— ${data.author}</cite>
                ${data.context ? `<p class="dd-quote-context">${data.context}</p>` : ''}
            </section>
        `,
        
        // Interactive reveal cards
        revealCards: (data) => `
            <section class="dd-section dd-reveal-cards" data-reveal>
                <h2 class="dd-section-title">${data.title}</h2>
                <div class="dd-cards-grid">
                    ${data.cards.map((card, i) => `
                        <div class="dd-reveal-card" data-reveal-card="${i}">
                            <div class="dd-card-front">
                                <img src="${card.frontImage}" alt="">
                                <span class="dd-card-hint">${card.hint || 'Click to reveal'}</span>
                            </div>
                            <div class="dd-card-back">
                                <h3>${card.title}</h3>
                                <p>${card.content}</p>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </section>
        `,
        
        // Timeline
        timeline: (data) => `
            <section class="dd-section dd-timeline" data-reveal>
                <h2 class="dd-section-title">${data.title}</h2>
                <div class="dd-timeline-track">
                    ${data.events.map((event, i) => `
                        <div class="dd-timeline-event ${i % 2 === 0 ? 'left' : 'right'}" data-year="${event.year}">
                            <div class="dd-event-marker"></div>
                            <div class="dd-event-content">
                                <span class="dd-event-date">${event.date}</span>
                                <h3 class="dd-event-title">${event.title}</h3>
                                <p class="dd-event-desc">${event.description}</p>
                                ${event.image ? `<img src="${event.image}" alt="" class="dd-event-image">` : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </section>
        `,
        
        // Gallery with lightbox
        gallery: (data) => `
            <section class="dd-section dd-gallery" data-reveal>
                <h2 class="dd-section-title">${data.title}</h2>
                <div class="dd-gallery-grid">
                    ${data.images.map((img, i) => `
                        <div class="dd-gallery-item" data-lightbox="${i}">
                            <img src="${img.thumb || img.src}" alt="${img.alt || ''}" loading="lazy">
                            <div class="dd-gallery-overlay">
                                <span>${img.caption || 'View'}</span>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </section>
        `,
        
        // Conspiracy board with connections
        conspiracy: (data) => `
            <section class="dd-section dd-conspiracy" data-reveal>
                <h2 class="dd-section-title">${data.title}</h2>
                <div class="dd-conspiracy-board">
                    ${data.nodes.map(node => `
                        <div class="dd-conspiracy-node" 
                             style="left: ${node.x}%; top: ${node.y}%"
                             data-node="${node.id}"
                             data-connections="${(node.connections || []).join(',')}">
                            ${node.image ? `<img src="${node.image}" alt="">` : ''}
                            <span class="dd-node-label">${node.label}</span>
                            ${node.secret ? `<div class="dd-node-secret">${node.secret}</div>` : ''}
                        </div>
                    `).join('')}
                    <svg class="dd-conspiracy-lines"></svg>
                </div>
            </section>
        `,
        
        // Stats/facts with animation
        stats: (data) => `
            <section class="dd-section dd-stats" data-reveal>
                <h2 class="dd-section-title">${data.title}</h2>
                <div class="dd-stats-grid">
                    ${data.stats.map(stat => `
                        <div class="dd-stat-item" data-count-to="${stat.value}">
                            <span class="dd-stat-value">0</span>
                            <span class="dd-stat-suffix">${stat.suffix || ''}</span>
                            <span class="dd-stat-label">${stat.label}</span>
                        </div>
                    `).join('')}
                </div>
            </section>
        `,
        
        // Interactive choice/path
        choice: (data) => `
            <section class="dd-section dd-choice" data-reveal>
                <h2 class="dd-section-title">${data.title}</h2>
                <p class="dd-choice-prompt">${data.prompt}</p>
                <div class="dd-choice-options">
                    ${data.options.map((opt, i) => `
                        <button class="dd-choice-btn" data-choice="${i}" data-leads-to="${opt.leadsTo}">
                            ${opt.image ? `<img src="${opt.image}" alt="">` : ''}
                            <span>${opt.text}</span>
                        </button>
                    `).join('')}
                </div>
                <div class="dd-choice-result"></div>
            </section>
        `,
        
        // Full-width cinematic image
        cinematic: (data) => `
            <section class="dd-cinematic" data-parallax="0.3">
                <img src="${data.image}" alt="${data.alt || ''}" loading="lazy">
                <div class="dd-cinematic-caption">${data.caption || ''}</div>
            </section>
        `,
        
        // Easter egg (hidden until found)
        easterEgg: (data) => `
            <div class="dd-easter-egg" data-egg="${data.id}" style="display: none;">
                <div class="dd-egg-content">
                    <span class="dd-egg-icon"></span>
                    <h3>${data.title}</h3>
                    <p>${data.content}</p>
                    <span class="dd-egg-reward">+${data.reward || 10} NWG</span>
                </div>
            </div>
        `
    },
    
    // ═══════════════════════════════════════════════════════════════
    // INITIALIZATION
    // ═══════════════════════════════════════════════════════════════
    
    init() {
        this.analytics.startTime = Date.now();
        this.setupScrollReveal();
        this.setupParallax();
        this.setupInteractions();
        this.setupAnalytics();
        this.injectStyles();
        
        console.log('%c[NW_DEEPDIVE] v1.0 - Endless lore awaits...', 
            'background: linear-gradient(90deg, #6b21a8, #ec4899); color: white; padding: 4px 8px; border-radius: 4px;');
    },
    
    // ═══════════════════════════════════════════════════════════════
    // RENDER ENGINE
    // ═══════════════════════════════════════════════════════════════
    
    render(containerId, sections) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        container.innerHTML = sections.map(section => {
            const renderer = this.sectionTypes[section.type];
            if (!renderer) {
                console.warn(`[DEEPDIVE] Unknown section type: ${section.type}`);
                return '';
            }
            return renderer(section.data);
        }).join('');
        
        // Re-initialize interactions after render
        this.setupScrollReveal();
        this.setupInteractions();
    },
    
    // ═══════════════════════════════════════════════════════════════
    // SCROLL REVEAL
    // ═══════════════════════════════════════════════════════════════
    
    setupScrollReveal() {
        const reveals = document.querySelectorAll('[data-reveal]');
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('dd-revealed');
                    this.trackSection(entry.target);
                }
            });
        }, { threshold: 0.1, rootMargin: `-${this.config.scrollRevealOffset}px` });
        
        reveals.forEach(el => observer.observe(el));
    },
    
    // ═══════════════════════════════════════════════════════════════
    // PARALLAX
    // ═══════════════════════════════════════════════════════════════
    
    setupParallax() {
        const parallaxEls = document.querySelectorAll('[data-parallax]');
        
        window.addEventListener('scroll', () => {
            const scrolled = window.pageYOffset;
            
            parallaxEls.forEach(el => {
                const speed = parseFloat(el.dataset.parallax) || 0.5;
                const offset = scrolled * speed;
                
                if (el.classList.contains('dd-hero')) {
                    const bg = el.querySelector('.dd-hero-bg');
                    if (bg) bg.style.transform = `translateY(${offset}px)`;
                } else {
                    el.style.transform = `translateY(${offset}px)`;
                }
            });
            
            // Track scroll depth
            const maxScroll = document.body.scrollHeight - window.innerHeight;
            this.analytics.scrollDepth = Math.max(this.analytics.scrollDepth, (scrolled / maxScroll) * 100);
        }, { passive: true });
    },
    
    // ═══════════════════════════════════════════════════════════════
    // INTERACTIONS
    // ═══════════════════════════════════════════════════════════════
    
    setupInteractions() {
        // Reveal cards
        document.querySelectorAll('.dd-reveal-card').forEach(card => {
            card.addEventListener('click', () => {
                card.classList.toggle('flipped');
                this.analytics.clicks++;
            });
        });
        
        // Secrets
        document.querySelectorAll('.dd-secret').forEach(secret => {
            secret.addEventListener('click', () => {
                secret.classList.add('revealed');
                this.foundSecret(secret.dataset.secret);
            });
        });
        
        // Conspiracy nodes
        document.querySelectorAll('.dd-conspiracy-node').forEach(node => {
            node.addEventListener('click', () => {
                node.classList.toggle('active');
                this.drawConspiracyLines();
            });
        });
        
        // Choice buttons
        document.querySelectorAll('.dd-choice-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const result = btn.closest('.dd-choice').querySelector('.dd-choice-result');
                const leadsTo = btn.dataset.leadsTo;
                this.handleChoice(btn, result, leadsTo);
            });
        });
        
        // Lightbox
        document.querySelectorAll('[data-lightbox]').forEach(item => {
            item.addEventListener('click', () => {
                this.openLightbox(item);
            });
        });
        
        // Animated counters
        this.setupCounters();
    },
    
    setupCounters() {
        const counters = document.querySelectorAll('[data-count-to]');
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && !entry.target.dataset.counted) {
                    entry.target.dataset.counted = 'true';
                    this.animateCounter(entry.target);
                }
            });
        }, { threshold: 0.5 });
        
        counters.forEach(el => observer.observe(el));
    },
    
    animateCounter(el) {
        const target = parseInt(el.dataset.countTo);
        const valueEl = el.querySelector('.dd-stat-value');
        const duration = 2000;
        const start = Date.now();
        
        const update = () => {
            const elapsed = Date.now() - start;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3); // Ease out cubic
            const current = Math.floor(target * eased);
            
            valueEl.textContent = current.toLocaleString();
            
            if (progress < 1) requestAnimationFrame(update);
        };
        
        requestAnimationFrame(update);
    },
    
    // ═══════════════════════════════════════════════════════════════
    // SPECIAL EFFECTS
    // ═══════════════════════════════════════════════════════════════
    
    foundSecret(secretId) {
        if (this.analytics.secretsFound.includes(secretId)) return;
        
        this.analytics.secretsFound.push(secretId);
        
        // Show toast
        this.showToast('Secret Found!', `You discovered a hidden secret!`);
        
        // Award NWG if wallet available
        if (typeof NW_WALLET !== 'undefined') {
            NW_WALLET.earn('nwg', 5, 'SECRET_FOUND');
        }
        
        // Dispatch event
        window.dispatchEvent(new CustomEvent('nw-secret-found', { detail: { secretId } }));
    },
    
    handleChoice(btn, resultEl, leadsTo) {
        btn.closest('.dd-choice-options').querySelectorAll('.dd-choice-btn').forEach(b => {
            b.classList.remove('selected');
            b.disabled = true;
        });
        btn.classList.add('selected');
        
        // Fetch and display result
        if (window.DEEPDIVE_CHOICES && window.DEEPDIVE_CHOICES[leadsTo]) {
            resultEl.innerHTML = window.DEEPDIVE_CHOICES[leadsTo];
            resultEl.classList.add('visible');
        }
    },
    
    drawConspiracyLines() {
        const svg = document.querySelector('.dd-conspiracy-lines');
        if (!svg) return;
        
        const activeNodes = document.querySelectorAll('.dd-conspiracy-node.active');
        svg.innerHTML = '';
        
        activeNodes.forEach(node => {
            const connections = (node.dataset.connections || '').split(',').filter(Boolean);
            const rect1 = node.getBoundingClientRect();
            const boardRect = svg.parentElement.getBoundingClientRect();
            
            connections.forEach(targetId => {
                const target = document.querySelector(`[data-node="${targetId}"]`);
                if (!target || !target.classList.contains('active')) return;
                
                const rect2 = target.getBoundingClientRect();
                
                const x1 = rect1.left + rect1.width/2 - boardRect.left;
                const y1 = rect1.top + rect1.height/2 - boardRect.top;
                const x2 = rect2.left + rect2.width/2 - boardRect.left;
                const y2 = rect2.top + rect2.height/2 - boardRect.top;
                
                const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                line.setAttribute('x1', x1);
                line.setAttribute('y1', y1);
                line.setAttribute('x2', x2);
                line.setAttribute('y2', y2);
                line.setAttribute('stroke', '#dc2626');
                line.setAttribute('stroke-width', '2');
                svg.appendChild(line);
            });
        });
    },
    
    openLightbox(item) {
        const img = item.querySelector('img');
        if (!img) return;
        
        const lightbox = document.createElement('div');
        lightbox.className = 'dd-lightbox';
        lightbox.innerHTML = `
            <div class="dd-lightbox-backdrop"></div>
            <div class="dd-lightbox-content">
                <img src="${img.src.replace('/thumbs/', '/')}" alt="${img.alt}">
                <button class="dd-lightbox-close">×</button>
            </div>
        `;
        
        document.body.appendChild(lightbox);
        requestAnimationFrame(() => lightbox.classList.add('visible'));
        
        lightbox.addEventListener('click', (e) => {
            if (e.target.classList.contains('dd-lightbox-backdrop') || 
                e.target.classList.contains('dd-lightbox-close')) {
                lightbox.classList.remove('visible');
                setTimeout(() => lightbox.remove(), 300);
            }
        });
    },
    
    showToast(title, message) {
        const toast = document.createElement('div');
        toast.className = 'dd-toast';
        toast.innerHTML = `<strong>${title}</strong><span>${message}</span>`;
        document.body.appendChild(toast);
        
        requestAnimationFrame(() => toast.classList.add('visible'));
        setTimeout(() => {
            toast.classList.remove('visible');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    },
    
    // ═══════════════════════════════════════════════════════════════
    // ANALYTICS (For Continuous Improvement)
    // ═══════════════════════════════════════════════════════════════
    
    trackSection(el) {
        const sectionId = el.dataset.sectionId || el.className;
        if (!this.analytics.sectionsViewed.includes(sectionId)) {
            this.analytics.sectionsViewed.push(sectionId);
        }
    },
    
    setupAnalytics() {
        // Track time spent
        setInterval(() => {
            this.analytics.timeSpent = Math.floor((Date.now() - this.analytics.startTime) / 1000);
        }, 1000);
        
        // Save on page leave
        window.addEventListener('beforeunload', () => {
            this.saveAnalytics();
        });
    },
    
    saveAnalytics() {
        const key = 'nw_deepdive_analytics';
        const existing = JSON.parse(localStorage.getItem(key) || '[]');
        existing.push({
            ...this.analytics,
            page: window.location.pathname,
            timestamp: new Date().toISOString()
        });
        // Keep last 50 sessions
        localStorage.setItem(key, JSON.stringify(existing.slice(-50)));
    },
    
    getAnalyticsSummary() {
        const key = 'nw_deepdive_analytics';
        const data = JSON.parse(localStorage.getItem(key) || '[]');
        
        return {
            totalSessions: data.length,
            avgTimeSpent: data.reduce((sum, d) => sum + d.timeSpent, 0) / data.length || 0,
            avgScrollDepth: data.reduce((sum, d) => sum + d.scrollDepth, 0) / data.length || 0,
            totalSecretsFound: data.reduce((sum, d) => sum + d.secretsFound.length, 0),
            mostViewedSections: this.getMostViewed(data)
        };
    },
    
    getMostViewed(data) {
        const counts = {};
        data.forEach(session => {
            session.sectionsViewed.forEach(section => {
                counts[section] = (counts[section] || 0) + 1;
            });
        });
        return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);
    },
    
    // ═══════════════════════════════════════════════════════════════
    // STYLES INJECTION
    // ═══════════════════════════════════════════════════════════════
    
    injectStyles() {
        if (document.getElementById('nw-deepdive-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'nw-deepdive-styles';
        style.textContent = `
            /* Deep Dive Base */
            .dd-hero {
                position: relative;
                height: 100vh;
                min-height: 600px;
                display: flex;
                align-items: center;
                justify-content: center;
                overflow: hidden;
                background: #0a0a0a;
            }
            
            .dd-hero-bg {
                position: absolute;
                inset: -50px;
                background-size: cover;
                background-position: center;
                filter: brightness(0.4) saturate(1.2);
                transition: transform 0.1s ease-out;
            }
            
            .dd-hero-overlay {
                position: absolute;
                inset: 0;
                background: linear-gradient(to bottom, transparent 50%, #0a0a0a);
            }
            
            .dd-hero-content {
                position: relative;
                z-index: 1;
                text-align: center;
                padding: 2rem;
                max-width: 800px;
            }
            
            .dd-hero-label {
                display: inline-block;
                padding: 0.5rem 1.5rem;
                background: linear-gradient(90deg, #6b21a8, #ec4899);
                border-radius: 999px;
                font-size: 0.75rem;
                font-weight: 700;
                letter-spacing: 0.2em;
                text-transform: uppercase;
                margin-bottom: 1.5rem;
            }
            
            .dd-hero-title {
                font-size: clamp(2.5rem, 8vw, 5rem);
                font-weight: 900;
                line-height: 1.1;
                margin: 0 0 1rem;
                background: linear-gradient(135deg, #fff 0%, #a855f7 50%, #ec4899 100%);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
            }
            
            .dd-hero-subtitle {
                font-size: clamp(1rem, 2.5vw, 1.5rem);
                color: rgba(255,255,255,0.7);
                margin: 0;
            }
            
            .dd-scroll-hint {
                position: absolute;
                bottom: 2rem;
                left: 50%;
                transform: translateX(-50%);
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 0.5rem;
                color: rgba(255,255,255,0.5);
                font-size: 0.875rem;
                animation: dd-bounce 2s infinite;
            }
            
            @keyframes dd-bounce {
                0%, 100% { transform: translateX(-50%) translateY(0); }
                50% { transform: translateX(-50%) translateY(10px); }
            }
            
            /* Sections */
            .dd-section {
                padding: 6rem 2rem;
                max-width: 1200px;
                margin: 0 auto;
                opacity: 0;
                transform: translateY(40px);
                transition: opacity 0.6s ease, transform 0.6s ease;
            }
            
            .dd-section.dd-revealed {
                opacity: 1;
                transform: translateY(0);
            }
            
            .dd-section-title {
                font-size: clamp(1.75rem, 4vw, 2.5rem);
                font-weight: 800;
                margin: 0 0 2rem;
                background: linear-gradient(135deg, #fff, #a855f7);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
            }
            
            /* Text + Image */
            .dd-text-image {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 4rem;
                align-items: center;
            }
            
            .dd-text-image.left { direction: rtl; }
            .dd-text-image.left > * { direction: ltr; }
            
            .dd-text-content {
                font-size: 1.125rem;
                line-height: 1.8;
                color: rgba(255,255,255,0.8);
            }
            
            .dd-image-float img {
                width: 100%;
                border-radius: 1rem;
                box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);
            }
            
            .dd-image-caption {
                display: block;
                text-align: center;
                font-size: 0.875rem;
                color: rgba(255,255,255,0.5);
                margin-top: 1rem;
            }
            
            /* Secret */
            .dd-secret {
                margin-top: 1.5rem;
                padding: 1rem;
                background: rgba(168, 85, 247, 0.1);
                border: 1px dashed rgba(168, 85, 247, 0.3);
                border-radius: 0.5rem;
                cursor: pointer;
                position: relative;
                overflow: hidden;
            }
            
            .dd-secret::before {
                content: 'Click to reveal secret...';
                position: absolute;
                inset: 0;
                display: flex;
                align-items: center;
                justify-content: center;
                background: rgba(10,10,10,0.9);
                transition: opacity 0.3s;
            }
            
            .dd-secret.revealed::before {
                opacity: 0;
                pointer-events: none;
            }
            
            /* Quote */
            .dd-quote {
                text-align: center;
                padding: 8rem 2rem;
                background: linear-gradient(135deg, rgba(107,33,168,0.1), rgba(236,72,153,0.1));
                max-width: none;
            }
            
            .dd-quote-text {
                font-size: clamp(1.5rem, 4vw, 2.5rem);
                font-style: italic;
                font-weight: 300;
                line-height: 1.6;
                margin: 0;
                max-width: 900px;
                margin: 0 auto;
            }
            
            .dd-quote-author {
                display: block;
                margin-top: 2rem;
                font-size: 1.125rem;
                color: #a855f7;
            }
            
            /* Reveal Cards */
            .dd-cards-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
                gap: 2rem;
            }
            
            .dd-reveal-card {
                aspect-ratio: 3/4;
                perspective: 1000px;
                cursor: pointer;
            }
            
            .dd-card-front, .dd-card-back {
                position: absolute;
                inset: 0;
                backface-visibility: hidden;
                border-radius: 1rem;
                transition: transform 0.6s;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                padding: 2rem;
            }
            
            .dd-card-front {
                background: linear-gradient(135deg, #1a1a2e, #16213e);
                border: 1px solid rgba(255,255,255,0.1);
            }
            
            .dd-card-front img {
                width: 60%;
                filter: grayscale(1) brightness(0.5);
                transition: filter 0.3s;
            }
            
            .dd-reveal-card:hover .dd-card-front img {
                filter: grayscale(0.5) brightness(0.7);
            }
            
            .dd-card-hint {
                margin-top: 1rem;
                font-size: 0.875rem;
                color: rgba(255,255,255,0.5);
            }
            
            .dd-card-back {
                background: linear-gradient(135deg, #6b21a8, #ec4899);
                transform: rotateY(180deg);
                text-align: center;
            }
            
            .dd-reveal-card.flipped .dd-card-front { transform: rotateY(180deg); }
            .dd-reveal-card.flipped .dd-card-back { transform: rotateY(0); }
            
            /* Timeline */
            .dd-timeline-track {
                position: relative;
                padding: 2rem 0;
            }
            
            .dd-timeline-track::before {
                content: '';
                position: absolute;
                left: 50%;
                top: 0;
                bottom: 0;
                width: 2px;
                background: linear-gradient(to bottom, transparent, #a855f7, transparent);
            }
            
            .dd-timeline-event {
                position: relative;
                width: 45%;
                padding: 2rem;
                background: rgba(255,255,255,0.03);
                border-radius: 1rem;
                margin-bottom: 2rem;
            }
            
            .dd-timeline-event.left { margin-right: auto; }
            .dd-timeline-event.right { margin-left: auto; }
            
            .dd-event-marker {
                position: absolute;
                width: 1rem;
                height: 1rem;
                background: #a855f7;
                border-radius: 50%;
                top: 2.5rem;
            }
            
            .dd-timeline-event.left .dd-event-marker { right: -2.5rem; }
            .dd-timeline-event.right .dd-event-marker { left: -2.5rem; }
            
            .dd-event-date {
                font-size: 0.75rem;
                color: #ec4899;
                text-transform: uppercase;
                letter-spacing: 0.1em;
            }
            
            .dd-event-title {
                font-size: 1.25rem;
                margin: 0.5rem 0;
            }
            
            .dd-event-image {
                width: 100%;
                border-radius: 0.5rem;
                margin-top: 1rem;
            }
            
            /* Gallery */
            .dd-gallery-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
                gap: 1rem;
            }
            
            .dd-gallery-item {
                position: relative;
                aspect-ratio: 1;
                overflow: hidden;
                border-radius: 0.5rem;
                cursor: pointer;
            }
            
            .dd-gallery-item img {
                width: 100%;
                height: 100%;
                object-fit: cover;
                transition: transform 0.3s;
            }
            
            .dd-gallery-item:hover img { transform: scale(1.1); }
            
            .dd-gallery-overlay {
                position: absolute;
                inset: 0;
                background: rgba(107,33,168,0.8);
                display: flex;
                align-items: center;
                justify-content: center;
                opacity: 0;
                transition: opacity 0.3s;
            }
            
            .dd-gallery-item:hover .dd-gallery-overlay { opacity: 1; }
            
            /* Conspiracy Board */
            .dd-conspiracy-board {
                position: relative;
                aspect-ratio: 16/9;
                background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect fill="%23111" width="100" height="100"/><rect fill="%23181818" x="0" y="0" width="50" height="50"/><rect fill="%23181818" x="50" y="50" width="50" height="50"/></svg>');
                background-size: 20px 20px;
                border: 2px solid #333;
                border-radius: 0.5rem;
                overflow: hidden;
            }
            
            .dd-conspiracy-node {
                position: absolute;
                width: 80px;
                height: 80px;
                background: #1a1a1a;
                border: 2px solid #333;
                border-radius: 0.5rem;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                transition: all 0.3s;
                transform: translate(-50%, -50%);
            }
            
            .dd-conspiracy-node:hover, .dd-conspiracy-node.active {
                border-color: #dc2626;
                box-shadow: 0 0 20px rgba(220,38,38,0.5);
            }
            
            .dd-conspiracy-node img {
                width: 50px;
                height: 50px;
                object-fit: cover;
                border-radius: 50%;
            }
            
            .dd-node-label {
                font-size: 0.625rem;
                text-align: center;
                margin-top: 0.25rem;
            }
            
            .dd-conspiracy-lines {
                position: absolute;
                inset: 0;
                pointer-events: none;
            }
            
            /* Stats */
            .dd-stats-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
                gap: 2rem;
                text-align: center;
            }
            
            .dd-stat-value {
                font-size: 3rem;
                font-weight: 900;
                background: linear-gradient(135deg, #a855f7, #ec4899);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
            }
            
            .dd-stat-suffix {
                font-size: 1.5rem;
                color: #a855f7;
            }
            
            .dd-stat-label {
                display: block;
                margin-top: 0.5rem;
                color: rgba(255,255,255,0.6);
                font-size: 0.875rem;
            }
            
            /* Choice */
            .dd-choice-prompt {
                font-size: 1.25rem;
                text-align: center;
                margin-bottom: 2rem;
            }
            
            .dd-choice-options {
                display: flex;
                gap: 1rem;
                justify-content: center;
                flex-wrap: wrap;
            }
            
            .dd-choice-btn {
                padding: 1.5rem 2rem;
                background: rgba(255,255,255,0.05);
                border: 1px solid rgba(255,255,255,0.1);
                border-radius: 1rem;
                color: white;
                cursor: pointer;
                transition: all 0.3s;
                min-width: 200px;
            }
            
            .dd-choice-btn:hover:not(:disabled) {
                background: rgba(168,85,247,0.2);
                border-color: #a855f7;
                transform: translateY(-4px);
            }
            
            .dd-choice-btn.selected {
                background: linear-gradient(135deg, #6b21a8, #ec4899);
                border-color: transparent;
            }
            
            .dd-choice-result {
                margin-top: 2rem;
                padding: 2rem;
                background: rgba(255,255,255,0.03);
                border-radius: 1rem;
                opacity: 0;
                transform: translateY(20px);
                transition: all 0.3s;
            }
            
            .dd-choice-result.visible {
                opacity: 1;
                transform: translateY(0);
            }
            
            /* Cinematic */
            .dd-cinematic {
                position: relative;
                height: 60vh;
                overflow: hidden;
            }
            
            .dd-cinematic img {
                width: 100%;
                height: 100%;
                object-fit: cover;
            }
            
            .dd-cinematic-caption {
                position: absolute;
                bottom: 2rem;
                left: 50%;
                transform: translateX(-50%);
                background: rgba(0,0,0,0.7);
                padding: 1rem 2rem;
                border-radius: 0.5rem;
                font-style: italic;
            }
            
            /* Lightbox */
            .dd-lightbox {
                position: fixed;
                inset: 0;
                z-index: 9999;
                display: flex;
                align-items: center;
                justify-content: center;
                opacity: 0;
                transition: opacity 0.3s;
            }
            
            .dd-lightbox.visible { opacity: 1; }
            
            .dd-lightbox-backdrop {
                position: absolute;
                inset: 0;
                background: rgba(0,0,0,0.9);
            }
            
            .dd-lightbox-content {
                position: relative;
                max-width: 90vw;
                max-height: 90vh;
            }
            
            .dd-lightbox-content img {
                max-width: 100%;
                max-height: 90vh;
                border-radius: 0.5rem;
            }
            
            .dd-lightbox-close {
                position: absolute;
                top: -2rem;
                right: -2rem;
                width: 3rem;
                height: 3rem;
                background: white;
                border: none;
                border-radius: 50%;
                font-size: 1.5rem;
                cursor: pointer;
            }
            
            /* Toast */
            .dd-toast {
                position: fixed;
                bottom: 2rem;
                right: 2rem;
                background: linear-gradient(135deg, #6b21a8, #ec4899);
                padding: 1rem 1.5rem;
                border-radius: 0.75rem;
                z-index: 9999;
                display: flex;
                flex-direction: column;
                gap: 0.25rem;
                transform: translateX(120%);
                transition: transform 0.3s;
            }
            
            .dd-toast.visible { transform: translateX(0); }
            
            /* Responsive */
            @media (max-width: 768px) {
                .dd-text-image {
                    grid-template-columns: 1fr;
                }
                
                .dd-timeline-track::before {
                    left: 1rem;
                }
                
                .dd-timeline-event {
                    width: calc(100% - 3rem);
                    margin-left: 3rem !important;
                }
                
                .dd-timeline-event .dd-event-marker {
                    left: -2rem !important;
                    right: auto !important;
                }
            }
        `;
        document.head.appendChild(style);
    }
};

// Auto-init
if (typeof window !== 'undefined') {
    window.NW_DEEPDIVE = NW_DEEPDIVE;
    document.addEventListener('DOMContentLoaded', () => NW_DEEPDIVE.init());
}
