/**
 * NumbahWan Guild - Game Juice Click Feedback
 * Addictive visual feedback for all clickable elements
 */

(function() {
  'use strict';

  // Inject styles
  const styles = document.createElement('style');
  styles.textContent = `
    /* ========== CLICK JUICE EFFECTS ========== */
    
    /* Ripple container for back buttons and important clicks */
    .nw-click-juice {
      position: relative;
      overflow: hidden;
    }
    
    /* The ripple effect */
    .nw-ripple {
      position: absolute;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(255,215,0,0.8) 0%, rgba(255,107,0,0.6) 40%, transparent 70%);
      transform: scale(0);
      animation: nwRippleExpand 0.6s ease-out forwards;
      pointer-events: none;
      z-index: 1000;
    }
    
    @keyframes nwRippleExpand {
      0% { transform: scale(0); opacity: 1; }
      100% { transform: scale(4); opacity: 0; }
    }
    
    /* Particle burst effect */
    .nw-particle {
      position: fixed;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      pointer-events: none;
      z-index: 99999;
      animation: nwParticleBurst 0.8s ease-out forwards;
    }
    
    @keyframes nwParticleBurst {
      0% { transform: translate(0, 0) scale(1); opacity: 1; }
      100% { transform: translate(var(--tx), var(--ty)) scale(0); opacity: 0; }
    }
    
    /* Screen flash effect */
    .nw-flash {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: radial-gradient(circle at var(--cx) var(--cy), rgba(255,107,0,0.3) 0%, transparent 50%);
      pointer-events: none;
      z-index: 99998;
      animation: nwFlash 0.3s ease-out forwards;
    }
    
    @keyframes nwFlash {
      0% { opacity: 1; }
      100% { opacity: 0; }
    }
    
    /* Button press animation */
    .nw-pressed {
      animation: nwButtonPress 0.15s ease-out;
    }
    
    @keyframes nwButtonPress {
      0% { transform: scale(1); }
      50% { transform: scale(0.92); }
      100% { transform: scale(1); }
    }
    
    /* Glow pulse on click */
    .nw-glow-pulse {
      animation: nwGlowPulse 0.4s ease-out;
    }
    
    @keyframes nwGlowPulse {
      0% { box-shadow: 0 0 0 0 rgba(255,107,0,0.7), 0 0 0 0 rgba(255,215,0,0.5); }
      50% { box-shadow: 0 0 20px 10px rgba(255,107,0,0.4), 0 0 40px 20px rgba(255,215,0,0.2); }
      100% { box-shadow: 0 0 0 0 rgba(255,107,0,0), 0 0 0 0 rgba(255,215,0,0); }
    }
    
    /* Text scramble effect container */
    .nw-text-scramble {
      display: inline-block;
    }
    
    /* Loading arrow animation for back button */
    .nw-arrow-loading svg,
    .nw-arrow-loading .nw-icon {
      animation: nwArrowPulse 0.3s ease-in-out infinite;
    }
    
    @keyframes nwArrowPulse {
      0%, 100% { transform: translateX(0); opacity: 1; }
      50% { transform: translateX(-8px); opacity: 0.5; }
    }
    
    /* Success checkmark morph */
    .nw-success-morph::after {
      content: '';
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) scale(0);
      width: 20px;
      height: 20px;
      background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2322c55e' stroke-width='3'%3E%3Cpath d='M20 6L9 17l-5-5'/%3E%3C/svg%3E") center/contain no-repeat;
      animation: nwCheckPop 0.4s ease-out forwards;
      animation-delay: 0.1s;
    }
    
    @keyframes nwCheckPop {
      0% { transform: translate(-50%, -50%) scale(0) rotate(-45deg); }
      50% { transform: translate(-50%, -50%) scale(1.3) rotate(0deg); }
      100% { transform: translate(-50%, -50%) scale(1) rotate(0deg); }
    }
    
    /* Portal/warp transition effect */
    .nw-warp-out {
      animation: nwWarpOut 0.5s ease-in forwards;
    }
    
    @keyframes nwWarpOut {
      0% { transform: scale(1) rotate(0deg); opacity: 1; filter: blur(0); }
      100% { transform: scale(0.5) rotate(10deg); opacity: 0; filter: blur(10px); }
    }
    
    /* Energy ring effect */
    .nw-energy-ring {
      position: fixed;
      border: 3px solid;
      border-radius: 50%;
      pointer-events: none;
      z-index: 99997;
      animation: nwEnergyRing 0.6s ease-out forwards;
    }
    
    @keyframes nwEnergyRing {
      0% { 
        width: 20px; 
        height: 20px; 
        opacity: 1;
        border-color: #ffd700;
        box-shadow: 0 0 10px #ffd700, inset 0 0 10px #ffd700;
      }
      100% { 
        width: 150px; 
        height: 150px; 
        opacity: 0;
        border-color: #ff6b00;
        box-shadow: 0 0 30px #ff6b00, inset 0 0 5px #ff6b00;
      }
    }
  `;
  document.head.appendChild(styles);

  // Particle colors
  const particleColors = ['#ff6b00', '#ffd700', '#ff9500', '#ffcc70', '#fff'];

  // Create particle burst at position
  function createParticleBurst(x, y, count = 12) {
    for (let i = 0; i < count; i++) {
      const particle = document.createElement('div');
      particle.className = 'nw-particle';
      
      // Random direction
      const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
      const distance = 50 + Math.random() * 80;
      const tx = Math.cos(angle) * distance;
      const ty = Math.sin(angle) * distance;
      
      particle.style.cssText = `
        left: ${x}px;
        top: ${y}px;
        --tx: ${tx}px;
        --ty: ${ty}px;
        background: ${particleColors[Math.floor(Math.random() * particleColors.length)]};
        box-shadow: 0 0 6px currentColor;
        width: ${4 + Math.random() * 6}px;
        height: ${4 + Math.random() * 6}px;
        animation-duration: ${0.5 + Math.random() * 0.4}s;
      `;
      
      document.body.appendChild(particle);
      setTimeout(() => particle.remove(), 1000);
    }
  }

  // Create energy ring at position
  function createEnergyRing(x, y) {
    const ring = document.createElement('div');
    ring.className = 'nw-energy-ring';
    ring.style.left = (x - 10) + 'px';
    ring.style.top = (y - 10) + 'px';
    document.body.appendChild(ring);
    setTimeout(() => ring.remove(), 600);
  }

  // Create screen flash at position
  function createFlash(x, y) {
    const flash = document.createElement('div');
    flash.className = 'nw-flash';
    flash.style.setProperty('--cx', x + 'px');
    flash.style.setProperty('--cy', y + 'px');
    document.body.appendChild(flash);
    setTimeout(() => flash.remove(), 300);
  }

  // Create ripple inside element
  function createRipple(element, x, y) {
    const rect = element.getBoundingClientRect();
    const ripple = document.createElement('span');
    ripple.className = 'nw-ripple';
    
    const size = Math.max(rect.width, rect.height) * 2;
    ripple.style.width = ripple.style.height = size + 'px';
    ripple.style.left = (x - rect.left - size / 2) + 'px';
    ripple.style.top = (y - rect.top - size / 2) + 'px';
    
    element.style.position = 'relative';
    element.style.overflow = 'hidden';
    element.appendChild(ripple);
    
    setTimeout(() => ripple.remove(), 600);
  }

  // Main click handler for back buttons
  function handleBackButtonClick(e) {
    const btn = e.currentTarget;
    const rect = btn.getBoundingClientRect();
    const x = e.clientX || rect.left + rect.width / 2;
    const y = e.clientY || rect.top + rect.height / 2;
    
    // Prevent default temporarily for effect
    e.preventDefault();
    
    // Visual effects
    btn.classList.add('nw-pressed', 'nw-glow-pulse', 'nw-arrow-loading');
    createRipple(btn, x, y);
    createParticleBurst(x, y, 15);
    createEnergyRing(x, y);
    createFlash(x, y);
    
    // Small haptic-like screen shake (optional, subtle)
    document.body.style.transform = 'translateX(2px)';
    setTimeout(() => document.body.style.transform = 'translateX(-2px)', 50);
    setTimeout(() => document.body.style.transform = '', 100);
    
    // Get the href
    const href = btn.getAttribute('href') || '/';
    
    // Navigate after effect plays
    setTimeout(() => {
      // Add warp out effect to body
      document.body.classList.add('nw-warp-out');
      
      setTimeout(() => {
        window.location.href = href;
      }, 200);
    }, 250);
  }

  // Generic click juice for any element
  function handleGenericClick(e) {
    const x = e.clientX;
    const y = e.clientY;
    
    // Smaller particle burst for generic clicks
    createParticleBurst(x, y, 6);
    
    // Add pressed animation if element supports it
    const target = e.target.closest('button, a, .clickable');
    if (target) {
      target.classList.add('nw-pressed');
      setTimeout(() => target.classList.remove('nw-pressed'), 150);
    }
  }

  // Initialize when DOM is ready
  function init() {
    // Find all back buttons
    const backButtons = document.querySelectorAll('.back-btn, [data-i18n="back"], [data-i18n="backBtn"], a[href="/"]');
    
    backButtons.forEach(btn => {
      // Skip if it's the main logo/home link in nav
      if (btn.closest('nav') && !btn.classList.contains('back-btn')) return;
      
      btn.addEventListener('click', handleBackButtonClick);
    });
    
    // Add subtle click juice to all buttons and links (optional)
    document.addEventListener('click', (e) => {
      // Don't double-trigger on back buttons
      if (e.target.closest('.back-btn')) return;
      
      const clickable = e.target.closest('button, .magnetic-btn, .lang-btn');
      if (clickable) {
        handleGenericClick(e);
      }
    });
    
    console.log('[NW Click Juice] Initialized on', backButtons.length, 'back buttons');
  }

  // Run init
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
