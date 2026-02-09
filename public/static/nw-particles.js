/**
 * NumbahWan Premium Particle System v2.0
 * 
 * ADDICTIVE VISUAL EFFECTS - Maximum engagement
 * 
 * Effects:
 * - NW Energy Field (ambient floating orbs with trails)
 * - Cyber Matrix (falling digital rain)
 * - Fire Embers (rising warm particles)
 * - Aurora Wave (smooth color flow)
 * - Sacred Runes (floating mystical symbols)
 * - Legendary Burst (epic celebration effect)
 * - Gold Rain (premium reward shower)
 * 
 * Usage:
 *   NW_PARTICLES.init()                    // Auto-detect containers
 *   NW_PARTICLES.energy('#container')      // Energy field
 *   NW_PARTICLES.matrix('#container')      // Matrix rain
 *   NW_PARTICLES.embers('#container')      // Fire embers
 *   NW_PARTICLES.aurora('#container')      // Aurora waves
 *   NW_PARTICLES.runes('#container')       // Sacred runes
 *   NW_PARTICLES.burst(x, y)               // Celebration burst
 *   NW_PARTICLES.goldRain('#container')    // Gold shower
 */

const NW_PARTICLES = {
  version: '2.0',
  
  // NumbahWan brand colors
  colors: {
    primary: '#ff6b00',
    secondary: '#00d4ff',
    gold: '#ffd700',
    purple: '#a855f7',
    green: '#22c55e',
    pink: '#ec4899',
    dark: '#0a0a0f'
  },

  // ═══════════════════════════════════════════════════════════════════
  // INITIALIZATION
  // ═══════════════════════════════════════════════════════════════════
  init() {
    this.injectStyles();
    
    // Auto-detect particle containers
    document.querySelectorAll('[data-nw-particles]').forEach(el => {
      const type = el.dataset.nwParticles || 'energy';
      const intensity = el.dataset.nwIntensity || 'medium';
      this.create(el, type, intensity);
    });
    
    // Replace old bg-particles with energy field
    document.querySelectorAll('.bg-particles').forEach(el => {
      el.innerHTML = '';
      this.energy(el, 'low');
    });
    
    console.log('NW_PARTICLES v2.0 initialized');
  },

  create(container, type, intensity = 'medium') {
    const el = typeof container === 'string' ? document.querySelector(container) : container;
    if (!el) return;
    
    switch(type) {
      case 'energy': this.energy(el, intensity); break;
      case 'matrix': this.matrix(el, intensity); break;
      case 'embers': this.embers(el, intensity); break;
      case 'aurora': this.aurora(el, intensity); break;
      case 'runes': this.runes(el, intensity); break;
      case 'gold': this.goldRain(el, intensity); break;
      default: this.energy(el, intensity);
    }
  },

  // ═══════════════════════════════════════════════════════════════════
  // ENERGY FIELD - Floating orbs with glowing trails
  // ═══════════════════════════════════════════════════════════════════
  energy(container, intensity = 'medium') {
    const el = typeof container === 'string' ? document.querySelector(container) : container;
    if (!el) return;
    
    el.style.position = 'relative';
    el.style.overflow = 'hidden';
    
    const count = { low: 15, medium: 25, high: 40 }[intensity] || 25;
    const colors = [this.colors.primary, this.colors.secondary, this.colors.gold, this.colors.purple];
    
    const canvas = document.createElement('canvas');
    canvas.className = 'nw-particle-canvas';
    canvas.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:1;';
    el.appendChild(canvas);
    
    const ctx = canvas.getContext('2d');
    let particles = [];
    let animId;
    
    const resize = () => {
      canvas.width = el.offsetWidth;
      canvas.height = el.offsetHeight;
    };
    resize();
    window.addEventListener('resize', resize);
    
    // Create particles
    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        radius: 2 + Math.random() * 4,
        color: colors[i % colors.length],
        alpha: 0.3 + Math.random() * 0.5,
        pulse: Math.random() * Math.PI * 2,
        trail: []
      });
    }
    
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      particles.forEach(p => {
        // Update position
        p.x += p.vx;
        p.y += p.vy;
        p.pulse += 0.02;
        
        // Bounce off edges with smooth transition
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
        
        // Store trail
        p.trail.push({ x: p.x, y: p.y });
        if (p.trail.length > 20) p.trail.shift();
        
        // Draw trail
        if (p.trail.length > 1) {
          ctx.beginPath();
          ctx.moveTo(p.trail[0].x, p.trail[0].y);
          p.trail.forEach((t, i) => {
            ctx.lineTo(t.x, t.y);
          });
          ctx.strokeStyle = p.color;
          ctx.lineWidth = p.radius * 0.5;
          ctx.globalAlpha = 0.1;
          ctx.stroke();
        }
        
        // Draw glow
        const glowSize = p.radius * (2 + Math.sin(p.pulse) * 0.5);
        const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, glowSize * 3);
        gradient.addColorStop(0, p.color);
        gradient.addColorStop(0.5, p.color + '40');
        gradient.addColorStop(1, 'transparent');
        
        ctx.beginPath();
        ctx.arc(p.x, p.y, glowSize * 3, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.globalAlpha = p.alpha * 0.3;
        ctx.fill();
        
        // Draw core
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * (1 + Math.sin(p.pulse) * 0.2), 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.fill();
        
        // Draw bright center
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * 0.4, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.globalAlpha = p.alpha * 0.8;
        ctx.fill();
      });
      
      // Draw connections between nearby particles
      ctx.globalAlpha = 0.15;
      ctx.strokeStyle = this.colors.secondary;
      ctx.lineWidth = 0.5;
      
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          
          if (dist < 100) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.globalAlpha = 0.15 * (1 - dist / 100);
            ctx.stroke();
          }
        }
      }
      
      animId = requestAnimationFrame(animate);
    };
    
    animate();
    return () => cancelAnimationFrame(animId);
  },

  // ═══════════════════════════════════════════════════════════════════
  // CYBER MATRIX - Digital rain effect
  // ═══════════════════════════════════════════════════════════════════
  matrix(container, intensity = 'medium') {
    const el = typeof container === 'string' ? document.querySelector(container) : container;
    if (!el) return;
    
    el.style.position = 'relative';
    el.style.overflow = 'hidden';
    
    const canvas = document.createElement('canvas');
    canvas.className = 'nw-particle-canvas';
    canvas.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:1;opacity:0.7;';
    el.appendChild(canvas);
    
    const ctx = canvas.getContext('2d');
    
    const resize = () => {
      canvas.width = el.offsetWidth;
      canvas.height = el.offsetHeight;
    };
    resize();
    window.addEventListener('resize', resize);
    
    // NW-themed characters
    const chars = 'NW⧫▣01アイウエオカキクケコ';
    const fontSize = 14;
    const columns = Math.floor(canvas.width / fontSize);
    const drops = Array(columns).fill(0).map(() => Math.random() * -100);
    const speeds = Array(columns).fill(0).map(() => 0.5 + Math.random() * 1.5);
    
    const densityMod = { low: 0.97, medium: 0.95, high: 0.92 }[intensity] || 0.95;
    
    let animId;
    const animate = () => {
      // Semi-transparent black to create trail effect
      ctx.fillStyle = 'rgba(10, 10, 15, 0.1)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      ctx.font = `${fontSize}px monospace`;
      
      for (let i = 0; i < columns; i++) {
        const char = chars[Math.floor(Math.random() * chars.length)];
        const x = i * fontSize;
        const y = drops[i] * fontSize;
        
        // Gradient from cyan to orange
        const progress = (drops[i] % 30) / 30;
        if (progress < 0.1) {
          ctx.fillStyle = '#fff'; // White head
        } else if (progress < 0.5) {
          ctx.fillStyle = this.colors.secondary; // Cyan
        } else {
          ctx.fillStyle = this.colors.primary + '80'; // Orange fade
        }
        
        ctx.fillText(char, x, y);
        
        // Reset drop
        if (y > canvas.height && Math.random() > densityMod) {
          drops[i] = 0;
        }
        drops[i] += speeds[i];
      }
      
      animId = requestAnimationFrame(animate);
    };
    
    animate();
    return () => cancelAnimationFrame(animId);
  },

  // ═══════════════════════════════════════════════════════════════════
  // FIRE EMBERS - Rising warm particles
  // ═══════════════════════════════════════════════════════════════════
  embers(container, intensity = 'medium') {
    const el = typeof container === 'string' ? document.querySelector(container) : container;
    if (!el) return;
    
    el.style.position = 'relative';
    el.style.overflow = 'hidden';
    
    const count = { low: 20, medium: 40, high: 70 }[intensity] || 40;
    const colors = ['#ff6b00', '#ff9500', '#ffcc00', '#ff4400', '#ffffff'];
    
    const canvas = document.createElement('canvas');
    canvas.className = 'nw-particle-canvas';
    canvas.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:1;';
    el.appendChild(canvas);
    
    const ctx = canvas.getContext('2d');
    let particles = [];
    
    const resize = () => {
      canvas.width = el.offsetWidth;
      canvas.height = el.offsetHeight;
    };
    resize();
    window.addEventListener('resize', resize);
    
    const createEmber = () => ({
      x: Math.random() * canvas.width,
      y: canvas.height + 10,
      vx: (Math.random() - 0.5) * 2,
      vy: -(1 + Math.random() * 3),
      radius: 1 + Math.random() * 3,
      color: colors[Math.floor(Math.random() * colors.length)],
      alpha: 0.8 + Math.random() * 0.2,
      life: 1,
      decay: 0.003 + Math.random() * 0.005,
      wobble: Math.random() * Math.PI * 2,
      wobbleSpeed: 0.05 + Math.random() * 0.05
    });
    
    for (let i = 0; i < count; i++) {
      const p = createEmber();
      p.y = Math.random() * canvas.height;
      particles.push(p);
    }
    
    let animId;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      particles.forEach((p, i) => {
        p.wobble += p.wobbleSpeed;
        p.x += p.vx + Math.sin(p.wobble) * 0.5;
        p.y += p.vy;
        p.life -= p.decay;
        
        if (p.life <= 0 || p.y < -10) {
          particles[i] = createEmber();
          return;
        }
        
        // Draw glow
        const glowSize = p.radius * 4 * p.life;
        const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, glowSize);
        gradient.addColorStop(0, p.color);
        gradient.addColorStop(0.3, p.color + '60');
        gradient.addColorStop(1, 'transparent');
        
        ctx.beginPath();
        ctx.arc(p.x, p.y, glowSize, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.globalAlpha = p.alpha * p.life * 0.5;
        ctx.fill();
        
        // Draw core
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * p.life, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha * p.life;
        ctx.fill();
      });
      
      animId = requestAnimationFrame(animate);
    };
    
    animate();
    return () => cancelAnimationFrame(animId);
  },

  // ═══════════════════════════════════════════════════════════════════
  // AURORA WAVE - Smooth flowing color bands
  // ═══════════════════════════════════════════════════════════════════
  aurora(container, intensity = 'medium') {
    const el = typeof container === 'string' ? document.querySelector(container) : container;
    if (!el) return;
    
    el.style.position = 'relative';
    el.style.overflow = 'hidden';
    
    const canvas = document.createElement('canvas');
    canvas.className = 'nw-particle-canvas';
    canvas.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:1;opacity:0.4;';
    el.appendChild(canvas);
    
    const ctx = canvas.getContext('2d');
    
    const resize = () => {
      canvas.width = el.offsetWidth;
      canvas.height = el.offsetHeight;
    };
    resize();
    window.addEventListener('resize', resize);
    
    const waves = { low: 2, medium: 3, high: 5 }[intensity] || 3;
    const colors = [
      [this.colors.primary, this.colors.gold],
      [this.colors.secondary, this.colors.purple],
      [this.colors.green, this.colors.secondary],
      [this.colors.purple, this.colors.pink],
      [this.colors.gold, this.colors.primary]
    ];
    
    let time = 0;
    let animId;
    
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      time += 0.005;
      
      for (let w = 0; w < waves; w++) {
        const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
        gradient.addColorStop(0, colors[w % colors.length][0] + '40');
        gradient.addColorStop(0.5, colors[w % colors.length][1] + '60');
        gradient.addColorStop(1, colors[w % colors.length][0] + '40');
        
        ctx.beginPath();
        ctx.moveTo(0, canvas.height);
        
        for (let x = 0; x <= canvas.width; x += 10) {
          const y = canvas.height * 0.3 + 
                    Math.sin(x * 0.005 + time + w * 2) * canvas.height * 0.15 +
                    Math.sin(x * 0.01 + time * 1.5 + w) * canvas.height * 0.1;
          ctx.lineTo(x, y);
        }
        
        ctx.lineTo(canvas.width, canvas.height);
        ctx.closePath();
        ctx.fillStyle = gradient;
        ctx.fill();
      }
      
      animId = requestAnimationFrame(animate);
    };
    
    animate();
    return () => cancelAnimationFrame(animId);
  },

  // ═══════════════════════════════════════════════════════════════════
  // SACRED RUNES - Floating mystical symbols
  // ═══════════════════════════════════════════════════════════════════
  runes(container, intensity = 'medium') {
    const el = typeof container === 'string' ? document.querySelector(container) : container;
    if (!el) return;
    
    el.style.position = 'relative';
    el.style.overflow = 'hidden';
    
    const count = { low: 8, medium: 15, high: 25 }[intensity] || 15;
    const symbols = ['', '⧫', '', '', '', '', '', '', '⟡', '⊛', '⊕', '⊗'];
    const colors = [this.colors.gold, this.colors.secondary, this.colors.purple, this.colors.green];
    
    const canvas = document.createElement('canvas');
    canvas.className = 'nw-particle-canvas';
    canvas.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:1;';
    el.appendChild(canvas);
    
    const ctx = canvas.getContext('2d');
    let runes = [];
    
    const resize = () => {
      canvas.width = el.offsetWidth;
      canvas.height = el.offsetHeight;
    };
    resize();
    window.addEventListener('resize', resize);
    
    for (let i = 0; i < count; i++) {
      runes.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        symbol: symbols[Math.floor(Math.random() * symbols.length)],
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 16 + Math.random() * 20,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.02,
        floatPhase: Math.random() * Math.PI * 2,
        floatSpeed: 0.01 + Math.random() * 0.02,
        alpha: 0.3 + Math.random() * 0.4,
        pulsePhase: Math.random() * Math.PI * 2
      });
    }
    
    let animId;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      runes.forEach(r => {
        r.rotation += r.rotationSpeed;
        r.floatPhase += r.floatSpeed;
        r.pulsePhase += 0.03;
        
        const floatY = Math.sin(r.floatPhase) * 10;
        const floatX = Math.cos(r.floatPhase * 0.7) * 5;
        const pulse = 1 + Math.sin(r.pulsePhase) * 0.15;
        
        ctx.save();
        ctx.translate(r.x + floatX, r.y + floatY);
        ctx.rotate(r.rotation);
        
        // Draw glow
        ctx.shadowColor = r.color;
        ctx.shadowBlur = 20 * pulse;
        
        // Draw rune
        ctx.font = `${r.size * pulse}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = r.color;
        ctx.globalAlpha = r.alpha * pulse;
        ctx.fillText(r.symbol, 0, 0);
        
        ctx.restore();
      });
      
      animId = requestAnimationFrame(animate);
    };
    
    animate();
    return () => cancelAnimationFrame(animId);
  },

  // ═══════════════════════════════════════════════════════════════════
  // LEGENDARY BURST - Epic celebration effect
  // ═══════════════════════════════════════════════════════════════════
  burst(x, y, options = {}) {
    const { count = 50, spread = 360, colors = null } = options;
    const burstColors = colors || [
      this.colors.primary, this.colors.gold, this.colors.secondary, 
      this.colors.purple, '#fff', this.colors.green
    ];
    
    // Create temporary canvas overlay
    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;pointer-events:none;z-index:99999;';
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    document.body.appendChild(canvas);
    
    const ctx = canvas.getContext('2d');
    let particles = [];
    
    // Create burst particles
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i / count) * (spread / 360) + (Math.random() - 0.5) * 0.5;
      const velocity = 8 + Math.random() * 12;
      const type = Math.random() > 0.3 ? 'circle' : (Math.random() > 0.5 ? 'star' : 'diamond');
      
      particles.push({
        x, y,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity - 5,
        gravity: 0.3,
        radius: 4 + Math.random() * 8,
        color: burstColors[Math.floor(Math.random() * burstColors.length)],
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.3,
        alpha: 1,
        decay: 0.015 + Math.random() * 0.01,
        type,
        trail: []
      });
    }
    
    // Add ring wave
    let ringRadius = 0;
    let ringAlpha = 1;
    
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw expanding ring
      if (ringAlpha > 0) {
        ringRadius += 15;
        ringAlpha -= 0.03;
        
        ctx.beginPath();
        ctx.arc(x, y, ringRadius, 0, Math.PI * 2);
        ctx.strokeStyle = this.colors.gold;
        ctx.lineWidth = 3;
        ctx.globalAlpha = ringAlpha;
        ctx.stroke();
        
        // Inner ring
        ctx.beginPath();
        ctx.arc(x, y, ringRadius * 0.7, 0, Math.PI * 2);
        ctx.strokeStyle = this.colors.secondary;
        ctx.lineWidth = 2;
        ctx.globalAlpha = ringAlpha * 0.7;
        ctx.stroke();
      }
      
      let alive = false;
      
      particles.forEach(p => {
        if (p.alpha <= 0) return;
        alive = true;
        
        // Store trail
        p.trail.push({ x: p.x, y: p.y, alpha: p.alpha });
        if (p.trail.length > 10) p.trail.shift();
        
        // Update physics
        p.x += p.vx;
        p.y += p.vy;
        p.vy += p.gravity;
        p.vx *= 0.99;
        p.rotation += p.rotationSpeed;
        p.alpha -= p.decay;
        
        // Draw trail
        p.trail.forEach((t, i) => {
          ctx.beginPath();
          ctx.arc(t.x, t.y, p.radius * 0.3 * (i / p.trail.length), 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          ctx.globalAlpha = t.alpha * 0.3 * (i / p.trail.length);
          ctx.fill();
        });
        
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.globalAlpha = p.alpha;
        
        // Draw glow
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, p.radius * 2);
        gradient.addColorStop(0, p.color);
        gradient.addColorStop(0.5, p.color + '40');
        gradient.addColorStop(1, 'transparent');
        ctx.fillStyle = gradient;
        ctx.fillRect(-p.radius * 2, -p.radius * 2, p.radius * 4, p.radius * 4);
        
        // Draw shape
        ctx.fillStyle = p.color;
        if (p.type === 'circle') {
          ctx.beginPath();
          ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
          ctx.fill();
        } else if (p.type === 'star') {
          this._drawStar(ctx, 0, 0, 5, p.radius, p.radius * 0.5);
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.moveTo(0, -p.radius);
          ctx.lineTo(p.radius, 0);
          ctx.lineTo(0, p.radius);
          ctx.lineTo(-p.radius, 0);
          ctx.closePath();
          ctx.fill();
        }
        
        // White center
        ctx.fillStyle = '#fff';
        ctx.globalAlpha = p.alpha * 0.8;
        ctx.beginPath();
        ctx.arc(0, 0, p.radius * 0.3, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
      });
      
      if (alive || ringAlpha > 0) {
        requestAnimationFrame(animate);
      } else {
        canvas.remove();
      }
    };
    
    animate();
  },

  // ═══════════════════════════════════════════════════════════════════
  // GOLD RAIN - Premium reward shower
  // ═══════════════════════════════════════════════════════════════════
  goldRain(container, duration = 3000) {
    const el = typeof container === 'string' ? document.querySelector(container) : container;
    if (!el) return;
    
    const rect = el.getBoundingClientRect();
    
    const canvas = document.createElement('canvas');
    canvas.style.cssText = `position:fixed;top:${rect.top}px;left:${rect.left}px;width:${rect.width}px;height:${rect.height}px;pointer-events:none;z-index:9999;`;
    canvas.width = rect.width;
    canvas.height = rect.height;
    document.body.appendChild(canvas);
    
    const ctx = canvas.getContext('2d');
    let particles = [];
    const startTime = Date.now();
    
    const createCoin = () => ({
      x: Math.random() * canvas.width,
      y: -20,
      vy: 2 + Math.random() * 4,
      vx: (Math.random() - 0.5) * 2,
      radius: 8 + Math.random() * 8,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: 0.1 + Math.random() * 0.2,
      wobble: Math.random() * Math.PI * 2,
      type: Math.random() > 0.7 ? 'diamond' : 'coin'
    });
    
    let animId;
    const animate = () => {
      const elapsed = Date.now() - startTime;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Spawn new coins
      if (elapsed < duration * 0.7 && Math.random() > 0.7) {
        particles.push(createCoin());
      }
      
      particles = particles.filter(p => {
        p.y += p.vy;
        p.x += p.vx + Math.sin(p.wobble) * 0.5;
        p.wobble += 0.1;
        p.rotation += p.rotationSpeed;
        
        if (p.y > canvas.height + 20) return false;
        
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        
        // Draw glow
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, p.radius * 2);
        gradient.addColorStop(0, this.colors.gold);
        gradient.addColorStop(0.5, this.colors.gold + '40');
        gradient.addColorStop(1, 'transparent');
        ctx.fillStyle = gradient;
        ctx.globalAlpha = 0.5;
        ctx.fillRect(-p.radius * 2, -p.radius * 2, p.radius * 4, p.radius * 4);
        
        ctx.globalAlpha = 1;
        
        if (p.type === 'coin') {
          // Gold coin
          const scaleX = Math.abs(Math.cos(p.wobble * 2));
          ctx.scale(scaleX || 0.1, 1);
          
          // Outer ring
          ctx.beginPath();
          ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
          ctx.fillStyle = '#b8860b';
          ctx.fill();
          
          // Inner gold
          ctx.beginPath();
          ctx.arc(0, 0, p.radius * 0.85, 0, Math.PI * 2);
          ctx.fillStyle = this.colors.gold;
          ctx.fill();
          
          // Shine
          ctx.beginPath();
          ctx.arc(-p.radius * 0.3, -p.radius * 0.3, p.radius * 0.3, 0, Math.PI * 2);
          ctx.fillStyle = '#fff';
          ctx.globalAlpha = 0.6;
          ctx.fill();
        } else {
          // Diamond
          ctx.beginPath();
          ctx.moveTo(0, -p.radius);
          ctx.lineTo(p.radius, 0);
          ctx.lineTo(0, p.radius);
          ctx.lineTo(-p.radius, 0);
          ctx.closePath();
          ctx.fillStyle = this.colors.secondary;
          ctx.fill();
          
          // Shine
          ctx.fillStyle = '#fff';
          ctx.globalAlpha = 0.7;
          ctx.beginPath();
          ctx.moveTo(0, -p.radius * 0.6);
          ctx.lineTo(p.radius * 0.3, 0);
          ctx.lineTo(0, p.radius * 0.3);
          ctx.lineTo(-p.radius * 0.3, 0);
          ctx.closePath();
          ctx.fill();
        }
        
        ctx.restore();
        return true;
      });
      
      if (particles.length > 0 || elapsed < duration) {
        animId = requestAnimationFrame(animate);
      } else {
        canvas.remove();
      }
    };
    
    animate();
    return () => {
      cancelAnimationFrame(animId);
      canvas.remove();
    };
  },

  // ═══════════════════════════════════════════════════════════════════
  // HELPER FUNCTIONS
  // ═══════════════════════════════════════════════════════════════════
  _drawStar(ctx, cx, cy, spikes, outerRadius, innerRadius) {
    ctx.beginPath();
    for (let i = 0; i < spikes * 2; i++) {
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const angle = (Math.PI * i) / spikes - Math.PI / 2;
      const x = cx + Math.cos(angle) * radius;
      const y = cy + Math.sin(angle) * radius;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
  },

  // ═══════════════════════════════════════════════════════════════════
  // STYLES INJECTION
  // ═══════════════════════════════════════════════════════════════════
  injectStyles() {
    if (document.getElementById('nw-particles-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'nw-particles-styles';
    style.textContent = `
      .nw-particle-canvas {
        mix-blend-mode: screen;
      }
      
      /* Ensure particle containers have relative positioning */
      [data-nw-particles] {
        position: relative;
        overflow: hidden;
      }
    `;
    document.head.appendChild(style);
  }
};

// Auto-initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => NW_PARTICLES.init());
} else {
  NW_PARTICLES.init();
}

// Export for manual use
window.NW_PARTICLES = NW_PARTICLES;
